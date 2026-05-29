namespace LMS.Api.Models;

public class BaiTap
{
    public string Id { get; set; } = string.Empty;
    public string CourseId { get; set; } = string.Empty;
    public KhoaHoc? Course { get; set; }
    public string? LessonId { get; set; }
    public BaiHoc? Lesson { get; set; }
    public string TeacherId { get; set; } = string.Empty;
    public NguoiDung? Teacher { get; set; }
    public string Title { get; set; } = string.Empty;
    public string? Description { get; set; }
    public DateTime? DueDate { get; set; }
    public int MaxScore { get; set; } = 100;
    public string? AttachmentUrl { get; set; }
    public bool AllowTextSubmission { get; set; } = true;
    public bool AllowFileSubmission { get; set; } = true;
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
}
