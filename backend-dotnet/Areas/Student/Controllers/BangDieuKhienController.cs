using System.Globalization;
using System.Security.Claims;
using LMS.Api.Infrastructure.Persistence;
using LMS.Api.DTOs.PhanHoi;
using LMS.Api.Application.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace LMS.Api.Areas.HocVien.Controllers;

/// <summary>Controller bảng điều khiển: thống kê cá nhân và báo cáo học tập.</summary>
[ApiController]
[Authorize]
[Area("Student")]
public class BangDieuKhienController(ApplicationDbContext db) : ControllerBase
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

        var khoaHocSoHuuIds = db.GhiDanh
            .Where(e => e.NguoiDungId == userId)
            .Select(e => e.KhoaHocId)
            .Union(db.DonMua
                .Where(p => p.NguoiDungId == userId && p.TrangThai == "COMPLETED")
                .Select(p => p.KhoaHocId));
        var soKhoaHoc = await khoaHocSoHuuIds.CountAsync();
        var daBaiXong = await db.TienDoBaiHoc.CountAsync(p => p.NguoiDungId == userId && p.DaHoanThanh);
        var tienDoTrungBinh = await db.GhiDanh
            .Where(e => e.NguoiDungId == userId)
            .Select(e => (double?)e.TienDo)
            .AverageAsync() ?? 0;
        var soKhoaHocHoanThanh = await db.GhiDanh.CountAsync(e => e.NguoiDungId == userId && e.NgayHoanThanh != null);
        var soChungChi = await db.ChungChi.CountAsync(c => c.NguoiDungId == userId);
        var soSuKienDaThamGia = await db.DoiThuongSuKien.CountAsync(e => e.NguoiDungId == userId);
        var nguoiDung = await db.NguoiDung.FirstOrDefaultAsync(u => u.Id == userId);
        var khoaHocDangHoc = await db.KhoaHoc
            .AsNoTracking()
            .Where(kh =>
                kh.CacGhiDanh.Any(e => e.NguoiDungId == userId && e.NgayHoanThanh == null && e.TienDo < 100) ||
                (kh.CacDonMua.Any(p => p.NguoiDungId == userId && p.TrangThai == "COMPLETED") &&
                 !kh.CacGhiDanh.Any(e => e.NguoiDungId == userId && (e.NgayHoanThanh != null || e.TienDo >= 100))))
            .Select(kh => new
            {
                courseId = kh.Id,
                title = kh.TieuDe,
                thumbnail = kh.AnhDaiDien,
                category = kh.ChuyenMuc,
                instructorName = kh.GiangVien != null ? kh.GiangVien.Ten : "Giảng viên",
                progress = kh.CacGhiDanh
                    .Where(e => e.NguoiDungId == userId)
                    .Select(e => (double?)e.TienDo)
                    .FirstOrDefault() ?? 0,
                totalLessons = kh.CacBaiHoc.Count,
                enrolledAt = kh.CacGhiDanh
                    .Where(e => e.NguoiDungId == userId)
                    .Select(e => (DateTime?)e.NgayTao)
                    .FirstOrDefault(),
                purchasedAt = kh.CacDonMua
                    .Where(p => p.NguoiDungId == userId && p.TrangThai == "COMPLETED")
                    .OrderBy(p => p.NgayTao)
                    .Select(p => (DateTime?)p.NgayTao)
                    .FirstOrDefault(),
                courseStartDate = kh.StartDate,
                courseEndDate = kh.EndDate,
                updatedAt = kh.CacGhiDanh
                    .Where(e => e.NguoiDungId == userId)
                    .Select(e => (DateTime?)e.NgayCapNhat)
                    .FirstOrDefault()
            })
            .OrderByDescending(kh => kh.progress)
            .ThenByDescending(kh => kh.updatedAt ?? kh.purchasedAt)
            .Take(2)
            .ToListAsync();

        if (nguoiDung is null) return Results.Unauthorized();

        if (TroGiup.DongBoHangThanhVien(nguoiDung))
            await db.SaveChangesAsync();

        var hangThanhVien = TroGiup.TinhHangThanhVien(nguoiDung.SoDuVi);
        var homNay = TroGiup.LayNgayDiaPhuong();
        var tuanHienTai = TroGiup.LayMaTuan(homNay);
        var dauNgayUtc = DateTime.UtcNow.Date;
        var dailyQuizPassed = await db.BaiNopKiemTra.AsNoTracking()
            .AnyAsync(submission => submission.NguoiDungId == userId && submission.Dat && submission.NgayTao >= dauNgayUtc);

        return Results.Ok(new
        {
            totalCourses = soKhoaHoc,
            completedCourses = soKhoaHocHoanThanh,
            completedLessons = daBaiXong,
            certificates = soChungChi,
            participatedEvents = soSuKienDaThamGia,
            averageProgress = TroGiup.GioiHanPhanTram(tienDoTrungBinh),
            walletBalance = nguoiDung.SoDuVi,
            totalSpent = nguoiDung.TongChiTieu,
            memberTier = hangThanhVien.Hang,
            memberTierLabel = hangThanhVien.NhanHieu,
            rewardPoints = nguoiDung.DiemThuong,
            loginStreak = nguoiDung.ChuoiDangNhap,
            lastRewardLoginDate = nguoiDung.NgayNhanThuongDangNhapCuoi,
            nextLoginReward = Math.Min(10, 3 + nguoiDung.ChuoiDangNhap),
            dailyLessonCompleted = nguoiDung.NgayNhanThuongBaiHocCuoi?.Date == homNay,
            dailyQuizPassed,
            weeklyPurchaseCompleted = nguoiDung.TuanNhanThuongMuaCuoi == tuanHienTai,
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

        var tienDoTrongTuan = await db.TienDoBaiHoc.AsNoTracking()
            .Where(p => p.NguoiDungId == userId && p.NgayCapNhat >= ngayDau)
            .ToListAsync();

        foreach (var tienDoBai in tienDoTrongTuan)
        {
            var key = LayKeyNgay(tienDoBai.NgayCapNhat);
            var bucket = buckets.FirstOrDefault(b => b.Key == key);
            if (bucket is null) continue;

            bucket.Minutes += tienDoBai.GiayDaXem / 60;
            if (tienDoBai.DaHoanThanh) bucket.CompletedLessons += 1;
        }

        var ghiDanhs = await db.GhiDanh.AsNoTracking()
            .Where(e => e.NguoiDungId == userId)
            .Include(e => e.KhoaHoc)
                .ThenInclude(c => c!.GiangVien)
            .Include(e => e.KhoaHoc)
                .ThenInclude(c => c!.CacBaiHoc)
            .OrderByDescending(e => e.NgayCapNhat)
            .ToListAsync();

        var baiHoanThanhIds = await db.TienDoBaiHoc.AsNoTracking()
            .Where(p => p.NguoiDungId == userId && p.DaHoanThanh)
            .Select(p => p.BaiHocId)
            .ToListAsync();
        var baiHoanThanhSet = baiHoanThanhIds.ToHashSet();

        var chungChi = await db.ChungChi.AsNoTracking()
            .Where(c => c.NguoiDungId == userId)
            .Include(c => c.KhoaHoc)
            .OrderByDescending(c => c.NgayCap)
            .ToListAsync();

        var baiNopGanDay = await db.BaiNopKiemTra.AsNoTracking()
            .Where(s => s.NguoiDungId == userId)
            .Include(s => s.BaiKiemTra)
                .ThenInclude(q => q!.BaiHoc)
                    .ThenInclude(l => l!.KhoaHoc)
            .OrderByDescending(s => s.NgayTao)
            .Take(6)
            .ToListAsync();

        var diemQuizTrungBinh = baiNopGanDay.Count == 0
            ? 0
            : Math.Round(baiNopGanDay.Average(s => s.Diem), 1);

        var thanhTuu = new List<ThanhTuuDto>();
        if (ghiDanhs.Count >= 1)
        {
            thanhTuu.Add(new("a1", "course", "Bước đầu học tập", "Đăng ký khóa học đầu tiên", ghiDanhs.Last().NgayTao, null));
        }

        if (ghiDanhs.Count >= 5)
        {
            thanhTuu.Add(new("a2", "course", "Ham học hỏi", "Đăng ký 5 khóa học", ghiDanhs.OrderBy(e => e.NgayTao).Skip(4).First().NgayTao, null));
        }

        var baiNopDat = baiNopGanDay.FirstOrDefault(s => s.Dat);
        if (baiNopDat is not null)
        {
            thanhTuu.Add(new("a3", "quiz", "Vượt thử thách", "Hoàn thành bài kiểm tra đạt yêu cầu", baiNopDat.NgayTao, (int)Math.Round(baiNopDat.Diem)));
        }

        foreach (var cert in chungChi.Take(3))
        {
            thanhTuu.Add(new(
                cert.Id,
                "certificate",
                "Nhận chứng chỉ",
                cert.KhoaHoc == null ? "Hoàn thành một khóa học" : $"Hoàn thành {cert.KhoaHoc.TieuDe}",
                cert.NgayCap,
                null));
        }

        var khoaHoanThanh = ghiDanhs.FirstOrDefault(e => e.NgayHoanThanh is not null || e.TienDo >= 100);
        if (khoaHoanThanh is not null)
        {
            thanhTuu.Add(new(
                "a4",
                "course",
                "Hoàn thành xuất sắc",
                khoaHoanThanh.KhoaHoc == null ? "Hoàn thành khóa học đầu tiên" : $"Hoàn thành {khoaHoanThanh.KhoaHoc.TieuDe}",
                khoaHoanThanh.NgayHoanThanh ?? khoaHoanThanh.NgayCapNhat,
                null));
        }

        var totalMinutes = buckets.Sum(b => b.Minutes);
        var totalCompletedLessons = baiHoanThanhSet.Count;
        var quizDaLamTuanNay = baiNopGanDay.Count(s => s.NgayTao >= ngayDau);
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
                var lessons = e.KhoaHoc?.CacBaiHoc.ToList() ?? [];
                var totalLessons = lessons.Count;
                var completedLessons = lessons.Count(l => baiHoanThanhSet.Contains(l.Id));
                var progress = totalLessons == 0
                    ? TroGiup.GioiHanPhanTram(e.TienDo)
                    : TroGiup.GioiHanPhanTram(Math.Max(e.TienDo, completedLessons * 100d / totalLessons));

                return new
                {
                    id = e.KhoaHocId,
                    title = e.KhoaHoc?.TieuDe ?? "Khóa học",
                    instructorName = e.KhoaHoc?.GiangVien?.Ten ?? "Giảng viên",
                    completedLessons,
                    totalLessons,
                    progress
                };
            }),
            recentQuizSubmissions = baiNopGanDay.Select(s => new
            {
                s.Id,
                title = s.BaiKiemTra?.TieuDe ?? "Bài kiểm tra",
                courseTitle = s.BaiKiemTra?.BaiHoc?.KhoaHoc?.TieuDe ?? "Khóa học",
                score = Math.Round(s.Diem, 1),
                s.Dat,
                s.NgayTao
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
            currentStreak = (await db.NguoiDung.AsNoTracking().FirstOrDefaultAsync(u => u.Id == userId))?.ChuoiDangNhap ?? 0
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
        var user = await db.NguoiDung.AsNoTracking().FirstOrDefaultAsync(u => u.Id == userId);
        if (user is null) return Results.Unauthorized();

        var ghiDanhs = await db.GhiDanh.AsNoTracking()
            .Where(e => e.NguoiDungId == userId)
            .Include(e => e.KhoaHoc)
            .OrderByDescending(e => e.NgayCapNhat)
            .ToListAsync();

        var courseIds = ghiDanhs.Select(e => e.KhoaHocId).ToList();
        var lessonCounts = await db.BaiHoc.AsNoTracking()
            .Where(l => courseIds.Contains(l.KhoaHocId))
            .GroupBy(l => l.KhoaHocId)
            .Select(group => new { KhoaHocId = group.Key, Count = group.Count() })
            .ToDictionaryAsync(item => item.KhoaHocId, item => item.Count);

        var completedLessons = await db.TienDoBaiHoc.AsNoTracking()
            .CountAsync(p => p.NguoiDungId == userId && p.DaHoanThanh);
        var certificateCount = await db.ChungChi.AsNoTracking()
            .CountAsync(c => c.NguoiDungId == userId);

        var totalEnrolled = ghiDanhs.Count;
        var completedCourses = ghiDanhs.Count(e => e.NgayHoanThanh is not null || e.TienDo >= 100);
        var avgProgress = totalEnrolled == 0 ? 0 : TroGiup.GioiHanPhanTram(ghiDanhs.Average(e => e.TienDo));

        return Results.Ok(new
        {
            stats = new
            {
                completedCourses,
                totalEnrolled,
                certificates = certificateCount,
                avgProgress,
                completedLessons,
                walletBalance = user.SoDuVi,
                totalSpent = user.TongChiTieu
            },
            recentCourses = ghiDanhs
                .Where(e => e.NgayHoanThanh == null && e.TienDo < 100)
                .OrderByDescending(e => e.TienDo)
                .ThenByDescending(e => e.NgayCapNhat)
                .Take(2)
                .Select(e => new
                {
                    enrollmentId = e.Id,
                    courseId = e.KhoaHocId,
                    title = e.KhoaHoc?.TieuDe ?? "Khóa học",
                    thumbnail = e.KhoaHoc?.AnhDaiDien,
                    progress = TroGiup.GioiHanPhanTram(e.TienDo),
                    totalLessons = lessonCounts.GetValueOrDefault(e.KhoaHocId, 0),
                    updatedAt = e.NgayCapNhat,
                    completedAt = e.NgayHoanThanh
                })
        });
    }

    private async Task<IResult> ThongKeGiangVien(string userId)
    {
        var khoaHocs = await db.KhoaHoc.AsNoTracking()
            .Where(c => c.GiangVienId == userId)
            .Include(c => c.CacGhiDanh)
            .Include(c => c.CacDonMua)
            .Include(c => c.CacBaiHoc)
            .OrderByDescending(c => c.NgayTao)
            .ToListAsync();

        var khoaHocIds = khoaHocs.Select(c => c.Id).ToList();
        var recentEnrollments = await db.GhiDanh.AsNoTracking()
            .Where(e => khoaHocIds.Contains(e.KhoaHocId))
            .Include(e => e.NguoiDung)
            .Include(e => e.KhoaHoc)
            .OrderByDescending(e => e.NgayTao)
            .Take(5)
            .Select(e => new
            {
                studentName = e.NguoiDung == null ? "Học viên" : e.NguoiDung.Ten,
                courseTitle = e.KhoaHoc == null ? "Khóa học" : e.KhoaHoc.TieuDe,
                enrolledAt = e.NgayTao
            })
            .ToListAsync();

        var totalRevenue = khoaHocs.SelectMany(c => c.CacDonMua).Where(p => p.TrangThai == "COMPLETED").Sum(p => p.SoTienCuoi);

        return Results.Ok(new
        {
            stats = new
            {
                totalRevenue,
                totalRevenueFormatted = TroGiup.DinhDangTienVND(totalRevenue),
                totalStudents = khoaHocs.Sum(c => c.CacGhiDanh.Count),
                publishedCourses = khoaHocs.Count(c => c.DaXuatBan || c.TrangThai == "PUBLIC"),
                draftCourses = khoaHocs.Count(c => !c.DaXuatBan && c.TrangThai != "PUBLIC")
            },
            courses = khoaHocs.Take(5).Select(c => new
            {
                c.Id,
                title = c.TieuDe,
                enrollments = c.CacGhiDanh.Count,
                lessons = c.CacBaiHoc.Count,
                isPublished = c.DaXuatBan || c.TrangThai == "PUBLIC"
            }),
            recentEnrollments
        });
    }

    private async Task<IResult> ThongKeQuanTri()
    {
        var totalRevenue = await db.GiaoDichVi.AsNoTracking()
            .Where(g => g.LoaiGiaoDich == "COURSE_PURCHASE")
            .SumAsync(g => -g.SoTien);
        var recentUsers = await db.NguoiDung.AsNoTracking()
            .OrderByDescending(u => u.NgayTao)
            .Take(5)
            .Select(u => new { u.Id, u.Ten, u.Email, u.VaiTro })
            .ToListAsync();

        return Results.Ok(new
        {
            stats = new
            {
                totalUsers = await db.NguoiDung.CountAsync(),
                totalCourses = await db.KhoaHoc.CountAsync(),
                totalEnrollments = await db.GhiDanh.CountAsync(),
                totalRevenue,
                totalRevenueFormatted = TroGiup.DinhDangTienVND(totalRevenue),
                pendingPayments = await db.ThanhToan.CountAsync(p => p.TrangThai == "PENDING")
            },
            recentUsers
        });
    }
}
