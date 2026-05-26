namespace LMS.Api.Models;

public class Enrollment
{
    public string Id { get; set; } = string.Empty;
    public double Progress { get; set; }
    public DateTime? CompletedAt { get; set; }
    public string UserId { get; set; } = string.Empty;
    public User? User { get; set; }
    public string CourseId { get; set; } = string.Empty;
    public Course? Course { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
}
