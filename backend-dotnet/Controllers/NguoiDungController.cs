using LMS.Api.DTOs.YeuCau;
using LMS.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace LMS.Api.Controllers;

/// <summary>Controller người dùng: hồ sơ, avatar, ví, thông báo, chứng chỉ.</summary>
[ApiController]
[Authorize]
public class NguoiDungController(IDichVuNguoiDung dichVu) : ControllerBase
{
    /// <summary>Lấy thông tin hồ sơ cá nhân</summary>
    /// <summary>Lấy thông tin hồ sơ cá nhân.</summary>
    [HttpGet("/api/user/me")]
    public async Task<IResult> LayHoSo()
    {
        var userId = TroGiup.LayUserId(User);
        if (userId is null) return Results.Unauthorized();

        var hoSo = await dichVu.LayHoSoAsync(userId);
        return hoSo is null ? Results.Unauthorized() : Results.Ok(hoSo);
    }

    /// <summary>Cập nhật thông tin hồ sơ.</summary>
    [HttpPut("/api/user/me")]
    public async Task<IResult> CapNhatHoSo([FromBody] CapNhatNguoiDungRequest yeuCau)
    {
        var userId = TroGiup.LayUserId(User);
        if (userId is null) return Results.Unauthorized();

        var ketQua = await dichVu.CapNhatHoSoAsync(userId, yeuCau.Name, yeuCau.Phone, yeuCau.Bio, yeuCau.Settings);
        return ketQua is null ? Results.NotFound(new { message = "Không tìm thấy người dùng" }) : Results.Ok(ketQua);
    }

    /// <summary>Đổi mật khẩu tài khoản hiện tại.</summary>
    [HttpPut("/api/user/password")]
    public async Task<IResult> DoiMatKhau([FromBody] DoiMatKhauRequest yeuCau)
    {
        var userId = TroGiup.LayUserId(User);
        if (userId is null) return Results.Unauthorized();

        var ketQua = await dichVu.DoiMatKhauAsync(userId, yeuCau.CurrentPassword, yeuCau.NewPassword);
        return ketQua.ThanhCong
            ? Results.Ok(new { message = ketQua.ThongBao })
            : Results.BadRequest(new { message = ketQua.ThongBao });
    }

    /// <summary>Xóa tài khoản vĩnh viễn.</summary>
    [HttpDelete("/api/user/me")]
    public async Task<IResult> XoaTaiKhoan()
    {
        var userId = TroGiup.LayUserId(User);
        if (userId is null) return Results.Unauthorized();

        return await dichVu.XoaTaiKhoanAsync(userId)
            ? Results.Ok(new { message = "Tài khoản đã được xóa vĩnh viễn." })
            : Results.NotFound(new { message = "Không tìm thấy người dùng" });
    }

    /// <summary>Tải ảnh đại diện.</summary>
    [HttpPost("/api/user/avatar")]
    public async Task<IResult> DatAvatar()
    {
        var userId = TroGiup.LayUserId(User);
        if (userId is null) return Results.Unauthorized();

        var url = await dichVu.DatAvatarAsync(userId);
        return url is null
            ? Results.NotFound(new { message = "Không tìm thấy người dùng" })
            : Results.Ok(new { message = "Tải ảnh thành công", avatarUrl = url });
    }

    /// <summary>Xóa ảnh đại diện.</summary>
    [HttpDelete("/api/user/avatar")]
    public async Task<IResult> XoaAvatar()
    {
        var userId = TroGiup.LayUserId(User);
        if (userId is null) return Results.Unauthorized();

        return await dichVu.XoaAvatarAsync(userId)
            ? Results.Ok(new { message = "Đã xóa ảnh đại diện", avatarUrl = (string?)null })
            : Results.NotFound(new { message = "Không tìm thấy người dùng" });
    }

    /// <summary>Lịch sử giao dịch ví.</summary>
    [HttpGet("/api/user/billing-history")]
    public async Task<IResult> LichSuGiaoDich()
    {
        var userId = TroGiup.LayUserId(User);
        if (userId is null) return Results.Unauthorized();

        return Results.Ok(await dichVu.LayLichSuGiaoDichAsync(userId));
    }

    /// <summary>Danh sách chứng chỉ.</summary>
    [HttpGet("/api/user/certificates")]
    public async Task<IResult> DanhSachChungChi()
    {
        var userId = TroGiup.LayUserId(User);
        if (userId is null) return Results.Unauthorized();

        return Results.Ok(await dichVu.LayChungChiAsync(userId));
    }

    /// <summary>Xuất dữ liệu cá nhân của người dùng.</summary>
    [HttpGet("/api/user/export")]
    public async Task<IResult> XuatDuLieu()
    {
        var userId = TroGiup.LayUserId(User);
        if (userId is null) return Results.Unauthorized();

        var duLieu = await dichVu.XuatDuLieuCaNhanAsync(userId);
        return duLieu is null ? Results.NotFound(new { message = "Không tìm thấy người dùng" }) : Results.Ok(duLieu);
    }

    /// <summary>Danh sách thông báo.</summary>
    [HttpGet("/api/user/notifications")]
    public async Task<IResult> DanhSachThongBao()
    {
        var userId = TroGiup.LayUserId(User);
        if (userId is null) return Results.Unauthorized();

        return Results.Ok(await dichVu.LayThongBaoAsync(userId));
    }

    /// <summary>Đánh dấu thông báo đã đọc.</summary>
    [HttpPatch("/api/user/notifications/{id}/read")]
    public async Task<IResult> DanhDauDaDoc(string id)
    {
        var userId = TroGiup.LayUserId(User);
        if (userId is null) return Results.Unauthorized();

        return await dichVu.DanhDauDaDocAsync(userId, id)
            ? Results.Ok(new { message = "Đã đánh dấu đã đọc" })
            : Results.NotFound(new { message = "Không tìm thấy thông báo" });
    }
}
