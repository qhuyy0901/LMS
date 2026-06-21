namespace LMS.Api.Domain.Entities;

public class MaGiamGia
{
    public string Id { get; set; } = string.Empty;
    public string Ma { get; set; } = string.Empty;
    public string DiscountType { get; set; } = "PERCENTAGE";
    public int DiscountValue { get; set; }
    public int MinPurchaseAmount { get; set; }
    public int? MaxDiscountAmount { get; set; }
    public DateTime? StartDate { get; set; }
    public DateTime? EndDate { get; set; }
    public bool HoatDong { get; set; } = true;
    public int? UsageLimit { get; set; }
    public int UsageCount { get; set; }
    public string? KhoaHocId { get; set; }
    public KhoaHoc? KhoaHoc { get; set; }
    public string? GiangVienId { get; set; }
    public NguoiDung? GiangVien { get; set; }
    public string TrangThai { get; set; } = "ACTIVE";
    public bool IsPrivate { get; set; }
    public DateTime NgayTao { get; set; }
    public DateTime NgayCapNhat { get; set; }

    public ICollection<NguoiNhanMaGiamGia> CacNguoiNhan { get; set; } = [];
    public ICollection<LichSuDungMaGiamGia> CacLuotSuDung { get; set; } = [];
}
