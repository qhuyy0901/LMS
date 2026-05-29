using System.Security.Claims;
using System.Text;
using System.Text.RegularExpressions;
using LMS.Api.Data;
using LMS.Api.Models;
using LMS.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace LMS.Api.Controllers;

[ApiController]
[Authorize]
public class TeacherController(LmsDbContext db, IWebHostEnvironment env) : ControllerBase
{
    private static readonly HashSet<string> ImageTypes = ["image/png", "image/jpeg", "image/jpg", "image/webp"];
    private static readonly HashSet<string> VideoTypes = ["video/mp4", "video/webm", "video/quicktime"];
    private static readonly HashSet<string> DocumentTypes =
    [
        "application/pdf",
        "application/msword",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "application/vnd.ms-powerpoint",
        "application/vnd.openxmlformats-officedocument.presentationml.presentation"
    ];

    [HttpGet("/api/teacher/courses")]
    public async Task<IResult> GetCourses()
    {
        if (!IsTeacher()) return Results.Forbid();
        var teacherId = CurrentUserId()!;
        var courses = await db.Courses.AsNoTracking()
            .Where(course => course.InstructorId == teacherId)
            .Include(course => course.Sections.OrderBy(section => section.Position))
                .ThenInclude(section => section.Lessons.OrderBy(lesson => lesson.Position))
            .OrderByDescending(course => course.UpdatedAt)
            .ToListAsync();

        return Results.Ok(courses.Select(ToCourseDto));
    }

    [HttpGet("/api/teacher/courses/{id}")]
    public async Task<IResult> GetCourse(string id)
    {
        var course = await LoadOwnedCourse(id, asNoTracking: true);
        return course is null ? ForbiddenCourse() : Results.Ok(ToCourseDto(course));
    }

    [HttpPost("/api/teacher/courses")]
    [RequestSizeLimit(230_000_000)]
    public async Task<IResult> CreateCourse([FromForm] TeacherCourseForm form)
    {
        if (!IsTeacher()) return Results.Forbid();

        var error = ValidateCourseForm(form);
        if (error is not null) return error;

        string? imageUrl = null;
        if (form.ImageFile is not null)
        {
            var fileError = ValidateFile(form.ImageFile, ImageTypes, 5 * 1024 * 1024, "Ảnh khóa học");
            if (fileError is not null) return fileError;
            imageUrl = await SaveUpload(form.ImageFile, "uploads/courses");
        }

        var title = form.Title!.Trim();
        var status = NormalizeCourseStatus(form.Status);
        var now = DateTime.UtcNow;
        var course = new KhoaHoc
        {
            Id = TaoId.Moi(),
            Title = title,
            Slug = await CreateUniqueSlug(title),
            ShortDescription = form.ShortDescription?.Trim(),
            Description = string.IsNullOrWhiteSpace(form.Description) ? form.ShortDescription?.Trim() : form.Description.Trim(),
            DetailedDescription = form.DetailedDescription?.Trim(),
            Thumbnail = imageUrl ?? form.ImageUrl,
            Category = string.IsNullOrWhiteSpace(form.Category) ? "Khác" : form.Category.Trim(),
            Level = NormalizeLevel(form.Level),
            Price = Math.Max(0, form.Price),
            Status = status,
            IsPublished = status == "PUBLIC",
            PublishedAt = status == "PUBLIC" ? now : null,
            MinimumMemberTier = "BRONZE",
            InstructorId = CurrentUserId()!,
            CreatedAt = now,
            UpdatedAt = now
        };

        db.Courses.Add(course);
        await db.SaveChangesAsync();
        return Results.Created($"/api/teacher/courses/{course.Id}", ToCourseDto(course));
    }

    [HttpPut("/api/teacher/courses/{id}")]
    [RequestSizeLimit(230_000_000)]
    public async Task<IResult> UpdateCourse(string id, [FromForm] TeacherCourseForm form)
    {
        var course = await LoadOwnedCourse(id);
        if (course is null) return ForbiddenCourse();

        var error = ValidateCourseForm(form);
        if (error is not null) return error;

        if (form.ImageFile is not null)
        {
            var fileError = ValidateFile(form.ImageFile, ImageTypes, 5 * 1024 * 1024, "Ảnh khóa học");
            if (fileError is not null) return fileError;
            course.Thumbnail = await SaveUpload(form.ImageFile, "uploads/courses");
        }
        else if (form.ImageUrl is not null)
        {
            course.Thumbnail = form.ImageUrl;
        }

        var title = form.Title!.Trim();
        if (course.Title != title)
        {
            course.Title = title;
            course.Slug = await CreateUniqueSlug(title, course.Id);
        }

        var status = NormalizeCourseStatus(form.Status);
        course.ShortDescription = form.ShortDescription?.Trim();
        course.Description = string.IsNullOrWhiteSpace(form.Description) ? form.ShortDescription?.Trim() : form.Description.Trim();
        course.DetailedDescription = form.DetailedDescription?.Trim();
        course.Category = string.IsNullOrWhiteSpace(form.Category) ? "Khác" : form.Category.Trim();
        course.Level = NormalizeLevel(form.Level);
        course.Price = Math.Max(0, form.Price);
        course.Status = status;
        course.IsPublished = status == "PUBLIC";
        course.PublishedAt = status == "PUBLIC" ? course.PublishedAt ?? DateTime.UtcNow : course.PublishedAt;
        course.UpdatedAt = DateTime.UtcNow;

        await db.SaveChangesAsync();
        return Results.Ok(ToCourseDto(course));
    }

    [HttpDelete("/api/teacher/courses/{id}")]
    public async Task<IResult> DeleteCourse(string id)
    {
        var course = await LoadOwnedCourse(id);
        if (course is null) return ForbiddenCourse();
        if (await db.Enrollments.AnyAsync(enrollment => enrollment.CourseId == id))
            return Results.BadRequest(new { message = "Không thể xóa khóa học đã có học viên đăng ký." });

        db.Assignments.RemoveRange(db.Assignments.Where(assignment => assignment.CourseId == id));
        db.Lessons.RemoveRange(db.Lessons.Where(lesson => lesson.CourseId == id));
        db.Sections.RemoveRange(db.Sections.Where(section => section.CourseId == id));
        db.Courses.Remove(course);
        await db.SaveChangesAsync();
        return Results.Ok(new { message = "Đã xóa khóa học." });
    }

    [HttpGet("/api/teacher/courses/{courseId}/chapters")]
    public async Task<IResult> GetChapters(string courseId)
    {
        var course = await LoadOwnedCourse(courseId, asNoTracking: true);
        return course is null ? ForbiddenCourse() : Results.Ok(course.Sections.OrderBy(section => section.Position).Select(ToChapterDto));
    }

    [HttpPost("/api/teacher/courses/{courseId}/chapters")]
    public async Task<IResult> CreateChapter(string courseId, [FromBody] TeacherChapterRequest request)
    {
        var course = await LoadOwnedCourse(courseId);
        if (course is null) return ForbiddenCourse();
        if (string.IsNullOrWhiteSpace(request.Title) || request.Title.Trim().Length < 3)
            return Results.BadRequest(new { message = "Tiêu đề chương tối thiểu 3 ký tự." });

        var now = DateTime.UtcNow;
        var chapter = new ChuongHoc
        {
            Id = TaoId.Moi(),
            CourseId = courseId,
            Title = request.Title.Trim(),
            Description = request.Description?.Trim(),
            Position = request.Position <= 0 ? course.Sections.Count + 1 : request.Position,
            CreatedAt = now,
            UpdatedAt = now
        };
        db.Sections.Add(chapter);
        await db.SaveChangesAsync();
        await NormalizeChapterPositions(courseId);
        return Results.Created($"/api/teacher/chapters/{chapter.Id}", ToChapterDto(chapter));
    }

    [HttpPut("/api/teacher/chapters/{chapterId}")]
    public async Task<IResult> UpdateChapter(string chapterId, [FromBody] TeacherChapterRequest request)
    {
        var chapter = await LoadOwnedChapter(chapterId);
        if (chapter is null) return ForbiddenCourse();
        if (string.IsNullOrWhiteSpace(request.Title) || request.Title.Trim().Length < 3)
            return Results.BadRequest(new { message = "Tiêu đề chương tối thiểu 3 ký tự." });

        chapter.Title = request.Title.Trim();
        chapter.Description = request.Description?.Trim();
        if (request.Position > 0) chapter.Position = request.Position;
        chapter.UpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync();
        await NormalizeChapterPositions(chapter.CourseId);
        return Results.Ok(ToChapterDto(chapter));
    }

    [HttpDelete("/api/teacher/chapters/{chapterId}")]
    public async Task<IResult> DeleteChapter(string chapterId)
    {
        var chapter = await LoadOwnedChapter(chapterId);
        if (chapter is null) return ForbiddenCourse();
        var courseId = chapter.CourseId;
        db.Sections.Remove(chapter);
        await db.SaveChangesAsync();
        await NormalizeChapterPositions(courseId);
        await RecalculateCourseDuration(courseId);
        return Results.Ok(new { message = "Đã xóa chương." });
    }

    [HttpGet("/api/teacher/chapters/{chapterId}/lessons")]
    public async Task<IResult> GetLessons(string chapterId)
    {
        var chapter = await LoadOwnedChapter(chapterId, asNoTracking: true);
        return chapter is null ? ForbiddenCourse() : Results.Ok(chapter.Lessons.OrderBy(lesson => lesson.Position).Select(ToLessonDto));
    }

    [HttpPost("/api/teacher/chapters/{chapterId}/lessons")]
    [RequestSizeLimit(280_000_000)]
    public async Task<IResult> CreateLesson(string chapterId, [FromForm] TeacherLessonForm form)
    {
        var chapter = await LoadOwnedChapter(chapterId);
        if (chapter is null) return ForbiddenCourse();
        var error = ValidateLessonForm(form, isUpdate: false);
        if (error is not null) return error;

        var now = DateTime.UtcNow;
        var status = NormalizeLessonStatus(form.Status);
        var lesson = new BaiHoc
        {
            Id = TaoId.Moi(),
            CourseId = chapter.CourseId,
            SectionId = chapterId,
            Title = form.Title!.Trim(),
            Content = form.Content?.Trim(),
            DurationSeconds = Math.Max(0, form.DurationSeconds),
            Position = form.Position <= 0 ? chapter.Lessons.Count + 1 : form.Position,
            Status = status,
            IsPublished = status == "PUBLIC",
            IsPreview = form.IsPreview,
            CreatedAt = now,
            UpdatedAt = now
        };

        await ApplyLessonFiles(lesson, form);
        db.Lessons.Add(lesson);
        await db.SaveChangesAsync();
        await NormalizeLessonPositions(chapterId);
        await RecalculateCourseDuration(chapter.CourseId);
        return Results.Created($"/api/teacher/lessons/{lesson.Id}", ToLessonDto(lesson));
    }

    [HttpPut("/api/teacher/lessons/{lessonId}")]
    [RequestSizeLimit(280_000_000)]
    public async Task<IResult> UpdateLesson(string lessonId, [FromForm] TeacherLessonForm form)
    {
        var lesson = await LoadOwnedLesson(lessonId);
        if (lesson is null) return ForbiddenCourse();
        var error = ValidateLessonForm(form, isUpdate: true);
        if (error is not null) return error;

        var oldChapterId = lesson.SectionId;
        var targetChapterId = string.IsNullOrWhiteSpace(form.ChapterId) ? lesson.SectionId : form.ChapterId;
        if (targetChapterId != lesson.SectionId)
        {
            var targetChapter = await LoadOwnedChapter(targetChapterId);
            if (targetChapter is null || targetChapter.CourseId != lesson.CourseId) return Results.BadRequest(new { message = "Chương không hợp lệ." });
            lesson.SectionId = targetChapterId;
        }

        var status = NormalizeLessonStatus(form.Status);
        lesson.Title = form.Title!.Trim();
        lesson.Content = form.Content?.Trim();
        lesson.DurationSeconds = Math.Max(0, form.DurationSeconds);
        lesson.Position = form.Position <= 0 ? lesson.Position : form.Position;
        lesson.Status = status;
        lesson.IsPublished = status == "PUBLIC";
        lesson.IsPreview = form.IsPreview;
        lesson.UpdatedAt = DateTime.UtcNow;
        await ApplyLessonFiles(lesson, form);

        await db.SaveChangesAsync();
        await NormalizeLessonPositions(oldChapterId);
        if (oldChapterId != lesson.SectionId) await NormalizeLessonPositions(lesson.SectionId);
        await RecalculateCourseDuration(lesson.CourseId);
        return Results.Ok(ToLessonDto(lesson));
    }

    [HttpDelete("/api/teacher/lessons/{lessonId}")]
    public async Task<IResult> DeleteLesson(string lessonId)
    {
        var lesson = await LoadOwnedLesson(lessonId);
        if (lesson is null) return ForbiddenCourse();
        var chapterId = lesson.SectionId;
        var courseId = lesson.CourseId;
        db.Lessons.Remove(lesson);
        await db.SaveChangesAsync();
        await NormalizeLessonPositions(chapterId);
        await RecalculateCourseDuration(courseId);
        return Results.Ok(new { message = "Đã xóa bài học." });
    }

    [HttpGet("/api/teacher/courses/{courseId}/assignments")]
    public async Task<IResult> GetAssignments(string courseId)
    {
        var course = await LoadOwnedCourse(courseId, asNoTracking: true);
        if (course is null) return ForbiddenCourse();
        var assignments = await db.Assignments.AsNoTracking()
            .Where(assignment => assignment.CourseId == courseId)
            .OrderByDescending(assignment => assignment.UpdatedAt)
            .ToListAsync();
        return Results.Ok(assignments.Select(ToAssignmentDto));
    }

    [HttpPost("/api/teacher/courses/{courseId}/assignments")]
    [RequestSizeLimit(80_000_000)]
    public async Task<IResult> CreateAssignment(string courseId, [FromForm] TeacherAssignmentForm form)
    {
        var course = await LoadOwnedCourse(courseId);
        if (course is null) return ForbiddenCourse();
        var error = await ValidateAssignmentForm(courseId, form);
        if (error is not null) return error;

        string? attachmentUrl = null;
        if (form.AttachmentFile is not null)
        {
            attachmentUrl = await SaveUpload(form.AttachmentFile, "uploads/lessons/files");
        }

        var now = DateTime.UtcNow;
        var assignment = new BaiTap
        {
            Id = TaoId.Moi(),
            CourseId = courseId,
            LessonId = string.IsNullOrWhiteSpace(form.LessonId) ? null : form.LessonId,
            TeacherId = CurrentUserId()!,
            Title = form.Title!.Trim(),
            Description = form.Description?.Trim(),
            DueDate = form.DueDate,
            MaxScore = Math.Max(1, form.MaxScore),
            AttachmentUrl = attachmentUrl,
            AllowTextSubmission = form.AllowTextSubmission,
            AllowFileSubmission = form.AllowFileSubmission,
            CreatedAt = now,
            UpdatedAt = now
        };

        db.Assignments.Add(assignment);
        await db.SaveChangesAsync();
        return Results.Created($"/api/teacher/assignments/{assignment.Id}", ToAssignmentDto(assignment));
    }

    [HttpPut("/api/teacher/assignments/{assignmentId}")]
    [RequestSizeLimit(80_000_000)]
    public async Task<IResult> UpdateAssignment(string assignmentId, [FromForm] TeacherAssignmentForm form)
    {
        var assignment = await LoadOwnedAssignment(assignmentId);
        if (assignment is null) return ForbiddenCourse();
        var error = await ValidateAssignmentForm(assignment.CourseId, form);
        if (error is not null) return error;

        if (form.AttachmentFile is not null)
        {
            assignment.AttachmentUrl = await SaveUpload(form.AttachmentFile, "uploads/lessons/files");
        }

        assignment.LessonId = string.IsNullOrWhiteSpace(form.LessonId) ? null : form.LessonId;
        assignment.Title = form.Title!.Trim();
        assignment.Description = form.Description?.Trim();
        assignment.DueDate = form.DueDate;
        assignment.MaxScore = Math.Max(1, form.MaxScore);
        assignment.AllowTextSubmission = form.AllowTextSubmission;
        assignment.AllowFileSubmission = form.AllowFileSubmission;
        assignment.UpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync();
        return Results.Ok(ToAssignmentDto(assignment));
    }

    [HttpDelete("/api/teacher/assignments/{assignmentId}")]
    public async Task<IResult> DeleteAssignment(string assignmentId)
    {
        var assignment = await LoadOwnedAssignment(assignmentId);
        if (assignment is null) return ForbiddenCourse();
        db.Assignments.Remove(assignment);
        await db.SaveChangesAsync();
        return Results.Ok(new { message = "Đã xóa bài tập." });
    }

    [HttpPost("/api/teacher/uploads/course-image")]
    [RequestSizeLimit(10_000_000)]
    public Task<IResult> UploadCourseImage([FromForm] UploadForm form) => UploadFile(form.File, ImageTypes, 5 * 1024 * 1024, "uploads/courses", "Ảnh khóa học");

    [HttpPost("/api/teacher/uploads/lesson-image")]
    [RequestSizeLimit(10_000_000)]
    public Task<IResult> UploadLessonImage([FromForm] UploadForm form) => UploadFile(form.File, ImageTypes, 5 * 1024 * 1024, "uploads/lessons/images", "Ảnh bài học");

    [HttpPost("/api/teacher/uploads/lesson-video")]
    [RequestSizeLimit(230_000_000)]
    public Task<IResult> UploadLessonVideo([FromForm] UploadForm form) => UploadFile(form.File, VideoTypes, 200 * 1024 * 1024, "uploads/lessons/videos", "Video bài học");

    [HttpPost("/api/teacher/uploads/lesson-file")]
    [RequestSizeLimit(80_000_000)]
    public Task<IResult> UploadLessonFile([FromForm] UploadForm form) => UploadFile(form.File, DocumentTypes, 50 * 1024 * 1024, "uploads/lessons/files", "Tài liệu");

    private async Task<IResult> UploadFile(IFormFile? file, HashSet<string> allowedTypes, long maxSize, string folder, string label)
    {
        if (!IsTeacher()) return Results.Forbid();
        if (file is null || file.Length == 0) return Results.BadRequest(new { message = "Thiếu file upload." });
        var error = ValidateFile(file, allowedTypes, maxSize, label);
        if (error is not null) return error;
        var url = await SaveUpload(file, folder);
        return Results.Ok(new { url });
    }

    private bool IsTeacher()
    {
        var role = User.FindFirstValue(ClaimTypes.Role);
        return role is "INSTRUCTOR" or "ADMIN" or "TEACHER" or "GIANGVIEN";
    }

    private string? CurrentUserId() => TroGiup.LayUserId(User);

    private IResult ForbiddenCourse() => Results.Json(new { message = "Bạn không có quyền chỉnh sửa khóa học này." }, statusCode: 403);

    private async Task<KhoaHoc?> LoadOwnedCourse(string courseId, bool asNoTracking = false)
    {
        if (!IsTeacher()) return null;
        var teacherId = CurrentUserId();
        if (teacherId is null) return null;

        var query = db.Courses
            .Include(course => course.Sections.OrderBy(section => section.Position))
                .ThenInclude(section => section.Lessons.OrderBy(lesson => lesson.Position))
            .Where(course => course.Id == courseId && (course.InstructorId == teacherId || User.IsInRole("ADMIN")));
        if (asNoTracking) query = query.AsNoTracking();
        return await query.FirstOrDefaultAsync();
    }

    private async Task<ChuongHoc?> LoadOwnedChapter(string chapterId, bool asNoTracking = false)
    {
        if (!IsTeacher()) return null;
        var teacherId = CurrentUserId();
        if (teacherId is null) return null;

        var query = db.Sections
            .Include(chapter => chapter.Course)
            .Include(chapter => chapter.Lessons.OrderBy(lesson => lesson.Position))
            .Where(chapter => chapter.Id == chapterId && chapter.Course != null && (chapter.Course.InstructorId == teacherId || User.IsInRole("ADMIN")));
        if (asNoTracking) query = query.AsNoTracking();
        return await query.FirstOrDefaultAsync();
    }

    private async Task<BaiHoc?> LoadOwnedLesson(string lessonId)
    {
        if (!IsTeacher()) return null;
        var teacherId = CurrentUserId();
        if (teacherId is null) return null;

        return await db.Lessons
            .Include(lesson => lesson.Course)
            .FirstOrDefaultAsync(lesson => lesson.Id == lessonId && lesson.Course != null && (lesson.Course.InstructorId == teacherId || User.IsInRole("ADMIN")));
    }

    private async Task<BaiTap?> LoadOwnedAssignment(string assignmentId)
    {
        if (!IsTeacher()) return null;
        var teacherId = CurrentUserId();
        if (teacherId is null) return null;

        return await db.Assignments
            .Include(assignment => assignment.Course)
            .FirstOrDefaultAsync(assignment => assignment.Id == assignmentId && assignment.Course != null && (assignment.Course.InstructorId == teacherId || User.IsInRole("ADMIN")));
    }

    private static IResult? ValidateCourseForm(TeacherCourseForm form)
    {
        if (string.IsNullOrWhiteSpace(form.Title) || form.Title.Trim().Length < 5)
            return Results.BadRequest(new { message = "Tên khóa học tối thiểu 5 ký tự." });
        if (string.IsNullOrWhiteSpace(form.ShortDescription) && string.IsNullOrWhiteSpace(form.Description))
            return Results.BadRequest(new { message = "Khóa học cần có mô tả." });
        if (form.Price < 0) return Results.BadRequest(new { message = "Giá khóa học không được âm." });
        return null;
    }

    private static IResult? ValidateLessonForm(TeacherLessonForm form, bool isUpdate)
    {
        if (string.IsNullOrWhiteSpace(form.Title) || form.Title.Trim().Length < 3)
            return Results.BadRequest(new { message = "Tiêu đề bài học tối thiểu 3 ký tự." });
        if (form.DurationSeconds < 0) return Results.BadRequest(new { message = "Thời lượng không được âm." });
        if (!isUpdate && string.IsNullOrWhiteSpace(form.Content) && form.VideoFile is null)
            return Results.BadRequest(new { message = "Bài học cần có nội dung lý thuyết hoặc video." });
        if (form.ImageFile is not null)
        {
            var error = ValidateFile(form.ImageFile, ImageTypes, 5 * 1024 * 1024, "Ảnh bài học");
            if (error is not null) return error;
        }
        if (form.VideoFile is not null)
        {
            var error = ValidateFile(form.VideoFile, VideoTypes, 200 * 1024 * 1024, "Video bài học");
            if (error is not null) return error;
        }
        if (form.DocumentFile is not null)
        {
            var error = ValidateFile(form.DocumentFile, DocumentTypes, 50 * 1024 * 1024, "Tài liệu");
            if (error is not null) return error;
        }
        return null;
    }

    private async Task<IResult?> ValidateAssignmentForm(string courseId, TeacherAssignmentForm form)
    {
        if (string.IsNullOrWhiteSpace(form.Title) || form.Title.Trim().Length < 3)
            return Results.BadRequest(new { message = "Tiêu đề bài tập tối thiểu 3 ký tự." });
        if (form.MaxScore <= 0) return Results.BadRequest(new { message = "Điểm tối đa phải lớn hơn 0." });
        if (!string.IsNullOrWhiteSpace(form.LessonId) && !await db.Lessons.AnyAsync(lesson => lesson.Id == form.LessonId && lesson.CourseId == courseId))
            return Results.BadRequest(new { message = "Bài học áp dụng không hợp lệ." });
        if (form.AttachmentFile is not null)
        {
            var error = ValidateFile(form.AttachmentFile, DocumentTypes, 50 * 1024 * 1024, "Tài liệu");
            if (error is not null) return error;
        }
        return null;
    }

    private static IResult? ValidateFile(IFormFile file, HashSet<string> allowedTypes, long maxSize, string label)
    {
        if (!allowedTypes.Contains(file.ContentType)) return Results.BadRequest(new { message = $"{label} không đúng định dạng được hỗ trợ." });
        if (file.Length > maxSize) return Results.BadRequest(new { message = $"{label} vượt quá dung lượng cho phép." });
        return null;
    }

    private async Task ApplyLessonFiles(BaiHoc lesson, TeacherLessonForm form)
    {
        if (form.ImageFile is not null) lesson.IllustrationUrl = await SaveUpload(form.ImageFile, "uploads/lessons/images");
        if (form.VideoFile is not null) lesson.VideoUrl = await SaveUpload(form.VideoFile, "uploads/lessons/videos");
        if (form.DocumentFile is not null) lesson.FileUrl = await SaveUpload(form.DocumentFile, "uploads/lessons/files");
    }

    private async Task<string> SaveUpload(IFormFile file, string relativeFolder)
    {
        var root = env.WebRootPath;
        if (string.IsNullOrWhiteSpace(root)) root = Path.Combine(env.ContentRootPath, "wwwroot");
        var folder = Path.Combine(root, relativeFolder.Replace('/', Path.DirectorySeparatorChar));
        Directory.CreateDirectory(folder);
        var fileName = $"{Guid.NewGuid():N}{Path.GetExtension(file.FileName).ToLowerInvariant()}";
        var path = Path.Combine(folder, fileName);
        await using var stream = System.IO.File.Create(path);
        await file.CopyToAsync(stream);
        return "/" + relativeFolder.Trim('/').Replace("\\", "/") + "/" + fileName;
    }

    private async Task<string> CreateUniqueSlug(string title, string? excludeCourseId = null)
    {
        var baseSlug = Slugify(title);
        var slug = baseSlug;
        var counter = 2;
        while (await db.Courses.AnyAsync(course => course.Slug == slug && course.Id != excludeCourseId))
        {
            slug = $"{baseSlug}-{counter++}";
        }
        return slug;
    }

    private static string Slugify(string value)
    {
        var normalized = value.ToLowerInvariant().Normalize(System.Text.NormalizationForm.FormD);
        var builder = new StringBuilder();
        foreach (var character in normalized)
        {
            var category = System.Globalization.CharUnicodeInfo.GetUnicodeCategory(character);
            if (category == System.Globalization.UnicodeCategory.NonSpacingMark) continue;
            if (char.IsLetterOrDigit(character)) builder.Append(character);
            else if (char.IsWhiteSpace(character) || character is '-' or '_') builder.Append('-');
        }
        var slug = Regex.Replace(builder.ToString(), "-+", "-").Trim('-');
        return string.IsNullOrWhiteSpace(slug) ? "khoa-hoc-moi" : slug;
    }

    private static string NormalizeCourseStatus(string? status) => (status ?? "DRAFT").Trim().ToUpperInvariant() switch
    {
        "PUBLIC" or "PUBLISHED" or "CONG_KHAI" => "PUBLIC",
        "HIDDEN" or "AN" => "HIDDEN",
        "CLOSED" or "DONG" => "CLOSED",
        _ => "DRAFT"
    };

    private static string NormalizeLessonStatus(string? status) => (status ?? "DRAFT").Trim().ToUpperInvariant() switch
    {
        "PUBLIC" or "PUBLISHED" or "CONG_KHAI" => "PUBLIC",
        _ => "DRAFT"
    };

    private static string NormalizeLevel(string? level) => (level ?? "BEGINNER").Trim().ToUpperInvariant() switch
    {
        "INTERMEDIATE" => "INTERMEDIATE",
        "ADVANCED" => "ADVANCED",
        _ => "BEGINNER"
    };

    private async Task NormalizeChapterPositions(string courseId)
    {
        var chapters = await db.Sections.Where(chapter => chapter.CourseId == courseId).OrderBy(chapter => chapter.Position).ToListAsync();
        for (var index = 0; index < chapters.Count; index++) chapters[index].Position = index + 1;
        await db.SaveChangesAsync();
    }

    private async Task NormalizeLessonPositions(string chapterId)
    {
        var lessons = await db.Lessons.Where(lesson => lesson.SectionId == chapterId).OrderBy(lesson => lesson.Position).ToListAsync();
        for (var index = 0; index < lessons.Count; index++) lessons[index].Position = index + 1;
        await db.SaveChangesAsync();
    }

    private async Task RecalculateCourseDuration(string courseId)
    {
        var total = await db.Lessons.Where(lesson => lesson.CourseId == courseId).SumAsync(lesson => lesson.DurationSeconds ?? 0);
        var course = await db.Courses.FirstOrDefaultAsync(item => item.Id == courseId);
        if (course is null) return;
        course.TotalDurationSeconds = total;
        course.UpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync();
    }

    private static TeacherCourseDto ToCourseDto(KhoaHoc course) => new(
        course.Id,
        course.Title,
        course.ShortDescription,
        course.Description,
        course.DetailedDescription,
        course.Thumbnail,
        course.Category,
        course.Level,
        course.Price,
        course.Status,
        course.IsPublished,
        course.CreatedAt,
        course.UpdatedAt,
        course.InstructorId,
        course.TotalDurationSeconds,
        course.Sections.OrderBy(section => section.Position).Select(ToChapterDto).ToList());

    private static TeacherChapterDto ToChapterDto(ChuongHoc chapter) => new(
        chapter.Id,
        chapter.CourseId,
        chapter.Title,
        chapter.Description,
        chapter.Position,
        chapter.Lessons.OrderBy(lesson => lesson.Position).Select(ToLessonDto).ToList());

    private static TeacherLessonDto ToLessonDto(BaiHoc lesson) => new(
        lesson.Id,
        lesson.CourseId,
        lesson.SectionId,
        lesson.Title,
        lesson.Content,
        lesson.IllustrationUrl,
        lesson.VideoUrl,
        lesson.FileUrl,
        lesson.DurationSeconds ?? 0,
        lesson.Status,
        lesson.IsPublished,
        lesson.IsPreview,
        lesson.Position);

    private static TeacherAssignmentDto ToAssignmentDto(BaiTap assignment) => new(
        assignment.Id,
        assignment.CourseId,
        assignment.LessonId,
        assignment.Title,
        assignment.Description,
        assignment.DueDate,
        assignment.MaxScore,
        assignment.AttachmentUrl,
        assignment.AllowTextSubmission,
        assignment.AllowFileSubmission,
        assignment.CreatedAt,
        assignment.UpdatedAt,
        assignment.TeacherId);
}

public class TeacherCourseForm
{
    public string? Title { get; set; }
    public string? ShortDescription { get; set; }
    public string? Description { get; set; }
    public string? DetailedDescription { get; set; }
    public string? ImageUrl { get; set; }
    public IFormFile? ImageFile { get; set; }
    public string? Category { get; set; }
    public string? Level { get; set; }
    public int Price { get; set; }
    public string? Status { get; set; }
}

public class TeacherChapterRequest
{
    public string? Title { get; set; }
    public string? Description { get; set; }
    public int Position { get; set; }
}

public class TeacherLessonForm
{
    public string? ChapterId { get; set; }
    public string? Title { get; set; }
    public string? Content { get; set; }
    public int DurationSeconds { get; set; }
    public string? Status { get; set; }
    public bool IsPreview { get; set; }
    public int Position { get; set; }
    public IFormFile? ImageFile { get; set; }
    public IFormFile? VideoFile { get; set; }
    public IFormFile? DocumentFile { get; set; }
}

public class TeacherAssignmentForm
{
    public string? LessonId { get; set; }
    public string? Title { get; set; }
    public string? Description { get; set; }
    public DateTime? DueDate { get; set; }
    public int MaxScore { get; set; } = 100;
    public IFormFile? AttachmentFile { get; set; }
    public bool AllowTextSubmission { get; set; } = true;
    public bool AllowFileSubmission { get; set; } = true;
}

public class UploadForm
{
    public IFormFile? File { get; set; }
}

public record TeacherCourseDto(
    string Id,
    string Title,
    string? ShortDescription,
    string? Description,
    string? DetailedDescription,
    string? ImageUrl,
    string Category,
    string Level,
    int Price,
    string Status,
    bool IsPublished,
    DateTime CreatedAt,
    DateTime UpdatedAt,
    string TeacherId,
    int TotalDurationSeconds,
    IReadOnlyList<TeacherChapterDto> Chapters);

public record TeacherChapterDto(
    string Id,
    string CourseId,
    string Title,
    string? Description,
    int Position,
    IReadOnlyList<TeacherLessonDto> Lessons);

public record TeacherLessonDto(
    string Id,
    string CourseId,
    string ChapterId,
    string Title,
    string? Content,
    string? ImageUrl,
    string? VideoUrl,
    string? FileUrl,
    int DurationSeconds,
    string Status,
    bool IsPublished,
    bool IsPreview,
    int Position);

public record TeacherAssignmentDto(
    string Id,
    string CourseId,
    string? LessonId,
    string Title,
    string? Description,
    DateTime? DueDate,
    int MaxScore,
    string? AttachmentUrl,
    bool AllowTextSubmission,
    bool AllowFileSubmission,
    DateTime CreatedAt,
    DateTime UpdatedAt,
    string TeacherId);
