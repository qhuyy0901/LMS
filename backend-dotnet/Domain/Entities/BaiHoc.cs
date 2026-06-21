namespace LMS.Api.Domain.Entities;

public class BaiHoc
{
    public string Id { get; set; } = string.Empty;
    public string TieuDe { get; set; } = string.Empty;
    public string? NoiDung { get; set; }
    public string? VideoUrl { get; set; }
    public string? IllustrationUrl { get; set; }
    public string? FileUrl { get; set; }
    public int? ThoiLuongGiay { get; set; }
    public int ThuTu { get; set; }
    public bool DaXuatBan { get; set; }
    public string TrangThai { get; set; } = "DRAFT";
    public bool ChoXemTruoc { get; set; }
    public string KhoaHocId { get; set; } = string.Empty;
    public KhoaHoc? KhoaHoc { get; set; }
    public string ChuongHocId { get; set; } = string.Empty;
    public ChuongHoc? ChuongHoc { get; set; }
    public DateTime NgayTao { get; set; }
    public DateTime NgayCapNhat { get; set; }

    public ICollection<TienDoBaiHoc> CacTienDoBaiHoc { get; set; } = [];
    public ICollection<BinhLuan> CacBinhLuan { get; set; } = [];
    public ICollection<BaiTap> CacBaiTap { get; set; } = [];
    public BaiKiemTra? BaiKiemTra { get; set; }
}
