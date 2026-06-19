using System.Text.Json;
using LMS.Api.Infrastructure.Persistence;
using LMS.Api.DTOs.PhanHoi;
using LMS.Api.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace LMS.Api.Application.Services;

/// <summary>
/// Dịch vụ bài kiểm tra — CRUD quiz, nộp bài, chấm điểm.
/// </summary>
public interface IDichVuBaiKiemTra
{
    Task<IResult> LayBaiKiemTraAsync(string lessonId, string userId, bool laAdmin);
    Task<IResult> LuuBaiKiemTraAsync(string lessonId, string userId, bool laAdmin, string tieuDe, string? moTa, int? diemDat, List<DTOs.YeuCau.CauHoiRequest> cauHoi);
    Task<IResult> NopBaiAsync(string lessonId, string userId, Dictionary<string, int>? cauTraLoi);
    Task<IResult> XoaBaiKiemTraAsync(string quizId, string userId, bool laAdmin);
}

public class DichVuBaiKiemTra(ApplicationDbContext db, IDichVuGhiDanh dichVuGhiDanh) : IDichVuBaiKiemTra
{
    public async Task<IResult> LayBaiKiemTraAsync(string lessonId, string userId, bool laAdmin)
    {
        var baiHoc = await db.Lessons.AsNoTracking().Include(l => l.Course).FirstOrDefaultAsync(l => l.Id == lessonId);
        if (baiHoc is null) return Results.NotFound(new { message = "Không tìm thấy bài học này" });

        if (!await KiemTraQuyenTruyCap(userId, baiHoc.CourseId))
            return Results.Json(new { message = "Bạn không có quyền truy cập bài học này" }, statusCode: 403);

        var quiz = await db.Quizzes.AsNoTracking().Include(q => q.Questions.OrderBy(c => c.Position)).FirstOrDefaultAsync(q => q.LessonId == lessonId);
        if (quiz is null) return Results.Ok(null);

        var baiNop = await db.QuizSubmissions.AsNoTracking().Where(s => s.UserId == userId && s.QuizId == quiz.Id).OrderByDescending(s => s.CreatedAt).Take(5).ToListAsync();
        var laChuSoHuu = baiHoc.Course?.InstructorId == userId || laAdmin;

        return Results.Ok(BaiKiemTraDto.TuQuiz(quiz, baiNop, hienDapAn: laChuSoHuu));
    }

    public async Task<IResult> LuuBaiKiemTraAsync(string lessonId, string userId, bool laAdmin, string tieuDe, string? moTa, int? diemDat, List<DTOs.YeuCau.CauHoiRequest> cauHoi)
    {
        var baiHoc = await db.Lessons.AsNoTracking().Include(l => l.Course).FirstOrDefaultAsync(l => l.Id == lessonId);
        if (baiHoc is null) return Results.NotFound(new { message = "Không tìm thấy bài học này" });
        if (!laAdmin && baiHoc.Course?.InstructorId != userId) return Results.Json(new { message = "Bạn không có quyền quản lý bài trắc nghiệm cho bài học này" }, statusCode: 403);
        if (string.IsNullOrWhiteSpace(tieuDe)) return Results.BadRequest(new { message = "Tiêu đề quiz không được để trống" });
        if (cauHoi.Count == 0) return Results.BadRequest(new { message = "Quiz phải có ít nhất 1 câu hỏi" });

        for (var i = 0; i < cauHoi.Count; i++)
        {
            var ch = cauHoi[i];
            if (string.IsNullOrWhiteSpace(ch.QuestionText) || ch.Options is null || ch.Options.Count < 2)
                return Results.BadRequest(new { message = $"Câu hỏi thứ {i + 1} không đầy đủ nội dung hoặc thiếu lựa chọn" });
            if (ch.CorrectOptionIndex < 0 || ch.CorrectOptionIndex >= ch.Options.Count)
                return Results.BadRequest(new { message = $"Câu hỏi thứ {i + 1} có đáp án đúng không hợp lệ" });
        }

        var now = DateTime.UtcNow;
        var quiz = await db.Quizzes.Include(q => q.Questions).FirstOrDefaultAsync(q => q.LessonId == lessonId);
        if (quiz is null) { quiz = new BaiKiemTra { Id = TaoId.Moi(), LessonId = lessonId, CreatedAt = now }; db.Quizzes.Add(quiz); }

        quiz.Title = tieuDe.Trim();
        quiz.Description = moTa;
        quiz.PassingScore = Math.Clamp(diemDat ?? 50, 1, 100);
        quiz.UpdatedAt = now;

        db.QuizQuestions.RemoveRange(quiz.Questions);
        for (var i = 0; i < cauHoi.Count; i++)
        {
            var ch = cauHoi[i];
            db.QuizQuestions.Add(new CauHoiKiemTra { Id = TaoId.Moi(), QuizId = quiz.Id, QuestionText = ch.QuestionText!.Trim(), Options = JsonSerializer.Serialize(ch.Options), CorrectOptionIndex = ch.CorrectOptionIndex, Explanation = string.IsNullOrWhiteSpace(ch.Explanation) ? null : ch.Explanation.Trim(), Position = i, CreatedAt = now, UpdatedAt = now });
        }

        await db.SaveChangesAsync();

        var daLuu = await db.Quizzes.AsNoTracking().Include(q => q.Questions.OrderBy(c => c.Position)).FirstAsync(q => q.Id == quiz.Id);
        return Results.Ok(BaiKiemTraDto.TuQuiz(daLuu, [], hienDapAn: true));
    }

    public async Task<IResult> NopBaiAsync(string lessonId, string userId, Dictionary<string, int>? cauTraLoi)
    {
        var baiHoc = await db.Lessons.AsNoTracking().FirstOrDefaultAsync(l => l.Id == lessonId);
        if (baiHoc is null) return Results.NotFound(new { message = "Không tìm thấy bài học này" });
        if (!await db.Enrollments.AnyAsync(e => e.UserId == userId && e.CourseId == baiHoc.CourseId))
            return Results.Json(new { message = "Bạn chưa đăng ký khóa học này" }, statusCode: 403);

        var quiz = await db.Quizzes.Include(q => q.Questions.OrderBy(c => c.Position)).FirstOrDefaultAsync(q => q.LessonId == lessonId);
        if (quiz is null) return Results.NotFound(new { message = "Bài học này chưa có bài trắc nghiệm" });

        var dapAn = cauTraLoi ?? new Dictionary<string, int>();
        var tongCauHoi = quiz.Questions.Count;
        var soDung = 0;

        var chiTiet = quiz.Questions.OrderBy(c => c.Position).Select(ch =>
        {
            var daChon = dapAn.TryGetValue(ch.Id, out var idx) ? idx : (int?)null;
            var dung = daChon == ch.CorrectOptionIndex;
            if (dung) soDung += 1;
            List<string> luaChon;
            try { luaChon = JsonSerializer.Deserialize<List<string>>(ch.Options) ?? []; } catch { luaChon = []; }
            return new { questionId = ch.Id, questionText = ch.QuestionText, options = luaChon, selectedIndex = daChon, ch.CorrectOptionIndex, isCorrect = dung, ch.Explanation };
        }).ToList();

        var diem = tongCauHoi == 0 ? 0 : Math.Round((soDung / (double)tongCauHoi) * 100);
        var dat = diem >= quiz.PassingScore;
        var daDatTruocDo = await db.QuizSubmissions.AsNoTracking()
            .AnyAsync(submission => submission.UserId == userId && submission.QuizId == quiz.Id && submission.Passed);

        var baiNop = new NopBaiKiemTra { Id = TaoId.Moi(), UserId = userId, QuizId = quiz.Id, Score = diem, Passed = dat, Answers = JsonSerializer.Serialize(dapAn), CreatedAt = DateTime.UtcNow };
        db.QuizSubmissions.Add(baiNop);
        await db.SaveChangesAsync();

        double? tienDoKhoaHoc = null;
        var diemNhanDuoc = 0;
        if (dat)
        {
            if (!daDatTruocDo)
            {
                var nguoiDung = await db.Users.FirstOrDefaultAsync(user => user.Id == userId);
                if (nguoiDung is not null)
                {
                    diemNhanDuoc = Math.Max(0, Math.Min(10, 100 - nguoiDung.RewardPoints));
                    nguoiDung.RewardPoints += diemNhanDuoc;
                    nguoiDung.UpdatedAt = DateTime.UtcNow;
                    await db.SaveChangesAsync();
                }
            }
            await dichVuGhiDanh.HoanThanhBaiHocAsync(userId, baiHoc.CourseId, lessonId);
            tienDoKhoaHoc = await db.Enrollments.Where(e => e.UserId == userId && e.CourseId == baiHoc.CourseId).Select(e => (double?)e.Progress).FirstOrDefaultAsync();
        }
        var chungChi = await dichVuGhiDanh.KiemTraVaCapChungChiAsync(userId, baiHoc.CourseId);

        return Results.Ok(new { submissionId = baiNop.Id, score = diem, passed = dat, passingScore = quiz.PassingScore, correctCount = soDung, totalQuestions = tongCauHoi, detailedResults = chiTiet, progress = tienDoKhoaHoc, earnedPoints = diemNhanDuoc, certificate = chungChi });
    }

    public async Task<IResult> XoaBaiKiemTraAsync(string quizId, string userId, bool laAdmin)
    {
        var quiz = await db.Quizzes.Include(q => q.Lesson).ThenInclude(l => l!.Course).Include(q => q.Questions).Include(q => q.Submissions).FirstOrDefaultAsync(q => q.Id == quizId);
        if (quiz is null) return Results.NotFound(new { message = "Không tìm thấy bài trắc nghiệm" });
        if (!laAdmin && quiz.Lesson?.Course?.InstructorId != userId) return Results.Json(new { message = "Bạn không có quyền xóa bài trắc nghiệm này" }, statusCode: 403);

        db.QuizSubmissions.RemoveRange(quiz.Submissions);
        db.QuizQuestions.RemoveRange(quiz.Questions);
        db.Quizzes.Remove(quiz);
        await db.SaveChangesAsync();
        return Results.Ok(new { message = "Xóa bài trắc nghiệm thành công" });
    }

    private async Task<bool> KiemTraQuyenTruyCap(string userId, string khoaHocId) =>
        await db.Enrollments.AnyAsync(e => e.UserId == userId && e.CourseId == khoaHocId) ||
        await db.Courses.AnyAsync(c => c.Id == khoaHocId && c.InstructorId == userId);
}
