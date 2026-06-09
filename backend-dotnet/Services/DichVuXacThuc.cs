using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using LMS.Api.Data;
using LMS.Api.DTOs.PhanHoi;
using LMS.Api.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;

namespace LMS.Api.Services;

/// <summary>
/// Dịch vụ xác thực — xử lý đăng ký, đăng nhập, tạo JWT token.
/// </summary>
public interface IDichVuXacThuc
{
    /// <summary>Đăng ký tài khoản mới</summary>
    Task<(bool ThanhCong, string? Loi, XacThucPhanHoi? KetQua)> DangKyAsync(string email, string matKhau, string? ten);
    /// <summary>Đăng nhập bằng email + mật khẩu</summary>
    Task<(bool ThanhCong, XacThucPhanHoi? KetQua)> DangNhapAsync(string email, string matKhau);
    Task<XacThucPhanHoi> DangNhapMangXaHoiAsync(string email, string? ten);
    /// <summary>Tạo JWT token cho người dùng</summary>
    string TaoToken(NguoiDung nguoiDung);
}

public class DichVuXacThuc(IConfiguration cauHinh, LmsDbContext db) : IDichVuXacThuc
{
    private SecurityKey KhoaJwt => new SymmetricSecurityKey(
        Encoding.UTF8.GetBytes(cauHinh["JWT_SECRET"] ?? "doi-thanh-chuoi-bi-mat-dai-va-ngau-nhien-cua-ban-o-day-2026"));

    public async Task<(bool ThanhCong, string? Loi, XacThucPhanHoi? KetQua)> DangKyAsync(string email, string matKhau, string? ten)
    {
        if (string.IsNullOrWhiteSpace(matKhau) || matKhau.Length < 6)
            return (false, "Mật khẩu tối thiểu 6 ký tự.", null);

        var emailChuan = email.Trim().ToLowerInvariant();
        if (await db.Users.AnyAsync(u => u.Email == emailChuan))
            return (false, "Email đã tồn tại", null);

        var nguoiDung = new NguoiDung
        {
            Id = TaoId.Moi(),
            Email = emailChuan,
            Name = string.IsNullOrWhiteSpace(ten) ? emailChuan : ten.Trim(),
            Password = BCrypt.Net.BCrypt.HashPassword(matKhau),
            Role = "STUDENT",
            MemberTier = "BRONZE",
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        db.Users.Add(nguoiDung);
        await db.SaveChangesAsync();

        return (true, null, XacThucPhanHoi.TuUser(nguoiDung, TaoToken(nguoiDung)));
    }

    public async Task<(bool ThanhCong, XacThucPhanHoi? KetQua)> DangNhapAsync(string email, string matKhau)
    {
        var emailChuan = email.Trim().ToLowerInvariant();
        var nguoiDung = await db.Users.FirstOrDefaultAsync(u => u.Email == emailChuan);

        if (nguoiDung is null || !BCrypt.Net.BCrypt.Verify(matKhau, nguoiDung.Password))
            return (false, null);

        var daThayDoi = TroGiup.DongBoHangThanhVien(nguoiDung);
        var homNay = TroGiup.LayNgayDiaPhuong();
        var ngayGanNhat = nguoiDung.LastRewardLoginDate?.Date;

        if (ngayGanNhat != homNay)
        {
            nguoiDung.LoginStreak = ngayGanNhat == homNay.AddDays(-1)
                ? Math.Max(1, nguoiDung.LoginStreak) + 1
                : 1;

            var diemTheoChuoi = Math.Min(10, 2 + nguoiDung.LoginStreak);
            nguoiDung.RewardPoints = Math.Min(100, nguoiDung.RewardPoints + diemTheoChuoi);
            nguoiDung.LastRewardLoginDate = homNay;
            nguoiDung.UpdatedAt = DateTime.UtcNow;
            daThayDoi = true;
        }

        if (daThayDoi)
            await db.SaveChangesAsync();

        return (true, XacThucPhanHoi.TuUser(nguoiDung, TaoToken(nguoiDung)));
    }

    public async Task<XacThucPhanHoi> DangNhapMangXaHoiAsync(string email, string? ten)
    {
        var emailChuan = email.Trim().ToLowerInvariant();
        var nguoiDung = await db.Users.FirstOrDefaultAsync(user => user.Email == emailChuan);
        if (nguoiDung is null)
        {
            nguoiDung = new NguoiDung
            {
                Id = TaoId.Moi(),
                Email = emailChuan,
                Name = string.IsNullOrWhiteSpace(ten) ? emailChuan : ten.Trim(),
                Password = BCrypt.Net.BCrypt.HashPassword(Guid.NewGuid().ToString("N")),
                Role = "STUDENT",
                MemberTier = "BRONZE",
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };
            db.Users.Add(nguoiDung);
            await db.SaveChangesAsync();
        }
        else
        {
            // Cập nhật login streak và reward points cho user đã tồn tại (giống đăng nhập thường)
            var daThayDoi = TroGiup.DongBoHangThanhVien(nguoiDung);
            var homNay = TroGiup.LayNgayDiaPhuong();
            var ngayGanNhat = nguoiDung.LastRewardLoginDate?.Date;

            if (ngayGanNhat != homNay)
            {
                nguoiDung.LoginStreak = ngayGanNhat == homNay.AddDays(-1)
                    ? Math.Max(1, nguoiDung.LoginStreak) + 1
                    : 1;

                var diemTheoChuoi = Math.Min(10, 2 + nguoiDung.LoginStreak);
                nguoiDung.RewardPoints = Math.Min(100, nguoiDung.RewardPoints + diemTheoChuoi);
                nguoiDung.LastRewardLoginDate = homNay;
                nguoiDung.UpdatedAt = DateTime.UtcNow;
                daThayDoi = true;
            }

            if (daThayDoi)
                await db.SaveChangesAsync();
        }

        return XacThucPhanHoi.TuUser(nguoiDung, TaoToken(nguoiDung));
    }

    public string TaoToken(NguoiDung nguoiDung)
    {
        var thongTin = new SigningCredentials(KhoaJwt, SecurityAlgorithms.HmacSha256);
        var token = new JwtSecurityToken(
            claims:
            [
                new Claim(ClaimTypes.NameIdentifier, nguoiDung.Id),
                new Claim(ClaimTypes.Email, nguoiDung.Email),
                new Claim(ClaimTypes.Role, nguoiDung.Role)
            ],
            expires: DateTime.UtcNow.AddDays(7),
            signingCredentials: thongTin
        );
        return new JwtSecurityTokenHandler().WriteToken(token);
    }
}
