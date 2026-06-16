using LMS.Api.Data;
using LMS.Api.Models;
using LMS.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace LMS.Api.Controllers;

/// <summary>Quản lý giỏ hàng / khóa học đã lưu từ trang Khám phá</summary>
[ApiController]
[Authorize]
public class GioHangController(LmsDbContext db) : ControllerBase
{
    /// <summary>Lấy danh sách khóa học đã lưu của người dùng</summary>
    [HttpGet("/api/user/saved-courses")]
    public async Task<IResult> DanhSachDaLuu()
    {
        var userId = TroGiup.LayUserId(User);
        if (userId is null) return Results.Unauthorized();

        var ds = await db.SavedCourses
            .AsNoTracking()
            .Where(s => s.UserId == userId)
            .Include(s => s.Course)
                .ThenInclude(c => c!.Instructor)
            .OrderByDescending(s => s.CreatedAt)
            .ToListAsync();

        var ketQua = ds.Select(s => new
        {
            id = s.Id,
            courseId = s.CourseId,
            savedAt = s.CreatedAt,
            course = s.Course == null ? null : new
            {
                id = s.Course.Id,
                title = s.Course.Title,
                thumbnail = s.Course.Thumbnail,
                price = s.Course.Price,
                category = s.Course.Category,
                averageRating = s.Course.AverageRating,
                reviewCount = s.Course.ReviewCount,
                instructorName = s.Course.Instructor?.Name ?? "Giảng viên",
                lessonCount = s.Course.Lessons?.Count ?? 0,
                isPublished = s.Course.IsPublished
            }
        });

        return Results.Ok(ketQua);
    }

    /// <summary>Lưu một khóa học vào giỏ hàng</summary>
    [HttpPost("/api/user/saved-courses")]
    public async Task<IResult> LuuKhoaHoc([FromBody] LuuKhoaHocRequest yeuCau)
    {
        var userId = TroGiup.LayUserId(User);
        if (userId is null) return Results.Unauthorized();

        if (string.IsNullOrWhiteSpace(yeuCau.CourseId))
            return Results.BadRequest(new { message = "courseId không được để trống" });

        // Kiểm tra khóa học tồn tại và đã public
        var khoaHoc = await db.Courses
            .AsNoTracking()
            .FirstOrDefaultAsync(c => c.Id == yeuCau.CourseId && c.IsPublished);

        if (khoaHoc is null)
            return Results.NotFound(new { message = "Không tìm thấy khóa học" });

        // Kiểm tra đã lưu chưa
        var daLuu = await db.SavedCourses
            .AnyAsync(s => s.UserId == userId && s.CourseId == yeuCau.CourseId);

        if (daLuu)
            return Results.Conflict(new { message = "Khóa học đã được lưu" });

        var mucDaLuu = new KhoaHocDaLuu
        {
            Id = TaoId.Moi(),
            UserId = userId,
            CourseId = yeuCau.CourseId,
            CreatedAt = DateTime.UtcNow
        };

        db.SavedCourses.Add(mucDaLuu);
        await db.SaveChangesAsync();

        return Results.Created($"/api/user/saved-courses/{yeuCau.CourseId}", new
        {
            id = mucDaLuu.Id,
            courseId = mucDaLuu.CourseId,
            savedAt = mucDaLuu.CreatedAt
        });
    }

    /// <summary>Xóa khóa học khỏi giỏ hàng</summary>
    [HttpDelete("/api/user/saved-courses/{courseId}")]
    public async Task<IResult> XoaKhoiGio(string courseId)
    {
        var userId = TroGiup.LayUserId(User);
        if (userId is null) return Results.Unauthorized();

        var mucDaLuu = await db.SavedCourses
            .FirstOrDefaultAsync(s => s.UserId == userId && s.CourseId == courseId);

        if (mucDaLuu is null)
            return Results.NotFound(new { message = "Không tìm thấy mục đã lưu" });

        db.SavedCourses.Remove(mucDaLuu);
        await db.SaveChangesAsync();

        return Results.Ok(new { message = "Đã xóa khỏi danh sách đã lưu" });
    }

    /// <summary>Kiểm tra một khóa học có được lưu chưa</summary>
    [HttpGet("/api/user/saved-courses/{courseId}/check")]
    public async Task<IResult> KiemTraDaLuu(string courseId)
    {
        var userId = TroGiup.LayUserId(User);
        if (userId is null) return Results.Unauthorized();

        var daLuu = await db.SavedCourses
            .AnyAsync(s => s.UserId == userId && s.CourseId == courseId);

        return Results.Ok(new { saved = daLuu });
    }
}

public class LuuKhoaHocRequest
{
    public string? CourseId { get; set; }
}
