namespace LMS.Api.Models;

public class WalletTransaction
{
    public string Id { get; set; } = string.Empty;
    public string Type { get; set; } = string.Empty;
    public int Amount { get; set; }
    public int BalanceAfter { get; set; }
    public string? Note { get; set; }
    public string? Metadata { get; set; }
    public string UserId { get; set; } = string.Empty;
    public User? User { get; set; }
    public string? CourseId { get; set; }
    public Course? Course { get; set; }
    public string? PurchaseId { get; set; }
    public Purchase? Purchase { get; set; }
    public string? ExternalPaymentId { get; set; }
    public ExternalPayment? ExternalPayment { get; set; }
    public DateTime CreatedAt { get; set; }
}
