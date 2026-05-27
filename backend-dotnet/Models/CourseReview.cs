namespace LMS.Api.Models;

public class CourseReview
{
    public string Id { get; set; } = string.Empty;
    public int Rating { get; set; }
    public string? Comment { get; set; }
    public string UserId { get; set; } = string.Empty;
    public User? User { get; set; }
    public string CourseId { get; set; } = string.Empty;
    public Course? Course { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
}
