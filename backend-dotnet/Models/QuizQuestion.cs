namespace LMS.Api.Models;

public class QuizQuestion
{
    public string Id { get; set; } = string.Empty;
    public string QuestionText { get; set; } = string.Empty;
    public string Options { get; set; } = "[]";
    public int CorrectOptionIndex { get; set; }
    public string? Explanation { get; set; }
    public int Position { get; set; }
    public string QuizId { get; set; } = string.Empty;
    public Quiz? Quiz { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
}
