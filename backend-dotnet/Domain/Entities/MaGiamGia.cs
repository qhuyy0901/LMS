namespace LMS.Api.Domain.Entities;

public class MaGiamGia
{
    public string Id { get; set; } = string.Empty;
    public string Code { get; set; } = string.Empty;
    public string DiscountType { get; set; } = "PERCENTAGE";
    public int DiscountValue { get; set; }
    public int MinPurchaseAmount { get; set; }
    public int? MaxDiscountAmount { get; set; }
    public DateTime? StartDate { get; set; }
    public DateTime? EndDate { get; set; }
    public bool IsActive { get; set; } = true;
    public int? UsageLimit { get; set; }
    public int UsageCount { get; set; }
    public string? CourseId { get; set; }
    public KhoaHoc? Course { get; set; }
    public string? TeacherId { get; set; }
    public NguoiDung? Teacher { get; set; }
    public string Status { get; set; } = "ACTIVE";
    public bool IsPrivate { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }

    public ICollection<NguoiNhanMaGiamGia> Recipients { get; set; } = [];
    public ICollection<LichSuDungMaGiamGia> Usages { get; set; } = [];
}
