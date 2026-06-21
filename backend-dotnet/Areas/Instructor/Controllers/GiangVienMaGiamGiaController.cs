using System.Text.Json;
using LMS.Api.Infrastructure.Persistence;
using LMS.Api.DTOs.PhanHoi;
using LMS.Api.DTOs.YeuCau;
using LMS.Api.Domain.Entities;
using LMS.Api.Application.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace LMS.Api.Areas.GiangVien.Controllers;

[ApiController]
[Authorize]
[Area("Instructor")]
public class GiangVienMaGiamGiaController(ApplicationDbContext db) : ControllerBase
{
    [HttpGet("/api/teacher/vouchers")]
    [HttpGet("/api/instructor/vouchers")]
    public async Task<IResult> DanhSach(string? q = null, string? status = null)
    {
        var loi = TroGiup.YeuCauGiangVien(User);
        if (loi is not null) return loi;

        var teacherId = TroGiup.LayUserId(User)!;
        var query = db.MaGiamGia.AsNoTracking()
            .Include(coupon => coupon.KhoaHoc)
            .Include(coupon => coupon.CacNguoiNhan)
            .Where(coupon => coupon.GiangVienId == teacherId);

        if (!string.IsNullOrWhiteSpace(q))
        {
            var keyword = q.Trim();
            query = query.Where(coupon => coupon.Ma.Contains(keyword) || (coupon.KhoaHoc != null && coupon.KhoaHoc.TieuDe.Contains(keyword)));
        }

        var vouchers = await query
            .OrderByDescending(coupon => coupon.NgayTao)
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
        if (await db.MaGiamGia.AnyAsync(coupon => coupon.Ma == code)) return Results.Conflict(new { message = "Mã giảm giá đã tồn tại" });

        var discountType = NormalizeDiscountType(request.DiscountType);
        if (request.DiscountValue <= 0) return Results.BadRequest(new { message = "Giá trị giảm phải lớn hơn 0" });
        if (discountType == "PERCENTAGE" && request.DiscountValue > 100) return Results.BadRequest(new { message = "Giảm theo phần trăm không được vượt quá 100%" });
        if (request.EndDate is not null && request.StartDate is not null && request.EndDate <= request.StartDate)
            return Results.BadRequest(new { message = "Ngày kết thúc phải sau ngày bắt đầu" });

        KhoaHoc? course = null;
        if (!string.IsNullOrWhiteSpace(request.CourseId))
        {
            course = await db.KhoaHoc.FirstOrDefaultAsync(item => item.Id == request.CourseId && item.GiangVienId == teacherId);
            if (course is null) return Results.Json(new { message = "Bạn không có quyền tạo voucher cho khóa học này" }, statusCode: 403);
        }

        var now = DateTime.UtcNow;
        var voucher = new MaGiamGia
        {
            Id = TaoId.Moi(),
            Ma = code,
            DiscountType = discountType,
            DiscountValue = request.DiscountValue,
            MinPurchaseAmount = Math.Max(0, request.MinPurchaseAmount ?? 0),
            MaxDiscountAmount = request.MaxDiscountAmount,
            StartDate = request.StartDate,
            EndDate = request.EndDate,
            UsageLimit = request.UsageLimit,
            UsageCount = 0,
            KhoaHocId = course?.Id,
            GiangVienId = teacherId,
            TrangThai = "ACTIVE",
            HoatDong = true,
            IsPrivate = false,
            NgayTao = now,
            NgayCapNhat = now
        };

        db.MaGiamGia.Add(voucher);
        await db.SaveChangesAsync();

        var saved = await db.MaGiamGia.AsNoTracking()
            .Include(coupon => coupon.KhoaHoc)
            .Include(coupon => coupon.CacNguoiNhan)
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
        var voucher = await db.MaGiamGia
            .Include(coupon => coupon.KhoaHoc)
            .Include(coupon => coupon.CacNguoiNhan)
            .FirstOrDefaultAsync(coupon => coupon.Id == id && coupon.GiangVienId == teacherId);
        if (voucher is null) return Results.NotFound(new { message = "Không tìm thấy voucher" });

        voucher.HoatDong = !voucher.HoatDong;
        voucher.TrangThai = voucher.HoatDong ? "ACTIVE" : "INACTIVE";
        voucher.NgayCapNhat = DateTime.UtcNow;
        await db.SaveChangesAsync();

        return Results.Ok(MapVoucher(voucher));
    }

    [HttpPut("/api/teacher/vouchers/{id}")]
    [HttpPut("/api/instructor/vouchers/{id}")]
    public async Task<IResult> CapNhat(string id, [FromBody] TaoMaGiamGiaRequest request)
    {
        var loi = TroGiup.YeuCauGiangVien(User);
        if (loi is not null) return loi;

        var teacherId = TroGiup.LayUserId(User)!;
        var voucher = await db.MaGiamGia
            .Include(coupon => coupon.KhoaHoc)
            .Include(coupon => coupon.CacNguoiNhan)
            .FirstOrDefaultAsync(coupon => coupon.Id == id && coupon.GiangVienId == teacherId);
        if (voucher is null) return Results.NotFound(new { message = "Không tìm thấy voucher" });

        if (!string.IsNullOrWhiteSpace(request.Code))
        {
            var code = request.Code.Trim().ToUpperInvariant();
            if (code != voucher.Ma && await db.MaGiamGia.AnyAsync(coupon => coupon.Ma == code))
                return Results.Conflict(new { message = "Mã giảm giá đã tồn tại" });
            voucher.Ma = code;
        }

        var discountType = NormalizeDiscountType(request.DiscountType);
        if (request.DiscountValue <= 0) return Results.BadRequest(new { message = "Giá trị giảm phải lớn hơn 0" });
        if (discountType == "PERCENTAGE" && request.DiscountValue > 100) return Results.BadRequest(new { message = "Giảm theo phần trăm không được vượt quá 100%" });
        if (request.EndDate is not null && request.StartDate is not null && request.EndDate <= request.StartDate)
            return Results.BadRequest(new { message = "Ngày kết thúc phải sau ngày bắt đầu" });

        KhoaHoc? course = null;
        if (!string.IsNullOrWhiteSpace(request.CourseId))
        {
            course = await db.KhoaHoc.FirstOrDefaultAsync(item => item.Id == request.CourseId && item.GiangVienId == teacherId);
            if (course is null) return Results.Json(new { message = "Bạn không có quyền sử dụng khóa học này" }, statusCode: 403);
        }

        voucher.DiscountType = discountType;
        voucher.DiscountValue = request.DiscountValue;
        voucher.MinPurchaseAmount = Math.Max(0, request.MinPurchaseAmount ?? 0);
        voucher.MaxDiscountAmount = request.MaxDiscountAmount;
        voucher.StartDate = request.StartDate;
        voucher.EndDate = request.EndDate;
        voucher.UsageLimit = request.UsageLimit;
        voucher.KhoaHocId = course?.Id;
        voucher.NgayCapNhat = DateTime.UtcNow;
        await db.SaveChangesAsync();

        var saved = await db.MaGiamGia.AsNoTracking()
            .Include(coupon => coupon.KhoaHoc)
            .Include(coupon => coupon.CacNguoiNhan)
            .FirstAsync(coupon => coupon.Id == voucher.Id);
        return Results.Ok(MapVoucher(saved));
    }

    [HttpDelete("/api/teacher/vouchers/{id}")]
    [HttpDelete("/api/instructor/vouchers/{id}")]
    public async Task<IResult> Xoa(string id)
    {
        var loi = TroGiup.YeuCauGiangVien(User);
        if (loi is not null) return loi;

        var teacherId = TroGiup.LayUserId(User)!;
        var voucher = await db.MaGiamGia
            .Include(coupon => coupon.CacNguoiNhan)
            .FirstOrDefaultAsync(coupon => coupon.Id == id && coupon.GiangVienId == teacherId);
        if (voucher is null) return Results.NotFound(new { message = "Không tìm thấy voucher" });

        if (voucher.CacNguoiNhan.Count > 0)
            db.NguoiNhanMaGiamGia.RemoveRange(voucher.CacNguoiNhan);

        db.MaGiamGia.Remove(voucher);
        await db.SaveChangesAsync();

        return Results.Ok(new { message = "Đã xóa voucher thành công" });
    }

    [HttpGet("/api/teacher/vouchers/eligible-students")]
    [HttpGet("/api/instructor/vouchers/eligible-students")]
    public async Task<IResult> HocVienCoTheNhan([FromQuery] string sourceCourseId)
    {
        var loi = TroGiup.YeuCauGiangVien(User);
        if (loi is not null) return loi;

        var teacherId = TroGiup.LayUserId(User)!;
        if (!await db.KhoaHoc.AnyAsync(course => course.Id == sourceCourseId && course.GiangVienId == teacherId))
            return Results.Json(new { message = "Bạn không có quyền xem học viên của khóa học này" }, statusCode: 403);

        var purchased = db.DonMua.AsNoTracking()
            .Where(purchase => purchase.KhoaHocId == sourceCourseId && purchase.TrangThai == "COMPLETED")
            .Select(purchase => purchase.NguoiDungId);
        var completed = db.GhiDanh.AsNoTracking()
            .Where(enrollment => enrollment.KhoaHocId == sourceCourseId && (enrollment.NgayHoanThanh != null || enrollment.TienDo >= 100))
            .Select(enrollment => enrollment.NguoiDungId);
        var userIds = await purchased.Union(completed).Distinct().ToListAsync();

        var students = await db.NguoiDung.AsNoTracking()
            .Where(user => userIds.Contains(user.Id))
            .OrderBy(user => user.Ten)
            .Select(user => new { id = user.Id, name = user.Ten, email = user.Email, avatar = user.AnhDaiDien })
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

        var sourceCourse = await db.KhoaHoc.AsNoTracking().FirstOrDefaultAsync(course => course.Id == sourceCourseId && course.GiangVienId == teacherId);
        if (sourceCourse is null) return Results.Json(new { message = "Bạn không có quyền gửi voucher từ khóa học này" }, statusCode: 403);

        var voucher = await db.MaGiamGia
            .Include(coupon => coupon.KhoaHoc)
            .Include(coupon => coupon.CacNguoiNhan)
            .FirstOrDefaultAsync(coupon => coupon.Id == id && coupon.GiangVienId == teacherId);
        if (voucher is null) return Results.NotFound(new { message = "Không tìm thấy voucher" });
        if (!string.IsNullOrWhiteSpace(voucher.KhoaHocId) && voucher.KhoaHocId == sourceCourseId)
            return Results.BadRequest(new { message = "Voucher tặng học viên phải áp dụng cho khóa học khác của cùng giảng viên" });

        var requestedStudentIds = (request.StudentIds ?? [])
            .Where(studentId => !string.IsNullOrWhiteSpace(studentId))
            .Select(studentId => studentId.Trim())
            .Distinct()
            .ToList();
        if (requestedStudentIds.Count == 0) return Results.BadRequest(new { message = "Vui lòng chọn ít nhất một học viên" });

        var purchased = db.DonMua
            .Where(purchase => purchase.KhoaHocId == sourceCourseId && purchase.TrangThai == "COMPLETED")
            .Select(purchase => purchase.NguoiDungId);
        var completed = db.GhiDanh
            .Where(enrollment => enrollment.KhoaHocId == sourceCourseId && (enrollment.NgayHoanThanh != null || enrollment.TienDo >= 100))
            .Select(enrollment => enrollment.NguoiDungId);
        var eligible = await purchased.Union(completed)
            .Where(userId => requestedStudentIds.Contains(userId))
            .Distinct()
            .ToListAsync();
        if (eligible.Count == 0) return Results.BadRequest(new { message = "Không có học viên hợp lệ để nhận voucher" });

        var existingRecipients = voucher.CacNguoiNhan.Select(recipient => recipient.NguoiDungId).ToHashSet();
        var now = DateTime.UtcNow;
        foreach (var studentId in eligible.Where(studentId => !existingRecipients.Contains(studentId)))
        {
            db.NguoiNhanMaGiamGia.Add(new NguoiNhanMaGiamGia
            {
                Id = TaoId.Moi(),
                MaGiamGiaId = voucher.Id,
                NguoiDungId = studentId,
                GiangVienId = teacherId,
                SourceCourseId = sourceCourseId,
                NgayTao = now
            });
            db.ThongBao.Add(new ThongBao
            {
                Id = TaoId.Moi(),
                NguoiDungId = studentId,
                LoaiThongBao = "TEACHER_VOUCHER",
                TieuDe = "Bạn nhận được mã giảm giá",
                NoiDung = $"Giảng viên đã gửi mã {voucher.Ma} cho khóa học tiếp theo của bạn.",
                DuongDan = voucher.KhoaHocId is null ? "/explore" : $"/course/{voucher.KhoaHocId}",
                Metadata = JsonSerializer.Serialize(new { couponId = voucher.Id, code = voucher.Ma, sourceCourseId }),
                NgayTao = now
            });
        }

        voucher.IsPrivate = true;
        voucher.NgayCapNhat = now;
        await db.SaveChangesAsync();

        var saved = await db.MaGiamGia.AsNoTracking()
            .Include(coupon => coupon.KhoaHoc)
            .Include(coupon => coupon.CacNguoiNhan)
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
        if (!coupon.HoatDong || string.Equals(coupon.TrangThai, "INACTIVE", StringComparison.OrdinalIgnoreCase)) return "INACTIVE";
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
            recipientCount = coupon.CacNguoiNhan.Count,
            dto.CreatedAt,
            dto.UpdatedAt
        };
    }
}
