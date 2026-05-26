namespace LMS.Api.Models;

public class User
{
    public string Id { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string Password { get; set; } = string.Empty;
    public string Role { get; set; } = "STUDENT";
    public string? Avatar { get; set; }
    public string? Phone { get; set; }
    public string? Bio { get; set; }
    public string? Settings { get; set; }
    public int WalletBalance { get; set; }
    public int TotalSpent { get; set; }
    public string MemberTier { get; set; } = "BRONZE";
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }

    public ICollection<Course> Courses { get; set; } = [];
    public ICollection<Enrollment> Enrollments { get; set; } = [];
    public ICollection<Certificate> Certificates { get; set; } = [];
    public ICollection<Purchase> Purchases { get; set; } = [];
    public ICollection<WalletTransaction> WalletTransactions { get; set; } = [];
    public ICollection<ExternalPayment> ExternalPayments { get; set; } = [];
    public ICollection<Notification> Notifications { get; set; } = [];
    public ICollection<CourseReview> CourseReviews { get; set; } = [];
    public ICollection<LessonProgress> LessonProgresses { get; set; } = [];
    public ICollection<Comment> Comments { get; set; } = [];
    public ICollection<QuizSubmission> QuizSubmissions { get; set; } = [];
}
