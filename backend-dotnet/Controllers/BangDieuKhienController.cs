using System.Globalization;
using System.Security.Claims;
using LMS.Api.Data;
using LMS.Api.DTOs.PhanHoi;
using LMS.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace LMS.Api.Controllers;

/// <summary>Controller bảng điều khiển: thống kê cá nhân và báo cáo học tập.</summary>
[ApiController]
[Authorize]
public class BangDieuKhienController(LmsDbContext db) : ControllerBase
{
    [HttpGet("/api/dashboard/stats")]
    public async Task<IResult> ThongKeTheoVaiTro()
    {
        var userId = TroGiup.LayUserId(User);
        if (userId is null) return Results.Unauthorized();

        var role = User.FindFirstValue(ClaimTypes.Role);
        return role switch
        {
            "ADMIN" => await ThongKeQuanTri(),
            "INSTRUCTOR" => await ThongKeGiangVien(userId),
            _ => await ThongKeSinhVien(userId)
        };
    }

    /// <summary>Thống kê tổng quan cho học viên.</summary>
    [HttpGet("/api/dashboard")]
    public async Task<IResult> ThongKe()
    {
        var userId = TroGiup.LayUserId(User);
        if (userId is null) return Results.Unauthorized();

        var khoaHocSoHuuIds = db.Enrollments
            .Where(e => e.UserId == userId)
            .Select(e => e.CourseId)
            .Union(db.Purchases
                .Where(p => p.UserId == userId && p.Status == "COMPLETED")
                .Select(p => p.CourseId));
        var soKhoaHoc = await khoaHocSoHuuIds.CountAsync();
        var daBaiXong = await db.LessonProgresses.CountAsync(p => p.UserId == userId && p.IsCompleted);
        var tienDoTrungBinh = await db.Enrollments
            .Where(e => e.UserId == userId)
            .Select(e => (double?)e.Progress)
            .AverageAsync() ?? 0;
        var soKhoaHocHoanThanh = await db.Enrollments.CountAsync(e => e.UserId == userId && e.CompletedAt != null);
        var soChungChi = await db.Certificates.CountAsync(c => c.UserId == userId);
        var soSuKienDaThamGia = await db.EventRewardRedemptions.CountAsync(e => e.UserId == userId);
        var nguoiDung = await db.Users.FirstOrDefaultAsync(u => u.Id == userId);
        var khoaHocDangHoc = await db.Courses
            .AsNoTracking()
            .Where(kh =>
                kh.Enrollments.Any(e => e.UserId == userId && e.CompletedAt == null) ||
                (kh.Purchases.Any(p => p.UserId == userId && p.Status == "COMPLETED") &&
                 !kh.Enrollments.Any(e => e.UserId == userId && e.CompletedAt != null)))
            .Select(kh => new
            {
                courseId = kh.Id,
                title = kh.Title,
                thumbnail = kh.Thumbnail,
                category = kh.Category,
                instructorName = kh.Instructor != null ? kh.Instructor.Name : "Giảng viên",
                progress = kh.Enrollments
                    .Where(e => e.UserId == userId)
                    .Select(e => (double?)e.Progress)
                    .FirstOrDefault() ?? 0,
                totalLessons = kh.Lessons.Count,
                enrolledAt = kh.Enrollments
                    .Where(e => e.UserId == userId)
                    .Select(e => (DateTime?)e.CreatedAt)
                    .FirstOrDefault(),
                purchasedAt = kh.Purchases
                    .Where(p => p.UserId == userId && p.Status == "COMPLETED")
                    .OrderBy(p => p.CreatedAt)
                    .Select(p => (DateTime?)p.CreatedAt)
                    .FirstOrDefault(),
                courseStartDate = kh.StartDate,
                courseEndDate = kh.EndDate,
                updatedAt = kh.Enrollments
                    .Where(e => e.UserId == userId)
                    .Select(e => (DateTime?)e.UpdatedAt)
                    .FirstOrDefault()
            })
            .OrderByDescending(kh => kh.updatedAt ?? kh.purchasedAt)
            .Take(6)
            .ToListAsync();

        if (nguoiDung is null) return Results.Unauthorized();

        if (TroGiup.DongBoHangThanhVien(nguoiDung))
            await db.SaveChangesAsync();

        var hangThanhVien = TroGiup.TinhHangThanhVien(nguoiDung.WalletBalance);
        var homNay = TroGiup.LayNgayDiaPhuong();
        var tuanHienTai = TroGiup.LayMaTuan(homNay);
        var dauNgayUtc = DateTime.UtcNow.Date;
        var dailyQuizPassed = await db.QuizSubmissions.AsNoTracking()
            .AnyAsync(submission => submission.UserId == userId && submission.Passed && submission.CreatedAt >= dauNgayUtc);

        return Results.Ok(new
        {
            totalCourses = soKhoaHoc,
            completedCourses = soKhoaHocHoanThanh,
            completedLessons = daBaiXong,
            certificates = soChungChi,
            participatedEvents = soSuKienDaThamGia,
            averageProgress = TroGiup.GioiHanPhanTram(tienDoTrungBinh),
            walletBalance = nguoiDung.WalletBalance,
            totalSpent = nguoiDung.TotalSpent,
            memberTier = hangThanhVien.Hang,
            memberTierLabel = hangThanhVien.NhanHieu,
            rewardPoints = nguoiDung.RewardPoints,
            loginStreak = nguoiDung.LoginStreak,
            lastRewardLoginDate = nguoiDung.LastRewardLoginDate,
            nextLoginReward = Math.Min(10, 3 + nguoiDung.LoginStreak),
            dailyLessonCompleted = nguoiDung.LastLessonRewardDate?.Date == homNay,
            dailyQuizPassed,
            weeklyPurchaseCompleted = nguoiDung.LastPurchaseRewardWeek == tuanHienTai,
            recentCourses = khoaHocDangHoc
        });
    }

    /// <summary>Báo cáo học tập 7 ngày qua.</summary>
    [HttpGet("/api/user/reports")]
    public async Task<IResult> BaoCaoHocTap()
    {
        var userId = TroGiup.LayUserId(User);
        if (userId is null) return Results.Unauthorized();

        var buckets = TaoThongKe7Ngay();
        var ngayDau = buckets.First().Date;

        var tienDoTrongTuan = await db.LessonProgresses.AsNoTracking()
            .Where(p => p.UserId == userId && p.UpdatedAt >= ngayDau)
            .ToListAsync();

        foreach (var tienDoBai in tienDoTrongTuan)
        {
            var key = LayKeyNgay(tienDoBai.UpdatedAt);
            var bucket = buckets.FirstOrDefault(b => b.Key == key);
            if (bucket is null) continue;

            bucket.Minutes += tienDoBai.WatchedSeconds / 60;
            if (tienDoBai.IsCompleted) bucket.CompletedLessons += 1;
        }

        var ghiDanhs = await db.Enrollments.AsNoTracking()
            .Where(e => e.UserId == userId)
            .Include(e => e.Course)
                .ThenInclude(c => c!.Instructor)
            .Include(e => e.Course)
                .ThenInclude(c => c!.Lessons)
            .OrderByDescending(e => e.UpdatedAt)
            .ToListAsync();

        var baiHoanThanhIds = await db.LessonProgresses.AsNoTracking()
            .Where(p => p.UserId == userId && p.IsCompleted)
            .Select(p => p.LessonId)
            .ToListAsync();
        var baiHoanThanhSet = baiHoanThanhIds.ToHashSet();

        var chungChi = await db.Certificates.AsNoTracking()
            .Where(c => c.UserId == userId)
            .Include(c => c.Course)
            .OrderByDescending(c => c.IssuedAt)
            .ToListAsync();

        var baiNopGanDay = await db.QuizSubmissions.AsNoTracking()
            .Where(s => s.UserId == userId)
            .Include(s => s.Quiz)
                .ThenInclude(q => q!.Lesson)
                    .ThenInclude(l => l!.Course)
            .OrderByDescending(s => s.CreatedAt)
            .Take(6)
            .ToListAsync();

        var diemQuizTrungBinh = baiNopGanDay.Count == 0
            ? 0
            : Math.Round(baiNopGanDay.Average(s => s.Score), 1);

        var thanhTuu = new List<ThanhTuuDto>();
        if (ghiDanhs.Count >= 1)
        {
            thanhTuu.Add(new("a1", "course", "Bước đầu học tập", "Đăng ký khóa học đầu tiên", ghiDanhs.Last().CreatedAt, null));
        }

        if (ghiDanhs.Count >= 5)
        {
            thanhTuu.Add(new("a2", "course", "Ham học hỏi", "Đăng ký 5 khóa học", ghiDanhs.OrderBy(e => e.CreatedAt).Skip(4).First().CreatedAt, null));
        }

        var baiNopDat = baiNopGanDay.FirstOrDefault(s => s.Passed);
        if (baiNopDat is not null)
        {
            thanhTuu.Add(new("a3", "quiz", "Vượt thử thách", "Hoàn thành bài kiểm tra đạt yêu cầu", baiNopDat.CreatedAt, (int)Math.Round(baiNopDat.Score)));
        }

        foreach (var cert in chungChi.Take(3))
        {
            thanhTuu.Add(new(
                cert.Id,
                "certificate",
                "Nhận chứng chỉ",
                cert.Course == null ? "Hoàn thành một khóa học" : $"Hoàn thành {cert.Course.Title}",
                cert.IssuedAt,
                null));
        }

        var khoaHoanThanh = ghiDanhs.FirstOrDefault(e => e.CompletedAt is not null || e.Progress >= 100);
        if (khoaHoanThanh is not null)
        {
            thanhTuu.Add(new(
                "a4",
                "course",
                "Hoàn thành xuất sắc",
                khoaHoanThanh.Course == null ? "Hoàn thành khóa học đầu tiên" : $"Hoàn thành {khoaHoanThanh.Course.Title}",
                khoaHoanThanh.CompletedAt ?? khoaHoanThanh.UpdatedAt,
                null));
        }

        var totalMinutes = buckets.Sum(b => b.Minutes);
        var totalCompletedLessons = baiHoanThanhSet.Count;
        var quizDaLamTuanNay = baiNopGanDay.Count(s => s.CreatedAt >= ngayDau);
        var baiHoanThanhTrongTuan = buckets.Sum(b => b.CompletedLessons);

        return Results.Ok(new
        {
            summary = new
            {
                learningHours = Math.Round(totalMinutes / 60d, 1),
                completedLessons = totalCompletedLessons,
                averageQuizScore = diemQuizTrungBinh,
                certificates = chungChi.Count
            },
            weeklyActivity = buckets.Select(b => new
            {
                b.Date,
                b.Key,
                b.Label,
                b.Minutes,
                Hours = Math.Round(b.Minutes / 60d, 1),
                b.CompletedLessons
            }),
            courseProgress = ghiDanhs.Select(e =>
            {
                var lessons = e.Course?.Lessons.ToList() ?? [];
                var totalLessons = lessons.Count;
                var completedLessons = lessons.Count(l => baiHoanThanhSet.Contains(l.Id));
                var progress = totalLessons == 0
                    ? TroGiup.GioiHanPhanTram(e.Progress)
                    : TroGiup.GioiHanPhanTram(Math.Max(e.Progress, completedLessons * 100d / totalLessons));

                return new
                {
                    id = e.CourseId,
                    title = e.Course?.Title ?? "Khóa học",
                    instructorName = e.Course?.Instructor?.Name ?? "Giảng viên",
                    completedLessons,
                    totalLessons,
                    progress
                };
            }),
            recentQuizSubmissions = baiNopGanDay.Select(s => new
            {
                s.Id,
                title = s.Quiz?.Title ?? "Bài kiểm tra",
                courseTitle = s.Quiz?.Lesson?.Course?.Title ?? "Khóa học",
                score = Math.Round(s.Score, 1),
                s.Passed,
                s.CreatedAt
            }),
            recentAchievements = thanhTuu
                .OrderByDescending(t => t.Date)
                .Take(6),
            weeklyGoals = new[]
            {
                new { id = "g1", title = "Học 5 giờ", current = Math.Min(5, (int)Math.Round(totalMinutes / 60d)), target = 5, unit = "giờ", progress = TroGiup.GioiHanPhanTram(totalMinutes / 300d * 100) },
                new { id = "g2", title = "Hoàn thành 5 bài học", current = Math.Min(5, baiHoanThanhTrongTuan), target = 5, unit = "bài", progress = TroGiup.GioiHanPhanTram(baiHoanThanhTrongTuan / 5d * 100) },
                new { id = "g3", title = "Làm 3 bài kiểm tra", current = Math.Min(3, quizDaLamTuanNay), target = 3, unit = "quiz", progress = TroGiup.GioiHanPhanTram(quizDaLamTuanNay / 3d * 100) }
            },
            dailyActivity = buckets,
            totalMinutes,
            totalCompletedLessons,
            achievements = thanhTuu,
            currentStreak = (await db.Users.AsNoTracking().FirstOrDefaultAsync(u => u.Id == userId))?.LoginStreak ?? 0
        });
    }

    private static List<ThongKeNgay> TaoThongKe7Ngay(int soNgay = 7)
    {
        var batDau = DateTime.UtcNow.ToLocalTime().Date.AddDays(-(soNgay - 1));
        var culture = CultureInfo.GetCultureInfo("vi-VN");
        return Enumerable.Range(0, soNgay).Select(i =>
        {
            var ngay = batDau.AddDays(i);
            return new ThongKeNgay(
                ngay,
                ngay.ToString("yyyy-MM-dd", CultureInfo.InvariantCulture),
                culture.DateTimeFormat.GetAbbreviatedDayName(ngay.DayOfWeek),
                0,
                0);
        }).ToList();
    }

    private static string LayKeyNgay(DateTime ngay) => ngay.ToLocalTime().Date.ToString("yyyy-MM-dd", CultureInfo.InvariantCulture);

    private async Task<IResult> ThongKeSinhVien(string userId)
    {
        var user = await db.Users.AsNoTracking().FirstOrDefaultAsync(u => u.Id == userId);
        if (user is null) return Results.Unauthorized();

        var ghiDanhs = await db.Enrollments.AsNoTracking()
            .Where(e => e.UserId == userId)
            .Include(e => e.Course)
            .OrderByDescending(e => e.UpdatedAt)
            .ToListAsync();

        var courseIds = ghiDanhs.Select(e => e.CourseId).ToList();
        var lessonCounts = await db.Lessons.AsNoTracking()
            .Where(l => courseIds.Contains(l.CourseId))
            .GroupBy(l => l.CourseId)
            .Select(group => new { CourseId = group.Key, Count = group.Count() })
            .ToDictionaryAsync(item => item.CourseId, item => item.Count);

        var completedLessons = await db.LessonProgresses.AsNoTracking()
            .CountAsync(p => p.UserId == userId && p.IsCompleted);
        var certificateCount = await db.Certificates.AsNoTracking()
            .CountAsync(c => c.UserId == userId);

        var totalEnrolled = ghiDanhs.Count;
        var completedCourses = ghiDanhs.Count(e => e.CompletedAt is not null || e.Progress >= 100);
        var avgProgress = totalEnrolled == 0 ? 0 : TroGiup.GioiHanPhanTram(ghiDanhs.Average(e => e.Progress));

        return Results.Ok(new
        {
            stats = new
            {
                completedCourses,
                totalEnrolled,
                certificates = certificateCount,
                avgProgress,
                completedLessons,
                walletBalance = user.WalletBalance,
                totalSpent = user.TotalSpent
            },
            recentCourses = ghiDanhs.Take(6).Select(e => new
            {
                enrollmentId = e.Id,
                courseId = e.CourseId,
                title = e.Course?.Title ?? "Khóa học",
                thumbnail = e.Course?.Thumbnail,
                progress = TroGiup.GioiHanPhanTram(e.Progress),
                totalLessons = lessonCounts.GetValueOrDefault(e.CourseId, 0),
                updatedAt = e.UpdatedAt,
                completedAt = e.CompletedAt
            })
        });
    }

    private async Task<IResult> ThongKeGiangVien(string userId)
    {
        var khoaHocs = await db.Courses.AsNoTracking()
            .Where(c => c.InstructorId == userId)
            .Include(c => c.Enrollments)
            .Include(c => c.Purchases)
            .Include(c => c.Lessons)
            .OrderByDescending(c => c.CreatedAt)
            .ToListAsync();

        var khoaHocIds = khoaHocs.Select(c => c.Id).ToList();
        var recentEnrollments = await db.Enrollments.AsNoTracking()
            .Where(e => khoaHocIds.Contains(e.CourseId))
            .Include(e => e.User)
            .Include(e => e.Course)
            .OrderByDescending(e => e.CreatedAt)
            .Take(5)
            .Select(e => new
            {
                studentName = e.User == null ? "Học viên" : e.User.Name,
                courseTitle = e.Course == null ? "Khóa học" : e.Course.Title,
                enrolledAt = e.CreatedAt
            })
            .ToListAsync();

        var totalRevenue = khoaHocs.SelectMany(c => c.Purchases).Where(p => p.Status == "COMPLETED").Sum(p => p.FinalAmount);

        return Results.Ok(new
        {
            stats = new
            {
                totalRevenue,
                totalRevenueFormatted = TroGiup.DinhDangTienVND(totalRevenue),
                totalStudents = khoaHocs.Sum(c => c.Enrollments.Count),
                publishedCourses = khoaHocs.Count(c => c.IsPublished || c.Status == "PUBLIC"),
                draftCourses = khoaHocs.Count(c => !c.IsPublished && c.Status != "PUBLIC")
            },
            courses = khoaHocs.Take(5).Select(c => new
            {
                c.Id,
                title = c.Title,
                enrollments = c.Enrollments.Count,
                lessons = c.Lessons.Count,
                isPublished = c.IsPublished || c.Status == "PUBLIC"
            }),
            recentEnrollments
        });
    }

    private async Task<IResult> ThongKeQuanTri()
    {
        var totalRevenue = await db.WalletTransactions.AsNoTracking()
            .Where(g => g.Type == "COURSE_PURCHASE")
            .SumAsync(g => -g.Amount);
        var recentUsers = await db.Users.AsNoTracking()
            .OrderByDescending(u => u.CreatedAt)
            .Take(5)
            .Select(u => new { u.Id, u.Name, u.Email, u.Role })
            .ToListAsync();

        return Results.Ok(new
        {
            stats = new
            {
                totalUsers = await db.Users.CountAsync(),
                totalCourses = await db.Courses.CountAsync(),
                totalEnrollments = await db.Enrollments.CountAsync(),
                totalRevenue,
                totalRevenueFormatted = TroGiup.DinhDangTienVND(totalRevenue),
                pendingPayments = await db.ExternalPayments.CountAsync(p => p.Status == "PENDING")
            },
            recentUsers
        });
    }
}
