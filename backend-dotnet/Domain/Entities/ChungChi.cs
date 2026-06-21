namespace LMS.Api.Domain.Entities;

public class ChungChi
{
    public string Id { get; set; } = string.Empty;
    public string SoChungChi { get; set; } = string.Empty;
    public string MaXacThuc { get; set; } = string.Empty;
    public string? PdfUrl { get; set; }
    public string? AnhChupHoanThanh { get; set; }
    public DateTime NgayCap { get; set; }
    public string NguoiDungId { get; set; } = string.Empty;
    public NguoiDung? NguoiDung { get; set; }
    public string KhoaHocId { get; set; } = string.Empty;
    public KhoaHoc? KhoaHoc { get; set; }
}
