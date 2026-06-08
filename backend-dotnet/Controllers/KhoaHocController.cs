using LMS.Api.Data;
using LMS.Api.DTOs.YeuCau;
using LMS.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace LMS.Api.Controllers;

/// <summary>Controller khóa học — danh sách, chi tiết, đánh giá</summary>
[ApiController]
public class KhoaHocController(IDichVuKhoaHoc dichVu, LmsDbContext db) : ControllerBase
{
    /// <summary>Danh sách khóa học công khai</summary>
    [HttpGet("/api/courses")]
    [HttpGet("/api/courses/published")]
    public async Task<IResult> DanhSach(
        int page = 1,
        int pageSize = 20,
        bool paginate = false,
        string? q = null,
        string? category = null,
        string? sort = null,
        string? price = null,
        string? tier = null)
        => Results.Ok(await dichVu.LayDanhSachAsync(page, pageSize, paginate, q, category, sort, price, tier));

    [Authorize]
    [HttpGet("/api/student/courses")]
    public async Task<IResult> DanhSachChoSinhVien(
        int page = 1,
        int pageSize = 20,
        bool paginate = false,
        string? q = null,
        string? category = null,
        string? sort = null,
        string? price = null,
        string? tier = null)
    {
        var userId = TroGiup.LayUserId(User);
        if (userId is null) return Results.Unauthorized();

        return Results.Ok(await dichVu.LayDanhSachAsync(
            page, pageSize, paginate, q, category, sort, price, tier, userId));
    }

    [HttpGet("/api/courses/trending-categories")]
    public async Task<IResult> DanhMucThinhHanh(int limit = 5)
    {
        limit = Math.Clamp(limit, 1, 20);

        var danhMuc = await db.Purchases
            .AsNoTracking()
            .Where(mua =>
                mua.Status == "COMPLETED" &&
                mua.Course != null &&
                mua.Course.IsPublished &&
                mua.Course.Category != "")
            .GroupBy(mua => mua.Course!.Category.Trim())
            .Select(nhom => new
            {
                category = nhom.Key,
                purchaseCount = nhom.Count(),
                courseCount = nhom.Select(mua => mua.CourseId).Distinct().Count()
            })
            .OrderByDescending(item => item.purchaseCount)
            .ThenBy(item => item.category)
            .Take(limit)
            .ToListAsync();

        return Results.Ok(danhMuc);
    }

    [Authorize]
    [HttpGet("/api/student/courses/recommended")]
    public async Task<IResult> KhoaHocDeXuat(int limit = 3)
    {
        var userId = TroGiup.LayUserId(User);
        if (userId is null) return Results.Unauthorized();

        limit = Math.Clamp(limit, 1, 20);

        var danhMucDaMua = db.Purchases
            .AsNoTracking()
            .Where(mua => mua.UserId == userId && mua.Status == "COMPLETED" && mua.Course != null)
            .Select(mua => mua.Course!.Category);

        var khoaHoc = await db.Courses
            .AsNoTracking()
            .Where(kh =>
                kh.IsPublished &&
                danhMucDaMua.Contains(kh.Category) &&
                !kh.Purchases.Any(mua => mua.UserId == userId && mua.Status == "COMPLETED") &&
                !kh.Enrollments.Any(ghiDanh => ghiDanh.UserId == userId))
            .Select(kh => new
            {
                id = kh.Id,
                title = kh.Title,
                thumbnail = kh.Thumbnail,
                category = kh.Category,
                instructorName = kh.Instructor != null ? kh.Instructor.Name : "Giảng viên",
                lessonCount = kh.Lessons.Count,
                averageRating = kh.AverageRating,
                purchaseCount = kh.Purchases.Count(mua => mua.Status == "COMPLETED")
            })
            .OrderByDescending(kh => kh.purchaseCount)
            .ThenByDescending(kh => kh.averageRating)
            .ThenBy(kh => kh.title)
            .Take(limit)
            .ToListAsync();

        return Results.Ok(khoaHoc);
    }

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
