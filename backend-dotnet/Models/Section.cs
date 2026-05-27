namespace LMS.Api.Models;

public class Section
{
    public string Id { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public string? Description { get; set; }
    public int Position { get; set; }
    public string CourseId { get; set; } = string.Empty;
    public Course? Course { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }

    public ICollection<Lesson> Lessons { get; set; } = [];
}
