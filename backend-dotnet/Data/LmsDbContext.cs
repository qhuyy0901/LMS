using LMS.Api.Models;
using Microsoft.EntityFrameworkCore;

namespace LMS.Api.Data;

public class LmsDbContext(DbContextOptions<LmsDbContext> options) : DbContext(options)
{
    public DbSet<NguoiDung> Users => Set<NguoiDung>();
    public DbSet<KhoaHoc> Courses => Set<KhoaHoc>();
    public DbSet<ChuongHoc> Sections => Set<ChuongHoc>();
    public DbSet<BaiHoc> Lessons => Set<BaiHoc>();
    public DbSet<GhiDanh> Enrollments => Set<GhiDanh>();
    public DbSet<ChungChi> Certificates => Set<ChungChi>();
    public DbSet<GiaoDichMua> Purchases => Set<GiaoDichMua>();
    public DbSet<GiaoDichVi> WalletTransactions => Set<GiaoDichVi>();
    public DbSet<ThanhToanNgoai> ExternalPayments => Set<ThanhToanNgoai>();
    public DbSet<ThongBao> Notifications => Set<ThongBao>();
    public DbSet<DanhGiaKhoaHoc> CourseReviews => Set<DanhGiaKhoaHoc>();
    public DbSet<TienDoBaiHoc> LessonProgresses => Set<TienDoBaiHoc>();
    public DbSet<BinhLuan> Comments => Set<BinhLuan>();
    public DbSet<BaiKiemTra> Quizzes => Set<BaiKiemTra>();
    public DbSet<CauHoiKiemTra> QuizQuestions => Set<CauHoiKiemTra>();
    public DbSet<NopBaiKiemTra> QuizSubmissions => Set<NopBaiKiemTra>();
    public DbSet<MaGiamGia> Coupons => Set<MaGiamGia>();
    public DbSet<NhatKyHeThong> AuditLogs => Set<NhatKyHeThong>();
    public DbSet<BaiTap> Assignments => Set<BaiTap>();
    public DbSet<DoiThuongSuKien> EventRewardRedemptions => Set<DoiThuongSuKien>();
    public DbSet<SuKien> Events => Set<SuKien>();
    public DbSet<DangKySuKien> EventRegistrations => Set<DangKySuKien>();
    public DbSet<SuKienAnh> EventImages => Set<SuKienAnh>();
    public DbSet<RutTienGiangVien> InstructorWithdrawals => Set<RutTienGiangVien>();
    public DbSet<CuocTroChuyen> Conversations => Set<CuocTroChuyen>();
    public DbSet<NguoiThamGiaTroChuyen> ConversationParticipants => Set<NguoiThamGiaTroChuyen>();
    public DbSet<TinNhan> Messages => Set<TinNhan>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<NguoiDung>(entity =>
        {
            entity.ToTable("User");
            entity.HasKey(item => item.Id);
            entity.HasIndex(item => item.Email).IsUnique();
            entity.Property(item => item.Role).HasDefaultValue("STUDENT");
            entity.Property(item => item.MemberTier).HasDefaultValue("BRONZE");
            entity.Property(item => item.WalletBalance).HasDefaultValue(0);
            entity.Property(item => item.TotalSpent).HasDefaultValue(0);
            entity.Property(item => item.RewardPoints).HasDefaultValue(0);
            entity.Property(item => item.LoginStreak).HasDefaultValue(0);
            entity.Property(item => item.LastPurchaseRewardWeek).HasMaxLength(10);
        });

        modelBuilder.Entity<DoiThuongSuKien>(entity =>
        {
            entity.ToTable("EventRewardRedemption");
            entity.HasKey(item => item.Id);
            entity.HasIndex(item => new { item.UserId, item.RewardId }).IsUnique();
            entity.HasOne(item => item.User)
                .WithMany(item => item.EventRewardRedemptions)
                .HasForeignKey(item => item.UserId)
                .OnDelete(DeleteBehavior.NoAction);
        });

        modelBuilder.Entity<SuKien>(entity =>
        {
            entity.ToTable("Event");
            entity.HasKey(item => item.Id);
            entity.HasIndex(item => new { item.Status, item.StartAt });
            entity.HasIndex(item => item.InstructorId);
            entity.Property(item => item.Type).HasDefaultValue("WORKSHOP");
            entity.Property(item => item.Format).HasDefaultValue("OFFLINE");
            entity.Property(item => item.Status).HasDefaultValue("DRAFT");
            entity.Property(item => item.Capacity).HasDefaultValue(50);
            entity.HasOne(item => item.Instructor)
                .WithMany(item => item.OrganizedEvents)
                .HasForeignKey(item => item.InstructorId)
                .OnDelete(DeleteBehavior.NoAction);
        });

        modelBuilder.Entity<DangKySuKien>(entity =>
        {
            entity.ToTable("EventRegistration");
            entity.HasKey(item => item.Id);
            entity.HasIndex(item => new { item.EventId, item.UserId }).IsUnique();
            entity.HasIndex(item => new { item.UserId, item.RegisteredAt });
            entity.Property(item => item.Status).HasDefaultValue("REGISTERED");
            entity.HasOne(item => item.Event)
                .WithMany(item => item.Registrations)
                .HasForeignKey(item => item.EventId)
                .OnDelete(DeleteBehavior.NoAction);
            entity.HasOne(item => item.User)
                .WithMany(item => item.EventRegistrations)
                .HasForeignKey(item => item.UserId)
                .OnDelete(DeleteBehavior.NoAction);
        });

        modelBuilder.Entity<SuKienAnh>(entity =>
        {
            entity.ToTable("EventImage");
            entity.HasKey(item => item.Id);
            entity.HasIndex(item => item.SuKienId);
            entity.HasOne(item => item.SuKien)
                .WithMany(item => item.Images)
                .HasForeignKey(item => item.SuKienId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<RutTienGiangVien>(entity =>
        {
            entity.ToTable("InstructorWithdrawal");
            entity.HasKey(item => item.Id);
            entity.HasIndex(item => new { item.InstructorId, item.CreatedAt });
            entity.Property(item => item.Status).HasDefaultValue("COMPLETED");
            entity.Property(item => item.BankName).HasMaxLength(150);
            entity.Property(item => item.AccountNumber).HasMaxLength(50);
            entity.Property(item => item.AccountHolder).HasMaxLength(150);
            entity.Property(item => item.Note).HasMaxLength(500);
            entity.HasOne(item => item.Instructor)
                .WithMany(item => item.InstructorWithdrawals)
                .HasForeignKey(item => item.InstructorId)
                .OnDelete(DeleteBehavior.NoAction);
        });

        modelBuilder.Entity<KhoaHoc>(entity =>
        {
            entity.ToTable("Course");
            entity.HasKey(item => item.Id);
            entity.HasIndex(item => item.Slug).IsUnique();
            entity.HasOne(item => item.Instructor)
                .WithMany(item => item.Courses)
                .HasForeignKey(item => item.InstructorId)
                .OnDelete(DeleteBehavior.NoAction);
            entity.Property(item => item.MinimumMemberTier).HasDefaultValue("BRONZE");
            entity.Property(item => item.Category).HasDefaultValue("Lập trình");
            entity.Property(item => item.Level).HasDefaultValue("BEGINNER");
            entity.Property(item => item.Status).HasDefaultValue("DRAFT");
        });

        modelBuilder.Entity<ChuongHoc>(entity =>
        {
            entity.ToTable("Section");
            entity.HasKey(item => item.Id);
            entity.HasOne(item => item.Course)
                .WithMany(item => item.Sections)
                .HasForeignKey(item => item.CourseId)
                .OnDelete(DeleteBehavior.NoAction);
        });

        modelBuilder.Entity<BaiHoc>(entity =>
        {
            entity.ToTable("Lesson");
            entity.HasKey(item => item.Id);
            entity.HasOne(item => item.Course)
                .WithMany(item => item.Lessons)
                .HasForeignKey(item => item.CourseId)
                .OnDelete(DeleteBehavior.NoAction);
            entity.HasOne(item => item.Section)
                .WithMany(item => item.Lessons)
                .HasForeignKey(item => item.SectionId)
                .OnDelete(DeleteBehavior.NoAction);
            entity.Property(item => item.Status).HasDefaultValue("DRAFT");
        });

        modelBuilder.Entity<BaiTap>(entity =>
        {
            entity.ToTable("Assignment");
            entity.HasKey(item => item.Id);
            entity.HasIndex(item => item.CourseId);
            entity.HasIndex(item => item.LessonId);
            entity.HasIndex(item => item.TeacherId);
            entity.Property(item => item.MaxScore).HasDefaultValue(100);
            entity.Property(item => item.AllowTextSubmission).HasDefaultValue(true);
            entity.Property(item => item.AllowFileSubmission).HasDefaultValue(true);
            entity.HasOne(item => item.Course)
                .WithMany(item => item.Assignments)
                .HasForeignKey(item => item.CourseId)
                .OnDelete(DeleteBehavior.NoAction);
            entity.HasOne(item => item.Lesson)
                .WithMany(item => item.Assignments)
                .HasForeignKey(item => item.LessonId)
                .OnDelete(DeleteBehavior.NoAction);
            entity.HasOne(item => item.Teacher)
                .WithMany()
                .HasForeignKey(item => item.TeacherId)
                .OnDelete(DeleteBehavior.NoAction);
        });

        modelBuilder.Entity<GhiDanh>(entity =>
        {
            entity.ToTable("Enrollment");
            entity.HasKey(item => item.Id);
            entity.HasIndex(item => new { item.UserId, item.CourseId }).IsUnique();
            entity.HasOne(item => item.User)
                .WithMany(item => item.Enrollments)
                .HasForeignKey(item => item.UserId)
                .OnDelete(DeleteBehavior.NoAction);
            entity.HasOne(item => item.Course)
                .WithMany(item => item.Enrollments)
                .HasForeignKey(item => item.CourseId)
                .OnDelete(DeleteBehavior.NoAction);
        });

        modelBuilder.Entity<ChungChi>(entity =>
        {
            entity.ToTable("Certificate");
            entity.HasKey(item => item.Id);
            entity.HasIndex(item => new { item.UserId, item.CourseId }).IsUnique();
            entity.HasOne(item => item.User)
                .WithMany(item => item.Certificates)
                .HasForeignKey(item => item.UserId)
                .OnDelete(DeleteBehavior.NoAction);
            entity.HasOne(item => item.Course)
                .WithMany(item => item.Certificates)
                .HasForeignKey(item => item.CourseId)
                .OnDelete(DeleteBehavior.NoAction);
        });

        modelBuilder.Entity<DanhGiaKhoaHoc>(entity =>
        {
            entity.ToTable("CourseReview");
            entity.HasKey(item => item.Id);
            entity.HasIndex(item => new { item.UserId, item.CourseId }).IsUnique();
            entity.HasIndex(item => new { item.CourseId, item.CreatedAt });
            entity.HasIndex(item => new { item.UserId, item.CreatedAt });
            entity.HasOne(item => item.User)
                .WithMany(item => item.CourseReviews)
                .HasForeignKey(item => item.UserId)
                .OnDelete(DeleteBehavior.NoAction);
            entity.HasOne(item => item.Course)
                .WithMany(item => item.Reviews)
                .HasForeignKey(item => item.CourseId)
                .OnDelete(DeleteBehavior.NoAction);
        });

        modelBuilder.Entity<TienDoBaiHoc>(entity =>
        {
            entity.ToTable("LessonProgress");
            entity.HasKey(item => item.Id);
            entity.HasIndex(item => new { item.UserId, item.LessonId }).IsUnique();
            entity.HasIndex(item => item.UserId);
            entity.HasIndex(item => item.LessonId);
            entity.HasIndex(item => new { item.UserId, item.IsCompleted });
            entity.HasOne(item => item.User)
                .WithMany(item => item.LessonProgresses)
                .HasForeignKey(item => item.UserId)
                .OnDelete(DeleteBehavior.NoAction);
            entity.HasOne(item => item.Lesson)
                .WithMany(item => item.Progresses)
                .HasForeignKey(item => item.LessonId)
                .OnDelete(DeleteBehavior.NoAction);
        });

        modelBuilder.Entity<BinhLuan>(entity =>
        {
            entity.ToTable("Comment");
            entity.HasKey(item => item.Id);
            entity.HasIndex(item => item.LessonId);
            entity.HasIndex(item => item.UserId);
            entity.HasOne(item => item.User)
                .WithMany(item => item.Comments)
                .HasForeignKey(item => item.UserId)
                .OnDelete(DeleteBehavior.NoAction);
            entity.HasOne(item => item.Lesson)
                .WithMany(item => item.Comments)
                .HasForeignKey(item => item.LessonId)
                .OnDelete(DeleteBehavior.NoAction);
            entity.HasOne(item => item.Parent)
                .WithMany(item => item.Replies)
                .HasForeignKey(item => item.ParentId)
                .OnDelete(DeleteBehavior.NoAction);
        });

        modelBuilder.Entity<BaiKiemTra>(entity =>
        {
            entity.ToTable("Quiz");
            entity.HasKey(item => item.Id);
            entity.HasIndex(item => item.LessonId).IsUnique();
            entity.Property(item => item.PassingScore).HasDefaultValue(80);
            entity.HasOne(item => item.Lesson)
                .WithOne(item => item.Quiz)
                .HasForeignKey<BaiKiemTra>(item => item.LessonId)
                .OnDelete(DeleteBehavior.NoAction);
        });

        modelBuilder.Entity<CauHoiKiemTra>(entity =>
        {
            entity.ToTable("QuizQuestion");
            entity.HasKey(item => item.Id);
            entity.HasIndex(item => item.QuizId);
            entity.Property(item => item.Options).HasMaxLength(4000);
            entity.HasOne(item => item.Quiz)
                .WithMany(item => item.Questions)
                .HasForeignKey(item => item.QuizId)
                .OnDelete(DeleteBehavior.NoAction);
        });

        modelBuilder.Entity<NopBaiKiemTra>(entity =>
        {
            entity.ToTable("QuizSubmission");
            entity.HasKey(item => item.Id);
            entity.HasIndex(item => item.UserId);
            entity.HasIndex(item => item.QuizId);
            entity.Property(item => item.Answers).HasMaxLength(4000);
            entity.HasOne(item => item.User)
                .WithMany(item => item.QuizSubmissions)
                .HasForeignKey(item => item.UserId)
                .OnDelete(DeleteBehavior.NoAction);
            entity.HasOne(item => item.Quiz)
                .WithMany(item => item.Submissions)
                .HasForeignKey(item => item.QuizId)
                .OnDelete(DeleteBehavior.NoAction);
        });

        modelBuilder.Entity<MaGiamGia>(entity =>
        {
            entity.ToTable("Coupon");
            entity.HasKey(item => item.Id);
            entity.HasIndex(item => item.Code).IsUnique();
            entity.HasIndex(item => item.CourseId);
            entity.Property(item => item.DiscountType).HasDefaultValue("PERCENTAGE");
            entity.Property(item => item.MinPurchaseAmount).HasDefaultValue(0);
            entity.Property(item => item.IsActive).HasDefaultValue(true);
            entity.Property(item => item.UsageCount).HasDefaultValue(0);
            entity.HasOne(item => item.Course)
                .WithMany(item => item.Coupons)
                .HasForeignKey(item => item.CourseId)
                .OnDelete(DeleteBehavior.NoAction);
        });

        modelBuilder.Entity<NhatKyHeThong>(entity =>
        {
            entity.ToTable("AuditLog");
            entity.HasKey(item => item.Id);
            entity.HasIndex(item => new { item.ActorId, item.CreatedAt });
            entity.HasIndex(item => new { item.EntityType, item.EntityId });
            entity.HasIndex(item => new { item.Action, item.CreatedAt });
            entity.Property(item => item.Metadata).HasMaxLength(4000);
        });

        modelBuilder.Entity<GiaoDichMua>(entity =>
        {
            entity.ToTable("Purchase");
            entity.HasKey(item => item.Id);
            entity.HasIndex(item => new { item.UserId, item.CourseId }).IsUnique();
            entity.HasIndex(item => new { item.CourseId, item.CreatedAt });
            entity.HasIndex(item => new { item.UserId, item.CreatedAt });
            entity.Property(item => item.Currency).HasDefaultValue("VND");
            entity.Property(item => item.Status).HasDefaultValue("COMPLETED");
            entity.Property(item => item.DiscountAmount).HasDefaultValue(0);
            entity.HasOne(item => item.User)
                .WithMany(item => item.Purchases)
                .HasForeignKey(item => item.UserId)
                .OnDelete(DeleteBehavior.NoAction);
            entity.HasOne(item => item.Course)
                .WithMany(item => item.Purchases)
                .HasForeignKey(item => item.CourseId)
                .OnDelete(DeleteBehavior.NoAction);
        });

        modelBuilder.Entity<GiaoDichVi>(entity =>
        {
            entity.ToTable("WalletTransaction");
            entity.HasKey(item => item.Id);
            entity.HasIndex(item => new { item.UserId, item.CreatedAt });
            entity.HasIndex(item => item.CourseId);
            entity.HasIndex(item => new { item.Type, item.CreatedAt });
            entity.Property(item => item.Status).HasDefaultValue("COMPLETED");
            entity.Property(item => item.Metadata).HasMaxLength(4000);
            entity.HasOne(item => item.User)
                .WithMany(item => item.WalletTransactions)
                .HasForeignKey(item => item.UserId)
                .OnDelete(DeleteBehavior.NoAction);
            entity.HasOne(item => item.Course)
                .WithMany(item => item.WalletTransactions)
                .HasForeignKey(item => item.CourseId)
                .OnDelete(DeleteBehavior.NoAction);
            entity.HasOne(item => item.Purchase)
                .WithMany(item => item.WalletTransactions)
                .HasForeignKey(item => item.PurchaseId)
                .OnDelete(DeleteBehavior.NoAction);
            entity.HasOne(item => item.ExternalPayment)
                .WithMany(item => item.WalletTransactions)
                .HasForeignKey(item => item.ExternalPaymentId)
                .OnDelete(DeleteBehavior.NoAction);
        });

        modelBuilder.Entity<ThanhToanNgoai>(entity =>
        {
            entity.ToTable("ExternalPayment");
            entity.HasKey(item => item.Id);
            entity.HasIndex(item => item.ProviderSessionId).IsUnique();
            entity.HasIndex(item => new { item.UserId, item.CreatedAt });
            entity.HasIndex(item => new { item.Status, item.CreatedAt });
            entity.Property(item => item.Status).HasDefaultValue("PENDING");
            entity.Property(item => item.Currency).HasDefaultValue("VND");
            entity.HasOne(item => item.User)
                .WithMany(item => item.ExternalPayments)
                .HasForeignKey(item => item.UserId)
                .OnDelete(DeleteBehavior.NoAction);
        });

        modelBuilder.Entity<ThongBao>(entity =>
        {
            entity.ToTable("Notification");
            entity.HasKey(item => item.Id);
            entity.HasIndex(item => new { item.UserId, item.IsRead, item.CreatedAt });
            entity.Property(item => item.Metadata).HasMaxLength(4000);
            entity.HasOne(item => item.User)
                .WithMany(item => item.Notifications)
                .HasForeignKey(item => item.UserId)
                .OnDelete(DeleteBehavior.NoAction);
        });

        modelBuilder.Entity<CuocTroChuyen>(entity =>
        {
            entity.ToTable("Conversation");
            entity.HasKey(item => item.Id);
            entity.HasIndex(item => item.CourseId);
            entity.Property(item => item.Title).HasMaxLength(255);
            entity.Property(item => item.IsGroup).HasDefaultValue(false);
        });

        modelBuilder.Entity<NguoiThamGiaTroChuyen>(entity =>
        {
            entity.ToTable("ConversationParticipant");
            entity.HasKey(item => new { item.ConversationId, item.UserId });
            entity.HasOne(item => item.Conversation)
                .WithMany(item => item.Participants)
                .HasForeignKey(item => item.ConversationId)
                .OnDelete(DeleteBehavior.Cascade);
            entity.HasOne(item => item.User)
                .WithMany(item => item.Conversations)
                .HasForeignKey(item => item.UserId)
                .OnDelete(DeleteBehavior.NoAction);
        });

        modelBuilder.Entity<TinNhan>(entity =>
        {
            entity.ToTable("Message");
            entity.HasKey(item => item.Id);
            entity.HasIndex(item => item.ConversationId);
            entity.HasIndex(item => item.SentAt);
            entity.HasOne(item => item.Conversation)
                .WithMany(item => item.Messages)
                .HasForeignKey(item => item.ConversationId)
                .OnDelete(DeleteBehavior.Cascade);
            entity.HasOne(item => item.Sender)
                .WithMany(item => item.SentMessages)
                .HasForeignKey(item => item.SenderId)
                .OnDelete(DeleteBehavior.NoAction);
        });
    }
}
