using LMS.Api.Models;
using Microsoft.EntityFrameworkCore;

namespace LMS.Api.Data;

public class LmsDbContext(DbContextOptions<LmsDbContext> options) : DbContext(options)
{
    public DbSet<User> Users => Set<User>();
    public DbSet<Course> Courses => Set<Course>();
    public DbSet<Section> Sections => Set<Section>();
    public DbSet<Lesson> Lessons => Set<Lesson>();
    public DbSet<Enrollment> Enrollments => Set<Enrollment>();
    public DbSet<Certificate> Certificates => Set<Certificate>();
    public DbSet<Purchase> Purchases => Set<Purchase>();
    public DbSet<WalletTransaction> WalletTransactions => Set<WalletTransaction>();
    public DbSet<ExternalPayment> ExternalPayments => Set<ExternalPayment>();
    public DbSet<Notification> Notifications => Set<Notification>();
    public DbSet<CourseReview> CourseReviews => Set<CourseReview>();
    public DbSet<LessonProgress> LessonProgresses => Set<LessonProgress>();
    public DbSet<Comment> Comments => Set<Comment>();
    public DbSet<Quiz> Quizzes => Set<Quiz>();
    public DbSet<QuizQuestion> QuizQuestions => Set<QuizQuestion>();
    public DbSet<QuizSubmission> QuizSubmissions => Set<QuizSubmission>();
    public DbSet<Coupon> Coupons => Set<Coupon>();
    public DbSet<AuditLog> AuditLogs => Set<AuditLog>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<User>(entity =>
        {
            entity.ToTable("User");
            entity.HasKey(item => item.Id);
            entity.HasIndex(item => item.Email).IsUnique();
            entity.Property(item => item.Role).HasDefaultValue("STUDENT");
            entity.Property(item => item.MemberTier).HasDefaultValue("BRONZE");
            entity.Property(item => item.WalletBalance).HasDefaultValue(0);
            entity.Property(item => item.TotalSpent).HasDefaultValue(0);
        });

        modelBuilder.Entity<Course>(entity =>
        {
            entity.ToTable("Course");
            entity.HasKey(item => item.Id);
            entity.HasIndex(item => item.Slug).IsUnique();
            entity.HasOne(item => item.Instructor)
                .WithMany(item => item.Courses)
                .HasForeignKey(item => item.InstructorId)
                .OnDelete(DeleteBehavior.NoAction);
            entity.Property(item => item.MinimumMemberTier).HasDefaultValue("BRONZE");
        });

        modelBuilder.Entity<Section>(entity =>
        {
            entity.ToTable("Section");
            entity.HasKey(item => item.Id);
            entity.HasOne(item => item.Course)
                .WithMany(item => item.Sections)
                .HasForeignKey(item => item.CourseId)
                .OnDelete(DeleteBehavior.NoAction);
        });

        modelBuilder.Entity<Lesson>(entity =>
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
        });

        modelBuilder.Entity<Enrollment>(entity =>
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

        modelBuilder.Entity<Certificate>(entity =>
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

        modelBuilder.Entity<CourseReview>(entity =>
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

        modelBuilder.Entity<LessonProgress>(entity =>
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

        modelBuilder.Entity<Comment>(entity =>
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

        modelBuilder.Entity<Quiz>(entity =>
        {
            entity.ToTable("Quiz");
            entity.HasKey(item => item.Id);
            entity.HasIndex(item => item.LessonId).IsUnique();
            entity.Property(item => item.PassingScore).HasDefaultValue(80);
            entity.HasOne(item => item.Lesson)
                .WithOne(item => item.Quiz)
                .HasForeignKey<Quiz>(item => item.LessonId)
                .OnDelete(DeleteBehavior.NoAction);
        });

        modelBuilder.Entity<QuizQuestion>(entity =>
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

        modelBuilder.Entity<QuizSubmission>(entity =>
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

        modelBuilder.Entity<Coupon>(entity =>
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

        modelBuilder.Entity<AuditLog>(entity =>
        {
            entity.ToTable("AuditLog");
            entity.HasKey(item => item.Id);
            entity.HasIndex(item => new { item.ActorId, item.CreatedAt });
            entity.HasIndex(item => new { item.EntityType, item.EntityId });
            entity.HasIndex(item => new { item.Action, item.CreatedAt });
            entity.Property(item => item.Metadata).HasMaxLength(4000);
        });

        modelBuilder.Entity<Purchase>(entity =>
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

        modelBuilder.Entity<WalletTransaction>(entity =>
        {
            entity.ToTable("WalletTransaction");
            entity.HasKey(item => item.Id);
            entity.HasIndex(item => new { item.UserId, item.CreatedAt });
            entity.HasIndex(item => item.CourseId);
            entity.HasIndex(item => new { item.Type, item.CreatedAt });
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

        modelBuilder.Entity<ExternalPayment>(entity =>
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

        modelBuilder.Entity<Notification>(entity =>
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
    }
}
