using LMS.Api.DTOs.YeuCau;
using LMS.Api.DTOs.PhanHoi;
using LMS.Api.Data;
using LMS.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace LMS.Api.Controllers;

/// <summary>Controller bình luận — danh sách và gửi bình luận trong bài giảng</summary>
[ApiController]
[Authorize]
public class BinhLuanController(LmsDbContext db) : ControllerBase
{
    /// <summary>Danh sách bình luận của bài giảng</summary>
    [HttpGet("/api/courses/{courseId}/lessons/{lessonId}/comments")]
    public async Task<IResult> DanhSachBinhLuan(string courseId, string lessonId)
    {
        var userId = TroGiup.LayUserId(User);
        if (!await KiemTraQuyenTruyCap(userId, courseId))
            return Results.Json(new { message = "Bạn không có quyền truy cập bài học này" }, statusCode: 403);

        var ds = await db.Comments.AsNoTracking()
            .Where(bl => bl.LessonId == lessonId && bl.ParentId == null)
            .Include(bl => bl.User)
            .Include(bl => bl.Replies.OrderBy(r => r.CreatedAt)).ThenInclude(r => r.User)
            .OrderByDescending(bl => bl.CreatedAt).ToListAsync();

        return Results.Ok(ds.Select(BinhLuanDto.TuBinhLuan));
    }

    /// <summary>Gửi bình luận mới</summary>
    [HttpPost("/api/courses/{courseId}/lessons/{lessonId}/comments")]
    public async Task<IResult> GuiBinhLuan(string courseId, string lessonId, [FromBody] BinhLuanRequest yeuCau)
    {
        if (LaXemThuSinhVien()) return Results.BadRequest(new { message = "Chế độ xem thử không thể gửi bình luận." });
        var userId = TroGiup.LayUserId(User);
        if (userId is null) return Results.Unauthorized();
        if (!await KiemTraQuyenTruyCap(userId, courseId))
            return Results.Json(new { message = "Bạn không có quyền truy cập bài học này" }, statusCode: 403);
        if (string.IsNullOrWhiteSpace(yeuCau.Content))
            return Results.BadRequest(new { message = "Nội dung bình luận không được để trống" });

        var now = DateTime.UtcNow;
        var bl = new Models.BinhLuan
        {
            Id = TaoId.Moi(), Content = yeuCau.Content.Trim(), LessonId = lessonId, UserId = userId,
            ParentId = string.IsNullOrWhiteSpace(yeuCau.ParentId) ? null : yeuCau.ParentId,
            CreatedAt = now, UpdatedAt = now
        };
        db.Comments.Add(bl);

        var course = await db.Courses.AsNoTracking().FirstOrDefaultAsync(c => c.Id == courseId);
        if (course is not null && course.InstructorId != userId)
        {
            var studentName = await db.Users.AsNoTracking()
                .Where(user => user.Id == userId)
                .Select(user => user.Name)
                .FirstOrDefaultAsync() ?? "Một học viên";
            db.Notifications.Add(new Models.ThongBao
            {
                Id = TaoId.Moi(),
                UserId = course.InstructorId,
                Type = "INSTRUCTOR_COURSE_COMMENT",
                Title = "Khóa học có bình luận mới",
                Body = $"{studentName} vừa bình luận trong khóa học {course.Title}.",
                Link = $"/course/{courseId}",
                Metadata = System.Text.Json.JsonSerializer.Serialize(new { courseId, lessonId, commentId = bl.Id, studentId = userId }),
                CreatedAt = now
            });
        }

        await db.SaveChangesAsync();

        var daLuu = await db.Comments.AsNoTracking().Include(c => c.User).Include(c => c.Replies).FirstAsync(c => c.Id == bl.Id);
        return Results.Created($"/api/courses/{courseId}/lessons/{lessonId}/comments/{bl.Id}", BinhLuanDto.TuBinhLuan(daLuu));
    }

    private async Task<bool> KiemTraQuyenTruyCap(string? userId, string khoaHocId)
    {
        if (userId is null) return false;
        if (LaXemThuSinhVien())
            return await db.Courses.AnyAsync(c => c.Id == khoaHocId && c.IsPublished && c.InstructorId == userId);
        return await db.Enrollments.AnyAsync(e => e.UserId == userId && e.CourseId == khoaHocId) ||
               await db.Courses.AnyAsync(c => c.Id == khoaHocId && c.InstructorId == userId);
    }

    private bool LaXemThuSinhVien() =>
        Request.Headers["X-Student-Preview"] == "true" && (User.IsInRole("INSTRUCTOR") || User.IsInRole("ADMIN"));
}
