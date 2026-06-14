using System.Text.Json;
using LMS.Api.Data;
using LMS.Api.DTOs.PhanHoi;
using LMS.Api.DTOs.YeuCau;
using LMS.Api.Models;
using LMS.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace LMS.Api.Controllers;

[ApiController]
[Authorize]
public class GiangVienMaGiamGiaController(LmsDbContext db) : ControllerBase
{
    [HttpGet("/api/teacher/vouchers")]
    [HttpGet("/api/instructor/vouchers")]
    public async Task<IResult> DanhSach(string? q = null, string? status = null)
    {
        var loi = TroGiup.YeuCauGiangVien(User);
        if (loi is not null) return loi;

        var teacherId = TroGiup.LayUserId(User)!;
        var query = db.Coupons.AsNoTracking()
            .Include(coupon => coupon.Course)
            .Include(coupon => coupon.Recipients)
            .Where(coupon => coupon.TeacherId == teacherId);

        if (!string.IsNullOrWhiteSpace(q))
        {
            var keyword = q.Trim();
            query = query.Where(coupon => coupon.Code.Contains(keyword) || (coupon.Course != null && coupon.Course.Title.Contains(keyword)));
        }

        var vouchers = await query
            .OrderByDescending(coupon => coupon.CreatedAt)
            .ToListAsync();

        if (!string.IsNullOrWhiteSpace(status))
        {
            var normalizedStatus = status.Trim().ToUpperInvariant();
            vouchers = vouchers.Where(coupon => VoucherStatus(coupon) == normalizedStatus).ToList();
        }

        return Results.Ok(new
        {
            items = vouchers.Select(MapVoucher),
            total = vouchers.Count
        });
    }

    [HttpPost("/api/teacher/vouchers")]
    [HttpPost("/api/instructor/vouchers")]
    public async Task<IResult> Tao([FromBody] TaoMaGiamGiaRequest request)
    {
        var loi = TroGiup.YeuCauGiangVien(User);
        if (loi is not null) return loi;

        var teacherId = TroGiup.LayUserId(User)!;
        if (string.IsNullOrWhiteSpace(request.Code)) return Results.BadRequest(new { message = "Mã giảm giá không được để trống" });

        var code = request.Code.Trim().ToUpperInvariant();
        if (await db.Coupons.AnyAsync(coupon => coupon.Code == code)) return Results.Conflict(new { message = "Mã giảm giá đã tồn tại" });

        var discountType = NormalizeDiscountType(request.DiscountType);
        if (request.DiscountValue <= 0) return Results.BadRequest(new { message = "Giá trị giảm phải lớn hơn 0" });
        if (discountType == "PERCENTAGE" && request.DiscountValue > 100) return Results.BadRequest(new { message = "Giảm theo phần trăm không được vượt quá 100%" });
        if (request.EndDate is not null && request.StartDate is not null && request.EndDate <= request.StartDate)
            return Results.BadRequest(new { message = "Ngày kết thúc phải sau ngày bắt đầu" });

        KhoaHoc? course = null;
        if (!string.IsNullOrWhiteSpace(request.CourseId))
        {
            course = await db.Courses.FirstOrDefaultAsync(item => item.Id == request.CourseId && item.InstructorId == teacherId);
            if (course is null) return Results.Json(new { message = "Bạn không có quyền tạo voucher cho khóa học này" }, statusCode: 403);
        }

        var now = DateTime.UtcNow;
        var voucher = new MaGiamGia
        {
            Id = TaoId.Moi(),
            Code = code,
            DiscountType = discountType,
            DiscountValue = request.DiscountValue,
            MinPurchaseAmount = Math.Max(0, request.MinPurchaseAmount ?? 0),
            MaxDiscountAmount = request.MaxDiscountAmount,
            StartDate = request.StartDate,
            EndDate = request.EndDate,
            UsageLimit = request.UsageLimit,
            UsageCount = 0,
            CourseId = course?.Id,
            TeacherId = teacherId,
            Status = "ACTIVE",
            IsActive = true,
            IsPrivate = false,
            CreatedAt = now,
            UpdatedAt = now
        };

        db.Coupons.Add(voucher);
        await db.SaveChangesAsync();

        var saved = await db.Coupons.AsNoTracking()
            .Include(coupon => coupon.Course)
            .Include(coupon => coupon.Recipients)
            .FirstAsync(coupon => coupon.Id == voucher.Id);
        return Results.Created($"/api/teacher/vouchers/{voucher.Id}", MapVoucher(saved));
    }

    [HttpPatch("/api/teacher/vouchers/{id}/toggle")]
    [HttpPatch("/api/instructor/vouchers/{id}/toggle")]
    public async Task<IResult> DoiTrangThai(string id)
    {
        var loi = TroGiup.YeuCauGiangVien(User);
        if (loi is not null) return loi;

        var teacherId = TroGiup.LayUserId(User)!;
        var voucher = await db.Coupons
            .Include(coupon => coupon.Course)
            .Include(coupon => coupon.Recipients)
            .FirstOrDefaultAsync(coupon => coupon.Id == id && coupon.TeacherId == teacherId);
        if (voucher is null) return Results.NotFound(new { message = "Không tìm thấy voucher" });

        voucher.IsActive = !voucher.IsActive;
        voucher.Status = voucher.IsActive ? "ACTIVE" : "INACTIVE";
        voucher.UpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync();

        return Results.Ok(MapVoucher(voucher));
    }

    [HttpGet("/api/teacher/vouchers/eligible-students")]
    [HttpGet("/api/instructor/vouchers/eligible-students")]
    public async Task<IResult> HocVienCoTheNhan([FromQuery] string sourceCourseId)
    {
        var loi = TroGiup.YeuCauGiangVien(User);
        if (loi is not null) return loi;

        var teacherId = TroGiup.LayUserId(User)!;
        if (!await db.Courses.AnyAsync(course => course.Id == sourceCourseId && course.InstructorId == teacherId))
            return Results.Json(new { message = "Bạn không có quyền xem học viên của khóa học này" }, statusCode: 403);

        var purchased = db.Purchases.AsNoTracking()
            .Where(purchase => purchase.CourseId == sourceCourseId && purchase.Status == "COMPLETED")
            .Select(purchase => purchase.UserId);
        var completed = db.Enrollments.AsNoTracking()
            .Where(enrollment => enrollment.CourseId == sourceCourseId && (enrollment.CompletedAt != null || enrollment.Progress >= 100))
            .Select(enrollment => enrollment.UserId);
        var userIds = await purchased.Union(completed).Distinct().ToListAsync();

        var students = await db.Users.AsNoTracking()
            .Where(user => userIds.Contains(user.Id))
            .OrderBy(user => user.Name)
            .Select(user => new { id = user.Id, name = user.Name, email = user.Email, avatar = user.Avatar })
            .ToListAsync();

        return Results.Ok(new { items = students, total = students.Count });
    }

    [HttpPost("/api/teacher/vouchers/{id}/send")]
    [HttpPost("/api/instructor/vouchers/{id}/send")]
    public async Task<IResult> GuiChoHocVien(string id, [FromBody] GuiMaGiamGiaRequest request)
    {
        var loi = TroGiup.YeuCauGiangVien(User);
        if (loi is not null) return loi;

        var teacherId = TroGiup.LayUserId(User)!;
        var sourceCourseId = request.SourceCourseId?.Trim();
        if (string.IsNullOrWhiteSpace(sourceCourseId)) return Results.BadRequest(new { message = "Vui lòng chọn khóa học nguồn để gửi voucher" });

        var sourceCourse = await db.Courses.AsNoTracking().FirstOrDefaultAsync(course => course.Id == sourceCourseId && course.InstructorId == teacherId);
        if (sourceCourse is null) return Results.Json(new { message = "Bạn không có quyền gửi voucher từ khóa học này" }, statusCode: 403);

        var voucher = await db.Coupons
            .Include(coupon => coupon.Course)
            .Include(coupon => coupon.Recipients)
            .FirstOrDefaultAsync(coupon => coupon.Id == id && coupon.TeacherId == teacherId);
        if (voucher is null) return Results.NotFound(new { message = "Không tìm thấy voucher" });
        if (!string.IsNullOrWhiteSpace(voucher.CourseId) && voucher.CourseId == sourceCourseId)
            return Results.BadRequest(new { message = "Voucher tặng học viên phải áp dụng cho khóa học khác của cùng giảng viên" });

        var requestedStudentIds = (request.StudentIds ?? [])
            .Where(studentId => !string.IsNullOrWhiteSpace(studentId))
            .Select(studentId => studentId.Trim())
            .Distinct()
            .ToList();
        if (requestedStudentIds.Count == 0) return Results.BadRequest(new { message = "Vui lòng chọn ít nhất một học viên" });

        var purchased = db.Purchases
            .Where(purchase => purchase.CourseId == sourceCourseId && purchase.Status == "COMPLETED")
            .Select(purchase => purchase.UserId);
        var completed = db.Enrollments
            .Where(enrollment => enrollment.CourseId == sourceCourseId && (enrollment.CompletedAt != null || enrollment.Progress >= 100))
            .Select(enrollment => enrollment.UserId);
        var eligible = await purchased.Union(completed)
            .Where(userId => requestedStudentIds.Contains(userId))
            .Distinct()
            .ToListAsync();
        if (eligible.Count == 0) return Results.BadRequest(new { message = "Không có học viên hợp lệ để nhận voucher" });

        var existingRecipients = voucher.Recipients.Select(recipient => recipient.UserId).ToHashSet();
        var now = DateTime.UtcNow;
        foreach (var studentId in eligible.Where(studentId => !existingRecipients.Contains(studentId)))
        {
            db.CouponRecipients.Add(new NguoiNhanMaGiamGia
            {
                Id = TaoId.Moi(),
                CouponId = voucher.Id,
                UserId = studentId,
                TeacherId = teacherId,
                SourceCourseId = sourceCourseId,
                CreatedAt = now
            });
            db.Notifications.Add(new ThongBao
            {
                Id = TaoId.Moi(),
                UserId = studentId,
                Type = "TEACHER_VOUCHER",
                Title = "Bạn nhận được mã giảm giá",
                Body = $"Giảng viên đã gửi mã {voucher.Code} cho khóa học tiếp theo của bạn.",
                Link = voucher.CourseId is null ? "/explore" : $"/course/{voucher.CourseId}",
                Metadata = JsonSerializer.Serialize(new { couponId = voucher.Id, code = voucher.Code, sourceCourseId }),
                CreatedAt = now
            });
        }

        voucher.IsPrivate = true;
        voucher.UpdatedAt = now;
        await db.SaveChangesAsync();

        var saved = await db.Coupons.AsNoTracking()
            .Include(coupon => coupon.Course)
            .Include(coupon => coupon.Recipients)
            .FirstAsync(coupon => coupon.Id == voucher.Id);
        return Results.Ok(new { message = "Đã gửi voucher cho học viên hợp lệ", voucher = MapVoucher(saved), sentCount = eligible.Count });
    }

    private static string NormalizeDiscountType(string? value)
    {
        var normalized = (value ?? "PERCENTAGE").Trim().ToUpperInvariant();
        return normalized is "FIXED" or "FIXED_AMOUNT" or "AMOUNT" ? "FIXED_AMOUNT" : "PERCENTAGE";
    }

    private static string VoucherStatus(MaGiamGia coupon)
    {
        if (!coupon.IsActive || string.Equals(coupon.Status, "INACTIVE", StringComparison.OrdinalIgnoreCase)) return "INACTIVE";
        if (coupon.EndDate is not null && DateTime.UtcNow > coupon.EndDate.Value) return "EXPIRED";
        return "ACTIVE";
    }

    private static object MapVoucher(MaGiamGia coupon)
    {
        var dto = MaGiamGiaDto.TuCoupon(coupon);
        return new
        {
            dto.Id,
            dto.Code,
            dto.DiscountType,
            discountTypeLabel = dto.DiscountType == "PERCENTAGE" ? "Phần trăm" : "Số tiền cố định",
            dto.DiscountValue,
            dto.MinPurchaseAmount,
            dto.MaxDiscountAmount,
            dto.StartDate,
            dto.EndDate,
            dto.IsActive,
            maxUses = dto.UsageLimit,
            usedCount = dto.UsageCount,
            dto.UsageLimit,
            dto.UsageCount,
            dto.CourseId,
            dto.Course,
            dto.TeacherId,
            status = VoucherStatus(coupon),
            dto.IsPrivate,
            recipientCount = coupon.Recipients.Count,
            dto.CreatedAt,
            dto.UpdatedAt
        };
    }
}
