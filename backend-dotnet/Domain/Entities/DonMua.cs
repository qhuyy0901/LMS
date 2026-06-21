namespace LMS.Api.Domain.Entities;

public class DonMua
{
    public string Id { get; set; } = string.Empty;
    public int SoTienGoc { get; set; }
    public int SoTienGiam { get; set; }
    public int SoTienCuoi { get; set; }
    public string LoaiTien { get; set; } = "VND";
    public string TrangThai { get; set; } = "COMPLETED";
    public string NguoiDungId { get; set; } = string.Empty;
    public NguoiDung? NguoiDung { get; set; }
    public string KhoaHocId { get; set; } = string.Empty;
    public KhoaHoc? KhoaHoc { get; set; }
    public string? MaGiamGiaId { get; set; }
    public MaGiamGia? MaGiamGia { get; set; }
    public DateTime NgayTao { get; set; }
    public DateTime NgayCapNhat { get; set; }

    public ICollection<GiaoDichVi> CacGiaoDichVi { get; set; } = [];
}
