namespace LMS.Api.Domain.Entities;

public class CauHoiKiemTra
{
    public string Id { get; set; } = string.Empty;
    public string QuestionText { get; set; } = string.Empty;
    public string Options { get; set; } = "[]";
    public int CorrectOptionIndex { get; set; }
    public string? Explanation { get; set; }
    public int Position { get; set; }
    public string QuizId { get; set; } = string.Empty;
    public BaiKiemTra? Quiz { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
}
