namespace LMS.Api.Domain.Entities;

public class NhatKyHeThong
{
    public string Id { get; set; } = string.Empty;
    public string? NguoiThucHienId { get; set; }
    public string? EmailNguoiThucHien { get; set; }
    public string HanhDong { get; set; } = string.Empty;
    public string LoaiThucTe { get; set; } = string.Empty;
    public string? ThucTheId { get; set; }
    public string? Metadata { get; set; }
    public string? IpAddress { get; set; }
    public string? UserAgent { get; set; }
    public DateTime NgayTao { get; set; }
}
