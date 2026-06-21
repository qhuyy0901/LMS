namespace LMS.Api.Domain.Entities;

public class DangKySuKien
{
    public string Id { get; set; } = string.Empty;
    public string SuKienId { get; set; } = string.Empty;
    public SuKien? Event { get; set; }
    public string NguoiDungId { get; set; } = string.Empty;
    public NguoiDung? NguoiDung { get; set; }
    public string TrangThai { get; set; } = "REGISTERED";
    public int DiemDaDung { get; set; }
    public DateTime NgayDangKy { get; set; }
    public DateTime NgayTao { get; set; }
    public DateTime NgayCapNhat { get; set; }
}
