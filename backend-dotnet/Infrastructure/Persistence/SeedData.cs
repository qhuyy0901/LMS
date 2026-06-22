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
            if (dm == null)
            {
                dm = new DanhMuc
                {
                    Id = Guid.NewGuid().ToString("N"),
                    Ten = name,
                    Slug = TroGiup.TaoSlug(name),
                    MoTa = $"Chuyên mục về {name}",
                    HoatDong = true,
                    NgayTao = now,
                    NgayCapNhat = now
                };
                db.DanhMuc.Add(dm);
                await db.SaveChangesAsync();
            }
            categoryMap[name] = dm.Id;
        }

        // Migrate existing courses' DanhMucId if empty
        var uncategorizedCourses = await db.KhoaHoc.Where(c => c.DanhMucId == null || c.DanhMucId == "").ToListAsync();
        if (uncategorizedCourses.Any())
        {
            foreach (var categoryName in uncategorizedCourses
                .Select(c => c.ChuyenMuc)
                .Where(name => !string.IsNullOrWhiteSpace(name))
                .Distinct(StringComparer.OrdinalIgnoreCase))
            {
                var dm = await LayHoacTaoDanhMuc(categoryName);
                categoryMap[categoryName] = dm.Id;
            }

            foreach (var course in uncategorizedCourses)
            {
                if (categoryMap.TryGetValue(course.ChuyenMuc, out var dmId))
                {
                    course.DanhMucId = dmId;
                }
                else
                {
                    // Create dynamic category for missing ones
                    var newCat = new DanhMuc
                    {
                        Id = Guid.NewGuid().ToString("N"),
                        Ten = course.ChuyenMuc,
                        Slug = TroGiup.TaoSlug(course.ChuyenMuc),
                        MoTa = $"Chuyên mục về {course.ChuyenMuc}",
                        HoatDong = true,
                        NgayTao = now,
                        NgayCapNhat = now
                    };
                    db.DanhMuc.Add(newCat);
                    await db.SaveChangesAsync();
                    categoryMap[course.ChuyenMuc] = newCat.Id;
                    course.DanhMucId = newCat.Id;
                }
            }
            await db.SaveChangesAsync();
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

            // Seed reviews for this course
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
                KhoaHocId = course.Id,
                NgayTao = now.AddDays(-random.Next(1, 10)),
                NgayCapNhat = now
            };
            db.DanhGiaKhoaHoc.Add(review);
        }

        await db.SaveChangesAsync();

        // Seed some enrollments for the student
        var studentCourses = await db.KhoaHoc.Take(3).ToListAsync();
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
                questions.Add(new QuestionTemplate {
                    NoiDungCauHoi = "Routing trong ASP.NET Core Web API thường được cấu hình qua cơ chế nào?",
                    CacLuaChon = new List<string> { "Attribute Routing", "Conventional Routing", "Static Routing", "Database Routing" },
                    DapAnDungIndex = 0,
                    GiaiThich = "Attribute Routing là cách cấu hình phổ biến nhất cho API bằng các attribute."
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
                questions.Add(new QuestionTemplate {
                    NoiDungCauHoi = "Hook nào dùng để quản lý state trong Functional Component?",
                    CacLuaChon = new List<string> { "useEffect", "useState", "useContext", "useReducer" },
                    DapAnDungIndex = 1,
                    GiaiThich = "useState là Hook cơ bản nhất giúp lưu trữ và cập nhật trạng thái trong Functional Component."
                });
            }
            else
            {
                questions.Add(new QuestionTemplate {
                    NoiDungCauHoi = "Để tránh re-render không cần thiết của component con trong React, ta nên dùng cơ chế nào?",
                    CacLuaChon = new List<string> { "React.memo", "useEffect", "useState", "useContext" },
                    DapAnDungIndex = 0,
                    GiaiThich = "React.memo là một higher-order component giúp ghi nhớ kết quả render của component con để tránh re-render khi props không đổi."
                });
                questions.Add(new QuestionTemplate {
                    NoiDungCauHoi = "Trong React Redux Toolkit, phương thức nào dùng để tạo một slice chứa reducer và actions?",
                    CacLuaChon = new List<string> { "createStore", "createSlice", "createAction", "createReducer" },
                    DapAnDungIndex = 1,
                    GiaiThich = "createSlice tự động sinh ra các action creators và action types tương ứng với các reducers."
                });
            }
        }
        else if (catLower.Contains("node"))
        {
            if (sectionPos == 1)
            {
                questions.Add(new QuestionTemplate {
                    NoiDungCauHoi = "Node.js chạy trên Engine JavaScript nào?",
                    CacLuaChon = new List<string> { "SpiderMonkey", "Chakra", "V8 của Google Chrome", "Rhino" },
                    DapAnDungIndex = 2,
                    GiaiThich = "Node.js được xây dựng dựa trên engine JavaScript V8 của Google Chrome."
                });
                questions.Add(new QuestionTemplate {
                    NoiDungCauHoi = "Framework phổ biến nhất để xây dựng web server trên Node.js là gì?",
                    CacLuaChon = new List<string> { "ExpressJS", "Django", "Spring Boot", "Laravel" },
                    DapAnDungIndex = 0,
                    GiaiThich = "ExpressJS là web framework tối giản và linh hoạt được sử dụng rộng rãi nhất trong Node.js."
                });
            }
            else
            {
                questions.Add(new QuestionTemplate {
                    NoiDungCauHoi = "Trong NestJS, decorator nào dùng để khai báo một Class là một Service có thể tiêm vào (Injectable)?",
                    CacLuaChon = new List<string> { "@Controller()", "@Module()", "@Injectable()", "@Service()" },
                    DapAnDungIndex = 2,
                    GiaiThich = "@Injectable() báo cho NestJS container biết Class này có thể được tiêm vào các class khác."
                });
            }
        }
        else if (catLower.Contains("python") || catLower.Contains("django"))
        {
            questions.Add(new QuestionTemplate {
                NoiDungCauHoi = "Từ khóa nào dùng để định nghĩa hàm trong Python?",
                CacLuaChon = new List<string> { "function", "void", "def", "func" },
                DapAnDungIndex = 2,
                GiaiThich = "Trong Python, bạn dùng từ khóa 'def' để bắt đầu định nghĩa một hàm."
            });
            questions.Add(new QuestionTemplate {
                NoiDungCauHoi = "Kiểu dữ liệu nào lưu trữ các cặp key-value trong Python?",
                CacLuaChon = new List<string> { "List", "Tuple", "Dictionary", "Set" },
                DapAnDungIndex = 2,
                GiaiThich = "Dictionary (dict) trong Python lưu trữ dưới dạng các cặp khóa-giá trị."
            });
        }
        else if (catLower.Contains("java") || catLower.Contains("spring"))
        {
            questions.Add(new QuestionTemplate {
                NoiDungCauHoi = "JVM là viết tắt của từ gì?",
                CacLuaChon = new List<string> { "Java Virtual Machine", "Java Version Manager", "Java Variable Method", "Java Virtual Method" },
                DapAnDungIndex = 0,
                GiaiThich = "JVM (Java Virtual Machine) là trình ảo hóa thực thi mã bytecode của Java."
            });
            questions.Add(new QuestionTemplate {
                NoiDungCauHoi = "Từ khóa nào được dùng để kế thừa một Class khác trong Java?",
                CacLuaChon = new List<string> { "implements", "extends", "inherits", "parent" },
                DapAnDungIndex = 1,
                GiaiThich = "Dùng extends cho kế thừa class trong Java."
            });
        }
        else if (catLower.Contains("ai") || catLower.Contains("machine") || catLower.Contains("data"))
        {
            questions.Add(new QuestionTemplate {
                NoiDungCauHoi = "Thư viện Python nào phổ biến nhất cho tính toán mảng và ma trận?",
                CacLuaChon = new List<string> { "Pandas", "Matplotlib", "NumPy", "Scikit-Learn" },
                DapAnDungIndex = 2,
                GiaiThich = "NumPy cung cấp các cấu trúc mảng đa chiều hiệu năng cao cho Python."
            });
            questions.Add(new QuestionTemplate {
                NoiDungCauHoi = "Thuật toán K-Means là thuật toán thuộc nhóm nào?",
                CacLuaChon = new List<string> { "Học có giám sát", "Học không giám sát", "Học tăng cường", "Mạng nơ-ron sâu" },
                DapAnDungIndex = 1,
                GiaiThich = "K-Means là thuật toán thuộc nhóm Học không giám sát (Unsupervised Learning)."
            });
        }
        else if (catLower.Contains("mạng") || catLower.Contains("ccna"))
        {
            questions.Add(new QuestionTemplate {
                NoiDungCauHoi = "Mô hình OSI có bao nhiêu tầng?",
                CacLuaChon = new List<string> { "4", "5", "7 (Physical, Data Link, Network, Transport, Session, Presentation, Application)", "9" },
                DapAnDungIndex = 2,
                GiaiThich = "Mô hình OSI chuẩn có 7 tầng."
            });
            questions.Add(new QuestionTemplate {
                NoiDungCauHoi = "Thiết bị nào hoạt động ở tầng 3 (Network) của mô hình OSI?",
                CacLuaChon = new List<string> { "Hub", "Switch L2", "Router", "Repeater" },
                DapAnDungIndex = 2,
                GiaiThich = "Router xử lý địa chỉ IP (tầng 3) để định tuyến các gói tin."
            });
        }
        else if (catLower.Contains("marketing"))
        {
            questions.Add(new QuestionTemplate {
                NoiDungCauHoi = "SEO là viết tắt của từ gì?",
                CacLuaChon = new List<string> { "Search Engine Optimization", "Social Engine Optimization", "Site Efficiency Optimization", "Social Engagement Opportunity" },
                DapAnDungIndex = 0,
                GiaiThich = "SEO là tối ưu hóa công cụ tìm kiếm."
            });
        }
        else if (catLower.Contains("ui") || catLower.Contains("ux"))
        {
            questions.Add(new QuestionTemplate {
                NoiDungCauHoi = "UI là viết tắt của từ gì?",
                CacLuaChon = new List<string> { "User Interaction", "User Interface (Giao diện người dùng)", "User Integration", "User Identity" },
                DapAnDungIndex = 1,
                GiaiThich = "UI (User Interface) là giao diện người dùng hiển thị trực quan."
            });
            questions.Add(new QuestionTemplate {
                NoiDungCauHoi = "Công cụ thiết kế UI/UX phổ biến nhất hiện nay là gì?",
                CacLuaChon = new List<string> { "Photoshop", "Illustrator", "Figma", "CorelDraw" },
                DapAnDungIndex = 2,
                GiaiThich = "Figma là công cụ thiết kế UI/UX phổ biến nhất hiện nay."
            });
        }

        if (questions.Count == 0)
        {
            questions.Add(new QuestionTemplate {
                NoiDungCauHoi = $"Bài kiểm tra tổng hợp kiến thức về {category}",
                CacLuaChon = new List<string> { "Đáp án A (Đúng)", "Đáp án B", "Đáp án C", "Đáp án D" },
                DapAnDungIndex = 0,
                GiaiThich = "Chúc mừng bạn chọn đúng đáp án A."
            });
            questions.Add(new QuestionTemplate {
                NoiDungCauHoi = "Hãy chọn đáp án đúng nhất để hoàn thành bài học này:",
                CacLuaChon = new List<string> { "Lựa chọn 1", "Lựa chọn 2 (Đúng)", "Lựa chọn 3", "Lựa chọn 4" },
                DapAnDungIndex = 1,
                GiaiThich = "Lựa chọn 2 là câu trả lời chính xác dựa trên bài giảng."
            });
        }

        return questions;
    }

    private static List<CourseTemplate> GetTemplates()
    {
        return new List<CourseTemplate>
        {
            // 1. ASP.NET Core
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
            new CourseTemplate
            {
                TieuDe = "ASP.NET Core MVC từ cơ bản đến nâng cao",
                DuongDanThanThien = "aspnet-core-mvc-co-ban-den-nang-cao",
                MoTaNgan = "Học mô hình MVC, Razor View Engine và kết nối database xây dựng website bán hàng.",
                MoTa = "Khóa học dẫn dắt bạn qua toàn bộ các khía cạnh của mô hình MVC trong ASP.NET Core. Thích hợp cho người bắt đầu làm quen với lập trình Web.",
                MoTaChiTiet = "Bạn sẽ tự tay code một website thương mại điện tử hoàn chỉnh từ trang quản trị (Admin) đến giao diện khách hàng, xử lý giỏ hàng và thanh toán trực tuyến.",
                ChuyenMuc = "ASP.NET Core",
                TrinhDo = "BEGINNER",
                Gia = 399000,
                DiemDanhGiaTrungBinh = 4.7,
                SoLuongDanhGia = 28,
                HangThanhVienToiThieu = "BRONZE",
                AnhDaiDien = "https://images.unsplash.com/photo-1542831371-29b0f74f9713?w=600&auto=format&fit=crop",
                CacChuongHoc = new List<SectionTemplate>
                {
                    new SectionTemplate
                    {
                        TieuDe = "Làm quen với mô hình MVC",
                        LessonTitles = new List<string>
                        {
                            "Kiến trúc MVC là gì?",
                            "Cách hoạt động của Route Engine",
                            "Tạo Controller và Action",
                            "Sử dụng ViewData, ViewBag và TempData"
                        }
                    },
                    new SectionTemplate
                    {
                        TieuDe = "View & Razor View Engine",
                        LessonTitles = new List<string>
                        {
                            "Cú pháp Razor cơ bản",
                            "Tạo Layout Page và Partial Views",
                            "Sử dụng Tag Helpers để tạo Form",
                            "Xử lý Validation phía Client"
                        }
                    },
                    new SectionTemplate
                    {
                        TieuDe = "Làm việc với cơ sở dữ liệu",
                        LessonTitles = new List<string>
                        {
                            "Kết nối Database với EF Core",
                            "Thực hiện CRUD cho bảng Sản phẩm",
                            "Sử dụng ViewComponent để chia nhỏ giao diện",
                            "Triển khai Web lên Hosting IIS"
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
            new CourseTemplate
            {
                TieuDe = "ReactJS nâng cao: Quản lý State với Redux Toolkit",
                DuongDanThanThien = "reactjs-nang-cao-redux-toolkit",
                MoTaNgan = "Học tối ưu render Component, Custom Hooks và kiến trúc Redux Toolkit chuyên nghiệp.",
                MoTa = "Dành cho các nhà phát triển React muốn nâng cao kỹ năng xử lý các ứng dụng quy mô lớn, tối ưu hóa hiệu năng render và cấu trúc code khoa học.",
                MoTaChiTiet = "Chúng ta sẽ đi sâu vào cơ chế tối ưu render, viết custom hook tái sử dụng, và tích hợp RTK Query để quản lý cache API hoàn hảo.",
                ChuyenMuc = "ReactJS",
                TrinhDo = "ADVANCED",
                Gia = 599000,
                DiemDanhGiaTrungBinh = 4.9,
                SoLuongDanhGia = 20,
                HangThanhVienToiThieu = "GOLD",
                AnhDaiDien = "https://images.unsplash.com/photo-1627398242454-45a1465c2079?w=600&auto=format&fit=crop",
                CacChuongHoc = new List<SectionTemplate>
                {
                    new SectionTemplate
                    {
                        TieuDe = "Kiến trúc Component & Performance Optimization",
                        LessonTitles = new List<string>
                        {
                            "Các React design patterns phổ biến",
                            "Tối ưu hóa render với memo, useMemo và useCallback Hooks",
                            "Lazy Loading và Code Splitting với Suspense",
                            "Xử lý Custom Hooks cho logic tái sử dụng"
                        }
                    },
                    new SectionTemplate
                    {
                        TieuDe = "Redux Toolkit cốt lõi",
                        LessonTitles = new List<string>
                        {
                            "Tại sao cần Redux trong dự án lớn?",
                            "Cài đặt và thiết lập Store với Redux Toolkit",
                            "Tạo Slice, Actions và Reducers",
                            "Kết nối React Component với Redux Store"
                        }
                    },
                    new SectionTemplate
                    {
                        TieuDe = "Xử lý Async Actions & Middleware",
                        LessonTitles = new List<string>
                        {
                            "Call API bất đồng bộ với createAsyncThunk",
                            "Quản lý State của API (loading, success, error)",
                            "Giới thiệu RTK Query để tối ưu hóa caching",
                            "Thực hành xây dựng giỏ hàng hoàn chỉnh"
                        }
                    }
                }
            },

            // 3. NodeJS
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
            new CourseTemplate
            {
                TieuDe = "NodeJS nâng cao: NestJS Framework & TypeScript",
                DuongDanThanThien = "nestjs-framework-typescript-nang-cao",
                MoTaNgan = "Kiến trúc doanh nghiệp NestJS, kết nối PostgreSQL với TypeORM và viết Unit Test.",
                MoTa = "Học NestJS - framework Node.js có cấu trúc rõ ràng, hỗ trợ TypeScript tuyệt hảo, phù hợp cho các dự án lớn, phức tạp của doanh nghiệp.",
                MoTaChiTiet = "Tìm hiểu Dependency Injection sâu rộng, viết custom guards, interceptors, và làm việc chuyên sâu với TypeORM và microservices.",
                ChuyenMuc = "NodeJS",
                TrinhDo = "ADVANCED",
                Gia = 699000,
                DiemDanhGiaTrungBinh = 4.9,
                SoLuongDanhGia = 18,
                HangThanhVienToiThieu = "GOLD",
                AnhDaiDien = "https://images.unsplash.com/photo-1507721999472-8ed4421c4b2e?w=600&auto=format&fit=crop",
                CacChuongHoc = new List<SectionTemplate>
                {
                    new SectionTemplate
                    {
                        TieuDe = "Làm quen với NestJS",
                        LessonTitles = new List<string>
                        {
                            "Tại sao nên chọn NestJS cho dự án Node.js?",
                            "Kiến trúc Module, Controller và Service trong NestJS",
                            "Sử dụng TypeScript để quản lý kiểu dữ liệu chặt chẽ",
                            "Cơ chế Dependency Injection trong NestJS"
                        }
                    },
                    new SectionTemplate
                    {
                        TieuDe = "Kết nối Database & Validations",
                        LessonTitles = new List<string>
                        {
                            "Sử dụng TypeORM kết nối PostgreSQL / MySQL",
                            "Tạo Entity và thực hiện Relations (One-to-Many, Many-to-Many)",
                            "Validation dữ liệu đầu vào bằng DTO và ValidationPipe",
                            "Xử lý exception toàn cục bằng Exception Filters"
                        }
                    },
                    new SectionTemplate
                    {
                        TieuDe = "Bảo mật & Microservices",
                        LessonTitles = new List<string>
                        {
                            "Tích hợp Passport và JWT Guard",
                            "Phân quyền theo Role-based Access Control (RBAC)",
                            "Giới thiệu kiến trúc Microservices trong NestJS",
                            "Viết Unit Test cho Controller và Service với Jest"
                        }
                    }
                }
            },

            // 4. Python
            new CourseTemplate
            {
                TieuDe = "Lập trình Python cơ bản cho người mới bắt đầu",
                DuongDanThanThien = "lap-trinh-python-co-ban-moi-bat-dau",
                MoTaNgan = "Học biến, vòng lặp, hàm, cấu trúc dữ liệu và lập trình hướng đối tượng căn bản.",
                MoTa = "Khóa học lập trình Python toàn diện, dễ tiếp cận nhất cho người chưa có kinh nghiệm. Phù hợp làm nền tảng trước khi học AI hay Data Science.",
                MoTaChiTiet = "Bạn sẽ học cách lập trình giải quyết các bài toán logic và thực hành xây dựng các ứng dụng console đơn giản nhưng thú vị.",
                ChuyenMuc = "Python",
                TrinhDo = "BEGINNER",
                Gia = 199000,
                DiemDanhGiaTrungBinh = 4.6,
                SoLuongDanhGia = 50,
                HangThanhVienToiThieu = "BRONZE",
                AnhDaiDien = "https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=600&auto=format&fit=crop",
                CacChuongHoc = new List<SectionTemplate>
                {
                    new SectionTemplate
                    {
                        TieuDe = "Cú pháp & Biến cơ bản",
                        LessonTitles = new List<string>
                        {
                            "Tại sao nên học Python?",
                            "Cài đặt Python và chạy Hello World",
                            "Kiểu dữ liệu, Biến và Cú pháp cơ bản",
                            "Các cấu trúc điều kiện (if, elif, else)"
                        }
                    },
                    new SectionTemplate
                    {
                        TieuDe = "Cấu trúc lặp & Tập hợp dữ liệu",
                        LessonTitles = new List<string>
                        {
                            "Vòng lặp for và while",
                            "Làm việc với List và Tuple",
                            "Làm việc với Dictionary và Set",
                            "Định nghĩa và gọi Hàm trong Python"
                        }
                    },
                    new SectionTemplate
                    {
                        TieuDe = "Thao tác File & Lập trình hướng đối tượng cơ bản",
                        LessonTitles = new List<string>
                        {
                            "Đọc và ghi file văn bản",
                            "Khái niệm Class và Object cơ bản",
                            "Xử lý ngoại lệ (Try-Except)",
                            "Thực hành xây dựng game Tic-Tac-Toe bằng Python console"
                        }
                    }
                }
            },
            new CourseTemplate
            {
                TieuDe = "Lập trình Web với Python Django Framework",
                DuongDanThanThien = "lap-trinh-web-python-django",
                MoTaNgan = "Học cấu trúc dự án Django, Django ORM, Admin Panel và thiết lập REST API.",
                MoTa = "Học cách xây dựng website nhanh chóng và bảo mật với Django - framework phát triển web phổ biến nhất của Python.",
                MoTaChiTiet = "Chúng ta sẽ thiết kế database bằng Model, chạy migration, tạo giao diện người dùng và thiết lập API nhanh chóng với Django REST Framework.",
                ChuyenMuc = "Python",
                TrinhDo = "INTERMEDIATE",
                Gia = 459000,
                DiemDanhGiaTrungBinh = 4.7,
                SoLuongDanhGia = 22,
                HangThanhVienToiThieu = "SILVER",
                AnhDaiDien = "https://images.unsplash.com/photo-1581291518633-83b4ebd1d83e?w=600&auto=format&fit=crop",
                CacChuongHoc = new List<SectionTemplate>
                {
                    new SectionTemplate
                    {
                        TieuDe = "Kiến trúc MVT trong Django",
                        LessonTitles = new List<string>
                        {
                            "Django Framework là gì và cách khởi tạo dự án",
                            "Hiểu luồng dữ liệu URL, View, Model (MVT)",
                            "Sử dụng Django Template Engine để tạo giao diện",
                            "Cấu hình Database SQLite mặc định"
                        }
                    },
                    new SectionTemplate
                    {
                        TieuDe = "Django ORM & Admin Panel",
                        LessonTitles = new List<string>
                        {
                            "Định nghĩa Model và chạy Migrations",
                            "Truy vấn dữ liệu thông qua Django ORM",
                            "Tự tùy biến trang quản trị Django Admin",
                            "Xử lý Form và ModelForm trong Django"
                        }
                    },
                    new SectionTemplate
                    {
                        TieuDe = "Authentication & Django REST Framework",
                        LessonTitles = new List<string>
                        {
                            "Hệ thống đăng nhập mặc định của Django",
                            "Giới thiệu Django REST Framework để xây dựng API",
                            "Tạo Serializer và API Views",
                            "Deploy dự án Django lên PythonAnywhere"
                        }
                    }
                }
            },

            // 5. Java
            new CourseTemplate
            {
                TieuDe = "Lập trình Java core từ cơ bản đến hướng đối tượng",
                DuongDanThanThien = "lap-trinh-java-core-co-ban-oop",
                MoTaNgan = "Làm quen cú pháp Java, kiểu dữ liệu, các nguyên lý OOP cốt lõi và Java Collections.",
                MoTa = "Khóa học nền tảng vững chắc nhất về Java, giúp bạn làm chủ 4 tính chất của Lập trình hướng đối tượng (OOP) và cấu trúc dữ liệu Collections.",
                MoTaChiTiet = "Khóa học chuẩn bị cho bạn các kỹ năng cần thiết trước khi bước vào lập trình web doanh nghiệp hoặc lập trình app Android.",
                ChuyenMuc = "Java",
                TrinhDo = "BEGINNER",
                Gia = 299000,
                DiemDanhGiaTrungBinh = 4.6,
                SoLuongDanhGia = 44,
                HangThanhVienToiThieu = "BRONZE",
                AnhDaiDien = "https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=600&auto=format&fit=crop",
                CacChuongHoc = new List<SectionTemplate>
                {
                    new SectionTemplate
                    {
                        TieuDe = "Cú pháp cơ bản & Cấu trúc lập trình",
                        LessonTitles = new List<string>
                        {
                            "Cơ chế biên dịch và máy ảo Java (JVM)",
                            "Cài đặt JDK và IDE IntelliJ",
                            "Khai báo biến, Hằng và Kiểu dữ liệu",
                            "Câu lệnh điều kiện và vòng lặp trong Java"
                        }
                    },
                    new SectionTemplate
                    {
                        TieuDe = "Lập trình hướng đối tượng (OOP) cốt lõi",
                        LessonTitles = new List<string>
                        {
                            "Khái niệm Class, Object và Constructor",
                            "Tính Đóng gói (Encapsulation) và Kế thừa (Inheritance)",
                            "Tính Đa hình (Polymorphism) và nạp chồng/ghi đè",
                            "Trừu tượng (Abstraction) với Abstract Class và Interface"
                        }
                    },
                    new SectionTemplate
                    {
                        TieuDe = "Collections & Xử lý ngoại lệ",
                        LessonTitles = new List<string>
                        {
                            "Làm việc với List, Set, Map trong Java",
                            "Xử lý Exception với try-catch-finally",
                            "Đọc ghi file nhị phân và file text",
                            "Thực hành xây dựng phần mềm Quản lý học sinh bằng Java"
                        }
                    }
                }
            },
            new CourseTemplate
            {
                TieuDe = "Lập trình Backend với Spring Boot thực chiến",
                DuongDanThanThien = "lap-trinh-spring-boot-thuc-chien",
                MoTaNgan = "Thiết lập dự án Spring Boot, Spring Data JPA, Spring Security và bảo mật JWT.",
                MoTa = "Học cách xây dựng các hệ thống API có tính chịu tải cao và bảo mật bằng Spring Boot - framework hàng đầu của Java.",
                MoTaChiTiet = "Đi sâu vào Dependency Injection, Hibernate/JPA, bảo mật với JWT và cách triển khai dự án doanh nghiệp thực tế.",
                ChuyenMuc = "Java",
                TrinhDo = "INTERMEDIATE",
                Gia = 599000,
                DiemDanhGiaTrungBinh = 4.9,
                SoLuongDanhGia = 27,
                HangThanhVienToiThieu = "SILVER",
                AnhDaiDien = "https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=600&auto=format&fit=crop",
                CacChuongHoc = new List<SectionTemplate>
                {
                    new SectionTemplate
                    {
                        TieuDe = "Spring Boot cơ bản & Dependency Injection",
                        LessonTitles = new List<string>
                        {
                            "Giới thiệu Spring Ecosystem và Spring Boot",
                            "Tạo dự án Spring Boot đầu tiên với Spring Initializr",
                            "Hiểu IoC (Inversion of Control) và Dependency Injection",
                            "Cấu hình ứng dụng qua file application.properties"
                        }
                    },
                    new SectionTemplate
                    {
                        TieuDe = "REST API & JPA/Hibernate",
                        LessonTitles = new List<string>
                        {
                            "Tạo REST Controller với @RestController",
                            "Kết nối MySQL Database dùng Spring Data JPA",
                            "Viết truy vấn nâng cao với JPQL và Native Query",
                            "Validation dữ liệu đầu vào với Jakarta Validation"
                        }
                    },
                    new SectionTemplate
                    {
                        TieuDe = "Bảo mật & Triển khai",
                        LessonTitles = new List<string>
                        {
                            "Tích hợp Spring Security và JWT",
                            "Xử lý phân quyền truy cập chi tiết cho API",
                            "Viết Unit Test cho Service dùng JUnit 5 và Mockito",
                            "Đóng gói ứng dụng thành file JAR và chạy trên Server"
                        }
                    }
                }
            },

            // 6. AI
            new CourseTemplate
            {
                TieuDe = "Nhập môn Trí tuệ Nhân tạo (AI) và Machine Learning",
                DuongDanThanThien = "nhap-mon-ai-machine-learning",
                MoTaNgan = "Học thuật toán học có giám sát, không giám sát và đánh giá mô hình học máy với Python.",
                MoTa = "Khóa học giới thiệu khái niệm cốt lõi về Trí tuệ nhân tạo, Machine Learning và các ứng dụng thực tế của chúng.",
                MoTaChiTiet = "Bạn sẽ học cách lập trình và chạy thử các mô hình dự đoán từ dữ liệu thực tế bằng thư viện Scikit-Learn của Python.",
                ChuyenMuc = "AI",
                TrinhDo = "BEGINNER",
                Gia = 399000,
                DiemDanhGiaTrungBinh = 4.7,
                SoLuongDanhGia = 33,
                HangThanhVienToiThieu = "BRONZE",
                AnhDaiDien = "https://images.unsplash.com/photo-1677442136019-21780efad99a?w=600&auto=format&fit=crop",
                CacChuongHoc = new List<SectionTemplate>
                {
                    new SectionTemplate
                    {
                        TieuDe = "Tổng quan AI & Thuật toán học có giám sát",
                        LessonTitles = new List<string>
                        {
                            "Trí tuệ nhân tạo là gì? Phân biệt AI, ML và DL",
                            "Cài đặt Anaconda và sử dụng Jupyter Notebook",
                            "Hồi quy tuyến tính (Linear Regression) cơ bản",
                            "Thuật toán phân lớp KNN và Decision Tree"
                        }
                    },
                    new SectionTemplate
                    {
                        TieuDe = "Học không giám sát & Đánh giá mô hình",
                        LessonTitles = new List<string>
                        {
                            "Thuật toán phân cụm K-Means",
                            "Cách đánh giá mô hình phân lớp (Accuracy, Precision, Recall, F1)",
                            "Giảm chiều dữ liệu với PCA",
                            "Sử dụng thư viện Scikit-Learn thực hành"
                        }
                    },
                    new SectionTemplate
                    {
                        TieuDe = "Học sâu & Trực quan hóa dữ liệu AI",
                        LessonTitles = new List<string>
                        {
                            "Giới thiệu mạng nơ-ron nhân tạo (ANN)",
                            "Thực hành xây dựng mô hình dự báo giá nhà",
                            "Sử dụng Matplotlib và Seaborn để vẽ biểu đồ kết quả",
                            "Định hướng phát triển nghề nghiệp trong ngành AI"
                        }
                    }
                }
            },
            new CourseTemplate
            {
                TieuDe = "Phát triển ứng dụng Generative AI với OpenAI API & LangChain",
                DuongDanThanThien = "phat-trien-ung-dung-generative-ai-langchain",
                MoTaNgan = "Học Prompt Engineering nâng cao, xây dựng ứng dụng chatbot RAG hỏi đáp trên file PDF.",
                MoTa = "Làm chủ Generative AI - công nghệ cách mạng hiện nay. Học cách kết nối OpenAI API, thiết kế Prompt chuyên nghiệp và sử dụng LangChain xây dựng chatbot.",
                MoTaChiTiet = "Chúng ta sẽ cùng làm một ứng dụng hoàn chỉnh tích hợp Vector Database để trả lời thông minh dựa trên tài liệu cá nhân.",
                ChuyenMuc = "AI",
                TrinhDo = "ADVANCED",
                Gia = 799000,
                DiemDanhGiaTrungBinh = 4.9,
                SoLuongDanhGia = 22,
                HangThanhVienToiThieu = "DIAMOND",
                AnhDaiDien = "https://images.unsplash.com/photo-1620712943543-bcc4688e7485?w=600&auto=format&fit=crop",
                CacChuongHoc = new List<SectionTemplate>
                {
                    new SectionTemplate
                    {
                        TieuDe = "Khái niệm Generative AI & OpenAI API",
                        LessonTitles = new List<string>
                        {
                            "Generative AI là gì? Hiểu về LLMs",
                            "Cách lấy API Key và tích hợp OpenAI SDK",
                            "Kỹ thuật viết Prompt hiệu quả (Prompt Engineering)",
                            "Xử lý tham số temperature, max_tokens để kiểm soát kết quả"
                        }
                    },
                    new SectionTemplate
                    {
                        TieuDe = "LangChain Framework",
                        LessonTitles = new List<string>
                        {
                            "Giới thiệu LangChain và các module chính",
                            "Sử dụng PromptTemplates để tái cấu trúc câu lệnh",
                            "Tạo Chains để liên kết nhiều LLM calls",
                            "Quản lý lịch sử hội thoại với Memory"
                        }
                    },
                    new SectionTemplate
                    {
                        TieuDe = "Xây dựng ứng dụng RAG (Retrieval-Augmented Generation)",
                        LessonTitles = new List<string>
                        {
                            "Hiểu về Vector Databases và Embeddings",
                            "Sử dụng FAISS / Pinecone làm cơ sở dữ liệu tri thức",
                            "Xây dựng ứng dụng Chatbot hỏi đáp trên tài liệu PDF cá nhân",
                            "Deploy ứng dụng AI lên Streamlit Cloud"
                        }
                    }
                }
            },
            new CourseTemplate
            {
                TieuDe = "Ứng dụng AI nâng cao trong sáng tạo nội dung và thiết kế",
                DuongDanThanThien = "ung-dung-ai-sang-tao-noi-dung-thiet-ke",
                MoTaNgan = "Làm chủ ChatGPT, Midjourney, Stable Diffusion và ElevenLabs sản xuất video & ảnh.",
                MoTa = "Dành cho nhà sáng tạo nội dung, nhà thiết kế muốn nhân 10 tốc độ làm việc nhờ sự trợ giúp của các công cụ Generative AI.",
                MoTaChiTiet = "Khóa học tập trung thực hành tạo ảnh nghệ thuật, giọng đọc AI tự nhiên và biên tập video tự động.",
                ChuyenMuc = "AI",
                TrinhDo = "INTERMEDIATE",
                Gia = 359000,
                DiemDanhGiaTrungBinh = 4.8,
                SoLuongDanhGia = 37,
                HangThanhVienToiThieu = "SILVER",
                AnhDaiDien = "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=600&auto=format&fit=crop",
                CacChuongHoc = new List<SectionTemplate>
                {
                    new SectionTemplate
                    {
                        TieuDe = "Sản xuất văn bản & kịch bản thông minh",
                        LessonTitles = new List<string>
                        {
                            "Dùng ChatGPT & Claude để viết bài SEO chuẩn",
                            "Dịch thuật và địa phương hóa nội dung bằng AI",
                            "Tạo kịch bản video ngắn tự động lên xu hướng",
                            "Biên tập và chuẩn hóa giọng văn của thương hiệu"
                        }
                    },
                    new SectionTemplate
                    {
                        TieuDe = "Thiết kế hình ảnh và đồ họa với AI",
                        LessonTitles = new List<string>
                        {
                            "Làm quen với Midjourney và cách viết Prompt",
                            "Tạo ảnh thiết kế nhanh với Stable Diffusion và Canva AI",
                            "Chỉnh sửa ảnh chuyên nghiệp bằng công cụ Generative Fill",
                            "Tạo avatar AI đại diện thương hiệu"
                        }
                    },
                    new SectionTemplate
                    {
                        TieuDe = "Tạo video và âm thanh tự động",
                        LessonTitles = new List<string>
                        {
                            "Dùng Runway / Pika để chuyển văn bản thành video ngắn",
                            "Tạo giọng đọc AI tự nhiên bằng ElevenLabs",
                            "Xây dựng quy trình tự động hóa sản xuất video ngắn",
                            "Kiểm thử bản quyền và xuất bản nội dung AI"
                        }
                    }
                }
            },
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

            // 7. Data Science
            new CourseTemplate
            {
                TieuDe = "Khoa học dữ liệu: Từ cơ bản đến trực quan hóa",
                DuongDanThanThien = "khoa-hoc-du-lieu-truc-quan-hoa",
                MoTaNgan = "Thống kê toán học, biến đổi dữ liệu với Pandas và vẽ biểu đồ Plotly sinh động.",
                MoTa = "Nắm bắt các nguyên lý toán học thống kê và cách chuyển đổi số liệu thô thành những biểu đồ báo cáo ý nghĩa, hỗ trợ quyết định kinh doanh.",
                MoTaChiTiet = "Phù hợp cho các bạn muốn chuyển ngành sang Data Analyst hoặc Data Scientist mà chưa có nền tảng sâu về toán.",
                ChuyenMuc = "Data Science",
                TrinhDo = "BEGINNER",
                Gia = 349000,
                DiemDanhGiaTrungBinh = 4.6,
                SoLuongDanhGia = 41,
                HangThanhVienToiThieu = "BRONZE",
                AnhDaiDien = "https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=600&auto=format&fit=crop",
                CacChuongHoc = new List<SectionTemplate>
                {
                    new SectionTemplate
                    {
                        TieuDe = "Toán học & Xác suất thống kê trong Data Science",
                        LessonTitles = new List<string>
                        {
                            "Tầm quan trọng của thống kê trong phân tích dữ liệu",
                            "Các chỉ số cơ bản: Mean, Median, Mode, Standard Deviation",
                            "Đại số tuyến tính cơ bản: Vector và Matrix",
                            "Hiểu về phân phối chuẩn (Normal Distribution)"
                        }
                    },
                    new SectionTemplate
                    {
                        TieuDe = "Làm sạch & Biến đổi dữ liệu với Pandas",
                        LessonTitles = new List<string>
                        {
                            "Thao tác trên DataFrame trong Pandas",
                            "Lọc, gom nhóm (Group By) và nối bảng (Merge/Join)",
                            "Xử lý dữ liệu bị khuyết (Handling Missing Values)",
                            "Chuyển đổi kiểu dữ liệu và chuẩn hóa dữ liệu số"
                        }
                    },
                    new SectionTemplate
                    {
                        TieuDe = "Trực quan hóa Insight",
                        LessonTitles = new List<string>
                        {
                            "Vẽ biểu đồ phân bố, biểu đồ đường, biểu đồ cột",
                            "Tạo biểu đồ tương tác với Plotly",
                            "Xây dựng báo cáo dữ liệu hoàn chỉnh (Data Storytelling)",
                            "Lập kế hoạch phân tích cho một dự án thực tế"
                        }
                    }
                }
            },
            new CourseTemplate
            {
                TieuDe = "Thực hành Data Science chuyên sâu với Python",
                DuongDanThanThien = "thuc-hanh-data-science-chuyen-sau",
                MoTaNgan = "Cào dữ liệu web (Scraping), xử lý dữ liệu lớn, Feature Engineering và tối ưu hóa GridSearch.",
                MoTa = "Khóa học thực hành chuyên sâu tập trung vào kỹ năng xử lý dữ liệu phức tạp, thu thập dữ liệu tự động và xây dựng pipeline học máy chuyên nghiệp.",
                MoTaChiTiet = "Bạn sẽ được cào dữ liệu từ các website thật, tối ưu hóa các tham số mô hình thông qua GridSearchCV.",
                ChuyenMuc = "Data Science",
                TrinhDo = "INTERMEDIATE",
                Gia = 499000,
                DiemDanhGiaTrungBinh = 4.8,
                SoLuongDanhGia = 29,
                HangThanhVienToiThieu = "SILVER",
                AnhDaiDien = "https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=600&auto=format&fit=crop",
                CacChuongHoc = new List<SectionTemplate>
                {
                    new SectionTemplate
                    {
                        TieuDe = "Thu thập dữ liệu & Web Scraping",
                        LessonTitles = new List<string>
                        {
                            "Thu thập dữ liệu từ các API công khai",
                            "Cào dữ liệu từ trang web bằng BeautifulSoup và Selenium",
                            "Đọc ghi dữ liệu định dạng JSON, XML, SQL",
                            "Xử lý lưu trữ dữ liệu khối lượng lớn"
                        }
                    },
                    new SectionTemplate
                    {
                        TieuDe = "Kỹ nghệ đặc trưng (Feature Engineering)",
                        LessonTitles = new List<string>
                        {
                            "Lựa chọn đặc trưng (Feature Selection)",
                            "Mã hóa biến phân loại (One-Hot, Label Encoding)",
                            "Tạo các đặc trưng mới từ dữ liệu thời gian",
                            "Xử lý mất cân bằng dữ liệu với SMOTE"
                        }
                    },
                    new SectionTemplate
                    {
                        TieuDe = "Xây dựng & Tối ưu mô hình ML",
                        LessonTitles = new List<string>
                        {
                            "Phân tách tập Train/Test và Cross Validation",
                            "Tìm kiếm tham số tốt nhất với GridSearchCV",
                            "Đánh giá mô hình bằng ROC-AUC và Precision-Recall Curve",
                            "Thực hành làm dự án dự đoán tỷ lệ rời bỏ khách hàng"
                        }
                    }
                }
            },

            // 8. Mạng máy tính
            new CourseTemplate
            {
                TieuDe = "Quản trị mạng máy tính: CCNA 200-301 nâng cao",
                DuongDanThanThien = "quan-tri-mang-ccna-nang-cao",
                MoTaNgan = "Cấu hình định tuyến OSPF, thiết lập ACL bảo mật và NAT chuyển đổi IP.",
                MoTa = "Tiếp nối phần cơ bản, khóa học đi sâu vào kỹ năng thực hành cấu hình thiết bị mạng Cisco thật, định tuyến động và tối ưu hóa bảo mật hệ thống mạng nội bộ.",
                MoTaChiTiet = "Bạn sẽ làm chủ OSPFv2, Access Control List, NAT và chẩn đoán sự cố mạng bằng các lệnh Cisco IOS nâng cao.",
                ChuyenMuc = "Mạng máy tính",
                TrinhDo = "INTERMEDIATE",
                Gia = 459000,
                DiemDanhGiaTrungBinh = 4.8,
                SoLuongDanhGia = 26,
                HangThanhVienToiThieu = "SILVER",
                AnhDaiDien = "https://images.unsplash.com/photo-1544197150-b99a580bb7a8?w=600&auto=format&fit=crop",
                CacChuongHoc = new List<SectionTemplate>
                {
                    new SectionTemplate
                    {
                        TieuDe = "Định tuyến nâng cao & OSPF",
                        LessonTitles = new List<string>
                        {
                            "Định tuyến tĩnh và định tuyến động",
                            "Cấu hình giao thức định tuyến OSPFv2 đơn vùng",
                            "Hiểu về bảng định tuyến và cơ chế so khớp địa chỉ IP",
                            "Cấu hình Router-on-a-stick để định tuyến giữa các VLAN"
                        }
                    },
                    new SectionTemplate
                    {
                        TieuDe = "Giao thức bảo mật & NAT",
                        LessonTitles = new List<string>
                        {
                            "Hiểu cách hoạt động của NAT tĩnh và NAT động",
                            "Cấu hình Access Control List để lọc gói tin",
                            "Bảo mật cổng mạng (Port Security) trên Switch",
                            "Cấu hình dịch vụ DHCP tự động cấp IP cho doanh nghiệp"
                        }
                    },
                    new SectionTemplate
                    {
                        TieuDe = "Dịch vụ mạng WAN & Khắc phục sự cố",
                        LessonTitles = new List<string>
                        {
                            "Tìm hiểu công nghệ mạng WAN: VPN, MPLS, SD-WAN",
                            "Sử dụng công cụ Ping và Traceroute để chẩn đoán",
                            "Các lệnh show thông dụng của Cisco IOS để debug",
                            "LAB tổng hợp: Xây dựng sơ đồ mạng đa chi nhánh"
                        }
                    }
                }
            },
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

            // 9. UI/UX
            new CourseTemplate
            {
                TieuDe = "Tư duy thiết kế UI/UX thực chiến",
                DuongDanThanThien = "tu-duy-thiet-ke-uiux-thuc-chien",
                MoTaNgan = "Học nghiên cứu người dùng, vẽ Sitemap, Wireframe và áp dụng quy tắc màu sắc UI.",
                MoTa = "Khóa học xây dựng tư duy thiết kế lấy người dùng làm trung tâm (User-Centered Design). Học cách thiết kế giao diện web đẹp, trực quan và tối ưu trải nghiệm học tập.",
                MoTaChiTiet = "Bạn sẽ thực hành từ UX Research, tạo Wireframe đến áp dụng các quy tắc thiết kế UI (màu sắc, typography, khoảng trắng) để có sản phẩm Landing Page hoàn chỉnh.",
                ChuyenMuc = "UI/UX",
                TrinhDo = "BEGINNER",
                Gia = 299000,
                DiemDanhGiaTrungBinh = 4.8,
                SoLuongDanhGia = 24,
                HangThanhVienToiThieu = "BRONZE",
                AnhDaiDien = "https://images.unsplash.com/photo-1561070791-26c113006238?w=600&auto=format&fit=crop",
                CacChuongHoc = new List<SectionTemplate>
                {
                    new SectionTemplate
                    {
                        TieuDe = "Nghiên cứu người dùng (UX Research)",
                        LessonTitles = new List<string>
                        {
                            "UI và UX khác nhau như thế nào?",
                            "Cách lập bảng hỏi và phỏng vấn người dùng",
                            "Xây dựng chân dung người dùng tiêu biểu (User Persona)",
                            "Vẽ bản đồ hành trình trải nghiệm (Customer Journey Map)"
                        }
                    },
                    new SectionTemplate
                    {
                        TieuDe = "Kiến trúc thông tin & Wireframe",
                        LessonTitles = new List<string>
                        {
                            "Sắp xếp thông tin website khoa học (Information Architecture)",
                            "Tạo sơ đồ trang web (Sitemap)",
                            "Vẽ Wireframe trên giấy (Lo-Fi) đến bản nháp kỹ thuật số",
                            "Thiết kế luồng thao tác của người dùng (User Flow)"
                        }
                    },
                    new SectionTemplate
                    {
                        TieuDe = "Nguyên lý thị giác & Thiết kế UI",
                        LessonTitles = new List<string>
                        {
                            "Cách sử dụng màu sắc hài hòa trong UI (Quy tắc 60-30-10)",
                            "Typography: Chọn font và kích thước chuẩn cho web/mobile",
                            "Quy tắc khoảng trắng và bố cục cân bằng",
                            "Thực hành thiết kế màn hình Landing Page đầu tiên"
                        }
                    }
                }
            },
            new CourseTemplate
            {
                TieuDe = "Thiết kế Mobile App UI/UX nâng cao",
                DuongDanThanThien = "thiet-ke-mobile-app-uiux-nang-cao",
                MoTaNgan = "Học Material Design, iOS Guidelines, xây dựng Figma UI System và micro-interactions.",
                MoTa = "Học thiết kế giao diện ứng dụng di động chuyên nghiệp trên Figma. Nắm chắc đặc thù màn hình cảm ứng, Material Design và iOS Guidelines.",
                MoTaChiTiet = "Khóa học hướng dẫn chi tiết cách tạo bộ Styles, Variables, Auto Layout và Smart Animate tạo hiệu ứng chuyển động chân thực nhất.",
                ChuyenMuc = "UI/UX",
                TrinhDo = "ADVANCED",
                Gia = 499000,
                DiemDanhGiaTrungBinh = 4.9,
                SoLuongDanhGia = 18,
                HangThanhVienToiThieu = "GOLD",
                AnhDaiDien = "https://images.unsplash.com/photo-1512941937669-90a1b58e7e9c?w=600&auto=format&fit=crop",
                CacChuongHoc = new List<SectionTemplate>
                {
                    new SectionTemplate
                    {
                        TieuDe = "Đặc thù thiết kế trên Mobile",
                        LessonTitles = new List<string>
                        {
                            "Khác biệt giữa thiết kế Web và Mobile App",
                            "Tìm hiểu iOS Human Interface Guidelines",
                            "Tìm hiểu Material Design của Google",
                            "Khu vực tương tác thuận tiện bằng ngón tay (Thumb Zone)"
                        }
                    },
                    new SectionTemplate
                    {
                        TieuDe = "Xây dựng hệ thống UI System trong Figma",
                        LessonTitles = new List<string>
                        {
                            "Tạo bộ màu sắc, typography và hiệu ứng toàn cục (Styles)",
                            "Tạo các Component thông minh có nhiều biến thể (Variants)",
                            "Ứng dụng Auto Layout nâng cao để co giãn màn hình",
                            "Quản lý thư viện Design System chuyên nghiệp trong dự án"
                        }
                    },
                    new SectionTemplate
                    {
                        TieuDe = "Interactive Prototyping & Motion UI",
                        LessonTitles = new List<string>
                        {
                            "Tạo hiệu ứng chuyển cảnh mượt mà giữa các màn hình",
                            "Sử dụng Smart Animate để tạo micro-interactions",
                            "Thiết kế hiệu ứng vuốt chạm (Gesture) chân thực",
                            "Bàn giao thiết kế cho lập trình viên (Developer Handoff)"
                        }
                    }
                }
            },

            // 10. Digital Marketing
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
            new CourseTemplate
            {
                TieuDe = "Quảng cáo Google Ads & Facebook Ads từ cơ bản đến tối ưu",
                DuongDanThanThien = "quang-cao-google-ads-facebook-ads",
                MoTaNgan = "Cấu hình chiến dịch Facebook Ads, nghiên cứu từ khóa Google và chạy Re-marketing tối ưu chi phí.",
                MoTa = "Khóa học thực chiến hướng dẫn từng bước thiết lập tài khoản quảng cáo, cài đặt Pixel/Tag đo lường, đấu thầu từ khóa và nhắm trúng mục tiêu khách hàng.",
                MoTaChiTiet = "Tối ưu hóa ngân sách quảng cáo của bạn, tránh lãng phí tiền và tăng tỷ lệ chuyển đổi đơn hàng thông qua tiếp thị lại (Re-marketing).",
                ChuyenMuc = "Digital Marketing",
                TrinhDo = "INTERMEDIATE",
                Gia = 499000,
                DiemDanhGiaTrungBinh = 4.8,
                SoLuongDanhGia = 31,
                HangThanhVienToiThieu = "SILVER",
                AnhDaiDien = "https://images.unsplash.com/photo-1533750516457-a7f992034fec?w=600&auto=format&fit=crop",
                CacChuongHoc = new List<SectionTemplate>
                {
                    new SectionTemplate
                    {
                        TieuDe = "Quảng cáo Facebook Ads thực chiến",
                        LessonTitles = new List<string>
                        {
                            "Thiết lập Trình quản lý doanh nghiệp (Business Manager)",
                            "Cấu trúc một chiến dịch quảng cáo Facebook",
                            "Cách nhắm mục tiêu khách hàng chi tiết (Targeting)",
                            "Cài đặt Facebook Pixel để đo lường chuyển đổi"
                        }
                    },
                    new SectionTemplate
                    {
                        TieuDe = "Quảng cáo Google Ads tìm kiếm",
                        LessonTitles = new List<string>
                        {
                            "Cơ chế đấu thầu từ khóa của Google Ads",
                            "Nghiên cứu từ khóa hiệu quả bằng Google Keyword Planner",
                            "Viết mẫu quảng cáo thu hút nhấp chuột",
                            "Cấu hình ngân sách và chiến lược giá thầu"
                        }
                    },
                    new SectionTemplate
                    {
                        TieuDe = "Tối ưu chi phí & Re-marketing",
                        LessonTitles = new List<string>
                        {
                            "Cách đọc báo cáo quảng cáo để phát hiện lãng phí",
                            "Chạy chiến dịch tiếp thị lại (Re-marketing) bám đuổi khách",
                            "Thực hiện A/B testing hình ảnh và kịch bản quảng cáo",
                            "Quy trình xử lý khi tài khoản quảng cáo bị vô hiệu hóa"
                        }
                    }
                }
            },

            // 11. CCNA Original (Keep consistent)
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
