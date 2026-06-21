using LMS.Api.DTOs.YeuCau;
using LMS.Api.DTOs.PhanHoi;
using LMS.Api.Domain.Entities;
using LMS.Api.Infrastructure.Persistence;
using LMS.Api.Application.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace LMS.Api.Controllers;

/// <summary>Controller bình luận — danh sách và gửi bình luận trong bài giảng</summary>
[ApiController]
[Authorize]
public class BinhLuanController(ApplicationDbContext db) : ControllerBase
{
    /// <summary>Danh sách bình luận của bài giảng</summary>
    [HttpGet("/api/courses/{courseId}/lessons/{lessonId}/comments")]
    public async Task<IResult> DanhSachBinhLuan(string courseId, string lessonId)
    {
        var userId = TroGiup.LayUserId(User);
        if (!await KiemTraQuyenTruyCap(userId, courseId))
            return Results.Json(new { message = "Bạn không có quyền truy cập bài học này" }, statusCode: 403);

        var ds = await db.BinhLuan.AsNoTracking()
            .Where(bl => bl.BaiHocId == lessonId && bl.BinhLuanChaId == null)
            .Include(bl => bl.NguoiDung)
            .Include(bl => bl.CacPhanHoi.OrderBy(r => r.NgayTao)).ThenInclude(r => r.NguoiDung)
            .OrderByDescending(bl => bl.NgayTao).ToListAsync();

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
        var bl = new BinhLuan
        {
            Id = TaoId.Moi(), NoiDung = yeuCau.Content.Trim(), BaiHocId = lessonId, NguoiDungId = userId,
            BinhLuanChaId = string.IsNullOrWhiteSpace(yeuCau.ParentId) ? null : yeuCau.ParentId,
            NgayTao = now, NgayCapNhat = now
        };
        db.BinhLuan.Add(bl);

        var course = await db.KhoaHoc.AsNoTracking().FirstOrDefaultAsync(c => c.Id == courseId);
        if (course is not null && course.GiangVienId != userId)
        {
            var studentName = await db.NguoiDung.AsNoTracking()
                .Where(user => user.Id == userId)
                .Select(user => user.Ten)
                .FirstOrDefaultAsync() ?? "Một học viên";
            db.ThongBao.Add(new ThongBao
            {
                Id = TaoId.Moi(),
                NguoiDungId = course.GiangVienId,
                LoaiThongBao = "INSTRUCTOR_COURSE_COMMENT",
                TieuDe = "Khóa học có bình luận mới",
                NoiDung = $"{studentName} vừa bình luận trong khóa học {course.TieuDe}.",
                DuongDan = $"/course/{courseId}",
                Metadata = System.Text.Json.JsonSerializer.Serialize(new { courseId, lessonId, commentId = bl.Id, studentId = userId }),
                NgayTao = now
            });
        }

        await db.SaveChangesAsync();

        var daLuu = await db.BinhLuan.AsNoTracking().Include(c => c.NguoiDung).Include(c => c.CacPhanHoi).FirstAsync(c => c.Id == bl.Id);
        return Results.Created($"/api/courses/{courseId}/lessons/{lessonId}/comments/{bl.Id}", BinhLuanDto.TuBinhLuan(daLuu));
    }

    private async Task<bool> KiemTraQuyenTruyCap(string? userId, string khoaHocId)
    {
        if (userId is null) return false;
        if (LaXemThuSinhVien())
            return await db.KhoaHoc.AnyAsync(c => c.Id == khoaHocId && c.DaXuatBan && c.GiangVienId == userId);
        return await db.GhiDanh.AnyAsync(e => e.NguoiDungId == userId && e.KhoaHocId == khoaHocId) ||
               await db.KhoaHoc.AnyAsync(c => c.Id == khoaHocId && c.GiangVienId == userId);
    }

    private bool LaXemThuSinhVien() =>
        Request.Headers["X-Student-Preview"] == "true" && (User.IsInRole("INSTRUCTOR") || User.IsInRole("ADMIN"));
}
