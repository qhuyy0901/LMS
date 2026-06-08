using LMS.Api.Data;
using LMS.Api.Models;
using LMS.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace LMS.Api.Controllers;

[ApiController]
[Authorize]
public class DiemThuongController(LmsDbContext db) : ControllerBase
{
    private static readonly PhanThuongSuKien[] DanhSach =
    [
        new("workshop-starter", "Workshop kỹ năng thực hành", "Workshop", 30, "Trực tuyến", "2 giờ"),
        new("career-webinar", "Hội thảo định hướng nghề nghiệp", "Hội thảo", 60, "Hybrid", "3 giờ"),
        new("skillio-summit", "Skillio Learning Summit", "Sự kiện đặc biệt", 100, "Trực tiếp", "Cả ngày")
    ];

    [HttpGet("/api/rewards/events")]
    public async Task<IResult> LayDanhSach()
    {
        var userId = TroGiup.LayUserId(User);
        if (userId is null) return Results.Unauthorized();

        var nguoiDung = await db.Users.AsNoTracking().FirstOrDefaultAsync(u => u.Id == userId);
        if (nguoiDung is null) return Results.Unauthorized();

        var daDoi = await db.EventRewardRedemptions.AsNoTracking()
            .Where(item => item.UserId == userId)
            .Select(item => item.RewardId)
            .ToListAsync();

        return Results.Ok(new
        {
            points = nguoiDung.RewardPoints,
            maxPoints = 100,
            loginStreak = nguoiDung.LoginStreak,
            events = DanhSach.Select(item => new
            {
                item.Id,
                item.Title,
                item.Type,
                item.PointCost,
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

        if (await db.EventRewardRedemptions.AnyAsync(item => item.UserId == userId && item.RewardId == rewardId))
            return Results.BadRequest(new { message = "Bạn đã đổi vé sự kiện này rồi." });

        var nguoiDung = await db.Users.FirstOrDefaultAsync(u => u.Id == userId);
        if (nguoiDung is null) return Results.Unauthorized();
        if (nguoiDung.RewardPoints < phanThuong.PointCost)
            return Results.BadRequest(new { message = $"Bạn cần thêm {phanThuong.PointCost - nguoiDung.RewardPoints} điểm để đổi vé." });

        nguoiDung.RewardPoints -= phanThuong.PointCost;
        nguoiDung.UpdatedAt = DateTime.UtcNow;
        db.EventRewardRedemptions.Add(new DoiThuongSuKien
        {
            Id = TaoId.Moi(),
            RewardId = phanThuong.Id,
            EventTitle = phanThuong.Title,
            PointCost = phanThuong.PointCost,
            UserId = userId,
            CreatedAt = DateTime.UtcNow
        });
        await db.SaveChangesAsync();

        return Results.Ok(new
        {
            message = "Đổi vé tham gia thành công.",
            points = nguoiDung.RewardPoints,
            rewardId
        });
    }

    private sealed record PhanThuongSuKien(
        string Id,
        string Title,
        string Type,
        int PointCost,
        string Format,
        string Duration);
}
