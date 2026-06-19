using LMS.Api.DTOs.YeuCau;
using LMS.Api.Infrastructure.Persistence;
using LMS.Api.DTOs.PhanHoi;
using LMS.Api.Application.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace LMS.Api.Areas.Student.Controllers;

/// <summary>Controller ghi danh — đăng ký khóa học, tiến độ, hoàn thành</summary>
[ApiController]
[Authorize]
[Area("Student")]
public class GhiDanhController(IDichVuGhiDanh dichVu, ApplicationDbContext db) : ControllerBase
{
    /// <summary>Danh sách khóa học đã ghi danh</summary>
    [HttpGet("/api/courses/enrolled")]
    public async Task<IResult> DanhSachDaGhiDanh()
    {
        var userId = TroGiup.LayUserId(User);
        if (userId is null) return Results.Unauthorized();
        if (LaXemThuSinhVien())
        {
            var courses = await db.Courses.AsNoTracking()
                .Where(course => course.InstructorId == userId && course.IsPublished)
                .Include(course => course.Instructor)
                .Include(course => course.Sections)
                .Include(course => course.Lessons)
                .Include(course => course.Enrollments)
                .OrderByDescending(course => course.UpdatedAt)
                .ToListAsync();
            return Results.Ok(courses.Select(course => new
            {
                id = $"student-preview-{course.Id}",
                progress = 0,
                completedAt = (DateTime?)null,
                createdAt = course.PublishedAt ?? course.CreatedAt,
                course = KhoaHocDto.TuKhoaHoc(course)
            }));
        }
        return Results.Ok(await dichVu.LayKhoaHocDaGhiDanhAsync(userId));
    }

    /// <summary>Ghi danh khóa học miễn phí</summary>
    [HttpPost("/api/courses/{id}/enroll")]
    [HttpPost("/api/student/courses/{id}/enroll")]
    public async Task<IResult> GhiDanh(string id)
    {
        if (LaXemThuSinhVien()) return Results.BadRequest(new { message = "Chế độ xem thử không thể đăng ký khóa học." });
        var userId = TroGiup.LayUserId(User);
        if (userId is null) return Results.Unauthorized();
        return await dichVu.GhiDanhAsync(id, userId);
    }

    /// <summary>Hoàn thành bài học</summary>
    [HttpPost("/api/courses/{courseId}/lessons/{lessonId}/complete")]
    public async Task<IResult> HoanThanhBaiHoc(string courseId, string lessonId)
    {
        if (LaXemThuSinhVien()) return Results.BadRequest(new { message = "Chế độ xem thử không lưu tiến độ học tập." });
        var userId = TroGiup.LayUserId(User);
        if (userId is null) return Results.Unauthorized();
        return await dichVu.HoanThanhBaiHocAsync(userId, courseId, lessonId);
    }

    [HttpPost("/api/student/lessons/{lessonId}/complete")]
    public async Task<IResult> HoanThanhBaiHocSinhVien(string lessonId)
    {
        if (LaXemThuSinhVien()) return Results.BadRequest(new { message = "Chế độ xem thử không lưu tiến độ học tập." });
        var userId = TroGiup.LayUserId(User);
        if (userId is null) return Results.Unauthorized();
        return await dichVu.HoanThanhBaiHocTheoBaiAsync(userId, lessonId);
    }

    private bool LaXemThuSinhVien() =>
        Request.Headers["X-Student-Preview"] == "true" && (User.IsInRole("INSTRUCTOR") || User.IsInRole("ADMIN"));

    /// <summary>Cập nhật tiến độ xem bài học</summary>
    [HttpPost("/api/courses/{courseId}/lessons/{lessonId}/progress")]
    public async Task<IResult> CapNhatTienDo(string courseId, string lessonId, [FromBody] TienDoRequest yeuCau)
    {
        if (LaXemThuSinhVien()) return Results.BadRequest(new { message = "Chế độ xem thử không lưu tiến độ học tập." });
        var userId = TroGiup.LayUserId(User);
        if (userId is null) return Results.Unauthorized();
        return await dichVu.CapNhatTienDoAsync(userId, courseId, lessonId, yeuCau.WatchedSeconds, yeuCau.LastPositionSeconds, yeuCau.DurationSeconds, yeuCau.MarkCompleted);
    }
}
