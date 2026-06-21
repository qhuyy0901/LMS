namespace LMS.Api.Domain.Entities;

public class RutTienGiangVien
{
    public string Id { get; set; } = string.Empty;
    public string GiangVienId { get; set; } = string.Empty;
    public NguoiDung? GiangVien { get; set; }
    public int SoTien { get; set; }
    public string TrangThai { get; set; } = "COMPLETED";
    public string TenNganHang { get; set; } = string.Empty;
    public string SoTaiKhoan { get; set; } = string.Empty;
    public string ChuTaiKhoan { get; set; } = string.Empty;
    public string? NoiDung { get; set; }
    public DateTime NgayTao { get; set; }
}
