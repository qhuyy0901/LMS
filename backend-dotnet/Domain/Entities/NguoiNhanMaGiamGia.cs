namespace LMS.Api.Domain.Entities;

public class NguoiNhanMaGiamGia
{
    public string Id { get; set; } = string.Empty;
    public string CouponId { get; set; } = string.Empty;
    public MaGiamGia? Coupon { get; set; }
    public string UserId { get; set; } = string.Empty;
    public NguoiDung? User { get; set; }
    public string TeacherId { get; set; } = string.Empty;
    public NguoiDung? Teacher { get; set; }
    public string? SourceCourseId { get; set; }
    public KhoaHoc? SourceCourse { get; set; }
    public DateTime CreatedAt { get; set; }
}
