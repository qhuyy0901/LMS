namespace LMS.Api.Domain.Entities;

public class DoiThuongSuKien
{
    public string Id { get; set; } = string.Empty;
    public string PhanThuongId { get; set; } = string.Empty;
    public string TieuDeSuKien { get; set; } = string.Empty;
    public int DiemYeuCau { get; set; }
    public string NguoiDungId { get; set; } = string.Empty;
    public NguoiDung? NguoiDung { get; set; }
    public DateTime NgayTao { get; set; }
}
