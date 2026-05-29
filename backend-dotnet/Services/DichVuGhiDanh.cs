using LMS.Api.Data;
using LMS.Api.DTOs.PhanHoi;
using LMS.Api.Models;
using Microsoft.EntityFrameworkCore;

namespace LMS.Api.Services;

/// <summary>
/// Dịch vụ ghi danh — đăng ký khóa học, cập nhật tiến độ, hoàn thành bài học.
/// </summary>
public interface IDichVuGhiDanh
{
    Task<IResult> GhiDanhAsync(string khoaHocId, string userId);
    Task<IResult> CapNhatTienDoAsync(string userId, string khoaHocId, string baiHocId, int? giayDaXem, int? viTriCuoi, int? tongGiay, bool? hoanThanh);
    Task<IResult> HoanThanhBaiHocAsync(string userId, string khoaHocId, string baiHocId);
    Task<IResult> HoanThanhBaiHocTheoBaiAsync(string userId, string baiHocId);
    Task<object> LayKhoaHocDaGhiDanhAsync(string userId);
}

public class DichVuGhiDanh(LmsDbContext db) : IDichVuGhiDanh
{
    public async Task<IResult> GhiDanhAsync(string khoaHocId, string userId)
    {
        var khoaHoc = await db.Courses.FirstOrDefaultAsync(c => c.Id == khoaHocId && c.IsPublished);
        if (khoaHoc is null) return Results.NotFound(new { message = "Không tìm thấy khóa học" });
        if (khoaHoc.Price > 0) return Results.BadRequest(new { message = "Khóa học có phí, vui lòng thanh toán bằng ví." });
        if (await db.Enrollments.AnyAsync(e => e.UserId == userId && e.CourseId == khoaHocId))
            return Results.BadRequest(new { message = "Bạn đã đăng ký khóa học này" });

        db.Enrollments.Add(new GhiDanh { Id = TaoId.Moi(), UserId = userId, CourseId = khoaHocId, Progress = 0, CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow });
        await db.SaveChangesAsync();
        return Results.Ok(new { message = "Đăng ký khóa học thành công" });
    }

    public async Task<IResult> HoanThanhBaiHocAsync(string userId, string khoaHocId, string baiHocId)
        => await CapNhatTienDoAsync(userId, khoaHocId, baiHocId, null, null, null, true);

    public async Task<IResult> HoanThanhBaiHocTheoBaiAsync(string userId, string baiHocId)
    {
        var baiHoc = await db.Lessons.AsNoTracking().FirstOrDefaultAsync(lesson => lesson.Id == baiHocId);
        if (baiHoc is null) return Results.NotFound(new { message = "Không tìm thấy bài học" });
        return await CapNhatTienDoAsync(userId, baiHoc.CourseId, baiHocId, null, null, null, true);
    }

    public async Task<IResult> CapNhatTienDoAsync(string userId, string khoaHocId, string baiHocId, int? giayDaXem, int? viTriCuoi, int? tongGiay, bool? hoanThanh)
    {
        var ghiDanh = await db.Enrollments.FirstOrDefaultAsync(e => e.UserId == userId && e.CourseId == khoaHocId);
        if (ghiDanh is null) return Results.Json(new { message = "Bạn chưa đăng ký khóa học này" }, statusCode: 403);

        var baiHoc = await db.Lessons.AsNoTracking().FirstOrDefaultAsync(l => l.Id == baiHocId && l.CourseId == khoaHocId);
        if (baiHoc is null) return Results.NotFound(new { message = "Không tìm thấy bài học" });

        var now = DateTime.UtcNow;
        var tongThoiGian = Math.Max(1, tongGiay ?? baiHoc.DurationSeconds ?? 0);
        var daXem = Math.Max(0, giayDaXem ?? baiHoc.DurationSeconds ?? tongThoiGian);
        var viTri = Math.Max(0, viTriCuoi ?? daXem);
        var tiLe = Math.Clamp((daXem / (double)tongThoiGian) * 100, 0, 100);
        var canHoanThanh = hoanThanh == true || tiLe >= 90;

        var tienDo = await db.LessonProgresses.FirstOrDefaultAsync(p => p.UserId == userId && p.LessonId == baiHocId);
        if (tienDo is null)
        {
            tienDo = new TienDoBaiHoc { Id = TaoId.Moi(), UserId = userId, LessonId = baiHocId, CreatedAt = now };
            db.LessonProgresses.Add(tienDo);
        }

        var daHoanThanhTruocDo = tienDo.IsCompleted;

        tienDo.WatchedSeconds = Math.Max(tienDo.WatchedSeconds, daXem);
        tienDo.LastPositionSeconds = viTri;
        tienDo.CompletionRate = Math.Max(tienDo.CompletionRate, tiLe);
        if (canHoanThanh && !tienDo.IsCompleted) { tienDo.IsCompleted = true; tienDo.CompletedAt = now; }
        tienDo.UpdatedAt = now;
        await db.SaveChangesAsync();

        // Cập nhật tiến độ khóa học
        var tongBai = await db.Lessons.CountAsync(l => l.CourseId == khoaHocId);
        var baiXong = await db.LessonProgresses.CountAsync(p => p.UserId == userId && p.IsCompleted && p.Lesson != null && p.Lesson.CourseId == khoaHocId);
        var phanTramKhoaHoc = tongBai == 0 ? 0 : Math.Round((baiXong / (double)tongBai) * 100);

        ghiDanh.Progress = phanTramKhoaHoc;
        ghiDanh.CompletedAt = tongBai > 0 && baiXong >= tongBai ? now : ghiDanh.CompletedAt;
        ghiDanh.UpdatedAt = now;
        await db.SaveChangesAsync();

        var diemNhanDuoc = canHoanThanh && !daHoanThanhTruocDo && tienDo.IsCompleted ? 5 : 0;

        return Results.Ok(new
        {
            message = canHoanThanh ? "Đã lưu tiến độ" : "Đã cập nhật tiến độ bài học",
            lessonId = baiHocId,
            courseProgress = phanTramKhoaHoc,
            earnedPoints = diemNhanDuoc,
            progress = phanTramKhoaHoc,
            completedCount = baiXong,
            totalLessons = tongBai,
            lessonProgress = new { tienDo.Id, tienDo.IsCompleted, tienDo.WatchedSeconds, tienDo.LastPositionSeconds, tienDo.CompletionRate, tienDo.CompletedAt },
            certificate = (object?)null
        });
    }

    public async Task<object> LayKhoaHocDaGhiDanhAsync(string userId)
    {
        return await db.Enrollments.AsNoTracking()
            .Where(e => e.UserId == userId).Include(e => e.Course)
            .OrderByDescending(e => e.CreatedAt)
            .Select(e => new { e.Id, e.Progress, e.CompletedAt, e.CreatedAt, course = e.Course == null ? null : KhoaHocDto.TuKhoaHoc(e.Course) })
            .ToListAsync();
    }
}
