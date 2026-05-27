using LMS.Api.Models;
using LMS.Api.Security;
using Microsoft.EntityFrameworkCore;

namespace LMS.Api.Data;

public static class SeedData
{
    public static async Task SeedAsync(LmsDbContext db)
    {
        if (await db.Users.AnyAsync())
        {
            return;
        }

        var now = DateTime.UtcNow;
        var password = BCrypt.Net.BCrypt.HashPassword("123456");

        var admin = new User
        {
            Id = Cuid.New(),
            Email = "admin@gmail.com",
            Name = "Quản trị viên",
            Password = password,
            Role = "ADMIN",
            MemberTier = "DIAMOND",
            CreatedAt = now,
            UpdatedAt = now
        };

        var instructor = new User
        {
            Id = Cuid.New(),
            Email = "instructor@gmail.com",
            Name = "GV. Kim",
            Password = password,
            Role = "INSTRUCTOR",
            MemberTier = "GOLD",
            Bio = "Giảng viên thiết kế sản phẩm và lập trình web.",
            CreatedAt = now,
            UpdatedAt = now
        };

        var student = new User
        {
            Id = Cuid.New(),
            Email = "student@gmail.com",
            Name = "Học viên Demo",
            Password = password,
            Role = "STUDENT",
            WalletBalance = 500000,
            MemberTier = "SILVER",
            CreatedAt = now,
            UpdatedAt = now
        };

        var course = new Course
        {
            Id = Cuid.New(),
            Title = "Lập trình React nâng cao",
            Slug = "lap-trinh-react-nang-cao",
            Description = "Khóa học thực hành giúp học viên xây dựng giao diện hiện đại, quản lý trạng thái và tối ưu trải nghiệm người dùng.",
            Thumbnail = "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=1200&q=80",
            Price = 399000,
            AverageRating = 4.8,
            ReviewCount = 1,
            MinimumMemberTier = "BRONZE",
            TotalDurationSeconds = 2700,
            IsPublished = true,
            PublishedAt = now,
            InstructorId = instructor.Id,
            CreatedAt = now,
            UpdatedAt = now
        };

        var section = new Section
        {
            Id = Cuid.New(),
            Title = "Bắt đầu với kiến trúc React",
            Description = "Thiết lập nền tảng dự án và tư duy component.",
            Position = 1,
            CourseId = course.Id,
            CreatedAt = now,
            UpdatedAt = now
        };

        var lessons = new[]
        {
            new Lesson
            {
                Id = Cuid.New(),
                Title = "Tổ chức cấu trúc dự án",
                Content = "Các nguyên tắc chia thư mục, tách component và giữ code dễ mở rộng.",
                DurationSeconds = 900,
                Position = 1,
                IsPublished = true,
                IsPreview = true,
                CourseId = course.Id,
                SectionId = section.Id,
                CreatedAt = now,
                UpdatedAt = now
            },
            new Lesson
            {
                Id = Cuid.New(),
                Title = "Quản lý trạng thái trong ứng dụng",
                Content = "Kết hợp state cục bộ, context và truy vấn dữ liệu để giao diện phản hồi mượt.",
                DurationSeconds = 1800,
                Position = 2,
                IsPublished = true,
                IsPreview = false,
                CourseId = course.Id,
                SectionId = section.Id,
                CreatedAt = now,
                UpdatedAt = now
            }
        };

        db.Users.AddRange(admin, instructor, student);
        db.Courses.Add(course);
        db.Sections.Add(section);
        db.Lessons.AddRange(lessons);
        db.CourseReviews.Add(new CourseReview
        {
            Id = Cuid.New(),
            Rating = 5,
            Comment = "Nội dung rõ ràng, dễ áp dụng vào dự án thật.",
            UserId = student.Id,
            CourseId = course.Id,
            CreatedAt = now,
            UpdatedAt = now
        });

        await db.SaveChangesAsync();
    }
}
