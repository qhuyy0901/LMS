namespace LMS.Api.Models;

public class GhiDanh
{
    public string Id { get; set; } = string.Empty;
    public double Progress { get; set; }
    public DateTime? CompletedAt { get; set; }
    public string UserId { get; set; } = string.Empty;
    public NguoiDung? User { get; set; }
    public string CourseId { get; set; } = string.Empty;
    public KhoaHoc? Course { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
}
