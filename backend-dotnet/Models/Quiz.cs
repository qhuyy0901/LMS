namespace LMS.Api.Models;

public class Quiz
{
    public string Id { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public string? Description { get; set; }
    public int PassingScore { get; set; } = 80;
    public string LessonId { get; set; } = string.Empty;
    public Lesson? Lesson { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }

    public ICollection<QuizQuestion> Questions { get; set; } = [];
    public ICollection<QuizSubmission> Submissions { get; set; } = [];
}
