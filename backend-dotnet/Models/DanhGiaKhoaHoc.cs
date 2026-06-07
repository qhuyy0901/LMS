namespace LMS.Api.Models;

public class DanhGiaKhoaHoc
{
    public string Id { get; set; } = string.Empty;
    public int Rating { get; set; }
    public string? Comment { get; set; }
    public string UserId { get; set; } = string.Empty;
    public NguoiDung? User { get; set; }
    public string CourseId { get; set; } = string.Empty;
    public KhoaHoc? Course { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
}
