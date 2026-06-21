using LMS.Api.Infrastructure.Persistence;
using LMS.Api.Domain.Entities;
using LMS.Api.Application.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace LMS.Api.Areas.HocVien.Controllers;

[ApiController]
[Authorize]
[Area("Student")]
public class DiemThuongController(ApplicationDbContext db) : ControllerBase
{
    private static readonly PhanThuongSuKien[] DanhSach =
    [
        new("workshop-starter", "Workshop thực hành dự án nhỏ", "Workshop", 30, "Online", "2 giờ"),
        new("career-seminar", "Hội thảo định hướng nghề nghiệp", "Hội thảo", 50, "Hybrid", "3 giờ"),
        new("soft-skill-class", "Lớp kỹ năng thuyết trình", "Lớp kỹ năng", 35, "Offline", "2 giờ"),
        new("learning-event", "Sự kiện học tập cộng đồng", "Sự kiện học tập", 70, "Online", "Cả buổi")
    ];

    [HttpGet("/api/rewards/events")]
    public async Task<IResult> LayDanhSach()
    {
        var userId = TroGiup.LayUserId(User);
        if (userId is null) return Results.Unauthorized();

        var nguoiDung = await db.NguoiDung.AsNoTracking().FirstOrDefaultAsync(u => u.Id == userId);
        if (nguoiDung is null) return Results.Unauthorized();

        var daDoi = await db.DoiThuongSuKien.AsNoTracking()
            .Where(item => item.NguoiDungId == userId)
            .Select(item => item.PhanThuongId)
            .ToListAsync();

        return Results.Ok(new
        {
            points = nguoiDung.DiemThuong,
            maxPoints = 100,
            loginStreak = nguoiDung.ChuoiDangNhap,
            events = DanhSach.Select(item => new
            {
                item.Id,
                item.TieuDe,
                item.LoaiSuKien,
                item.DiemYeuCau,
                item.Format,
                item.Duration,
                redeemed = daDoi.Contains(item.Id)
            })
        });
    }

    [HttpPost("/api/rewards/events/{rewardId}/redeem")]
    public async Task<IResult> DoiVe(string rewardId)
    {
        var userId = TroGiup.LayUserId(User);
        if (userId is null) return Results.Unauthorized();

        var phanThuong = DanhSach.FirstOrDefault(item => item.Id == rewardId);
        if (phanThuong is null) return Results.NotFound(new { message = "Không tìm thấy sự kiện." });

        if (await db.DoiThuongSuKien.AnyAsync(item => item.NguoiDungId == userId && item.PhanThuongId == rewardId))
            return Results.BadRequest(new { message = "Bạn đã đổi vé sự kiện này rồi." });

        var nguoiDung = await db.NguoiDung.FirstOrDefaultAsync(u => u.Id == userId);
        if (nguoiDung is null) return Results.Unauthorized();
        if (nguoiDung.DiemThuong < phanThuong.DiemYeuCau)
            return Results.BadRequest(new { message = $"Bạn cần thêm {phanThuong.DiemYeuCau - nguoiDung.DiemThuong} điểm để đổi vé." });

        nguoiDung.DiemThuong -= phanThuong.DiemYeuCau;
        nguoiDung.NgayCapNhat = DateTime.UtcNow;
        db.DoiThuongSuKien.Add(new DoiThuongSuKien
        {
            Id = TaoId.Moi(),
            PhanThuongId = phanThuong.Id,
            TieuDeSuKien = phanThuong.TieuDe,
            DiemYeuCau = phanThuong.DiemYeuCau,
            NguoiDungId = userId,
            NgayTao = DateTime.UtcNow
        });
        await db.SaveChangesAsync();

        return Results.Ok(new
        {
            message = "Đổi vé tham gia thành công.",
            points = nguoiDung.DiemThuong,
            rewardId
        });
    }

    private sealed record PhanThuongSuKien(
        string Id,
        string TieuDe,
        string LoaiSuKien,
        int DiemYeuCau,
        string Format,
        string Duration);
}
