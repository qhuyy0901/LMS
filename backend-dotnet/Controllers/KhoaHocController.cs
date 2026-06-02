using LMS.Api.DTOs.YeuCau;
using LMS.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace LMS.Api.Controllers;

/// <summary>Controller khóa học — danh sách, chi tiết, đánh giá</summary>
[ApiController]
public class KhoaHocController(IDichVuKhoaHoc dichVu) : ControllerBase
{
    /// <summary>Danh sách khóa học công khai</summary>
    [HttpGet("/api/courses")]
    [HttpGet("/api/courses/published")]
    [HttpGet("/api/student/courses")]
    public async Task<IResult> DanhSach(int page = 1, int pageSize = 20, bool paginate = false)
        => Results.Ok(await dichVu.LayDanhSachAsync(page, pageSize, paginate));

    [HttpGet("/api/explore/insights")]
    public async Task<IResult> DuLieuKhamPha()
        => Results.Ok(await dichVu.LayExploreInsightsAsync());

    /// <summary>Chi tiết một khóa học</summary>
    [HttpGet("/api/courses/{id}")]
    [HttpGet("/api/student/courses/{id}")]
    public async Task<IResult> ChiTiet(string id)
    {
        var kq = await dichVu.LayChiTietAsync(id, User);
        return kq is null ? Results.NotFound(new { message = "Không tìm thấy khóa học" }) : Results.Ok(kq);
    }

    [HttpGet("/api/student/courses/{id}/preview-lessons")]
    public async Task<IResult> BaiHocThu(string id)
    {
        var kq = await dichVu.LayBaiHocThuAsync(id);
        return kq is null ? Results.NotFound(new { message = "Không tìm thấy khóa học" }) : Results.Ok(kq);
    }

    [Authorize]
    [HttpGet("/api/student/courses/{id}/learning")]
    public async Task<IResult> KhoaHocDangHoc(string id)
    {
        var kq = await dichVu.LayKhoaHocDangHocAsync(id, User);
        return kq is null
            ? Results.Json(new { message = "Bạn chưa ghi danh hoặc không có quyền truy cập khóa học này" }, statusCode: 403)
            : Results.Ok(kq);
    }

    [Authorize]
    [HttpGet("/api/student/lessons/{lessonId}")]
    public async Task<IResult> ChiTietBaiHoc(string lessonId)
    {
        var kq = await dichVu.LayChiTietBaiHocAsync(lessonId, User);
        return kq is null ? Results.NotFound(new { message = "Không tìm thấy bài học" }) : Results.Ok(kq);
    }

    /// <summary>Danh sách đánh giá khóa học</summary>
    [HttpGet("/api/courses/{id}/reviews")]
    public async Task<IResult> DanhGia(string id)
    {
        var kq = await dichVu.LayDanhGiaAsync(id);
        return kq is null ? Results.NotFound(new { message = "Không tìm thấy khóa học" }) : Results.Ok(kq);
    }

    /// <summary>Gửi đánh giá khóa học</summary>
    [Authorize]
    [HttpPost("/api/courses/{id}/reviews")]
    public async Task<IResult> GuiDanhGia(string id, [FromBody] DanhGiaRequest yeuCau)
    {
        var userId = TroGiup.LayUserId(User);
        if (userId is null) return Results.Unauthorized();
        return await dichVu.GuiDanhGiaAsync(id, userId, yeuCau.Rating, yeuCau.Comment);
    }

    /// <summary>Xóa đánh giá của mình</summary>
    [Authorize]
    [HttpDelete("/api/courses/{id}/reviews/me")]
    public async Task<IResult> XoaDanhGia(string id)
    {
        var userId = TroGiup.LayUserId(User);
        if (userId is null) return Results.Unauthorized();
        return await dichVu.XoaDanhGiaAsync(id, userId);
    }
}
