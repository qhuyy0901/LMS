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
        public string Title { get; set; } = string.Empty;
        public string Slug { get; set; } = string.Empty;
        public string ShortDescription { get; set; } = string.Empty;
        public string Description { get; set; } = string.Empty;
        public string DetailedDescription { get; set; } = string.Empty;
        public string Category { get; set; } = string.Empty;
        public string Level { get; set; } = "BEGINNER";
        public int Price { get; set; }
        public double AverageRating { get; set; }
        public int ReviewCount { get; set; }
        public string MinimumMemberTier { get; set; } = "BRONZE";
        public string Thumbnail { get; set; } = string.Empty;
        public List<SectionTemplate> Sections { get; set; } = new();
    }

    private class SectionTemplate
    {
        public string Title { get; set; } = string.Empty;
        public List<string> LessonTitles { get; set; } = new();
    }

    public static async Task SeedAsync(ApplicationDbContext db)
    {
        var now = DateTime.UtcNow;
        var password = BCrypt.Net.BCrypt.HashPassword("123456");

        // Seed users
        var admin = await db.Users.FirstOrDefaultAsync(u => u.Email == "admin@gmail.com");
        if (admin == null)
        {
            admin = new NguoiDung
            {
                Id = "demo-user-admin",
                Email = "admin@gmail.com",
                Name = "Quản trị viên",
                Password = password,
                Role = "ADMIN",
                MemberTier = "DIAMOND",
                CreatedAt = now,
                UpdatedAt = now
            };
            db.Users.Add(admin);
        }

        var instructor = await db.Users.FirstOrDefaultAsync(u => u.Email == "instructor@gmail.com");
        if (instructor == null)
        {
            instructor = new NguoiDung
            {
                Id = "demo-user-instructor",
                Email = "instructor@gmail.com",
                Name = "GV. Kim",
                Password = password,
                Role = "INSTRUCTOR",
                MemberTier = "GOLD",
                Bio = "Giảng viên thiết kế sản phẩm và lập trình web.",
                CreatedAt = now,
                UpdatedAt = now
            };
            db.Users.Add(instructor);
        }

        var student = await db.Users.FirstOrDefaultAsync(u => u.Email == "student@gmail.com");
        if (student == null)
        {
            student = new NguoiDung
            {
                Id = "demo-user-student",
                Email = "student@gmail.com",
                Name = "Học viên Demo",
                Password = password,
                Role = "STUDENT",
                WalletBalance = 500000,
                MemberTier = "SILVER",
                CreatedAt = now,
                UpdatedAt = now
            };
            db.Users.Add(student);
        }

        await db.SaveChangesAsync();

        // Seed Courses
        var templates = GetTemplates();
        var random = new Random();

        foreach (var t in templates)
        {
            if (await db.Courses.AnyAsync(c => c.Slug == t.Slug))
            {
                continue; // Skip if already exists
            }

            var course = new KhoaHoc
            {
                Id = TaoId.Moi(),
                Title = t.Title,
                Slug = t.Slug,
                ShortDescription = t.ShortDescription,
                Description = t.Description,
                DetailedDescription = t.DetailedDescription,
                Thumbnail = t.Thumbnail,
                Category = t.Category,
                Level = t.Level,
                Price = t.Price,
                AverageRating = t.AverageRating,
                ReviewCount = t.ReviewCount,
                MinimumMemberTier = t.MinimumMemberTier,
                IsPublished = true,
                Status = "PUBLISHED",
                PublishedAt = now.AddDays(-random.Next(10, 50)),
                StartDate = now.AddDays(-random.Next(5, 10)),
                EndDate = now.AddDays(random.Next(30, 90)),
                InstructorId = instructor.Id,
                CreatedAt = now.AddDays(-50),
                UpdatedAt = now
            };

            db.Courses.Add(course);

            int totalDuration = 0;
            int sectionPos = 1;
            foreach (var st in t.Sections)
            {
                var section = new ChuongHoc
                {
                    Id = TaoId.Moi(),
                    Title = st.Title,
                    Position = sectionPos++,
                    CourseId = course.Id,
                    CreatedAt = now,
                    UpdatedAt = now
                };
                db.Sections.Add(section);

                int lessonPos = 1;
                foreach (var lt in st.LessonTitles)
                {
                    int duration = random.Next(10, 31) * 60; // 10 to 30 minutes in seconds
                    totalDuration += duration;

                    var lesson = new BaiHoc
                    {
                        Id = TaoId.Moi(),
                        Title = lt,
                        Content = $"Chào mừng bạn đến với bài học: '{lt}'. Đây là nội dung hướng dẫn chi tiết dành cho học viên của khóa học '{t.Title}'. Hãy theo dõi kỹ video và thực hiện các bài tập thực hành đi kèm.",
                        VideoUrl = "https://www.w3schools.com/html/mov_bbb.mp4",
                        DurationSeconds = duration,
                        Position = lessonPos++,
                        IsPublished = true,
                        Status = "PUBLISHED",
                        IsPreview = (section.Position == 1 && lessonPos == 2), // First lesson of first section is preview
                        CourseId = course.Id,
                        SectionId = section.Id,
                        CreatedAt = now,
                        UpdatedAt = now
                    };
                    db.Lessons.Add(lesson);

                    // Add quiz to the last lesson of the section
                    if (lessonPos - 1 == st.LessonTitles.Count)
                    {
                        var quiz = new BaiKiemTra
                        {
                            Id = TaoId.Moi(),
                            Title = $"Trắc nghiệm: {st.Title}",
                            Description = $"Bài kiểm tra trắc nghiệm giúp bạn củng cố kiến thức đã học trong chương: {st.Title}.",
                            PassingScore = 80,
                            LessonId = lesson.Id,
                            CreatedAt = now,
                            UpdatedAt = now
                        };
                        db.Quizzes.Add(quiz);

                        var qTemplates = GetQuestionsForCategory(t.Category, section.Position, random);
                        int qPos = 1;
                        foreach (var qt in qTemplates)
                        {
                            var question = new CauHoiKiemTra
                            {
                                Id = TaoId.Moi(),
                                QuestionText = qt.QuestionText,
                                Options = System.Text.Json.JsonSerializer.Serialize(qt.Options),
                                CorrectOptionIndex = qt.CorrectOptionIndex,
                                Explanation = qt.Explanation,
                                Position = qPos++,
                                QuizId = quiz.Id,
                                CreatedAt = now,
                                UpdatedAt = now
                            };
                            db.QuizQuestions.Add(question);
                        }
                    }
                }
            }

            course.TotalDurationSeconds = totalDuration;

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
                Rating = random.Next(4, 6), // 4 or 5 stars
                Comment = reviewComments[random.Next(reviewComments.Length)],
                UserId = student.Id,
                CourseId = course.Id,
                CreatedAt = now.AddDays(-random.Next(1, 10)),
                UpdatedAt = now
            };
            db.CourseReviews.Add(review);
        }

        await db.SaveChangesAsync();

        // Seed some enrollments for the student
        var studentCourses = await db.Courses.Take(3).ToListAsync();
        foreach (var sc in studentCourses)
        {
            if (!await db.Enrollments.AnyAsync(e => e.UserId == student.Id && e.CourseId == sc.Id))
            {
                var enrollment = new GhiDanh
                {
                    Id = TaoId.Moi(),
                    Progress = random.Next(10, 80),
                    CompletedAt = null,
                    UserId = student.Id,
                    CourseId = sc.Id,
                    CreatedAt = now.AddDays(-5),
                    UpdatedAt = now
                };
                db.Enrollments.Add(enrollment);
            }
        }

        await db.SaveChangesAsync();

        // Add quizzes to existing courses if they lack quizzes
        var existingCourses = await db.Courses.Include(c => c.Sections).ThenInclude(s => s.Lessons).ToListAsync();
        foreach (var c in existingCourses)
        {
            // Check if this course already has any quizzes
            bool hasQuiz = await db.Quizzes.AnyAsync(q => db.Lessons.Any(l => l.Id == q.LessonId && l.CourseId == c.Id));
            if (!hasQuiz)
            {
                foreach (var sect in c.Sections)
                {
                    var lastLesson = sect.Lessons.OrderBy(l => l.Position).LastOrDefault();
                    if (lastLesson != null)
                    {
                        var quiz = new BaiKiemTra
                        {
                            Id = TaoId.Moi(),
                            Title = $"Trắc nghiệm: {sect.Title}",
                            Description = $"Bài kiểm tra trắc nghiệm giúp bạn củng cố kiến thức đã học trong chương: {sect.Title}.",
                            PassingScore = 80,
                            LessonId = lastLesson.Id,
                            CreatedAt = now,
                            UpdatedAt = now
                        };
                        db.Quizzes.Add(quiz);

                        var qTemplates = GetQuestionsForCategory(c.Category, sect.Position, random);
                        int qPos = 1;
                        foreach (var qt in qTemplates)
                        {
                            var question = new CauHoiKiemTra
                            {
                                Id = TaoId.Moi(),
                                QuestionText = qt.QuestionText,
                                Options = System.Text.Json.JsonSerializer.Serialize(qt.Options),
                                CorrectOptionIndex = qt.CorrectOptionIndex,
                                Explanation = qt.Explanation,
                                Position = qPos++,
                                QuizId = quiz.Id,
                                CreatedAt = now,
                                UpdatedAt = now
                            };
                            db.QuizQuestions.Add(question);
                        }
                    }
                }
            }
        }

        await db.SaveChangesAsync();
    }

    private class QuestionTemplate
    {
        public string QuestionText { get; set; } = string.Empty;
        public List<string> Options { get; set; } = new();
        public int CorrectOptionIndex { get; set; }
        public string Explanation { get; set; } = string.Empty;
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
                    QuestionText = "ASP.NET Core là gì?",
                    Options = new List<string> { "Một thư viện JavaScript", "Một framework web mã nguồn mở của Microsoft", "Một loại database", "Một ngôn ngữ lập trình mới" },
                    CorrectOptionIndex = 1,
                    Explanation = "ASP.NET Core là framework web mã nguồn mở, đa nền tảng và hiệu năng cao của Microsoft."
                });
                questions.Add(new QuestionTemplate {
                    QuestionText = "Cơ chế Dependency Injection (DI) trong ASP.NET Core hỗ trợ những lifetime nào?",
                    Options = new List<string> { "Transient, Scoped, Singleton", "Local, Global, Static", "Read, Write, Execute", "None of the above" },
                    CorrectOptionIndex = 0,
                    Explanation = "ASP.NET Core tích hợp sẵn DI container với 3 lifetime chính: Transient, Scoped, và Singleton."
                });
            }
            else
            {
                questions.Add(new QuestionTemplate {
                    QuestionText = "Phương thức nào cấu hình Service Lifetime dạng Scoped?",
                    Options = new List<string> { "AddSingleton", "AddTransient", "AddScoped", "AddMvc" },
                    CorrectOptionIndex = 2,
                    Explanation = "Sử dụng AddScoped để đăng ký service có vòng đời tồn tại theo từng HTTP request."
                });
                questions.Add(new QuestionTemplate {
                    QuestionText = "Routing trong ASP.NET Core Web API thường được cấu hình qua cơ chế nào?",
                    Options = new List<string> { "Attribute Routing", "Conventional Routing", "Static Routing", "Database Routing" },
                    CorrectOptionIndex = 0,
                    Explanation = "Attribute Routing là cách cấu hình phổ biến nhất cho API bằng các attribute."
                });
            }
        }
        else if (catLower.Contains("react"))
        {
            if (sectionPos == 1)
            {
                questions.Add(new QuestionTemplate {
                    QuestionText = "ReactJS là gì?",
                    Options = new List<string> { "Một database", "Một hệ điều hành", "Một thư viện JavaScript để xây dựng giao diện (UI)", "Một ngôn ngữ lập trình backend" },
                    CorrectOptionIndex = 2,
                    Explanation = "ReactJS là thư viện JavaScript mã nguồn mở được phát triển bởi Facebook để xây dựng giao diện người dùng đơn trang (SPA)."
                });
                questions.Add(new QuestionTemplate {
                    QuestionText = "Hook nào dùng để quản lý state trong Functional Component?",
                    Options = new List<string> { "useEffect", "useState", "useContext", "useReducer" },
                    CorrectOptionIndex = 1,
                    Explanation = "useState là Hook cơ bản nhất giúp lưu trữ và cập nhật trạng thái trong Functional Component."
                });
            }
            else
            {
                questions.Add(new QuestionTemplate {
                    QuestionText = "Để tránh re-render không cần thiết của component con trong React, ta nên dùng cơ chế nào?",
                    Options = new List<string> { "React.memo", "useEffect", "useState", "useContext" },
                    CorrectOptionIndex = 0,
                    Explanation = "React.memo là một higher-order component giúp ghi nhớ kết quả render của component con để tránh re-render khi props không đổi."
                });
                questions.Add(new QuestionTemplate {
                    QuestionText = "Trong React Redux Toolkit, phương thức nào dùng để tạo một slice chứa reducer và actions?",
                    Options = new List<string> { "createStore", "createSlice", "createAction", "createReducer" },
                    CorrectOptionIndex = 1,
                    Explanation = "createSlice tự động sinh ra các action creators và action types tương ứng với các reducers."
                });
            }
        }
        else if (catLower.Contains("node"))
        {
            if (sectionPos == 1)
            {
                questions.Add(new QuestionTemplate {
                    QuestionText = "Node.js chạy trên Engine JavaScript nào?",
                    Options = new List<string> { "SpiderMonkey", "Chakra", "V8 của Google Chrome", "Rhino" },
                    CorrectOptionIndex = 2,
                    Explanation = "Node.js được xây dựng dựa trên engine JavaScript V8 của Google Chrome."
                });
                questions.Add(new QuestionTemplate {
                    QuestionText = "Framework phổ biến nhất để xây dựng web server trên Node.js là gì?",
                    Options = new List<string> { "ExpressJS", "Django", "Spring Boot", "Laravel" },
                    CorrectOptionIndex = 0,
                    Explanation = "ExpressJS là web framework tối giản và linh hoạt được sử dụng rộng rãi nhất trong Node.js."
                });
            }
            else
            {
                questions.Add(new QuestionTemplate {
                    QuestionText = "Trong NestJS, decorator nào dùng để khai báo một Class là một Service có thể tiêm vào (Injectable)?",
                    Options = new List<string> { "@Controller()", "@Module()", "@Injectable()", "@Service()" },
                    CorrectOptionIndex = 2,
                    Explanation = "@Injectable() báo cho NestJS container biết Class này có thể được tiêm vào các class khác."
                });
            }
        }
        else if (catLower.Contains("python") || catLower.Contains("django"))
        {
            questions.Add(new QuestionTemplate {
                QuestionText = "Từ khóa nào dùng để định nghĩa hàm trong Python?",
                Options = new List<string> { "function", "void", "def", "func" },
                CorrectOptionIndex = 2,
                Explanation = "Trong Python, bạn dùng từ khóa 'def' để bắt đầu định nghĩa một hàm."
            });
            questions.Add(new QuestionTemplate {
                QuestionText = "Kiểu dữ liệu nào lưu trữ các cặp key-value trong Python?",
                Options = new List<string> { "List", "Tuple", "Dictionary", "Set" },
                CorrectOptionIndex = 2,
                Explanation = "Dictionary (dict) trong Python lưu trữ dưới dạng các cặp khóa-giá trị."
            });
        }
        else if (catLower.Contains("java") || catLower.Contains("spring"))
        {
            questions.Add(new QuestionTemplate {
                QuestionText = "JVM là viết tắt của từ gì?",
                Options = new List<string> { "Java Virtual Machine", "Java Version Manager", "Java Variable Method", "Java Virtual Method" },
                CorrectOptionIndex = 0,
                Explanation = "JVM (Java Virtual Machine) là trình ảo hóa thực thi mã bytecode của Java."
            });
            questions.Add(new QuestionTemplate {
                QuestionText = "Từ khóa nào được dùng để kế thừa một Class khác trong Java?",
                Options = new List<string> { "implements", "extends", "inherits", "parent" },
                CorrectOptionIndex = 1,
                Explanation = "Dùng extends cho kế thừa class trong Java."
            });
        }
        else if (catLower.Contains("ai") || catLower.Contains("machine") || catLower.Contains("data"))
        {
            questions.Add(new QuestionTemplate {
                QuestionText = "Thư viện Python nào phổ biến nhất cho tính toán mảng và ma trận?",
                Options = new List<string> { "Pandas", "Matplotlib", "NumPy", "Scikit-Learn" },
                CorrectOptionIndex = 2,
                Explanation = "NumPy cung cấp các cấu trúc mảng đa chiều hiệu năng cao cho Python."
            });
            questions.Add(new QuestionTemplate {
                QuestionText = "Thuật toán K-Means là thuật toán thuộc nhóm nào?",
                Options = new List<string> { "Học có giám sát", "Học không giám sát", "Học tăng cường", "Mạng nơ-ron sâu" },
                CorrectOptionIndex = 1,
                Explanation = "K-Means là thuật toán thuộc nhóm Học không giám sát (Unsupervised Learning)."
            });
        }
        else if (catLower.Contains("mạng") || catLower.Contains("ccna"))
        {
            questions.Add(new QuestionTemplate {
                QuestionText = "Mô hình OSI có bao nhiêu tầng?",
                Options = new List<string> { "4", "5", "7 (Physical, Data Link, Network, Transport, Session, Presentation, Application)", "9" },
                CorrectOptionIndex = 2,
                Explanation = "Mô hình OSI chuẩn có 7 tầng."
            });
            questions.Add(new QuestionTemplate {
                QuestionText = "Thiết bị nào hoạt động ở tầng 3 (Network) của mô hình OSI?",
                Options = new List<string> { "Hub", "Switch L2", "Router", "Repeater" },
                CorrectOptionIndex = 2,
                Explanation = "Router xử lý địa chỉ IP (tầng 3) để định tuyến các gói tin."
            });
        }
        else if (catLower.Contains("marketing"))
        {
            questions.Add(new QuestionTemplate {
                QuestionText = "SEO là viết tắt của từ gì?",
                Options = new List<string> { "Search Engine Optimization", "Social Engine Optimization", "Site Efficiency Optimization", "Social Engagement Opportunity" },
                CorrectOptionIndex = 0,
                Explanation = "SEO là tối ưu hóa công cụ tìm kiếm."
            });
        }
        else if (catLower.Contains("ui") || catLower.Contains("ux"))
        {
            questions.Add(new QuestionTemplate {
                QuestionText = "UI là viết tắt của từ gì?",
                Options = new List<string> { "User Interaction", "User Interface (Giao diện người dùng)", "User Integration", "User Identity" },
                CorrectOptionIndex = 1,
                Explanation = "UI (User Interface) là giao diện người dùng hiển thị trực quan."
            });
            questions.Add(new QuestionTemplate {
                QuestionText = "Công cụ thiết kế UI/UX phổ biến nhất hiện nay là gì?",
                Options = new List<string> { "Photoshop", "Illustrator", "Figma", "CorelDraw" },
                CorrectOptionIndex = 2,
                Explanation = "Figma là công cụ thiết kế UI/UX phổ biến nhất hiện nay."
            });
        }

        if (questions.Count == 0)
        {
            questions.Add(new QuestionTemplate {
                QuestionText = $"Bài kiểm tra tổng hợp kiến thức về {category}",
                Options = new List<string> { "Đáp án A (Đúng)", "Đáp án B", "Đáp án C", "Đáp án D" },
                CorrectOptionIndex = 0,
                Explanation = "Chúc mừng bạn chọn đúng đáp án A."
            });
            questions.Add(new QuestionTemplate {
                QuestionText = "Hãy chọn đáp án đúng nhất để hoàn thành bài học này:",
                Options = new List<string> { "Lựa chọn 1", "Lựa chọn 2 (Đúng)", "Lựa chọn 3", "Lựa chọn 4" },
                CorrectOptionIndex = 1,
                Explanation = "Lựa chọn 2 là câu trả lời chính xác dựa trên bài giảng."
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
                Title = "Xây dựng Web API chuyên nghiệp với ASP.NET Core",
                Slug = "xay-dung-web-api-aspnet-core",
                ShortDescription = "Thiết lập dự án, kết nối EF Core, xác thực JWT và đóng gói Docker.",
                Description = "Khóa học giúp bạn làm chủ quá trình thiết kế và phát triển RESTful API chuyên nghiệp bằng ASP.NET Core 9. Bạn sẽ được học từ kiến trúc Onion Architecture, kết nối database với EF Core, bảo mật JWT đến các kỹ thuật log lỗi và deploy thực tế.",
                DetailedDescription = "Trong khóa học này, chúng ta sẽ cùng nhau xây dựng một hệ thống backend API thực tế. Chúng ta sẽ áp dụng các nguyên lý Clean Code và các pattern phổ biến để code dễ bảo trì và mở rộng.",
                Category = "ASP.NET Core",
                Level = "INTERMEDIATE",
                Price = 499000,
                AverageRating = 4.8,
                ReviewCount = 42,
                MinimumMemberTier = "SILVER",
                Thumbnail = "https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=600&auto=format&fit=crop",
                Sections = new List<SectionTemplate>
                {
                    new SectionTemplate
                    {
                        Title = "Thiết lập & Cấu trúc dự án Web API",
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
                        Title = "Xử lý dữ liệu & Entity Framework Core",
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
                        Title = "Bảo mật & Triển khai",
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
                Title = "ASP.NET Core MVC từ cơ bản đến nâng cao",
                Slug = "aspnet-core-mvc-co-ban-den-nang-cao",
                ShortDescription = "Học mô hình MVC, Razor View Engine và kết nối database xây dựng website bán hàng.",
                Description = "Khóa học dẫn dắt bạn qua toàn bộ các khía cạnh của mô hình MVC trong ASP.NET Core. Thích hợp cho người bắt đầu làm quen với lập trình Web.",
                DetailedDescription = "Bạn sẽ tự tay code một website thương mại điện tử hoàn chỉnh từ trang quản trị (Admin) đến giao diện khách hàng, xử lý giỏ hàng và thanh toán trực tuyến.",
                Category = "ASP.NET Core",
                Level = "BEGINNER",
                Price = 399000,
                AverageRating = 4.7,
                ReviewCount = 28,
                MinimumMemberTier = "BRONZE",
                Thumbnail = "https://images.unsplash.com/photo-1542831371-29b0f74f9713?w=600&auto=format&fit=crop",
                Sections = new List<SectionTemplate>
                {
                    new SectionTemplate
                    {
                        Title = "Làm quen với mô hình MVC",
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
                        Title = "View & Razor View Engine",
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
                        Title = "Làm việc với cơ sở dữ liệu",
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
                Title = "Lập trình ReactJS cho người mới bắt đầu",
                Slug = "reactjs-cho-nguoi-moi-bat-dau",
                ShortDescription = "Học Component, Props, State, React Hooks và React Router để xây dựng giao diện hiện đại.",
                Description = "Nắm vững ReactJS - thư viện JavaScript phổ biến nhất hiện nay cho phát triển giao diện Web (Frontend). Học thông qua các ví dụ thực hành trực quan.",
                DetailedDescription = "Khóa học đi từ con số 0 giúp bạn viết component sạch, quản lý state và fetch API mượt mà.",
                Category = "ReactJS",
                Level = "BEGINNER",
                Price = 299000,
                AverageRating = 4.6,
                ReviewCount = 35,
                MinimumMemberTier = "BRONZE",
                Thumbnail = "https://images.unsplash.com/photo-1633356122544-f134324a6cee?w=600&auto=format&fit=crop",
                Sections = new List<SectionTemplate>
                {
                    new SectionTemplate
                    {
                        Title = "Kiến thức JavaScript ES6 và React cơ bản",
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
                        Title = "State & Hooks cơ bản",
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
                        Title = "React Router & Quản lý State nâng cao",
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
                Title = "ReactJS nâng cao: Quản lý State với Redux Toolkit",
                Slug = "reactjs-nang-cao-redux-toolkit",
                ShortDescription = "Học tối ưu render Component, Custom Hooks và kiến trúc Redux Toolkit chuyên nghiệp.",
                Description = "Dành cho các nhà phát triển React muốn nâng cao kỹ năng xử lý các ứng dụng quy mô lớn, tối ưu hóa hiệu năng render và cấu trúc code khoa học.",
                DetailedDescription = "Chúng ta sẽ đi sâu vào cơ chế tối ưu render, viết custom hook tái sử dụng, và tích hợp RTK Query để quản lý cache API hoàn hảo.",
                Category = "ReactJS",
                Level = "ADVANCED",
                Price = 599000,
                AverageRating = 4.9,
                ReviewCount = 20,
                MinimumMemberTier = "GOLD",
                Thumbnail = "https://images.unsplash.com/photo-1627398242454-45a1465c2079?w=600&auto=format&fit=crop",
                Sections = new List<SectionTemplate>
                {
                    new SectionTemplate
                    {
                        Title = "Kiến trúc Component & Performance Optimization",
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
                        Title = "Redux Toolkit cốt lõi",
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
                        Title = "Xử lý Async Actions & Middleware",
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
                Title = "NodeJS & ExpressJS: Xây dựng RESTful API thực chiến",
                Slug = "nodejs-expressjs-api-thuc-chien",
                ShortDescription = "Xây dựng Server Express, kết nối MongoDB với Mongoose và phân quyền bảo mật JWT.",
                Description = "Học cách thiết kế backend mạnh mẽ với NodeJS, xử lý các tác vụ bất đồng bộ hiệu quả thông qua ExpressJS framework.",
                DetailedDescription = "Bạn sẽ học cách bảo mật ứng dụng với mã hóa bcrypt, xác thực người dùng bằng JWT, xử lý upload file và xử lý log lỗi tập trung.",
                Category = "NodeJS",
                Level = "INTERMEDIATE",
                Price = 349000,
                AverageRating = 4.8,
                ReviewCount = 31,
                MinimumMemberTier = "SILVER",
                Thumbnail = "https://images.unsplash.com/photo-1510915228340-29c85a43dcfe?w=600&auto=format&fit=crop",
                Sections = new List<SectionTemplate>
                {
                    new SectionTemplate
                    {
                        Title = "Khởi động với Node.js & Express",
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
                        Title = "Kết nối Database & Mongoose",
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
                        Title = "Xác thực, bảo mật & Upload file",
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
                Title = "NodeJS nâng cao: NestJS Framework & TypeScript",
                Slug = "nestjs-framework-typescript-nang-cao",
                ShortDescription = "Kiến trúc doanh nghiệp NestJS, kết nối PostgreSQL với TypeORM và viết Unit Test.",
                Description = "Học NestJS - framework Node.js có cấu trúc rõ ràng, hỗ trợ TypeScript tuyệt hảo, phù hợp cho các dự án lớn, phức tạp của doanh nghiệp.",
                DetailedDescription = "Tìm hiểu Dependency Injection sâu rộng, viết custom guards, interceptors, và làm việc chuyên sâu với TypeORM và microservices.",
                Category = "NodeJS",
                Level = "ADVANCED",
                Price = 699000,
                AverageRating = 4.9,
                ReviewCount = 18,
                MinimumMemberTier = "GOLD",
                Thumbnail = "https://images.unsplash.com/photo-1507721999472-8ed4421c4b2e?w=600&auto=format&fit=crop",
                Sections = new List<SectionTemplate>
                {
                    new SectionTemplate
                    {
                        Title = "Làm quen với NestJS",
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
                        Title = "Kết nối Database & Validations",
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
                        Title = "Bảo mật & Microservices",
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
                Title = "Lập trình Python cơ bản cho người mới bắt đầu",
                Slug = "lap-trinh-python-co-ban-moi-bat-dau",
                ShortDescription = "Học biến, vòng lặp, hàm, cấu trúc dữ liệu và lập trình hướng đối tượng căn bản.",
                Description = "Khóa học lập trình Python toàn diện, dễ tiếp cận nhất cho người chưa có kinh nghiệm. Phù hợp làm nền tảng trước khi học AI hay Data Science.",
                DetailedDescription = "Bạn sẽ học cách lập trình giải quyết các bài toán logic và thực hành xây dựng các ứng dụng console đơn giản nhưng thú vị.",
                Category = "Python",
                Level = "BEGINNER",
                Price = 199000,
                AverageRating = 4.6,
                ReviewCount = 50,
                MinimumMemberTier = "BRONZE",
                Thumbnail = "https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=600&auto=format&fit=crop",
                Sections = new List<SectionTemplate>
                {
                    new SectionTemplate
                    {
                        Title = "Cú pháp & Biến cơ bản",
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
                        Title = "Cấu trúc lặp & Tập hợp dữ liệu",
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
                        Title = "Thao tác File & Lập trình hướng đối tượng cơ bản",
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
                Title = "Lập trình Web với Python Django Framework",
                Slug = "lap-trinh-web-python-django",
                ShortDescription = "Học cấu trúc dự án Django, Django ORM, Admin Panel và thiết lập REST API.",
                Description = "Học cách xây dựng website nhanh chóng và bảo mật với Django - framework phát triển web phổ biến nhất của Python.",
                DetailedDescription = "Chúng ta sẽ thiết kế database bằng Model, chạy migration, tạo giao diện người dùng và thiết lập API nhanh chóng với Django REST Framework.",
                Category = "Python",
                Level = "INTERMEDIATE",
                Price = 459000,
                AverageRating = 4.7,
                ReviewCount = 22,
                MinimumMemberTier = "SILVER",
                Thumbnail = "https://images.unsplash.com/photo-1581291518633-83b4ebd1d83e?w=600&auto=format&fit=crop",
                Sections = new List<SectionTemplate>
                {
                    new SectionTemplate
                    {
                        Title = "Kiến trúc MVT trong Django",
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
                        Title = "Django ORM & Admin Panel",
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
                        Title = "Authentication & Django REST Framework",
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
                Title = "Lập trình Java core từ cơ bản đến hướng đối tượng",
                Slug = "lap-trinh-java-core-co-ban-oop",
                ShortDescription = "Làm quen cú pháp Java, kiểu dữ liệu, các nguyên lý OOP cốt lõi và Java Collections.",
                Description = "Khóa học nền tảng vững chắc nhất về Java, giúp bạn làm chủ 4 tính chất của Lập trình hướng đối tượng (OOP) và cấu trúc dữ liệu Collections.",
                DetailedDescription = "Khóa học chuẩn bị cho bạn các kỹ năng cần thiết trước khi bước vào lập trình web doanh nghiệp hoặc lập trình app Android.",
                Category = "Java",
                Level = "BEGINNER",
                Price = 299000,
                AverageRating = 4.6,
                ReviewCount = 44,
                MinimumMemberTier = "BRONZE",
                Thumbnail = "https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=600&auto=format&fit=crop",
                Sections = new List<SectionTemplate>
                {
                    new SectionTemplate
                    {
                        Title = "Cú pháp cơ bản & Cấu trúc lập trình",
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
                        Title = "Lập trình hướng đối tượng (OOP) cốt lõi",
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
                        Title = "Collections & Xử lý ngoại lệ",
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
                Title = "Lập trình Backend với Spring Boot thực chiến",
                Slug = "lap-trinh-spring-boot-thuc-chien",
                ShortDescription = "Thiết lập dự án Spring Boot, Spring Data JPA, Spring Security và bảo mật JWT.",
                Description = "Học cách xây dựng các hệ thống API có tính chịu tải cao và bảo mật bằng Spring Boot - framework hàng đầu của Java.",
                DetailedDescription = "Đi sâu vào Dependency Injection, Hibernate/JPA, bảo mật với JWT và cách triển khai dự án doanh nghiệp thực tế.",
                Category = "Java",
                Level = "INTERMEDIATE",
                Price = 599000,
                AverageRating = 4.9,
                ReviewCount = 27,
                MinimumMemberTier = "SILVER",
                Thumbnail = "https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=600&auto=format&fit=crop",
                Sections = new List<SectionTemplate>
                {
                    new SectionTemplate
                    {
                        Title = "Spring Boot cơ bản & Dependency Injection",
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
                        Title = "REST API & JPA/Hibernate",
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
                        Title = "Bảo mật & Triển khai",
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
                Title = "Nhập môn Trí tuệ Nhân tạo (AI) và Machine Learning",
                Slug = "nhap-mon-ai-machine-learning",
                ShortDescription = "Học thuật toán học có giám sát, không giám sát và đánh giá mô hình học máy với Python.",
                Description = "Khóa học giới thiệu khái niệm cốt lõi về Trí tuệ nhân tạo, Machine Learning và các ứng dụng thực tế của chúng.",
                DetailedDescription = "Bạn sẽ học cách lập trình và chạy thử các mô hình dự đoán từ dữ liệu thực tế bằng thư viện Scikit-Learn của Python.",
                Category = "AI",
                Level = "BEGINNER",
                Price = 399000,
                AverageRating = 4.7,
                ReviewCount = 33,
                MinimumMemberTier = "BRONZE",
                Thumbnail = "https://images.unsplash.com/photo-1677442136019-21780efad99a?w=600&auto=format&fit=crop",
                Sections = new List<SectionTemplate>
                {
                    new SectionTemplate
                    {
                        Title = "Tổng quan AI & Thuật toán học có giám sát",
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
                        Title = "Học không giám sát & Đánh giá mô hình",
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
                        Title = "Học sâu & Trực quan hóa dữ liệu AI",
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
                Title = "Phát triển ứng dụng Generative AI với OpenAI API & LangChain",
                Slug = "phat-trien-ung-dung-generative-ai-langchain",
                ShortDescription = "Học Prompt Engineering nâng cao, xây dựng ứng dụng chatbot RAG hỏi đáp trên file PDF.",
                Description = "Làm chủ Generative AI - công nghệ cách mạng hiện nay. Học cách kết nối OpenAI API, thiết kế Prompt chuyên nghiệp và sử dụng LangChain xây dựng chatbot.",
                DetailedDescription = "Chúng ta sẽ cùng làm một ứng dụng hoàn chỉnh tích hợp Vector Database để trả lời thông minh dựa trên tài liệu cá nhân.",
                Category = "AI",
                Level = "ADVANCED",
                Price = 799000,
                AverageRating = 4.9,
                ReviewCount = 22,
                MinimumMemberTier = "DIAMOND",
                Thumbnail = "https://images.unsplash.com/photo-1620712943543-bcc4688e7485?w=600&auto=format&fit=crop",
                Sections = new List<SectionTemplate>
                {
                    new SectionTemplate
                    {
                        Title = "Khái niệm Generative AI & OpenAI API",
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
                        Title = "LangChain Framework",
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
                        Title = "Xây dựng ứng dụng RAG (Retrieval-Augmented Generation)",
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
                Title = "Ứng dụng AI nâng cao trong sáng tạo nội dung và thiết kế",
                Slug = "ung-dung-ai-sang-tao-noi-dung-thiet-ke",
                ShortDescription = "Làm chủ ChatGPT, Midjourney, Stable Diffusion và ElevenLabs sản xuất video & ảnh.",
                Description = "Dành cho nhà sáng tạo nội dung, nhà thiết kế muốn nhân 10 tốc độ làm việc nhờ sự trợ giúp của các công cụ Generative AI.",
                DetailedDescription = "Khóa học tập trung thực hành tạo ảnh nghệ thuật, giọng đọc AI tự nhiên và biên tập video tự động.",
                Category = "AI",
                Level = "INTERMEDIATE",
                Price = 359000,
                AverageRating = 4.8,
                ReviewCount = 37,
                MinimumMemberTier = "SILVER",
                Thumbnail = "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=600&auto=format&fit=crop",
                Sections = new List<SectionTemplate>
                {
                    new SectionTemplate
                    {
                        Title = "Sản xuất văn bản & kịch bản thông minh",
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
                        Title = "Thiết kế hình ảnh và đồ họa với AI",
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
                        Title = "Tạo video và âm thanh tự động",
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
                Title = "Machine Learning thực hành: Dự báo và phân loại",
                Slug = "machine-learning-thuc-hanh-du-bao",
                ShortDescription = "Phân tích hồi quy, Random Forest, XGBoost và phân khúc khách hàng RFM thực tế.",
                Description = "Trực tiếp giải quyết các bài toán kinh doanh thực tế thông qua các thuật toán Machine Learning từ cơ bản đến phức tạp.",
                DetailedDescription = "Học viên sẽ tự tay xây dựng mô hình dự báo doanh số và dự đoán khách hàng rời bỏ dịch vụ viễn thông.",
                Category = "AI",
                Level = "INTERMEDIATE",
                Price = 499000,
                AverageRating = 4.8,
                ReviewCount = 19,
                MinimumMemberTier = "SILVER",
                Thumbnail = "https://images.unsplash.com/photo-1504868584819-f8e8b4b6d7e3?w=600&auto=format&fit=crop",
                Sections = new List<SectionTemplate>
                {
                    new SectionTemplate
                    {
                        Title = "Hồi quy tuyến tính nâng cao",
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
                        Title = "Thuật toán phân loại thực tế",
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
                        Title = "Phân cụm & Giảm chiều dữ liệu",
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
                Title = "Khoa học dữ liệu: Từ cơ bản đến trực quan hóa",
                Slug = "khoa-hoc-du-lieu-truc-quan-hoa",
                ShortDescription = "Thống kê toán học, biến đổi dữ liệu với Pandas và vẽ biểu đồ Plotly sinh động.",
                Description = "Nắm bắt các nguyên lý toán học thống kê và cách chuyển đổi số liệu thô thành những biểu đồ báo cáo ý nghĩa, hỗ trợ quyết định kinh doanh.",
                DetailedDescription = "Phù hợp cho các bạn muốn chuyển ngành sang Data Analyst hoặc Data Scientist mà chưa có nền tảng sâu về toán.",
                Category = "Data Science",
                Level = "BEGINNER",
                Price = 349000,
                AverageRating = 4.6,
                ReviewCount = 41,
                MinimumMemberTier = "BRONZE",
                Thumbnail = "https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=600&auto=format&fit=crop",
                Sections = new List<SectionTemplate>
                {
                    new SectionTemplate
                    {
                        Title = "Toán học & Xác suất thống kê trong Data Science",
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
                        Title = "Làm sạch & Biến đổi dữ liệu với Pandas",
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
                        Title = "Trực quan hóa Insight",
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
                Title = "Thực hành Data Science chuyên sâu với Python",
                Slug = "thuc-hanh-data-science-chuyen-sau",
                ShortDescription = "Cào dữ liệu web (Scraping), xử lý dữ liệu lớn, Feature Engineering và tối ưu hóa GridSearch.",
                Description = "Khóa học thực hành chuyên sâu tập trung vào kỹ năng xử lý dữ liệu phức tạp, thu thập dữ liệu tự động và xây dựng pipeline học máy chuyên nghiệp.",
                DetailedDescription = "Bạn sẽ được cào dữ liệu từ các website thật, tối ưu hóa các tham số mô hình thông qua GridSearchCV.",
                Category = "Data Science",
                Level = "INTERMEDIATE",
                Price = 499000,
                AverageRating = 4.8,
                ReviewCount = 29,
                MinimumMemberTier = "SILVER",
                Thumbnail = "https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=600&auto=format&fit=crop",
                Sections = new List<SectionTemplate>
                {
                    new SectionTemplate
                    {
                        Title = "Thu thập dữ liệu & Web Scraping",
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
                        Title = "Kỹ nghệ đặc trưng (Feature Engineering)",
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
                        Title = "Xây dựng & Tối ưu mô hình ML",
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
                Title = "Quản trị mạng máy tính: CCNA 200-301 nâng cao",
                Slug = "quan-tri-mang-ccna-nang-cao",
                ShortDescription = "Cấu hình định tuyến OSPF, thiết lập ACL bảo mật và NAT chuyển đổi IP.",
                Description = "Tiếp nối phần cơ bản, khóa học đi sâu vào kỹ năng thực hành cấu hình thiết bị mạng Cisco thật, định tuyến động và tối ưu hóa bảo mật hệ thống mạng nội bộ.",
                DetailedDescription = "Bạn sẽ làm chủ OSPFv2, Access Control List, NAT và chẩn đoán sự cố mạng bằng các lệnh Cisco IOS nâng cao.",
                Category = "Mạng máy tính",
                Level = "INTERMEDIATE",
                Price = 459000,
                AverageRating = 4.8,
                ReviewCount = 26,
                MinimumMemberTier = "SILVER",
                Thumbnail = "https://images.unsplash.com/photo-1544197150-b99a580bb7a8?w=600&auto=format&fit=crop",
                Sections = new List<SectionTemplate>
                {
                    new SectionTemplate
                    {
                        Title = "Định tuyến nâng cao & OSPF",
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
                        Title = "Giao thức bảo mật & NAT",
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
                        Title = "Dịch vụ mạng WAN & Khắc phục sự cố",
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
                Title = "An ninh mạng và Bảo mật hệ thống căn bản",
                Slug = "an-ninh-mang-bao-mat-he-thong",
                ShortDescription = "Tìm hiểu virus, Ransomware, tường lửa Firewall, chứng chỉ SSL/TLS và quét bảo mật Nmap.",
                Description = "Nhận thức các mối đe dọa an ninh mạng hiện đại và nắm vững các kỹ thuật phòng thủ cơ bản để bảo vệ thông tin cho cá nhân và tổ chức.",
                DetailedDescription = "Bạn sẽ học về CIA Triad, mật mã học đối xứng/bất đối xứng, cấu hình tường lửa và cách quét cổng mạng với Nmap.",
                Category = "Mạng máy tính",
                Level = "BEGINNER",
                Price = 399000,
                AverageRating = 4.7,
                ReviewCount = 31,
                MinimumMemberTier = "BRONZE",
                Thumbnail = "https://images.unsplash.com/photo-1550751827-4bd374c3f58b?w=600&auto=format&fit=crop",
                Sections = new List<SectionTemplate>
                {
                    new SectionTemplate
                    {
                        Title = "Các lỗ hổng bảo mật & Tấn công thường gặp",
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
                        Title = "Kỹ thuật phòng thủ & Mã hóa dữ liệu",
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
                        Title = "Đánh giá an toàn & Nhận thức bảo mật",
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
                Title = "Tư duy thiết kế UI/UX thực chiến",
                Slug = "tu-duy-thiet-ke-uiux-thuc-chien",
                ShortDescription = "Học nghiên cứu người dùng, vẽ Sitemap, Wireframe và áp dụng quy tắc màu sắc UI.",
                Description = "Khóa học xây dựng tư duy thiết kế lấy người dùng làm trung tâm (User-Centered Design). Học cách thiết kế giao diện web đẹp, trực quan và tối ưu trải nghiệm học tập.",
                DetailedDescription = "Bạn sẽ thực hành từ UX Research, tạo Wireframe đến áp dụng các quy tắc thiết kế UI (màu sắc, typography, khoảng trắng) để có sản phẩm Landing Page hoàn chỉnh.",
                Category = "UI/UX",
                Level = "BEGINNER",
                Price = 299000,
                AverageRating = 4.8,
                ReviewCount = 24,
                MinimumMemberTier = "BRONZE",
                Thumbnail = "https://images.unsplash.com/photo-1561070791-26c113006238?w=600&auto=format&fit=crop",
                Sections = new List<SectionTemplate>
                {
                    new SectionTemplate
                    {
                        Title = "Nghiên cứu người dùng (UX Research)",
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
                        Title = "Kiến trúc thông tin & Wireframe",
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
                        Title = "Nguyên lý thị giác & Thiết kế UI",
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
                Title = "Thiết kế Mobile App UI/UX nâng cao",
                Slug = "thiet-ke-mobile-app-uiux-nang-cao",
                ShortDescription = "Học Material Design, iOS Guidelines, xây dựng Figma UI System và micro-interactions.",
                Description = "Học thiết kế giao diện ứng dụng di động chuyên nghiệp trên Figma. Nắm chắc đặc thù màn hình cảm ứng, Material Design và iOS Guidelines.",
                DetailedDescription = "Khóa học hướng dẫn chi tiết cách tạo bộ Styles, Variables, Auto Layout và Smart Animate tạo hiệu ứng chuyển động chân thực nhất.",
                Category = "UI/UX",
                Level = "ADVANCED",
                Price = 499000,
                AverageRating = 4.9,
                ReviewCount = 18,
                MinimumMemberTier = "GOLD",
                Thumbnail = "https://images.unsplash.com/photo-1512941937669-90a1b58e7e9c?w=600&auto=format&fit=crop",
                Sections = new List<SectionTemplate>
                {
                    new SectionTemplate
                    {
                        Title = "Đặc thù thiết kế trên Mobile",
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
                        Title = "Xây dựng hệ thống UI System trong Figma",
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
                        Title = "Interactive Prototyping & Motion UI",
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
                Title = "Digital Marketing tổng quan cho doanh nghiệp nhỏ",
                Slug = "digital-marketing-tong-quan",
                ShortDescription = "Học SEO, Content Marketing, lập phễu khách hàng và đọc Google Analytics 4.",
                Description = "Nắm bắt bức tranh toàn cảnh về tiếp thị số. Lựa chọn kênh chạy quảng cáo phù hợp, lập kế hoạch nội dung thu hút khách hàng tiềm năng tự nhiên với chi phí tối ưu.",
                DetailedDescription = "Bạn sẽ học cách lập phễu khách hàng, thiết lập GA4 để đọc các chỉ số CTR, CPC, CPA, ROI nhằm đưa ra quyết định marketing đúng đắn.",
                Category = "Digital Marketing",
                Level = "BEGINNER",
                Price = 249000,
                AverageRating = 4.6,
                ReviewCount = 38,
                MinimumMemberTier = "BRONZE",
                Thumbnail = "https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=600&auto=format&fit=crop",
                Sections = new List<SectionTemplate>
                {
                    new SectionTemplate
                    {
                        Title = "Các kênh tiếp thị số chủ đạo",
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
                        Title = "Lập kế hoạch chiến dịch cơ bản",
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
                        Title = "Đo lường & Chỉ số đánh giá",
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
                Title = "Quảng cáo Google Ads & Facebook Ads từ cơ bản đến tối ưu",
                Slug = "quang-cao-google-ads-facebook-ads",
                ShortDescription = "Cấu hình chiến dịch Facebook Ads, nghiên cứu từ khóa Google và chạy Re-marketing tối ưu chi phí.",
                Description = "Khóa học thực chiến hướng dẫn từng bước thiết lập tài khoản quảng cáo, cài đặt Pixel/Tag đo lường, đấu thầu từ khóa và nhắm trúng mục tiêu khách hàng.",
                DetailedDescription = "Tối ưu hóa ngân sách quảng cáo của bạn, tránh lãng phí tiền và tăng tỷ lệ chuyển đổi đơn hàng thông qua tiếp thị lại (Re-marketing).",
                Category = "Digital Marketing",
                Level = "INTERMEDIATE",
                Price = 499000,
                AverageRating = 4.8,
                ReviewCount = 31,
                MinimumMemberTier = "SILVER",
                Thumbnail = "https://images.unsplash.com/photo-1533750516457-a7f992034fec?w=600&auto=format&fit=crop",
                Sections = new List<SectionTemplate>
                {
                    new SectionTemplate
                    {
                        Title = "Quảng cáo Facebook Ads thực chiến",
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
                        Title = "Quảng cáo Google Ads tìm kiếm",
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
                        Title = "Tối ưu chi phí & Re-marketing",
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
                Title = "CCNA 200-301 cho người mới bắt đầu",
                Slug = "ccna-200-301-cho-nguoi-moi-bat-dau",
                ShortDescription = "Mạng máy tính là hệ thống kết nối từ hai hoặc nhiều thiết bị lại với nhau.",
                Description = "Mạng máy tính là hệ thống kết nối từ hai hoặc nhiều thiết bị lại với nhau để trao đổi dữ liệu, chia sẻ tài nguyên và giao tiếp thông qua các giao thức mạng.",
                DetailedDescription = "Mạng máy tính là hệ thống kết nối từ hai hoặc nhiều thiết bị lại với nhau để trao đổi dữ liệu, chia sẻ tài nguyên và giao tiếp thông qua các giao thức mạng.",
                Thumbnail = "/uploads/images/ccna-cover.png",
                Category = "Mạng máy tính",
                Level = "BEGINNER",
                Price = 3999000,
                AverageRating = 4.8,
                ReviewCount = 12,
                MinimumMemberTier = "BRONZE",
                Sections = new List<SectionTemplate>
                {
                    new SectionTemplate
                    {
                        Title = "GIỚI THIỆU MẠNG MÁY TÍNH",
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
                        Title = "SWITCHING",
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
                        Title = "SECURITY",
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
