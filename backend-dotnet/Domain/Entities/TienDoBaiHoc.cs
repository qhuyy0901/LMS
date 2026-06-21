namespace LMS.Api.Domain.Entities;

public class TienDoBaiHoc
{
    public string Id { get; set; } = string.Empty;
    public bool DaHoanThanh { get; set; }
    public int GiayDaXem { get; set; }
    public int ViTriXemCuoiGiay { get; set; }
    public double TyLeHoanThanh { get; set; }
    public DateTime? NgayHoanThanh { get; set; }
    public string NguoiDungId { get; set; } = string.Empty;
    public NguoiDung? NguoiDung { get; set; }
    public string BaiHocId { get; set; } = string.Empty;
    public BaiHoc? BaiHoc { get; set; }
    public DateTime NgayTao { get; set; }
    public DateTime NgayCapNhat { get; set; }
}
