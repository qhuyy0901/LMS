namespace LMS.Api.Domain.Entities;

public class ThongBao
{
    public string Id { get; set; } = string.Empty;
    public string LoaiThongBao { get; set; } = string.Empty;
    public string TieuDe { get; set; } = string.Empty;
    public string NoiDung { get; set; } = string.Empty;
    public string? DuongDan { get; set; }
    public bool DaDoc { get; set; }
    public string? Metadata { get; set; }
    public DateTime? DocLuc { get; set; }
    public string NguoiDungId { get; set; } = string.Empty;
    public NguoiDung? NguoiDung { get; set; }
    public DateTime NgayTao { get; set; }
}
