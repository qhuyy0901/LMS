namespace LMS.Api.Models;

public class Comment
{
    public string Id { get; set; } = string.Empty;
    public string Content { get; set; } = string.Empty;
    public string LessonId { get; set; } = string.Empty;
    public Lesson? Lesson { get; set; }
    public string UserId { get; set; } = string.Empty;
    public User? User { get; set; }
    public string? ParentId { get; set; }
    public Comment? Parent { get; set; }
    public ICollection<Comment> Replies { get; set; } = [];
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
}
