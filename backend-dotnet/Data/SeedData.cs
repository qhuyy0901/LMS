using LMS.Api.Models;
using LMS.Api.Services;
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

        var admin = new NguoiDung
        {
            Id = TaoId.Moi(),
            Email = "admin@gmail.com",
            Name = "Quản trị viên",
            Password = password,
            Role = "ADMIN",
            MemberTier = "DIAMOND",
            CreatedAt = now,
            UpdatedAt = now
        };

        var instructor = new NguoiDung
        {
            Id = TaoId.Moi(),
            Email = "instructor@gmail.com",
            Name = "GV. Kim",
            Password = password,
            Role = "INSTRUCTOR",
            MemberTier = "GOLD",
            Bio = "Giảng viên thiết kế sản phẩm và lập trình web.",
            CreatedAt = now,
            UpdatedAt = now
        };

        var student = new NguoiDung
        {
            Id = TaoId.Moi(),
            Email = "student@gmail.com",
            Name = "Học viên Demo",
            Password = password,
            Role = "STUDENT",
            WalletBalance = 500000,
            MemberTier = "SILVER",
            CreatedAt = now,
            UpdatedAt = now
        };

        var course = new KhoaHoc
        {
            Id = TaoId.Moi(),
            Title = "CCNA 200-301 cho người mới bắt đầu",
            Slug = "ccna-200-301-cho-nguoi-moi-bat-dau",
            Description = "Mạng máy tính là hệ thống kết nối từ hai hoặc nhiều thiết bị lại với nhau để trao đổi dữ liệu, chia sẻ tài nguyên và giao tiếp thông qua các giao thức mạng.",
            Thumbnail = "/uploads/images/ccna-cover.png",
            Category = "Mạng máy tính",
            Level = "BEGINNER",
            Price = 3999000,
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

        var section1 = new ChuongHoc
        {
            Id = TaoId.Moi(),
            Title = "GIỚI THIỆU MẠNG MÁY TÍNH",
            Position = 1,
            CourseId = course.Id,
            CreatedAt = now,
            UpdatedAt = now
        };

        var section2 = new ChuongHoc
        {
            Id = TaoId.Moi(),
            Title = "SWITCHING",
            Position = 2,
            CourseId = course.Id,
            CreatedAt = now,
            UpdatedAt = now
        };

        var section3 = new ChuongHoc
        {
            Id = TaoId.Moi(),
            Title = "SECURITY",
            Position = 3,
            CourseId = course.Id,
            CreatedAt = now,
            UpdatedAt = now
        };

        var lessons = new[]
        {
            // Section 1
            new BaiHoc { Id = TaoId.Moi(), Title = "Mạng máy tính là gì?", Content = "Mạng máy tính là hệ thống kết nối từ hai hoặc nhiều thiết bị lại với nhau để trao đổi dữ liệu, chia sẻ tài nguyên và giao tiếp thông qua các giao thức mạng.", VideoUrl = "/uploads/videos/ccna-bai-1.mp4", DurationSeconds = 900, Position = 1, IsPublished = true, IsPreview = true, CourseId = course.Id, SectionId = section1.Id, CreatedAt = now, UpdatedAt = now },
            new BaiHoc { Id = TaoId.Moi(), Title = "Các loại mạng: LAN, WAN, MAN", Content = "LAN, WAN và MAN là ba loại mạng phổ biến được phân loại theo phạm vi kết nối. LAN là mạng cục bộ, MAN là mạng đô thị, còn WAN là mạng diện rộng.", VideoUrl = "/uploads/videos/ccna-bai-2.mp4", DurationSeconds = 1800, Position = 2, IsPublished = true, IsPreview = true, CourseId = course.Id, SectionId = section1.Id, CreatedAt = now, UpdatedAt = now },
            new BaiHoc { Id = TaoId.Moi(), Title = "Thiết bị mạng cơ bản: Router, Switch, Access Point", DurationSeconds = 600, Position = 3, IsPublished = true, IsPreview = false, CourseId = course.Id, SectionId = section1.Id, CreatedAt = now, UpdatedAt = now },
            new BaiHoc { Id = TaoId.Moi(), Title = "Mô hình OSI và TCP/IP", DurationSeconds = 600, Position = 4, IsPublished = true, IsPreview = false, CourseId = course.Id, SectionId = section1.Id, CreatedAt = now, UpdatedAt = now },
            new BaiHoc { Id = TaoId.Moi(), Title = "LAB: Kiểm tra kết nối mạng cơ bản", DurationSeconds = 600, Position = 5, IsPublished = true, IsPreview = false, CourseId = course.Id, SectionId = section1.Id, CreatedAt = now, UpdatedAt = now },

            // Section 2
            new BaiHoc { Id = TaoId.Moi(), Title = "Switch là gì và cách hoạt động", DurationSeconds = 600, Position = 1, IsPublished = true, IsPreview = false, CourseId = course.Id, SectionId = section2.Id, CreatedAt = now, UpdatedAt = now },
            new BaiHoc { Id = TaoId.Moi(), Title = "Địa chỉ MAC và bảng MAC Address Table", DurationSeconds = 600, Position = 2, IsPublished = true, IsPreview = false, CourseId = course.Id, SectionId = section2.Id, CreatedAt = now, UpdatedAt = now },
            new BaiHoc { Id = TaoId.Moi(), Title = "VLAN là gì?", DurationSeconds = 600, Position = 3, IsPublished = true, IsPreview = false, CourseId = course.Id, SectionId = section2.Id, CreatedAt = now, UpdatedAt = now },
            new BaiHoc { Id = TaoId.Moi(), Title = "Cấu hình VLAN cơ bản", DurationSeconds = 600, Position = 4, IsPublished = true, IsPreview = false, CourseId = course.Id, SectionId = section2.Id, CreatedAt = now, UpdatedAt = now },
            new BaiHoc { Id = TaoId.Moi(), Title = "Trunking và chuẩn 802.1Q", DurationSeconds = 600, Position = 5, IsPublished = true, IsPreview = false, CourseId = course.Id, SectionId = section2.Id, CreatedAt = now, UpdatedAt = now },
            new BaiHoc { Id = TaoId.Moi(), Title = "LAB: Cấu hình VLAN và Trunk trên Cisco Packet Tracer", DurationSeconds = 600, Position = 6, IsPublished = true, IsPreview = false, CourseId = course.Id, SectionId = section2.Id, CreatedAt = now, UpdatedAt = now },

            // Section 3
            new BaiHoc { Id = TaoId.Moi(), Title = "Key security concepts", DurationSeconds = 600, Position = 1, IsPublished = true, IsPreview = false, CourseId = course.Id, SectionId = section3.Id, CreatedAt = now, UpdatedAt = now },
            new BaiHoc { Id = TaoId.Moi(), Title = "Port Security, VLAN Hopping, SPAN, BPDU Guard", DurationSeconds = 600, Position = 2, IsPublished = true, IsPreview = false, CourseId = course.Id, SectionId = section3.Id, CreatedAt = now, UpdatedAt = now },
            new BaiHoc { Id = TaoId.Moi(), Title = "LAB: Port Security, SPAN, BPDU Guard", DurationSeconds = 600, Position = 3, IsPublished = true, IsPreview = false, CourseId = course.Id, SectionId = section3.Id, CreatedAt = now, UpdatedAt = now }
        };

        db.Users.AddRange(admin, instructor, student);
        db.Courses.Add(course);
        db.Sections.AddRange(section1, section2, section3);
        db.Lessons.AddRange(lessons);
        
        await db.SaveChangesAsync();
    }
}
