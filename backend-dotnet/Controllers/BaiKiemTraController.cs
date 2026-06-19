using System.Security.Claims;
using LMS.Api.DTOs.YeuCau;
using LMS.Api.Application.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace LMS.Api.Controllers;

/// <summary>Controller bài kiểm tra — CRUD quiz, nộp bài</summary>
[ApiController]
[Authorize]
public class BaiKiemTraController(IDichVuBaiKiemTra dichVu) : ControllerBase
{
    /// <summary>Lấy bài kiểm tra theo bài học</summary>
    [HttpGet("/api/quizzes/lesson/{lessonId}")]
    public async Task<IResult> LayBaiKiemTra(string lessonId)
    {
        var userId = TroGiup.LayUserId(User);
        if (userId is null) return Results.Unauthorized();
        return await dichVu.LayBaiKiemTraAsync(lessonId, userId, User.FindFirstValue(ClaimTypes.Role) == "ADMIN");
    }

    /// <summary>Tạo/cập nhật bài kiểm tra</summary>
    [HttpPost("/api/quizzes/lesson/{lessonId}")]
    public async Task<IResult> LuuBaiKiemTra(string lessonId, [FromBody] LuuBaiKiemTraRequest yeuCau)
    {
        var userId = TroGiup.LayUserId(User);
        if (userId is null) return Results.Unauthorized();
        return await dichVu.LuuBaiKiemTraAsync(lessonId, userId, User.FindFirstValue(ClaimTypes.Role) == "ADMIN",
            yeuCau.Title ?? "", yeuCau.Description, yeuCau.PassingScore, yeuCau.Questions ?? []);
    }

    /// <summary>Nộp bài kiểm tra</summary>
    [HttpPost("/api/quizzes/lesson/{lessonId}/submit")]
    public async Task<IResult> NopBai(string lessonId, [FromBody] NopBaiRequest yeuCau)
    {
        var userId = TroGiup.LayUserId(User);
        if (userId is null) return Results.Unauthorized();
        return await dichVu.NopBaiAsync(lessonId, userId, yeuCau.Answers);
    }

    /// <summary>Xóa bài kiểm tra</summary>
    [HttpDelete("/api/quizzes/{id}")]
    public async Task<IResult> XoaBaiKiemTra(string id)
    {
        var userId = TroGiup.LayUserId(User);
        if (userId is null) return Results.Unauthorized();
        return await dichVu.XoaBaiKiemTraAsync(id, userId, User.FindFirstValue(ClaimTypes.Role) == "ADMIN");
    }
}
