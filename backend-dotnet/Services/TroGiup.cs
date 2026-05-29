using System.Globalization;
using System.Security.Claims;

namespace LMS.Api.Services;

/// <summary>
/// Các hàm tiện ích dùng chung trong toàn bộ dự án.
/// Bao gồm: format tiền tệ, phân hạng thành viên, phân quyền, phân trang.
/// </summary>
public static class TroGiup
{
    // ── Tiền tệ ──────────────────────────────────────────────

    /// <summary>Định dạng số tiền theo chuẩn VND (ví dụ: 100.000 ₫)</summary>
    public static string DinhDangTienVND(int soTien) =>
        string.Create(CultureInfo.GetCultureInfo("vi-VN"), $"{soTien:C0}");

    // ── Phân hạng thành viên ─────────────────────────────────

    /// <summary>Tính hạng thành viên dựa trên tổng chi tiêu</summary>
    public static (string Hang, string NhanHieu, int ChiTieuToiThieu) TinhHangThanhVien(int tongChiTieu) =>
        tongChiTieu >= 15_000_000 ? ("DIAMOND", "Kim cương", 15_000_000) :
        tongChiTieu >= 7_000_000 ? ("PLATINUM", "Bạch kim", 7_000_000) :
        tongChiTieu >= 3_000_000 ? ("GOLD", "Vàng", 3_000_000) :
        tongChiTieu >= 1_000_000 ? ("SILVER", "Bạc", 1_000_000) :
        ("BRONZE", "Đồng", 0);

    /// <summary>Lấy trọng số của hạng thành viên để so sánh</summary>
    public static int TrongSoHang(string hang) => hang switch
    {
        "DIAMOND" => 4,
        "PLATINUM" => 3,
        "GOLD" => 2,
        "SILVER" => 1,
        _ => 0
    };

    /// <summary>Kiểm tra người dùng có đủ hạng yêu cầu không</summary>
    public static bool DuHangYeuCau(string hangHienTai, string hangYeuCau) =>
        TrongSoHang(hangHienTai) >= TrongSoHang(hangYeuCau);

    // ── Phân trang ───────────────────────────────────────────

    /// <summary>Tạo object kết quả phân trang</summary>
    public static object PhanTrang<T>(IEnumerable<T> danhSach, int tongSo, int trang, int soLuong) => new
    {
        items = danhSach,
        total = tongSo,
        page = trang,
        pageSize = soLuong,
        pages = (int)Math.Ceiling(tongSo / (double)soLuong)
    };

    // ── Phân quyền ───────────────────────────────────────────

    /// <summary>Lấy ID người dùng hiện tại từ JWT Claims</summary>
    public static string? LayUserId(ClaimsPrincipal nguoiDung) =>
        nguoiDung.FindFirstValue(ClaimTypes.NameIdentifier);

    /// <summary>Kiểm tra người dùng có phải Admin không. Trả về lỗi Forbid nếu không phải.</summary>
    public static IResult? YeuCauAdmin(ClaimsPrincipal nguoiDung) =>
        nguoiDung.FindFirstValue(ClaimTypes.Role) == "ADMIN" ? null : Results.Forbid();

    /// <summary>Kiểm tra người dùng có phải Giảng viên hoặc Admin không.</summary>
    public static IResult? YeuCauGiangVien(ClaimsPrincipal nguoiDung)
    {
        var vaiTro = nguoiDung.FindFirstValue(ClaimTypes.Role);
        return vaiTro is "INSTRUCTOR" or "ADMIN" ? null : Results.Forbid();
    }

    // ── Tiện ích khác ────────────────────────────────────────

    /// <summary>Giới hạn phần trăm trong khoảng 0-100</summary>
    public static int GioiHanPhanTram(double giaTri) =>
        Math.Min(100, Math.Max(0, (int)Math.Round(giaTri)));
}
