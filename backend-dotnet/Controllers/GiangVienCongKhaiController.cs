using LMS.Api.Infrastructure.Persistence;
using LMS.Api.Domain.Entities;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace LMS.Api.Controllers;

[ApiController]
public class GiangVienCongKhaiController(ApplicationDbContext db) : ControllerBase
{
    [HttpGet("/api/teachers/{id}")]
    [HttpGet("/api/instructors/{id}")]
    public async Task<IResult> ChiTietGiangVien(string id)
    {
        var user = await db.NguoiDung.AsNoTracking()
            .Where(item => item.Id == id && (item.VaiTro == "INSTRUCTOR" || item.VaiTro == "TEACHER" || item.VaiTro == "GIANGVIEN"))
            .Include(item => item.CacKhoaHoc)
                .ThenInclude(course => course.CacGhiDanh)
            .Include(item => item.CacKhoaHoc)
                .ThenInclude(course => course.CacDanhGia)
            .FirstOrDefaultAsync();

        if (user is null) return Results.NotFound(new { message = "Không tìm thấy giảng viên" });

        return Results.Ok(TaoChiTietGiangVien(user));
    }

    [HttpGet("/api/instructors")]
    public async Task<IResult> DanhSachGiangVien()
    {
        var users = await db.NguoiDung.AsNoTracking()
            .Where(user => user.VaiTro == "INSTRUCTOR" || user.VaiTro == "TEACHER" || user.VaiTro == "GIANGVIEN")
            .Include(user => user.CacKhoaHoc)
                .ThenInclude(course => course.CacGhiDanh)
            .Include(user => user.CacKhoaHoc)
                .ThenInclude(course => course.CacDanhGia)
            .OrderBy(user => user.Ten)
            .ToListAsync();

        var instructors = users.Select(TaoThongTinGiangVien)
            .OrderByDescending(item => item.studentCount)
            .ThenByDescending(item => item.averageRating)
            .ThenByDescending(item => item.courseCount)
            .ToList();

        var totalReviewWeight = instructors.Sum(item => item.reviewCount);
        var averageRating = totalReviewWeight == 0
            ? 0
            : Math.Round(instructors.Sum(item => item.averageRating * item.reviewCount) / totalReviewWeight, 1);

        var categories = instructors
            .SelectMany(item => item.categories.Select(category => new { category.name, category.courseCount, GiangVienId = item.id }))
            .GroupBy(item => item.name)
            .Select(group => new
            {
                name = group.Key,
                instructorCount = group.Select(item => item.GiangVienId).Distinct().Count(),
                courseCount = group.Sum(item => item.courseCount),
                percentage = instructors.Count == 0
                    ? 0
                    : Math.Round(group.Select(item => item.GiangVienId).Distinct().Count() * 100.0 / instructors.Count, 1)
            })
            .OrderByDescending(item => item.courseCount)
            .ThenBy(item => item.name)
            .ToList();

        var featured = instructors.FirstOrDefault();

        return Results.Ok(new
        {
            stats = new
            {
                totalInstructors = instructors.Count,
                verifiedInstructors = instructors.Count(item => item.verified),
                averageRating,
                totalStudents = instructors.Sum(item => item.studentCount)
            },
            featuredInstructor = featured,
            instructors,
            recommendedInstructors = instructors
                .Where(item => featured is null || item.id != featured.id)
                .Take(4),
            categories,
            officeHours = Array.Empty<object>()
        });
    }

    private static InstructorSummary TaoThongTinGiangVien(NguoiDung user)
    {
        var publishedCourses = user.CacKhoaHoc
            .Where(IsPublished)
            .OrderByDescending(course => course.CacGhiDanh.Count)
            .ThenByDescending(course => course.DiemDanhGiaTrungBinh)
            .ToList();

        var studentCount = publishedCourses.Sum(course => course.CacGhiDanh.Count);
        var reviewCount = publishedCourses.Sum(course => Math.Max(course.SoLuongDanhGia, course.CacDanhGia.Count));
        var ratingWeight = publishedCourses.Sum(course =>
        {
            var weight = Math.Max(course.SoLuongDanhGia, course.CacDanhGia.Count);
            return course.DiemDanhGiaTrungBinh > 0 ? course.DiemDanhGiaTrungBinh * weight : 0;
        });
        var averageRating = reviewCount == 0 ? 0 : Math.Round(ratingWeight / reviewCount, 1);

        var categories = publishedCourses
            .GroupBy(course => string.IsNullOrWhiteSpace(course.ChuyenMuc) ? "Khác" : course.ChuyenMuc)
            .Select(group => new CategorySummary(group.Key, group.Count()))
            .OrderByDescending(item => item.courseCount)
            .ThenBy(item => item.name)
            .ToList();

        var mainCategory = categories.FirstOrDefault()?.name ?? "Giảng viên Skillio";

        return new InstructorSummary(
            id: user.Id,
            name: string.IsNullOrWhiteSpace(user.Ten) ? user.Email : user.Ten,
            email: null,
            avatar: user.AnhDaiDien,
            bio: user.TieuSu,
            headline: string.IsNullOrWhiteSpace(user.TieuSu)
                ? $"{mainCategory} · {publishedCourses.Count} khóa học"
                : user.TieuSu,
            specialty: mainCategory,
            verified: publishedCourses.Count > 0 || studentCount > 0 || reviewCount > 0,
            averageRating: averageRating,
            reviewCount: reviewCount,
            studentCount: studentCount,
            courseCount: publishedCourses.Count,
            categories: categories,
            courses: publishedCourses.Take(4).Select(course => new CourseSummary(
                id: course.Id,
                title: course.TieuDe,
                thumbnail: course.AnhDaiDien,
                category: course.ChuyenMuc,
                level: course.TrinhDo,
                students: course.CacGhiDanh.Count,
                averageRating: course.DiemDanhGiaTrungBinh,
                reviewCount: Math.Max(course.SoLuongDanhGia, course.CacDanhGia.Count)
            )).ToList()
        );
    }

    private static object TaoChiTietGiangVien(NguoiDung user)
    {
        var publishedCourses = user.CacKhoaHoc
            .Where(IsPublished)
            .OrderByDescending(course => course.CacGhiDanh.Count)
            .ThenByDescending(course => course.DiemDanhGiaTrungBinh)
            .ToList();

        var studentCount = publishedCourses
            .SelectMany(course => course.CacGhiDanh.Select(enrollment => enrollment.NguoiDungId))
            .Distinct()
            .Count();
        var reviewCount = publishedCourses.Sum(course => Math.Max(course.SoLuongDanhGia, course.CacDanhGia.Count));
        var averageRating = reviewCount == 0
            ? 0
            : Math.Round(publishedCourses.Sum(course => course.DiemDanhGiaTrungBinh * Math.Max(course.SoLuongDanhGia, course.CacDanhGia.Count)) / reviewCount, 1);
        var categories = publishedCourses
            .GroupBy(course => string.IsNullOrWhiteSpace(course.ChuyenMuc) ? "Khác" : course.ChuyenMuc)
            .Select(group => new { name = group.Key, courseCount = group.Count() })
            .OrderByDescending(item => item.courseCount)
            .ThenBy(item => item.name)
            .ToList();
        var specialty = categories.FirstOrDefault()?.name ?? "Giảng viên Skillio";

        return new
        {
            id = user.Id,
            name = string.IsNullOrWhiteSpace(user.Ten) ? "Giảng viên Skillio" : user.Ten,
            avatar = user.AnhDaiDien,
            bio = user.TieuSu,
            specialty,
            courseCount = publishedCourses.Count,
            studentCount,
            averageRating,
            reviewCount,
            categories,
            courses = publishedCourses.Select(course => new
            {
                id = course.Id,
                title = course.TieuDe,
                thumbnail = course.AnhDaiDien,
                category = course.ChuyenMuc,
                level = course.TrinhDo,
                price = course.Gia,
                students = course.CacGhiDanh.Count,
                averageRating = course.DiemDanhGiaTrungBinh,
                reviewCount = Math.Max(course.SoLuongDanhGia, course.CacDanhGia.Count)
            }).ToList()
        };
    }

    private static bool IsPublished(KhoaHoc course)
        => course.DaXuatBan || course.TrangThai.Equals("PUBLIC", StringComparison.OrdinalIgnoreCase)
                              || course.TrangThai.Equals("PUBLISHED", StringComparison.OrdinalIgnoreCase);

    private sealed record InstructorSummary(
        string id,
        string name,
        string? email,
        string? avatar,
        string? bio,
        string headline,
        string specialty,
        bool verified,
        double averageRating,
        int reviewCount,
        int studentCount,
        int courseCount,
        IReadOnlyList<CategorySummary> categories,
        IReadOnlyList<CourseSummary> courses);

    private sealed record CategorySummary(string name, int courseCount);

    private sealed record CourseSummary(
        string id,
        string title,
        string? thumbnail,
        string category,
        string level,
        int students,
        double averageRating,
        int reviewCount);
}
