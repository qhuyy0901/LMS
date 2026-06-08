using LMS.Api.DTOs.YeuCau;
using LMS.Api.Services;
using Microsoft.AspNetCore.Mvc;

namespace LMS.Api.Controllers;

/// <summary>Controller xác thực: đăng ký, đăng nhập, đăng xuất.</summary>
[ApiController]
public class XacThucController(IDichVuXacThuc dichVu) : ControllerBase
{
    private void LuuTokenVaoCookie(string token)
    {
        Response.Cookies.Append("LmsAuthToken", token, new CookieOptions
        {
            HttpOnly = true,
            SameSite = SameSiteMode.Lax,
            Secure = false,
            Expires = DateTimeOffset.UtcNow.AddDays(7)
        });
    }

    /// <summary>Đăng ký tài khoản mới.</summary>
    [HttpPost("/api/auth/register")]
    public async Task<IResult> DangKy([FromBody] DangKyRequest yeuCau)
    {
        var (thanhCong, loi, ketQua) = await dichVu.DangKyAsync(yeuCau.Email, yeuCau.Password, yeuCau.Name);
        if (!thanhCong) return Results.Conflict(new { message = loi });
        if (ketQua is not null) LuuTokenVaoCookie(ketQua.Token);
        return Results.Created("/api/user/me", ketQua);
    }

    /// <summary>Đăng nhập bằng email và mật khẩu.</summary>
    [HttpPost("/api/auth/login")]
    public async Task<IResult> DangNhap([FromBody] DangNhapRequest yeuCau)
    {
        var (thanhCong, ketQua) = await dichVu.DangNhapAsync(yeuCau.Email, yeuCau.Password);
        if (thanhCong && ketQua is not null) LuuTokenVaoCookie(ketQua.Token);
        return thanhCong ? Results.Ok(ketQua) : Results.Unauthorized();
    }

    /// <summary>Đăng xuất và xóa cookie xác thực dùng cho MVC.</summary>
    [HttpPost("/api/auth/logout")]
    public IResult DangXuat()
    {
        Response.Cookies.Delete("LmsAuthToken");
        return Results.Ok(new { message = "Đã đăng xuất" });
    }
}
