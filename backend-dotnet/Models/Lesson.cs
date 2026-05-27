namespace LMS.Api.Models;

public class Lesson
{
    public string Id { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public string? Content { get; set; }
    public string? VideoUrl { get; set; }
    public int? DurationSeconds { get; set; }
    public int Position { get; set; }
    public bool IsPublished { get; set; }
    public bool IsPreview { get; set; }
    public string CourseId { get; set; } = string.Empty;
    public Course? Course { get; set; }
    public string SectionId { get; set; } = string.Empty;
    public Section? Section { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }

    public ICollection<LessonProgress> Progresses { get; set; } = [];
    public ICollection<Comment> Comments { get; set; } = [];
    public Quiz? Quiz { get; set; }
}
