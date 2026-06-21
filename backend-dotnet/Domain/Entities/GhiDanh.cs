namespace LMS.Api.Domain.Entities;

public class GhiDanh
{
    public string Id { get; set; } = string.Empty;
    public double TienDo { get; set; }
    public DateTime? NgayHoanThanh { get; set; }
    public string NguoiDungId { get; set; } = string.Empty;
    public NguoiDung? NguoiDung { get; set; }
    public string KhoaHocId { get; set; } = string.Empty;
    public KhoaHoc? KhoaHoc { get; set; }
    public DateTime NgayTao { get; set; }
    public DateTime NgayCapNhat { get; set; }
}
