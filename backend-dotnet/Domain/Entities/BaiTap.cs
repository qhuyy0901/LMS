namespace LMS.Api.Domain.Entities;

public class BaiTap
{
    public string Id { get; set; } = string.Empty;
    public string KhoaHocId { get; set; } = string.Empty;
    public KhoaHoc? KhoaHoc { get; set; }
    public string? BaiHocId { get; set; }
    public BaiHoc? BaiHoc { get; set; }
    public string GiangVienId { get; set; } = string.Empty;
    public NguoiDung? GiangVien { get; set; }
    public string TieuDe { get; set; } = string.Empty;
    public string? MoTa { get; set; }
    public DateTime? HanNop { get; set; }
    public int DiemToiDa { get; set; } = 100;
    public string? FileDinhKemUrl { get; set; }
    public bool ChoPhepNopText { get; set; } = true;
    public bool ChoPhepNopFile { get; set; } = true;
    public DateTime NgayTao { get; set; }
    public DateTime NgayCapNhat { get; set; }
}
