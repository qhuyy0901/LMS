using System.Security.Claims;
using System.Text.Json;
using LMS.Api.Data;
using LMS.Api.DTOs.PhanHoi;
using LMS.Api.Models;
using Microsoft.EntityFrameworkCore;

namespace LMS.Api.Services;

/// <summary>
/// Dịch vụ thanh toán — nạp ví, mua khóa học, mã giảm giá.
/// </summary>
public interface IDichVuThanhToan
{
    Task<IResult> NapViAsync(string userId, int soTien, string frontendUrl);
    Task<IResult> MuaKhoaHocAsync(string userId, string khoaHocId, string frontendUrl, string? maGiamGia);
    Task<(bool HopLe, MaGiamGia? MaGiam, int SoTienGiam, string? Loi)> KiemTraMaGiamGiaAsync(string? code, string khoaHocId, int giaKhoaHoc);
}

public class DichVuThanhToan(LmsDbContext db) : IDichVuThanhToan
{
    public async Task<IResult> NapViAsync(string userId, int soTien, string frontendUrl)
    {
        var menhGia = new[] { 100000, 200000, 500000, 1000000 };
        if (!menhGia.Contains(soTien))
            return Results.BadRequest(new { message = "Mệnh giá nạp ví không hợp lệ" });

        var user = await db.Users.FirstOrDefaultAsync(u => u.Id == userId);
        if (user is null) return Results.NotFound(new { message = "Không tìm thấy người dùng" });

        var now = DateTime.UtcNow;
        var sessionId = $"mock_wallet_{DateTimeOffset.UtcNow.ToUnixTimeMilliseconds()}";
        var thanhToanNgoai = new ThanhToanNgoai
        {
            Id = TaoId.Moi(), UserId = userId, Amount = soTien, Provider = "MOCK",
            ProviderSessionId = sessionId, Status = "COMPLETED",
            Note = $"Nạp ví test {TroGiup.DinhDangTienVND(soTien)}",
            CompletedAt = now, CreatedAt = now, UpdatedAt = now
        };
        user.WalletBalance += soTien;
        TroGiup.DongBoHangThanhVien(user);
        user.UpdatedAt = now;

        db.ExternalPayments.Add(thanhToanNgoai);
        db.WalletTransactions.Add(new GiaoDichVi { Id = TaoId.Moi(), UserId = userId, Type = "TOP_UP", Amount = soTien, BalanceAfter = user.WalletBalance, Note = $"Nạp ví test {TroGiup.DinhDangTienVND(soTien)}", ExternalPaymentId = thanhToanNgoai.Id, CreatedAt = now });
        db.Notifications.Add(new ThongBao { Id = TaoId.Moi(), UserId = userId, Type = "PAYMENT_SUCCESS", Title = "Nạp ví thành công", Body = $"Bạn vừa nạp thành công {TroGiup.DinhDangTienVND(soTien)} vào ví nội bộ.", Link = "/pricing", Metadata = JsonSerializer.Serialize(new { amount = soTien, externalPaymentId = thanhToanNgoai.Id }), CreatedAt = now });

        await db.SaveChangesAsync();
        return Results.Ok(new { url = $"{frontendUrl}/payment-success?kind=topup&amount={soTien}&session_id={sessionId}" });
    }

    public async Task<IResult> MuaKhoaHocAsync(string userId, string khoaHocId, string frontendUrl, string? maGiamGia)
    {
        var kh = await db.Courses.FirstOrDefaultAsync(c => c.Id == khoaHocId);
        if (kh is null) return Results.NotFound(new { message = "Không tìm thấy khóa học" });
        if (!kh.IsPublished) return Results.BadRequest(new { message = "Khóa học này đang ở chế độ bản nháp" });
        if (kh.Price <= 0) return Results.BadRequest(new { message = "Khóa học này miễn phí, hãy đăng ký trực tiếp." });

        var user = await db.Users.FirstOrDefaultAsync(u => u.Id == userId);
        if (user is null) return Results.NotFound(new { message = "Không tìm thấy người dùng" });
        TroGiup.DongBoHangThanhVien(user);
        if (!TroGiup.DuHangYeuCau(user.MemberTier, kh.MinimumMemberTier))
            return Results.Json(new { message = "Danh hiệu hội viên hiện tại chưa đủ để mua khóa học này", requiredTier = kh.MinimumMemberTier }, statusCode: 403);

        if (await db.Purchases.AnyAsync(p => p.UserId == userId && p.CourseId == khoaHocId))
            return Results.BadRequest(new { message = "Bạn đã mua khóa học này" });

        var soTienGiam = 0;
        MaGiamGia? coupon = null;
        if (!string.IsNullOrWhiteSpace(maGiamGia))
        {
            var ketQua = await KiemTraMaGiamGiaAsync(maGiamGia, khoaHocId, kh.Price);
            if (!ketQua.HopLe) return Results.BadRequest(new { message = ketQua.Loi });
            coupon = ketQua.MaGiam;
            soTienGiam = ketQua.SoTienGiam;
        }

        var giaCuoi = Math.Max(0, kh.Price - soTienGiam);
        if (user.WalletBalance < giaCuoi)
            return Results.BadRequest(new { message = "Số dư ví không đủ để mua khóa học", requiredAmount = giaCuoi, walletBalance = user.WalletBalance, shortfall = giaCuoi - user.WalletBalance });

        var now = DateTime.UtcNow;

        user.WalletBalance -= giaCuoi;
        user.TotalSpent += giaCuoi;
        var homNay = TroGiup.LayNgayDiaPhuong();
        var tuanHienTai = TroGiup.LayMaTuan(homNay);
        var diemNhanDuoc = 0;
        if (user.LastPurchaseRewardWeek != tuanHienTai)
        {
            diemNhanDuoc = Math.Min(15, 100 - user.RewardPoints);
            user.RewardPoints += diemNhanDuoc;
            user.LastPurchaseRewardWeek = tuanHienTai;
        }
        TroGiup.DongBoHangThanhVien(user);
        user.UpdatedAt = now;

        var muaHang = new GiaoDichMua { Id = TaoId.Moi(), UserId = userId, CourseId = khoaHocId, OriginalAmount = kh.Price, DiscountAmount = soTienGiam, FinalAmount = giaCuoi, CouponId = coupon?.Id, Status = "COMPLETED", CreatedAt = now, UpdatedAt = now };
        db.Purchases.Add(muaHang);
        db.Enrollments.Add(new GhiDanh { Id = TaoId.Moi(), UserId = userId, CourseId = khoaHocId, Progress = 0, CreatedAt = now, UpdatedAt = now });
        db.WalletTransactions.Add(new GiaoDichVi { Id = TaoId.Moi(), UserId = userId, CourseId = khoaHocId, PurchaseId = muaHang.Id, Type = "COURSE_PURCHASE", Amount = -giaCuoi, BalanceAfter = user.WalletBalance, Note = $"Mua khóa học: {kh.Title}", CreatedAt = now });
        db.Notifications.Add(new ThongBao { Id = TaoId.Moi(), UserId = userId, Type = "COURSE_PURCHASED", Title = "Mua khóa học thành công", Body = $"Bạn đã mua khóa học {kh.Title}.", Link = $"/course/{khoaHocId}", Metadata = JsonSerializer.Serialize(new { courseId = khoaHocId, purchaseId = muaHang.Id }), CreatedAt = now });

        if (coupon is not null) { coupon.UsageCount += 1; coupon.UpdatedAt = now; }

        await db.SaveChangesAsync();

        var hang = TroGiup.TinhHangThanhVien(user.WalletBalance);
        return Results.Ok(new { message = "Mua khóa học thành công", walletBalance = user.WalletBalance, totalSpent = user.TotalSpent, memberTier = user.MemberTier, memberTierLabel = hang.NhanHieu, discountAmount = soTienGiam, finalPrice = giaCuoi, earnedPoints = diemNhanDuoc, rewardPoints = user.RewardPoints, successUrl = $"{frontendUrl}/course/{khoaHocId}?success=true" });
    }

    public async Task<(bool HopLe, MaGiamGia? MaGiam, int SoTienGiam, string? Loi)> KiemTraMaGiamGiaAsync(string? code, string khoaHocId, int giaKhoaHoc)
    {
        if (string.IsNullOrWhiteSpace(code)) return (false, null, 0, "Mã giảm giá không hợp lệ");

        var maChuan = code.Trim().ToUpperInvariant();
        var coupon = await db.Coupons.FirstOrDefaultAsync(c => c.Code == maChuan);
        if (coupon is null) return (false, null, 0, "Mã giảm giá không tồn tại");
        if (!coupon.IsActive) return (false, coupon, 0, "Mã giảm giá đã bị vô hiệu hóa");

        var now = DateTime.UtcNow;
        if (coupon.StartDate is not null && now < coupon.StartDate.Value) return (false, coupon, 0, "Mã giảm giá chưa tới thời gian hiệu lực");
        if (coupon.EndDate is not null && now > coupon.EndDate.Value) return (false, coupon, 0, "Mã giảm giá đã hết hạn");
        if (coupon.UsageLimit is not null && coupon.UsageCount >= coupon.UsageLimit.Value) return (false, coupon, 0, "Mã giảm giá đã hết lượt sử dụng");
        if (!string.IsNullOrWhiteSpace(coupon.CourseId) && coupon.CourseId != khoaHocId) return (false, coupon, 0, "Mã giảm giá không áp dụng cho khóa học này");
        if (coupon.MinPurchaseAmount > 0 && giaKhoaHoc < coupon.MinPurchaseAmount) return (false, coupon, 0, $"Giá khóa học phải từ {coupon.MinPurchaseAmount} VND trở lên");

        var soTienGiam = TinhGiamGia(coupon, giaKhoaHoc);
        return (true, coupon, soTienGiam, null);
    }

    private static int TinhGiamGia(MaGiamGia coupon, int giaKhoaHoc)
    {
        if (coupon.DiscountType == "PERCENTAGE")
        {
            var giam = (int)Math.Floor(giaKhoaHoc * (coupon.DiscountValue / 100.0));
            if (coupon.MaxDiscountAmount is not null) giam = Math.Min(giam, coupon.MaxDiscountAmount.Value);
            return Math.Min(giam, giaKhoaHoc);
        }
        return Math.Min(coupon.DiscountValue, giaKhoaHoc);
    }
}
