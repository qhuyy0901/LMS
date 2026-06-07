using System.Globalization;
using LMS.Api.Data;
using LMS.Api.DTOs.PhanHoi;
using LMS.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace LMS.Api.Controllers;

/// <summary>Controller quản trị — quản lý users, courses, coupons, giao dịch, nhật ký</summary>
[ApiController]
[Authorize]
public class QuanTriController(LmsDbContext db) : ControllerBase
{
    /// <summary>Danh sách người dùng (admin)</summary>
    [HttpGet("/api/admin/users")]
    public async Task<IResult> DanhSachNguoiDung(int page = 1, int pageSize = 20)
    {
        var loi = TroGiup.YeuCauAdmin(User); if (loi is not null) return loi;
        page = Math.Max(1, page); pageSize = Math.Clamp(pageSize, 1, 100);
        var tong = await db.Users.CountAsync();
        var ds = await db.Users.AsNoTracking().OrderByDescending(u => u.CreatedAt).Skip((page - 1) * pageSize).Take(pageSize).ToListAsync();
        var items = new List<object>();
        foreach (var u in ds)
        {
            var soKhoaHoc = await db.Courses.CountAsync(c => c.InstructorId == u.Id);
            var soGhiDanh = await db.Enrollments.CountAsync(e => e.UserId == u.Id);
            var soMuaHang = await db.Purchases.CountAsync(p => p.UserId == u.Id);
            items.Add(NguoiDungAdminDto.TuUser(u, soKhoaHoc, soGhiDanh, soMuaHang));
        }
        return Results.Ok(TroGiup.PhanTrang(items, tong, page, pageSize));
    }

    /// <summary>Đổi vai trò người dùng (admin)</summary>
    [HttpPatch("/api/admin/users/{id}/role")]
    public async Task<IResult> DoiVaiTro(string id, [FromBody] DTOs.YeuCau.DoiVaiTroRequest yeuCau)
    {
        var loi = TroGiup.YeuCauAdmin(User); if (loi is not null) return loi;
        var vaiTro = new[] { "STUDENT", "INSTRUCTOR", "ADMIN" };
        if (!vaiTro.Contains(yeuCau.Role)) return Results.BadRequest(new { message = "Vai trò không hợp lệ" });
        var user = await db.Users.FirstOrDefaultAsync(u => u.Id == id);
        if (user is null) return Results.NotFound(new { message = "Không tìm thấy người dùng" });
        user.Role = yeuCau.Role; user.UpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync();
        return Results.Ok(new { message = "Đã cập nhật vai trò", user = NguoiDungDto.TuUser(user) });
    }

    /// <summary>Danh sách khóa học (admin)</summary>
    [HttpGet("/api/admin/courses")]
    public async Task<IResult> DanhSachKhoaHoc(int page = 1, int pageSize = 20)
    {
        var loi = TroGiup.YeuCauAdmin(User); if (loi is not null) return loi;
        page = Math.Max(1, page); pageSize = Math.Clamp(pageSize, 1, 100);
        var tong = await db.Courses.CountAsync();
        var ds = await db.Courses.AsNoTracking()
            .Include(c => c.Instructor).Include(c => c.Lessons).Include(c => c.Enrollments).Include(c => c.Reviews)
            .OrderByDescending(c => c.CreatedAt).Skip((page - 1) * pageSize).Take(pageSize).ToListAsync();
        return Results.Ok(TroGiup.PhanTrang(ds.Select(KhoaHocAdminDto.TuKhoaHoc), tong, page, pageSize));
    }

    /// <summary>Danh sách mã giảm giá (admin)</summary>
    [HttpGet("/api/admin/coupons")]
    public async Task<IResult> DanhSachMaGiam(int page = 1, int pageSize = 20)
    {
        var loi = TroGiup.YeuCauAdmin(User); if (loi is not null) return loi;
        page = Math.Max(1, page); pageSize = Math.Clamp(pageSize, 1, 100);
        var tong = await db.Coupons.CountAsync();
        var ds = await db.Coupons.AsNoTracking().Include(c => c.Course).OrderByDescending(c => c.CreatedAt).Skip((page - 1) * pageSize).Take(pageSize).ToListAsync();
        return Results.Ok(TroGiup.PhanTrang(ds.Select(MaGiamGiaDto.TuCoupon), tong, page, pageSize));
    }

    /// <summary>Tạo mã giảm giá (admin)</summary>
    [HttpPost("/api/admin/coupons")]
    public async Task<IResult> TaoMaGiam([FromBody] DTOs.YeuCau.TaoMaGiamGiaRequest yeuCau)
    {
        var loi = TroGiup.YeuCauAdmin(User); if (loi is not null) return loi;
        if (string.IsNullOrWhiteSpace(yeuCau.Code)) return Results.BadRequest(new { message = "Mã giảm giá không được để trống" });
        var maChuan = yeuCau.Code.Trim().ToUpperInvariant();
        if (await db.Coupons.AnyAsync(c => c.Code == maChuan)) return Results.Conflict(new { message = "Mã giảm giá đã tồn tại" });

        var now = DateTime.UtcNow;
        var coupon = new Models.MaGiamGia
        {
            Id = TaoId.Moi(), Code = maChuan, DiscountType = yeuCau.DiscountType ?? "PERCENTAGE", DiscountValue = yeuCau.DiscountValue,
            MinPurchaseAmount = yeuCau.MinPurchaseAmount ?? 0, MaxDiscountAmount = yeuCau.MaxDiscountAmount,
            StartDate = yeuCau.StartDate, EndDate = yeuCau.EndDate, UsageLimit = yeuCau.UsageLimit,
            CourseId = yeuCau.CourseId, IsActive = true, CreatedAt = now, UpdatedAt = now
        };
        db.Coupons.Add(coupon);
        await db.SaveChangesAsync();
        return Results.Created($"/api/admin/coupons/{coupon.Id}", MaGiamGiaDto.TuCoupon(coupon));
    }

    /// <summary>Cập nhật mã giảm giá (admin)</summary>
    [HttpPut("/api/admin/coupons/{id}")]
    public async Task<IResult> CapNhatMaGiam(string id, [FromBody] DTOs.YeuCau.TaoMaGiamGiaRequest yeuCau)
    {
        var loi = TroGiup.YeuCauAdmin(User); if (loi is not null) return loi;
        var coupon = await db.Coupons.Include(c => c.Course).FirstOrDefaultAsync(c => c.Id == id);
        if (coupon is null) return Results.NotFound(new { message = "Không tìm thấy mã giảm giá" });

        if (!string.IsNullOrWhiteSpace(yeuCau.Code)) coupon.Code = yeuCau.Code.Trim().ToUpperInvariant();
        if (yeuCau.DiscountType is not null) coupon.DiscountType = yeuCau.DiscountType;
        coupon.DiscountValue = yeuCau.DiscountValue;
        if (yeuCau.MinPurchaseAmount is not null) coupon.MinPurchaseAmount = yeuCau.MinPurchaseAmount.Value;
        coupon.MaxDiscountAmount = yeuCau.MaxDiscountAmount;
        coupon.StartDate = yeuCau.StartDate;
        coupon.EndDate = yeuCau.EndDate;
        coupon.UsageLimit = yeuCau.UsageLimit;
        coupon.CourseId = yeuCau.CourseId;
        coupon.UpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync();
        return Results.Ok(MaGiamGiaDto.TuCoupon(coupon));
    }

    /// <summary>Xóa mã giảm giá (admin)</summary>
    [HttpDelete("/api/admin/coupons/{id}")]
    public async Task<IResult> XoaMaGiam(string id)
    {
        var loi = TroGiup.YeuCauAdmin(User); if (loi is not null) return loi;
        var coupon = await db.Coupons.FirstOrDefaultAsync(c => c.Id == id);
        if (coupon is null) return Results.NotFound(new { message = "Không tìm thấy mã giảm giá" });
        db.Coupons.Remove(coupon);
        await db.SaveChangesAsync();
        return Results.Ok(new { message = "Đã xóa mã giảm giá" });
    }

    /// <summary>Danh sách giao dịch (admin)</summary>
    [HttpGet("/api/admin/transactions")]
    public async Task<IResult> DanhSachGiaoDich(int page = 1, int pageSize = 20)
    {
        var loi = TroGiup.YeuCauAdmin(User); if (loi is not null) return loi;
        page = Math.Max(1, page); pageSize = Math.Clamp(pageSize, 1, 100);
        var tong = await db.WalletTransactions.CountAsync();
        var ds = await db.WalletTransactions.AsNoTracking()
            .Include(g => g.User).Include(g => g.Course).Include(g => g.Purchase).Include(g => g.ExternalPayment)
            .OrderByDescending(g => g.CreatedAt).Skip((page - 1) * pageSize).Take(pageSize).ToListAsync();
        return Results.Ok(TroGiup.PhanTrang(ds.Select(GiaoDichDto.TuGiaoDich), tong, page, pageSize));
    }

    /// <summary>Nhật ký kiểm toán (admin)</summary>
    [HttpGet("/api/admin/audit-logs")]
    public async Task<IResult> DanhSachNhatKy(int page = 1, int pageSize = 50)
    {
        var loi = TroGiup.YeuCauAdmin(User); if (loi is not null) return loi;
        page = Math.Max(1, page); pageSize = Math.Clamp(pageSize, 1, 200);
        var tong = await db.AuditLogs.CountAsync();
        var ds = await db.AuditLogs.AsNoTracking().OrderByDescending(nk => nk.CreatedAt).Skip((page - 1) * pageSize).Take(pageSize).ToListAsync();
        return Results.Ok(TroGiup.PhanTrang(ds.Select(NhatKyDto.TuNhatKy), tong, page, pageSize));
    }

    /// <summary>Thống kê tổng quan hệ thống (admin)</summary>
    [HttpGet("/api/admin/dashboard")]
    public async Task<IResult> ThongKeTongQuan()
    {
        var loi = TroGiup.YeuCauAdmin(User); if (loi is not null) return loi;
        return Results.Ok(new
        {
            totalUsers = await db.Users.CountAsync(),
            totalCourses = await db.Courses.CountAsync(),
            totalEnrollments = await db.Enrollments.CountAsync(),
            totalRevenue = await db.WalletTransactions.Where(g => g.Type == "COURSE_PURCHASE").SumAsync(g => -g.Amount)
        });
    }
}
