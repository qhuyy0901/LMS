namespace LMS.Api.Domain.Entities;

public class BinhLuan
{
    public string Id { get; set; } = string.Empty;
    public string NoiDung { get; set; } = string.Empty;
    public string? BaiHocId { get; set; }
    public BaiHoc? BaiHoc { get; set; }
    public string? KhoaHocId { get; set; }
    public KhoaHoc? KhoaHoc { get; set; }
    public string NguoiDungId { get; set; } = string.Empty;
    public NguoiDung? NguoiDung { get; set; }
    public string? BinhLuanChaId { get; set; }
    public BinhLuan? BinhLuanCha { get; set; }
    public ICollection<BinhLuan> CacPhanHoi { get; set; } = [];
    public DateTime NgayTao { get; set; }
    public DateTime NgayCapNhat { get; set; }
}
