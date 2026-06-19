/*
    LMS demo seed for SQL Server.

    Safe to run more than once. It creates or updates:
    - 3 demo accounts: admin, instructor, student
    - Public courses with sections and lessons
    - Student enrollments, progress, purchases, wallet transactions
    - Certificates, reviews, coupons, and audit logs

    Demo password for all accounts: 123456
*/

SET NOCOUNT ON;

DECLARE @now datetime2 = SYSUTCDATETIME();
DECLARE @passwordHash nvarchar(255) = N'$2a$11$VrYG.sEXNLWRqtabpLZv3OXk26lXRU2Bfsgy09G2XRgTpcwyPz0Jm';

DECLARE @adminId nvarchar(450) = N'demo-user-admin';
DECLARE @instructorId nvarchar(450) = N'demo-user-instructor';
DECLARE @studentId nvarchar(450) = N'demo-user-student';

MERGE [User] AS target
USING (VALUES
    (@adminId, N'admin@gmail.com', N'Quản trị viên', @passwordHash, N'ADMIN', NULL, N'Quản lý hệ thống Skillio, duyệt khóa học và theo dõi giao dịch.', 0, 0, N'BRONZE', 0, 0),
    (@instructorId, N'instructor@gmail.com', N'GV. Kim', @passwordHash, N'INSTRUCTOR', NULL, N'Giảng viên demo phụ trách các khóa học lập trình, dữ liệu và UI/UX.', 0, 0, N'BRONZE', 0, 0),
    (@studentId, N'student@gmail.com', N'Học viên Demo 1', @passwordHash, N'STUDENT', NULL, N'Học viên demo dùng để kiểm thử ghi danh, ví, chứng chỉ và tiến trình học.', 101000, 399000, N'BRONZE', 45, 4)
) AS source (Id, Email, Name, Password, Role, Avatar, Bio, WalletBalance, TotalSpent, MemberTier, RewardPoints, LoginStreak)
ON target.Email = source.Email
WHEN MATCHED THEN UPDATE SET
    Name = source.Name,
    Password = source.Password,
    Role = source.Role,
    Avatar = source.Avatar,
    Bio = source.Bio,
    WalletBalance = source.WalletBalance,
    TotalSpent = source.TotalSpent,
    MemberTier = source.MemberTier,
    RewardPoints = source.RewardPoints,
    LoginStreak = source.LoginStreak,
    UpdatedAt = @now
WHEN NOT MATCHED THEN INSERT (
    Id, Email, Name, Password, Role, Avatar, Bio, WalletBalance, TotalSpent,
    MemberTier, RewardPoints, LoginStreak, CreatedAt, UpdatedAt
) VALUES (
    source.Id, source.Email, source.Name, source.Password, source.Role, source.Avatar, source.Bio,
    source.WalletBalance, source.TotalSpent, source.MemberTier, source.RewardPoints, source.LoginStreak, @now, @now
);

SELECT @adminId = Id FROM [User] WHERE Email = N'admin@gmail.com';
SELECT @instructorId = Id FROM [User] WHERE Email = N'instructor@gmail.com';
SELECT @studentId = Id FROM [User] WHERE Email = N'student@gmail.com';

DECLARE @courses TABLE (
    Id nvarchar(450),
    Title nvarchar(255),
    Slug nvarchar(255),
    ShortDescription nvarchar(max),
    Description nvarchar(max),
    DetailedDescription nvarchar(max),
    Thumbnail nvarchar(max),
    Category nvarchar(100),
    Level nvarchar(50),
    Price int,
    AverageRating float,
    ReviewCount int,
    MinimumMemberTier nvarchar(50),
    TotalDurationSeconds int,
    IsPublished bit,
    Status nvarchar(50),
    PublishedAt datetime2,
    StartDate datetime2,
    EndDate datetime2,
    InstructorId nvarchar(450),
    CreatedAt datetime2,
    UpdatedAt datetime2
);

INSERT INTO @courses VALUES
    (N'demo-course-figma-ui-ux', N'Figma UI/UX căn bản cho người mới', N'figma-ui-ux-can-ban',
     N'Làm quen tư duy thiết kế giao diện và dựng prototype nhanh trong Figma.',
     N'Khóa học giúp bạn nắm quy trình thiết kế UI/UX từ nghiên cứu người dùng, wireframe, design system đến prototype có thể trình bày với khách hàng.',
     N'Bạn sẽ thực hành từng bước qua các bài tập nhỏ: phân tích màn hình, tạo component, xây dựng layout responsive và chuẩn bị file handoff cho lập trình viên.',
     N'/uploads/courses/07e9920536574b858d494f14bdf2740f.png', N'UI/UX', N'BEGINNER', 299000, 4.8, 24, N'BRONZE', 12600, 1, N'PUBLIC', @now, DATEADD(day, -7, @now), DATEADD(day, 45, @now), @instructorId, DATEADD(day, -30, @now), @now),
    (N'demo-course-nodejs-api', N'Node.js API thực chiến với JWT và SQL', N'nodejs-api-thuc-chien',
     N'Xây dựng REST API có đăng nhập, phân quyền, upload file và kết nối database.',
     N'Khóa học tập trung vào backend thực tế: thiết kế endpoint, validate dữ liệu, bảo mật JWT, tổ chức service layer và xử lý lỗi rõ ràng.',
     N'Sau khóa học bạn có thể tự dựng một API hoàn chỉnh cho sản phẩm học tập, thương mại điện tử hoặc dashboard nội bộ.',
     N'/uploads/courses/21cb5fc0427f4c5d837adeda988c860e.png', N'Backend', N'INTERMEDIATE', 499000, 4.9, 31, N'SILVER', 16800, 1, N'PUBLIC', @now, DATEADD(day, -2, @now), DATEADD(day, 60, @now), @instructorId, DATEADD(day, -26, @now), @now),
    (N'demo-course-python-data', N'Python phân tích dữ liệu từ cơ bản', N'python-phan-tich-du-lieu',
     N'Làm sạch dữ liệu, phân tích bảng tính và trực quan hóa insight bằng Python.',
     N'Khóa học hướng dẫn sử dụng Python, Pandas và biểu đồ để biến dữ liệu thô thành báo cáo dễ hiểu cho học tập và công việc.',
     N'Nội dung phù hợp cho người mới muốn bắt đầu data analysis nhưng chưa có nền tảng lập trình sâu.',
     N'/uploads/courses/8d547520f27f4dea891ba56c749b62d1.jpg', N'Data', N'BEGINNER', 399000, 4.7, 18, N'BRONZE', 14400, 1, N'PUBLIC', @now, DATEADD(day, 3, @now), DATEADD(day, 50, @now), @instructorId, DATEADD(day, -22, @now), @now),
    (N'demo-course-sql-ef-core', N'SQL Server và EF Core thực chiến', N'sql-server-ef-core-thuc-chien',
     N'Thiết kế database, migration và truy vấn dữ liệu an toàn trong ASP.NET Core.',
     N'Khóa học đi từ mô hình quan hệ, khóa ngoại, index đến Entity Framework Core, giúp bạn xây dựng backend .NET có dữ liệu thật.',
     N'Bạn sẽ thực hành tạo migration, seed dữ liệu, viết truy vấn LINQ và tối ưu các màn hình dashboard.',
     N'/uploads/courses/8f8d9a941d494d468b58c7aa92aa0c1b.png', N'Database', N'INTERMEDIATE', 459000, 4.8, 22, N'SILVER', 15600, 1, N'PUBLIC', @now, DATEADD(day, -14, @now), DATEADD(day, 20, @now), @instructorId, DATEADD(day, -18, @now), @now),
    (N'demo-course-marketing-ai', N'Marketing AI cho người mới bắt đầu', N'marketing-ai-cho-nguoi-moi',
     N'Lên ý tưởng nội dung, viết kịch bản và đo hiệu quả chiến dịch với công cụ AI.',
     N'Khóa học giúp bạn ứng dụng AI vào quy trình marketing: nghiên cứu khách hàng, tạo nội dung, lập lịch đăng bài và đọc chỉ số chiến dịch.',
     N'Phù hợp cho người làm nội dung, chủ shop nhỏ hoặc sinh viên muốn có portfolio marketing hiện đại.',
     N'/uploads/courses/c0b9217ecda441ada1e217d11ed13889.png', N'Marketing', N'BEGINNER', 259000, 4.6, 15, N'BRONZE', 10800, 1, N'PUBLIC', @now, DATEADD(day, 10, @now), DATEADD(day, 70, @now), @instructorId, DATEADD(day, -14, @now), @now),
    (N'demo-course-react-advanced', N'Lập trình React nâng cao', N'lap-trinh-react-nang-cao',
     N'Xây dựng giao diện hiện đại, quản lý state và tối ưu trải nghiệm người dùng.',
     N'Khóa học thực hành giúp học viên xây dựng giao diện React chuyên nghiệp với component rõ ràng, API thật và trải nghiệm học tập mượt mà.',
     N'Tập trung vào routing, hooks, data fetching, form, tối ưu render và cách tổ chức code frontend cho dự án LMS.',
     N'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=1200&q=80', N'Frontend', N'ADVANCED', 399000, 5, 1, N'BRONZE', 13200, 1, N'PUBLIC', @now, DATEADD(day, -20, @now), DATEADD(day, 35, @now), @instructorId, DATEADD(day, -40, @now), @now);

MERGE [Course] AS target
USING @courses AS source
ON target.Id = source.Id OR target.Slug = source.Slug
WHEN MATCHED THEN UPDATE SET
    Title = source.Title,
    Slug = source.Slug,
    ShortDescription = source.ShortDescription,
    Description = source.Description,
    DetailedDescription = source.DetailedDescription,
    Thumbnail = source.Thumbnail,
    Category = source.Category,
    Level = source.Level,
    Price = source.Price,
    AverageRating = source.AverageRating,
    ReviewCount = source.ReviewCount,
    MinimumMemberTier = source.MinimumMemberTier,
    TotalDurationSeconds = source.TotalDurationSeconds,
    IsPublished = source.IsPublished,
    Status = source.Status,
    PublishedAt = source.PublishedAt,
    StartDate = source.StartDate,
    EndDate = source.EndDate,
    InstructorId = source.InstructorId,
    UpdatedAt = @now
WHEN NOT MATCHED THEN INSERT (
    Id, Title, Slug, ShortDescription, Description, DetailedDescription, Thumbnail,
    Category, Level, Price, AverageRating, ReviewCount, MinimumMemberTier,
    TotalDurationSeconds, IsPublished, Status, PublishedAt, StartDate, EndDate,
    InstructorId, CreatedAt, UpdatedAt
) VALUES (
    source.Id, source.Title, source.Slug, source.ShortDescription, source.Description, source.DetailedDescription, source.Thumbnail,
    source.Category, source.Level, source.Price, source.AverageRating, source.ReviewCount, source.MinimumMemberTier,
    source.TotalDurationSeconds, source.IsPublished, source.Status, source.PublishedAt, source.StartDate, source.EndDate,
    source.InstructorId, source.CreatedAt, source.UpdatedAt
);

DECLARE @figmaCourseId nvarchar(450) = (SELECT Id FROM [Course] WHERE Slug = N'figma-ui-ux-can-ban');
DECLARE @nodeCourseId nvarchar(450) = (SELECT Id FROM [Course] WHERE Slug = N'nodejs-api-thuc-chien');
DECLARE @pythonCourseId nvarchar(450) = (SELECT Id FROM [Course] WHERE Slug = N'python-phan-tich-du-lieu');
DECLARE @sqlCourseId nvarchar(450) = (SELECT Id FROM [Course] WHERE Slug = N'sql-server-ef-core-thuc-chien');
DECLARE @aiCourseId nvarchar(450) = (SELECT Id FROM [Course] WHERE Slug = N'marketing-ai-cho-nguoi-moi');
DECLARE @reactCourseId nvarchar(450) = (SELECT Id FROM [Course] WHERE Slug = N'lap-trinh-react-nang-cao');

DECLARE @sections TABLE (Id nvarchar(450), CourseId nvarchar(450), Title nvarchar(255), Description nvarchar(max), Position int);
INSERT INTO @sections VALUES
    (N'demo-section-figma-01', @figmaCourseId, N'Nền tảng UI/UX', N'Tư duy thiết kế và cách đọc vấn đề người dùng.', 1),
    (N'demo-section-figma-02', @figmaCourseId, N'Thiết kế prototype', N'Tạo component, auto layout và prototype có thể trình bày.', 2),
    (N'demo-section-node-01', @nodeCourseId, N'Thiết kế REST API', N'Tổ chức route, controller, service và validation.', 1),
    (N'demo-section-node-02', @nodeCourseId, N'Bảo mật và triển khai', N'JWT, phân quyền và chuẩn bị môi trường chạy thật.', 2),
    (N'demo-section-python-01', @pythonCourseId, N'Làm quen dữ liệu', N'Đọc file, kiểm tra dữ liệu thiếu và làm sạch dữ liệu.', 1),
    (N'demo-section-python-02', @pythonCourseId, N'Báo cáo và biểu đồ', N'Tạo biểu đồ và rút insight cho báo cáo.', 2),
    (N'demo-section-sql-01', @sqlCourseId, N'Thiết kế SQL Server', N'Bảng, khóa chính, khóa ngoại và index cơ bản.', 1),
    (N'demo-section-sql-02', @sqlCourseId, N'Entity Framework Core', N'Migration, seed dữ liệu và truy vấn LINQ.', 2),
    (N'demo-section-ai-01', @aiCourseId, N'Nghiên cứu và lên ý tưởng', N'Dùng AI để hiểu khách hàng và tạo kế hoạch nội dung.', 1),
    (N'demo-section-ai-02', @aiCourseId, N'Sản xuất nội dung', N'Viết caption, kịch bản video ngắn và lịch đăng bài.', 2),
    (N'demo-section-react-01', @reactCourseId, N'Kiến trúc React', N'Tổ chức component, route và state theo màn hình thật.', 1),
    (N'demo-section-react-02', @reactCourseId, N'Tối ưu trải nghiệm', N'Data fetching, loading state, form và tối ưu render.', 2);

MERGE [Section] AS target
USING @sections AS source
ON target.Id = source.Id
WHEN MATCHED THEN UPDATE SET
    Title = source.Title,
    Description = source.Description,
    Position = source.Position,
    CourseId = source.CourseId,
    UpdatedAt = @now
WHEN NOT MATCHED THEN INSERT (Id, Title, Description, Position, CourseId, CreatedAt, UpdatedAt)
VALUES (source.Id, source.Title, source.Description, source.Position, source.CourseId, @now, @now);

DECLARE @lessons TABLE (
    Id nvarchar(450),
    CourseId nvarchar(450),
    SectionId nvarchar(450),
    Title nvarchar(255),
    Content nvarchar(max),
    Position int,
    Duration int,
    IsPreview bit
);

INSERT INTO @lessons VALUES
    (N'demo-lesson-figma-01', @figmaCourseId, N'demo-section-figma-01', N'Tư duy thiết kế lấy người dùng làm trung tâm', N'Tìm hiểu nhu cầu người dùng, mục tiêu sản phẩm và cách chuyển insight thành màn hình.', 1, 1800, 1),
    (N'demo-lesson-figma-02', @figmaCourseId, N'demo-section-figma-01', N'Xây dựng wireframe nhanh', N'Phác thảo layout, luồng thao tác và ưu tiên nội dung quan trọng.', 2, 2100, 0),
    (N'demo-lesson-figma-03', @figmaCourseId, N'demo-section-figma-02', N'Tạo component và auto layout trong Figma', N'Tạo component có thể tái sử dụng và cấu hình auto layout cho nhiều kích thước màn hình.', 1, 2400, 0),
    (N'demo-lesson-node-01', @nodeCourseId, N'demo-section-node-01', N'Tổ chức route, controller và service', N'Chia trách nhiệm code backend để dễ test, dễ bảo trì và dễ mở rộng.', 1, 2100, 1),
    (N'demo-lesson-node-02', @nodeCourseId, N'demo-section-node-01', N'Kết nối database và viết truy vấn', N'Làm việc với SQL, transaction và xử lý lỗi database thường gặp.', 2, 2700, 0),
    (N'demo-lesson-node-03', @nodeCourseId, N'demo-section-node-02', N'Đăng nhập JWT và phân quyền role', N'Tạo access token, bảo vệ endpoint và kiểm tra quyền theo vai trò.', 1, 3000, 0),
    (N'demo-lesson-python-01', @pythonCourseId, N'demo-section-python-01', N'Đọc dữ liệu CSV và Excel', N'Import dữ liệu từ nhiều nguồn và chuẩn hóa tên cột.', 1, 1800, 1),
    (N'demo-lesson-python-02', @pythonCourseId, N'demo-section-python-01', N'Làm sạch dữ liệu với Pandas', N'Xử lý dữ liệu thiếu, dữ liệu trùng và kiểu dữ liệu không đồng nhất.', 2, 2400, 0),
    (N'demo-lesson-python-03', @pythonCourseId, N'demo-section-python-02', N'Tạo biểu đồ và báo cáo insight', N'Tạo biểu đồ và rút insight cho báo cáo học tập hoặc công việc.', 1, 2100, 0),
    (N'demo-lesson-sql-01', @sqlCourseId, N'demo-section-sql-01', N'Thiết kế bảng, khóa chính và khóa ngoại', N'Tạo mô hình dữ liệu bền vững cho hệ thống học tập.', 1, 2100, 1),
    (N'demo-lesson-sql-02', @sqlCourseId, N'demo-section-sql-01', N'Index và tối ưu truy vấn cơ bản', N'Đọc execution plan đơn giản và thêm index đúng chỗ.', 2, 2400, 0),
    (N'demo-lesson-sql-03', @sqlCourseId, N'demo-section-sql-02', N'Migration và seed dữ liệu trong EF Core', N'Tạo migration, cập nhật database và chuẩn bị dữ liệu demo.', 1, 2700, 0),
    (N'demo-lesson-ai-01', @aiCourseId, N'demo-section-ai-01', N'Tạo chân dung khách hàng bằng AI', N'Viết prompt để phân tích nhóm khách hàng và insight mua hàng.', 1, 1800, 1),
    (N'demo-lesson-ai-02', @aiCourseId, N'demo-section-ai-01', N'Lên lịch nội dung theo tuần', N'Tạo lịch nội dung có mục tiêu, kênh đăng và thông điệp rõ ràng.', 2, 2100, 0),
    (N'demo-lesson-ai-03', @aiCourseId, N'demo-section-ai-02', N'Viết caption và kịch bản video ngắn', N'Tạo nội dung ngắn, dễ thử nghiệm và dễ đo hiệu quả.', 1, 2400, 0),
    (N'demo-lesson-react-01', @reactCourseId, N'demo-section-react-01', N'Tổ chức route và layout dashboard', N'Tạo cấu trúc màn hình cho ứng dụng có nhiều vai trò người dùng.', 1, 2100, 1),
    (N'demo-lesson-react-02', @reactCourseId, N'demo-section-react-01', N'Fetch API và quản lý loading state', N'Đồng bộ dữ liệu thật từ backend và hiển thị trạng thái rỗng rõ ràng.', 2, 2400, 0),
    (N'demo-lesson-react-03', @reactCourseId, N'demo-section-react-02', N'Tối ưu form và trải nghiệm tương tác', N'Xử lý form, validate và phản hồi thao tác nhanh cho người dùng.', 1, 2700, 0);

MERGE [Lesson] AS target
USING @lessons AS source
ON target.Id = source.Id
WHEN MATCHED THEN UPDATE SET
    Title = source.Title,
    Content = source.Content,
    DurationSeconds = source.Duration,
    Position = source.Position,
    IsPublished = 1,
    Status = N'PUBLIC',
    IsPreview = source.IsPreview,
    CourseId = source.CourseId,
    SectionId = source.SectionId,
    UpdatedAt = @now
WHEN NOT MATCHED THEN INSERT (
    Id, Title, Content, VideoUrl, IllustrationUrl, FileUrl, DurationSeconds,
    Position, IsPublished, Status, IsPreview, CourseId, SectionId, CreatedAt, UpdatedAt
) VALUES (
    source.Id, source.Title, source.Content, NULL, NULL, NULL, source.Duration,
    source.Position, 1, N'PUBLIC', source.IsPreview, source.CourseId, source.SectionId, @now, @now
);

DECLARE @enrollments TABLE (Id nvarchar(450), CourseId nvarchar(450), Progress float, CompletedAt datetime2, CreatedAt datetime2);
INSERT INTO @enrollments VALUES
    (N'demo-enroll-figma', @figmaCourseId, 38, NULL, DATEADD(day, -7, @now)),
    (N'demo-enroll-nodejs', @nodeCourseId, 100, DATEADD(day, -1, @now), DATEADD(day, -6, @now)),
    (N'demo-enroll-python', @pythonCourseId, 0, NULL, DATEADD(day, -2, @now)),
    (N'demo-enroll-sql', @sqlCourseId, 76, NULL, DATEADD(day, -14, @now)),
    (N'demo-enroll-marketing-ai', @aiCourseId, 100, DATEADD(day, -3, @now), DATEADD(day, -20, @now)),
    (N'demo-enroll-react', @reactCourseId, 100, DATEADD(day, -8, @now), DATEADD(day, -30, @now));

MERGE [Enrollment] AS target
USING @enrollments AS source
ON target.UserId = @studentId AND target.CourseId = source.CourseId
WHEN MATCHED THEN UPDATE SET
    Progress = source.Progress,
    CompletedAt = source.CompletedAt,
    UpdatedAt = @now
WHEN NOT MATCHED THEN INSERT (Id, Progress, CompletedAt, UserId, CourseId, CreatedAt, UpdatedAt)
VALUES (source.Id, source.Progress, source.CompletedAt, @studentId, source.CourseId, source.CreatedAt, @now);

DECLARE @lessonProgress TABLE (Id nvarchar(450), LessonId nvarchar(450), IsCompleted bit, WatchedSeconds int, CompletionRate float, CompletedAt datetime2);
INSERT INTO @lessonProgress VALUES
    (N'demo-progress-figma-01', N'demo-lesson-figma-01', 1, 1800, 100, DATEADD(day, -6, @now)),
    (N'demo-progress-node-01', N'demo-lesson-node-01', 1, 2100, 100, DATEADD(day, -5, @now)),
    (N'demo-progress-node-02', N'demo-lesson-node-02', 1, 2700, 100, DATEADD(day, -4, @now)),
    (N'demo-progress-node-03', N'demo-lesson-node-03', 1, 3000, 100, DATEADD(day, -1, @now)),
    (N'demo-progress-sql-01', N'demo-lesson-sql-01', 1, 2100, 100, DATEADD(day, -13, @now)),
    (N'demo-progress-sql-02', N'demo-lesson-sql-02', 1, 2100, 85, DATEADD(day, -10, @now)),
    (N'demo-progress-ai-01', N'demo-lesson-ai-01', 1, 1800, 100, DATEADD(day, -18, @now)),
    (N'demo-progress-ai-02', N'demo-lesson-ai-02', 1, 2100, 100, DATEADD(day, -12, @now)),
    (N'demo-progress-ai-03', N'demo-lesson-ai-03', 1, 2400, 100, DATEADD(day, -3, @now)),
    (N'demo-progress-react-01', N'demo-lesson-react-01', 1, 2100, 100, DATEADD(day, -15, @now)),
    (N'demo-progress-react-02', N'demo-lesson-react-02', 1, 2400, 100, DATEADD(day, -12, @now)),
    (N'demo-progress-react-03', N'demo-lesson-react-03', 1, 2700, 100, DATEADD(day, -8, @now));

MERGE [LessonProgress] AS target
USING @lessonProgress AS source
ON target.UserId = @studentId AND target.LessonId = source.LessonId
WHEN MATCHED THEN UPDATE SET
    IsCompleted = source.IsCompleted,
    WatchedSeconds = source.WatchedSeconds,
    LastPositionSeconds = source.WatchedSeconds,
    CompletionRate = source.CompletionRate,
    CompletedAt = source.CompletedAt,
    UpdatedAt = @now
WHEN NOT MATCHED THEN INSERT (
    Id, IsCompleted, WatchedSeconds, LastPositionSeconds, CompletionRate, CompletedAt, UserId, LessonId, CreatedAt, UpdatedAt
) VALUES (
    source.Id, source.IsCompleted, source.WatchedSeconds, source.WatchedSeconds, source.CompletionRate, source.CompletedAt, @studentId, source.LessonId, source.CompletedAt, @now
);

DECLARE @purchases TABLE (Id nvarchar(450), CourseId nvarchar(450), OriginalAmount int, DiscountAmount int, FinalAmount int, CreatedAt datetime2);
INSERT INTO @purchases VALUES
    (N'demo-purchase-react', @reactCourseId, 399000, 0, 399000, DATEADD(day, -30, @now)),
    (N'demo-purchase-nodejs', @nodeCourseId, 499000, 100000, 399000, DATEADD(day, -6, @now));

MERGE [Purchase] AS target
USING @purchases AS source
ON target.UserId = @studentId AND target.CourseId = source.CourseId
WHEN MATCHED THEN UPDATE SET
    OriginalAmount = source.OriginalAmount,
    DiscountAmount = source.DiscountAmount,
    FinalAmount = source.FinalAmount,
    Currency = N'VND',
    Status = N'COMPLETED',
    UpdatedAt = @now
WHEN NOT MATCHED THEN INSERT (
    Id, OriginalAmount, DiscountAmount, FinalAmount, Currency, Status, UserId, CourseId, CouponId, CreatedAt, UpdatedAt
) VALUES (
    source.Id, source.OriginalAmount, source.DiscountAmount, source.FinalAmount, N'VND', N'COMPLETED', @studentId, source.CourseId, NULL, source.CreatedAt, @now
);

DECLARE @reactPurchaseId nvarchar(450) = (SELECT Id FROM [Purchase] WHERE UserId = @studentId AND CourseId = @reactCourseId);
DECLARE @nodePurchaseId nvarchar(450) = (SELECT Id FROM [Purchase] WHERE UserId = @studentId AND CourseId = @nodeCourseId);

DECLARE @wallet TABLE (Id nvarchar(450), Type nvarchar(50), Amount int, BalanceAfter int, Note nvarchar(max), CourseId nvarchar(450), PurchaseId nvarchar(450), CreatedAt datetime2);
INSERT INTO @wallet VALUES
    (N'demo-wallet-topup', N'NAP_TIEN', 500000, 500000, N'Nạp ví demo ban đầu', NULL, NULL, DATEADD(day, -31, @now)),
    (N'demo-wallet-buy-react', N'MUA_KHOA_HOC', -399000, 101000, N'Mua khóa học Lập trình React nâng cao', @reactCourseId, @reactPurchaseId, DATEADD(day, -30, @now)),
    (N'demo-wallet-topup-small', N'NAP_TIEN', 399000, 500000, N'Nạp ví demo lần 2', NULL, NULL, DATEADD(day, -7, @now)),
    (N'demo-wallet-buy-node', N'MUA_KHOA_HOC', -399000, 101000, N'Mua khóa học Node.js API thực chiến', @nodeCourseId, @nodePurchaseId, DATEADD(day, -6, @now));

MERGE [WalletTransaction] AS target
USING @wallet AS source
ON target.Id = source.Id
WHEN MATCHED THEN UPDATE SET
    Type = source.Type,
    Amount = source.Amount,
    BalanceAfter = source.BalanceAfter,
    Note = source.Note,
    Status = N'COMPLETED',
    UserId = @studentId,
    CourseId = source.CourseId,
    PurchaseId = source.PurchaseId,
    CreatedAt = source.CreatedAt
WHEN NOT MATCHED THEN INSERT (
    Id, Type, Amount, BalanceAfter, Note, Status, Metadata, UserId, CourseId, PurchaseId, ExternalPaymentId, CreatedAt
) VALUES (
    source.Id, source.Type, source.Amount, source.BalanceAfter, source.Note, N'COMPLETED', NULL, @studentId, source.CourseId, source.PurchaseId, NULL, source.CreatedAt
);

DECLARE @certificates TABLE (Id nvarchar(450), CertificateNo nvarchar(100), VerifyCode nvarchar(100), CourseId nvarchar(450), IssuedAt datetime2);
INSERT INTO @certificates VALUES
    (N'demo-cert-react', N'SKL-REACT-2026-001', N'VERIFY-REACT-DEMO', @reactCourseId, DATEADD(day, -8, @now)),
    (N'demo-cert-marketing-ai', N'SKL-AI-2026-001', N'VERIFY-AI-DEMO', @aiCourseId, DATEADD(day, -3, @now));

MERGE [Certificate] AS target
USING @certificates AS source
ON target.UserId = @studentId AND target.CourseId = source.CourseId
WHEN MATCHED THEN UPDATE SET
    CertificateNo = source.CertificateNo,
    VerifyCode = source.VerifyCode,
    PdfUrl = NULL,
    CompletionSnapshot = N'Dữ liệu chứng chỉ demo',
    IssuedAt = source.IssuedAt
WHEN NOT MATCHED THEN INSERT (Id, CertificateNo, VerifyCode, PdfUrl, CompletionSnapshot, IssuedAt, UserId, CourseId)
VALUES (source.Id, source.CertificateNo, source.VerifyCode, NULL, N'Dữ liệu chứng chỉ demo', source.IssuedAt, @studentId, source.CourseId);

DECLARE @reviews TABLE (Id nvarchar(450), CourseId nvarchar(450), Rating int, Comment nvarchar(max), CreatedAt datetime2);
INSERT INTO @reviews VALUES
    (N'demo-review-react', @reactCourseId, 5, N'Khóa học thực tế, giao diện demo đẹp và dễ hiểu.', DATEADD(day, -7, @now)),
    (N'demo-review-sql', @sqlCourseId, 5, N'Phần EF Core và seed dữ liệu rất hữu ích cho dự án LMS.', DATEADD(day, -4, @now));

MERGE [CourseReview] AS target
USING @reviews AS source
ON target.UserId = @studentId AND target.CourseId = source.CourseId
WHEN MATCHED THEN UPDATE SET
    Rating = source.Rating,
    Comment = source.Comment,
    UpdatedAt = @now
WHEN NOT MATCHED THEN INSERT (Id, Rating, Comment, UserId, CourseId, CreatedAt, UpdatedAt)
VALUES (source.Id, source.Rating, source.Comment, @studentId, source.CourseId, source.CreatedAt, @now);

DECLARE @coupons TABLE (Id nvarchar(450), Code nvarchar(100), DiscountType nvarchar(50), DiscountValue int, MinPurchaseAmount int, MaxDiscountAmount int, CourseId nvarchar(450));
INSERT INTO @coupons VALUES
    (N'demo-coupon-welcome', N'WELCOME20', N'PERCENTAGE', 20, 100000, 100000, NULL),
    (N'demo-coupon-react', N'REACT100K', N'FIXED', 100000, 200000, 100000, @reactCourseId);

MERGE [Coupon] AS target
USING @coupons AS source
ON target.Code = source.Code
WHEN MATCHED THEN UPDATE SET
    DiscountType = source.DiscountType,
    DiscountValue = source.DiscountValue,
    MinPurchaseAmount = source.MinPurchaseAmount,
    MaxDiscountAmount = source.MaxDiscountAmount,
    StartDate = DATEADD(day, -30, @now),
    EndDate = DATEADD(day, 90, @now),
    IsActive = 1,
    UsageLimit = 100,
    CourseId = source.CourseId,
    UpdatedAt = @now
WHEN NOT MATCHED THEN INSERT (
    Id, Code, DiscountType, DiscountValue, MinPurchaseAmount, MaxDiscountAmount,
    StartDate, EndDate, IsActive, UsageLimit, UsageCount, CourseId, CreatedAt, UpdatedAt
) VALUES (
    source.Id, source.Code, source.DiscountType, source.DiscountValue, source.MinPurchaseAmount, source.MaxDiscountAmount,
    DATEADD(day, -30, @now), DATEADD(day, 90, @now), 1, 100, 0, source.CourseId, @now, @now
);

MERGE [AuditLog] AS target
USING (VALUES
    (N'demo-audit-seed', @adminId, N'admin@gmail.com', N'SEED_DEMO_DATA', N'System', N'demo-seed', N'{"source":"backend-dotnet/Data/DemoCourses.sql"}', @now)
) AS source (Id, ActorId, ActorEmail, Action, EntityType, EntityId, Metadata, CreatedAt)
ON target.Id = source.Id
WHEN MATCHED THEN UPDATE SET
    ActorId = source.ActorId,
    ActorEmail = source.ActorEmail,
    Action = source.Action,
    EntityType = source.EntityType,
    EntityId = source.EntityId,
    Metadata = source.Metadata,
    CreatedAt = source.CreatedAt
WHEN NOT MATCHED THEN INSERT (Id, ActorId, ActorEmail, Action, EntityType, EntityId, Metadata, IpAddress, UserAgent, CreatedAt)
VALUES (source.Id, source.ActorId, source.ActorEmail, source.Action, source.EntityType, source.EntityId, source.Metadata, NULL, N'Demo seed', source.CreatedAt);

SELECT
    (SELECT COUNT(*) FROM [User] WHERE Email IN (N'admin@gmail.com', N'instructor@gmail.com', N'student@gmail.com')) AS DemoUsers,
    (SELECT COUNT(*) FROM [Course] WHERE Slug IN (
        N'figma-ui-ux-can-ban',
        N'nodejs-api-thuc-chien',
        N'python-phan-tich-du-lieu',
        N'sql-server-ef-core-thuc-chien',
        N'marketing-ai-cho-nguoi-moi',
        N'lap-trinh-react-nang-cao'
    )) AS DemoCourses,
    (SELECT COUNT(*) FROM [Lesson] WHERE Id LIKE N'demo-lesson-%') AS DemoLessons,
    (SELECT COUNT(*) FROM [Enrollment] WHERE UserId = @studentId) AS StudentEnrollments,
    (SELECT COUNT(*) FROM [Certificate] WHERE UserId = @studentId) AS StudentCertificates,
    (SELECT COUNT(*) FROM [WalletTransaction] WHERE UserId = @studentId) AS StudentWalletTransactions;
