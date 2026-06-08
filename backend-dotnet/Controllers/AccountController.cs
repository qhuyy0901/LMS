using System.Text.Json;
using System.Text.RegularExpressions;
using LMS.Api.Data;
using LMS.Api.DTOs.YeuCau;
using LMS.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace LMS.Api.Controllers;

[ApiController]
[Authorize]
public class AccountController(LmsDbContext db, IWebHostEnvironment env) : ControllerBase
{
    private static readonly HashSet<string> AvatarTypes = ["image/png", "image/jpeg", "image/webp"];

    [HttpGet("/api/account/settings")]
    public async Task<IResult> LayCaiDat()
    {
        var userId = TroGiup.LayUserId(User);
        if (userId is null) return Results.Unauthorized();

        var user = await db.Users.AsNoTracking().FirstOrDefaultAsync(item => item.Id == userId);
        if (user is null) return Results.Unauthorized();

        var transactions = await db.WalletTransactions.AsNoTracking()
            .Where(item => item.UserId == userId)
            .OrderByDescending(item => item.CreatedAt)
            .Take(10)
            .Select(item => new
            {
                item.Id,
                item.Type,
                item.Amount,
                amountText = TroGiup.DinhDangTienVND(item.Amount),
                item.BalanceAfter,
                balanceAfterText = TroGiup.DinhDangTienVND(item.BalanceAfter),
                item.Note,
                item.CreatedAt,
                method = item.ExternalPayment == null ? "Ví Skillio" : item.ExternalPayment.Provider
            })
            .ToListAsync();

        return Results.Ok(new
        {
            user = ToUserDto(user),
            settings = ParseSettings(user.Settings),
            wallet = new
            {
                balance = user.WalletBalance,
                balanceText = TroGiup.DinhDangTienVND(user.WalletBalance),
                totalSpent = user.TotalSpent,
                totalSpentText = TroGiup.DinhDangTienVND(user.TotalSpent),
                user.MemberTier,
                memberTierLabel = TroGiup.TinhHangThanhVien(user.WalletBalance).NhanHieu
            },
            transactions,
            session = new
            {
                device = Request.Headers.UserAgent.ToString(),
                ip = HttpContext.Connection.RemoteIpAddress?.ToString(),
                loggedInAt = DateTime.UtcNow
            }
        });
    }

    [HttpPut("/api/account/profile")]
    public async Task<IResult> CapNhatHoSo([FromBody] CapNhatHoSoTaiKhoanRequest request)
    {
        var userId = TroGiup.LayUserId(User);
        if (userId is null) return Results.Unauthorized();

        var user = await db.Users.FirstOrDefaultAsync(item => item.Id == userId);
        if (user is null) return Results.NotFound(new { message = "Không tìm thấy người dùng." });

        var name = (request.Name ?? string.Empty).Trim();
        var email = (request.Email ?? user.Email).Trim().ToLowerInvariant();
        var phone = (request.Phone ?? string.Empty).Trim();
        var bio = (request.Bio ?? string.Empty).Trim();

        if (string.IsNullOrWhiteSpace(name)) return Results.BadRequest(new { message = "Họ tên không được rỗng." });
        if (!Regex.IsMatch(email, @"^[^@\s]+@[^@\s]+\.[^@\s]+$")) return Results.BadRequest(new { message = "Email không hợp lệ." });
        var phoneDigitCount = phone.Count(char.IsDigit);
        if (!string.IsNullOrWhiteSpace(phone) && (!Regex.IsMatch(phone, @"^\+?[0-9\s]+$") || phoneDigitCount is < 8 or > 15))
            return Results.BadRequest(new { message = "Số điện thoại không hợp lệ." });
        if (bio.Length > 500) return Results.BadRequest(new { message = "Giới thiệu tối đa 500 ký tự." });
        if (await db.Users.AnyAsync(item => item.Id != userId && item.Email == email)) return Results.BadRequest(new { message = "Email đã được sử dụng." });

        user.Name = name;
        user.Email = email;
        user.Phone = phone;
        user.Bio = bio;
        if (request.Settings is not null) user.Settings = JsonSerializer.Serialize(request.Settings);
        user.UpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync();

        return Results.Ok(new { message = "Cập nhật cài đặt thành công.", user = ToUserDto(user), settings = ParseSettings(user.Settings) });
    }

    [HttpPut("/api/account/password")]
    public async Task<IResult> DoiMatKhau([FromBody] DoiMatKhauTaiKhoanRequest request)
    {
        var userId = TroGiup.LayUserId(User);
        if (userId is null) return Results.Unauthorized();

        var user = await db.Users.FirstOrDefaultAsync(item => item.Id == userId);
        if (user is null) return Results.NotFound(new { message = "Không tìm thấy người dùng." });
        if (!BCrypt.Net.BCrypt.Verify(request.CurrentPassword, user.Password)) return Results.BadRequest(new { message = "Mật khẩu hiện tại không đúng." });
        if (string.IsNullOrWhiteSpace(request.NewPassword) || request.NewPassword.Length < 6) return Results.BadRequest(new { message = "Mật khẩu mới tối thiểu 6 ký tự." });
        if (request.NewPassword != request.ConfirmPassword) return Results.BadRequest(new { message = "Nhập lại mật khẩu không khớp." });

        user.Password = BCrypt.Net.BCrypt.HashPassword(request.NewPassword);
        user.UpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync();

        return Results.Ok(new { message = "Cập nhật cài đặt thành công." });
    }

    [HttpPut("/api/account/notifications")]
    public Task<IResult> CapNhatThongBao([FromBody] CapNhatCaiDatRequest request) => LuuCaiDat(request.Settings);

    [HttpPut("/api/account/preferences")]
    public Task<IResult> CapNhatTuyChon([FromBody] CapNhatCaiDatRequest request) => LuuCaiDat(request.Settings);

    [HttpPost("/api/account/avatar")]
    public async Task<IResult> CapNhatAvatar([FromForm] IFormFile? avatar)
    {
        var userId = TroGiup.LayUserId(User);
        if (userId is null) return Results.Unauthorized();
        if (avatar is null || avatar.Length == 0) return Results.BadRequest(new { message = "Vui lòng chọn ảnh đại diện." });
        if (!AvatarTypes.Contains(avatar.ContentType)) return Results.BadRequest(new { message = "Ảnh đại diện chỉ nhận PNG, JPG, JPEG, WEBP." });
        if (avatar.Length > 2 * 1024 * 1024) return Results.BadRequest(new { message = "Ảnh đại diện tối đa 2MB." });

        var user = await db.Users.FirstOrDefaultAsync(item => item.Id == userId);
        if (user is null) return Results.NotFound(new { message = "Không tìm thấy người dùng." });

        var root = env.WebRootPath;
        if (string.IsNullOrWhiteSpace(root))
        {
            root = Path.Combine(env.ContentRootPath, "wwwroot");
        }

        var folder = Path.Combine(root, "uploads", "avatars");
        Directory.CreateDirectory(folder);

        var extension = Path.GetExtension(avatar.FileName).ToLowerInvariant();
        if (extension is not ".png" and not ".jpg" and not ".jpeg" and not ".webp")
            return Results.BadRequest(new { message = "Ảnh đại diện chỉ nhận PNG, JPG, JPEG, WEBP." });

        var fileName = $"{userId}-{Guid.NewGuid():N}{extension}";
        var fullPath = Path.Combine(folder, fileName);
        await using (var stream = System.IO.File.Create(fullPath))
        {
            await avatar.CopyToAsync(stream);
        }

        user.Avatar = $"/uploads/avatars/{fileName}";
        user.UpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync();

        return Results.Ok(new { message = "Cập nhật cài đặt thành công.", avatarUrl = user.Avatar, user = ToUserDto(user) });
    }

    [HttpPost("/api/account/logout")]
    public IResult DangXuat()
    {
        Response.Cookies.Delete("LmsAuthToken");
        return Results.Ok(new { message = "Đã đăng xuất khỏi thiết bị hiện tại." });
    }

    [HttpPost("/api/account/disable-demo")]
    public IResult VoHieuHoaDemo() => Results.Ok(new { message = "Tài khoản đã được vô hiệu hóa demo. Dữ liệu thật không bị thay đổi." });

    [HttpDelete("/api/account/delete-demo")]
    public IResult XoaDemo() => Results.Ok(new { message = "Đã xóa tài khoản demo. Dữ liệu thật không bị thay đổi." });

    private async Task<IResult> LuuCaiDat(JsonElement settings)
    {
        var userId = TroGiup.LayUserId(User);
        if (userId is null) return Results.Unauthorized();

        var user = await db.Users.FirstOrDefaultAsync(item => item.Id == userId);
        if (user is null) return Results.NotFound(new { message = "Không tìm thấy người dùng." });

        user.Settings = JsonSerializer.Serialize(settings);
        user.UpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync();
        return Results.Ok(new { message = "Cập nhật cài đặt thành công.", settings = ParseSettings(user.Settings) });
    }

    private static JsonElement? ParseSettings(string? rawSettings)
    {
        if (string.IsNullOrWhiteSpace(rawSettings)) return null;
        try { return JsonSerializer.Deserialize<JsonElement>(rawSettings); }
        catch (JsonException) { return null; }
    }

    private static object ToUserDto(LMS.Api.Models.NguoiDung user) => new
    {
        user.Id,
        user.Email,
        user.Name,
        user.Role,
        user.Avatar,
        user.Phone,
        user.Bio,
        user.WalletBalance,
        user.TotalSpent,
        user.MemberTier,
        memberTierLabel = TroGiup.TinhHangThanhVien(user.WalletBalance).NhanHieu,
        user.RewardPoints,
        user.LoginStreak
    };
}
