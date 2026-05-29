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

        var soKhoaHoc = await db.Enrollments.CountAsync(e => e.UserId == userId);
        var daBaiXong = await db.LessonProgresses.CountAsync(p => p.UserId == userId && p.IsCompleted);
        var tienDoTrungBinh = soKhoaHoc == 0 ? 0 : await db.Enrollments.Where(e => e.UserId == userId).AverageAsync(e => e.Progress);

        return Results.Ok(new
        {
            totalCourses = soKhoaHoc,
            completedLessons = daBaiXong,
            averageProgress = TroGiup.GioiHanPhanTram(tienDoTrungBinh)
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
            currentStreak = 0 // TODO: tính streak
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
}
