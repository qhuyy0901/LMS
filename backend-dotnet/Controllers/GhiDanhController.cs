using LMS.Api.DTOs.YeuCau;
using LMS.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace LMS.Api.Controllers;

/// <summary>Controller ghi danh — đăng ký khóa học, tiến độ, hoàn thành</summary>
[ApiController]
[Authorize]
public class GhiDanhController(IDichVuGhiDanh dichVu) : ControllerBase
{
    /// <summary>Danh sách khóa học đã ghi danh</summary>
    [HttpGet("/api/courses/enrolled")]
    public async Task<IResult> DanhSachDaGhiDanh()
    {
        var userId = TroGiup.LayUserId(User);
        if (userId is null) return Results.Unauthorized();
        return Results.Ok(await dichVu.LayKhoaHocDaGhiDanhAsync(userId));
    }

    /// <summary>Ghi danh khóa học miễn phí</summary>
    [HttpPost("/api/courses/{id}/enroll")]
    [HttpPost("/api/student/courses/{id}/enroll")]
    public async Task<IResult> GhiDanh(string id)
    {
        var userId = TroGiup.LayUserId(User);
        if (userId is null) return Results.Unauthorized();
        return await dichVu.GhiDanhAsync(id, userId);
    }

    /// <summary>Hoàn thành bài học</summary>
    [HttpPost("/api/courses/{courseId}/lessons/{lessonId}/complete")]
    public async Task<IResult> HoanThanhBaiHoc(string courseId, string lessonId)
    {
        var userId = TroGiup.LayUserId(User);
        if (userId is null) return Results.Unauthorized();
        return await dichVu.HoanThanhBaiHocAsync(userId, courseId, lessonId);
    }

    [HttpPost("/api/student/lessons/{lessonId}/complete")]
    public async Task<IResult> HoanThanhBaiHocSinhVien(string lessonId)
    {
        var userId = TroGiup.LayUserId(User);
        if (userId is null) return Results.Unauthorized();
        return await dichVu.HoanThanhBaiHocTheoBaiAsync(userId, lessonId);
    }

    /// <summary>Cập nhật tiến độ xem bài học</summary>
    [HttpPost("/api/courses/{courseId}/lessons/{lessonId}/progress")]
    public async Task<IResult> CapNhatTienDo(string courseId, string lessonId, [FromBody] TienDoRequest yeuCau)
    {
        var userId = TroGiup.LayUserId(User);
        if (userId is null) return Results.Unauthorized();
        return await dichVu.CapNhatTienDoAsync(userId, courseId, lessonId, yeuCau.WatchedSeconds, yeuCau.LastPositionSeconds, yeuCau.DurationSeconds, yeuCau.MarkCompleted);
    }
}
