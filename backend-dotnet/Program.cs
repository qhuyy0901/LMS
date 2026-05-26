using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using System.Text.Json;
using LMS.Api.Data;
using LMS.Api.Models;
using LMS.Api.Security;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;

var builder = WebApplication.CreateBuilder(args);

builder.Logging.ClearProviders();
builder.Logging.AddConsole();

var connectionString =
    builder.Configuration.GetConnectionString("DefaultConnection")
    ?? builder.Configuration["DATABASE_URL"]
    ?? "Server=127.0.0.1,11433;Database=lms;User Id=sa;Password=LmsPassw0rd#2026;TrustServerCertificate=True;Encrypt=False";

var frontendUrl = builder.Configuration["FRONTEND_URL"] ?? "http://localhost:5173";
var jwtSecret = builder.Configuration["JWT_SECRET"] ?? "change-me-to-a-long-random-secret";
var jwtKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtSecret));

builder.Services.AddDbContext<LmsDbContext>(options =>
    options.UseSqlServer(connectionString, sqlOptions =>
    {
        sqlOptions.EnableRetryOnFailure();
        sqlOptions.UseQuerySplittingBehavior(QuerySplittingBehavior.SplitQuery);
    }));
builder.Services.AddOpenApi();

builder.Services
    .AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = false,
            ValidateAudience = false,
            ValidateIssuerSigningKey = true,
            IssuerSigningKey = jwtKey,
            ClockSkew = TimeSpan.FromMinutes(1)
        };
    });

builder.Services.AddAuthorization();
builder.Services.AddCors(options =>
{
    options.AddPolicy("Frontend", policy =>
    {
        policy
            .WithOrigins(
                frontendUrl,
                "http://localhost:5173",
                "http://localhost:5174",
                "http://127.0.0.1:5173",
                "http://127.0.0.1:5174")
            .AllowAnyHeader()
            .AllowAnyMethod();
    });
});

var app = builder.Build();

if (app.Environment.IsDevelopment())
{
    using var scope = app.Services.CreateScope();
    var db = scope.ServiceProvider.GetRequiredService<LmsDbContext>();
    await SeedData.SeedAsync(db);
}

if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
}

app.UseCors("Frontend");
app.UseAuthentication();
app.UseAuthorization();

app.MapGet("/", () => Results.Text("ASP.NET Core LMS API is running!"));
app.MapGet("/health", () => Results.Ok(new { status = "ok" }));

app.MapPost("/api/auth/register", async (RegisterRequest request, LmsDbContext db) =>
{
    var email = request.Email.Trim().ToLowerInvariant();
    var exists = await db.Users.AnyAsync(user => user.Email == email);
    if (exists)
    {
        return Results.Conflict(new { message = "Email da ton tai" });
    }

    var user = new User
    {
        Id = Cuid.New(),
        Email = email,
        Name = string.IsNullOrWhiteSpace(request.Name) ? email : request.Name.Trim(),
        Password = BCrypt.Net.BCrypt.HashPassword(request.Password),
        Role = "STUDENT",
        MemberTier = "BRONZE",
        CreatedAt = DateTime.UtcNow,
        UpdatedAt = DateTime.UtcNow
    };

    db.Users.Add(user);
    await db.SaveChangesAsync();

    return Results.Created("/api/user/me", AuthResponse.FromUser(user, CreateToken(user, jwtKey)));
});

app.MapPost("/api/auth/login", async (LoginRequest request, LmsDbContext db) =>
{
    var email = request.Email.Trim().ToLowerInvariant();
    var user = await db.Users.FirstOrDefaultAsync(item => item.Email == email);

    if (user is null || !BCrypt.Net.BCrypt.Verify(request.Password, user.Password))
    {
        return Results.Unauthorized();
    }

    return Results.Ok(AuthResponse.FromUser(user, CreateToken(user, jwtKey)));
});

app.MapGet("/api/user/me", async (ClaimsPrincipal principal, LmsDbContext db) =>
{
    var userId = principal.FindFirstValue(ClaimTypes.NameIdentifier);
    if (userId is null)
    {
        return Results.Unauthorized();
    }

    var user = await db.Users.AsNoTracking().FirstOrDefaultAsync(item => item.Id == userId);
    return user is null ? Results.Unauthorized() : Results.Ok(UserDto.FromUser(user));
}).RequireAuthorization();

app.MapPut("/api/user/me", async (UserUpdateRequest request, ClaimsPrincipal principal, LmsDbContext db) =>
{
    var userId = CurrentUserId(principal);
    if (userId is null) return Results.Unauthorized();

    var user = await db.Users.FirstOrDefaultAsync(item => item.Id == userId);
    if (user is null) return Results.NotFound(new { message = "Không tìm thấy người dùng" });

    if (!string.IsNullOrWhiteSpace(request.Name)) user.Name = request.Name.Trim();
    if (request.Phone is not null) user.Phone = request.Phone.Trim();
    if (request.Bio is not null) user.Bio = request.Bio.Trim();
    if (request.Settings is not null) user.Settings = JsonSerializer.Serialize(request.Settings);
    user.UpdatedAt = DateTime.UtcNow;

    await db.SaveChangesAsync();
    return Results.Ok(UserDto.FromUser(user));
}).RequireAuthorization();

app.MapGet("/api/user/billing-history", async (ClaimsPrincipal principal, LmsDbContext db) =>
{
    var userId = CurrentUserId(principal);
    if (userId is null) return Results.Unauthorized();

    var transactions = await db.WalletTransactions
        .AsNoTracking()
        .Where(item => item.UserId == userId)
        .Include(item => item.Course)
        .Include(item => item.Purchase)
        .Include(item => item.ExternalPayment)
        .OrderByDescending(item => item.CreatedAt)
        .Take(20)
        .ToListAsync();

    return Results.Ok(transactions.Select(item => new
    {
        item.Id,
        item.Type,
        item.Amount,
        amountText = FormatCurrencyVnd(item.Amount),
        item.BalanceAfter,
        balanceAfterText = FormatCurrencyVnd(item.BalanceAfter),
        item.Note,
        item.CreatedAt,
        course = item.Course == null ? null : new { item.Course.Id, item.Course.Title },
        purchase = item.Purchase == null ? null : new { item.Purchase.Id, item.Purchase.FinalAmount, item.Purchase.Status },
        externalPayment = item.ExternalPayment == null ? null : new
        {
            item.ExternalPayment.Id,
            item.ExternalPayment.Status,
            item.ExternalPayment.Provider,
            item.ExternalPayment.ProviderSessionId
        }
    }));
}).RequireAuthorization();

app.MapGet("/api/user/certificates", async (ClaimsPrincipal principal, LmsDbContext db) =>
{
    var userId = CurrentUserId(principal);
    if (userId is null) return Results.Unauthorized();

    var certificates = await db.Certificates
        .AsNoTracking()
        .Where(item => item.UserId == userId)
        .Include(item => item.Course)
        .OrderByDescending(item => item.IssuedAt)
        .Select(item => new
        {
            item.Id,
            item.CertificateNo,
            item.VerifyCode,
            item.PdfUrl,
            item.IssuedAt,
            course = item.Course == null ? null : new { item.Course.Id, item.Course.Title, item.Course.Thumbnail }
        })
        .ToListAsync();

    return Results.Ok(certificates);
}).RequireAuthorization();

app.MapDelete("/api/user/avatar", async (ClaimsPrincipal principal, LmsDbContext db) =>
{
    var userId = CurrentUserId(principal);
    if (userId is null) return Results.Unauthorized();

    var user = await db.Users.FirstOrDefaultAsync(item => item.Id == userId);
    if (user is null) return Results.NotFound(new { message = "Không tìm thấy người dùng" });

    user.Avatar = null;
    user.UpdatedAt = DateTime.UtcNow;
    await db.SaveChangesAsync();

    return Results.Ok(new { message = "Đã xóa ảnh đại diện", avatarUrl = (string?)null });
}).RequireAuthorization();

app.MapPost("/api/user/avatar", async (HttpRequest request, ClaimsPrincipal principal, LmsDbContext db) =>
{
    var userId = CurrentUserId(principal);
    if (userId is null) return Results.Unauthorized();

    var user = await db.Users.FirstOrDefaultAsync(item => item.Id == userId);
    if (user is null) return Results.NotFound(new { message = "Không tìm thấy người dùng" });

    user.Avatar = $"https://api.dicebear.com/7.x/avataaars/svg?seed={Uri.EscapeDataString(user.Email)}";
    user.UpdatedAt = DateTime.UtcNow;
    await db.SaveChangesAsync();

    return Results.Ok(new { message = "Tải ảnh thành công", avatarUrl = user.Avatar });
}).RequireAuthorization();

app.MapDelete("/api/user/me", async (ClaimsPrincipal principal, LmsDbContext db) =>
{
    var userId = CurrentUserId(principal);
    if (userId is null) return Results.Unauthorized();

    var user = await db.Users.FirstOrDefaultAsync(item => item.Id == userId);
    if (user is null) return Results.NotFound(new { message = "Không tìm thấy người dùng" });

    db.Users.Remove(user);
    await db.SaveChangesAsync();

    return Results.Ok(new { message = "Tài khoản đã được xóa vĩnh viễn." });
}).RequireAuthorization();

app.MapGet("/api/courses/enrolled", async (ClaimsPrincipal principal, LmsDbContext db) =>
{
    var userId = CurrentUserId(principal);
    if (userId is null) return Results.Unauthorized();

    var courses = await db.Enrollments
        .AsNoTracking()
        .Where(item => item.UserId == userId)
        .Include(item => item.Course)
        .OrderByDescending(item => item.CreatedAt)
        .Select(item => new
        {
            item.Id,
            item.Progress,
            item.CompletedAt,
            item.CreatedAt,
            course = item.Course == null ? null : CourseDto.FromCourse(item.Course)
        })
        .ToListAsync();

    return Results.Ok(courses);
}).RequireAuthorization();

app.MapGet("/api/courses", async (LmsDbContext db, int page = 1, int pageSize = 20, bool paginate = false) =>
{
    page = Math.Max(1, page);
    pageSize = Math.Clamp(pageSize, 1, 100);

    var query = db.Courses
        .AsNoTracking()
        .Where(course => course.IsPublished)
        .OrderByDescending(course => course.CreatedAt);

    if (!paginate)
    {
        var courses = await query.Take(pageSize).Select(course => CourseDto.FromCourse(course)).ToListAsync();
        return Results.Ok(courses);
    }

    var total = await query.CountAsync();
    var items = await query
        .Skip((page - 1) * pageSize)
        .Take(pageSize)
        .Select(course => CourseDto.FromCourse(course))
        .ToListAsync();

    return Results.Ok(new
    {
        items,
        total,
        page,
        pageSize,
        pages = (int)Math.Ceiling(total / (double)pageSize)
    });
});

app.MapGet("/api/courses/{id}", async (string id, ClaimsPrincipal principal, LmsDbContext db) =>
{
    var course = await db.Courses
        .AsNoTracking()
        .Include(item => item.Instructor)
        .Include(item => item.Sections.OrderBy(section => section.Position))
            .ThenInclude(section => section.Lessons.OrderBy(lesson => lesson.Position))
                .ThenInclude(lesson => lesson.Quiz)
        .Include(item => item.Reviews.OrderByDescending(review => review.CreatedAt).Take(10))
            .ThenInclude(review => review.User)
        .FirstOrDefaultAsync(item => item.Id == id);

    if (course is null) return Results.NotFound(new { message = "Không tìm thấy khóa học" });

    var userId = CurrentUserId(principal);
    var isOwner = userId is not null && course.InstructorId == userId;
    if (!course.IsPublished && !isOwner) return Results.NotFound(new { message = "Không tìm thấy khóa học" });

    Enrollment? enrollment = null;
    var completedLessons = new List<string>();
    CourseReview? userReview = null;

    if (userId is not null)
    {
        enrollment = await db.Enrollments
            .AsNoTracking()
            .FirstOrDefaultAsync(item => item.UserId == userId && item.CourseId == id);

        if (enrollment is not null)
        {
            completedLessons = await db.LessonProgresses
                .AsNoTracking()
                .Where(item => item.UserId == userId && item.IsCompleted && item.Lesson != null && item.Lesson.CourseId == id)
                .Select(item => item.LessonId)
                .ToListAsync();

            userReview = await db.CourseReviews
                .AsNoTracking()
                .FirstOrDefaultAsync(item => item.UserId == userId && item.CourseId == id);
        }
    }

    return Results.Ok(CourseDetailsDto.FromCourse(course, enrollment, completedLessons, userReview, isOwner));
});

app.MapGet("/api/courses/{id}/reviews", async (string id, LmsDbContext db) =>
{
    var course = await db.Courses
        .AsNoTracking()
        .Include(item => item.Reviews.OrderByDescending(review => review.CreatedAt))
            .ThenInclude(review => review.User)
        .FirstOrDefaultAsync(item => item.Id == id && item.IsPublished);

    if (course is null) return Results.NotFound(new { message = "Không tìm thấy khóa học" });

    return Results.Ok(new
    {
        averageRating = course.AverageRating,
        reviewCount = course.ReviewCount,
        reviews = course.Reviews.Select(ReviewDto.FromReview)
    });
});

app.MapPost("/api/courses/{id}/reviews", async (string id, ReviewRequest request, ClaimsPrincipal principal, LmsDbContext db) =>
{
    var userId = CurrentUserId(principal);
    if (userId is null) return Results.Unauthorized();

    if (request.Rating < 1 || request.Rating > 5)
    {
        return Results.BadRequest(new { message = "Số sao đánh giá phải trong khoảng từ 1 đến 5" });
    }

    var course = await db.Courses.FirstOrDefaultAsync(item => item.Id == id && item.IsPublished);
    if (course is null) return Results.NotFound(new { message = "Không tìm thấy khóa học" });
    if (course.InstructorId == userId) return Results.Json(new { message = "Giảng viên không thể tự đánh giá khóa học của mình" }, statusCode: StatusCodes.Status403Forbidden);

    var enrolled = await db.Enrollments.AnyAsync(item => item.UserId == userId && item.CourseId == id);
    if (!enrolled) return Results.Json(new { message = "Bạn cần đăng ký khóa học trước khi đánh giá" }, statusCode: StatusCodes.Status403Forbidden);

    var now = DateTime.UtcNow;
    var review = await db.CourseReviews
        .Include(item => item.User)
        .FirstOrDefaultAsync(item => item.UserId == userId && item.CourseId == id);

    if (review is null)
    {
        review = new CourseReview
        {
            Id = Cuid.New(),
            UserId = userId,
            CourseId = id,
            CreatedAt = now
        };
        db.CourseReviews.Add(review);
    }

    review.Rating = request.Rating;
    review.Comment = string.IsNullOrWhiteSpace(request.Comment) ? null : request.Comment.Trim();
    review.UpdatedAt = now;

    await db.SaveChangesAsync();
    await SyncCourseReviewStats(db, id);

    var savedReview = await db.CourseReviews.AsNoTracking().Include(item => item.User).FirstAsync(item => item.Id == review.Id);
    var updatedCourse = await db.Courses.AsNoTracking().FirstAsync(item => item.Id == id);

    return Results.Ok(new
    {
        message = "Đã lưu đánh giá khóa học",
        review = ReviewDto.FromReview(savedReview),
        averageRating = updatedCourse.AverageRating,
        reviewCount = updatedCourse.ReviewCount
    });
}).RequireAuthorization();

app.MapDelete("/api/courses/{id}/reviews/me", async (string id, ClaimsPrincipal principal, LmsDbContext db) =>
{
    var userId = CurrentUserId(principal);
    if (userId is null) return Results.Unauthorized();

    var review = await db.CourseReviews.FirstOrDefaultAsync(item => item.UserId == userId && item.CourseId == id);
    if (review is null) return Results.NotFound(new { message = "Bạn chưa có đánh giá nào để xóa" });

    db.CourseReviews.Remove(review);
    await db.SaveChangesAsync();
    await SyncCourseReviewStats(db, id);

    var course = await db.Courses.AsNoTracking().FirstAsync(item => item.Id == id);
    return Results.Ok(new
    {
        message = "Đã xóa đánh giá của bạn",
        averageRating = course.AverageRating,
        reviewCount = course.ReviewCount
    });
}).RequireAuthorization();

app.MapPost("/api/courses/{id}/enroll", async (string id, ClaimsPrincipal principal, LmsDbContext db) =>
{
    var userId = CurrentUserId(principal);
    if (userId is null) return Results.Unauthorized();

    var course = await db.Courses.FirstOrDefaultAsync(item => item.Id == id && item.IsPublished);
    if (course is null) return Results.NotFound(new { message = "Không tìm thấy khóa học" });
    if (course.Price > 0) return Results.BadRequest(new { message = "Khóa học có phí, vui lòng thanh toán bằng ví." });

    var exists = await db.Enrollments.AnyAsync(item => item.UserId == userId && item.CourseId == id);
    if (exists) return Results.BadRequest(new { message = "Bạn đã đăng ký khóa học này" });

    db.Enrollments.Add(new Enrollment
    {
        Id = Cuid.New(),
        UserId = userId,
        CourseId = id,
        Progress = 0,
        CreatedAt = DateTime.UtcNow,
        UpdatedAt = DateTime.UtcNow
    });
    await db.SaveChangesAsync();

    return Results.Ok(new { message = "Đăng ký khóa học thành công" });
}).RequireAuthorization();

app.MapPost("/api/courses/{courseId}/lessons/{lessonId}/complete", async (string courseId, string lessonId, ClaimsPrincipal principal, LmsDbContext db) =>
{
    var userId = CurrentUserId(principal);
    if (userId is null) return Results.Unauthorized();

    var result = await UpsertLessonProgress(db, userId, courseId, lessonId, markCompleted: true);
    return result;
}).RequireAuthorization();

app.MapPost("/api/courses/{courseId}/lessons/{lessonId}/progress", async (string courseId, string lessonId, ProgressRequest request, ClaimsPrincipal principal, LmsDbContext db) =>
{
    var userId = CurrentUserId(principal);
    if (userId is null) return Results.Unauthorized();

    var result = await UpsertLessonProgress(db, userId, courseId, lessonId, request.WatchedSeconds, request.LastPositionSeconds, request.DurationSeconds, request.MarkCompleted);
    return result;
}).RequireAuthorization();

app.MapGet("/api/courses/{courseId}/lessons/{lessonId}/comments", async (string courseId, string lessonId, ClaimsPrincipal principal, LmsDbContext db) =>
{
    var access = await HasLessonAccess(db, CurrentUserId(principal), courseId);
    if (!access) return Results.Json(new { message = "Bạn không có quyền truy cập bài học này" }, statusCode: StatusCodes.Status403Forbidden);

    var comments = await db.Comments
        .AsNoTracking()
        .Where(item => item.LessonId == lessonId && item.ParentId == null)
        .Include(item => item.User)
        .Include(item => item.Replies.OrderBy(reply => reply.CreatedAt))
            .ThenInclude(reply => reply.User)
        .OrderByDescending(item => item.CreatedAt)
        .ToListAsync();

    return Results.Ok(comments.Select(CommentDto.FromComment));
}).RequireAuthorization();

app.MapPost("/api/courses/{courseId}/lessons/{lessonId}/comments", async (string courseId, string lessonId, CommentRequest request, ClaimsPrincipal principal, LmsDbContext db) =>
{
    var userId = CurrentUserId(principal);
    if (userId is null) return Results.Unauthorized();

    var access = await HasLessonAccess(db, userId, courseId);
    if (!access) return Results.Json(new { message = "Bạn không có quyền truy cập bài học này" }, statusCode: StatusCodes.Status403Forbidden);
    if (string.IsNullOrWhiteSpace(request.Content)) return Results.BadRequest(new { message = "Nội dung bình luận không được để trống" });

    var now = DateTime.UtcNow;
    var comment = new Comment
    {
        Id = Cuid.New(),
        Content = request.Content.Trim(),
        LessonId = lessonId,
        UserId = userId,
        ParentId = string.IsNullOrWhiteSpace(request.ParentId) ? null : request.ParentId,
        CreatedAt = now,
        UpdatedAt = now
    };

    db.Comments.Add(comment);
    await db.SaveChangesAsync();

    var saved = await db.Comments.AsNoTracking().Include(item => item.User).Include(item => item.Replies).FirstAsync(item => item.Id == comment.Id);
    return Results.Created($"/api/courses/{courseId}/lessons/{lessonId}/comments/{comment.Id}", CommentDto.FromComment(saved));
}).RequireAuthorization();

app.MapGet("/api/quizzes/lesson/{lessonId}", async (string lessonId, ClaimsPrincipal principal, LmsDbContext db) =>
{
    var userId = CurrentUserId(principal);
    if (userId is null) return Results.Unauthorized();

    var lesson = await db.Lessons.AsNoTracking().Include(item => item.Course).FirstOrDefaultAsync(item => item.Id == lessonId);
    if (lesson is null) return Results.NotFound(new { message = "Không tìm thấy bài học này" });

    var access = await HasLessonAccess(db, userId, lesson.CourseId);
    if (!access) return Results.Json(new { message = "Bạn không có quyền truy cập bài học này" }, statusCode: StatusCodes.Status403Forbidden);

    var quiz = await db.Quizzes
        .AsNoTracking()
        .Include(item => item.Questions.OrderBy(question => question.Position))
        .FirstOrDefaultAsync(item => item.LessonId == lessonId);

    if (quiz is null) return Results.Ok(null);

    var submissions = await db.QuizSubmissions
        .AsNoTracking()
        .Where(item => item.UserId == userId && item.QuizId == quiz.Id)
        .OrderByDescending(item => item.CreatedAt)
        .Take(5)
        .ToListAsync();

    var isOwner = lesson.Course?.InstructorId == userId || principal.FindFirstValue(ClaimTypes.Role) == "ADMIN";
    return Results.Ok(QuizDto.FromQuiz(quiz, submissions, showAnswers: isOwner));
}).RequireAuthorization();

app.MapPost("/api/quizzes/lesson/{lessonId}", async (string lessonId, QuizUpsertRequest request, ClaimsPrincipal principal, LmsDbContext db) =>
{
    var userId = CurrentUserId(principal);
    if (userId is null) return Results.Unauthorized();

    var lesson = await db.Lessons.AsNoTracking().Include(item => item.Course).FirstOrDefaultAsync(item => item.Id == lessonId);
    if (lesson is null) return Results.NotFound(new { message = "Không tìm thấy bài học này" });

    var isAuthorized = principal.FindFirstValue(ClaimTypes.Role) == "ADMIN" || lesson.Course?.InstructorId == userId;
    if (!isAuthorized) return Results.Json(new { message = "Bạn không có quyền quản lý bài trắc nghiệm cho bài học này" }, statusCode: StatusCodes.Status403Forbidden);
    if (string.IsNullOrWhiteSpace(request.Title)) return Results.BadRequest(new { message = "Tiêu đề quiz không được để trống" });
    if (request.Questions is null || request.Questions.Count == 0) return Results.BadRequest(new { message = "Quiz phải có ít nhất 1 câu hỏi" });

    for (var index = 0; index < request.Questions.Count; index++)
    {
        var question = request.Questions[index];
        if (string.IsNullOrWhiteSpace(question.QuestionText) || question.Options is null || question.Options.Count < 2)
        {
            return Results.BadRequest(new { message = $"Câu hỏi thứ {index + 1} không đầy đủ nội dung hoặc thiếu lựa chọn" });
        }

        if (question.CorrectOptionIndex < 0 || question.CorrectOptionIndex >= question.Options.Count)
        {
            return Results.BadRequest(new { message = $"Câu hỏi thứ {index + 1} có đáp án đúng không hợp lệ" });
        }
    }

    await using var transaction = await db.Database.BeginTransactionAsync();
    var now = DateTime.UtcNow;
    var quiz = await db.Quizzes.Include(item => item.Questions).FirstOrDefaultAsync(item => item.LessonId == lessonId);
    if (quiz is null)
    {
        quiz = new Quiz
        {
            Id = Cuid.New(),
            LessonId = lessonId,
            CreatedAt = now
        };
        db.Quizzes.Add(quiz);
    }

    quiz.Title = request.Title.Trim();
    quiz.Description = request.Description;
    quiz.PassingScore = request.PassingScore ?? 80;
    quiz.UpdatedAt = now;

    db.QuizQuestions.RemoveRange(quiz.Questions);
    foreach (var question in request.Questions.Select((item, index) => new { item, index }))
    {
        db.QuizQuestions.Add(new QuizQuestion
        {
            Id = Cuid.New(),
            QuizId = quiz.Id,
            QuestionText = question.item.QuestionText!.Trim(),
            Options = JsonSerializer.Serialize(question.item.Options),
            CorrectOptionIndex = question.item.CorrectOptionIndex,
            Explanation = string.IsNullOrWhiteSpace(question.item.Explanation) ? null : question.item.Explanation.Trim(),
            Position = question.index,
            CreatedAt = now,
            UpdatedAt = now
        });
    }

    await db.SaveChangesAsync();
    await transaction.CommitAsync();

    var savedQuiz = await db.Quizzes
        .AsNoTracking()
        .Include(item => item.Questions.OrderBy(question => question.Position))
        .FirstAsync(item => item.Id == quiz.Id);

    return Results.Ok(QuizDto.FromQuiz(savedQuiz, [], showAnswers: true));
}).RequireAuthorization();

app.MapPost("/api/quizzes/lesson/{lessonId}/submit", async (string lessonId, QuizSubmitRequest request, ClaimsPrincipal principal, LmsDbContext db) =>
{
    var userId = CurrentUserId(principal);
    if (userId is null) return Results.Unauthorized();

    var lesson = await db.Lessons.AsNoTracking().FirstOrDefaultAsync(item => item.Id == lessonId);
    if (lesson is null) return Results.NotFound(new { message = "Không tìm thấy bài học này" });

    var enrolled = await db.Enrollments.AnyAsync(item => item.UserId == userId && item.CourseId == lesson.CourseId);
    if (!enrolled) return Results.Json(new { message = "Bạn chưa đăng ký khóa học này" }, statusCode: StatusCodes.Status403Forbidden);

    var quiz = await db.Quizzes
        .Include(item => item.Questions.OrderBy(question => question.Position))
        .FirstOrDefaultAsync(item => item.LessonId == lessonId);
    if (quiz is null) return Results.NotFound(new { message = "Bài học này chưa có bài trắc nghiệm" });

    var answers = request.Answers ?? new Dictionary<string, int>();
    var totalQuestions = quiz.Questions.Count;
    var correctCount = 0;
    var detailedResults = quiz.Questions.OrderBy(item => item.Position).Select(question =>
    {
        var selected = answers.TryGetValue(question.Id, out var selectedIndex) ? selectedIndex : (int?)null;
        var isCorrect = selected == question.CorrectOptionIndex;
        if (isCorrect) correctCount += 1;
        return new
        {
            questionId = question.Id,
            questionText = question.QuestionText,
            options = ParseOptions(question.Options),
            selectedIndex = selected,
            question.CorrectOptionIndex,
            isCorrect,
            question.Explanation
        };
    }).ToList();

    var score = totalQuestions == 0 ? 0 : Math.Round((correctCount / (double)totalQuestions) * 100);
    var passed = score >= quiz.PassingScore;
    var submission = new QuizSubmission
    {
        Id = Cuid.New(),
        UserId = userId,
        QuizId = quiz.Id,
        Score = score,
        Passed = passed,
        Answers = JsonSerializer.Serialize(answers),
        CreatedAt = DateTime.UtcNow
    };
    db.QuizSubmissions.Add(submission);
    await db.SaveChangesAsync();

    double? progress = null;
    if (passed)
    {
        await UpsertLessonProgress(db, userId, lesson.CourseId, lessonId, markCompleted: true);
        progress = await db.Enrollments
            .Where(item => item.UserId == userId && item.CourseId == lesson.CourseId)
            .Select(item => (double?)item.Progress)
            .FirstOrDefaultAsync();
    }

    return Results.Ok(new
    {
        submissionId = submission.Id,
        score,
        passed,
        passingScore = quiz.PassingScore,
        correctCount,
        totalQuestions,
        detailedResults,
        progress
    });
}).RequireAuthorization();

app.MapDelete("/api/quizzes/{id}", async (string id, ClaimsPrincipal principal, LmsDbContext db) =>
{
    var userId = CurrentUserId(principal);
    if (userId is null) return Results.Unauthorized();

    var quiz = await db.Quizzes
        .Include(item => item.Lesson)
            .ThenInclude(lesson => lesson!.Course)
        .Include(item => item.Questions)
        .Include(item => item.Submissions)
        .FirstOrDefaultAsync(item => item.Id == id);
    if (quiz is null) return Results.NotFound(new { message = "Không tìm thấy bài trắc nghiệm" });

    var isAuthorized = principal.FindFirstValue(ClaimTypes.Role) == "ADMIN" || quiz.Lesson?.Course?.InstructorId == userId;
    if (!isAuthorized) return Results.Json(new { message = "Bạn không có quyền xóa bài trắc nghiệm này" }, statusCode: StatusCodes.Status403Forbidden);

    db.QuizSubmissions.RemoveRange(quiz.Submissions);
    db.QuizQuestions.RemoveRange(quiz.Questions);
    db.Quizzes.Remove(quiz);
    await db.SaveChangesAsync();

    return Results.Ok(new { message = "Xóa bài trắc nghiệm thành công" });
}).RequireAuthorization();

app.MapPost("/api/payments/create-checkout-session", async (PaymentRequest request, ClaimsPrincipal principal, LmsDbContext db) =>
{
    var userId = CurrentUserId(principal);
    if (userId is null) return Results.Unauthorized();

    if (request.Type == "topup")
    {
        var allowedAmounts = new[] { 100000, 200000, 500000, 1000000 };
        var topUpAmount = request.Amount ?? 0;
        if (!allowedAmounts.Contains(topUpAmount))
        {
            return Results.BadRequest(new { message = "Mệnh giá nạp ví không hợp lệ" });
        }

        var user = await db.Users.FirstOrDefaultAsync(item => item.Id == userId);
        if (user is null) return Results.NotFound(new { message = "Không tìm thấy người dùng" });

        var now = DateTime.UtcNow;
        var mockSessionId = $"mock_wallet_{DateTimeOffset.UtcNow.ToUnixTimeMilliseconds()}";
        var externalPayment = new ExternalPayment
        {
            Id = Cuid.New(),
            UserId = userId,
            Amount = topUpAmount,
            Provider = "MOCK",
            ProviderSessionId = mockSessionId,
            Status = "COMPLETED",
            Note = $"Nạp ví test {FormatCurrencyVnd(topUpAmount)}",
            CompletedAt = now,
            CreatedAt = now,
            UpdatedAt = now
        };

        user.WalletBalance += topUpAmount;
        user.UpdatedAt = now;

        db.ExternalPayments.Add(externalPayment);
        db.WalletTransactions.Add(new WalletTransaction
        {
            Id = Cuid.New(),
            UserId = userId,
            Type = "TOP_UP",
            Amount = topUpAmount,
            BalanceAfter = user.WalletBalance,
            Note = $"Nạp ví test {FormatCurrencyVnd(topUpAmount)}",
            ExternalPaymentId = externalPayment.Id,
            CreatedAt = now
        });
        db.Notifications.Add(new Notification
        {
            Id = Cuid.New(),
            UserId = userId,
            Type = "PAYMENT_SUCCESS",
            Title = "Nạp ví thành công",
            Body = $"Bạn vừa nạp thành công {FormatCurrencyVnd(topUpAmount)} vào ví nội bộ.",
            Link = "/pricing",
            Metadata = JsonSerializer.Serialize(new { amount = topUpAmount, externalPaymentId = externalPayment.Id }),
            CreatedAt = now
        });

        await db.SaveChangesAsync();
        return Results.Ok(new { url = $"{frontendUrl}/payment-success?kind=topup&amount={topUpAmount}&session_id={mockSessionId}" });
    }

    if (request.Type != "course" || string.IsNullOrWhiteSpace(request.CourseId))
    {
        return Results.BadRequest(new { message = "Loại giao dịch không hợp lệ" });
    }

    var result = await PurchaseCourseWithWallet(db, userId, request.CourseId, frontendUrl, request.CouponCode);
    return result;
}).RequireAuthorization();

app.MapPost("/api/coupons/validate", async (CouponValidateRequest request, ClaimsPrincipal principal, LmsDbContext db) =>
{
    if (CurrentUserId(principal) is null) return Results.Unauthorized();
    if (string.IsNullOrWhiteSpace(request.CourseId)) return Results.BadRequest(new { valid = false, error = "Thiếu thông tin khóa học" });

    var course = await db.Courses.AsNoTracking().FirstOrDefaultAsync(item => item.Id == request.CourseId);
    if (course is null) return Results.NotFound(new { valid = false, error = "Không tìm thấy khóa học" });

    var result = await ValidateCouponForCourse(db, request.Code, request.CourseId, course.Price);
    if (!result.Valid)
    {
        return Results.BadRequest(new { valid = false, error = result.Error });
    }

    return Results.Ok(new
    {
        valid = true,
        discountAmount = result.DiscountAmount,
        discountType = result.Coupon!.DiscountType,
        discountValue = result.Coupon.DiscountValue,
        finalPrice = Math.Max(0, course.Price - result.DiscountAmount),
        couponCode = result.Coupon.Code
    });
}).RequireAuthorization();

app.MapGet("/api/coupons", async (ClaimsPrincipal principal, LmsDbContext db, string? q = null, string? status = null, int page = 1, int pageSize = 20) =>
{
    var auth = RequireAdmin(principal);
    if (auth is not null) return auth;

    page = Math.Max(1, page);
    pageSize = Math.Clamp(pageSize, 1, 100);
    var query = db.Coupons.AsNoTracking().Include(item => item.Course).AsQueryable();
    if (!string.IsNullOrWhiteSpace(q))
    {
        var keyword = q.Trim().ToUpperInvariant();
        query = query.Where(item => item.Code.Contains(keyword));
    }
    if (status == "active") query = query.Where(item => item.IsActive);
    if (status == "inactive") query = query.Where(item => !item.IsActive);

    var total = await query.CountAsync();
    var items = await query.OrderByDescending(item => item.CreatedAt).Skip((page - 1) * pageSize).Take(pageSize).ToListAsync();
    return Results.Ok(Paginated(items.Select(CouponDto.FromCoupon), total, page, pageSize));
}).RequireAuthorization();

app.MapPost("/api/coupons", async (CouponCreateRequest request, ClaimsPrincipal principal, HttpContext http, LmsDbContext db) =>
{
    var auth = RequireAdmin(principal);
    if (auth is not null) return auth;

    if (string.IsNullOrWhiteSpace(request.Code) || request.DiscountValue <= 0)
    {
        return Results.BadRequest(new { message = "Mã giảm giá và giá trị giảm giá là bắt buộc" });
    }

    var code = request.Code.Trim().ToUpperInvariant();
    if (!System.Text.RegularExpressions.Regex.IsMatch(code, "^[A-Z0-9_-]{3,30}$"))
    {
        return Results.BadRequest(new { message = "Mã giảm giá chỉ cho phép chữ in hoa, số, dấu gạch ngang và gạch dưới (3-30 ký tự)" });
    }

    var discountType = string.IsNullOrWhiteSpace(request.DiscountType) ? "PERCENTAGE" : request.DiscountType;
    if (discountType is not ("PERCENTAGE" or "FIXED_AMOUNT")) return Results.BadRequest(new { message = "Loại giảm giá không hợp lệ" });
    if (discountType == "PERCENTAGE" && request.DiscountValue > 100) return Results.BadRequest(new { message = "Phần trăm giảm giá không được vượt quá 100%" });
    if (await db.Coupons.AnyAsync(item => item.Code == code)) return Results.Conflict(new { message = $"Mã \"{code}\" đã tồn tại trong hệ thống" });
    if (!string.IsNullOrWhiteSpace(request.CourseId) && !await db.Courses.AnyAsync(item => item.Id == request.CourseId))
    {
        return Results.NotFound(new { message = "Khóa học không tồn tại" });
    }

    var now = DateTime.UtcNow;
    var coupon = new Coupon
    {
        Id = Cuid.New(),
        Code = code,
        DiscountType = discountType,
        DiscountValue = request.DiscountValue,
        MinPurchaseAmount = Math.Max(0, request.MinPurchaseAmount ?? 0),
        MaxDiscountAmount = request.MaxDiscountAmount,
        StartDate = request.StartDate,
        EndDate = request.EndDate,
        UsageLimit = request.UsageLimit,
        CourseId = string.IsNullOrWhiteSpace(request.CourseId) ? null : request.CourseId,
        IsActive = true,
        UsageCount = 0,
        CreatedAt = now,
        UpdatedAt = now
    };

    db.Coupons.Add(coupon);
    await db.SaveChangesAsync();
    await WriteAuditLog(db, principal, http, "COUPON_CREATED", "Coupon", coupon.Id, new { coupon.Code, coupon.DiscountType, coupon.DiscountValue });

    var saved = await db.Coupons.AsNoTracking().Include(item => item.Course).FirstAsync(item => item.Id == coupon.Id);
    return Results.Created($"/api/coupons/{coupon.Id}", CouponDto.FromCoupon(saved));
}).RequireAuthorization();

app.MapPatch("/api/coupons/{id}/toggle", async (string id, ClaimsPrincipal principal, HttpContext http, LmsDbContext db) =>
{
    var auth = RequireAdmin(principal);
    if (auth is not null) return auth;

    var coupon = await db.Coupons.Include(item => item.Course).FirstOrDefaultAsync(item => item.Id == id);
    if (coupon is null) return Results.NotFound(new { message = "Không tìm thấy mã giảm giá" });

    coupon.IsActive = !coupon.IsActive;
    coupon.UpdatedAt = DateTime.UtcNow;
    await db.SaveChangesAsync();
    await WriteAuditLog(db, principal, http, coupon.IsActive ? "COUPON_ACTIVATED" : "COUPON_DEACTIVATED", "Coupon", coupon.Id, new { coupon.Code, coupon.IsActive });

    return Results.Ok(CouponDto.FromCoupon(coupon));
}).RequireAuthorization();

app.MapDelete("/api/coupons/{id}", async (string id, ClaimsPrincipal principal, HttpContext http, LmsDbContext db) =>
{
    var auth = RequireAdmin(principal);
    if (auth is not null) return auth;

    var coupon = await db.Coupons.FirstOrDefaultAsync(item => item.Id == id);
    if (coupon is null) return Results.NotFound(new { message = "Không tìm thấy mã giảm giá" });

    db.Coupons.Remove(coupon);
    await db.SaveChangesAsync();
    await WriteAuditLog(db, principal, http, "COUPON_DELETED", "Coupon", id, new { coupon.Code });

    return Results.Ok(new { message = "Đã xóa mã giảm giá thành công" });
}).RequireAuthorization();

app.MapGet("/api/dashboard", async (ClaimsPrincipal principal, LmsDbContext db) =>
{
    var userId = principal.FindFirstValue(ClaimTypes.NameIdentifier);
    if (userId is null)
    {
        return Results.Unauthorized();
    }

    var enrollments = await db.Enrollments.CountAsync(item => item.UserId == userId);
    var certificates = await db.Certificates.CountAsync(item => item.UserId == userId);
    var user = await db.Users.AsNoTracking().FirstOrDefaultAsync(item => item.Id == userId);

    return Results.Ok(new
    {
        enrollments,
        certificates,
        walletBalance = user?.WalletBalance ?? 0,
        totalSpent = user?.TotalSpent ?? 0,
        memberTier = user?.MemberTier ?? "BRONZE"
    });
}).RequireAuthorization();

app.MapGet("/api/dashboard/stats", async (ClaimsPrincipal principal, LmsDbContext db) =>
{
    var userId = CurrentUserId(principal);
    if (userId is null) return Results.Unauthorized();

    var user = await db.Users.AsNoTracking().FirstOrDefaultAsync(item => item.Id == userId);
    if (user is null) return Results.Unauthorized();

    if (user.Role == "INSTRUCTOR")
    {
        var courses = await db.Courses
            .AsNoTracking()
            .Where(item => item.InstructorId == userId)
            .Include(item => item.Enrollments)
            .Include(item => item.Lessons)
            .OrderByDescending(item => item.UpdatedAt)
            .ToListAsync();
        var courseIds = courses.Select(item => item.Id).ToList();
        var purchases = await db.Purchases.AsNoTracking().Where(item => courseIds.Contains(item.CourseId) && item.Status == "COMPLETED").ToListAsync();
        var recentEnrollments = await db.Enrollments
            .AsNoTracking()
            .Where(item => courseIds.Contains(item.CourseId))
            .Include(item => item.User)
            .Include(item => item.Course)
            .OrderByDescending(item => item.CreatedAt)
            .Take(5)
            .ToListAsync();
        var totalRevenue = purchases.Sum(item => item.FinalAmount);

        return Results.Ok(new
        {
            role = "INSTRUCTOR",
            stats = new
            {
                totalCourses = courses.Count,
                publishedCourses = courses.Count(item => item.IsPublished),
                draftCourses = courses.Count(item => !item.IsPublished),
                totalStudents = courses.SelectMany(item => item.Enrollments).Select(item => item.UserId).Distinct().Count(),
                totalRevenue,
                totalRevenueFormatted = FormatCurrencyVnd(totalRevenue)
            },
            courses = courses.Select(item => new
            {
                item.Id,
                item.Title,
                item.IsPublished,
                enrollments = item.Enrollments.Count,
                lessons = item.Lessons.Count
            }),
            recentEnrollments = recentEnrollments.Select(item => new
            {
                studentName = item.User?.Name,
                studentEmail = item.User?.Email,
                studentAvatar = item.User?.Avatar,
                courseTitle = item.Course?.Title,
                enrolledAt = item.CreatedAt
            })
        });
    }

    if (user.Role == "ADMIN")
    {
        var totalUsers = await db.Users.CountAsync();
        var totalCourses = await db.Courses.CountAsync();
        var totalEnrollments = await db.Enrollments.CountAsync();
        var totalRevenue = await db.Purchases.Where(item => item.Status == "COMPLETED").SumAsync(item => item.FinalAmount);
        var pendingPayments = await db.ExternalPayments.CountAsync(item => item.Status == "PENDING");
        var recentUsers = await db.Users.AsNoTracking().OrderByDescending(item => item.CreatedAt).Take(5).ToListAsync();

        return Results.Ok(new
        {
            role = "ADMIN",
            stats = new
            {
                totalUsers,
                totalCourses,
                totalEnrollments,
                totalRevenue,
                totalRevenueFormatted = FormatCurrencyVnd(totalRevenue),
                pendingPayments
            },
            recentUsers = recentUsers.Select(item => new { item.Id, item.Name, item.Email, item.Role, item.CreatedAt })
        });
    }

    var enrollments = await db.Enrollments
        .AsNoTracking()
        .Where(item => item.UserId == userId)
        .Include(item => item.Course)
            .ThenInclude(course => course!.Lessons)
        .OrderByDescending(item => item.UpdatedAt)
        .Take(10)
        .ToListAsync();
    var completedLessons = await db.LessonProgresses.CountAsync(item => item.UserId == userId && item.IsCompleted);
    var certificates = await db.Certificates.CountAsync(item => item.UserId == userId);
    var avgProgress = enrollments.Count == 0 ? 0 : (int)Math.Round(enrollments.Average(item => item.Progress));

    return Results.Ok(new
    {
        role = "STUDENT",
        stats = new
        {
            totalEnrolled = enrollments.Count,
            completedCourses = enrollments.Count(item => item.CompletedAt != null),
            completedLessons,
            certificates,
            avgProgress,
            user.WalletBalance,
            user.TotalSpent,
            user.MemberTier
        },
        recentCourses = enrollments
            .Where(item => item.CompletedAt == null && item.Course != null)
            .Take(3)
            .Select(item => new
            {
                courseId = item.CourseId,
                title = item.Course!.Title,
                slug = item.Course.Slug,
                thumbnail = item.Course.Thumbnail,
                progress = (int)Math.Round(item.Progress),
                totalLessons = item.Course.Lessons.Count,
                totalDuration = item.Course.TotalDurationSeconds
            })
    });
}).RequireAuthorization();

app.MapGet("/api/admin/users", async (ClaimsPrincipal principal, LmsDbContext db, string? q = null, string? role = null, int page = 1, int pageSize = 20) =>
{
    var auth = RequireAdmin(principal);
    if (auth is not null) return auth;

    page = Math.Max(1, page);
    pageSize = Math.Clamp(pageSize, 1, 100);
    var query = db.Users.AsNoTracking().AsQueryable();
    if (!string.IsNullOrWhiteSpace(role) && new[] { "STUDENT", "INSTRUCTOR", "ADMIN" }.Contains(role)) query = query.Where(item => item.Role == role);
    if (!string.IsNullOrWhiteSpace(q))
    {
        var keyword = q.Trim();
        query = query.Where(item => item.Name.Contains(keyword) || item.Email.Contains(keyword));
    }

    var total = await query.CountAsync();
    var users = await query.OrderByDescending(item => item.CreatedAt).Skip((page - 1) * pageSize).Take(pageSize).ToListAsync();
    var userIds = users.Select(item => item.Id).ToList();
    var ownedCourses = await db.Courses.Where(item => userIds.Contains(item.InstructorId)).GroupBy(item => item.InstructorId).Select(group => new { UserId = group.Key, Count = group.Count() }).ToDictionaryAsync(item => item.UserId, item => item.Count);
    var enrollments = await db.Enrollments.Where(item => userIds.Contains(item.UserId)).GroupBy(item => item.UserId).Select(group => new { UserId = group.Key, Count = group.Count() }).ToDictionaryAsync(item => item.UserId, item => item.Count);
    var purchases = await db.Purchases.Where(item => userIds.Contains(item.UserId)).GroupBy(item => item.UserId).Select(group => new { UserId = group.Key, Count = group.Count() }).ToDictionaryAsync(item => item.UserId, item => item.Count);

    return Results.Ok(Paginated(users.Select(user => new
    {
        user.Id,
        user.Email,
        user.Name,
        user.Role,
        user.Avatar,
        user.Phone,
        user.WalletBalance,
        user.TotalSpent,
        user.MemberTier,
        user.CreatedAt,
        user.UpdatedAt,
        _count = new
        {
            courses = ownedCourses.GetValueOrDefault(user.Id),
            enrollments = enrollments.GetValueOrDefault(user.Id),
            purchases = purchases.GetValueOrDefault(user.Id)
        }
    }), total, page, pageSize));
}).RequireAuthorization();

app.MapPatch("/api/admin/users/{id}/role", async (string id, RoleUpdateRequest request, ClaimsPrincipal principal, HttpContext http, LmsDbContext db) =>
{
    var auth = RequireAdmin(principal);
    if (auth is not null) return auth;

    if (request.Role is not ("STUDENT" or "INSTRUCTOR" or "ADMIN")) return Results.BadRequest(new { message = "Vai trò không hợp lệ" });
    if (id == CurrentUserId(principal) && request.Role != "ADMIN") return Results.BadRequest(new { message = "Không thể tự hạ quyền admin của chính mình" });

    var user = await db.Users.FirstOrDefaultAsync(item => item.Id == id);
    if (user is null) return Results.NotFound(new { message = "Không tìm thấy người dùng" });
    if (user.Role == "ADMIN" && request.Role != "ADMIN" && await db.Users.CountAsync(item => item.Role == "ADMIN") <= 1)
    {
        return Results.BadRequest(new { message = "Hệ thống phải còn ít nhất một admin" });
    }

    var previousRole = user.Role;
    user.Role = request.Role;
    user.UpdatedAt = DateTime.UtcNow;
    await db.SaveChangesAsync();
    await WriteAuditLog(db, principal, http, "USER_ROLE_UPDATED", "User", user.Id, new { previousRole, nextRole = request.Role, user.Email });

    return Results.Ok(UserAdminDto.FromUser(user, 0, 0, 0));
}).RequireAuthorization();

app.MapDelete("/api/admin/users/{id}", async (string id, ClaimsPrincipal principal, HttpContext http, LmsDbContext db) =>
{
    var auth = RequireAdmin(principal);
    if (auth is not null) return auth;
    if (id == CurrentUserId(principal)) return Results.BadRequest(new { message = "Không thể xóa tài khoản admin đang đăng nhập" });

    var user = await db.Users.FirstOrDefaultAsync(item => item.Id == id);
    if (user is null) return Results.NotFound(new { message = "Không tìm thấy người dùng" });
    if (user.Role == "ADMIN" && await db.Users.CountAsync(item => item.Role == "ADMIN") <= 1)
    {
        return Results.BadRequest(new { message = "Hệ thống phải còn ít nhất một admin" });
    }

    db.Users.Remove(user);
    await db.SaveChangesAsync();
    await WriteAuditLog(db, principal, http, "USER_DELETED", "User", id, new { user.Email, user.Role });

    return Results.Ok(new { message = "Đã xóa người dùng" });
}).RequireAuthorization();

app.MapGet("/api/admin/courses", async (ClaimsPrincipal principal, LmsDbContext db, string? q = null, string? status = null, int page = 1, int pageSize = 20) =>
{
    var auth = RequireAdmin(principal);
    if (auth is not null) return auth;

    page = Math.Max(1, page);
    pageSize = Math.Clamp(pageSize, 1, 100);
    var query = db.Courses.AsNoTracking().Include(item => item.Instructor).Include(item => item.Lessons).Include(item => item.Enrollments).Include(item => item.Reviews).AsQueryable();
    if (status == "published") query = query.Where(item => item.IsPublished);
    if (status == "draft") query = query.Where(item => !item.IsPublished);
    if (!string.IsNullOrWhiteSpace(q))
    {
        var keyword = q.Trim();
        query = query.Where(item => item.Title.Contains(keyword) || (item.Instructor != null && (item.Instructor.Name.Contains(keyword) || item.Instructor.Email.Contains(keyword))));
    }

    var total = await query.CountAsync();
    var courses = await query.OrderByDescending(item => item.UpdatedAt).Skip((page - 1) * pageSize).Take(pageSize).ToListAsync();
    return Results.Ok(Paginated(courses.Select(AdminCourseDto.FromCourse), total, page, pageSize));
}).RequireAuthorization();

app.MapPatch("/api/admin/courses/{id}/publication", async (string id, PublicationRequest request, ClaimsPrincipal principal, HttpContext http, LmsDbContext db) =>
{
    var auth = RequireAdmin(principal);
    if (auth is not null) return auth;

    var course = await db.Courses.Include(item => item.Instructor).Include(item => item.Lessons).Include(item => item.Enrollments).Include(item => item.Reviews).FirstOrDefaultAsync(item => item.Id == id);
    if (course is null) return Results.NotFound(new { message = "Không tìm thấy khóa học" });

    var previousPublished = course.IsPublished;
    course.IsPublished = request.IsPublished;
    course.PublishedAt = request.IsPublished ? DateTime.UtcNow : null;
    course.UpdatedAt = DateTime.UtcNow;
    await db.SaveChangesAsync();
    await WriteAuditLog(db, principal, http, request.IsPublished ? "COURSE_PUBLISHED_BY_ADMIN" : "COURSE_UNPUBLISHED_BY_ADMIN", "Course", course.Id, new { course.Title, previousPublished, nextPublished = request.IsPublished });

    return Results.Ok(AdminCourseDto.FromCourse(course));
}).RequireAuthorization();

app.MapDelete("/api/admin/courses/{id}", async (string id, ClaimsPrincipal principal, HttpContext http, LmsDbContext db) =>
{
    var auth = RequireAdmin(principal);
    if (auth is not null) return auth;

    var course = await db.Courses.FirstOrDefaultAsync(item => item.Id == id);
    if (course is null) return Results.NotFound(new { message = "Không tìm thấy khóa học" });

    await DeleteCourseGraph(db, id);
    await WriteAuditLog(db, principal, http, "COURSE_DELETED_BY_ADMIN", "Course", id, new { course.Title, course.InstructorId, course.IsPublished });

    return Results.Ok(new { message = "Đã xóa khóa học" });
}).RequireAuthorization();

app.MapGet("/api/admin/transactions", async (ClaimsPrincipal principal, LmsDbContext db, string? type = null, int page = 1, int pageSize = 20) =>
{
    var auth = RequireAdmin(principal);
    if (auth is not null) return auth;

    page = Math.Max(1, page);
    pageSize = Math.Clamp(pageSize, 1, 100);
    var query = db.WalletTransactions.AsNoTracking().Include(item => item.User).Include(item => item.Course).Include(item => item.Purchase).Include(item => item.ExternalPayment).AsQueryable();
    if (!string.IsNullOrWhiteSpace(type)) query = query.Where(item => item.Type == type);

    var total = await query.CountAsync();
    var items = await query.OrderByDescending(item => item.CreatedAt).Skip((page - 1) * pageSize).Take(pageSize).ToListAsync();
    return Results.Ok(Paginated(items.Select(TransactionDto.FromTransaction), total, page, pageSize));
}).RequireAuthorization();

app.MapGet("/api/admin/audit-logs", async (ClaimsPrincipal principal, LmsDbContext db, string? action = null, string? entityType = null, int page = 1, int pageSize = 20) =>
{
    var auth = RequireAdmin(principal);
    if (auth is not null) return auth;

    page = Math.Max(1, page);
    pageSize = Math.Clamp(pageSize, 1, 100);
    var query = db.AuditLogs.AsNoTracking().AsQueryable();
    if (!string.IsNullOrWhiteSpace(action)) query = query.Where(item => item.Action == action);
    if (!string.IsNullOrWhiteSpace(entityType)) query = query.Where(item => item.EntityType == entityType);

    var total = await query.CountAsync();
    var items = await query.OrderByDescending(item => item.CreatedAt).Skip((page - 1) * pageSize).Take(pageSize).ToListAsync();
    return Results.Ok(Paginated(items.Select(AuditLogDto.FromAuditLog), total, page, pageSize));
}).RequireAuthorization();

app.MapGet("/api/instructor/dashboard", async (ClaimsPrincipal principal, LmsDbContext db) =>
{
    var auth = RequireInstructor(principal);
    if (auth is not null) return auth;

    var instructorId = CurrentUserId(principal)!;
    var courses = await db.Courses
        .AsNoTracking()
        .Where(course => course.InstructorId == instructorId)
        .Include(course => course.Enrollments)
        .Include(course => course.Sections)
        .Include(course => course.Lessons)
        .OrderByDescending(course => course.UpdatedAt)
        .ToListAsync();

    var enrollments = courses.SelectMany(course => course.Enrollments).ToList();

    return Results.Ok(new
    {
        totalCourses = courses.Count,
        totalStudents = enrollments.Select(enrollment => enrollment.UserId).Distinct().Count(),
        totalRevenue = await db.Purchases
            .Where(purchase => purchase.Course != null && purchase.Course.InstructorId == instructorId && purchase.Status == "COMPLETED")
            .SumAsync(purchase => purchase.FinalAmount),
        courses = courses.Select(course => new
        {
            course.Id,
            course.Title,
            course.Slug,
            course.Price,
            course.Thumbnail,
            course.MinimumMemberTier,
            course.TotalDurationSeconds,
            course.IsPublished,
            enrollments = course.Enrollments.Count,
            lessons = course.Lessons.Count,
            sections = course.Sections.Count
        })
    });
}).RequireAuthorization();

app.MapGet("/api/instructor/revenue", async (ClaimsPrincipal principal, LmsDbContext db) =>
{
    var auth = RequireInstructor(principal);
    if (auth is not null) return auth;

    var instructorId = CurrentUserId(principal)!;
    var courses = await db.Courses
        .AsNoTracking()
        .Where(item => item.InstructorId == instructorId)
        .Include(item => item.Enrollments)
        .OrderByDescending(item => item.UpdatedAt)
        .ToListAsync();
    var courseIds = courses.Select(item => item.Id).ToList();
    var purchases = await db.Purchases
        .AsNoTracking()
        .Where(item => courseIds.Contains(item.CourseId) && item.Status == "COMPLETED")
        .Include(item => item.Course)
        .Include(item => item.User)
        .OrderByDescending(item => item.CreatedAt)
        .ToListAsync();

    var totalRevenue = purchases.Sum(item => item.FinalAmount);
    var purchasesByCourse = purchases.GroupBy(item => item.CourseId).ToDictionary(group => group.Key, group => new
    {
        Revenue = group.Sum(item => item.FinalAmount),
        Count = group.Count()
    });
    var monthlyRevenue = purchases
        .GroupBy(item => item.CreatedAt.ToString("yyyy-MM"))
        .OrderBy(group => group.Key)
        .Select(group => new { month = group.Key, revenue = group.Sum(item => item.FinalAmount) });

    return Results.Ok(new
    {
        totalRevenue,
        totalPurchases = purchases.Count,
        totalStudents = purchases.Select(item => item.UserId).Distinct().Count(),
        averageOrderValue = purchases.Count == 0 ? 0 : (int)Math.Round(purchases.Average(item => item.FinalAmount)),
        monthlyRevenue,
        courses = courses.Select(course =>
        {
            purchasesByCourse.TryGetValue(course.Id, out var stats);
            return new
            {
                course.Id,
                course.Title,
                course.Price,
                course.IsPublished,
                enrollments = course.Enrollments.Count,
                revenue = stats?.Revenue ?? 0,
                purchases = stats?.Count ?? 0
            };
        }),
        recentPurchases = purchases.Take(8).Select(item => new
        {
            item.Id,
            amount = item.FinalAmount,
            item.CreatedAt,
            course = item.Course == null ? null : new { item.Course.Id, item.Course.Title },
            user = item.User == null ? null : new { item.User.Id, item.User.Name, item.User.Email }
        })
    });
}).RequireAuthorization();

app.MapGet("/api/instructor/students", async (ClaimsPrincipal principal, LmsDbContext db) =>
{
    var auth = RequireInstructor(principal);
    if (auth is not null) return auth;

    var instructorId = CurrentUserId(principal)!;
    var enrollments = await db.Enrollments
        .AsNoTracking()
        .Where(item => item.Course != null && item.Course.InstructorId == instructorId)
        .Include(item => item.User)
        .Include(item => item.Course)
        .OrderByDescending(item => item.UpdatedAt)
        .ToListAsync();

    var students = enrollments
        .Where(item => item.User != null)
        .GroupBy(item => item.UserId)
        .Select(group =>
        {
            var first = group.First();
            return new
            {
                id = first.User!.Id,
                name = first.User.Name,
                email = first.User.Email,
                avatar = first.User.Avatar,
                courses = group.Where(item => item.Course != null).Select(item => new
                {
                    id = item.Course!.Id,
                    title = item.Course.Title,
                    slug = item.Course.Slug,
                    thumbnail = item.Course.Thumbnail,
                    progress = item.Progress,
                    item.CompletedAt,
                    enrolledAt = item.CreatedAt
                }),
                averageProgress = (int)Math.Round(group.Average(item => item.Progress)),
                lastActiveAt = group.Max(item => item.UpdatedAt)
            };
        })
        .ToList();

    return Results.Ok(new
    {
        totalStudents = students.Count,
        totalEnrollments = enrollments.Count,
        students
    });
}).RequireAuthorization();

app.MapPost("/api/instructor/courses", async (ClaimsPrincipal principal, CourseUpsertRequest request, LmsDbContext db) =>
{
    var auth = RequireInstructor(principal);
    if (auth is not null) return auth;

    var title = string.IsNullOrWhiteSpace(request.Title) ? "Khóa học mới" : request.Title.Trim();
    var course = new Course
    {
        Id = Cuid.New(),
        Title = title,
        Slug = await EnsureUniqueSlug(db, title),
        Description = request.Description ?? "",
        Thumbnail = request.Thumbnail ?? "",
        Price = Math.Max(0, request.Price ?? 0),
        MinimumMemberTier = string.IsNullOrWhiteSpace(request.MinimumMemberTier) ? "BRONZE" : request.MinimumMemberTier,
        InstructorId = CurrentUserId(principal)!,
        CreatedAt = DateTime.UtcNow,
        UpdatedAt = DateTime.UtcNow
    };

    db.Courses.Add(course);
    await db.SaveChangesAsync();

    return Results.Created($"/api/instructor/courses/{course.Id}", FormatCurriculum(course));
}).RequireAuthorization();

app.MapGet("/api/instructor/courses/{id}", async (string id, ClaimsPrincipal principal, LmsDbContext db) =>
{
    var auth = RequireInstructor(principal);
    if (auth is not null) return auth;

    var course = await LoadOwnedCourse(db, id, CurrentUserId(principal)!);
    return course is null ? Results.NotFound(new { message = "Không tìm thấy khóa học" }) : Results.Ok(FormatCurriculum(course));
}).RequireAuthorization();

app.MapPut("/api/instructor/courses/{id}", async (string id, ClaimsPrincipal principal, CourseUpsertRequest request, LmsDbContext db) =>
{
    var auth = RequireInstructor(principal);
    if (auth is not null) return auth;

    var course = await LoadOwnedCourse(db, id, CurrentUserId(principal)!);
    if (course is null) return Results.Forbid();

    var nextTitle = string.IsNullOrWhiteSpace(request.Title) ? course.Title : request.Title.Trim();
    if (!string.Equals(nextTitle, course.Title, StringComparison.Ordinal))
    {
        course.Slug = await EnsureUniqueSlug(db, nextTitle, course.Id);
    }

    course.Title = nextTitle;
    course.Description = request.Description ?? course.Description;
    course.Thumbnail = request.Thumbnail ?? course.Thumbnail;
    course.Price = request.Price is null ? course.Price : Math.Max(0, request.Price.Value);
    course.MinimumMemberTier = string.IsNullOrWhiteSpace(request.MinimumMemberTier) ? course.MinimumMemberTier : request.MinimumMemberTier;
    course.UpdatedAt = DateTime.UtcNow;

    await db.SaveChangesAsync();

    return Results.Ok(FormatCurriculum(course));
}).RequireAuthorization();

app.MapPost("/api/instructor/courses/{id}/publish", async (string id, ClaimsPrincipal principal, LmsDbContext db) =>
{
    var auth = RequireInstructor(principal);
    if (auth is not null) return auth;

    var course = await LoadOwnedCourse(db, id, CurrentUserId(principal)!);
    if (course is null) return Results.NotFound(new { message = "Không tìm thấy khóa học" });

    var errors = PublishErrors(course);
    if (errors.Count > 0)
    {
        return Results.BadRequest(new { message = "Khóa học chưa đủ điều kiện xuất bản", errors });
    }

    course.IsPublished = true;
    course.PublishedAt = DateTime.UtcNow;
    course.UpdatedAt = DateTime.UtcNow;
    await db.SaveChangesAsync();

    return Results.Ok(FormatCurriculum(course));
}).RequireAuthorization();

app.MapPost("/api/instructor/courses/{id}/unpublish", async (string id, ClaimsPrincipal principal, LmsDbContext db) =>
{
    var auth = RequireInstructor(principal);
    if (auth is not null) return auth;

    var course = await LoadOwnedCourse(db, id, CurrentUserId(principal)!);
    if (course is null) return Results.NotFound(new { message = "Không tìm thấy khóa học" });

    course.IsPublished = false;
    course.PublishedAt = null;
    course.UpdatedAt = DateTime.UtcNow;
    await db.SaveChangesAsync();

    return Results.Ok(FormatCurriculum(course));
}).RequireAuthorization();

app.MapPost("/api/instructor/courses/{courseId}/sections", async (string courseId, ClaimsPrincipal principal, SectionRequest request, LmsDbContext db) =>
{
    var auth = RequireInstructor(principal);
    if (auth is not null) return auth;

    var course = await LoadOwnedCourse(db, courseId, CurrentUserId(principal)!);
    if (course is null) return Results.Forbid();

    var position = course.Sections.Count == 0 ? 1 : course.Sections.Max(section => section.Position) + 1;
    var section = new Section
    {
        Id = Cuid.New(),
        CourseId = courseId,
        Title = string.IsNullOrWhiteSpace(request.Title) ? "Chương mới" : request.Title.Trim(),
        Description = request.Description ?? "",
        Position = position,
        CreatedAt = DateTime.UtcNow,
        UpdatedAt = DateTime.UtcNow
    };

    db.Sections.Add(section);
    await db.SaveChangesAsync();

    return Results.Created($"/api/instructor/courses/{courseId}/sections/{section.Id}", SectionDto.FromSection(section));
}).RequireAuthorization();

app.MapPut("/api/instructor/courses/{courseId}/sections/{sectionId}", async (string courseId, string sectionId, ClaimsPrincipal principal, SectionRequest request, LmsDbContext db) =>
{
    var auth = RequireInstructor(principal);
    if (auth is not null) return auth;

    var section = await LoadOwnedSection(db, courseId, sectionId, CurrentUserId(principal)!);
    if (section is null) return Results.NotFound(new { message = "Không tìm thấy chương" });

    section.Title = request.Title ?? section.Title;
    section.Description = request.Description ?? section.Description;
    section.UpdatedAt = DateTime.UtcNow;
    await db.SaveChangesAsync();

    return Results.Ok(SectionDto.FromSection(section));
}).RequireAuthorization();

app.MapDelete("/api/instructor/courses/{courseId}/sections/{sectionId}", async (string courseId, string sectionId, ClaimsPrincipal principal, LmsDbContext db) =>
{
    var auth = RequireInstructor(principal);
    if (auth is not null) return auth;

    var section = await LoadOwnedSection(db, courseId, sectionId, CurrentUserId(principal)!);
    if (section is null) return Results.NotFound(new { message = "Không tìm thấy chương" });

    db.Lessons.RemoveRange(section.Lessons);
    db.Sections.Remove(section);
    await db.SaveChangesAsync();
    await NormalizeSectionPositions(db, courseId);

    return Results.Ok(new { message = "Đã xóa chương" });
}).RequireAuthorization();

app.MapPost("/api/instructor/courses/{courseId}/sections/{sectionId}/lessons", async (string courseId, string sectionId, ClaimsPrincipal principal, LessonRequest request, LmsDbContext db) =>
{
    var auth = RequireInstructor(principal);
    if (auth is not null) return auth;

    var section = await LoadOwnedSection(db, courseId, sectionId, CurrentUserId(principal)!);
    if (section is null) return Results.Forbid();

    var position = section.Lessons.Count == 0 ? 1 : section.Lessons.Max(lesson => lesson.Position) + 1;
    var lesson = new Lesson
    {
        Id = Cuid.New(),
        CourseId = courseId,
        SectionId = sectionId,
        Title = string.IsNullOrWhiteSpace(request.Title) ? "Bài giảng mới" : request.Title.Trim(),
        Content = request.Content ?? "",
        VideoUrl = request.VideoUrl ?? "",
        DurationSeconds = request.DurationSeconds,
        Position = position,
        IsPublished = request.IsPublished ?? true,
        IsPreview = request.IsPreview ?? false,
        CreatedAt = DateTime.UtcNow,
        UpdatedAt = DateTime.UtcNow
    };

    db.Lessons.Add(lesson);
    await db.SaveChangesAsync();
    await RecalculateCourseDuration(db, courseId);

    return Results.Created($"/api/instructor/courses/{courseId}/lessons/{lesson.Id}", LessonDto.FromLesson(lesson));
}).RequireAuthorization();

app.MapPut("/api/instructor/courses/{courseId}/lessons/{lessonId}", async (string courseId, string lessonId, ClaimsPrincipal principal, LessonRequest request, LmsDbContext db) =>
{
    var auth = RequireInstructor(principal);
    if (auth is not null) return auth;

    var lesson = await LoadOwnedLesson(db, courseId, lessonId, CurrentUserId(principal)!);
    if (lesson is null) return Results.NotFound(new { message = "Không tìm thấy bài giảng" });

    if (!string.IsNullOrWhiteSpace(request.SectionId) && request.SectionId != lesson.SectionId)
    {
        var targetSection = await LoadOwnedSection(db, courseId, request.SectionId, CurrentUserId(principal)!);
        if (targetSection is null) return Results.BadRequest(new { message = "Chương đích không hợp lệ" });
        lesson.SectionId = request.SectionId;
    }

    lesson.Title = request.Title ?? lesson.Title;
    lesson.Content = request.Content ?? lesson.Content;
    lesson.VideoUrl = request.VideoUrl ?? lesson.VideoUrl;
    lesson.DurationSeconds = request.DurationSeconds ?? lesson.DurationSeconds;
    lesson.IsPublished = request.IsPublished ?? lesson.IsPublished;
    lesson.IsPreview = request.IsPreview ?? lesson.IsPreview;
    lesson.UpdatedAt = DateTime.UtcNow;

    await db.SaveChangesAsync();
    await RecalculateCourseDuration(db, courseId);

    return Results.Ok(LessonDto.FromLesson(lesson));
}).RequireAuthorization();

app.MapDelete("/api/instructor/courses/{courseId}/lessons/{lessonId}", async (string courseId, string lessonId, ClaimsPrincipal principal, LmsDbContext db) =>
{
    var auth = RequireInstructor(principal);
    if (auth is not null) return auth;

    var lesson = await LoadOwnedLesson(db, courseId, lessonId, CurrentUserId(principal)!);
    if (lesson is null) return Results.Forbid();

    var sectionId = lesson.SectionId;
    db.Lessons.Remove(lesson);
    await db.SaveChangesAsync();
    await NormalizeLessonPositions(db, sectionId);
    await RecalculateCourseDuration(db, courseId);

    return Results.Ok(new { message = "Đã xóa bài giảng" });
}).RequireAuthorization();

app.MapPut("/api/instructor/courses/{courseId}/curriculum/reorder", async (string courseId, ReorderRequest request, ClaimsPrincipal principal, LmsDbContext db) =>
{
    var auth = RequireInstructor(principal);
    if (auth is not null) return auth;

    var course = await LoadOwnedCourse(db, courseId, CurrentUserId(principal)!);
    if (course is null) return Results.Json(new { message = "Không có quyền truy cập" }, statusCode: StatusCodes.Status403Forbidden);
    if (request.Sections is null || request.Sections.Count == 0) return Results.BadRequest(new { message = "Dữ liệu sắp xếp không hợp lệ" });

    var existingSectionIds = course.Sections.Select(item => item.Id).ToHashSet();
    var existingLessonIds = course.Sections.SelectMany(item => item.Lessons).Select(item => item.Id).ToHashSet();

    foreach (var sectionRequest in request.Sections)
    {
        if (!existingSectionIds.Contains(sectionRequest.Id)) return Results.BadRequest(new { message = "Có chương không thuộc khóa học này" });
        foreach (var lessonRequest in sectionRequest.Lessons ?? [])
        {
            if (!existingLessonIds.Contains(lessonRequest.Id)) return Results.BadRequest(new { message = "Có bài học không thuộc khóa học này" });
        }
    }

    await using var transaction = await db.Database.BeginTransactionAsync();
    for (var sectionIndex = 0; sectionIndex < request.Sections.Count; sectionIndex++)
    {
        var sectionId = request.Sections[sectionIndex].Id;
        var section = await db.Sections.FirstAsync(item => item.Id == sectionId);
        section.Position = sectionIndex + 1;
        section.UpdatedAt = DateTime.UtcNow;

        var lessons = request.Sections[sectionIndex].Lessons ?? [];
        for (var lessonIndex = 0; lessonIndex < lessons.Count; lessonIndex++)
        {
            var lesson = await db.Lessons.FirstAsync(item => item.Id == lessons[lessonIndex].Id);
            lesson.SectionId = sectionId;
            lesson.CourseId = courseId;
            lesson.Position = lessonIndex + 1;
            lesson.UpdatedAt = DateTime.UtcNow;
        }
    }

    await db.SaveChangesAsync();
    await transaction.CommitAsync();

    var refreshed = await LoadOwnedCourse(db, courseId, CurrentUserId(principal)!);
    return Results.Ok(FormatCurriculum(refreshed!));
}).RequireAuthorization();

app.MapPost("/api/instructor/courses/{courseId}/lessons/{lessonId}/video", async (string courseId, string lessonId, ClaimsPrincipal principal, LmsDbContext db) =>
{
    var auth = RequireInstructor(principal);
    if (auth is not null) return auth;

    var lesson = await LoadOwnedLesson(db, courseId, lessonId, CurrentUserId(principal)!);
    if (lesson is null) return Results.Json(new { message = "Không có quyền truy cập bài giảng này" }, statusCode: StatusCodes.Status403Forbidden);

    lesson.VideoUrl = lesson.VideoUrl ?? "";
    lesson.UpdatedAt = DateTime.UtcNow;
    await db.SaveChangesAsync();

    return Results.Ok(new
    {
        message = "Endpoint upload video C# đang chạy ở chế độ mock. Hãy dán URL video vào bài học để dùng ngay.",
        videoUrl = lesson.VideoUrl,
        durationSeconds = lesson.DurationSeconds
    });
}).RequireAuthorization();

app.Run();

static async Task<IResult> PurchaseCourseWithWallet(LmsDbContext db, string userId, string courseId, string frontendUrl, string? couponCode = null)
{
    var course = await db.Courses.FirstOrDefaultAsync(item => item.Id == courseId);
    if (course is null) return Results.NotFound(new { message = "Không tìm thấy khóa học" });
    if (!course.IsPublished) return Results.BadRequest(new { message = "Khóa học này đang ở chế độ bản nháp" });
    if (course.Price <= 0) return Results.BadRequest(new { message = "Khóa học này miễn phí, hãy đăng ký trực tiếp." });

    var user = await db.Users.FirstOrDefaultAsync(item => item.Id == userId);
    if (user is null) return Results.NotFound(new { message = "Không tìm thấy người dùng" });
    if (!HasRequiredTier(user.MemberTier, course.MinimumMemberTier))
    {
        return Results.Json(new
        {
            message = "Danh hiệu hội viên hiện tại chưa đủ để mua khóa học này",
            requiredTier = course.MinimumMemberTier
        }, statusCode: StatusCodes.Status403Forbidden);
    }

    var alreadyPurchased = await db.Purchases.AnyAsync(item => item.UserId == userId && item.CourseId == courseId);
    if (alreadyPurchased) return Results.BadRequest(new { message = "Bạn đã mua khóa học này" });

    var discountAmount = 0;
    Coupon? coupon = null;
    if (!string.IsNullOrWhiteSpace(couponCode))
    {
        var couponResult = await ValidateCouponForCourse(db, couponCode, courseId, course.Price);
        if (!couponResult.Valid)
        {
            return Results.BadRequest(new { message = couponResult.Error });
        }

        coupon = couponResult.Coupon;
        discountAmount = couponResult.DiscountAmount;
    }

    var finalPrice = Math.Max(0, course.Price - discountAmount);
    if (user.WalletBalance < finalPrice)
    {
        return Results.BadRequest(new
        {
            message = "Số dư ví không đủ để mua khóa học",
            requiredAmount = finalPrice,
            walletBalance = user.WalletBalance,
            shortfall = finalPrice - user.WalletBalance
        });
    }

    await using var transaction = await db.Database.BeginTransactionAsync();
    var now = DateTime.UtcNow;

    user.WalletBalance -= finalPrice;
    user.TotalSpent += finalPrice;
    user.MemberTier = ResolveMemberTier(user.TotalSpent).Tier;
    user.UpdatedAt = now;

    var purchase = new Purchase
    {
        Id = Cuid.New(),
        UserId = userId,
        CourseId = courseId,
        OriginalAmount = course.Price,
        DiscountAmount = discountAmount,
        FinalAmount = finalPrice,
        CouponId = coupon?.Id,
        Status = "COMPLETED",
        CreatedAt = now,
        UpdatedAt = now
    };

    db.Purchases.Add(purchase);
    db.Enrollments.Add(new Enrollment
    {
        Id = Cuid.New(),
        UserId = userId,
        CourseId = courseId,
        Progress = 0,
        CreatedAt = now,
        UpdatedAt = now
    });
    db.WalletTransactions.Add(new WalletTransaction
    {
        Id = Cuid.New(),
        UserId = userId,
        CourseId = courseId,
        PurchaseId = purchase.Id,
        Type = "COURSE_PURCHASE",
        Amount = -finalPrice,
        BalanceAfter = user.WalletBalance,
        Note = $"Mua khóa học: {course.Title}",
        CreatedAt = now
    });
    db.Notifications.Add(new Notification
    {
        Id = Cuid.New(),
        UserId = userId,
        Type = "COURSE_PURCHASED",
        Title = "Mua khóa học thành công",
        Body = $"Bạn đã mua khóa học {course.Title}.",
        Link = $"/course/{courseId}",
        Metadata = JsonSerializer.Serialize(new { courseId, purchaseId = purchase.Id }),
        CreatedAt = now
    });

    if (coupon is not null)
    {
        coupon.UsageCount += 1;
        coupon.UpdatedAt = now;
    }

    await db.SaveChangesAsync();
    await transaction.CommitAsync();

    var tier = ResolveMemberTier(user.TotalSpent);
    return Results.Ok(new
    {
        message = "Mua khóa học thành công",
        walletBalance = user.WalletBalance,
        totalSpent = user.TotalSpent,
        memberTier = user.MemberTier,
        memberTierLabel = tier.Label,
        discountAmount,
        finalPrice,
        successUrl = $"{frontendUrl}/course/{courseId}?success=true"
    });
}

static async Task SyncCourseReviewStats(LmsDbContext db, string courseId)
{
    var reviews = await db.CourseReviews.Where(item => item.CourseId == courseId).ToListAsync();
    var course = await db.Courses.FirstOrDefaultAsync(item => item.Id == courseId);
    if (course is null) return;

    course.AverageRating = reviews.Count == 0 ? 0 : reviews.Average(item => item.Rating);
    course.ReviewCount = reviews.Count;
    course.UpdatedAt = DateTime.UtcNow;
    await db.SaveChangesAsync();
}

static async Task<bool> HasLessonAccess(LmsDbContext db, string? userId, string courseId)
{
    if (userId is null) return false;

    return await db.Enrollments.AnyAsync(item => item.UserId == userId && item.CourseId == courseId)
        || await db.Courses.AnyAsync(item => item.Id == courseId && item.InstructorId == userId);
}

static async Task<IResult> UpsertLessonProgress(
    LmsDbContext db,
    string userId,
    string courseId,
    string lessonId,
    int? watchedSeconds = null,
    int? lastPositionSeconds = null,
    int? durationSeconds = null,
    bool? markCompleted = null)
{
    var enrollment = await db.Enrollments.FirstOrDefaultAsync(item => item.UserId == userId && item.CourseId == courseId);
    if (enrollment is null) return Results.Json(new { message = "Bạn chưa đăng ký khóa học này" }, statusCode: StatusCodes.Status403Forbidden);

    var lesson = await db.Lessons.AsNoTracking().FirstOrDefaultAsync(item => item.Id == lessonId && item.CourseId == courseId);
    if (lesson is null) return Results.NotFound(new { message = "Không tìm thấy bài học" });

    var now = DateTime.UtcNow;
    var totalDuration = Math.Max(1, durationSeconds ?? lesson.DurationSeconds ?? 0);
    var watched = Math.Max(0, watchedSeconds ?? lesson.DurationSeconds ?? totalDuration);
    var lastPosition = Math.Max(0, lastPositionSeconds ?? watched);
    var completionRate = Math.Clamp((watched / (double)totalDuration) * 100, 0, 100);
    var shouldComplete = markCompleted == true || completionRate >= 90;

    var progress = await db.LessonProgresses.FirstOrDefaultAsync(item => item.UserId == userId && item.LessonId == lessonId);
    if (progress is null)
    {
        progress = new LessonProgress
        {
            Id = Cuid.New(),
            UserId = userId,
            LessonId = lessonId,
            CreatedAt = now
        };
        db.LessonProgresses.Add(progress);
    }

    progress.WatchedSeconds = Math.Max(progress.WatchedSeconds, watched);
    progress.LastPositionSeconds = lastPosition;
    progress.CompletionRate = Math.Max(progress.CompletionRate, completionRate);
    if (shouldComplete && !progress.IsCompleted)
    {
        progress.IsCompleted = true;
        progress.CompletedAt = now;
    }
    progress.UpdatedAt = now;

    await db.SaveChangesAsync();

    var totalLessons = await db.Lessons.CountAsync(item => item.CourseId == courseId && item.IsPublished);
    var completedCount = await db.LessonProgresses.CountAsync(item => item.UserId == userId && item.IsCompleted && item.Lesson != null && item.Lesson.CourseId == courseId);
    var courseProgress = totalLessons == 0 ? 0 : Math.Round((completedCount / (double)totalLessons) * 100);

    enrollment.Progress = courseProgress;
    enrollment.CompletedAt = totalLessons > 0 && completedCount >= totalLessons ? now : enrollment.CompletedAt;
    enrollment.UpdatedAt = now;
    await db.SaveChangesAsync();

    return Results.Ok(new
    {
        message = shouldComplete ? "Đã lưu tiến độ" : "Đã cập nhật tiến độ bài học",
        progress = courseProgress,
        completedCount,
        totalLessons,
        lessonProgress = new
        {
            progress.Id,
            progress.IsCompleted,
            progress.WatchedSeconds,
            progress.LastPositionSeconds,
            progress.CompletionRate,
            progress.CompletedAt
        },
        certificate = (object?)null
    });
}

static string CreateToken(User user, SecurityKey key)
{
    var credentials = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);
    var token = new JwtSecurityToken(
        claims:
        [
            new Claim(ClaimTypes.NameIdentifier, user.Id),
            new Claim(ClaimTypes.Email, user.Email),
            new Claim(ClaimTypes.Role, user.Role)
        ],
        expires: DateTime.UtcNow.AddDays(7),
        signingCredentials: credentials
    );

    return new JwtSecurityTokenHandler().WriteToken(token);
}

static string? CurrentUserId(ClaimsPrincipal principal) => principal.FindFirstValue(ClaimTypes.NameIdentifier);

static string FormatCurrencyVnd(int amount) =>
    string.Create(System.Globalization.CultureInfo.GetCultureInfo("vi-VN"), $"{amount:C0}");

static (string Tier, string Label, int MinSpent) ResolveMemberTier(int totalSpent) =>
    totalSpent >= 15000000 ? ("DIAMOND", "Kim cương", 15000000) :
    totalSpent >= 7000000 ? ("PLATINUM", "Bạch kim", 7000000) :
    totalSpent >= 3000000 ? ("GOLD", "Vàng", 3000000) :
    totalSpent >= 1000000 ? ("SILVER", "Bạc", 1000000) :
    ("BRONZE", "Đồng", 0);

static int TierWeight(string tier) => tier switch
{
    "DIAMOND" => 4,
    "PLATINUM" => 3,
    "GOLD" => 2,
    "SILVER" => 1,
    _ => 0
};

static bool HasRequiredTier(string currentTier, string requiredTier) => TierWeight(currentTier) >= TierWeight(requiredTier);

static IResult? RequireAdmin(ClaimsPrincipal principal) =>
    principal.FindFirstValue(ClaimTypes.Role) == "ADMIN" ? null : Results.Forbid();

static object Paginated<T>(IEnumerable<T> items, int total, int page, int pageSize) => new
{
    items,
    total,
    page,
    pageSize,
    pages = (int)Math.Ceiling(total / (double)pageSize)
};

static int ComputeDiscount(Coupon coupon, int coursePrice)
{
    if (coupon.DiscountType == "PERCENTAGE")
    {
        var discount = (int)Math.Floor(coursePrice * (coupon.DiscountValue / 100.0));
        if (coupon.MaxDiscountAmount is not null) discount = Math.Min(discount, coupon.MaxDiscountAmount.Value);
        return Math.Min(discount, coursePrice);
    }

    return Math.Min(coupon.DiscountValue, coursePrice);
}

static async Task<(bool Valid, Coupon? Coupon, int DiscountAmount, string? Error)> ValidateCouponForCourse(LmsDbContext db, string? code, string courseId, int coursePrice)
{
    if (string.IsNullOrWhiteSpace(code)) return (false, null, 0, "Mã giảm giá không hợp lệ");

    var normalizedCode = code.Trim().ToUpperInvariant();
    var coupon = await db.Coupons.FirstOrDefaultAsync(item => item.Code == normalizedCode);
    if (coupon is null) return (false, null, 0, "Mã giảm giá không tồn tại");
    if (!coupon.IsActive) return (false, coupon, 0, "Mã giảm giá đã bị vô hiệu hóa");

    var now = DateTime.UtcNow;
    if (coupon.StartDate is not null && now < coupon.StartDate.Value) return (false, coupon, 0, "Mã giảm giá chưa tới thời gian hiệu lực");
    if (coupon.EndDate is not null && now > coupon.EndDate.Value) return (false, coupon, 0, "Mã giảm giá đã hết hạn");
    if (coupon.UsageLimit is not null && coupon.UsageCount >= coupon.UsageLimit.Value) return (false, coupon, 0, "Mã giảm giá đã hết lượt sử dụng");
    if (!string.IsNullOrWhiteSpace(coupon.CourseId) && coupon.CourseId != courseId) return (false, coupon, 0, "Mã giảm giá không áp dụng cho khóa học này");
    if (coupon.MinPurchaseAmount > 0 && coursePrice < coupon.MinPurchaseAmount) return (false, coupon, 0, $"Giá khóa học phải từ {coupon.MinPurchaseAmount} VND trở lên để áp dụng mã này");

    return (true, coupon, ComputeDiscount(coupon, coursePrice), null);
}

static async Task WriteAuditLog(LmsDbContext db, ClaimsPrincipal principal, HttpContext http, string action, string entityType, string? entityId = null, object? metadata = null)
{
    var actorId = CurrentUserId(principal);
    var actorEmail = principal.FindFirstValue(ClaimTypes.Email);
    db.AuditLogs.Add(new AuditLog
    {
        Id = Cuid.New(),
        ActorId = actorId,
        ActorEmail = actorEmail,
        Action = action,
        EntityType = entityType,
        EntityId = entityId,
        Metadata = metadata is null ? null : JsonSerializer.Serialize(metadata),
        IpAddress = http.Connection.RemoteIpAddress?.ToString(),
        UserAgent = http.Request.Headers.UserAgent.ToString(),
        CreatedAt = DateTime.UtcNow
    });
    await db.SaveChangesAsync();
}

static List<string> ParseOptions(string options)
{
    try
    {
        return JsonSerializer.Deserialize<List<string>>(options) ?? [];
    }
    catch (JsonException)
    {
        return [];
    }
}

static IResult? RequireInstructor(ClaimsPrincipal principal)
{
    var role = principal.FindFirstValue(ClaimTypes.Role);
    return role is "INSTRUCTOR" or "ADMIN" ? null : Results.Forbid();
}

static async Task<Course?> LoadOwnedCourse(LmsDbContext db, string courseId, string instructorId) =>
    await db.Courses
        .Include(course => course.Sections.OrderBy(section => section.Position))
            .ThenInclude(section => section.Lessons.OrderBy(lesson => lesson.Position))
        .FirstOrDefaultAsync(course => course.Id == courseId && course.InstructorId == instructorId);

static async Task<Section?> LoadOwnedSection(LmsDbContext db, string courseId, string sectionId, string instructorId) =>
    await db.Sections
        .Include(section => section.Lessons.OrderBy(lesson => lesson.Position))
        .Include(section => section.Course)
        .FirstOrDefaultAsync(section => section.Id == sectionId && section.CourseId == courseId && section.Course!.InstructorId == instructorId);

static async Task<Lesson?> LoadOwnedLesson(LmsDbContext db, string courseId, string lessonId, string instructorId) =>
    await db.Lessons
        .Include(lesson => lesson.Course)
        .FirstOrDefaultAsync(lesson => lesson.Id == lessonId && lesson.CourseId == courseId && lesson.Course!.InstructorId == instructorId);

static async Task DeleteCourseGraph(LmsDbContext db, string courseId)
{
    var lessonIds = await db.Lessons
        .Where(lesson => lesson.CourseId == courseId)
        .Select(lesson => lesson.Id)
        .ToListAsync();

    var quizIds = lessonIds.Count == 0
        ? []
        : await db.Quizzes
            .Where(quiz => lessonIds.Contains(quiz.LessonId))
            .Select(quiz => quiz.Id)
            .ToListAsync();

    var purchaseIds = await db.Purchases
        .Where(purchase => purchase.CourseId == courseId)
        .Select(purchase => purchase.Id)
        .ToListAsync();

    if (quizIds.Count > 0)
    {
        await db.QuizSubmissions.Where(submission => quizIds.Contains(submission.QuizId)).ExecuteDeleteAsync();
        await db.QuizQuestions.Where(question => quizIds.Contains(question.QuizId)).ExecuteDeleteAsync();
        await db.Quizzes.Where(quiz => quizIds.Contains(quiz.Id)).ExecuteDeleteAsync();
    }

    if (lessonIds.Count > 0)
    {
        await db.Comments.Where(comment => lessonIds.Contains(comment.LessonId) && comment.ParentId != null).ExecuteDeleteAsync();
        await db.Comments.Where(comment => lessonIds.Contains(comment.LessonId)).ExecuteDeleteAsync();
        await db.LessonProgresses.Where(progress => lessonIds.Contains(progress.LessonId)).ExecuteDeleteAsync();
        await db.Lessons.Where(lesson => lessonIds.Contains(lesson.Id)).ExecuteDeleteAsync();
    }

    await db.Coupons.Where(coupon => coupon.CourseId == courseId).ExecuteDeleteAsync();
    await db.Certificates.Where(certificate => certificate.CourseId == courseId).ExecuteDeleteAsync();
    await db.CourseReviews.Where(review => review.CourseId == courseId).ExecuteDeleteAsync();
    await db.Enrollments.Where(enrollment => enrollment.CourseId == courseId).ExecuteDeleteAsync();

    if (purchaseIds.Count > 0)
    {
        await db.WalletTransactions
            .Where(transaction => purchaseIds.Contains(transaction.PurchaseId!))
            .ExecuteUpdateAsync(setters => setters.SetProperty(transaction => transaction.PurchaseId, (string?)null));
        await db.Purchases.Where(purchase => purchaseIds.Contains(purchase.Id)).ExecuteDeleteAsync();
    }

    await db.WalletTransactions
        .Where(transaction => transaction.CourseId == courseId)
        .ExecuteUpdateAsync(setters => setters.SetProperty(transaction => transaction.CourseId, (string?)null));
    await db.Sections.Where(section => section.CourseId == courseId).ExecuteDeleteAsync();
    await db.Courses.Where(course => course.Id == courseId).ExecuteDeleteAsync();
}

static object FormatCurriculum(Course course)
{
    var errors = PublishErrors(course);
    var totalLessons = course.Sections.Sum(section => section.Lessons.Count);

    return new
    {
        course.Id,
        course.Title,
        course.Slug,
        course.Description,
        course.Thumbnail,
        course.Price,
        course.AverageRating,
        course.ReviewCount,
        course.MinimumMemberTier,
        course.TotalDurationSeconds,
        course.IsPublished,
        course.PublishedAt,
        totalLessons,
        sections = course.Sections.OrderBy(section => section.Position).Select(SectionDto.FromSection),
        publishValidationErrors = errors,
        canPublish = errors.Count == 0
    };
}

static List<string> PublishErrors(Course course)
{
    var errors = new List<string>();
    if (string.IsNullOrWhiteSpace(course.Description)) errors.Add("Khóa học cần có mô tả trước khi xuất bản");
    if (string.IsNullOrWhiteSpace(course.Thumbnail)) errors.Add("Khóa học cần có ảnh bìa trước khi xuất bản");
    if (course.Sections.Sum(section => section.Lessons.Count(lesson => lesson.IsPublished)) < 1)
    {
        errors.Add("Khóa học phải có ít nhất 1 bài giảng đã xuất bản trước khi xuất bản khóa học");
    }
    return errors;
}

static async Task<string> EnsureUniqueSlug(LmsDbContext db, string title, string? excludeCourseId = null)
{
    var baseSlug = Slugify(title);
    var slug = baseSlug;
    var counter = 2;

    while (await db.Courses.AnyAsync(course => course.Slug == slug && course.Id != excludeCourseId))
    {
        slug = $"{baseSlug}-{counter}";
        counter += 1;
    }

    return slug;
}

static string Slugify(string value)
{
    var normalized = value.ToLowerInvariant().Normalize(NormalizationForm.FormD);
    var builder = new StringBuilder();
    foreach (var character in normalized)
    {
        var category = System.Globalization.CharUnicodeInfo.GetUnicodeCategory(character);
        if (category == System.Globalization.UnicodeCategory.NonSpacingMark) continue;
        if (char.IsLetterOrDigit(character)) builder.Append(character);
        else if (char.IsWhiteSpace(character) || character is '-' or '_') builder.Append('-');
    }

    var slug = System.Text.RegularExpressions.Regex.Replace(builder.ToString(), "-+", "-").Trim('-');
    return string.IsNullOrWhiteSpace(slug) ? "khoa-hoc-moi" : slug;
}

static async Task RecalculateCourseDuration(LmsDbContext db, string courseId)
{
    var total = await db.Lessons
        .Where(lesson => lesson.CourseId == courseId)
        .SumAsync(lesson => lesson.DurationSeconds ?? 0);
    var course = await db.Courses.FirstOrDefaultAsync(item => item.Id == courseId);
    if (course is null) return;
    course.TotalDurationSeconds = total;
    course.UpdatedAt = DateTime.UtcNow;
    await db.SaveChangesAsync();
}

static async Task NormalizeSectionPositions(LmsDbContext db, string courseId)
{
    var sections = await db.Sections.Where(section => section.CourseId == courseId).OrderBy(section => section.Position).ToListAsync();
    for (var index = 0; index < sections.Count; index++) sections[index].Position = index + 1;
    await db.SaveChangesAsync();
}

static async Task NormalizeLessonPositions(LmsDbContext db, string sectionId)
{
    var lessons = await db.Lessons.Where(lesson => lesson.SectionId == sectionId).OrderBy(lesson => lesson.Position).ToListAsync();
    for (var index = 0; index < lessons.Count; index++) lessons[index].Position = index + 1;
    await db.SaveChangesAsync();
}

record RegisterRequest(string Email, string Password, string? Name);
record LoginRequest(string Email, string Password);
record UserUpdateRequest(string? Name, string? Phone, string? Bio, JsonElement? Settings);
record PaymentRequest(string Type, string? CourseId, int? Amount, string? CouponCode);
record CouponValidateRequest(string? Code, string? CourseId);
record CouponCreateRequest(
    string? Code,
    string? DiscountType,
    int DiscountValue,
    int? MinPurchaseAmount,
    int? MaxDiscountAmount,
    DateTime? StartDate,
    DateTime? EndDate,
    int? UsageLimit,
    string? CourseId);
record RoleUpdateRequest(string Role);
record PublicationRequest(bool IsPublished);
record ReviewRequest(int Rating, string? Comment);
record CommentRequest(string Content, string? ParentId);
record ProgressRequest(int? WatchedSeconds, int? LastPositionSeconds, int? DurationSeconds, bool? MarkCompleted);
record QuizSubmitRequest(Dictionary<string, int>? Answers);
record QuizUpsertRequest(string? Title, string? Description, int? PassingScore, List<QuizQuestionRequest>? Questions);
record QuizQuestionRequest(string? QuestionText, List<string>? Options, int CorrectOptionIndex, string? Explanation);
record ReorderRequest(List<ReorderSectionRequest>? Sections);
record ReorderSectionRequest(string Id, List<ReorderLessonRequest>? Lessons);
record ReorderLessonRequest(string Id);
record CourseUpsertRequest(string? Title, string? Description, string? Thumbnail, int? Price, string? MinimumMemberTier);
record SectionRequest(string? Title, string? Description);
record LessonRequest(string? Title, string? Content, string? VideoUrl, int? DurationSeconds, bool? IsPublished, bool? IsPreview, string? SectionId);

record AuthResponse(string Token, UserDto User)
{
    public static AuthResponse FromUser(User user, string token) => new(token, UserDto.FromUser(user));
}

record UserDto(
    string Id,
    string Email,
    string Name,
    string Role,
    string? Avatar,
    string? Phone,
    string? Bio,
    JsonElement? Settings,
    int WalletBalance,
    int TotalSpent,
    string MemberTier,
    string MemberTierLabel,
    int MemberTierMinSpent)
{
    public static UserDto FromUser(User user)
    {
        JsonElement? settings = null;
        if (!string.IsNullOrWhiteSpace(user.Settings))
        {
            try
            {
                settings = JsonSerializer.Deserialize<JsonElement>(user.Settings);
            }
            catch (JsonException)
            {
                settings = null;
            }
        }

        var tier = ResolveTier(user.TotalSpent);
        return new(
            user.Id,
            user.Email,
            user.Name,
            user.Role,
            user.Avatar,
            user.Phone,
            user.Bio,
            settings,
            user.WalletBalance,
            user.TotalSpent,
            user.MemberTier,
            tier.Label,
            tier.MinSpent
        );
    }

    private static (string Label, int MinSpent) ResolveTier(int totalSpent) =>
        totalSpent >= 15000000 ? ("Kim cương", 15000000) :
        totalSpent >= 7000000 ? ("Bạch kim", 7000000) :
        totalSpent >= 3000000 ? ("Vàng", 3000000) :
        totalSpent >= 1000000 ? ("Bạc", 1000000) :
        ("Đồng", 0);
}

record UserAdminDto(
    string Id,
    string Email,
    string Name,
    string Role,
    string? Avatar,
    string? Phone,
    int WalletBalance,
    int TotalSpent,
    string MemberTier,
    DateTime CreatedAt,
    DateTime UpdatedAt,
    object _count)
{
    public static UserAdminDto FromUser(User user, int courses, int enrollments, int purchases) =>
        new(user.Id, user.Email, user.Name, user.Role, user.Avatar, user.Phone, user.WalletBalance, user.TotalSpent, user.MemberTier, user.CreatedAt, user.UpdatedAt, new { courses, enrollments, purchases });
}

record AdminCourseDto(string Id, string Title, string Slug, int Price, double AverageRating, int ReviewCount, bool IsPublished, object? Instructor, object _count)
{
    public static AdminCourseDto FromCourse(Course course) =>
        new(
            course.Id,
            course.Title,
            course.Slug,
            course.Price,
            course.AverageRating,
            course.ReviewCount,
            course.IsPublished,
            course.Instructor == null ? null : new { course.Instructor.Id, course.Instructor.Name, course.Instructor.Email },
            new { lessons = course.Lessons.Count, enrollments = course.Enrollments.Count, reviews = course.Reviews.Count }
        );
}

record CouponDto(
    string Id,
    string Code,
    string DiscountType,
    int DiscountValue,
    int MinPurchaseAmount,
    int? MaxDiscountAmount,
    DateTime? StartDate,
    DateTime? EndDate,
    bool IsActive,
    int? UsageLimit,
    int UsageCount,
    string? CourseId,
    object? Course,
    DateTime CreatedAt,
    DateTime UpdatedAt)
{
    public static CouponDto FromCoupon(Coupon coupon) =>
        new(
            coupon.Id,
            coupon.Code,
            coupon.DiscountType,
            coupon.DiscountValue,
            coupon.MinPurchaseAmount,
            coupon.MaxDiscountAmount,
            coupon.StartDate,
            coupon.EndDate,
            coupon.IsActive,
            coupon.UsageLimit,
            coupon.UsageCount,
            coupon.CourseId,
            coupon.Course == null ? null : new { coupon.Course.Id, coupon.Course.Title, coupon.Course.Slug },
            coupon.CreatedAt,
            coupon.UpdatedAt
        );
}

record TransactionDto(string Id, string Type, int Amount, int BalanceAfter, string? Note, DateTime CreatedAt, object? User, object? Course, object? Purchase, object? ExternalPayment)
{
    public static TransactionDto FromTransaction(WalletTransaction transaction) =>
        new(
            transaction.Id,
            transaction.Type,
            transaction.Amount,
            transaction.BalanceAfter,
            transaction.Note,
            transaction.CreatedAt,
            transaction.User == null ? null : new { transaction.User.Id, transaction.User.Name, transaction.User.Email },
            transaction.Course == null ? null : new { transaction.Course.Id, transaction.Course.Title },
            transaction.Purchase == null ? null : new { transaction.Purchase.Id, transaction.Purchase.FinalAmount, transaction.Purchase.Status },
            transaction.ExternalPayment == null ? null : new { transaction.ExternalPayment.Id, transaction.ExternalPayment.Provider, transaction.ExternalPayment.Status, transaction.ExternalPayment.Amount, transaction.ExternalPayment.CreatedAt }
        );
}

record AuditLogDto(string Id, string? ActorId, string? ActorEmail, string Action, string EntityType, string? EntityId, JsonElement? Metadata, string? IpAddress, string? UserAgent, DateTime CreatedAt)
{
    public static AuditLogDto FromAuditLog(AuditLog log)
    {
        JsonElement? metadata = null;
        if (!string.IsNullOrWhiteSpace(log.Metadata))
        {
            try
            {
                metadata = JsonSerializer.Deserialize<JsonElement>(log.Metadata);
            }
            catch (JsonException)
            {
                metadata = null;
            }
        }

        return new(log.Id, log.ActorId, log.ActorEmail, log.Action, log.EntityType, log.EntityId, metadata, log.IpAddress, log.UserAgent, log.CreatedAt);
    }
}

record CourseDto(
    string Id,
    string Title,
    string Slug,
    string? Description,
    string? Thumbnail,
    int Price,
    double AverageRating,
    int ReviewCount,
    string MinimumMemberTier,
    int TotalDurationSeconds,
    bool IsPublished)
{
    public static CourseDto FromCourse(Course course) =>
        new(
            course.Id,
            course.Title,
            course.Slug,
            course.Description,
            course.Thumbnail,
            course.Price,
            course.AverageRating,
            course.ReviewCount,
            course.MinimumMemberTier,
            course.TotalDurationSeconds,
            course.IsPublished
        );
}

record CourseDetailsDto(
    string Id,
    string Title,
    string Slug,
    string? Description,
    string? Thumbnail,
    int Price,
    double AverageRating,
    int ReviewCount,
    string MinimumMemberTier,
    int TotalDurationSeconds,
    bool IsPublished,
    string InstructorName,
    object? Instructor,
    IEnumerable<SectionDto> Sections,
    IEnumerable<LessonDetailsDto> Lessons,
    bool IsEnrolled,
    double Progress,
    IEnumerable<string> CompletedLessons,
    CourseReview? UserReview,
    IEnumerable<ReviewDto> Reviews,
    bool CanPreview,
    bool CanReview,
    bool CanPurchase)
{
    public static CourseDetailsDto FromCourse(Course course, Enrollment? enrollment, IEnumerable<string> completedLessons, CourseReview? userReview, bool isOwner)
    {
        var visibleSections = course.Sections
            .OrderBy(section => section.Position)
            .Select(section => new Section
            {
                Id = section.Id,
                Title = section.Title,
                Description = section.Description,
                Position = section.Position,
                CourseId = section.CourseId,
                Lessons = section.Lessons
                    .OrderBy(lesson => lesson.Position)
                    .Where(lesson => isOwner || enrollment is not null ? lesson.IsPublished || isOwner : lesson.IsPublished && lesson.IsPreview)
                    .ToList()
            })
            .ToList();
        var lessons = visibleSections.SelectMany(section => section.Lessons.Select(lesson => LessonDetailsDto.FromLesson(lesson, section)));

        return new(
            course.Id,
            course.Title,
            course.Slug,
            course.Description,
            course.Thumbnail,
            course.Price,
            course.AverageRating,
            course.ReviewCount,
            course.MinimumMemberTier,
            course.TotalDurationSeconds,
            course.IsPublished,
            course.Instructor?.Name ?? "Giảng viên",
            course.Instructor == null ? null : new { course.Instructor.Id, course.Instructor.Name, course.Instructor.Email },
            visibleSections.Select(SectionDto.FromSection),
            lessons,
            enrollment is not null,
            enrollment?.Progress ?? 0,
            completedLessons,
            userReview,
            course.Reviews.Select(ReviewDto.FromReview),
            visibleSections.Any(section => section.Lessons.Count > 0),
            enrollment is not null && !isOwner,
            true
        );
    }

    public static CourseDetailsDto FromCourse(Course course) =>
        new(
            course.Id,
            course.Title,
            course.Slug,
            course.Description,
            course.Thumbnail,
            course.Price,
            course.AverageRating,
            course.ReviewCount,
            course.MinimumMemberTier,
            course.TotalDurationSeconds,
            course.IsPublished,
            course.Instructor?.Name ?? "Giảng viên",
            course.Instructor == null ? null : new { course.Instructor.Id, course.Instructor.Name, course.Instructor.Email },
            course.Sections.Select(SectionDto.FromSection),
            course.Sections.SelectMany(section => section.Lessons.Select(lesson => LessonDetailsDto.FromLesson(lesson, section))),
            false,
            0,
            [],
            null,
            course.Reviews.Select(ReviewDto.FromReview),
            course.Sections.Any(section => section.Lessons.Count > 0),
            false,
            true
        );
}

record SectionDto(string Id, string Title, int Position, IEnumerable<LessonDto> Lessons)
{
    public static SectionDto FromSection(Section section) =>
        new(section.Id, section.Title, section.Position, section.Lessons.OrderBy(lesson => lesson.Position).Select(LessonDto.FromLesson));
}

record LessonDto(string Id, string Title, int Position, bool IsPublished, bool IsPreview, int? DurationSeconds, string? Content = null, string? VideoUrl = null, object? Quiz = null)
{
    public static LessonDto FromLesson(Lesson lesson) =>
        new(lesson.Id, lesson.Title, lesson.Position, lesson.IsPublished, lesson.IsPreview, lesson.DurationSeconds, lesson.Content, lesson.VideoUrl, lesson.Quiz == null ? null : new { lesson.Quiz.Id, lesson.Quiz.Title, lesson.Quiz.PassingScore });
}

record LessonDetailsDto(
    string Id,
    string Title,
    string? Content,
    string? VideoUrl,
    int? DurationSeconds,
    int Position,
    bool IsPublished,
    bool IsPreview,
    string SectionId,
    string SectionTitle,
    object? Quiz)
{
    public static LessonDetailsDto FromLesson(Lesson lesson, Section section) =>
        new(lesson.Id, lesson.Title, lesson.Content, lesson.VideoUrl, lesson.DurationSeconds, lesson.Position, lesson.IsPublished, lesson.IsPreview, section.Id, section.Title, lesson.Quiz == null ? null : new { lesson.Quiz.Id, lesson.Quiz.Title, lesson.Quiz.PassingScore });
}

record ReviewDto(string Id, int Rating, string? Comment, DateTime CreatedAt, object? User)
{
    public static ReviewDto FromReview(CourseReview review) =>
        new(review.Id, review.Rating, review.Comment, review.CreatedAt, review.User == null ? null : new { review.User.Id, review.User.Name });
}

record CommentDto(string Id, string Content, DateTime CreatedAt, object? User, IEnumerable<CommentDto> Replies)
{
    public static CommentDto FromComment(Comment comment) =>
        new(
            comment.Id,
            comment.Content,
            comment.CreatedAt,
            comment.User == null ? null : new { comment.User.Id, comment.User.Name, comment.User.Role },
            comment.Replies.OrderBy(reply => reply.CreatedAt).Select(FromComment)
        );
}

record QuizDto(
    string Id,
    string Title,
    string? Description,
    int PassingScore,
    string LessonId,
    IEnumerable<QuizQuestionDto> Questions,
    IEnumerable<QuizSubmissionDto> Submissions)
{
    public static QuizDto FromQuiz(Quiz quiz, IEnumerable<QuizSubmission> submissions, bool showAnswers) =>
        new(
            quiz.Id,
            quiz.Title,
            quiz.Description,
            quiz.PassingScore,
            quiz.LessonId,
            quiz.Questions.OrderBy(item => item.Position).Select(question => QuizQuestionDto.FromQuestion(question, showAnswers)),
            submissions.Select(QuizSubmissionDto.FromSubmission)
        );
}

record QuizQuestionDto(
    string Id,
    string QuestionText,
    IEnumerable<string> Options,
    int? CorrectOptionIndex,
    string? Explanation,
    int Position)
{
    public static QuizQuestionDto FromQuestion(QuizQuestion question, bool showAnswers) =>
        new(
            question.Id,
            question.QuestionText,
            ParseQuestionOptions(question.Options),
            showAnswers ? question.CorrectOptionIndex : null,
            showAnswers ? question.Explanation : null,
            question.Position
        );

    private static List<string> ParseQuestionOptions(string options)
    {
        try
        {
            return JsonSerializer.Deserialize<List<string>>(options) ?? [];
        }
        catch (JsonException)
        {
            return [];
        }
    }
}

record QuizSubmissionDto(string Id, double Score, bool Passed, JsonElement? Answers, DateTime CreatedAt)
{
    public static QuizSubmissionDto FromSubmission(QuizSubmission submission)
    {
        JsonElement? answers = null;
        try
        {
            answers = JsonSerializer.Deserialize<JsonElement>(submission.Answers);
        }
        catch (JsonException)
        {
            answers = null;
        }

        return new(submission.Id, submission.Score, submission.Passed, answers, submission.CreatedAt);
    }
}
