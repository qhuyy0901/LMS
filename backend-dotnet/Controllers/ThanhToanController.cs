using LMS.Api.DTOs.YeuCau;
using LMS.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace LMS.Api.Controllers;

/// <summary>Controller thanh toán — nạp ví, mua khóa học, mã giảm giá</summary>
[ApiController]
[Authorize]
public class ThanhToanController(IDichVuThanhToan dichVu, IConfiguration cauHinh) : ControllerBase
{
    private string FrontendUrl => cauHinh["FRONTEND_URL"] ?? "http://localhost:5173";

    /// <summary>Tạo phiên thanh toán (nạp ví hoặc mua khóa)</summary>
    [HttpPost("/api/payments/create-checkout-session")]
    public async Task<IResult> TaoPhienThanhToan([FromBody] ThanhToanRequest yeuCau)
    {
        if (LaXemThuSinhVien()) return Results.BadRequest(new { message = "Chế độ xem thử không thể phát sinh giao dịch." });
        var userId = TroGiup.LayUserId(User);
        if (userId is null) return Results.Unauthorized();

        if (yeuCau.Type == "topup")
            return await dichVu.NapViAsync(userId, yeuCau.Amount ?? 0, FrontendUrl);

        if (yeuCau.Type != "course" || string.IsNullOrWhiteSpace(yeuCau.CourseId))
            return Results.BadRequest(new { message = "Loại giao dịch không hợp lệ" });

        return await dichVu.MuaKhoaHocAsync(userId, yeuCau.CourseId, FrontendUrl, yeuCau.CouponCode);
    }

    /// <summary>Kiểm tra mã giảm giá hợp lệ</summary>
    [HttpPost("/api/student/courses/{id}/purchase")]
    public async Task<IResult> MuaKhoaHocSinhVien(string id, [FromBody] MuaKhoaHocRequest? yeuCau)
    {
        if (LaXemThuSinhVien()) return Results.BadRequest(new { message = "Chế độ xem thử không thể phát sinh giao dịch." });
        var userId = TroGiup.LayUserId(User);
        if (userId is null) return Results.Unauthorized();
        return await dichVu.MuaKhoaHocAsync(userId, id, FrontendUrl, yeuCau?.CouponCode);
    }

    [HttpPost("/api/coupons/validate")]
    public IResult KiemTraMaGiam([FromBody] KiemTraMaGiamGiaRequest yeuCau)
    {
        if (TroGiup.LayUserId(User) is null) return Results.Unauthorized();
        if (string.IsNullOrWhiteSpace(yeuCau.CourseId)) return Results.BadRequest(new { valid = false, error = "Thiếu thông tin khóa học" });

        // Dùng service thay vì truy cập DB trực tiếp — xem ghi chú bên dưới
        return Results.Ok(new { valid = false, error = "Tính năng đang được cập nhật" });
    }

    private bool LaXemThuSinhVien() =>
        Request.Headers["X-Student-Preview"] == "true" && (User.IsInRole("INSTRUCTOR") || User.IsInRole("ADMIN"));
}
