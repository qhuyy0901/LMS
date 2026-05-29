namespace LMS.Api.Models;

public class GiaoDichVi
{
    public string Id { get; set; } = string.Empty;
    public string Type { get; set; } = string.Empty;
    public int Amount { get; set; }
    public int BalanceAfter { get; set; }
    public string? Note { get; set; }
    public string? Metadata { get; set; }
    public string UserId { get; set; } = string.Empty;
    public NguoiDung? User { get; set; }
    public string? CourseId { get; set; }
    public KhoaHoc? Course { get; set; }
    public string? PurchaseId { get; set; }
    public GiaoDichMua? Purchase { get; set; }
    public string? ExternalPaymentId { get; set; }
    public ThanhToanNgoai? ExternalPayment { get; set; }
    public DateTime CreatedAt { get; set; }
}
