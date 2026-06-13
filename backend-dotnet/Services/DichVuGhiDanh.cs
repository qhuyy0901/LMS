using LMS.Api.Data;
using LMS.Api.DTOs.PhanHoi;
using LMS.Api.Models;
using Microsoft.EntityFrameworkCore;
using System.Text.Json;

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
    Task<object?> KiemTraVaCapChungChiAsync(string userId, string khoaHocId);
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
        var duration = baiHoc.DurationSeconds ?? 0;
        var tongThoiGian = duration > 0 ? duration : Math.Max(1, tongGiay ?? 0);

        var tienDo = await db.LessonProgresses.FirstOrDefaultAsync(p => p.UserId == userId && p.LessonId == baiHocId);
        
        // 1. Kiểm soát giá trị giayDaXem được gửi lên: không cho phép vượt quá tổng thời lượng bài học
        var daXemGuiLen = giayDaXem ?? tongThoiGian;
        var daXemChuan = Math.Clamp(daXemGuiLen, 0, tongThoiGian);

        // 2. Chống tăng tiến độ phi thực tế (Ví dụ: nhảy vọt xem từ 0 giây lên 1000 giây chỉ trong 10 giây)
        if (tienDo is not null && duration > 0)
        {
            var thoiGianTroiQua = (now - tienDo.UpdatedAt).TotalSeconds;
            var soGiayTangThem = daXemChuan - tienDo.WatchedSeconds;
            
            // Cho phép sai số nhỏ do mạng và buffer, tối đa tăng 1.5 lần thời gian trôi qua thực tế
            if (soGiayTangThem > Math.Max(15, thoiGianTroiQua * 1.5))
            {
                daXemChuan = tienDo.WatchedSeconds + (int)Math.Max(10, thoiGianTroiQua);
                daXemChuan = Math.Min(daXemChuan, tongThoiGian);
            }
        }

        var viTri = Math.Clamp(viTriCuoi ?? daXemChuan, 0, tongThoiGian);
        
        if (tienDo is null)
        {
            tienDo = new TienDoBaiHoc { Id = TaoId.Moi(), UserId = userId, LessonId = baiHocId, CreatedAt = now };
            db.LessonProgresses.Add(tienDo);
        }

        var daXemMax = Math.Max(tienDo.WatchedSeconds, daXemChuan);
        var tiLe = Math.Clamp((daXemMax / (double)tongThoiGian) * 100, 0, 100);

        // 3. Quyết định hoàn thành dựa trên tỷ lệ xem thực tế đạt từ 90% trở lên (Không tin cờ hoanThanh của client gửi trực tiếp nữa)
        var canHoanThanh = tiLe >= 90;
        var daHoanThanhTruocDo = tienDo.IsCompleted;

        tienDo.WatchedSeconds = daXemMax;
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

        var diemNhanDuoc = 0;
        if (canHoanThanh && !daHoanThanhTruocDo && tienDo.IsCompleted)
        {
            var nguoiDung = await db.Users.FirstOrDefaultAsync(u => u.Id == userId);
            var homNay = TroGiup.LayNgayDiaPhuong();
            if (nguoiDung is not null && nguoiDung.LastLessonRewardDate?.Date != homNay)
            {
                diemNhanDuoc = Math.Min(5, 100 - nguoiDung.RewardPoints);
                nguoiDung.RewardPoints += diemNhanDuoc;
                nguoiDung.LastLessonRewardDate = homNay;
                nguoiDung.UpdatedAt = now;
                await db.SaveChangesAsync();
            }
        }
        var chungChi = await KiemTraVaCapChungChiAsync(userId, khoaHocId);

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
            certificate = chungChi
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

    public async Task<object?> KiemTraVaCapChungChiAsync(string userId, string khoaHocId)
    {
        var ghiDanh = await db.Enrollments.FirstOrDefaultAsync(e => e.UserId == userId && e.CourseId == khoaHocId);
        if (ghiDanh is null || ghiDanh.Progress < 80) return null;

        var quizzes = await db.Quizzes.AsNoTracking()
            .Include(q => q.Questions)
            .Include(q => q.Lesson)
            .Where(q => q.Lesson != null && q.Lesson.CourseId == khoaHocId && q.Lesson.IsPublished)
            .ToListAsync();

        var quizIds = quizzes.Select(q => q.Id).ToList();
        var submissions = await db.QuizSubmissions.AsNoTracking()
            .Where(s => s.UserId == userId && quizIds.Contains(s.QuizId))
            .ToListAsync();

        var tongCauHoi = quizzes.Sum(q => q.Questions.Count);
        double? diemQuizToanKhoa = null;
        if (tongCauHoi > 0 && submissions.Count > 0)
        {
            var tongCauDungUocTinh = quizzes.Sum(q =>
            {
                var diemTotNhat = submissions
                    .Where(s => s.QuizId == q.Id)
                    .Select(s => s.Score)
                    .DefaultIfEmpty(0)
                    .Max();
                return (diemTotNhat / 100.0) * q.Questions.Count;
            });
            diemQuizToanKhoa = Math.Round((tongCauDungUocTinh / tongCauHoi) * 100, 2);
        }

        var chungChiDaCo = await db.Certificates.AsNoTracking()
            .FirstOrDefaultAsync(c => c.UserId == userId && c.CourseId == khoaHocId);
        if (chungChiDaCo is not null)
        {
            return new { chungChiDaCo.Id, chungChiDaCo.CertificateNo, chungChiDaCo.VerifyCode, chungChiDaCo.IssuedAt, quizScore = diemQuizToanKhoa, progress = ghiDanh.Progress };
        }

        var now = DateTime.UtcNow;
        var chungChi = new ChungChi
        {
            Id = TaoId.Moi(),
            CertificateNo = $"SKL-{now:yyyyMMdd}-{TaoId.Moi()[..8].ToUpperInvariant()}",
            VerifyCode = TaoId.Moi(),
            UserId = userId,
            CourseId = khoaHocId,
            IssuedAt = now,
            CompletionSnapshot = JsonSerializer.Serialize(new
            {
                progress = ghiDanh.Progress,
                quizScore = diemQuizToanKhoa,
                totalQuizzes = quizzes.Count,
                totalQuestions = tongCauHoi
            })
        };

        db.Certificates.Add(chungChi);
        ghiDanh.CompletedAt ??= now;
        ghiDanh.UpdatedAt = now;
        await db.SaveChangesAsync();

        return new { chungChi.Id, chungChi.CertificateNo, chungChi.VerifyCode, chungChi.IssuedAt, quizScore = diemQuizToanKhoa, progress = ghiDanh.Progress };
    }
}
