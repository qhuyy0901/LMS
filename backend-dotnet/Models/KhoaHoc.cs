namespace LMS.Api.Models;

public class KhoaHoc
{
    public string Id { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public string Slug { get; set; } = string.Empty;
    public string? ShortDescription { get; set; }
    public string? Description { get; set; }
    public string? DetailedDescription { get; set; }
    public string? Thumbnail { get; set; }
    public string Category { get; set; } = "Lập trình";
    public string Level { get; set; } = "BEGINNER";
    public int Price { get; set; }
    public double AverageRating { get; set; }
    public int ReviewCount { get; set; }
    public string MinimumMemberTier { get; set; } = "BRONZE";
    public int TotalDurationSeconds { get; set; }
    public bool IsPublished { get; set; }
    public string Status { get; set; } = "DRAFT";
    public DateTime? PublishedAt { get; set; }
    public DateTime? StartDate { get; set; }
    public DateTime? EndDate { get; set; }
    public string InstructorId { get; set; } = string.Empty;
    public NguoiDung? Instructor { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }

    public ICollection<ChuongHoc> Sections { get; set; } = [];
    public ICollection<BaiHoc> Lessons { get; set; } = [];
    public ICollection<GhiDanh> Enrollments { get; set; } = [];
    public ICollection<GiaoDichMua> Purchases { get; set; } = [];
    public ICollection<GiaoDichVi> WalletTransactions { get; set; } = [];
    public ICollection<DanhGiaKhoaHoc> Reviews { get; set; } = [];
    public ICollection<ChungChi> Certificates { get; set; } = [];
    public ICollection<MaGiamGia> Coupons { get; set; } = [];
    public ICollection<BaiTap> Assignments { get; set; } = [];
}
