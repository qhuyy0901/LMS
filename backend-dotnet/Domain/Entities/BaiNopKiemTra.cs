namespace LMS.Api.Domain.Entities;

public class BaiNopKiemTra
{
    public string Id { get; set; } = string.Empty;
    public double Diem { get; set; }
    public bool Dat { get; set; }
    public string DapAn { get; set; } = "{}";
    public string NguoiDungId { get; set; } = string.Empty;
    public NguoiDung? NguoiDung { get; set; }
    public string BaiKiemTraId { get; set; } = string.Empty;
    public BaiKiemTra? BaiKiemTra { get; set; }
    public DateTime NgayTao { get; set; }
}
