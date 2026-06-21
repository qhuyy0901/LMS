namespace LMS.Api.Domain.Entities;

public class NguoiNhanMaGiamGia
{
    public string Id { get; set; } = string.Empty;
    public string MaGiamGiaId { get; set; } = string.Empty;
    public MaGiamGia? MaGiamGia { get; set; }
    public string NguoiDungId { get; set; } = string.Empty;
    public NguoiDung? NguoiDung { get; set; }
    public string GiangVienId { get; set; } = string.Empty;
    public NguoiDung? GiangVien { get; set; }
    public string? SourceCourseId { get; set; }
    public KhoaHoc? SourceCourse { get; set; }
    public DateTime NgayTao { get; set; }
}
