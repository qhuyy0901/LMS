namespace LMS.Api.Domain.Entities;

public class CauHoiKiemTra
{
    public string Id { get; set; } = string.Empty;
    public string NoiDungCauHoi { get; set; } = string.Empty;
    public string CacLuaChon { get; set; } = "[]";
    public int DapAnDungIndex { get; set; }
    public string? GiaiThich { get; set; }
    public int ThuTu { get; set; }
    public string BaiKiemTraId { get; set; } = string.Empty;
    public BaiKiemTra? BaiKiemTra { get; set; }
    public DateTime NgayTao { get; set; }
    public DateTime NgayCapNhat { get; set; }
}
