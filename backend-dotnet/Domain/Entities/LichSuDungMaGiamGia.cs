namespace LMS.Api.Domain.Entities;

public class LichSuDungMaGiamGia
{
    public string Id { get; set; } = string.Empty;
    public string MaGiamGiaId { get; set; } = string.Empty;
    public MaGiamGia? MaGiamGia { get; set; }
    public string NguoiDungId { get; set; } = string.Empty;
    public NguoiDung? NguoiDung { get; set; }
    public string KhoaHocId { get; set; } = string.Empty;
    public KhoaHoc? KhoaHoc { get; set; }
    public string DonMuaId { get; set; } = string.Empty;
    public DonMua? DonMua { get; set; }
    public DateTime NgayTao { get; set; }
}
