using LMS.Api.Infrastructure.Persistence;
using LMS.Api.DTOs.PhanHoi;
using LMS.Api.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using System.Text.Json;

namespace LMS.Api.Application.Services;

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

public class DichVuGhiDanh(ApplicationDbContext db) : IDichVuGhiDanh
{
    public async Task<IResult> GhiDanhAsync(string khoaHocId, string userId)
    {
        var khoaHoc = await db.KhoaHoc.FirstOrDefaultAsync(c => c.Id == khoaHocId && c.DaXuatBan);
        if (khoaHoc is null) return Results.NotFound(new { message = "Không tìm thấy khóa học" });
        if (khoaHoc.Gia > 0) return Results.BadRequest(new { message = "Khóa học có phí, vui lòng thanh toán bằng ví." });
        if (await db.GhiDanh.AnyAsync(e => e.NguoiDungId == userId && e.KhoaHocId == khoaHocId))
            return Results.BadRequest(new { message = "Bạn đã đăng ký khóa học này" });

        db.GhiDanh.Add(new GhiDanh { Id = TaoId.Moi(), NguoiDungId = userId, KhoaHocId = khoaHocId, TienDo = 0, NgayTao = DateTime.UtcNow, NgayCapNhat = DateTime.UtcNow });
        await db.SaveChangesAsync();
        return Results.Ok(new { message = "Đăng ký khóa học thành công" });
    }

    public async Task<IResult> HoanThanhBaiHocAsync(string userId, string khoaHocId, string baiHocId)
        => await CapNhatTienDoAsync(userId, khoaHocId, baiHocId, null, null, null, true);

    public async Task<IResult> HoanThanhBaiHocTheoBaiAsync(string userId, string baiHocId)
    {
        var baiHoc = await db.BaiHoc.AsNoTracking().FirstOrDefaultAsync(lesson => lesson.Id == baiHocId);
        if (baiHoc is null) return Results.NotFound(new { message = "Không tìm thấy bài học" });
        return await CapNhatTienDoAsync(userId, baiHoc.KhoaHocId, baiHocId, null, null, null, true);
    }

    public async Task<IResult> CapNhatTienDoAsync(string userId, string khoaHocId, string baiHocId, int? giayDaXem, int? viTriCuoi, int? tongGiay, bool? hoanThanh)
    {
        var ghiDanh = await db.GhiDanh.FirstOrDefaultAsync(e => e.NguoiDungId == userId && e.KhoaHocId == khoaHocId);
        if (ghiDanh is null) return Results.Json(new { message = "Bạn chưa đăng ký khóa học này" }, statusCode: 403);

        var baiHoc = await db.BaiHoc.AsNoTracking().FirstOrDefaultAsync(l => l.Id == baiHocId && l.KhoaHocId == khoaHocId);
        if (baiHoc is null) return Results.NotFound(new { message = "Không tìm thấy bài học" });

        var now = DateTime.UtcNow;
        var duration = baiHoc.ThoiLuongGiay ?? 0;
        var tongThoiGian = duration > 0 ? duration : Math.Max(1, tongGiay ?? 0);

        var tienDo = await db.TienDoBaiHoc.FirstOrDefaultAsync(p => p.NguoiDungId == userId && p.BaiHocId == baiHocId);
        
        // 1. Kiểm soát giá trị giayDaXem được gửi lên: không cho phép vượt quá tổng thời lượng bài học
        var daXemGuiLen = giayDaXem ?? tongThoiGian;
        var daXemChuan = Math.Clamp(daXemGuiLen, 0, tongThoiGian);

        // 2. Chống tăng tiến độ phi thực tế (Ví dụ: nhảy vọt xem từ 0 giây lên 1000 giây chỉ trong 10 giây)
        if (tienDo is not null && duration > 0)
        {
            var thoiGianTroiQua = (now - tienDo.NgayCapNhat).TotalSeconds;
            var soGiayTangThem = daXemChuan - tienDo.GiayDaXem;
            
            // Cho phép sai số nhỏ do mạng và buffer, tối đa tăng 1.5 lần thời gian trôi qua thực tế
            if (soGiayTangThem > Math.Max(15, thoiGianTroiQua * 1.5))
            {
                daXemChuan = tienDo.GiayDaXem + (int)Math.Max(10, thoiGianTroiQua);
                daXemChuan = Math.Min(daXemChuan, tongThoiGian);
            }
        }

        var viTri = Math.Clamp(viTriCuoi ?? daXemChuan, 0, tongThoiGian);
        
        if (tienDo is null)
        {
            tienDo = new TienDoBaiHoc { Id = TaoId.Moi(), NguoiDungId = userId, BaiHocId = baiHocId, NgayTao = now };
            db.TienDoBaiHoc.Add(tienDo);
        }

        var daXemMax = Math.Max(tienDo.GiayDaXem, daXemChuan);
        var tiLe = Math.Clamp((daXemMax / (double)tongThoiGian) * 100, 0, 100);

        // 3. Quyết định hoàn thành dựa trên tỷ lệ xem thực tế đạt từ 90% trở lên (Không tin cờ hoanThanh của client gửi trực tiếp nữa)
        var canHoanThanh = tiLe >= 90;
        var daHoanThanhTruocDo = tienDo.DaHoanThanh;

        tienDo.GiayDaXem = daXemMax;
        tienDo.ViTriXemCuoiGiay = viTri;
        tienDo.TyLeHoanThanh = Math.Max(tienDo.TyLeHoanThanh, tiLe);
        if (canHoanThanh && !tienDo.DaHoanThanh) { tienDo.DaHoanThanh = true; tienDo.NgayHoanThanh = now; }
        tienDo.NgayCapNhat = now;
        await db.SaveChangesAsync();

        // Cập nhật tiến độ khóa học
        var tongBai = await db.BaiHoc.CountAsync(l => l.KhoaHocId == khoaHocId);
        var baiXong = await db.TienDoBaiHoc.CountAsync(p => p.NguoiDungId == userId && p.DaHoanThanh && p.BaiHoc != null && p.BaiHoc.KhoaHocId == khoaHocId);
        var phanTramKhoaHoc = tongBai == 0 ? 0 : Math.Round((baiXong / (double)tongBai) * 100);

        ghiDanh.TienDo = phanTramKhoaHoc;
        ghiDanh.NgayHoanThanh = tongBai > 0 && baiXong >= tongBai ? now : ghiDanh.NgayHoanThanh;
        ghiDanh.NgayCapNhat = now;
        await db.SaveChangesAsync();

        var diemNhanDuoc = 0;
        if (canHoanThanh && !daHoanThanhTruocDo && tienDo.DaHoanThanh)
        {
            var nguoiDung = await db.NguoiDung.FirstOrDefaultAsync(u => u.Id == userId);
            var homNay = TroGiup.LayNgayDiaPhuong();
            if (nguoiDung is not null && nguoiDung.NgayNhanThuongBaiHocCuoi?.Date != homNay)
            {
                diemNhanDuoc = Math.Min(5, 100 - nguoiDung.DiemThuong);
                nguoiDung.DiemThuong += diemNhanDuoc;
                nguoiDung.NgayNhanThuongBaiHocCuoi = homNay;
                nguoiDung.NgayCapNhat = now;
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
            lessonProgress = new { tienDo.Id, tienDo.DaHoanThanh, tienDo.GiayDaXem, tienDo.ViTriXemCuoiGiay, tienDo.TyLeHoanThanh, tienDo.NgayHoanThanh },
            certificate = chungChi
        });
    }

    public async Task<object> LayKhoaHocDaGhiDanhAsync(string userId)
    {
        return await db.GhiDanh.AsNoTracking()
            .Where(e => e.NguoiDungId == userId).Include(e => e.KhoaHoc)
            .OrderByDescending(e => e.NgayTao)
            .Select(e => new { e.Id, e.TienDo, e.NgayHoanThanh, e.NgayTao, course = e.KhoaHoc == null ? null : KhoaHocDto.TuKhoaHoc(e.KhoaHoc) })
            .ToListAsync();
    }

    public async Task<object?> KiemTraVaCapChungChiAsync(string userId, string khoaHocId)
    {
        var ghiDanh = await db.GhiDanh.FirstOrDefaultAsync(e => e.NguoiDungId == userId && e.KhoaHocId == khoaHocId);
        if (ghiDanh is null || ghiDanh.TienDo < 100) return null;

        var quizzes = await db.BaiKiemTra.AsNoTracking()
            .Include(q => q.CacCauHoi)
            .Include(q => q.BaiHoc)
            .Where(q => q.BaiHoc != null && q.BaiHoc.KhoaHocId == khoaHocId && q.BaiHoc.DaXuatBan)
            .ToListAsync();

        var quizIds = quizzes.Select(q => q.Id).ToList();
        var submissions = await db.BaiNopKiemTra.AsNoTracking()
            .Where(s => s.NguoiDungId == userId && quizIds.Contains(s.BaiKiemTraId))
            .ToListAsync();

        var tongCauHoi = quizzes.Sum(q => q.CacCauHoi.Count);
        double? diemQuizToanKhoa = null;
        if (tongCauHoi > 0 && submissions.Count > 0)
        {
            var tongCauDungUocTinh = quizzes.Sum(q =>
            {
                var diemTotNhat = submissions
                    .Where(s => s.BaiKiemTraId == q.Id)
                    .Select(s => s.Diem)
                    .DefaultIfEmpty(0)
                    .Max();
                return (diemTotNhat / 100.0) * q.CacCauHoi.Count;
            });
            diemQuizToanKhoa = Math.Round((tongCauDungUocTinh / tongCauHoi) * 100, 2);
        }

        var chungChiDaCo = await db.ChungChi.AsNoTracking()
            .FirstOrDefaultAsync(c => c.NguoiDungId == userId && c.KhoaHocId == khoaHocId);
        if (chungChiDaCo is not null)
        {
            return new { chungChiDaCo.Id, chungChiDaCo.SoChungChi, chungChiDaCo.MaXacThuc, chungChiDaCo.NgayCap, quizScore = diemQuizToanKhoa, progress = ghiDanh.TienDo };
        }

        var now = DateTime.UtcNow;
        var chungChi = new ChungChi
        {
            Id = TaoId.Moi(),
            SoChungChi = $"SKL-{now:yyyyMMdd}-{TaoId.Moi()[..8].ToUpperInvariant()}",
            MaXacThuc = TaoId.Moi(),
            NguoiDungId = userId,
            KhoaHocId = khoaHocId,
            NgayCap = now,
            AnhChupHoanThanh = JsonSerializer.Serialize(new
            {
                progress = ghiDanh.TienDo,
                quizScore = diemQuizToanKhoa,
                totalQuizzes = quizzes.Count,
                totalQuestions = tongCauHoi
            })
        };

        db.ChungChi.Add(chungChi);
        ghiDanh.NgayHoanThanh ??= now;
        ghiDanh.NgayCapNhat = now;
        await db.SaveChangesAsync();

        return new { chungChi.Id, chungChi.SoChungChi, chungChi.MaXacThuc, chungChi.NgayCap, quizScore = diemQuizToanKhoa, progress = ghiDanh.TienDo };
    }
}
