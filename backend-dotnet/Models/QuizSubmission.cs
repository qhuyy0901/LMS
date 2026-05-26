namespace LMS.Api.Models;

public class QuizSubmission
{
    public string Id { get; set; } = string.Empty;
    public double Score { get; set; }
    public bool Passed { get; set; }
    public string Answers { get; set; } = "{}";
    public string UserId { get; set; } = string.Empty;
    public User? User { get; set; }
    public string QuizId { get; set; } = string.Empty;
    public Quiz? Quiz { get; set; }
    public DateTime CreatedAt { get; set; }
}
