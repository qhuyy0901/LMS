using LMS.Api.DTOs.YeuCau;
using LMS.Api.Services;
using Microsoft.AspNetCore.Mvc;

namespace LMS.Api.Controllers;

/// <summary>Controller xác thực — đăng ký, đăng nhập</summary>
[ApiController]
public class XacThucController(IDichVuXacThuc dichVu) : ControllerBase
{
    /// <summary>Đăng ký tài khoản mới</summary>
    [HttpPost("/api/auth/register")]
    public async Task<IResult> DangKy([FromBody] DangKyRequest yeuCau)
    {
        var (thanhCong, loi, ketQua) = await dichVu.DangKyAsync(yeuCau.Email, yeuCau.Password, yeuCau.Name);
        if (!thanhCong) return Results.Conflict(new { message = loi });
        return Results.Created("/api/user/me", ketQua);
    }

    /// <summary>Đăng nhập bằng email + mật khẩu</summary>
    [HttpPost("/api/auth/login")]
    public async Task<IResult> DangNhap([FromBody] DangNhapRequest yeuCau)
    {
        var (thanhCong, ketQua) = await dichVu.DangNhapAsync(yeuCau.Email, yeuCau.Password);
        return thanhCong ? Results.Ok(ketQua) : Results.Unauthorized();
    }
}
