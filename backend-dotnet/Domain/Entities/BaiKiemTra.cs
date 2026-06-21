namespace LMS.Api.Domain.Entities;

public class BaiKiemTra
{
    public string Id { get; set; } = string.Empty;
    public string TieuDe { get; set; } = string.Empty;
    public string? MoTa { get; set; }
    public int DiemDat { get; set; } = 80;
    public string BaiHocId { get; set; } = string.Empty;
    public BaiHoc? BaiHoc { get; set; }
    public DateTime NgayTao { get; set; }
    public DateTime NgayCapNhat { get; set; }

    public ICollection<CauHoiKiemTra> CacCauHoi { get; set; } = [];
    public ICollection<BaiNopKiemTra> CacBaiNop { get; set; } = [];
}
