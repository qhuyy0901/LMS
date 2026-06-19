namespace LMS.Api.Domain.Entities;

public class TienDoBaiHoc
{
    public string Id { get; set; } = string.Empty;
    public bool IsCompleted { get; set; }
    public int WatchedSeconds { get; set; }
    public int LastPositionSeconds { get; set; }
    public double CompletionRate { get; set; }
    public DateTime? CompletedAt { get; set; }
    public string UserId { get; set; } = string.Empty;
    public NguoiDung? User { get; set; }
    public string LessonId { get; set; } = string.Empty;
    public BaiHoc? Lesson { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
}
