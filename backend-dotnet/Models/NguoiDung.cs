using System.ComponentModel.DataAnnotations.Schema;

namespace LMS.Api.Models;

public class NguoiDung
{
    public string Id { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string Password { get; set; } = string.Empty;
    public string Role { get; set; } = "STUDENT";
    public string? Avatar { get; set; }
    public string? Phone { get; set; }
    public string? Bio { get; set; }
    public string? Settings { get; set; }
    public int WalletBalance { get; set; }
    public int TotalSpent { get; set; }
    public string MemberTier { get; set; } = "BRONZE";
    public int RewardPoints { get; set; }
    public int LoginStreak { get; set; }
    public DateTime? LastRewardLoginDate { get; set; }
    public DateTime? LastLessonRewardDate { get; set; }
    public string? LastPurchaseRewardWeek { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }

    [NotMapped]
    public string HoTen
    {
        get => Name;
        set => Name = value;
    }

    [NotMapped]
    public string VaiTro
    {
        get => Role;
        set => Role = value;
    }

    [NotMapped]
    public int SoDuVi
    {
        get => WalletBalance;
        set => WalletBalance = value;
    }

    public ICollection<KhoaHoc> Courses { get; set; } = [];
    public ICollection<GhiDanh> Enrollments { get; set; } = [];
    public ICollection<ChungChi> Certificates { get; set; } = [];
    public ICollection<GiaoDichMua> Purchases { get; set; } = [];
    public ICollection<GiaoDichVi> WalletTransactions { get; set; } = [];
    public ICollection<ThanhToanNgoai> ExternalPayments { get; set; } = [];
    public ICollection<ThongBao> Notifications { get; set; } = [];
    public ICollection<DanhGiaKhoaHoc> CourseReviews { get; set; } = [];
    public ICollection<TienDoBaiHoc> LessonProgresses { get; set; } = [];
    public ICollection<BinhLuan> Comments { get; set; } = [];
    public ICollection<NopBaiKiemTra> QuizSubmissions { get; set; } = [];
    public ICollection<DoiThuongSuKien> EventRewardRedemptions { get; set; } = [];
    public ICollection<SuKien> OrganizedEvents { get; set; } = [];
    public ICollection<DangKySuKien> EventRegistrations { get; set; } = [];
}
