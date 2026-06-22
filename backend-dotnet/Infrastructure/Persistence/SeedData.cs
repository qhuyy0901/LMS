using LMS.Api.Domain.Entities;
using LMS.Api.Application.Services;
using Microsoft.EntityFrameworkCore;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace LMS.Api.Infrastructure.Persistence;

public static class SeedData
{
    private class CourseTemplate
    {
        public string TieuDe { get; set; } = string.Empty;
        public string DuongDanThanThien { get; set; } = string.Empty;
        public string MoTaNgan { get; set; } = string.Empty;
        public string MoTa { get; set; } = string.Empty;
        public string MoTaChiTiet { get; set; } = string.Empty;
        public string ChuyenMuc { get; set; } = string.Empty;
        public string TrinhDo { get; set; } = "BEGINNER";
        public int Gia { get; set; }
        public double DiemDanhGiaTrungBinh { get; set; }
        public int SoLuongDanhGia { get; set; }
        public string HangThanhVienToiThieu { get; set; } = "BRONZE";
        public string AnhDaiDien { get; set; } = string.Empty;
        public List<SectionTemplate> CacChuongHoc { get; set; } = new();
    }

    private class SectionTemplate
    {
        public string TieuDe { get; set; } = string.Empty;
        public List<string> LessonTitles { get; set; } = new();
    }

    public static async Task SeedAsync(ApplicationDbContext db)
    {
        var now = DateTime.UtcNow;
        var password = BCrypt.Net.BCrypt.HashPassword("123456");

        // Seed users
        var admin = await db.NguoiDung.FirstOrDefaultAsync(u => u.Email == "admin@gmail.com");
        if (admin == null)
        {
            admin = new NguoiDung
            {
                Id = "demo-user-admin",
                Email = "admin@gmail.com",
                Ten = "Quản trị viên",
                MatKhau = password,
                VaiTro = "ADMIN",
                HangThanhVien = "DIAMOND",
                NgayTao = now,
                NgayCapNhat = now
            };
            db.NguoiDung.Add(admin);
        }

        var instructor = await db.NguoiDung.FirstOrDefaultAsync(u => u.Email == "instructor@gmail.com");
        if (instructor == null)
        {
            instructor = new NguoiDung
            {
                Id = "demo-user-instructor",
                Email = "instructor@gmail.com",
                Ten = "GV. Kim",
                MatKhau = password,
                VaiTro = "INSTRUCTOR",
                HangThanhVien = "GOLD",
                TieuSu = "Giảng viên thiết kế sản phẩm và lập trình web.",
                NgayTao = now,
                NgayCapNhat = now
            };
            db.NguoiDung.Add(instructor);
        }

        var student = await db.NguoiDung.FirstOrDefaultAsync(u => u.Email == "student@gmail.com");
        if (student == null)
        {
            student = new NguoiDung
            {
                Id = "demo-user-student",
                Email = "student@gmail.com",
                Ten = "Học viên Demo",
                MatKhau = password,
                VaiTro = "STUDENT",
                SoDuVi = 500000,
                HangThanhVien = "SILVER",
                NgayTao = now,
                NgayCapNhat = now
            };
            db.NguoiDung.Add(student);
        }

        await db.SaveChangesAsync();

        // Seed DanhMuc
        var categoryNames = new[] { "Lập trình", "Công nghệ", "Mạng máy tính", "Tiếng Anh", "Thiết kế", "Kinh doanh", "AI", "ReactJS", "Python", "ASP.NET Core", "Data Science" };
        var categoryMap = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase);
        async Task<DanhMuc> LayHoacTaoDanhMuc(string? rawName)
        {
            var name = string.IsNullOrWhiteSpace(rawName) ? "Khac" : rawName.Trim();
            var slug = TroGiup.TaoSlug(name);
            var existing = await db.DanhMuc.FirstOrDefaultAsync(d => d.Ten == name || d.Slug == slug);
            if (existing is not null) return existing;

            var dm = new DanhMuc
            {
                Id = Guid.NewGuid().ToString("N"),
                Ten = name,
                Slug = slug,
                MoTa = $"Chuyen muc ve {name}",
                HoatDong = true,
                NgayTao = now,
                NgayCapNhat = now
            };

            db.DanhMuc.Add(dm);
            await db.SaveChangesAsync();
            return dm;
        }
        foreach (var name in categoryNames)
        {
            var dm = await LayHoacTaoDanhMuc(name);
            categoryMap[name] = dm.Id;
        }

        // Seed Courses
        var templates = GetTemplates();
        var random = new Random();

        foreach (var t in templates)
        {
            if (await db.KhoaHoc.AnyAsync(c => c.DuongDanThanThien == t.DuongDanThanThien))
            {
                continue; // Skip if already exists
            }

            categoryMap.TryGetValue(t.ChuyenMuc, out var targetDanhMucId);

            var course = new KhoaHoc
            {
                Id = TaoId.Moi(),
                TieuDe = t.TieuDe,
                DuongDanThanThien = t.DuongDanThanThien,
                MoTaNgan = t.MoTaNgan,
                MoTa = t.MoTa,
                MoTaChiTiet = t.MoTaChiTiet,
                AnhDaiDien = t.AnhDaiDien,
                ChuyenMuc = t.ChuyenMuc,
                DanhMucId = targetDanhMucId,
                TrinhDo = t.TrinhDo,
                Gia = t.Gia,
                DiemDanhGiaTrungBinh = t.DiemDanhGiaTrungBinh,
                SoLuongDanhGia = t.SoLuongDanhGia,
                HangThanhVienToiThieu = t.HangThanhVienToiThieu,
                DaXuatBan = true,
                TrangThai = "PUBLISHED",
                NgayXuatBan = now.AddDays(-random.Next(10, 50)),
                StartDate = now.AddDays(-random.Next(5, 10)),
                EndDate = now.AddDays(random.Next(30, 90)),
                GiangVienId = instructor.Id,
                NgayTao = now.AddDays(-50),
                NgayCapNhat = now
            };

            db.KhoaHoc.Add(course);

            int totalDuration = 0;
            int sectionPos = 1;
            foreach (var st in t.CacChuongHoc)
            {
                var section = new ChuongHoc
                {
                    Id = TaoId.Moi(),
                    TieuDe = st.TieuDe,
                    ThuTu = sectionPos++,
                    KhoaHocId = course.Id,
                    NgayTao = now,
                    NgayCapNhat = now
                };
                db.ChuongHoc.Add(section);

                int lessonPos = 1;
                foreach (var lt in st.LessonTitles)
                {
                    int duration = random.Next(10, 31) * 60; // 10 to 30 minutes in seconds
                    totalDuration += duration;

                    var lesson = new BaiHoc
                    {
                        Id = TaoId.Moi(),
                        TieuDe = lt,
                        NoiDung = $"Chào mừng bạn đến với bài học: '{lt}'. Đây là nội dung hướng dẫn chi tiết dành cho học viên của khóa học '{t.TieuDe}'. Hãy theo dõi kỹ video và thực hiện các bài tập thực hành đi kèm.",
                        VideoUrl = "https://www.w3schools.com/html/mov_bbb.mp4",
                        ThoiLuongGiay = duration,
                        ThuTu = lessonPos++,
                        DaXuatBan = true,
                        TrangThai = "PUBLISHED",
                        ChoXemTruoc = (section.ThuTu == 1 && lessonPos == 2), // First lesson of first section is preview
                        KhoaHocId = course.Id,
                        ChuongHocId = section.Id,
                        NgayTao = now,
                        NgayCapNhat = now
                    };
                    db.BaiHoc.Add(lesson);

                    // Add quiz to the last lesson of the section
                    if (lessonPos - 1 == st.LessonTitles.Count)
                    {
                        var quiz = new BaiKiemTra
                        {
                            Id = TaoId.Moi(),
                            TieuDe = $"Trắc nghiệm: {st.TieuDe}",
                            MoTa = $"Bài kiểm tra trắc nghiệm giúp bạn củng cố kiến thức đã học trong chương: {st.TieuDe}.",
                            DiemDat = 80,
                            BaiHocId = lesson.Id,
                            NgayTao = now,
                            NgayCapNhat = now
                        };
                        db.BaiKiemTra.Add(quiz);

                        var qTemplates = GetQuestionsForCategory(t.ChuyenMuc, section.ThuTu, random);
                        int qPos = 1;
                        foreach (var qt in qTemplates)
                        {
                            var question = new CauHoiKiemTra
                            {
                                Id = TaoId.Moi(),
                                NoiDungCauHoi = qt.NoiDungCauHoi,
                                CacLuaChon = System.Text.Json.JsonSerializer.Serialize(qt.CacLuaChon),
                                DapAnDungIndex = qt.DapAnDungIndex,
                                GiaiThich = qt.GiaiThich,
                                ThuTu = qPos++,
                                BaiKiemTraId = quiz.Id,
                                NgayTao = now,
                                NgayCapNhat = now
                            };
                            db.CauHoiKiemTra.Add(question);
                        }
                    }
                }
            }

            course.TongThoiLuongGiay = totalDuration;
        }

        await db.SaveChangesAsync();

        // Seed some enrollments for the student (up to 5 courses)
        var studentCourses = await db.KhoaHoc.Take(5).ToListAsync();
        foreach (var sc in studentCourses)
        {
            if (!await db.GhiDanh.AnyAsync(e => e.NguoiDungId == student.Id && e.KhoaHocId == sc.Id))
            {
                var enrollment = new GhiDanh
                {
                    Id = TaoId.Moi(),
                    TienDo = random.Next(10, 80),
                    NgayHoanThanh = null,
                    NguoiDungId = student.Id,
                    KhoaHocId = sc.Id,
                    NgayTao = now.AddDays(-5),
                    NgayCapNhat = now
                };
                db.GhiDanh.Add(enrollment);
            }

            // Seed review for this course since the student is enrolled
            if (!await db.DanhGiaKhoaHoc.AnyAsync(r => r.NguoiDungId == student.Id && r.KhoaHocId == sc.Id))
            {
                var reviewComments = new[]
                {
                    "Khóa học rất chi tiết và thực tế, giảng viên giảng dễ hiểu.",
                    "Nội dung cập nhật mới nhất, bài tập thực hành rất hay.",
                    "Tài liệu phong phú, video chất lượng cao, rất đáng tiền học.",
                    "Tuyệt vời, giúp tôi giải quyết được nhiều vướng mắc trong công việc thực tế.",
                    "Khóa học có hệ thống bài giảng rõ ràng, logic, phù hợp cho mọi người học.",
                    "Thực sự là một khóa học chất lượng cao, hỗ trợ nhiệt tình từ giảng viên."
                };

                var review = new DanhGiaKhoaHoc
                {
                    Id = TaoId.Moi(),
                    DiemDanhGia = random.Next(4, 6), // 4 or 5 stars
                    BinhLuan = reviewComments[random.Next(reviewComments.Length)],
                    NguoiDungId = student.Id,
                    KhoaHocId = sc.Id,
                    NgayTao = now.AddDays(-random.Next(1, 10)),
                    NgayCapNhat = now
                };
                db.DanhGiaKhoaHoc.Add(review);
            }
        }

        await db.SaveChangesAsync();

        // Add quizzes to existing courses if they lack quizzes
        var existingCourses = await db.KhoaHoc.Include(c => c.CacChuongHoc).ThenInclude(s => s.CacBaiHoc).ToListAsync();
        foreach (var c in existingCourses)
        {
            // Check if this course already has any quizzes
            bool hasQuiz = await db.BaiKiemTra.AnyAsync(q => db.BaiHoc.Any(l => l.Id == q.BaiHocId && l.KhoaHocId == c.Id));
            if (!hasQuiz)
            {
                foreach (var sect in c.CacChuongHoc)
                {
                    var lastLesson = sect.CacBaiHoc.OrderBy(l => l.ThuTu).LastOrDefault();
                    if (lastLesson != null)
                    {
                        var quiz = new BaiKiemTra
                        {
                            Id = TaoId.Moi(),
                            TieuDe = $"Trắc nghiệm: {sect.TieuDe}",
                            MoTa = $"Bài kiểm tra trắc nghiệm giúp bạn củng cố kiến thức đã học trong chương: {sect.TieuDe}.",
                            DiemDat = 80,
                            BaiHocId = lastLesson.Id,
                            NgayTao = now,
                            NgayCapNhat = now
                        };
                        db.BaiKiemTra.Add(quiz);

                        var qTemplates = GetQuestionsForCategory(c.ChuyenMuc, sect.ThuTu, random);
                        int qPos = 1;
                        foreach (var qt in qTemplates)
                        {
                            var question = new CauHoiKiemTra
                            {
                                Id = TaoId.Moi(),
                                NoiDungCauHoi = qt.NoiDungCauHoi,
                                CacLuaChon = System.Text.Json.JsonSerializer.Serialize(qt.CacLuaChon),
                                DapAnDungIndex = qt.DapAnDungIndex,
                                GiaiThich = qt.GiaiThich,
                                ThuTu = qPos++,
                                BaiKiemTraId = quiz.Id,
                                NgayTao = now,
                                NgayCapNhat = now
                            };
                            db.CauHoiKiemTra.Add(question);
                        }
                    }
                }
            }
        }

        await db.SaveChangesAsync();

        // Perform clean up and database synchronization
        await CleanDatabaseAsync(db);
    }

    public static async Task CleanDatabaseAsync(ApplicationDbContext db)
    {
        var targetTemplates = GetTemplates();
        var targetSlugs = targetTemplates.Select(t => t.DuongDanThanThien).ToHashSet(StringComparer.OrdinalIgnoreCase);

        // Get all courses from database
        var allCourses = await db.KhoaHoc.ToListAsync();

        int deletedCount = 0;
        int adjustedReviewsCount = 0;

        foreach (var course in allCourses)
        {
            // Check if the course is NOT in the target list of templates
            if (!targetSlugs.Contains(course.DuongDanThanThien))
            {
                // Check if it has student enrollments
                bool hasEnrollments = await db.GhiDanh.AnyAsync(e => e.KhoaHocId == course.Id);

                if (hasEnrollments)
                {
                    // If it has enrollments, do not delete it, but make sure it is marked as published
                    if (!course.DaXuatBan || course.TrangThai != "PUBLISHED")
                    {
                        course.DaXuatBan = true;
                        course.TrangThai = "PUBLISHED";
                        course.NgayCapNhat = DateTime.UtcNow;
                    }
                }
                else
                {
                    // Delete it using order-of-dependency deletion to avoid FK violations
                    var id = course.Id;
                    
                    var lessonIds = await db.BaiHoc.Where(l => l.KhoaHocId == id).Select(l => l.Id).ToListAsync();
                    var quizIds = await db.BaiKiemTra.Where(q => lessonIds.Contains(q.BaiHocId)).Select(q => q.Id).ToListAsync();
                    if (quizIds.Count > 0)
                    {
                        db.BaiNopKiemTra.RemoveRange(db.BaiNopKiemTra.Where(s => quizIds.Contains(s.BaiKiemTraId)));
                        db.CauHoiKiemTra.RemoveRange(db.CauHoiKiemTra.Where(q => quizIds.Contains(q.BaiKiemTraId)));
                        db.BaiKiemTra.RemoveRange(db.BaiKiemTra.Where(q => quizIds.Contains(q.Id)));
                    }

                    if (lessonIds.Count > 0)
                    {
                        db.BinhLuan.RemoveRange(db.BinhLuan.Where(c => lessonIds.Contains(c.BaiHocId)));
                        db.TienDoBaiHoc.RemoveRange(db.TienDoBaiHoc.Where(p => lessonIds.Contains(p.BaiHocId)));
                    }

                    var couponIds = await db.MaGiamGia.Where(c => c.KhoaHocId == id).Select(c => c.Id).ToListAsync();
                    if (couponIds.Count > 0)
                    {
                        db.LichSuDungMaGiamGia.RemoveRange(db.LichSuDungMaGiamGia.Where(u => couponIds.Contains(u.MaGiamGiaId)));
                        db.NguoiNhanMaGiamGia.RemoveRange(db.NguoiNhanMaGiamGia.Where(r => couponIds.Contains(r.MaGiamGiaId)));
                        db.MaGiamGia.RemoveRange(db.MaGiamGia.Where(c => couponIds.Contains(c.Id)));
                    }

                    db.DanhGiaKhoaHoc.RemoveRange(db.DanhGiaKhoaHoc.Where(r => r.KhoaHocId == id));
                    db.ChungChi.RemoveRange(db.ChungChi.Where(c => c.KhoaHocId == id));
                    db.KhoaHocDaLuu.RemoveRange(db.KhoaHocDaLuu.Where(s => s.KhoaHocId == id));
                    db.LichSuDungMaGiamGia.RemoveRange(db.LichSuDungMaGiamGia.Where(u => u.KhoaHocId == id));
                    db.KhoaHocAnh.RemoveRange(db.KhoaHocAnh.Where(img => img.KhoaHocId == id));

                    await db.GiaoDichVi.Where(w => w.KhoaHocId == id).ExecuteUpdateAsync(s => s.SetProperty(w => w.KhoaHocId, (string?)null));
                    await db.CuocTroChuyen.Where(c => c.KhoaHocId == id).ExecuteUpdateAsync(s => s.SetProperty(c => c.KhoaHocId, (string?)null));
                    await db.NguoiNhanMaGiamGia.Where(r => r.SourceCourseId == id).ExecuteUpdateAsync(s => s.SetProperty(r => r.SourceCourseId, (string?)null));

                    db.BaiTap.RemoveRange(db.BaiTap.Where(assignment => assignment.KhoaHocId == id));
                    db.BaiHoc.RemoveRange(db.BaiHoc.Where(lesson => lesson.KhoaHocId == id));
                    db.ChuongHoc.RemoveRange(db.ChuongHoc.Where(section => section.KhoaHocId == id));
                    
                    db.KhoaHoc.Remove(course);
                    deletedCount++;
                }
            }
        }

        await db.SaveChangesAsync();

        // Now adjust reviews on remaining courses
        var remainingCourses = await db.KhoaHoc.ToListAsync();
        foreach (var course in remainingCourses)
        {
            var enrollments = await db.GhiDanh.Where(e => e.KhoaHocId == course.Id).Select(e => e.NguoiDungId).ToListAsync();
            var reviews = await db.DanhGiaKhoaHoc.Where(r => r.KhoaHocId == course.Id).ToListAsync();

            // 1. Delete reviews by users who are not enrolled
            var invalidReviews = reviews.Where(r => !enrollments.Contains(r.NguoiDungId)).ToList();
            if (invalidReviews.Count > 0)
            {
                db.DanhGiaKhoaHoc.RemoveRange(invalidReviews);
                reviews = reviews.Except(invalidReviews).ToList();
                adjustedReviewsCount += invalidReviews.Count;
            }

            // 2. Limit reviews: 0 enrollments -> 0 reviews; 1 enrollment -> max 1 review; 2 -> max 2
            int maxAllowedReviews = enrollments.Count;
            if (reviews.Count > maxAllowedReviews)
            {
                var reviewsToRemove = reviews.Skip(maxAllowedReviews).ToList();
                db.DanhGiaKhoaHoc.RemoveRange(reviewsToRemove);
                reviews = reviews.Take(maxAllowedReviews).ToList();
                adjustedReviewsCount += reviewsToRemove.Count;
            }

            // Update stats
            int reviewCount = reviews.Count;
            double avgRating = reviewCount == 0 ? 0.0 : Math.Round(reviews.Average(r => r.DiemDanhGia), 1);

            if (course.SoLuongDanhGia != reviewCount || Math.Abs(course.DiemDanhGiaTrungBinh - avgRating) > 0.01)
            {
                course.SoLuongDanhGia = reviewCount;
                course.DiemDanhGiaTrungBinh = avgRating;
                course.NgayCapNhat = DateTime.UtcNow;
            }
        }

        await db.SaveChangesAsync();

        Console.WriteLine($"[DB CLEANUP] Deleted {deletedCount} unwanted courses with 0 enrollments.");
        Console.WriteLine($"[DB CLEANUP] Adjusted/deleted {adjustedReviewsCount} mismatch reviews.");
    }

    private class QuestionTemplate
    {
        public string NoiDungCauHoi { get; set; } = string.Empty;
        public List<string> CacLuaChon { get; set; } = new();
        public int DapAnDungIndex { get; set; }
        public string GiaiThich { get; set; } = string.Empty;
    }

    private static List<QuestionTemplate> GetQuestionsForCategory(string category, int sectionPos, Random random)
    {
        var questions = new List<QuestionTemplate>();
        
        string catLower = category.ToLower();
        if (catLower.Contains("asp.net") || catLower.Contains("api"))
        {
            if (sectionPos == 1)
            {
                questions.Add(new QuestionTemplate {
                    NoiDungCauHoi = "ASP.NET Core là gì?",
                    CacLuaChon = new List<string> { "Một thư viện JavaScript", "Một framework web mã nguồn mở của Microsoft", "Một loại database", "Một ngôn ngữ lập trình mới" },
                    DapAnDungIndex = 1,
                    GiaiThich = "ASP.NET Core là framework web mã nguồn mở, đa nền tảng và hiệu năng cao của Microsoft."
                });
                questions.Add(new QuestionTemplate {
                    NoiDungCauHoi = "Cơ chế Dependency Injection (DI) trong ASP.NET Core hỗ trợ những lifetime nào?",
                    CacLuaChon = new List<string> { "Transient, Scoped, Singleton", "Local, Global, Static", "Read, Write, Execute", "None of the above" },
                    DapAnDungIndex = 0,
                    GiaiThich = "ASP.NET Core tích hợp sẵn DI container với 3 lifetime chính: Transient, Scoped, và Singleton."
                });
            }
            else
            {
                questions.Add(new QuestionTemplate {
                    NoiDungCauHoi = "Phương thức nào cấu hình Service Lifetime dạng Scoped?",
                    CacLuaChon = new List<string> { "AddSingleton", "AddTransient", "AddScoped", "AddMvc" },
                    DapAnDungIndex = 2,
                    GiaiThich = "Sử dụng AddScoped để đăng ký service có vòng đời tồn tại theo từng HTTP request."
                });
            }
        }
        else if (catLower.Contains("react"))
        {
            if (sectionPos == 1)
            {
                questions.Add(new QuestionTemplate {
                    NoiDungCauHoi = "ReactJS là gì?",
                    CacLuaChon = new List<string> { "Một database", "Một hệ điều hành", "Một thư viện JavaScript để xây dựng giao diện (UI)", "Một ngôn ngữ lập trình backend" },
                    DapAnDungIndex = 2,
                    GiaiThich = "ReactJS là thư viện JavaScript mã nguồn mở được phát triển bởi Facebook để xây dựng giao diện người dùng đơn trang (SPA)."
                });
            }
        }

        if (questions.Count == 0)
        {
            questions.Add(new QuestionTemplate {
                NoiDungCauHoi = $"Bài kiểm tra tổng hợp kiến thức về {category}",
                CacLuaChon = new List<string> { "Đáp án A (Đúng)", "Đáp án B", "Đáp án C", "Đáp án D" },
                DapAnDungIndex = 0,
                GiaiThich = "Chúc mừng bạn chọn đúng đáp án A."
            });
        }

        return questions;
    }

    private static List<CourseTemplate> GetTemplates()
    {
        return new List<CourseTemplate>
        {
            // 1. ASP.NET Core Web API
            new CourseTemplate
            {
                TieuDe = "Xây dựng Web API chuyên nghiệp với ASP.NET Core",
                DuongDanThanThien = "xay-dung-web-api-aspnet-core",
                MoTaNgan = "Thiết lập dự án, kết nối EF Core, xác thực JWT và đóng gói Docker.",
                MoTa = "Khóa học giúp bạn làm chủ quá trình thiết kế và phát triển RESTful API chuyên nghiệp bằng ASP.NET Core 9. Bạn sẽ được học từ kiến trúc Onion Architecture, kết nối database với EF Core, bảo mật JWT đến các kỹ thuật log lỗi và deploy thực tế.",
                MoTaChiTiet = "Trong khóa học này, chúng ta sẽ cùng nhau xây dựng một hệ thống backend API thực tế. Chúng ta sẽ áp dụng các nguyên lý Clean Code và các pattern phổ biến để code dễ bảo trì và mở rộng.",
                ChuyenMuc = "ASP.NET Core",
                TrinhDo = "INTERMEDIATE",
                Gia = 499000,
                DiemDanhGiaTrungBinh = 4.8,
                SoLuongDanhGia = 42,
                HangThanhVienToiThieu = "SILVER",
                AnhDaiDien = "https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=600&auto=format&fit=crop",
                CacChuongHoc = new List<SectionTemplate>
                {
                    new SectionTemplate
                    {
                        TieuDe = "Thiết lập & Cấu trúc dự án Web API",
                        LessonTitles = new List<string>
                        {
                            "Giới thiệu RESTful API và ASP.NET Core Web API",
                            "Thiết lập dự án và tìm hiểu Program.cs",
                            "Tổ chức kiến trúc thư mục Onion Architecture",
                            "Cấu hình Dependency Injection (Scoped, Transient, Singleton)"
                        }
                    },
                    new SectionTemplate
                    {
                        TieuDe = "Xử lý dữ liệu & Entity Framework Core",
                        LessonTitles = new List<string>
                        {
                            "Kết nối SQL Server với EF Core",
                            "Thực hiện Migration và seeding dữ liệu mẫu",
                            "Thiết kế Controller và Routing cho resource",
                            "Sử dụng DTOs và AutoMapper",
                            "Validation dữ liệu đầu vào với FluentValidation"
                        }
                    },
                    new SectionTemplate
                    {
                        TieuDe = "Bảo mật & Triển khai",
                        LessonTitles = new List<string>
                        {
                            "Tích hợp Authentication với JWT Token",
                            "Phân quyền hạn truy cập (Role-based & Policy-based)",
                            "Ghi log tập trung với Serilog",
                            "Triển khai dự án lên Docker & IIS"
                        }
                    }
                }
            },
            // 2. ReactJS
            new CourseTemplate
            {
                TieuDe = "Lập trình ReactJS cho người mới bắt đầu",
                DuongDanThanThien = "reactjs-cho-nguoi-moi-bat-dau",
                MoTaNgan = "Học Component, Props, State, React Hooks và React Router để xây dựng giao diện hiện đại.",
                MoTa = "Nắm vững ReactJS - thư viện JavaScript phổ biến nhất hiện nay cho phát triển giao diện Web (Frontend). Học thông qua các ví dụ thực hành trực quan.",
                MoTaChiTiet = "Khóa học đi từ con số 0 giúp bạn viết component sạch, quản lý state và fetch API mượt mà.",
                ChuyenMuc = "ReactJS",
                TrinhDo = "BEGINNER",
                Gia = 299000,
                DiemDanhGiaTrungBinh = 4.6,
                SoLuongDanhGia = 35,
                HangThanhVienToiThieu = "BRONZE",
                AnhDaiDien = "https://images.unsplash.com/photo-1633356122544-f134324a6cee?w=600&auto=format&fit=crop",
                CacChuongHoc = new List<SectionTemplate>
                {
                    new SectionTemplate
                    {
                        TieuDe = "Kiến thức JavaScript ES6 và React cơ bản",
                        LessonTitles = new List<string>
                        {
                            "Các cú pháp ES6 quan trọng trước khi học React",
                            "Cài đặt Node.js và khởi tạo dự án với Vite",
                            "Tìm hiểu JSX và Component trong React",
                            "Sử dụng Props để truyền dữ liệu"
                        }
                    },
                    new SectionTemplate
                    {
                        TieuDe = "State & Hooks cơ bản",
                        LessonTitles = new List<string>
                        {
                            "Quản lý state với useState Hook",
                            "Xử lý sự kiện (Event Handling)",
                            "Làm quen với useEffect Hook để fetch API",
                            "Làm việc với Form và Controlled Components"
                        }
                    },
                    new SectionTemplate
                    {
                        TieuDe = "React Router & Quản lý State nâng cao",
                        LessonTitles = new List<string>
                        {
                            "Điều hướng trang với React Router DOM v6",
                            "Chia sẻ State toàn cục bằng Context API",
                            "Xây dựng ứng dụng Todo List thực tế",
                            "Deploy ứng dụng React lên Vercel"
                        }
                    }
                }
            },
            // 3. NodeJS Express API
            new CourseTemplate
            {
                TieuDe = "NodeJS & ExpressJS: Xây dựng RESTful API thực chiến",
                DuongDanThanThien = "nodejs-expressjs-api-thuc-chien",
                MoTaNgan = "Xây dựng Server Express, kết nối MongoDB với Mongoose và phân quyền bảo mật JWT.",
                MoTa = "Học cách thiết kế backend mạnh mẽ với NodeJS, xử lý các tác vụ bất đồng bộ hiệu quả thông qua ExpressJS framework.",
                MoTaChiTiet = "Bạn sẽ học cách bảo mật ứng dụng với mã hóa bcrypt, xác thực người dùng bằng JWT, xử lý upload file và xử lý log lỗi tập trung.",
                ChuyenMuc = "NodeJS",
                TrinhDo = "INTERMEDIATE",
                Gia = 349000,
                DiemDanhGiaTrungBinh = 4.8,
                SoLuongDanhGia = 31,
                HangThanhVienToiThieu = "SILVER",
                AnhDaiDien = "https://images.unsplash.com/photo-1510915228340-29c85a43dcfe?w=600&auto=format&fit=crop",
                CacChuongHoc = new List<SectionTemplate>
                {
                    new SectionTemplate
                    {
                        TieuDe = "Khởi động với Node.js & Express",
                        LessonTitles = new List<string>
                        {
                            "Cách hoạt động bất đồng bộ của Node.js (Event Loop)",
                            "Khởi tạo Server cơ bản với Express",
                            "Sử dụng Middleware trong Express",
                            "Định nghĩa Router và xử lý Request Parameters"
                        }
                    },
                    new SectionTemplate
                    {
                        TieuDe = "Kết nối Database & Mongoose",
                        LessonTitles = new List<string>
                        {
                            "Kết nối MongoDB với thư viện Mongoose",
                            "Thiết kế Schema và Model cho User, Product",
                            "Thực hiện các thao tác CRUD bất đồng bộ",
                            "Validation dữ liệu đầu vào với Joi / Express Validator"
                        }
                    },
                    new SectionTemplate
                    {
                        TieuDe = "Xác thực, bảo mật & Upload file",
                        LessonTitles = new List<string>
                        {
                            "Mã hóa mật khẩu với bcrypt",
                            "Tạo token xác thực với JWT",
                            "Xử lý upload file với Multer",
                            "Ghi log lỗi và deploy API lên Render"
                        }
                    }
                }
            },
            // 4. Machine Learning
            new CourseTemplate
            {
                TieuDe = "Machine Learning thực hành: Dự báo và phân loại",
                DuongDanThanThien = "machine-learning-thuc-hanh-du-bao",
                MoTaNgan = "Phân tích hồi quy, Random Forest, XGBoost và phân khúc khách hàng RFM thực tế.",
                MoTa = "Trực tiếp giải quyết các bài toán kinh doanh thực tế thông qua các thuật toán Machine Learning từ cơ bản đến phức tạp.",
                MoTaChiTiet = "Học viên sẽ tự tay xây dựng mô hình dự báo doanh số và dự đoán khách hàng rời bỏ dịch vụ viễn thông.",
                ChuyenMuc = "AI",
                TrinhDo = "INTERMEDIATE",
                Gia = 499000,
                DiemDanhGiaTrungBinh = 4.8,
                SoLuongDanhGia = 19,
                HangThanhVienToiThieu = "SILVER",
                AnhDaiDien = "https://images.unsplash.com/photo-1504868584819-f8e8b4b6d7e3?w=600&auto=format&fit=crop",
                CacChuongHoc = new List<SectionTemplate>
                {
                    new SectionTemplate
                    {
                        TieuDe = "Hồi quy tuyến tính nâng cao",
                        LessonTitles = new List<string>
                        {
                            "Ôn tập toán tối ưu và Gradient Descent",
                            "Hồi quy tuyến tính đa biến (Multiple Linear Regression)",
                            "Tránh overfitting bằng Regularization: Lasso và Ridge",
                            "Thực hành dự báo doanh số bán hàng quý tiếp theo"
                        }
                    },
                    new SectionTemplate
                    {
                        TieuDe = "Thuật toán phân loại thực tế",
                        LessonTitles = new List<string>
                        {
                            "Thuật toán Hồi quy Logistics (Logistic Regression)",
                            "Hỗ trợ vector máy (Support Vector Machine)",
                            "Mô hình Random Forest và Gradient Boosting (XGBoost)",
                            "LAB: Dự đoán khách hàng rời bỏ dịch vụ viễn thông"
                        }
                    },
                    new SectionTemplate
                    {
                        TieuDe = "Phân cụm & Giảm chiều dữ liệu",
                        LessonTitles = new List<string>
                        {
                            "Phân cụm phân cấp (Hierarchical Clustering)",
                            "Ứng dụng phân khúc khách hàng bằng mô hình RFM",
                            "Biểu diễn dữ liệu đa chiều lên không gian 2D với t-SNE",
                            "Đánh giá hiệu quả mô hình trong môi trường Production"
                        }
                    }
                }
            },
            // 5. Network Security
            new CourseTemplate
            {
                TieuDe = "An ninh mạng và Bảo mật hệ thống căn bản",
                DuongDanThanThien = "an-ninh-mang-bao-mat-he-thong",
                MoTaNgan = "Tìm hiểu virus, Ransomware, tường lửa Firewall, chứng chỉ SSL/TLS và quét bảo mật Nmap.",
                MoTa = "Nhận thức các mối đe dọa an ninh mạng hiện đại và nắm vững các kỹ thuật phòng thủ cơ bản để bảo vệ thông tin cho cá nhân và tổ chức.",
                MoTaChiTiet = "Bạn sẽ học về CIA Triad, mật mã học đối xứng/bất đối xứng, cấu hình tường lửa và cách quét cổng mạng với Nmap.",
                ChuyenMuc = "Mạng máy tính",
                TrinhDo = "BEGINNER",
                Gia = 399000,
                DiemDanhGiaTrungBinh = 4.7,
                SoLuongDanhGia = 31,
                HangThanhVienToiThieu = "BRONZE",
                AnhDaiDien = "https://images.unsplash.com/photo-1550751827-4bd374c3f58b?w=600&auto=format&fit=crop",
                CacChuongHoc = new List<SectionTemplate>
                {
                    new SectionTemplate
                    {
                        TieuDe = "Các lỗ hổng bảo mật & Tấn công thường gặp",
                        LessonTitles = new List<string>
                        {
                            "Khái niệm an ninh mạng: CIA Triad",
                            "Các loại mã độc phổ biến: Virus, Worm, Ransomware",
                            "Tấn công giả mạo (Phishing) và Social Engineering",
                            "Tấn công từ chối dịch vụ (DDoS) hoạt động như thế nào?"
                        }
                    },
                    new SectionTemplate
                    {
                        TieuDe = "Kỹ thuật phòng thủ & Mã hóa dữ liệu",
                        LessonTitles = new List<string>
                        {
                            "Nguyên lý hoạt động của Tường lửa (Firewall) và IDS/IPS",
                            "Khái niệm mật mã học: Mã hóa đối xứng và bất đối xứng",
                            "Tìm hiểu chứng chỉ SSL/TLS dùng cho HTTPS",
                            "Bảo mật Wi-Fi doanh nghiệp với WPA2/WPA3"
                        }
                    },
                    new SectionTemplate
                    {
                        TieuDe = "Đánh giá an toàn & Nhận thức bảo mật",
                        LessonTitles = new List<string>
                        {
                            "Cách quản lý mật khẩu an toàn và Xác thực 2 yếu tố (2FA)",
                            "Quét cổng mạng và lỗ hổng bằng Nmap cơ bản",
                            "Cách sao lưu dự phòng dữ liệu phòng ngừa Ransomware",
                            "Quy trình ứng phó khi hệ thống bị tấn công mạng"
                        }
                    }
                }
            },
            // 6. Digital Marketing
            new CourseTemplate
            {
                TieuDe = "Digital Marketing tổng quan cho doanh nghiệp nhỏ",
                DuongDanThanThien = "digital-marketing-tong-quan",
                MoTaNgan = "Học SEO, Content Marketing, lập phễu khách hàng và đọc Google Analytics 4.",
                MoTa = "Nắm bắt bức tranh toàn cảnh về tiếp thị số. Lựa chọn kênh chạy quảng cáo phù hợp, lập kế hoạch nội dung thu hút khách hàng tiềm năng tự nhiên với chi phí tối ưu.",
                MoTaChiTiet = "Bạn sẽ học cách lập phễu khách hàng, thiết lập GA4 để đọc các chỉ số CTR, CPC, CPA, ROI nhằm đưa ra quyết định marketing đúng đắn.",
                ChuyenMuc = "Digital Marketing",
                TrinhDo = "BEGINNER",
                Gia = 249000,
                DiemDanhGiaTrungBinh = 4.6,
                SoLuongDanhGia = 38,
                HangThanhVienToiThieu = "BRONZE",
                AnhDaiDien = "https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=600&auto=format&fit=crop",
                CacChuongHoc = new List<SectionTemplate>
                {
                    new SectionTemplate
                    {
                        TieuDe = "Các kênh tiếp thị số chủ đạo",
                        LessonTitles = new List<string>
                        {
                            "Digital Marketing là gì và vai trò của nó",
                            "Tiếp thị qua công cụ tìm kiếm (SEO & SEM)",
                            "Tiếp thị qua mạng xã hội (Social Media Marketing)",
                            "Tiếp thị nội dung (Content Marketing) thu hút khách hàng"
                        }
                    },
                    new SectionTemplate
                    {
                        TieuDe = "Lập kế hoạch chiến dịch cơ bản",
                        LessonTitles = new List<string>
                        {
                            "Xác định mục tiêu chiến dịch theo mô hình SMART",
                            "Lập ngân sách tiếp thị số và phân bổ kênh hiệu quả",
                            "Thiết lập phễu khách hàng (Marketing Funnel)",
                            "Tạo landing page tối ưu tỷ lệ chuyển đổi (CRO)"
                        }
                    },
                    new SectionTemplate
                    {
                        TieuDe = "Đo lường & Chỉ số đánh giá",
                        LessonTitles = new List<string>
                        {
                            "Hiểu về các chỉ số: CTR, CPC, CPA, ROI",
                            "Thiết lập Google Analytics 4 để theo dõi lượt truy cập",
                            "Tạo báo cáo chiến dịch đơn giản trên Excel/Google Sheets",
                            "Tối ưu hóa nội dung dựa trên số liệu thực tế"
                        }
                    }
                }
            },
            // 7. CCNA 200-301
            new CourseTemplate
            {
                TieuDe = "CCNA 200-301 cho người mới bắt đầu",
                DuongDanThanThien = "ccna-200-301-cho-nguoi-moi-bat-dau",
                MoTaNgan = "Mạng máy tính là hệ thống kết nối từ hai hoặc nhiều thiết bị lại với nhau.",
                MoTa = "Mạng máy tính là hệ thống kết nối từ hai hoặc nhiều thiết bị lại với nhau để trao đổi dữ liệu, chia sẻ tài nguyên và giao tiếp thông qua các giao thức mạng.",
                MoTaChiTiet = "Mạng máy tính là hệ thống kết nối từ hai hoặc nhiều thiết bị lại với nhau để trao đổi dữ liệu, chia sẻ tài nguyên và giao tiếp thông qua các giao thức mạng.",
                AnhDaiDien = "/uploads/images/ccna-cover.png",
                ChuyenMuc = "Mạng máy tính",
                TrinhDo = "BEGINNER",
                Gia = 3999000,
                DiemDanhGiaTrungBinh = 4.8,
                SoLuongDanhGia = 12,
                HangThanhVienToiThieu = "BRONZE",
                CacChuongHoc = new List<SectionTemplate>
                {
                    new SectionTemplate
                    {
                        TieuDe = "GIỚI THIỆU MẠNG MÁY TÍNH",
                        LessonTitles = new List<string>
                        {
                            "Mạng máy tính là gì?",
                            "Các loại mạng: LAN, WAN, MAN",
                            "Thiết bị mạng cơ bản: Router, Switch, Access Point",
                            "Mô hình OSI và TCP/IP",
                            "LAB: Kiểm tra kết nối mạng cơ bản"
                        }
                    },
                    new SectionTemplate
                    {
                        TieuDe = "SWITCHING",
                        LessonTitles = new List<string>
                        {
                            "Switch là gì và cách hoạt động",
                            "Địa chỉ MAC và bảng MAC Address Table",
                            "VLAN là gì?",
                            "Cấu hình VLAN cơ bản",
                            "Trunking và chuẩn 802.1Q",
                            "LAB: Cấu hình VLAN và Trunk trên Cisco Packet Tracer"
                        }
                    },
                    new SectionTemplate
                    {
                        TieuDe = "SECURITY",
                        LessonTitles = new List<string>
                        {
                            "Key security concepts",
                            "Port Security, VLAN Hopping, SPAN, BPDU Guard",
                            "LAB: Port Security, SPAN, BPDU Guard"
                        }
                    }
                }
            }
        };
    }
}
