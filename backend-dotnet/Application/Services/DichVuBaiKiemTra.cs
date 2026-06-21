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
        var baiHoc = await db.BaiHoc.AsNoTracking().Include(l => l.KhoaHoc).FirstOrDefaultAsync(l => l.Id == lessonId);
        if (baiHoc is null) return Results.NotFound(new { message = "Không tìm thấy bài học này" });

        if (!await KiemTraQuyenTruyCap(userId, baiHoc.KhoaHocId))
            return Results.Json(new { message = "Bạn không có quyền truy cập bài học này" }, statusCode: 403);

        var quiz = await db.BaiKiemTra.AsNoTracking().Include(q => q.CacCauHoi.OrderBy(c => c.ThuTu)).FirstOrDefaultAsync(q => q.BaiHocId == lessonId);
        if (quiz is null) return Results.Ok(null);

        var baiNop = await db.BaiNopKiemTra.AsNoTracking().Where(s => s.NguoiDungId == userId && s.BaiKiemTraId == quiz.Id).OrderByDescending(s => s.NgayTao).Take(5).ToListAsync();
        var laChuSoHuu = baiHoc.KhoaHoc?.GiangVienId == userId || laAdmin;

        return Results.Ok(BaiKiemTraDto.TuQuiz(quiz, baiNop, hienDapAn: laChuSoHuu));
    }

    public async Task<IResult> LuuBaiKiemTraAsync(string lessonId, string userId, bool laAdmin, string tieuDe, string? moTa, int? diemDat, List<DTOs.YeuCau.CauHoiRequest> cauHoi)
    {
        var baiHoc = await db.BaiHoc.AsNoTracking().Include(l => l.KhoaHoc).FirstOrDefaultAsync(l => l.Id == lessonId);
        if (baiHoc is null) return Results.NotFound(new { message = "Không tìm thấy bài học này" });
        if (!laAdmin && baiHoc.KhoaHoc?.GiangVienId != userId) return Results.Json(new { message = "Bạn không có quyền quản lý bài trắc nghiệm cho bài học này" }, statusCode: 403);
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
        var quiz = await db.BaiKiemTra.Include(q => q.CacCauHoi).FirstOrDefaultAsync(q => q.BaiHocId == lessonId);
        if (quiz is null) { quiz = new BaiKiemTra { Id = TaoId.Moi(), BaiHocId = lessonId, NgayTao = now }; db.BaiKiemTra.Add(quiz); }

        quiz.TieuDe = tieuDe.Trim();
        quiz.MoTa = moTa;
        quiz.DiemDat = Math.Clamp(diemDat ?? 50, 1, 100);
        quiz.NgayCapNhat = now;

        db.CauHoiKiemTra.RemoveRange(quiz.CacCauHoi);
        for (var i = 0; i < cauHoi.Count; i++)
        {
            var ch = cauHoi[i];
            db.CauHoiKiemTra.Add(new CauHoiKiemTra { Id = TaoId.Moi(), BaiKiemTraId = quiz.Id, NoiDungCauHoi = ch.QuestionText!.Trim(), CacLuaChon = JsonSerializer.Serialize(ch.Options), DapAnDungIndex = ch.CorrectOptionIndex, GiaiThich = string.IsNullOrWhiteSpace(ch.Explanation) ? null : ch.Explanation.Trim(), ThuTu = i, NgayTao = now, NgayCapNhat = now });
        }

        await db.SaveChangesAsync();

        var daLuu = await db.BaiKiemTra.AsNoTracking().Include(q => q.CacCauHoi.OrderBy(c => c.ThuTu)).FirstAsync(q => q.Id == quiz.Id);
        return Results.Ok(BaiKiemTraDto.TuQuiz(daLuu, [], hienDapAn: true));
    }

    public async Task<IResult> NopBaiAsync(string lessonId, string userId, Dictionary<string, int>? cauTraLoi)
    {
        var baiHoc = await db.BaiHoc.AsNoTracking().FirstOrDefaultAsync(l => l.Id == lessonId);
        if (baiHoc is null) return Results.NotFound(new { message = "Không tìm thấy bài học này" });
        if (!await db.GhiDanh.AnyAsync(e => e.NguoiDungId == userId && e.KhoaHocId == baiHoc.KhoaHocId))
            return Results.Json(new { message = "Bạn chưa đăng ký khóa học này" }, statusCode: 403);

        var quiz = await db.BaiKiemTra.Include(q => q.CacCauHoi.OrderBy(c => c.ThuTu)).FirstOrDefaultAsync(q => q.BaiHocId == lessonId);
        if (quiz is null) return Results.NotFound(new { message = "Bài học này chưa có bài trắc nghiệm" });

        var dapAn = cauTraLoi ?? new Dictionary<string, int>();
        var tongCauHoi = quiz.CacCauHoi.Count;
        var soDung = 0;

        var chiTiet = quiz.CacCauHoi.OrderBy(c => c.ThuTu).Select(ch =>
        {
            var daChon = dapAn.TryGetValue(ch.Id, out var idx) ? idx : (int?)null;
            var dung = daChon == ch.DapAnDungIndex;
            if (dung) soDung += 1;
            List<string> luaChon;
            try { luaChon = JsonSerializer.Deserialize<List<string>>(ch.CacLuaChon) ?? []; } catch { luaChon = []; }
            return new { questionId = ch.Id, questionText = ch.NoiDungCauHoi, options = luaChon, selectedIndex = daChon, ch.DapAnDungIndex, isCorrect = dung, ch.GiaiThich };
        }).ToList();

        var diem = tongCauHoi == 0 ? 0 : Math.Round((soDung / (double)tongCauHoi) * 100);
        var dat = diem >= quiz.DiemDat;
        var daDatTruocDo = await db.BaiNopKiemTra.AsNoTracking()
            .AnyAsync(submission => submission.NguoiDungId == userId && submission.BaiKiemTraId == quiz.Id && submission.Dat);

        var baiNop = new BaiNopKiemTra { Id = TaoId.Moi(), NguoiDungId = userId, BaiKiemTraId = quiz.Id, Diem = diem, Dat = dat, DapAn = JsonSerializer.Serialize(dapAn), NgayTao = DateTime.UtcNow };
        db.BaiNopKiemTra.Add(baiNop);
        await db.SaveChangesAsync();

        double? tienDoKhoaHoc = null;
        var diemNhanDuoc = 0;
        if (dat)
        {
            if (!daDatTruocDo)
            {
                var nguoiDung = await db.NguoiDung.FirstOrDefaultAsync(user => user.Id == userId);
                if (nguoiDung is not null)
                {
                    diemNhanDuoc = Math.Max(0, Math.Min(10, 100 - nguoiDung.DiemThuong));
                    nguoiDung.DiemThuong += diemNhanDuoc;
                    nguoiDung.NgayCapNhat = DateTime.UtcNow;
                    await db.SaveChangesAsync();
                }
            }
            await dichVuGhiDanh.HoanThanhBaiHocAsync(userId, baiHoc.KhoaHocId, lessonId);
            tienDoKhoaHoc = await db.GhiDanh.Where(e => e.NguoiDungId == userId && e.KhoaHocId == baiHoc.KhoaHocId).Select(e => (double?)e.TienDo).FirstOrDefaultAsync();
        }
        var chungChi = await dichVuGhiDanh.KiemTraVaCapChungChiAsync(userId, baiHoc.KhoaHocId);

        return Results.Ok(new { submissionId = baiNop.Id, score = diem, passed = dat, passingScore = quiz.DiemDat, correctCount = soDung, totalQuestions = tongCauHoi, detailedResults = chiTiet, progress = tienDoKhoaHoc, earnedPoints = diemNhanDuoc, certificate = chungChi });
    }

    public async Task<IResult> XoaBaiKiemTraAsync(string quizId, string userId, bool laAdmin)
    {
        var quiz = await db.BaiKiemTra.Include(q => q.BaiHoc).ThenInclude(l => l!.KhoaHoc).Include(q => q.CacCauHoi).Include(q => q.CacBaiNop).FirstOrDefaultAsync(q => q.Id == quizId);
        if (quiz is null) return Results.NotFound(new { message = "Không tìm thấy bài trắc nghiệm" });
        if (!laAdmin && quiz.BaiHoc?.KhoaHoc?.GiangVienId != userId) return Results.Json(new { message = "Bạn không có quyền xóa bài trắc nghiệm này" }, statusCode: 403);

        db.BaiNopKiemTra.RemoveRange(quiz.CacBaiNop);
        db.CauHoiKiemTra.RemoveRange(quiz.CacCauHoi);
        db.BaiKiemTra.Remove(quiz);
        await db.SaveChangesAsync();
        return Results.Ok(new { message = "Xóa bài trắc nghiệm thành công" });
    }

    private async Task<bool> KiemTraQuyenTruyCap(string userId, string khoaHocId) =>
        await db.GhiDanh.AnyAsync(e => e.NguoiDungId == userId && e.KhoaHocId == khoaHocId) ||
        await db.KhoaHoc.AnyAsync(c => c.Id == khoaHocId && c.GiangVienId == userId);
}
