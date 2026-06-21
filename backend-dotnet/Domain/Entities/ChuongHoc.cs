namespace LMS.Api.Domain.Entities;

public class ChuongHoc
{
    public string Id { get; set; } = string.Empty;
    public string TieuDe { get; set; } = string.Empty;
    public string? MoTa { get; set; }
    public int ThuTu { get; set; }
    public string KhoaHocId { get; set; } = string.Empty;
    public KhoaHoc? KhoaHoc { get; set; }
    public DateTime NgayTao { get; set; }
    public DateTime NgayCapNhat { get; set; }

    public ICollection<BaiHoc> CacBaiHoc { get; set; } = [];
}
