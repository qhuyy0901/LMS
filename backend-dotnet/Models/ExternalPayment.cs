namespace LMS.Api.Models;

public class ExternalPayment
{
    public string Id { get; set; } = string.Empty;
    public string Provider { get; set; } = string.Empty;
    public string Status { get; set; } = "PENDING";
    public int Amount { get; set; }
    public string Currency { get; set; } = "VND";
    public string? Note { get; set; }
    public string ProviderSessionId { get; set; } = string.Empty;
    public string? ProviderPaymentIntentId { get; set; }
    public DateTime? CompletedAt { get; set; }
    public string UserId { get; set; } = string.Empty;
    public User? User { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }

    public ICollection<WalletTransaction> WalletTransactions { get; set; } = [];
}
