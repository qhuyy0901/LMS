using LMS.Api.Infrastructure.Persistence;
using LMS.Api.DTOs.YeuCau;
using LMS.Api.Application.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace LMS.Api.Controllers;

/// <summary>Controller thanh toán: nạp ví, mua khóa học, mã giảm giá.</summary>
[ApiController]
[Authorize]
public class ThanhToanController(IDichVuThanhToan dichVu, IConfiguration cauHinh, ApplicationDbContext db) : ControllerBase
{
    private string FrontendUrl => cauHinh["FRONTEND_URL"] ?? "http://localhost:5173";

    [HttpPost("/api/payments/create-checkout-session")]
    public async Task<IResult> TaoPhienThanhToan([FromBody] ThanhToanRequest yeuCau)
    {
        if (LaXemThuSinhVien())
        {
            return Results.BadRequest(new { message = "Chế độ xem thử không thể phát sinh giao dịch." });
        }

        var userId = TroGiup.LayUserId(User);
        if (userId is null) return Results.Unauthorized();

        if (yeuCau.Type == "topup")
        {
            if (User.IsInRole("INSTRUCTOR") || User.IsInRole("ADMIN"))
            {
                return Results.Json(new { message = "Ví nạp tiền chỉ dành cho học viên." }, statusCode: 403);
            }

            return await dichVu.NapViAsync(userId, yeuCau.Amount ?? 0, FrontendUrl);
        }

        if (yeuCau.Type != "course" || string.IsNullOrWhiteSpace(yeuCau.CourseId))
        {
            return Results.BadRequest(new { message = "Loại giao dịch không hợp lệ" });
        }

        return await dichVu.MuaKhoaHocAsync(userId, yeuCau.CourseId, FrontendUrl, yeuCau.CouponCode);
    }

    [HttpPost("/api/student/courses/{id}/purchase")]
    public async Task<IResult> MuaKhoaHocSinhVien(string id, [FromBody] MuaKhoaHocRequest? yeuCau)
    {
        if (LaXemThuSinhVien())
        {
            return Results.BadRequest(new { message = "Chế độ xem thử không thể phát sinh giao dịch." });
        }

        var userId = TroGiup.LayUserId(User);
        if (userId is null) return Results.Unauthorized();

        return await dichVu.MuaKhoaHocAsync(userId, id, FrontendUrl, yeuCau?.CouponCode);
    }

    [HttpPost("/api/coupons/validate")]
    public async Task<IResult> KiemTraMaGiam([FromBody] KiemTraMaGiamGiaRequest yeuCau)
    {
        var userId = TroGiup.LayUserId(User);
        if (userId is null) return Results.Unauthorized();
        if (string.IsNullOrWhiteSpace(yeuCau.CourseId))
        {
            return Results.BadRequest(new { valid = false, error = "Thiếu thông tin khóa học" });
        }

        var ketQua = await dichVu.KiemTraMaGiamGiaAsync(yeuCau.Code, yeuCau.CourseId, 0, userId);
        if (!ketQua.HopLe)
        {
            return Results.BadRequest(new { valid = false, error = ketQua.Loi });
        }

        var coursePrice = await db.KhoaHoc
            .Where(course => course.Id == yeuCau.CourseId)
            .Select(course => course.Gia)
            .FirstOrDefaultAsync();
        var finalPrice = Math.Max(0, coursePrice - ketQua.SoTienGiam);

        return Results.Ok(new
        {
            valid = true,
            couponCode = ketQua.MaGiam!.Ma,
            discountType = ketQua.MaGiam.DiscountType,
            discountValue = ketQua.MaGiam.DiscountValue,
            discountAmount = ketQua.SoTienGiam,
            finalPrice
        });
    }

    private bool LaXemThuSinhVien() =>
        Request.Headers["X-Student-Preview"] == "true" && (User.IsInRole("INSTRUCTOR") || User.IsInRole("ADMIN"));
}
