using System.Text.Json;
using LMS.Api.Infrastructure.Persistence;
using LMS.Api.DTOs.PhanHoi;
using LMS.Api.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace LMS.Api.Application.Services;

/// <summary>
/// Dịch vụ người dùng — hồ sơ cá nhân, avatar, ví, thông báo, chứng chỉ.
/// </summary>
public interface IDichVuNguoiDung
{
    Task<NguoiDungDto?> LayHoSoAsync(string userId);
    Task<NguoiDungDto?> CapNhatHoSoAsync(string userId, string? ten, string? soDT, string? gioiThieu, JsonElement? caiDat);
    Task<(bool ThanhCong, string ThongBao)> DoiMatKhauAsync(string userId, string matKhauHienTai, string matKhauMoi);
    Task<bool> XoaTaiKhoanAsync(string userId);
    Task<object> LayLichSuGiaoDichAsync(string userId);
    Task<object> LayChungChiAsync(string userId);
    Task<object> LayThongBaoAsync(string userId);
    Task<object?> XuatDuLieuCaNhanAsync(string userId);
    Task<bool> DanhDauDaDocAsync(string userId, string thongBaoId);
}

public class DichVuNguoiDung(ApplicationDbContext db) : IDichVuNguoiDung
{
    public async Task<NguoiDungDto?> LayHoSoAsync(string userId)
    {
        var user = await db.NguoiDung.FirstOrDefaultAsync(u => u.Id == userId);
        if (user is null) return null;

        if (TroGiup.DongBoHangThanhVien(user))
            await db.SaveChangesAsync();

        return NguoiDungDto.TuUser(user);
    }

    public async Task<NguoiDungDto?> CapNhatHoSoAsync(string userId, string? ten, string? soDT, string? gioiThieu, JsonElement? caiDat)
    {
        var user = await db.NguoiDung.FirstOrDefaultAsync(u => u.Id == userId);
        if (user is null) return null;

        if (!string.IsNullOrWhiteSpace(ten)) user.Ten = ten.Trim();
        if (soDT is not null) user.SoDienThoai = soDT.Trim();
        if (gioiThieu is not null) user.TieuSu = gioiThieu.Trim();
        if (caiDat is not null) user.CaiDat = JsonSerializer.Serialize(caiDat);
        user.NgayCapNhat = DateTime.UtcNow;
        TroGiup.DongBoHangThanhVien(user);

        await db.SaveChangesAsync();
        return NguoiDungDto.TuUser(user);
    }

    public async Task<(bool ThanhCong, string ThongBao)> DoiMatKhauAsync(string userId, string matKhauHienTai, string matKhauMoi)
    {
        var user = await db.NguoiDung.FirstOrDefaultAsync(u => u.Id == userId);
        if (user is null) return (false, "Không tìm thấy người dùng");
        if (string.IsNullOrWhiteSpace(matKhauHienTai) || string.IsNullOrWhiteSpace(matKhauMoi))
            return (false, "Vui lòng nhập đầy đủ mật khẩu");
        if (matKhauMoi.Length < 6)
            return (false, "Mật khẩu mới phải có ít nhất 6 ký tự");

        var dungMatKhau = BCrypt.Net.BCrypt.Verify(matKhauHienTai, user.MatKhau);
        if (!dungMatKhau) return (false, "Mật khẩu hiện tại không đúng");

        user.MatKhau = BCrypt.Net.BCrypt.HashPassword(matKhauMoi);
        user.NgayCapNhat = DateTime.UtcNow;
        await db.SaveChangesAsync();
        return (true, "Đã đổi mật khẩu thành công");
    }

    public async Task<bool> XoaTaiKhoanAsync(string userId)
    {
        var user = await db.NguoiDung.FirstOrDefaultAsync(u => u.Id == userId);
        if (user is null) return false;
        db.NguoiDung.Remove(user);
        await db.SaveChangesAsync();
        return true;
    }

    public async Task<object> LayLichSuGiaoDichAsync(string userId)
    {
        var ds = await db.GiaoDichVi.AsNoTracking()
            .Where(g => g.NguoiDungId == userId)
            .Include(g => g.KhoaHoc).Include(g => g.DonMua).Include(g => g.ThanhToan)
            .OrderByDescending(g => g.NgayTao).Take(20).ToListAsync();

        return ds.Select(g => new
        {
            g.Id, g.LoaiGiaoDich, g.SoTien,
            amountText = TroGiup.DinhDangTienVND(g.SoTien),
            g.SoDuSauGiaoDich,
            balanceAfterText = TroGiup.DinhDangTienVND(g.SoDuSauGiaoDich),
            g.NoiDung, g.NgayTao,
            course = g.KhoaHoc == null ? null : new { g.KhoaHoc.Id, g.KhoaHoc.TieuDe },
            purchase = g.DonMua == null ? null : new { g.DonMua.Id, g.DonMua.SoTienCuoi, g.DonMua.TrangThai },
            externalPayment = g.ThanhToan == null ? null : new { g.ThanhToan.Id, g.ThanhToan.TrangThai, g.ThanhToan.NhaCungCap, g.ThanhToan.PhienNhaCungCapId }
        });
    }

    public async Task<object> LayChungChiAsync(string userId) =>
        await db.ChungChi.AsNoTracking()
            .Where(c => c.NguoiDungId == userId).Include(c => c.KhoaHoc)
            .OrderByDescending(c => c.NgayCap)
            .Select(c => new { c.Id, c.SoChungChi, c.MaXacThuc, c.PdfUrl, c.NgayCap, course = c.KhoaHoc == null ? null : new { c.KhoaHoc.Id, c.KhoaHoc.TieuDe, c.KhoaHoc.AnhDaiDien } })
            .ToListAsync();

    public async Task<object> LayThongBaoAsync(string userId) =>
        await db.ThongBao.AsNoTracking()
            .Where(tb => tb.NguoiDungId == userId).OrderByDescending(tb => tb.NgayTao).Take(30)
            .Select(tb => new { tb.Id, tb.LoaiThongBao, tb.TieuDe, tb.NoiDung, tb.DuongDan, tb.DaDoc, tb.Metadata, tb.DocLuc, tb.NgayTao })
            .ToListAsync();

    public async Task<object?> XuatDuLieuCaNhanAsync(string userId)
    {
        var user = await db.NguoiDung.AsNoTracking().FirstOrDefaultAsync(u => u.Id == userId);
        if (user is null) return null;

        var enrollments = await db.GhiDanh.AsNoTracking()
            .Where(e => e.NguoiDungId == userId)
            .Include(e => e.KhoaHoc)
            .OrderByDescending(e => e.NgayTao)
            .Select(e => new
            {
                e.Id,
                e.TienDo,
                e.NgayTao,
                e.NgayCapNhat,
                e.NgayHoanThanh,
                course = e.KhoaHoc == null ? null : new { e.KhoaHoc.Id, e.KhoaHoc.TieuDe }
            })
            .ToListAsync();

        var certificates = await db.ChungChi.AsNoTracking()
            .Where(c => c.NguoiDungId == userId)
            .Include(c => c.KhoaHoc)
            .OrderByDescending(c => c.NgayCap)
            .Select(c => new
            {
                c.Id,
                c.SoChungChi,
                c.MaXacThuc,
                c.NgayCap,
                course = c.KhoaHoc == null ? null : new { c.KhoaHoc.Id, c.KhoaHoc.TieuDe }
            })
            .ToListAsync();

        var transactions = await db.GiaoDichVi.AsNoTracking()
            .Where(g => g.NguoiDungId == userId)
            .Include(g => g.KhoaHoc)
            .OrderByDescending(g => g.NgayTao)
            .Select(g => new
            {
                g.Id,
                g.LoaiGiaoDich,
                g.SoTien,
                g.SoDuSauGiaoDich,
                g.NoiDung,
                g.NgayTao,
                course = g.KhoaHoc == null ? null : new { g.KhoaHoc.Id, g.KhoaHoc.TieuDe }
            })
            .ToListAsync();

        var lessonProgress = await db.TienDoBaiHoc.AsNoTracking()
            .Where(p => p.NguoiDungId == userId)
            .Include(p => p.BaiHoc)
            .OrderByDescending(p => p.NgayCapNhat)
            .Select(p => new
            {
                p.Id,
                p.DaHoanThanh,
                p.GiayDaXem,
                p.TyLeHoanThanh,
                p.NgayHoanThanh,
                p.NgayCapNhat,
                lesson = p.BaiHoc == null ? null : new { p.BaiHoc.Id, p.BaiHoc.TieuDe, p.BaiHoc.KhoaHocId }
            })
            .ToListAsync();

        return new
        {
            exportedAt = DateTime.UtcNow,
            profile = NguoiDungDto.TuUser(user),
            enrollments,
            certificates,
            transactions,
            lessonProgress
        };
    }

    public async Task<bool> DanhDauDaDocAsync(string userId, string thongBaoId)
    {
        var tb = await db.ThongBao.FirstOrDefaultAsync(n => n.Id == thongBaoId && n.NguoiDungId == userId);
        if (tb is null) return false;
        tb.DaDoc = true;
        tb.DocLuc = DateTime.UtcNow;
        await db.SaveChangesAsync();
        return true;
    }
}
