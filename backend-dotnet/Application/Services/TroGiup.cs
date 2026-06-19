using System.Globalization;
using System.Security.Claims;
using LMS.Api.Domain.Entities;

namespace LMS.Api.Application.Services;

public static class TroGiup
{
    public static string DinhDangTienVND(int soTien) =>
        string.Create(CultureInfo.GetCultureInfo("vi-VN"), $"{soTien:C0}");

    public static (string Hang, string NhanHieu, int HanMucToiThieu) TinhHangThanhVien(int soDuVi) =>
        soDuVi >= 15_000_000 ? ("DIAMOND", "Kim cương", 15_000_000) :
        soDuVi >= 7_000_000 ? ("PLATINUM", "Bạch kim", 7_000_000) :
        soDuVi >= 3_000_000 ? ("GOLD", "Vàng", 3_000_000) :
        soDuVi >= 1_000_000 ? ("SILVER", "Bạc", 1_000_000) :
        ("BRONZE", "Đồng", 0);

    public static bool DongBoHangThanhVien(NguoiDung nguoiDung)
    {
        var hangMoi = TinhHangThanhVien(nguoiDung.WalletBalance).Hang;
        if (nguoiDung.MemberTier == hangMoi) return false;

        nguoiDung.MemberTier = hangMoi;
        nguoiDung.UpdatedAt = DateTime.UtcNow;
        return true;
    }

    public static int TrongSoHang(string hang) => hang switch
    {
        "DIAMOND" => 4,
        "PLATINUM" => 3,
        "GOLD" => 2,
        "SILVER" => 1,
        _ => 0
    };

    public static bool DuHangYeuCau(string hangHienTai, string hangYeuCau) =>
        TrongSoHang(hangHienTai) >= TrongSoHang(hangYeuCau);

    public static object PhanTrang<T>(IEnumerable<T> danhSach, int tongSo, int trang, int soLuong) => new
    {
        items = danhSach,
        total = tongSo,
        page = trang,
        pageSize = soLuong,
        pages = (int)Math.Ceiling(tongSo / (double)soLuong)
    };

    public static string? LayUserId(ClaimsPrincipal nguoiDung) =>
        nguoiDung.FindFirstValue(ClaimTypes.NameIdentifier);

    public static IResult? YeuCauAdmin(ClaimsPrincipal nguoiDung) =>
        nguoiDung.FindFirstValue(ClaimTypes.Role) == "ADMIN" ? null : Results.Forbid();

    public static IResult? YeuCauGiangVien(ClaimsPrincipal nguoiDung)
    {
        var vaiTro = nguoiDung.FindFirstValue(ClaimTypes.Role);
        return vaiTro is "INSTRUCTOR" or "ADMIN" ? null : Results.Forbid();
    }

    public static int GioiHanPhanTram(double giaTri) =>
        Math.Min(100, Math.Max(0, (int)Math.Round(giaTri)));

    public static DateTime LayNgayDiaPhuong()
    {
        TimeZoneInfo muiGio;
        try
        {
            muiGio = TimeZoneInfo.FindSystemTimeZoneById("SE Asia Standard Time");
        }
        catch (TimeZoneNotFoundException)
        {
            muiGio = TimeZoneInfo.FindSystemTimeZoneById("Asia/Bangkok");
        }

        return TimeZoneInfo.ConvertTimeFromUtc(DateTime.UtcNow, muiGio).Date;
    }

    public static string LayMaTuan(DateTime ngay)
    {
        var nam = ISOWeek.GetYear(ngay);
        var tuan = ISOWeek.GetWeekOfYear(ngay);
        return $"{nam}-W{tuan:00}";
    }
}
