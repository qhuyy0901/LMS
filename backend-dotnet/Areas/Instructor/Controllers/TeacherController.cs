using System.Security.Claims;
using System.Text;
using System.Text.RegularExpressions;
using LMS.Api.Infrastructure.Persistence;
using LMS.Api.Domain.Entities;
using LMS.Api.Application.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace LMS.Api.Areas.GiangVien.Controllers;

[ApiController]
[Authorize]
[Area("Instructor")]
public class TeacherController(ApplicationDbContext db, IWebHostEnvironment env) : ControllerBase
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
        var courses = await db.KhoaHoc.AsNoTracking()
            .Where(course => course.GiangVienId == teacherId)
            .Include(course => course.CacChuongHoc.OrderBy(section => section.ThuTu))
                .ThenInclude(section => section.CacBaiHoc.OrderBy(lesson => lesson.ThuTu))
            .OrderByDescending(course => course.NgayCapNhat)
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
            TieuDe = title,
            DuongDanThanThien = await CreateUniqueSlug(title),
            MoTaNgan = form.ShortDescription?.Trim(),
            MoTa = string.IsNullOrWhiteSpace(form.Description) ? form.ShortDescription?.Trim() : form.Description.Trim(),
            MoTaChiTiet = form.DetailedDescription?.Trim(),
            AnhDaiDien = imageUrl ?? form.ImageUrl,
            ChuyenMuc = string.IsNullOrWhiteSpace(form.Category) ? "Khác" : form.Category.Trim(),
            TrinhDo = NormalizeLevel(form.Level),
            Gia = Math.Max(0, form.Price),
            TrangThai = status,
            DaXuatBan = status == "PUBLIC",
            NgayXuatBan = status == "PUBLIC" ? now : null,
            HangThanhVienToiThieu = "BRONZE",
            GiangVienId = CurrentUserId()!,
            NgayTao = now,
            NgayCapNhat = now
        };

        db.KhoaHoc.Add(course);
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
            course.AnhDaiDien = await SaveUpload(form.ImageFile, "uploads/courses");
        }
        else if (form.ImageUrl is not null)
        {
            course.AnhDaiDien = form.ImageUrl;
        }

        var title = form.Title!.Trim();
        if (course.TieuDe != title)
        {
            course.TieuDe = title;
            course.DuongDanThanThien = await CreateUniqueSlug(title, course.Id);
        }

        var status = NormalizeCourseStatus(form.Status);
        course.MoTaNgan = form.ShortDescription?.Trim();
        course.MoTa = string.IsNullOrWhiteSpace(form.Description) ? form.ShortDescription?.Trim() : form.Description.Trim();
        course.MoTaChiTiet = form.DetailedDescription?.Trim();
        course.ChuyenMuc = string.IsNullOrWhiteSpace(form.Category) ? "Khác" : form.Category.Trim();
        course.TrinhDo = NormalizeLevel(form.Level);
        course.Gia = Math.Max(0, form.Price);
        course.TrangThai = status;
        course.DaXuatBan = status == "PUBLIC";
        course.NgayXuatBan = status == "PUBLIC" ? course.NgayXuatBan ?? DateTime.UtcNow : course.NgayXuatBan;
        course.NgayCapNhat = DateTime.UtcNow;

        await db.SaveChangesAsync();
        return Results.Ok(ToCourseDto(course));
    }

    [HttpDelete("/api/teacher/courses/{id}")]
    public async Task<IResult> DeleteCourse(string id)
    {
        var course = await LoadOwnedCourse(id);
        if (course is null) return ForbiddenCourse();
        if (await db.GhiDanh.AnyAsync(enrollment => enrollment.KhoaHocId == id))
            return Results.BadRequest(new { message = "Không thể xóa khóa học đã có học viên đăng ký." });

        db.BaiTap.RemoveRange(db.BaiTap.Where(assignment => assignment.KhoaHocId == id));
        db.BaiHoc.RemoveRange(db.BaiHoc.Where(lesson => lesson.KhoaHocId == id));
        db.ChuongHoc.RemoveRange(db.ChuongHoc.Where(section => section.KhoaHocId == id));
        db.KhoaHoc.Remove(course);
        await db.SaveChangesAsync();
        return Results.Ok(new { message = "Đã xóa khóa học." });
    }

    [HttpGet("/api/teacher/courses/{courseId}/chapters")]
    public async Task<IResult> GetChapters(string courseId)
    {
        var course = await LoadOwnedCourse(courseId, asNoTracking: true);
        return course is null ? ForbiddenCourse() : Results.Ok(course.CacChuongHoc.OrderBy(section => section.ThuTu).Select(ToChapterDto));
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
            KhoaHocId = courseId,
            TieuDe = request.Title.Trim(),
            MoTa = request.Description?.Trim(),
            ThuTu = request.Position <= 0 ? course.CacChuongHoc.Count + 1 : request.Position,
            NgayTao = now,
            NgayCapNhat = now
        };
        db.ChuongHoc.Add(chapter);
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

        chapter.TieuDe = request.Title.Trim();
        chapter.MoTa = request.Description?.Trim();
        if (request.Position > 0) chapter.ThuTu = request.Position;
        chapter.NgayCapNhat = DateTime.UtcNow;
        await db.SaveChangesAsync();
        await NormalizeChapterPositions(chapter.KhoaHocId);
        return Results.Ok(ToChapterDto(chapter));
    }

    [HttpDelete("/api/teacher/chapters/{chapterId}")]
    public async Task<IResult> DeleteChapter(string chapterId)
    {
        var chapter = await LoadOwnedChapter(chapterId);
        if (chapter is null) return ForbiddenCourse();
        var courseId = chapter.KhoaHocId;
        db.ChuongHoc.Remove(chapter);
        await db.SaveChangesAsync();
        await NormalizeChapterPositions(courseId);
        await RecalculateCourseDuration(courseId);
        return Results.Ok(new { message = "Đã xóa chương." });
    }

    [HttpGet("/api/teacher/chapters/{chapterId}/lessons")]
    public async Task<IResult> GetLessons(string chapterId)
    {
        var chapter = await LoadOwnedChapter(chapterId, asNoTracking: true);
        return chapter is null ? ForbiddenCourse() : Results.Ok(chapter.CacBaiHoc.OrderBy(lesson => lesson.ThuTu).Select(ToLessonDto));
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
            KhoaHocId = chapter.KhoaHocId,
            ChuongHocId = chapterId,
            TieuDe = form.Title!.Trim(),
            NoiDung = form.Content?.Trim(),
            ThoiLuongGiay = Math.Max(0, form.DurationSeconds),
            ThuTu = form.Position <= 0 ? chapter.CacBaiHoc.Count + 1 : form.Position,
            TrangThai = status,
            DaXuatBan = status == "PUBLIC",
            ChoXemTruoc = form.IsPreview,
            NgayTao = now,
            NgayCapNhat = now
        };

        await ApplyLessonFiles(lesson, form);
        db.BaiHoc.Add(lesson);
        await db.SaveChangesAsync();
        await NormalizeLessonPositions(chapterId);
        await RecalculateCourseDuration(chapter.KhoaHocId);
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

        var oldChapterId = lesson.ChuongHocId;
        var targetChapterId = string.IsNullOrWhiteSpace(form.ChapterId) ? lesson.ChuongHocId : form.ChapterId;
        if (targetChapterId != lesson.ChuongHocId)
        {
            var targetChapter = await LoadOwnedChapter(targetChapterId);
            if (targetChapter is null || targetChapter.KhoaHocId != lesson.KhoaHocId) return Results.BadRequest(new { message = "Chương không hợp lệ." });
            lesson.ChuongHocId = targetChapterId;
        }

        var status = NormalizeLessonStatus(form.Status);
        lesson.TieuDe = form.Title!.Trim();
        lesson.NoiDung = form.Content?.Trim();
        lesson.ThoiLuongGiay = Math.Max(0, form.DurationSeconds);
        lesson.ThuTu = form.Position <= 0 ? lesson.ThuTu : form.Position;
        lesson.TrangThai = status;
        lesson.DaXuatBan = status == "PUBLIC";
        lesson.ChoXemTruoc = form.IsPreview;
        lesson.NgayCapNhat = DateTime.UtcNow;
        await ApplyLessonFiles(lesson, form);

        await db.SaveChangesAsync();
        await NormalizeLessonPositions(oldChapterId);
        if (oldChapterId != lesson.ChuongHocId) await NormalizeLessonPositions(lesson.ChuongHocId);
        await RecalculateCourseDuration(lesson.KhoaHocId);
        return Results.Ok(ToLessonDto(lesson));
    }

    [HttpDelete("/api/teacher/lessons/{lessonId}")]
    public async Task<IResult> DeleteLesson(string lessonId)
    {
        var lesson = await LoadOwnedLesson(lessonId);
        if (lesson is null) return ForbiddenCourse();
        var chapterId = lesson.ChuongHocId;
        var courseId = lesson.KhoaHocId;
        db.BaiHoc.Remove(lesson);
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
        var assignments = await db.BaiTap.AsNoTracking()
            .Where(assignment => assignment.KhoaHocId == courseId)
            .OrderByDescending(assignment => assignment.NgayCapNhat)
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
            KhoaHocId = courseId,
            BaiHocId = string.IsNullOrWhiteSpace(form.LessonId) ? null : form.LessonId,
            GiangVienId = CurrentUserId()!,
            TieuDe = form.Title!.Trim(),
            MoTa = form.Description?.Trim(),
            HanNop = form.DueDate,
            DiemToiDa = Math.Max(1, form.MaxScore),
            FileDinhKemUrl = attachmentUrl,
            ChoPhepNopText = form.AllowTextSubmission,
            ChoPhepNopFile = form.AllowFileSubmission,
            NgayTao = now,
            NgayCapNhat = now
        };

        db.BaiTap.Add(assignment);
        await db.SaveChangesAsync();
        return Results.Created($"/api/teacher/assignments/{assignment.Id}", ToAssignmentDto(assignment));
    }

    [HttpPut("/api/teacher/assignments/{assignmentId}")]
    [RequestSizeLimit(80_000_000)]
    public async Task<IResult> UpdateAssignment(string assignmentId, [FromForm] TeacherAssignmentForm form)
    {
        var assignment = await LoadOwnedAssignment(assignmentId);
        if (assignment is null) return ForbiddenCourse();
        var error = await ValidateAssignmentForm(assignment.KhoaHocId, form);
        if (error is not null) return error;

        if (form.AttachmentFile is not null)
        {
            assignment.FileDinhKemUrl = await SaveUpload(form.AttachmentFile, "uploads/lessons/files");
        }

        assignment.BaiHocId = string.IsNullOrWhiteSpace(form.LessonId) ? null : form.LessonId;
        assignment.TieuDe = form.Title!.Trim();
        assignment.MoTa = form.Description?.Trim();
        assignment.HanNop = form.DueDate;
        assignment.DiemToiDa = Math.Max(1, form.MaxScore);
        assignment.ChoPhepNopText = form.AllowTextSubmission;
        assignment.ChoPhepNopFile = form.AllowFileSubmission;
        assignment.NgayCapNhat = DateTime.UtcNow;
        await db.SaveChangesAsync();
        return Results.Ok(ToAssignmentDto(assignment));
    }

    [HttpDelete("/api/teacher/assignments/{assignmentId}")]
    public async Task<IResult> DeleteAssignment(string assignmentId)
    {
        var assignment = await LoadOwnedAssignment(assignmentId);
        if (assignment is null) return ForbiddenCourse();
        db.BaiTap.Remove(assignment);
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

        var query = db.KhoaHoc
            .Include(course => course.CacChuongHoc.OrderBy(section => section.ThuTu))
                .ThenInclude(section => section.CacBaiHoc.OrderBy(lesson => lesson.ThuTu))
            .Where(course => course.Id == courseId && (course.GiangVienId == teacherId || User.IsInRole("ADMIN")));
        if (asNoTracking) query = query.AsNoTracking();
        return await query.FirstOrDefaultAsync();
    }

    private async Task<ChuongHoc?> LoadOwnedChapter(string chapterId, bool asNoTracking = false)
    {
        if (!IsTeacher()) return null;
        var teacherId = CurrentUserId();
        if (teacherId is null) return null;

        var query = db.ChuongHoc
            .Include(chapter => chapter.KhoaHoc)
            .Include(chapter => chapter.CacBaiHoc.OrderBy(lesson => lesson.ThuTu))
            .Where(chapter => chapter.Id == chapterId && chapter.KhoaHoc != null && (chapter.KhoaHoc.GiangVienId == teacherId || User.IsInRole("ADMIN")));
        if (asNoTracking) query = query.AsNoTracking();
        return await query.FirstOrDefaultAsync();
    }

    private async Task<BaiHoc?> LoadOwnedLesson(string lessonId)
    {
        if (!IsTeacher()) return null;
        var teacherId = CurrentUserId();
        if (teacherId is null) return null;

        return await db.BaiHoc
            .Include(lesson => lesson.KhoaHoc)
            .FirstOrDefaultAsync(lesson => lesson.Id == lessonId && lesson.KhoaHoc != null && (lesson.KhoaHoc.GiangVienId == teacherId || User.IsInRole("ADMIN")));
    }

    private async Task<BaiTap?> LoadOwnedAssignment(string assignmentId)
    {
        if (!IsTeacher()) return null;
        var teacherId = CurrentUserId();
        if (teacherId is null) return null;

        return await db.BaiTap
            .Include(assignment => assignment.KhoaHoc)
            .FirstOrDefaultAsync(assignment => assignment.Id == assignmentId && assignment.KhoaHoc != null && (assignment.KhoaHoc.GiangVienId == teacherId || User.IsInRole("ADMIN")));
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
        if (!string.IsNullOrWhiteSpace(form.LessonId) && !await db.BaiHoc.AnyAsync(lesson => lesson.Id == form.LessonId && lesson.KhoaHocId == courseId))
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
        while (await db.KhoaHoc.AnyAsync(course => course.DuongDanThanThien == slug && course.Id != excludeCourseId))
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
        var chapters = await db.ChuongHoc.Where(chapter => chapter.KhoaHocId == courseId).OrderBy(chapter => chapter.ThuTu).ToListAsync();
        for (var index = 0; index < chapters.Count; index++) chapters[index].ThuTu = index + 1;
        await db.SaveChangesAsync();
    }

    private async Task NormalizeLessonPositions(string chapterId)
    {
        var lessons = await db.BaiHoc.Where(lesson => lesson.ChuongHocId == chapterId).OrderBy(lesson => lesson.ThuTu).ToListAsync();
        for (var index = 0; index < lessons.Count; index++) lessons[index].ThuTu = index + 1;
        await db.SaveChangesAsync();
    }

    private async Task RecalculateCourseDuration(string courseId)
    {
        var total = await db.BaiHoc.Where(lesson => lesson.KhoaHocId == courseId).SumAsync(lesson => lesson.ThoiLuongGiay ?? 0);
        var course = await db.KhoaHoc.FirstOrDefaultAsync(item => item.Id == courseId);
        if (course is null) return;
        course.TongThoiLuongGiay = total;
        course.NgayCapNhat = DateTime.UtcNow;
        await db.SaveChangesAsync();
    }

    private static TeacherCourseDto ToCourseDto(KhoaHoc course) => new(
        course.Id,
        course.TieuDe,
        course.MoTaNgan,
        course.MoTa,
        course.MoTaChiTiet,
        course.AnhDaiDien,
        course.ChuyenMuc,
        course.TrinhDo,
        course.Gia,
        course.TrangThai,
        course.DaXuatBan,
        course.NgayTao,
        course.NgayCapNhat,
        course.GiangVienId,
        course.TongThoiLuongGiay,
        course.CacChuongHoc.OrderBy(section => section.ThuTu).Select(ToChapterDto).ToList());

    private static TeacherChapterDto ToChapterDto(ChuongHoc chapter) => new(
        chapter.Id,
        chapter.KhoaHocId,
        chapter.TieuDe,
        chapter.MoTa,
        chapter.ThuTu,
        chapter.CacBaiHoc.OrderBy(lesson => lesson.ThuTu).Select(ToLessonDto).ToList());

    private static TeacherLessonDto ToLessonDto(BaiHoc lesson) => new(
        lesson.Id,
        lesson.KhoaHocId,
        lesson.ChuongHocId,
        lesson.TieuDe,
        lesson.NoiDung,
        lesson.IllustrationUrl,
        lesson.VideoUrl,
        lesson.FileUrl,
        lesson.ThoiLuongGiay ?? 0,
        lesson.TrangThai,
        lesson.DaXuatBan,
        lesson.ChoXemTruoc,
        lesson.ThuTu);

    private static TeacherAssignmentDto ToAssignmentDto(BaiTap assignment) => new(
        assignment.Id,
        assignment.KhoaHocId,
        assignment.BaiHocId,
        assignment.TieuDe,
        assignment.MoTa,
        assignment.HanNop,
        assignment.DiemToiDa,
        assignment.FileDinhKemUrl,
        assignment.ChoPhepNopText,
        assignment.ChoPhepNopFile,
        assignment.NgayTao,
        assignment.NgayCapNhat,
        assignment.GiangVienId);
}

[Area("Instructor")]
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

[Area("Instructor")]
public class TeacherChapterRequest
{
    public string? Title { get; set; }
    public string? Description { get; set; }
    public int Position { get; set; }
}

[Area("Instructor")]
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

[Area("Instructor")]
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

[Area("Instructor")]
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
