using System.Security.Claims;
using System.Text.Json;
using LMS.Api.Data;
using LMS.Api.DTOs.PhanHoi;
using LMS.Api.Models;
using LMS.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace LMS.Api.Controllers;

/// <summary>Controller quản trị: quản lý người dùng, khóa học, mã giảm giá, giao dịch và nhật ký.</summary>
[ApiController]
[Authorize]
public class QuanTriController(LmsDbContext db) : ControllerBase
{
    [HttpGet("/api/admin/users")]
    public async Task<IResult> DanhSachNguoiDung(string? q = null, string? role = null, int page = 1, int pageSize = 20)
    {
        var loi = TroGiup.YeuCauAdmin(User);
        if (loi is not null) return loi;

        page = Math.Max(1, page);
        pageSize = Math.Clamp(pageSize, 1, 100);

        var query = db.Users.AsNoTracking().AsQueryable();

        if (!string.IsNullOrWhiteSpace(q))
        {
            var tuKhoa = q.Trim();
            query = query.Where(u => u.Name.Contains(tuKhoa) || u.Email.Contains(tuKhoa));
        }

        if (!string.IsNullOrWhiteSpace(role))
        {
            var vaiTro = role.Trim().ToUpperInvariant();
            query = query.Where(u => u.Role == vaiTro);
        }

        var tong = await query.CountAsync();
        var ds = await query
            .OrderByDescending(u => u.CreatedAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync();

        var ids = ds.Select(u => u.Id).ToList();

        var coursesCounts = await db.Courses
            .Where(c => ids.Contains(c.InstructorId))
            .GroupBy(c => c.InstructorId)
            .Select(g => new { InstructorId = g.Key, Count = g.Count() })
            .ToDictionaryAsync(g => g.InstructorId, g => g.Count);

        var enrollmentsCounts = await db.Enrollments
            .Where(e => ids.Contains(e.UserId))
            .GroupBy(e => e.UserId)
            .Select(g => new { UserId = g.Key, Count = g.Count() })
            .ToDictionaryAsync(g => g.UserId, g => g.Count);

        var purchasesCounts = await db.Purchases
            .Where(p => ids.Contains(p.UserId))
            .GroupBy(p => p.UserId)
            .Select(g => new { UserId = g.Key, Count = g.Count() })
            .ToDictionaryAsync(g => g.UserId, g => g.Count);

        var items = new List<object>();
        foreach (var u in ds)
        {
            coursesCounts.TryGetValue(u.Id, out var soKhoaHoc);
            enrollmentsCounts.TryGetValue(u.Id, out var soGhiDanh);
            purchasesCounts.TryGetValue(u.Id, out var soMuaHang);
            items.Add(NguoiDungAdminDto.TuUser(u, soKhoaHoc, soGhiDanh, soMuaHang));
        }

        return Results.Ok(TroGiup.PhanTrang(items, tong, page, pageSize));
    }

    [HttpPatch("/api/admin/users/{id}/role")]
    public async Task<IResult> DoiVaiTro(string id, [FromBody] DTOs.YeuCau.DoiVaiTroRequest yeuCau)
    {
        var loi = TroGiup.YeuCauAdmin(User);
        if (loi is not null) return loi;

        var vaiTro = new[] { "STUDENT", "INSTRUCTOR", "ADMIN" };
        if (!vaiTro.Contains(yeuCau.Role)) return Results.BadRequest(new { message = "Vai trò không hợp lệ" });

        var user = await db.Users.FirstOrDefaultAsync(u => u.Id == id);
        if (user is null) return Results.NotFound(new { message = "Không tìm thấy người dùng" });

        user.Role = yeuCau.Role;
        user.UpdatedAt = DateTime.UtcNow;
        await GhiNhatKy("UPDATE_USER_ROLE", "User", user.Id, new { user.Email, role = user.Role });
        await db.SaveChangesAsync();

        var soKhoaHoc = await db.Courses.CountAsync(c => c.InstructorId == user.Id);
        var soGhiDanh = await db.Enrollments.CountAsync(e => e.UserId == user.Id);
        var soMuaHang = await db.Purchases.CountAsync(p => p.UserId == user.Id);
        return Results.Ok(NguoiDungAdminDto.TuUser(user, soKhoaHoc, soGhiDanh, soMuaHang));
    }

    [HttpDelete("/api/admin/users/{id}")]
    public async Task<IResult> XoaNguoiDung(string id)
    {
        var loi = TroGiup.YeuCauAdmin(User);
        if (loi is not null) return loi;

        var actorId = TroGiup.LayUserId(User);
        if (actorId == id) return Results.BadRequest(new { message = "Bạn không thể xóa chính tài khoản admin đang đăng nhập" });

        var user = await db.Users.FirstOrDefaultAsync(u => u.Id == id);
        if (user is null) return Results.NotFound(new { message = "Không tìm thấy người dùng" });

        var khoaHocIds = await db.Courses.Where(c => c.InstructorId == id).Select(c => c.Id).ToListAsync();
        foreach (var courseId in khoaHocIds)
        {
            await XoaDuLieuKhoaHoc(courseId);
        }

        db.Comments.RemoveRange(await db.Comments.Where(c => c.UserId == id).ToListAsync());
        db.QuizSubmissions.RemoveRange(await db.QuizSubmissions.Where(s => s.UserId == id).ToListAsync());
        db.LessonProgresses.RemoveRange(await db.LessonProgresses.Where(p => p.UserId == id).ToListAsync());
        db.CourseReviews.RemoveRange(await db.CourseReviews.Where(r => r.UserId == id).ToListAsync());
        db.Certificates.RemoveRange(await db.Certificates.Where(c => c.UserId == id).ToListAsync());
        db.Enrollments.RemoveRange(await db.Enrollments.Where(e => e.UserId == id).ToListAsync());
        db.Purchases.RemoveRange(await db.Purchases.Where(p => p.UserId == id).ToListAsync());
        db.WalletTransactions.RemoveRange(await db.WalletTransactions.Where(t => t.UserId == id).ToListAsync());
        db.ExternalPayments.RemoveRange(await db.ExternalPayments.Where(p => p.UserId == id).ToListAsync());
        db.Notifications.RemoveRange(await db.Notifications.Where(n => n.UserId == id).ToListAsync());
        db.EventRegistrations.RemoveRange(await db.EventRegistrations.Where(r => r.UserId == id).ToListAsync());
        db.EventRewardRedemptions.RemoveRange(await db.EventRewardRedemptions.Where(r => r.UserId == id).ToListAsync());
        db.Events.RemoveRange(await db.Events.Where(e => e.InstructorId == id).ToListAsync());

        db.Users.Remove(user);
        await GhiNhatKy("DELETE_USER", "User", user.Id, new { user.Email, user.Role });
        await db.SaveChangesAsync();

        return Results.Ok(new { message = "Đã xóa người dùng" });
    }

    [HttpGet("/api/admin/courses")]
    public async Task<IResult> DanhSachKhoaHoc(string? q = null, string? status = null, int page = 1, int pageSize = 20)
    {
        var loi = TroGiup.YeuCauAdmin(User);
        if (loi is not null) return loi;

        page = Math.Max(1, page);
        pageSize = Math.Clamp(pageSize, 1, 100);

        var query = db.Courses.AsNoTracking()
            .Include(c => c.Instructor)
            .Include(c => c.Lessons)
            .Include(c => c.Enrollments)
            .Include(c => c.Reviews)
            .AsQueryable();

        if (!string.IsNullOrWhiteSpace(q))
        {
            var tuKhoa = q.Trim();
            query = query.Where(c =>
                c.Title.Contains(tuKhoa) ||
                c.Slug.Contains(tuKhoa) ||
                (c.Instructor != null && (c.Instructor.Name.Contains(tuKhoa) || c.Instructor.Email.Contains(tuKhoa))));
        }

        if (!string.IsNullOrWhiteSpace(status))
        {
            var trangThai = status.Trim().ToLowerInvariant();
            if (trangThai == "published") query = query.Where(c => c.IsPublished || c.Status == "PUBLIC");
            if (trangThai == "draft") query = query.Where(c => !c.IsPublished && c.Status != "PUBLIC");
        }

        var tong = await query.CountAsync();
        var ds = await query
            .OrderByDescending(c => c.CreatedAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync();

        return Results.Ok(TroGiup.PhanTrang(ds.Select(KhoaHocAdminDto.TuKhoaHoc), tong, page, pageSize));
    }

    [HttpPatch("/api/admin/courses/{id}/publication")]
    public async Task<IResult> CapNhatXuatBanKhoaHoc(string id, [FromBody] DTOs.YeuCau.XuatBanRequest yeuCau)
    {
        var loi = TroGiup.YeuCauAdmin(User);
        if (loi is not null) return loi;

        var kh = await db.Courses
            .Include(c => c.Instructor)
            .Include(c => c.Lessons)
            .Include(c => c.Enrollments)
            .Include(c => c.Reviews)
            .FirstOrDefaultAsync(c => c.Id == id);
        if (kh is null) return Results.NotFound(new { message = "Không tìm thấy khóa học" });

        kh.IsPublished = yeuCau.IsPublished;
        kh.Status = yeuCau.IsPublished ? "PUBLIC" : "DRAFT";
        kh.PublishedAt = yeuCau.IsPublished ? DateTime.UtcNow : kh.PublishedAt;
        kh.UpdatedAt = DateTime.UtcNow;

        await GhiNhatKy("UPDATE_COURSE_PUBLICATION", "Course", kh.Id, new { kh.Title, kh.IsPublished });
        await db.SaveChangesAsync();

        return Results.Ok(KhoaHocAdminDto.TuKhoaHoc(kh));
    }

    [HttpDelete("/api/admin/courses/{id}")]
    public async Task<IResult> XoaKhoaHoc(string id)
    {
        var loi = TroGiup.YeuCauAdmin(User);
        if (loi is not null) return loi;

        var kh = await db.Courses.FirstOrDefaultAsync(c => c.Id == id);
        if (kh is null) return Results.NotFound(new { message = "Không tìm thấy khóa học" });

        await XoaDuLieuKhoaHoc(id);
        await GhiNhatKy("DELETE_COURSE", "Course", id, new { kh.Title, kh.Slug });
        await db.SaveChangesAsync();

        return Results.Ok(new { message = "Đã xóa khóa học" });
    }

    [HttpGet("/api/admin/coupons")]
    public async Task<IResult> DanhSachMaGiam(string? q = null, string? status = null, int page = 1, int pageSize = 20)
    {
        var loi = TroGiup.YeuCauAdmin(User);
        if (loi is not null) return loi;

        page = Math.Max(1, page);
        pageSize = Math.Clamp(pageSize, 1, 100);

        var query = db.Coupons.AsNoTracking().Include(c => c.Course).AsQueryable();

        if (!string.IsNullOrWhiteSpace(q))
        {
            var tuKhoa = q.Trim();
            query = query.Where(c => c.Code.Contains(tuKhoa) || (c.Course != null && c.Course.Title.Contains(tuKhoa)));
        }

        if (!string.IsNullOrWhiteSpace(status))
        {
            var trangThai = status.Trim().ToLowerInvariant();
            if (trangThai == "active") query = query.Where(c => c.IsActive);
            if (trangThai == "inactive") query = query.Where(c => !c.IsActive);
        }

        var tong = await query.CountAsync();
        var ds = await query
            .OrderByDescending(c => c.CreatedAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync();

        return Results.Ok(TroGiup.PhanTrang(ds.Select(MaGiamGiaDto.TuCoupon), tong, page, pageSize));
    }

    [HttpPost("/api/admin/coupons")]
    public async Task<IResult> TaoMaGiam([FromBody] DTOs.YeuCau.TaoMaGiamGiaRequest yeuCau)
    {
        var loi = TroGiup.YeuCauAdmin(User);
        if (loi is not null) return loi;

        if (string.IsNullOrWhiteSpace(yeuCau.Code)) return Results.BadRequest(new { message = "Mã giảm giá không được để trống" });

        var maChuan = yeuCau.Code.Trim().ToUpperInvariant();
        if (await db.Coupons.AnyAsync(c => c.Code == maChuan)) return Results.Conflict(new { message = "Mã giảm giá đã tồn tại" });

        if (!string.IsNullOrWhiteSpace(yeuCau.CourseId) && !await db.Courses.AnyAsync(c => c.Id == yeuCau.CourseId))
        {
            return Results.BadRequest(new { message = "Khóa học áp dụng không tồn tại" });
        }

        var now = DateTime.UtcNow;
        var coupon = new MaGiamGia
        {
            Id = TaoId.Moi(),
            Code = maChuan,
            DiscountType = yeuCau.DiscountType ?? "PERCENTAGE",
            DiscountValue = yeuCau.DiscountValue,
            MinPurchaseAmount = yeuCau.MinPurchaseAmount ?? 0,
            MaxDiscountAmount = yeuCau.MaxDiscountAmount,
            StartDate = yeuCau.StartDate,
            EndDate = yeuCau.EndDate,
            UsageLimit = yeuCau.UsageLimit,
            CourseId = string.IsNullOrWhiteSpace(yeuCau.CourseId) ? null : yeuCau.CourseId,
            IsActive = true,
            CreatedAt = now,
            UpdatedAt = now
        };

        db.Coupons.Add(coupon);
        await GhiNhatKy("CREATE_COUPON", "Coupon", coupon.Id, new { coupon.Code, coupon.DiscountType, coupon.DiscountValue });
        await db.SaveChangesAsync();

        var daLuu = await db.Coupons.AsNoTracking().Include(c => c.Course).FirstAsync(c => c.Id == coupon.Id);
        return Results.Created($"/api/admin/coupons/{coupon.Id}", MaGiamGiaDto.TuCoupon(daLuu));
    }

    [HttpPut("/api/admin/coupons/{id}")]
    public async Task<IResult> CapNhatMaGiam(string id, [FromBody] DTOs.YeuCau.TaoMaGiamGiaRequest yeuCau)
    {
        var loi = TroGiup.YeuCauAdmin(User);
        if (loi is not null) return loi;

        var coupon = await db.Coupons.Include(c => c.Course).FirstOrDefaultAsync(c => c.Id == id);
        if (coupon is null) return Results.NotFound(new { message = "Không tìm thấy mã giảm giá" });

        if (!string.IsNullOrWhiteSpace(yeuCau.Code))
        {
            var maChuan = yeuCau.Code.Trim().ToUpperInvariant();
            if (await db.Coupons.AnyAsync(c => c.Code == maChuan && c.Id != id)) return Results.Conflict(new { message = "Mã giảm giá đã tồn tại" });
            coupon.Code = maChuan;
        }

        if (yeuCau.DiscountType is not null) coupon.DiscountType = yeuCau.DiscountType;
        coupon.DiscountValue = yeuCau.DiscountValue;
        if (yeuCau.MinPurchaseAmount is not null) coupon.MinPurchaseAmount = yeuCau.MinPurchaseAmount.Value;
        coupon.MaxDiscountAmount = yeuCau.MaxDiscountAmount;
        coupon.StartDate = yeuCau.StartDate;
        coupon.EndDate = yeuCau.EndDate;
        coupon.UsageLimit = yeuCau.UsageLimit;
        coupon.CourseId = string.IsNullOrWhiteSpace(yeuCau.CourseId) ? null : yeuCau.CourseId;
        coupon.UpdatedAt = DateTime.UtcNow;

        await GhiNhatKy("UPDATE_COUPON", "Coupon", coupon.Id, new { coupon.Code });
        await db.SaveChangesAsync();

        await db.Entry(coupon).Reference(c => c.Course).LoadAsync();
        return Results.Ok(MaGiamGiaDto.TuCoupon(coupon));
    }

    [HttpPatch("/api/admin/coupons/{id}/toggle")]
    public async Task<IResult> DoiTrangThaiMaGiam(string id)
    {
        var loi = TroGiup.YeuCauAdmin(User);
        if (loi is not null) return loi;

        var coupon = await db.Coupons.Include(c => c.Course).FirstOrDefaultAsync(c => c.Id == id);
        if (coupon is null) return Results.NotFound(new { message = "Không tìm thấy mã giảm giá" });

        coupon.IsActive = !coupon.IsActive;
        coupon.UpdatedAt = DateTime.UtcNow;

        await GhiNhatKy("TOGGLE_COUPON", "Coupon", coupon.Id, new { coupon.Code, coupon.IsActive });
        await db.SaveChangesAsync();

        return Results.Ok(MaGiamGiaDto.TuCoupon(coupon));
    }

    [HttpDelete("/api/admin/coupons/{id}")]
    public async Task<IResult> XoaMaGiam(string id)
    {
        var loi = TroGiup.YeuCauAdmin(User);
        if (loi is not null) return loi;

        var coupon = await db.Coupons.FirstOrDefaultAsync(c => c.Id == id);
        if (coupon is null) return Results.NotFound(new { message = "Không tìm thấy mã giảm giá" });

        db.Coupons.Remove(coupon);
        await GhiNhatKy("DELETE_COUPON", "Coupon", coupon.Id, new { coupon.Code });
        await db.SaveChangesAsync();

        return Results.Ok(new { message = "Đã xóa mã giảm giá" });
    }

    [HttpGet("/api/admin/transactions")]
    public async Task<IResult> DanhSachGiaoDich(string? type = null, int page = 1, int pageSize = 20)
    {
        var loi = TroGiup.YeuCauAdmin(User);
        if (loi is not null) return loi;

        page = Math.Max(1, page);
        pageSize = Math.Clamp(pageSize, 1, 100);

        var query = db.WalletTransactions.AsNoTracking()
            .Include(g => g.User)
            .Include(g => g.Course)
            .Include(g => g.Purchase)
            .Include(g => g.ExternalPayment)
            .AsQueryable();

        if (!string.IsNullOrWhiteSpace(type))
        {
            var loai = type.Trim().ToUpperInvariant();
            query = query.Where(g => g.Type == loai);
        }

        var tong = await query.CountAsync();
        var ds = await query
            .OrderByDescending(g => g.CreatedAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync();

        return Results.Ok(TroGiup.PhanTrang(ds.Select(GiaoDichDto.TuGiaoDich), tong, page, pageSize));
    }

    [HttpGet("/api/admin/audit-logs")]
    public async Task<IResult> DanhSachNhatKy(int page = 1, int pageSize = 50)
    {
        var loi = TroGiup.YeuCauAdmin(User);
        if (loi is not null) return loi;

        page = Math.Max(1, page);
        pageSize = Math.Clamp(pageSize, 1, 200);

        var tong = await db.AuditLogs.CountAsync();
        var ds = await db.AuditLogs.AsNoTracking()
            .OrderByDescending(nk => nk.CreatedAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync();

        return Results.Ok(TroGiup.PhanTrang(ds.Select(NhatKyDto.TuNhatKy), tong, page, pageSize));
    }

    [HttpGet("/api/admin/dashboard")]
    public async Task<IResult> ThongKeTongQuan()
    {
        var loi = TroGiup.YeuCauAdmin(User);
        if (loi is not null) return loi;

        var recentUsers = await db.Users.AsNoTracking()
            .OrderByDescending(u => u.CreatedAt)
            .Take(5)
            .Select(u => new { u.Id, u.Name, u.Email, u.Role, u.CreatedAt })
            .ToListAsync();

        return Results.Ok(new
        {
            totalUsers = await db.Users.CountAsync(),
            totalCourses = await db.Courses.CountAsync(),
            totalEnrollments = await db.Enrollments.CountAsync(),
            totalRevenue = await db.WalletTransactions.Where(g => g.Type == "COURSE_PURCHASE" || g.Type == GiaoDichVi.MuaKhoaHoc).SumAsync(g => -g.Amount),
            pendingPayments = await db.ExternalPayments.CountAsync(p => p.Status == "PENDING"),
            recentUsers
        });
    }

    [HttpGet("/api/admin/withdrawals")]
    public async Task<IResult> DanhSachYeuCauRutTien()
    {
        var loi = TroGiup.YeuCauAdmin(User);
        if (loi is not null) return loi;

        var yeuCaus = await db.InstructorWithdrawals
            .Include(w => w.Instructor)
            .OrderByDescending(w => w.CreatedAt)
            .ToListAsync();

        return Results.Ok(yeuCaus.Select(w => new
        {
            w.Id,
            w.InstructorId,
            InstructorName = w.Instructor != null ? w.Instructor.Name : "Giảng viên",
            InstructorEmail = w.Instructor != null ? w.Instructor.Email : "",
            w.Amount,
            w.Status,
            w.BankName,
            w.AccountNumber,
            w.AccountHolder,
            w.Note,
            w.CreatedAt
        }));
    }

    [HttpPost("/api/admin/withdrawals/{id}/approve")]
    public async Task<IResult> PheDuyetRutTien(string id)
    {
        var loi = TroGiup.YeuCauAdmin(User);
        if (loi is not null) return loi;

        var yeuCau = await db.InstructorWithdrawals
            .Include(w => w.Instructor)
            .FirstOrDefaultAsync(w => w.Id == id);
        if (yeuCau is null) return Results.NotFound(new { message = "Không tìm thấy yêu cầu rút tiền" });

        if (yeuCau.Status != "PENDING") return Results.BadRequest(new { message = "Yêu cầu này đã được xử lý rồi." });

        yeuCau.Status = "COMPLETED";

        await GhiNhatKy("APPROVE_WITHDRAWAL", "InstructorWithdrawal", id, new { yeuCau.InstructorId, yeuCau.Amount });
        await db.SaveChangesAsync();

        return Results.Ok(new { message = "Đã phê duyệt yêu cầu rút tiền thành công." });
    }

    [HttpPost("/api/admin/withdrawals/{id}/reject")]
    public async Task<IResult> TuChoiRutTien(string id, [FromBody] DTOs.YeuCau.TuChoiRutTienRequest? body)
    {
        var loi = TroGiup.YeuCauAdmin(User);
        if (loi is not null) return loi;

        var yeuCau = await db.InstructorWithdrawals
            .Include(w => w.Instructor)
            .FirstOrDefaultAsync(w => w.Id == id);
        if (yeuCau is null) return Results.NotFound(new { message = "Không tìm thấy yêu cầu rút tiền" });

        if (yeuCau.Status != "PENDING") return Results.BadRequest(new { message = "Yêu cầu này đã được xử lý rồi." });

        yeuCau.Status = "REJECTED";
        yeuCau.Note = string.IsNullOrEmpty(body?.GhiChu) ? "Bị từ chối bởi Admin" : body.GhiChu;

        await GhiNhatKy("REJECT_WITHDRAWAL", "InstructorWithdrawal", id, new { yeuCau.InstructorId, yeuCau.Amount, lyDo = yeuCau.Note });
        await db.SaveChangesAsync();

        return Results.Ok(new { message = "Đã từ chối yêu cầu rút tiền." });
    }

    private async Task XoaDuLieuKhoaHoc(string courseId)
    {
        var lessonIds = await db.Lessons.Where(l => l.CourseId == courseId).Select(l => l.Id).ToListAsync();
        var quizIds = await db.Quizzes.Where(q => lessonIds.Contains(q.LessonId)).Select(q => q.Id).ToListAsync();

        db.QuizSubmissions.RemoveRange(await db.QuizSubmissions.Where(s => quizIds.Contains(s.QuizId)).ToListAsync());
        db.QuizQuestions.RemoveRange(await db.QuizQuestions.Where(q => quizIds.Contains(q.QuizId)).ToListAsync());
        db.Quizzes.RemoveRange(await db.Quizzes.Where(q => quizIds.Contains(q.Id)).ToListAsync());
        db.Comments.RemoveRange(await db.Comments.Where(c => lessonIds.Contains(c.LessonId)).ToListAsync());
        db.LessonProgresses.RemoveRange(await db.LessonProgresses.Where(p => lessonIds.Contains(p.LessonId)).ToListAsync());
        db.Assignments.RemoveRange(await db.Assignments.Where(a => a.CourseId == courseId || (a.LessonId != null && lessonIds.Contains(a.LessonId))).ToListAsync());
        db.Coupons.RemoveRange(await db.Coupons.Where(c => c.CourseId == courseId).ToListAsync());
        db.CourseReviews.RemoveRange(await db.CourseReviews.Where(r => r.CourseId == courseId).ToListAsync());
        db.Certificates.RemoveRange(await db.Certificates.Where(c => c.CourseId == courseId).ToListAsync());
        db.Enrollments.RemoveRange(await db.Enrollments.Where(e => e.CourseId == courseId).ToListAsync());
        db.WalletTransactions.RemoveRange(await db.WalletTransactions.Where(t => t.CourseId == courseId).ToListAsync());
        db.Purchases.RemoveRange(await db.Purchases.Where(p => p.CourseId == courseId).ToListAsync());
        db.Lessons.RemoveRange(await db.Lessons.Where(l => l.CourseId == courseId).ToListAsync());
        db.Sections.RemoveRange(await db.Sections.Where(s => s.CourseId == courseId).ToListAsync());
        db.Courses.RemoveRange(await db.Courses.Where(c => c.Id == courseId).ToListAsync());
    }

    private async Task GhiNhatKy(string action, string entityType, string? entityId, object? metadata = null)
    {
        db.AuditLogs.Add(new NhatKyHeThong
        {
            Id = TaoId.Moi(),
            ActorId = User.FindFirstValue(ClaimTypes.NameIdentifier),
            ActorEmail = User.FindFirstValue(ClaimTypes.Email),
            Action = action,
            EntityType = entityType,
            EntityId = entityId,
            Metadata = metadata is null ? null : JsonSerializer.Serialize(metadata),
            IpAddress = HttpContext.Connection.RemoteIpAddress?.ToString(),
            UserAgent = Request.Headers.UserAgent.ToString(),
            CreatedAt = DateTime.UtcNow
        });

        await Task.CompletedTask;
    }
}
