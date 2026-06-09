using System.Globalization;
using LMS.Api.Data;
using LMS.Api.DTOs.PhanHoi;
using LMS.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace LMS.Api.Controllers;

/// <summary>Controller bảng điều khiển — thống kê cá nhân, báo cáo học tập</summary>
[ApiController]
[Authorize]
public class BangDieuKhienController(LmsDbContext db) : ControllerBase
{
    /// <summary>Thống kê tổng quan cho student</summary>
    [HttpGet("/api/dashboard")]
    public async Task<IResult> ThongKe()
    {
        var userId = TroGiup.LayUserId(User);
        if (userId is null) return Results.Unauthorized();
        if (LaXemThuSinhVien())
        {
            var khoaHocCuaGiangVien = await db.Courses.AsNoTracking()
                .Where(course => course.InstructorId == userId && course.IsPublished)
                .OrderByDescending(course => course.UpdatedAt)
                .Take(6)
                .Select(course => new
                {
                    courseId = course.Id,
                    title = course.Title,
                    thumbnail = course.Thumbnail,
                    category = course.Category,
                    instructorName = course.Instructor != null ? course.Instructor.Name : "Giảng viên",
                    progress = 0,
                    totalLessons = course.Lessons.Count,
                    courseStartDate = course.StartDate,
                    courseEndDate = course.EndDate,
                    updatedAt = course.UpdatedAt
                })
                .ToListAsync();

            return Results.Ok(new
            {
                totalCourses = khoaHocCuaGiangVien.Count,
                completedCourses = 0,
                completedLessons = 0,
                certificates = 0,
                participatedEvents = 0,
                averageProgress = 0,
                walletBalance = 0,
                totalSpent = 0,
                rewardPoints = 0,
                loginStreak = 0,
                nextLoginReward = 3,
                dailyLessonCompleted = false,
                weeklyPurchaseCompleted = false,
                recentCourses = khoaHocCuaGiangVien
            });
        }

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
            weeklyPurchaseCompleted = nguoiDung.LastPurchaseRewardWeek == tuanHienTai,
            recentCourses = khoaHocDangHoc
        });
    }

    /// <summary>Báo cáo học tập 7 ngày qua</summary>
    [HttpGet("/api/user/reports")]
    public async Task<IResult> BaoCaoHocTap()
    {
        var userId = TroGiup.LayUserId(User);
        if (userId is null) return Results.Unauthorized();

        // Thống kê 7 ngày gần nhất
        var buckets = TaoThongKe7Ngay();
        var ngayDau = buckets.First().Date;

        var tienDo = await db.LessonProgresses.AsNoTracking()
            .Where(p => p.UserId == userId && p.UpdatedAt >= ngayDau)
            .ToListAsync();

        foreach (var p in tienDo)
        {
            var key = LayKeyNgay(p.UpdatedAt);
            var bucket = buckets.FirstOrDefault(b => b.Key == key);
            if (bucket is null) continue;
            bucket.Minutes += p.WatchedSeconds / 60;
            if (p.IsCompleted) bucket.CompletedLessons += 1;
        }

        // Thành tựu
        var thanhTuu = new List<ThanhTuuDto>();
        var soGhiDanh = await db.Enrollments.CountAsync(e => e.UserId == userId);
        if (soGhiDanh >= 1) thanhTuu.Add(new("a1", "milestone", "Bước đầu", "Đăng ký khóa học đầu tiên", DateTime.UtcNow, null));
        if (soGhiDanh >= 5) thanhTuu.Add(new("a2", "milestone", "Ham học hỏi", "Đăng ký 5 khóa học", DateTime.UtcNow, null));

        var soQuiz = await db.QuizSubmissions.CountAsync(s => s.UserId == userId && s.Passed);
        if (soQuiz >= 1) thanhTuu.Add(new("a3", "quiz", "Vượt thử thách", "Hoàn thành bài kiểm tra đầu tiên", DateTime.UtcNow, null));

        var soHoanThanh = await db.Enrollments.CountAsync(e => e.UserId == userId && e.CompletedAt != null);
        if (soHoanThanh >= 1) thanhTuu.Add(new("a4", "completion", "Hoàn thành xuất sắc", "Hoàn thành khóa học đầu tiên", DateTime.UtcNow, null));

        return Results.Ok(new
        {
            dailyActivity = buckets,
            totalMinutes = buckets.Sum(b => b.Minutes),
            totalCompletedLessons = buckets.Sum(b => b.CompletedLessons),
            achievements = thanhTuu,
            currentStreak = (await db.Users.AsNoTracking().FirstOrDefaultAsync(u => u.Id == userId))?.LoginStreak ?? 0
        });
    }

    // ── Hàm nội bộ ──────────────────────────────────────────

    private static List<ThongKeNgay> TaoThongKe7Ngay(int soNgay = 7)
    {
        var batDau = DateTime.UtcNow.ToLocalTime().Date.AddDays(-(soNgay - 1));
        var culture = CultureInfo.GetCultureInfo("vi-VN");
        return Enumerable.Range(0, soNgay).Select(i =>
        {
            var ngay = batDau.AddDays(i);
            return new ThongKeNgay(ngay, ngay.ToString("yyyy-MM-dd", CultureInfo.InvariantCulture), culture.DateTimeFormat.GetAbbreviatedDayName(ngay.DayOfWeek), 0, 0);
        }).ToList();
    }

    private static string LayKeyNgay(DateTime ngay) => ngay.ToLocalTime().Date.ToString("yyyy-MM-dd", CultureInfo.InvariantCulture);

    private bool LaXemThuSinhVien() =>
        Request.Headers["X-Student-Preview"] == "true" && (User.IsInRole("INSTRUCTOR") || User.IsInRole("ADMIN"));
}
