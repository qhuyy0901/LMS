namespace LMS.Api.Models;

public class Course
{
    public string Id { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public string Slug { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string? Thumbnail { get; set; }
    public int Price { get; set; }
    public double AverageRating { get; set; }
    public int ReviewCount { get; set; }
    public string MinimumMemberTier { get; set; } = "BRONZE";
    public int TotalDurationSeconds { get; set; }
    public bool IsPublished { get; set; }
    public DateTime? PublishedAt { get; set; }
    public string InstructorId { get; set; } = string.Empty;
    public User? Instructor { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }

    public ICollection<Section> Sections { get; set; } = [];
    public ICollection<Lesson> Lessons { get; set; } = [];
    public ICollection<Enrollment> Enrollments { get; set; } = [];
    public ICollection<Purchase> Purchases { get; set; } = [];
    public ICollection<WalletTransaction> WalletTransactions { get; set; } = [];
    public ICollection<CourseReview> Reviews { get; set; } = [];
    public ICollection<Certificate> Certificates { get; set; } = [];
    public ICollection<Coupon> Coupons { get; set; } = [];
}
