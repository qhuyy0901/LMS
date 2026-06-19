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
        var user = await db.Users.AsNoTracking()
            .Where(item => item.Id == id && (item.Role == "INSTRUCTOR" || item.Role == "TEACHER" || item.Role == "GIANGVIEN"))
            .Include(item => item.Courses)
                .ThenInclude(course => course.Enrollments)
            .Include(item => item.Courses)
                .ThenInclude(course => course.Reviews)
            .FirstOrDefaultAsync();

        if (user is null) return Results.NotFound(new { message = "Không tìm thấy giảng viên" });

        return Results.Ok(TaoChiTietGiangVien(user));
    }

    [HttpGet("/api/instructors")]
    public async Task<IResult> DanhSachGiangVien()
    {
        var users = await db.Users.AsNoTracking()
            .Where(user => user.Role == "INSTRUCTOR" || user.Role == "TEACHER" || user.Role == "GIANGVIEN")
            .Include(user => user.Courses)
                .ThenInclude(course => course.Enrollments)
            .Include(user => user.Courses)
                .ThenInclude(course => course.Reviews)
            .OrderBy(user => user.Name)
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
            .SelectMany(item => item.categories.Select(category => new { category.name, category.courseCount, InstructorId = item.id }))
            .GroupBy(item => item.name)
            .Select(group => new
            {
                name = group.Key,
                instructorCount = group.Select(item => item.InstructorId).Distinct().Count(),
                courseCount = group.Sum(item => item.courseCount),
                percentage = instructors.Count == 0
                    ? 0
                    : Math.Round(group.Select(item => item.InstructorId).Distinct().Count() * 100.0 / instructors.Count, 1)
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
        var publishedCourses = user.Courses
            .Where(IsPublished)
            .OrderByDescending(course => course.Enrollments.Count)
            .ThenByDescending(course => course.AverageRating)
            .ToList();

        var studentCount = publishedCourses.Sum(course => course.Enrollments.Count);
        var reviewCount = publishedCourses.Sum(course => Math.Max(course.ReviewCount, course.Reviews.Count));
        var ratingWeight = publishedCourses.Sum(course =>
        {
            var weight = Math.Max(course.ReviewCount, course.Reviews.Count);
            return course.AverageRating > 0 ? course.AverageRating * weight : 0;
        });
        var averageRating = reviewCount == 0 ? 0 : Math.Round(ratingWeight / reviewCount, 1);

        var categories = publishedCourses
            .GroupBy(course => string.IsNullOrWhiteSpace(course.Category) ? "Khác" : course.Category)
            .Select(group => new CategorySummary(group.Key, group.Count()))
            .OrderByDescending(item => item.courseCount)
            .ThenBy(item => item.name)
            .ToList();

        var mainCategory = categories.FirstOrDefault()?.name ?? "Giảng viên Skillio";

        return new InstructorSummary(
            id: user.Id,
            name: string.IsNullOrWhiteSpace(user.Name) ? user.Email : user.Name,
            email: null,
            avatar: user.Avatar,
            bio: user.Bio,
            headline: string.IsNullOrWhiteSpace(user.Bio)
                ? $"{mainCategory} · {publishedCourses.Count} khóa học"
                : user.Bio,
            specialty: mainCategory,
            verified: publishedCourses.Count > 0 || studentCount > 0 || reviewCount > 0,
            averageRating: averageRating,
            reviewCount: reviewCount,
            studentCount: studentCount,
            courseCount: publishedCourses.Count,
            categories: categories,
            courses: publishedCourses.Take(4).Select(course => new CourseSummary(
                id: course.Id,
                title: course.Title,
                thumbnail: course.Thumbnail,
                category: course.Category,
                level: course.Level,
                students: course.Enrollments.Count,
                averageRating: course.AverageRating,
                reviewCount: Math.Max(course.ReviewCount, course.Reviews.Count)
            )).ToList()
        );
    }

    private static object TaoChiTietGiangVien(NguoiDung user)
    {
        var publishedCourses = user.Courses
            .Where(IsPublished)
            .OrderByDescending(course => course.Enrollments.Count)
            .ThenByDescending(course => course.AverageRating)
            .ToList();

        var studentCount = publishedCourses
            .SelectMany(course => course.Enrollments.Select(enrollment => enrollment.UserId))
            .Distinct()
            .Count();
        var reviewCount = publishedCourses.Sum(course => Math.Max(course.ReviewCount, course.Reviews.Count));
        var averageRating = reviewCount == 0
            ? 0
            : Math.Round(publishedCourses.Sum(course => course.AverageRating * Math.Max(course.ReviewCount, course.Reviews.Count)) / reviewCount, 1);
        var categories = publishedCourses
            .GroupBy(course => string.IsNullOrWhiteSpace(course.Category) ? "Khác" : course.Category)
            .Select(group => new { name = group.Key, courseCount = group.Count() })
            .OrderByDescending(item => item.courseCount)
            .ThenBy(item => item.name)
            .ToList();
        var specialty = categories.FirstOrDefault()?.name ?? "Giảng viên Skillio";

        return new
        {
            id = user.Id,
            name = string.IsNullOrWhiteSpace(user.Name) ? "Giảng viên Skillio" : user.Name,
            avatar = user.Avatar,
            bio = user.Bio,
            specialty,
            courseCount = publishedCourses.Count,
            studentCount,
            averageRating,
            reviewCount,
            categories,
            courses = publishedCourses.Select(course => new
            {
                id = course.Id,
                title = course.Title,
                thumbnail = course.Thumbnail,
                category = course.Category,
                level = course.Level,
                price = course.Price,
                students = course.Enrollments.Count,
                averageRating = course.AverageRating,
                reviewCount = Math.Max(course.ReviewCount, course.Reviews.Count)
            }).ToList()
        };
    }

    private static bool IsPublished(KhoaHoc course)
        => course.IsPublished || course.Status.Equals("PUBLIC", StringComparison.OrdinalIgnoreCase)
                              || course.Status.Equals("PUBLISHED", StringComparison.OrdinalIgnoreCase);

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
