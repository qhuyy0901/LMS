namespace LMS.Api.Domain.Entities;

public class ThanhToan
{
    public string Id { get; set; } = string.Empty;
    public string NhaCungCap { get; set; } = string.Empty;
    public string TrangThai { get; set; } = "PENDING";
    public int SoTien { get; set; }
    public string LoaiTien { get; set; } = "VND";
    public string? NoiDung { get; set; }
    public string PhienNhaCungCapId { get; set; } = string.Empty;
    public string? MaThanhToanNhaCungCap { get; set; }
    public DateTime? NgayHoanThanh { get; set; }
    public string NguoiDungId { get; set; } = string.Empty;
    public NguoiDung? NguoiDung { get; set; }
    public DateTime NgayTao { get; set; }
    public DateTime NgayCapNhat { get; set; }

    public ICollection<GiaoDichVi> CacGiaoDichVi { get; set; } = [];
}
