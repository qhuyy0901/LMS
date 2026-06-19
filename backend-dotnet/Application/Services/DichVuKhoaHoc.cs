using System.Globalization;
using System.Security.Claims;
using System.Text;
using System.Text.Json;
using LMS.Api.Infrastructure.Persistence;
using LMS.Api.DTOs.PhanHoi;
using LMS.Api.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace LMS.Api.Application.Services;

/// <summary>
/// Dịch vụ khóa học — danh sách, chi tiết, đánh giá, chương trình giảng dạy, xuất bản.
/// </summary>
public interface IDichVuKhoaHoc
{
    Task<object> LayDanhSachAsync(
        int trang,
        int soLuong,
        bool phanTrang,
        string? tuKhoa,
        string? danhMuc,
        string? sapXep,
        string? gia,
        string? hangThanhVien,
        string? loaiTruCuaNguoiDungId = null);
    Task<object> LayExploreInsightsAsync();
    Task<object?> LayChiTietAsync(string khoaHocId, ClaimsPrincipal? nguoiDung);
    Task<object?> LayBaiHocThuAsync(string khoaHocId);
    Task<object?> LayKhoaHocDangHocAsync(string khoaHocId, ClaimsPrincipal nguoiDung);
    Task<object?> LayChiTietBaiHocAsync(string baiHocId, ClaimsPrincipal nguoiDung);
    Task<object?> LayDanhGiaAsync(string khoaHocId);
    Task<IResult> GuiDanhGiaAsync(string khoaHocId, string userId, int soSao, string? binhLuan);
    Task<IResult> XoaDanhGiaAsync(string khoaHocId, string userId);
    Task<object> LayChuongTrinhAsync(KhoaHoc khoaHoc);
}

public class DichVuKhoaHoc(ApplicationDbContext db) : IDichVuKhoaHoc
{
    public async Task<object> LayDanhSachAsync(
        int trang,
        int soLuong,
        bool phanTrang,
        string? tuKhoa,
        string? danhMuc,
        string? sapXep,
        string? gia,
        string? hangThanhVien,
        string? loaiTruCuaNguoiDungId = null)
    {
        trang = Math.Max(1, trang);
        soLuong = Math.Clamp(soLuong, 1, 100);

        IQueryable<KhoaHoc> truyVan = db.Courses.AsNoTracking()
            .Where(kh => kh.IsPublished)
            .Include(kh => kh.Instructor)
            .Include(kh => kh.Sections)
            .Include(kh => kh.Lessons)
            .Include(kh => kh.Enrollments);

        if (!string.IsNullOrWhiteSpace(loaiTruCuaNguoiDungId))
        {
            truyVan = truyVan.Where(kh =>
                !kh.Enrollments.Any(ghiDanh => ghiDanh.UserId == loaiTruCuaNguoiDungId) &&
                !kh.Purchases.Any(mua => mua.UserId == loaiTruCuaNguoiDungId && mua.Status == "COMPLETED"));
        }

        if (!string.IsNullOrWhiteSpace(tuKhoa))
        {
            var tuKhoaChuan = tuKhoa.Trim();
            var laNhomCongNghe = tuKhoaChuan.Equals("công nghệ", StringComparison.OrdinalIgnoreCase) ||
                                 tuKhoaChuan.Equals("cong nghe", StringComparison.OrdinalIgnoreCase);

            truyVan = laNhomCongNghe
                ? truyVan.Where(kh =>
                    kh.Category.Contains("Công nghệ") ||
                    kh.Category.Contains("Lập trình") ||
                    kh.Category.Contains("Dữ liệu") ||
                    kh.Category.Contains("AI") ||
                    kh.Category.Contains("Mạng máy tính") ||
                    kh.Category.Contains("Phần mềm") ||
                    kh.Category.Contains("An ninh mạng"))
                : truyVan.Where(kh =>
                    kh.Title.Contains(tuKhoaChuan) ||
                    (kh.Description != null && kh.Description.Contains(tuKhoaChuan)) ||
                    kh.Category.Contains(tuKhoaChuan) ||
                    (kh.Instructor != null && kh.Instructor.Name.Contains(tuKhoaChuan)));
        }

        if (!string.IsNullOrWhiteSpace(danhMuc))
        {
            var danhMucChuan = danhMuc.Trim();
            truyVan = truyVan.Where(kh => kh.Category.Contains(danhMucChuan));
        }

        if (gia == "free") truyVan = truyVan.Where(kh => kh.Price == 0);
        if (gia == "paid") truyVan = truyVan.Where(kh => kh.Price > 0);
        if (!string.IsNullOrWhiteSpace(hangThanhVien) && hangThanhVien != "all")
            truyVan = truyVan.Where(kh => kh.MinimumMemberTier == hangThanhVien);

        truyVan = sapXep switch
        {
            "price_asc" => truyVan.OrderBy(kh => kh.Price),
            "price_desc" => truyVan.OrderByDescending(kh => kh.Price),
            "rating_desc" => truyVan.OrderByDescending(kh => kh.AverageRating),
            "students_desc" => truyVan.OrderByDescending(kh => kh.Enrollments.Count),
            _ => truyVan.OrderByDescending(kh => kh.CreatedAt)
        };

        if (!phanTrang)
        {
            var ds = await truyVan.Take(soLuong).Select(kh => KhoaHocDto.TuKhoaHoc(kh)).ToListAsync();
            return ds;
        }

        var tong = await truyVan.CountAsync();
        var items = await truyVan.Skip((trang - 1) * soLuong).Take(soLuong)
            .Select(kh => KhoaHocDto.TuKhoaHoc(kh)).ToListAsync();

        return TroGiup.PhanTrang(items, tong, trang, soLuong);
    }

    public async Task<object> LayExploreInsightsAsync()
    {
        var courses = await db.Courses.AsNoTracking()
            .Where(kh => kh.IsPublished)
            .Include(kh => kh.Instructor)
            .Include(kh => kh.Sections)
                .ThenInclude(section => section.Lessons)
            .Include(kh => kh.Enrollments)
            .Include(kh => kh.Reviews)
            .OrderByDescending(kh => kh.Enrollments.Count)
            .ThenByDescending(kh => kh.AverageRating)
            .ThenByDescending(kh => kh.CreatedAt)
            .ToListAsync();

        var featuredCourse = courses.FirstOrDefault();
        var recommendedCourses = courses.Skip(featuredCourse is null ? 0 : 1).Take(3).Select(kh => new
        {
            id = kh.Id,
            title = kh.Title,
            thumbnail = kh.Thumbnail,
            instructorName = kh.Instructor?.Name ?? "Giảng viên",
            lessons = kh.Sections.Sum(section => section.Lessons.Count),
            students = kh.Enrollments.Count,
            rating = Math.Round(kh.AverageRating, 1)
        });

        var topInstructors = courses
            .Where(kh => kh.Instructor is not null)
            .GroupBy(kh => kh.InstructorId)
            .Select(group =>
            {
                var instructor = group.First().Instructor!;
                return new
                {
                    id = instructor.Id,
                    name = instructor.Name,
                    avatar = instructor.Avatar,
                    courseCount = group.Count(),
                    studentCount = group.Sum(kh => kh.Enrollments.Count),
                    averageRating = group.SelectMany(kh => kh.Reviews).Any()
                        ? Math.Round(group.SelectMany(kh => kh.Reviews).Average(review => review.Rating), 1)
                        : 0
                };
            })
            .OrderByDescending(item => item.studentCount)
            .ThenByDescending(item => item.averageRating)
            .Take(4)
            .ToList();

        var trendingTopics = courses
            .Where(kh => !string.IsNullOrWhiteSpace(kh.Category))
            .GroupBy(kh => kh.Category.Trim())
            .Select(group => new
            {
                name = group.Key,
                courseCount = group.Count(),
                studentCount = group.Sum(kh => kh.Enrollments.Count),
                growth = Math.Min(99, Math.Max(8, group.Count() * 7 + group.Sum(kh => kh.Enrollments.Count) * 3))
            })
            .OrderByDescending(item => item.studentCount)
            .ThenByDescending(item => item.courseCount)
            .Take(5)
            .ToList();

        var learningPaths = courses
            .Where(kh => !string.IsNullOrWhiteSpace(kh.Category))
            .GroupBy(kh => kh.Category.Trim())
            .Select(group => new
            {
                id = TaoSlug(group.Key),
                title = $"Lộ trình {group.Key}",
                category = group.Key,
                courseCount = group.Count(),
                lessonCount = group.Sum(kh => kh.Sections.Sum(section => section.Lessons.Count)),
                estimatedMonths = Math.Clamp((int)Math.Ceiling(group.Sum(kh => kh.Sections.Sum(section => section.Lessons.Count)) / 12.0), 1, 12),
                progress = 0
            })
            .OrderByDescending(item => item.courseCount)
            .ThenByDescending(item => item.lessonCount)
            .Take(3)
            .ToList();

        return new
        {
            featuredCourse = featuredCourse is null ? null : new
            {
                id = featuredCourse.Id,
                title = featuredCourse.Title,
                description = featuredCourse.ShortDescription ?? featuredCourse.Description,
                thumbnail = featuredCourse.Thumbnail,
                category = featuredCourse.Category,
                lessons = featuredCourse.Sections.Sum(section => section.Lessons.Count),
                sections = featuredCourse.Sections.Count,
                students = featuredCourse.Enrollments.Count,
                rating = Math.Round(featuredCourse.AverageRating, 1),
                instructorName = featuredCourse.Instructor?.Name ?? "Giảng viên"
            },
            recommendedCourses,
            topInstructors,
            trendingTopics,
            learningPaths
        };
    }

    public async Task<object?> LayChiTietAsync(string khoaHocId, ClaimsPrincipal? nguoiDung)
    {
        var kh = await db.Courses.AsNoTracking()
            .Include(c => c.Instructor)
            .Include(c => c.Sections.OrderBy(s => s.Position))
                .ThenInclude(s => s.Lessons.OrderBy(l => l.Position))
                    .ThenInclude(l => l.Quiz)
            .Include(c => c.Reviews.OrderByDescending(r => r.CreatedAt).Take(10))
                .ThenInclude(r => r.User)
            .FirstOrDefaultAsync(c => c.Id == khoaHocId);

        if (kh is null) return null;
        var studentCount = await db.Enrollments.AsNoTracking()
            .Where(enrollment => enrollment.CourseId == khoaHocId)
            .Select(enrollment => enrollment.UserId)
            .Union(db.Purchases.AsNoTracking()
                .Where(purchase => purchase.CourseId == khoaHocId && purchase.Status == "COMPLETED")
                .Select(purchase => purchase.UserId))
            .Distinct()
            .CountAsync();
        var purchaseCount = await db.Purchases.AsNoTracking()
            .CountAsync(purchase => purchase.CourseId == khoaHocId && purchase.Status == "COMPLETED");

        var userId = TroGiup.LayUserId(nguoiDung!);
        var laXemThuSinhVien = nguoiDung?.HasClaim("StudentPreview", "true") == true;
        var laKhoaHocCuaGiangVienXemThu = laXemThuSinhVien && userId is not null && kh.InstructorId == userId;
        var laChuSoHuu = !laXemThuSinhVien && userId is not null && kh.InstructorId == userId;
        if (!kh.IsPublished && !laChuSoHuu) return null;

        GhiDanh? ghiDanh = null;
        var baiHoanThanh = new List<string>();
        DanhGiaKhoaHoc? danhGiaCuaToi = null;

        if (userId is not null)
        {
            ghiDanh = await db.Enrollments.AsNoTracking().FirstOrDefaultAsync(e => e.UserId == userId && e.CourseId == khoaHocId);
            if (ghiDanh is not null)
            {
                baiHoanThanh = await db.LessonProgresses.AsNoTracking()
                    .Where(p => p.UserId == userId && p.IsCompleted && p.Lesson != null && p.Lesson.CourseId == khoaHocId)
                    .Select(p => p.LessonId).ToListAsync();
                danhGiaCuaToi = await db.CourseReviews.AsNoTracking().FirstOrDefaultAsync(r => r.UserId == userId && r.CourseId == khoaHocId);
            }
        }
        if (laKhoaHocCuaGiangVienXemThu && kh.IsPublished)
        {
            ghiDanh = new GhiDanh { Id = "student-preview", UserId = userId ?? string.Empty, CourseId = khoaHocId, Progress = 0 };
            baiHoanThanh = [];
            danhGiaCuaToi = null;
        }

        return ChiTietKhoaHocDto.TuKhoaHoc(kh, ghiDanh, baiHoanThanh, danhGiaCuaToi, laChuSoHuu, studentCount, purchaseCount);
    }

    public async Task<object?> LayBaiHocThuAsync(string khoaHocId)
    {
        var kh = await db.Courses.AsNoTracking()
            .Include(c => c.Sections.OrderBy(s => s.Position))
                .ThenInclude(s => s.Lessons.OrderBy(l => l.Position))
                    .ThenInclude(l => l.Quiz)
            .FirstOrDefaultAsync(c => c.Id == khoaHocId && c.IsPublished);

        if (kh is null) return null;

        var sections = kh.Sections
            .OrderBy(section => section.Position)
            .Select(section => new
            {
                id = section.Id,
                tieuDe = section.Title,
                title = section.Title,
                thuTu = section.Position,
                lessons = section.Lessons
                    .OrderBy(lesson => lesson.Position)
                    .Select(lesson => MapStudentLesson(lesson, isLocked: !lesson.IsPreview, isCompleted: false, includeContent: lesson.IsPreview))
            })
            .ToList();

        return new
        {
            courseId = kh.Id,
            id = kh.Id,
            tieuDe = kh.Title,
            title = kh.Title,
            gia = kh.Price,
            price = kh.Price,
            coHocThu = kh.Sections.SelectMany(section => section.Lessons).Any(lesson => lesson.IsPreview),
            lessons = sections.SelectMany(section => section.lessons),
            sections
        };
    }

    public async Task<object?> LayKhoaHocDangHocAsync(string khoaHocId, ClaimsPrincipal nguoiDung)
    {
        var userId = TroGiup.LayUserId(nguoiDung);
        if (userId is null) return null;
        var laXemThuSinhVien = nguoiDung.HasClaim("StudentPreview", "true");

        var ghiDanh = await db.Enrollments.AsNoTracking().FirstOrDefaultAsync(e => e.UserId == userId && e.CourseId == khoaHocId);
        var laKhoaHocCuaGiangVienXemThu = laXemThuSinhVien &&
            await db.Courses.AnyAsync(course => course.Id == khoaHocId && course.InstructorId == userId && course.IsPublished);
        if (ghiDanh is null && !laKhoaHocCuaGiangVienXemThu) return null;

        var kh = await db.Courses.AsNoTracking()
            .Include(c => c.Sections.OrderBy(s => s.Position))
                .ThenInclude(s => s.Lessons.OrderBy(l => l.Position))
                    .ThenInclude(l => l.Quiz)
            .FirstOrDefaultAsync(c => c.Id == khoaHocId && c.IsPublished);

        if (kh is null) return null;

        var completedLessonIds = laKhoaHocCuaGiangVienXemThu ? new List<string>() : await db.LessonProgresses.AsNoTracking()
            .Where(progress => progress.UserId == userId && progress.IsCompleted && progress.Lesson != null && progress.Lesson.CourseId == khoaHocId)
            .Select(progress => progress.LessonId)
            .ToListAsync();

        var sections = kh.Sections
            .OrderBy(section => section.Position)
            .Select(section => new
            {
                id = section.Id,
                tieuDe = section.Title,
                title = section.Title,
                thuTu = section.Position,
                lessons = section.Lessons
                    .OrderBy(lesson => lesson.Position)
                    .Select(lesson => MapStudentLesson(lesson, isLocked: false, completedLessonIds.Contains(lesson.Id), includeContent: false))
            })
            .ToList();

        return new
        {
            courseId = kh.Id,
            id = kh.Id,
            tieuDe = kh.Title,
            title = kh.Title,
            progress = ghiDanh?.Progress ?? 0,
            sections
        };
    }

    public async Task<object?> LayChiTietBaiHocAsync(string baiHocId, ClaimsPrincipal nguoiDung)
    {
        var userId = TroGiup.LayUserId(nguoiDung);
        if (userId is null) return null;

        var baiHoc = await db.Lessons.AsNoTracking()
            .Include(lesson => lesson.Course)
            .Include(lesson => lesson.Section)
            .Include(lesson => lesson.Quiz)
            .FirstOrDefaultAsync(lesson => lesson.Id == baiHocId && lesson.Course != null && lesson.Course.IsPublished);

        if (baiHoc is null) return null;

        var daGhiDanh = await db.Enrollments.AsNoTracking().AnyAsync(e => e.UserId == userId && e.CourseId == baiHoc.CourseId);
        var laXemThuSinhVien = nguoiDung.HasClaim("StudentPreview", "true");
        var laKhoaHocCuaGiangVienXemThu = laXemThuSinhVien && baiHoc.Course?.InstructorId == userId;
        var isLocked = !laKhoaHocCuaGiangVienXemThu && !daGhiDanh && !baiHoc.IsPreview;
        var isCompleted = !laKhoaHocCuaGiangVienXemThu && await db.LessonProgresses.AsNoTracking().AnyAsync(p => p.UserId == userId && p.LessonId == baiHocId && p.IsCompleted);

        return MapStudentLesson(baiHoc, isLocked, isCompleted, includeContent: !isLocked);
    }

    public async Task<object?> LayDanhGiaAsync(string khoaHocId)
    {
        var kh = await db.Courses.AsNoTracking()
            .Include(c => c.Reviews.OrderByDescending(r => r.CreatedAt)).ThenInclude(r => r.User)
            .FirstOrDefaultAsync(c => c.Id == khoaHocId && c.IsPublished);
        if (kh is null) return null;

        return new { averageRating = kh.AverageRating, reviewCount = kh.ReviewCount, reviews = kh.Reviews.Select(DanhGiaDto.TuDanhGia) };
    }

    public async Task<IResult> GuiDanhGiaAsync(string khoaHocId, string userId, int soSao, string? binhLuan)
    {
        if (soSao < 1 || soSao > 5) return Results.BadRequest(new { message = "Số sao đánh giá phải trong khoảng từ 1 đến 5" });

        var kh = await db.Courses.FirstOrDefaultAsync(c => c.Id == khoaHocId && c.IsPublished);
        if (kh is null) return Results.NotFound(new { message = "Không tìm thấy khóa học" });
        if (kh.InstructorId == userId) return Results.Json(new { message = "Giảng viên không thể tự đánh giá khóa học của mình" }, statusCode: 403);

        if (!await db.Enrollments.AnyAsync(e => e.UserId == userId && e.CourseId == khoaHocId))
            return Results.Json(new { message = "Bạn cần đăng ký khóa học trước khi đánh giá" }, statusCode: 403);

        var now = DateTime.UtcNow;
        var dg = await db.CourseReviews.Include(r => r.User).FirstOrDefaultAsync(r => r.UserId == userId && r.CourseId == khoaHocId);

        if (dg is null)
        {
            dg = new DanhGiaKhoaHoc { Id = TaoId.Moi(), UserId = userId, CourseId = khoaHocId, CreatedAt = now };
            db.CourseReviews.Add(dg);
        }

        dg.Rating = soSao;
        dg.Comment = string.IsNullOrWhiteSpace(binhLuan) ? null : binhLuan.Trim();
        dg.UpdatedAt = now;

        var studentName = await db.Users.AsNoTracking()
            .Where(user => user.Id == userId)
            .Select(user => user.Name)
            .FirstOrDefaultAsync() ?? "Một học viên";
        db.Notifications.Add(new ThongBao
        {
            Id = TaoId.Moi(),
            UserId = kh.InstructorId,
            Type = "INSTRUCTOR_COURSE_REVIEW",
            Title = "Khóa học có đánh giá mới",
            Body = $"{studentName} vừa đánh giá {soSao} sao cho khóa học {kh.Title}.",
            Link = $"/course/{khoaHocId}",
            Metadata = JsonSerializer.Serialize(new { courseId = khoaHocId, reviewId = dg.Id, studentId = userId }),
            CreatedAt = now
        });

        await db.SaveChangesAsync();
        await DongBoThongKeDanhGia(khoaHocId);

        var dgDaLuu = await db.CourseReviews.AsNoTracking().Include(r => r.User).FirstAsync(r => r.Id == dg.Id);
        var khCapNhat = await db.Courses.AsNoTracking().FirstAsync(c => c.Id == khoaHocId);

        return Results.Ok(new { message = "Đã lưu đánh giá khóa học", review = DanhGiaDto.TuDanhGia(dgDaLuu), averageRating = khCapNhat.AverageRating, reviewCount = khCapNhat.ReviewCount });
    }

    public async Task<IResult> XoaDanhGiaAsync(string khoaHocId, string userId)
    {
        var dg = await db.CourseReviews.FirstOrDefaultAsync(r => r.UserId == userId && r.CourseId == khoaHocId);
        if (dg is null) return Results.NotFound(new { message = "Bạn chưa có đánh giá nào để xóa" });

        db.CourseReviews.Remove(dg);
        await db.SaveChangesAsync();
        await DongBoThongKeDanhGia(khoaHocId);

        var kh = await db.Courses.AsNoTracking().FirstAsync(c => c.Id == khoaHocId);
        return Results.Ok(new { message = "Đã xóa đánh giá của bạn", averageRating = kh.AverageRating, reviewCount = kh.ReviewCount });
    }

    public async Task<object> LayChuongTrinhAsync(KhoaHoc khoaHoc)
    {
        return await Task.FromResult(LayChuongTrinh_Static(khoaHoc));
    }

    public static object LayChuongTrinh_Static(KhoaHoc khoaHoc)
    {
        var loiXuatBan = KiemTraXuatBan(khoaHoc);
        return new
        {
            khoaHoc.Id, khoaHoc.Title, khoaHoc.Slug, khoaHoc.Description, khoaHoc.Thumbnail,
            khoaHoc.Price, khoaHoc.AverageRating, khoaHoc.ReviewCount, khoaHoc.MinimumMemberTier,
            khoaHoc.TotalDurationSeconds, khoaHoc.IsPublished, khoaHoc.PublishedAt,
            khoaHoc.StartDate, khoaHoc.EndDate,
            totalLessons = khoaHoc.Sections.Sum(c => c.Lessons.Count),
            sections = khoaHoc.Sections.OrderBy(c => c.Position).Select(ChuongDto.TuChuong),
            publishValidationErrors = loiXuatBan,
            canPublish = loiXuatBan.Count == 0
        };
    }

    // ── Hàm nội bộ ──────────────────────────────────────────

    private static string TaoSlug(string value)
    {
        var normalized = value.ToLowerInvariant().Normalize(NormalizationForm.FormD);
        var builder = new StringBuilder();
        foreach (var character in normalized)
        {
            var category = CharUnicodeInfo.GetUnicodeCategory(character);
            if (category == UnicodeCategory.NonSpacingMark) continue;
            if (char.IsLetterOrDigit(character)) builder.Append(character);
            else if (char.IsWhiteSpace(character) || character is '-' or '_') builder.Append('-');
        }
        return string.Join("-", builder.ToString().Split('-', StringSplitOptions.RemoveEmptyEntries));
    }

    private async Task DongBoThongKeDanhGia(string khoaHocId)
    {
        var danhGia = await db.CourseReviews.Where(r => r.CourseId == khoaHocId).ToListAsync();
        var kh = await db.Courses.FirstOrDefaultAsync(c => c.Id == khoaHocId);
        if (kh is null) return;
        kh.AverageRating = danhGia.Count == 0 ? 0 : danhGia.Average(r => r.Rating);
        kh.ReviewCount = danhGia.Count;
        kh.UpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync();
    }

    private static object MapStudentLesson(BaiHoc lesson, bool isLocked, bool isCompleted, bool includeContent)
    {
        return new
        {
            id = lesson.Id,
            lessonId = lesson.Id,
            courseId = lesson.CourseId,
            sectionId = lesson.SectionId,
            sectionTitle = lesson.Section?.Title,
            tieuDe = lesson.Title,
            title = lesson.Title,
            noiDung = includeContent ? lesson.Content : null,
            content = includeContent ? lesson.Content : null,
            videoUrl = includeContent ? lesson.VideoUrl : null,
            anhMinhHoa = includeContent ? lesson.IllustrationUrl : null,
            illustrationUrl = includeContent ? lesson.IllustrationUrl : null,
            thoiLuongGiay = lesson.DurationSeconds ?? 0,
            durationSeconds = lesson.DurationSeconds ?? 0,
            choPhepHocThu = lesson.IsPreview,
            isPreview = lesson.IsPreview,
            isPublished = lesson.IsPublished,
            isLocked,
            isCompleted,
            hasQuiz = lesson.Quiz is not null,
            quizId = lesson.Quiz?.Id,
            quiz = lesson.Quiz == null ? null : new { lesson.Quiz.Id, lesson.Quiz.Title, lesson.Quiz.PassingScore }
        };
    }

    public static List<string> KiemTraXuatBan(KhoaHoc khoaHoc)
    {
        var loi = new List<string>();
        if (string.IsNullOrWhiteSpace(khoaHoc.Description)) loi.Add("Khóa học cần có mô tả trước khi xuất bản");
        if (string.IsNullOrWhiteSpace(khoaHoc.Thumbnail)) loi.Add("Khóa học cần có ảnh bìa trước khi xuất bản");
        if (khoaHoc.Sections.Sum(s => s.Lessons.Count) < 1)
            loi.Add("Khóa học phải có ít nhất 1 bài giảng đã xuất bản");
        return loi;
    }
}
