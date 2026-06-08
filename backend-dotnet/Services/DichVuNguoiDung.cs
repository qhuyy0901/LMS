using System.Text.Json;
using LMS.Api.Data;
using LMS.Api.DTOs.PhanHoi;
using LMS.Api.Models;
using Microsoft.EntityFrameworkCore;

namespace LMS.Api.Services;

/// <summary>
/// Dịch vụ người dùng — hồ sơ cá nhân, avatar, ví, thông báo, chứng chỉ.
/// </summary>
public interface IDichVuNguoiDung
{
    Task<NguoiDungDto?> LayHoSoAsync(string userId);
    Task<NguoiDungDto?> CapNhatHoSoAsync(string userId, string? ten, string? soDT, string? gioiThieu, JsonElement? caiDat);
    Task<bool> XoaTaiKhoanAsync(string userId);
    Task<string?> DatAvatarAsync(string userId);
    Task<bool> XoaAvatarAsync(string userId);
    Task<object> LayLichSuGiaoDichAsync(string userId);
    Task<object> LayChungChiAsync(string userId);
    Task<object> LayThongBaoAsync(string userId);
    Task<bool> DanhDauDaDocAsync(string userId, string thongBaoId);
}

public class DichVuNguoiDung(LmsDbContext db) : IDichVuNguoiDung
{
    public async Task<NguoiDungDto?> LayHoSoAsync(string userId)
    {
        var user = await db.Users.FirstOrDefaultAsync(u => u.Id == userId);
        if (user is null) return null;

        if (TroGiup.DongBoHangThanhVien(user))
            await db.SaveChangesAsync();

        return NguoiDungDto.TuUser(user);
    }

    public async Task<NguoiDungDto?> CapNhatHoSoAsync(string userId, string? ten, string? soDT, string? gioiThieu, JsonElement? caiDat)
    {
        var user = await db.Users.FirstOrDefaultAsync(u => u.Id == userId);
        if (user is null) return null;

        if (!string.IsNullOrWhiteSpace(ten)) user.Name = ten.Trim();
        if (soDT is not null) user.Phone = soDT.Trim();
        if (gioiThieu is not null) user.Bio = gioiThieu.Trim();
        if (caiDat is not null) user.Settings = JsonSerializer.Serialize(caiDat);
        user.UpdatedAt = DateTime.UtcNow;
        TroGiup.DongBoHangThanhVien(user);

        await db.SaveChangesAsync();
        return NguoiDungDto.TuUser(user);
    }

    public async Task<bool> XoaTaiKhoanAsync(string userId)
    {
        var user = await db.Users.FirstOrDefaultAsync(u => u.Id == userId);
        if (user is null) return false;
        db.Users.Remove(user);
        await db.SaveChangesAsync();
        return true;
    }

    public async Task<string?> DatAvatarAsync(string userId)
    {
        var user = await db.Users.FirstOrDefaultAsync(u => u.Id == userId);
        if (user is null) return null;
        user.Avatar = $"https://api.dicebear.com/7.x/avataaars/svg?seed={Uri.EscapeDataString(user.Email)}";
        user.UpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync();
        return user.Avatar;
    }

    public async Task<bool> XoaAvatarAsync(string userId)
    {
        var user = await db.Users.FirstOrDefaultAsync(u => u.Id == userId);
        if (user is null) return false;
        user.Avatar = null;
        user.UpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync();
        return true;
    }

    public async Task<object> LayLichSuGiaoDichAsync(string userId)
    {
        var ds = await db.WalletTransactions.AsNoTracking()
            .Where(g => g.UserId == userId)
            .Include(g => g.Course).Include(g => g.Purchase).Include(g => g.ExternalPayment)
            .OrderByDescending(g => g.CreatedAt).Take(20).ToListAsync();

        return ds.Select(g => new
        {
            g.Id, g.Type, g.Amount,
            amountText = TroGiup.DinhDangTienVND(g.Amount),
            g.BalanceAfter,
            balanceAfterText = TroGiup.DinhDangTienVND(g.BalanceAfter),
            g.Note, g.CreatedAt,
            course = g.Course == null ? null : new { g.Course.Id, g.Course.Title },
            purchase = g.Purchase == null ? null : new { g.Purchase.Id, g.Purchase.FinalAmount, g.Purchase.Status },
            externalPayment = g.ExternalPayment == null ? null : new { g.ExternalPayment.Id, g.ExternalPayment.Status, g.ExternalPayment.Provider, g.ExternalPayment.ProviderSessionId }
        });
    }

    public async Task<object> LayChungChiAsync(string userId) =>
        await db.Certificates.AsNoTracking()
            .Where(c => c.UserId == userId).Include(c => c.Course)
            .OrderByDescending(c => c.IssuedAt)
            .Select(c => new { c.Id, c.CertificateNo, c.VerifyCode, c.PdfUrl, c.IssuedAt, course = c.Course == null ? null : new { c.Course.Id, c.Course.Title, c.Course.Thumbnail } })
            .ToListAsync();

    public async Task<object> LayThongBaoAsync(string userId) =>
        await db.Notifications.AsNoTracking()
            .Where(tb => tb.UserId == userId).OrderByDescending(tb => tb.CreatedAt).Take(30)
            .Select(tb => new { tb.Id, tb.Type, tb.Title, tb.Body, tb.Link, tb.IsRead, tb.Metadata, tb.ReadAt, tb.CreatedAt })
            .ToListAsync();

    public async Task<bool> DanhDauDaDocAsync(string userId, string thongBaoId)
    {
        var tb = await db.Notifications.FirstOrDefaultAsync(n => n.Id == thongBaoId && n.UserId == userId);
        if (tb is null) return false;
        tb.IsRead = true;
        tb.ReadAt = DateTime.UtcNow;
        await db.SaveChangesAsync();
        return true;
    }
}
