namespace LMS.Api.Models;

public class GiaoDichMua
{
    public string Id { get; set; } = string.Empty;
    public int OriginalAmount { get; set; }
    public int DiscountAmount { get; set; }
    public int FinalAmount { get; set; }
    public string Currency { get; set; } = "VND";
    public string Status { get; set; } = "COMPLETED";
    public string UserId { get; set; } = string.Empty;
    public NguoiDung? User { get; set; }
    public string CourseId { get; set; } = string.Empty;
    public KhoaHoc? Course { get; set; }
    public string? CouponId { get; set; }
    public MaGiamGia? Coupon { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }

    public ICollection<GiaoDichVi> WalletTransactions { get; set; } = [];
}
