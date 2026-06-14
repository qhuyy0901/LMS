namespace LMS.Api.Models;

public class LichSuDungMaGiamGia
{
    public string Id { get; set; } = string.Empty;
    public string CouponId { get; set; } = string.Empty;
    public MaGiamGia? Coupon { get; set; }
    public string UserId { get; set; } = string.Empty;
    public NguoiDung? User { get; set; }
    public string CourseId { get; set; } = string.Empty;
    public KhoaHoc? Course { get; set; }
    public string PurchaseId { get; set; } = string.Empty;
    public GiaoDichMua? Purchase { get; set; }
    public DateTime CreatedAt { get; set; }
}
