namespace LMS.Api.Models;

public class Purchase
{
    public string Id { get; set; } = string.Empty;
    public int OriginalAmount { get; set; }
    public int DiscountAmount { get; set; }
    public int FinalAmount { get; set; }
    public string Currency { get; set; } = "VND";
    public string Status { get; set; } = "COMPLETED";
    public string UserId { get; set; } = string.Empty;
    public User? User { get; set; }
    public string CourseId { get; set; } = string.Empty;
    public Course? Course { get; set; }
    public string? CouponId { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }

    public ICollection<WalletTransaction> WalletTransactions { get; set; } = [];
}
