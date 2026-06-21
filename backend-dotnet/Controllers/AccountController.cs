using System.Text.Json;
using System.Text.RegularExpressions;
using LMS.Api.Infrastructure.Persistence;
using LMS.Api.DTOs.YeuCau;
using LMS.Api.Domain.Entities;
using LMS.Api.Application.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace LMS.Api.Controllers;

[ApiController]
[Authorize]
public class AccountController(ApplicationDbContext db, IWebHostEnvironment env) : ControllerBase
{
    private static readonly HashSet<string> AvatarTypes = new(StringComparer.OrdinalIgnoreCase)
    {
        "image/png",
        "image/jpeg",
        "image/jpg",
        "image/webp"
    };
    private static readonly HashSet<string> AvatarExtensions = new(StringComparer.OrdinalIgnoreCase)
    {
        ".png",
        ".jpg",
        ".jpeg",
        ".webp"
    };

    [HttpGet("/api/account/settings")]
    public async Task<IResult> LayCaiDat()
    {
        var userId = TroGiup.LayUserId(User);
        if (userId is null) return Results.Unauthorized();

        var user = await db.NguoiDung.AsNoTracking().FirstOrDefaultAsync(item => item.Id == userId);
        if (user is null) return Results.Unauthorized();

        var transactions = await db.GiaoDichVi.AsNoTracking()
            .Where(item => item.NguoiDungId == userId)
            .OrderByDescending(item => item.NgayTao)
            .Take(10)
            .Select(item => new
            {
                item.Id,
                type = item.LoaiGiaoDich,
                item.SoTien,
                amountText = TroGiup.DinhDangTienVND(item.SoTien),
                item.SoDuSauGiaoDich,
                balanceAfterText = TroGiup.DinhDangTienVND(item.SoDuSauGiaoDich),
                item.NoiDung,
                item.NgayTao,
                method = item.ThanhToan == null ? "Ví Skillio" : item.ThanhToan.NhaCungCap
            })
            .ToListAsync();

        return Results.Ok(new
        {
            user = ToUserDto(user),
            settings = ParseSettings(user.CaiDat),
            wallet = new
            {
                balance = user.SoDuVi,
                balanceText = TroGiup.DinhDangTienVND(user.SoDuVi),
                totalSpent = user.TongChiTieu,
                totalSpentText = TroGiup.DinhDangTienVND(user.TongChiTieu),
                user.HangThanhVien,
                memberTierLabel = TroGiup.TinhHangThanhVien(user.SoDuVi).NhanHieu
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

        var user = await db.NguoiDung.FirstOrDefaultAsync(item => item.Id == userId);
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
        if (await db.NguoiDung.AnyAsync(item => item.Id != userId && item.Email == email)) return Results.BadRequest(new { message = "Email đã được sử dụng." });

        user.Ten = name;
        user.Email = email;
        user.SoDienThoai = phone;
        user.TieuSu = bio;
        if (request.Settings is not null) user.CaiDat = JsonSerializer.Serialize(request.Settings);
        user.NgayCapNhat = DateTime.UtcNow;
        await db.SaveChangesAsync();

        return Results.Ok(new { message = "Cập nhật cài đặt thành công.", user = ToUserDto(user), settings = ParseSettings(user.CaiDat) });
    }

    [HttpPut("/api/account/password")]
    public async Task<IResult> DoiMatKhau([FromBody] DoiMatKhauTaiKhoanRequest request)
    {
        var userId = TroGiup.LayUserId(User);
        if (userId is null) return Results.Unauthorized();

        var user = await db.NguoiDung.FirstOrDefaultAsync(item => item.Id == userId);
        if (user is null) return Results.NotFound(new { message = "Không tìm thấy người dùng." });
        if (!BCrypt.Net.BCrypt.Verify(request.CurrentPassword, user.MatKhau)) return Results.BadRequest(new { message = "Mật khẩu hiện tại không đúng." });
        if (string.IsNullOrWhiteSpace(request.NewPassword) || request.NewPassword.Length < 6) return Results.BadRequest(new { message = "Mật khẩu mới tối thiểu 6 ký tự." });
        if (request.NewPassword != request.ConfirmPassword) return Results.BadRequest(new { message = "Nhập lại mật khẩu không khớp." });

        user.MatKhau = BCrypt.Net.BCrypt.HashPassword(request.NewPassword);
        user.NgayCapNhat = DateTime.UtcNow;
        await db.SaveChangesAsync();

        return Results.Ok(new { message = "Cập nhật cài đặt thành công." });
    }

    [HttpPut("/api/account/notifications")]
    public Task<IResult> CapNhatThongBao([FromBody] CapNhatCaiDatRequest request) => LuuCaiDat(request.Settings);

    [HttpPut("/api/account/preferences")]
    public Task<IResult> CapNhatTuyChon([FromBody] CapNhatCaiDatRequest request) => LuuCaiDat(request.Settings);

    [HttpPost("/api/account/avatar")]
    [HttpPost("/api/user/avatar")]
    public async Task<IResult> CapNhatAvatar([FromForm] IFormFile? avatar)
    {
        var userId = TroGiup.LayUserId(User);
        if (userId is null) return Results.Unauthorized();
        if (avatar is null || avatar.Length == 0) return Results.BadRequest(new { message = "Vui lòng chọn ảnh đại diện." });
        if (!AvatarTypes.Contains(avatar.ContentType)) return Results.BadRequest(new { message = "Ảnh đại diện chỉ nhận PNG, JPG, JPEG, WEBP." });
        if (avatar.Length > 2 * 1024 * 1024) return Results.BadRequest(new { message = "Ảnh đại diện tối đa 2MB." });

        var user = await db.NguoiDung.FirstOrDefaultAsync(item => item.Id == userId);
        if (user is null) return Results.NotFound(new { message = "Không tìm thấy người dùng." });

        var root = env.WebRootPath;
        if (string.IsNullOrWhiteSpace(root))
        {
            root = Path.Combine(env.ContentRootPath, "wwwroot");
        }

        var folder = Path.Combine(root, "uploads", "avatars");
        Directory.CreateDirectory(folder);

        var extension = Path.GetExtension(avatar.FileName).ToLowerInvariant();
        if (!AvatarExtensions.Contains(extension))
            return Results.BadRequest(new { message = "Ảnh đại diện chỉ nhận PNG, JPG, JPEG, WEBP." });

        var oldAvatar = user.AnhDaiDien;
        var fileName = $"{userId}-{Guid.NewGuid():N}{extension}";
        var fullPath = Path.Combine(folder, fileName);
        await using (var stream = System.IO.File.Create(fullPath))
        {
            await avatar.CopyToAsync(stream);
        }

        user.AnhDaiDien = $"/uploads/avatars/{fileName}";
        user.NgayCapNhat = DateTime.UtcNow;
        await db.SaveChangesAsync();
        DeleteLocalAvatar(root, oldAvatar);

        return Results.Ok(new { message = "Cập nhật cài đặt thành công.", avatarUrl = user.AnhDaiDien, user = ToUserDto(user) });
    }

    [HttpDelete("/api/account/avatar")]
    [HttpDelete("/api/user/avatar")]
    public async Task<IResult> XoaAvatar()
    {
        var userId = TroGiup.LayUserId(User);
        if (userId is null) return Results.Unauthorized();

        var user = await db.NguoiDung.FirstOrDefaultAsync(item => item.Id == userId);
        if (user is null) return Results.NotFound(new { message = "Không tìm thấy người dùng." });

        var oldAvatar = user.AnhDaiDien;
        user.AnhDaiDien = null;
        user.NgayCapNhat = DateTime.UtcNow;
        await db.SaveChangesAsync();

        var root = string.IsNullOrWhiteSpace(env.WebRootPath)
            ? Path.Combine(env.ContentRootPath, "wwwroot")
            : env.WebRootPath;
        DeleteLocalAvatar(root, oldAvatar);

        return Results.Ok(new { message = "Đã xóa ảnh đại diện.", avatarUrl = (string?)null, user = ToUserDto(user) });
    }

    [HttpPost("/api/account/logout")]
    public IResult DangXuat()
    {
        Response.Cookies.Delete("LmsAuthToken");
        return Results.Ok(new { message = "Đã đăng xuất khỏi thiết bị hiện tại." });
    }

    [HttpPost("/api/account/disable-demo")]
    public Task<IResult> VoHieuHoaDemo() => GuiYeuCauQuanTri(
        "INSTRUCTOR_PAUSE_REQUEST",
        "Yêu cầu tạm ngưng hoạt động giảng dạy",
        "Đã gửi yêu cầu tạm ngưng hoạt động giảng dạy. Quản trị viên sẽ xem xét và phản hồi.");

    [HttpDelete("/api/account/delete-demo")]
    public Task<IResult> XoaDemo() => GuiYeuCauQuanTri(
        "INSTRUCTOR_CLOSE_REQUEST",
        "Yêu cầu đóng tài khoản giảng viên",
        "Đã gửi yêu cầu đóng tài khoản giảng viên. Tài khoản chưa bị xóa và đang chờ quản trị viên xem xét.");

    private async Task<IResult> GuiYeuCauQuanTri(string type, string title, string successMessage)
    {
        var userId = TroGiup.LayUserId(User);
        if (userId is null) return Results.Unauthorized();

        var requester = await db.NguoiDung.AsNoTracking().FirstOrDefaultAsync(item => item.Id == userId);
        if (requester is null) return Results.Unauthorized();

        var adminIds = await db.NguoiDung.AsNoTracking()
            .Where(item => item.VaiTro == "ADMIN")
            .Select(item => item.Id)
            .ToListAsync();
        if (adminIds.Count == 0)
            return Results.BadRequest(new { message = "Chưa có quản trị viên để tiếp nhận yêu cầu. Vui lòng liên hệ bộ phận hỗ trợ." });

        var now = DateTime.UtcNow;
        foreach (var adminId in adminIds)
        {
            db.ThongBao.Add(new ThongBao
            {
                Id = TaoId.Moi(),
                NguoiDungId = adminId,
                LoaiThongBao = type,
                TieuDe = title,
                NoiDung = $"Giảng viên {requester.Ten} ({requester.Email}) vừa gửi yêu cầu.",
                DuongDan = "/admin/users",
                Metadata = JsonSerializer.Serialize(new { requesterId = requester.Id, requesterRole = requester.VaiTro }),
                NgayTao = now
            });
        }

        await db.SaveChangesAsync();
        return Results.Ok(new { message = successMessage });
    }

    private async Task<IResult> LuuCaiDat(JsonElement settings)
    {
        var userId = TroGiup.LayUserId(User);
        if (userId is null) return Results.Unauthorized();

        var user = await db.NguoiDung.FirstOrDefaultAsync(item => item.Id == userId);
        if (user is null) return Results.NotFound(new { message = "Không tìm thấy người dùng." });

        user.CaiDat = JsonSerializer.Serialize(settings);
        user.NgayCapNhat = DateTime.UtcNow;
        await db.SaveChangesAsync();
        return Results.Ok(new { message = "Cập nhật cài đặt thành công.", settings = ParseSettings(user.CaiDat) });
    }

    private static JsonElement? ParseSettings(string? rawSettings)
    {
        if (string.IsNullOrWhiteSpace(rawSettings)) return null;
        try { return JsonSerializer.Deserialize<JsonElement>(rawSettings); }
        catch (JsonException) { return null; }
    }

    private static void DeleteLocalAvatar(string webRoot, string? avatarUrl)
    {
        if (string.IsNullOrWhiteSpace(avatarUrl) || !avatarUrl.StartsWith("/uploads/avatars/", StringComparison.OrdinalIgnoreCase))
            return;

        var avatarFolder = Path.Combine(webRoot, "uploads", "avatars");
        var fullPath = Path.Combine(avatarFolder, Path.GetFileName(avatarUrl));
        if (System.IO.File.Exists(fullPath)) System.IO.File.Delete(fullPath);
    }

    private static object ToUserDto(LMS.Api.Domain.Entities.NguoiDung user) => new
    {
        user.Id,
        user.Email,
        user.Ten,
        user.VaiTro,
        user.AnhDaiDien,
        user.SoDienThoai,
        user.TieuSu,
        user.SoDuVi,
        user.TongChiTieu,
        user.HangThanhVien,
        memberTierLabel = TroGiup.TinhHangThanhVien(user.SoDuVi).NhanHieu,
        user.DiemThuong,
        user.ChuoiDangNhap
    };
}
