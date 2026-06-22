namespace LMS.Api.Domain.Entities;

public class KhoaHocAnh
{
    public string Id { get; set; } = string.Empty;
    public string KhoaHocId { get; set; } = string.Empty;
    public KhoaHoc? KhoaHoc { get; set; }
    public string AnhUrl { get; set; } = string.Empty;
    public bool AnhChinh { get; set; }
    public DateTime NgayTao { get; set; }
}
