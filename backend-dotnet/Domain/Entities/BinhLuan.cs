namespace LMS.Api.Domain.Entities;

public class BinhLuan
{
    public string Id { get; set; } = string.Empty;
    public string Content { get; set; } = string.Empty;
    public string LessonId { get; set; } = string.Empty;
    public BaiHoc? Lesson { get; set; }
    public string UserId { get; set; } = string.Empty;
    public NguoiDung? User { get; set; }
    public string? ParentId { get; set; }
    public BinhLuan? Parent { get; set; }
    public ICollection<BinhLuan> Replies { get; set; } = [];
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
}
