using System.Globalization;
using System.Security.Claims;
using System.Text;
using System.Text.Json;
using LMS.Api.Infrastructure.Persistence;
using LMS.Api.DTOs.PhanHoi;
using LMS.Api.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace LMS.Api.Application.Services;

/// <summary>
/// Dịch vụ khóa học — danh sách, chi tiết, đánh giá, chương trình giảng dạy, xuất bản.
/// </summary>
public interface IDichVuKhoaHoc
{
    Task<object> LayDanhSachAsync(
        int trang,
        int soLuong,
        bool phanTrang,
        string? tuKhoa,
        string? danhMuc,
        string? sapXep,
        string? gia,
        string? hangThanhVien,
        string? loaiTruCuaNguoiDungId = null);
    Task<object> LayExploreInsightsAsync();
    Task<object?> LayChiTietAsync(string khoaHocId, ClaimsPrincipal? nguoiDung);
    Task<object?> LayBaiHocThuAsync(string khoaHocId);
    Task<object?> LayKhoaHocDangHocAsync(string khoaHocId, ClaimsPrincipal nguoiDung);
    Task<object?> LayChiTietBaiHocAsync(string baiHocId, ClaimsPrincipal nguoiDung);
    Task<object?> LayDanhGiaAsync(string khoaHocId);
    Task<IResult> GuiDanhGiaAsync(string khoaHocId, string userId, int soSao, string? binhLuan);
    Task<IResult> XoaDanhGiaAsync(string khoaHocId, string userId);
    Task<object> LayChuongTrinhAsync(KhoaHoc khoaHoc);
}

public class DichVuKhoaHoc(ApplicationDbContext db) : IDichVuKhoaHoc
{
    public async Task<object> LayDanhSachAsync(
        int trang,
        int soLuong,
        bool phanTrang,
        string? tuKhoa,
        string? danhMuc,
        string? sapXep,
        string? gia,
        string? hangThanhVien,
        string? loaiTruCuaNguoiDungId = null)
    {
        trang = Math.Max(1, trang);
        soLuong = Math.Clamp(soLuong, 1, 100);

        IQueryable<KhoaHoc> truyVan = db.KhoaHoc.AsNoTracking()
            .Where(kh => kh.DaXuatBan)
            .Include(kh => kh.GiangVien)
            .Include(kh => kh.CacChuongHoc)
            .Include(kh => kh.CacBaiHoc)
            .Include(kh => kh.CacGhiDanh)
            .Include(kh => kh.DanhMuc);

        if (!string.IsNullOrWhiteSpace(loaiTruCuaNguoiDungId))
        {
            truyVan = truyVan.Where(kh =>
                !kh.CacGhiDanh.Any(ghiDanh => ghiDanh.NguoiDungId == loaiTruCuaNguoiDungId) &&
                !kh.CacDonMua.Any(mua => mua.NguoiDungId == loaiTruCuaNguoiDungId && mua.TrangThai == "COMPLETED"));
        }

        if (!string.IsNullOrWhiteSpace(tuKhoa))
        {
            var tuKhoaChuan = tuKhoa.Trim();
            truyVan = truyVan.Where(kh =>
                kh.TieuDe.Contains(tuKhoaChuan) ||
                (kh.MoTa != null && kh.MoTa.Contains(tuKhoaChuan)) ||
                (kh.DanhMuc != null && kh.DanhMuc.Ten.Contains(tuKhoaChuan)) ||
                kh.ChuyenMuc.Contains(tuKhoaChuan) ||
                (kh.GiangVien != null && kh.GiangVien.Ten.Contains(tuKhoaChuan)));
        }

        if (!string.IsNullOrWhiteSpace(danhMuc))
        {
            var danhMucChuan = danhMuc.Trim();
            truyVan = truyVan.Where(kh =>
                kh.DanhMucId == danhMucChuan ||
                (kh.DanhMuc != null && kh.DanhMuc.Slug == danhMucChuan) ||
                (kh.DanhMuc != null && kh.DanhMuc.Ten.Contains(danhMucChuan)) ||
                kh.ChuyenMuc.Contains(danhMucChuan));
        }

        if (gia == "free") truyVan = truyVan.Where(kh => kh.Gia == 0);
        if (gia == "paid") truyVan = truyVan.Where(kh => kh.Gia > 0);
        if (!string.IsNullOrWhiteSpace(hangThanhVien) && hangThanhVien != "all")
            truyVan = truyVan.Where(kh => kh.HangThanhVienToiThieu == hangThanhVien);

        truyVan = sapXep switch
        {
            "price_asc" => truyVan.OrderBy(kh => kh.Gia),
            "price_desc" => truyVan.OrderByDescending(kh => kh.Gia),
            "rating_desc" => truyVan.OrderByDescending(kh => kh.DiemDanhGiaTrungBinh),
            "students_desc" => truyVan.OrderByDescending(kh => kh.CacGhiDanh.Count),
            _ => truyVan.OrderByDescending(kh => kh.NgayTao)
        };

        if (!phanTrang)
        {
            var ds = await truyVan.Take(soLuong).Select(kh => KhoaHocDto.TuKhoaHoc(kh)).ToListAsync();
            return ds;
        }

        var tong = await truyVan.CountAsync();
        var items = await truyVan.Skip((trang - 1) * soLuong).Take(soLuong)
            .Select(kh => KhoaHocDto.TuKhoaHoc(kh)).ToListAsync();

        return TroGiup.PhanTrang(items, tong, trang, soLuong);
    }

    public async Task<object> LayExploreInsightsAsync()
    {
        var courses = await db.KhoaHoc.AsNoTracking()
            .Where(kh => kh.DaXuatBan)
            .Include(kh => kh.GiangVien)
            .Include(kh => kh.CacChuongHoc)
                .ThenInclude(section => section.CacBaiHoc)
            .Include(kh => kh.CacGhiDanh)
            .Include(kh => kh.CacDanhGia)
            .Include(kh => kh.DanhMuc)
            .OrderByDescending(kh => kh.CacGhiDanh.Count)
            .ThenByDescending(kh => kh.DiemDanhGiaTrungBinh)
            .ThenByDescending(kh => kh.NgayTao)
            .ToListAsync();

        var featuredCourse = courses.FirstOrDefault();
        var recommendedCourses = courses.Skip(featuredCourse is null ? 0 : 1).Take(3).Select(kh => new
        {
            id = kh.Id,
            title = kh.TieuDe,
            thumbnail = kh.AnhDaiDien,
            instructorName = kh.GiangVien?.Ten ?? "Giảng viên",
            lessons = kh.CacChuongHoc.Sum(section => section.CacBaiHoc.Count),
            students = kh.CacGhiDanh.Count,
            rating = Math.Round(kh.DiemDanhGiaTrungBinh, 1)
        });

        var topInstructors = courses
            .Where(kh => kh.GiangVien is not null)
            .GroupBy(kh => kh.GiangVienId)
            .Select(group =>
            {
                var instructor = group.First().GiangVien!;
                return new
                {
                    id = instructor.Id,
                    name = instructor.Ten,
                    avatar = instructor.AnhDaiDien,
                    courseCount = group.Count(),
                    studentCount = group.Sum(kh => kh.CacGhiDanh.Count),
                    averageRating = group.SelectMany(kh => kh.CacDanhGia).Any()
                        ? Math.Round(group.SelectMany(kh => kh.CacDanhGia).Average(review => review.DiemDanhGia), 1)
                        : 0
                };
            })
            .OrderByDescending(item => item.studentCount)
            .ThenByDescending(item => item.averageRating)
            .Take(4)
            .ToList();

        var trendingTopics = courses
            .Where(kh => kh.DanhMuc != null)
            .GroupBy(kh => kh.DanhMuc!)
            .Select(group => new
            {
                name = group.Key.Ten,
                slug = group.Key.Slug,
                courseCount = group.Count(),
                studentCount = group.Sum(kh => kh.CacGhiDanh.Count),
                growth = Math.Min(99, Math.Max(8, group.Count() * 7 + group.Sum(kh => kh.CacGhiDanh.Count) * 3))
            })
            .OrderByDescending(item => item.studentCount)
            .ThenByDescending(item => item.courseCount)
            .Take(3)
            .ToList();

        var learningPaths = courses
            .Where(kh => kh.DanhMuc != null)
            .GroupBy(kh => kh.DanhMuc!)
            .Select(group => new
            {
                id = group.Key.Slug,
                title = $"Lộ trình {group.Key.Ten}",
                category = group.Key.Ten,
                courseCount = group.Count(),
                lessonCount = group.Sum(kh => kh.CacChuongHoc.Sum(section => section.CacBaiHoc.Count)),
                estimatedMonths = Math.Clamp((int)Math.Ceiling(group.Sum(kh => kh.CacChuongHoc.Sum(section => section.CacBaiHoc.Count)) / 12.0), 1, 12),
                progress = 0
            })
            .OrderByDescending(item => item.courseCount)
            .ThenByDescending(item => item.lessonCount)
            .Take(3)
            .ToList();

        return new
        {
            featuredCourse = featuredCourse is null ? null : new
            {
                id = featuredCourse.Id,
                title = featuredCourse.TieuDe,
                description = featuredCourse.MoTaNgan ?? featuredCourse.MoTa,
                thumbnail = featuredCourse.AnhDaiDien,
                category = featuredCourse.DanhMuc?.Ten ?? featuredCourse.ChuyenMuc,
                lessons = featuredCourse.CacChuongHoc.Sum(section => section.CacBaiHoc.Count),
                sections = featuredCourse.CacChuongHoc.Count,
                students = featuredCourse.CacGhiDanh.Count,
                rating = Math.Round(featuredCourse.DiemDanhGiaTrungBinh, 1),
                instructorName = featuredCourse.GiangVien?.Ten ?? "Giảng viên"
            },
            recommendedCourses,
            topInstructors,
            trendingTopics,
            learningPaths
        };
    }

    public async Task<object?> LayChiTietAsync(string khoaHocId, ClaimsPrincipal? nguoiDung)
    {
        var kh = await db.KhoaHoc.AsNoTracking()
            .Include(c => c.GiangVien)
            .Include(c => c.DanhMuc)
            .Include(c => c.CacChuongHoc.OrderBy(s => s.ThuTu))
                .ThenInclude(s => s.CacBaiHoc.OrderBy(l => l.ThuTu))
                    .ThenInclude(l => l.BaiKiemTra)
            .Include(c => c.CacDanhGia.OrderByDescending(r => r.NgayTao).Take(10))
                .ThenInclude(r => r.NguoiDung)
            .FirstOrDefaultAsync(c => c.Id == khoaHocId);

        if (kh is null) return null;
        var studentCount = await db.GhiDanh.AsNoTracking()
            .Where(enrollment => enrollment.KhoaHocId == khoaHocId)
            .Select(enrollment => enrollment.NguoiDungId)
            .Union(db.DonMua.AsNoTracking()
                .Where(purchase => purchase.KhoaHocId == khoaHocId && purchase.TrangThai == "COMPLETED")
                .Select(purchase => purchase.NguoiDungId))
            .Distinct()
            .CountAsync();
        var purchaseCount = await db.DonMua.AsNoTracking()
            .CountAsync(purchase => purchase.KhoaHocId == khoaHocId && purchase.TrangThai == "COMPLETED");

        var userId = TroGiup.LayUserId(nguoiDung!);
        var laXemThuSinhVien = nguoiDung?.HasClaim("StudentPreview", "true") == true;
        var laKhoaHocCuaGiangVienXemThu = laXemThuSinhVien && userId is not null && kh.GiangVienId == userId;
        var laChuSoHuu = !laXemThuSinhVien && userId is not null && kh.GiangVienId == userId;
        if (!kh.DaXuatBan && !laChuSoHuu) return null;

        GhiDanh? ghiDanh = null;
        var baiHoanThanh = new List<string>();
        DanhGiaKhoaHoc? danhGiaCuaToi = null;

        if (userId is not null)
        {
            ghiDanh = await db.GhiDanh.AsNoTracking().FirstOrDefaultAsync(e => e.NguoiDungId == userId && e.KhoaHocId == khoaHocId);
            if (ghiDanh is not null)
            {
                baiHoanThanh = await db.TienDoBaiHoc.AsNoTracking()
                    .Where(p => p.NguoiDungId == userId && p.DaHoanThanh && p.BaiHoc != null && p.BaiHoc.KhoaHocId == khoaHocId)
                    .Select(p => p.BaiHocId).ToListAsync();
                danhGiaCuaToi = await db.DanhGiaKhoaHoc.AsNoTracking().FirstOrDefaultAsync(r => r.NguoiDungId == userId && r.KhoaHocId == khoaHocId);
            }
        }
        if (laKhoaHocCuaGiangVienXemThu && kh.DaXuatBan)
        {
            ghiDanh = new GhiDanh { Id = "student-preview", NguoiDungId = userId ?? string.Empty, KhoaHocId = khoaHocId, TienDo = 0 };
            baiHoanThanh = [];
            danhGiaCuaToi = null;
        }

        return ChiTietKhoaHocDto.TuKhoaHoc(kh, ghiDanh, baiHoanThanh, danhGiaCuaToi, laChuSoHuu, studentCount, purchaseCount);
    }

    public async Task<object?> LayBaiHocThuAsync(string khoaHocId)
    {
        var kh = await db.KhoaHoc.AsNoTracking()
            .Include(c => c.CacChuongHoc.OrderBy(s => s.ThuTu))
                .ThenInclude(s => s.CacBaiHoc.OrderBy(l => l.ThuTu))
                    .ThenInclude(l => l.BaiKiemTra)
            .FirstOrDefaultAsync(c => c.Id == khoaHocId && c.DaXuatBan);

        if (kh is null) return null;

        var sections = kh.CacChuongHoc
            .OrderBy(section => section.ThuTu)
            .Select(section => new
            {
                id = section.Id,
                tieuDe = section.TieuDe,
                title = section.TieuDe,
                thuTu = section.ThuTu,
                lessons = section.CacBaiHoc
                    .OrderBy(lesson => lesson.ThuTu)
                    .Select(lesson => MapStudentLesson(lesson, isLocked: !lesson.ChoXemTruoc, isCompleted: false, includeContent: lesson.ChoXemTruoc))
            })
            .ToList();

        return new
        {
            courseId = kh.Id,
            id = kh.Id,
            tieuDe = kh.TieuDe,
            title = kh.TieuDe,
            gia = kh.Gia,
            price = kh.Gia,
            coHocThu = kh.CacChuongHoc.SelectMany(section => section.CacBaiHoc).Any(lesson => lesson.ChoXemTruoc),
            lessons = sections.SelectMany(section => section.lessons),
            sections
        };
    }

    public async Task<object?> LayKhoaHocDangHocAsync(string khoaHocId, ClaimsPrincipal nguoiDung)
    {
        var userId = TroGiup.LayUserId(nguoiDung);
        if (userId is null) return null;
        var laXemThuSinhVien = nguoiDung.HasClaim("StudentPreview", "true");

        var ghiDanh = await db.GhiDanh.AsNoTracking().FirstOrDefaultAsync(e => e.NguoiDungId == userId && e.KhoaHocId == khoaHocId);
        var laKhoaHocCuaGiangVienXemThu = laXemThuSinhVien &&
            await db.KhoaHoc.AnyAsync(course => course.Id == khoaHocId && course.GiangVienId == userId && course.DaXuatBan);
        if (ghiDanh is null && !laKhoaHocCuaGiangVienXemThu) return null;

        var kh = await db.KhoaHoc.AsNoTracking()
            .Include(c => c.CacChuongHoc.OrderBy(s => s.ThuTu))
                .ThenInclude(s => s.CacBaiHoc.OrderBy(l => l.ThuTu))
                    .ThenInclude(l => l.BaiKiemTra)
            .FirstOrDefaultAsync(c => c.Id == khoaHocId && c.DaXuatBan);

        if (kh is null) return null;

        var completedLessonIds = laKhoaHocCuaGiangVienXemThu ? new List<string>() : await db.TienDoBaiHoc.AsNoTracking()
            .Where(progress => progress.NguoiDungId == userId && progress.DaHoanThanh && progress.BaiHoc != null && progress.BaiHoc.KhoaHocId == khoaHocId)
            .Select(progress => progress.BaiHocId)
            .ToListAsync();

        var sections = kh.CacChuongHoc
            .OrderBy(section => section.ThuTu)
            .Select(section => new
            {
                id = section.Id,
                tieuDe = section.TieuDe,
                title = section.TieuDe,
                thuTu = section.ThuTu,
                lessons = section.CacBaiHoc
                    .OrderBy(lesson => lesson.ThuTu)
                    .Select(lesson => MapStudentLesson(lesson, isLocked: false, completedLessonIds.Contains(lesson.Id), includeContent: false))
            })
            .ToList();

        return new
        {
            courseId = kh.Id,
            id = kh.Id,
            tieuDe = kh.TieuDe,
            title = kh.TieuDe,
            progress = ghiDanh?.TienDo ?? 0,
            sections
        };
    }

    public async Task<object?> LayChiTietBaiHocAsync(string baiHocId, ClaimsPrincipal nguoiDung)
    {
        var userId = TroGiup.LayUserId(nguoiDung);
        if (userId is null) return null;

        var baiHoc = await db.BaiHoc.AsNoTracking()
            .Include(lesson => lesson.KhoaHoc)
            .Include(lesson => lesson.ChuongHoc)
            .Include(lesson => lesson.BaiKiemTra)
            .FirstOrDefaultAsync(lesson => lesson.Id == baiHocId && lesson.KhoaHoc != null && lesson.KhoaHoc.DaXuatBan);

        if (baiHoc is null) return null;

        var daGhiDanh = await db.GhiDanh.AsNoTracking().AnyAsync(e => e.NguoiDungId == userId && e.KhoaHocId == baiHoc.KhoaHocId);
        var laXemThuSinhVien = nguoiDung.HasClaim("StudentPreview", "true");
        var laKhoaHocCuaGiangVienXemThu = laXemThuSinhVien && baiHoc.KhoaHoc?.GiangVienId == userId;
        var isLocked = !laKhoaHocCuaGiangVienXemThu && !daGhiDanh && !baiHoc.ChoXemTruoc;
        var isCompleted = !laKhoaHocCuaGiangVienXemThu && await db.TienDoBaiHoc.AsNoTracking().AnyAsync(p => p.NguoiDungId == userId && p.BaiHocId == baiHocId && p.DaHoanThanh);

        return MapStudentLesson(baiHoc, isLocked, isCompleted, includeContent: !isLocked);
    }

    public async Task<object?> LayDanhGiaAsync(string khoaHocId)
    {
        var kh = await db.KhoaHoc.AsNoTracking()
            .Include(c => c.CacDanhGia.OrderByDescending(r => r.NgayTao)).ThenInclude(r => r.NguoiDung)
            .FirstOrDefaultAsync(c => c.Id == khoaHocId && c.DaXuatBan);
        if (kh is null) return null;

        return new { averageRating = kh.DiemDanhGiaTrungBinh, reviewCount = kh.SoLuongDanhGia, reviews = kh.CacDanhGia.Select(DanhGiaDto.TuDanhGia) };
    }

    public async Task<IResult> GuiDanhGiaAsync(string khoaHocId, string userId, int soSao, string? binhLuan)
    {
        if (soSao < 1 || soSao > 5) return Results.BadRequest(new { message = "Số sao đánh giá phải trong khoảng từ 1 đến 5" });

        var kh = await db.KhoaHoc.FirstOrDefaultAsync(c => c.Id == khoaHocId && c.DaXuatBan);
        if (kh is null) return Results.NotFound(new { message = "Không tìm thấy khóa học" });
        if (kh.GiangVienId == userId) return Results.Json(new { message = "Giảng viên không thể tự đánh giá khóa học của mình" }, statusCode: 403);

        var ghiDanh = await db.GhiDanh.FirstOrDefaultAsync(e => e.NguoiDungId == userId && e.KhoaHocId == khoaHocId);
        if (ghiDanh is null)
            return Results.Json(new { message = "Bạn cần mua khóa học để đánh giá" }, statusCode: 403);

        if (ghiDanh.TienDo < 100)
            return Results.Json(new { message = "Hoàn thành khóa học để có thể đánh giá" }, statusCode: 403);

        var now = DateTime.UtcNow;
        var dg = await db.DanhGiaKhoaHoc.Include(r => r.NguoiDung).FirstOrDefaultAsync(r => r.NguoiDungId == userId && r.KhoaHocId == khoaHocId);

        if (dg is null)
        {
            dg = new DanhGiaKhoaHoc { Id = TaoId.Moi(), NguoiDungId = userId, KhoaHocId = khoaHocId, NgayTao = now };
            db.DanhGiaKhoaHoc.Add(dg);
        }

        dg.DiemDanhGia = soSao;
        dg.BinhLuan = string.IsNullOrWhiteSpace(binhLuan) ? null : binhLuan.Trim();
        dg.NgayCapNhat = now;

        var studentName = await db.NguoiDung.AsNoTracking()
            .Where(user => user.Id == userId)
            .Select(user => user.Ten)
            .FirstOrDefaultAsync() ?? "Một học viên";
        db.ThongBao.Add(new ThongBao
        {
            Id = TaoId.Moi(),
            NguoiDungId = kh.GiangVienId,
            LoaiThongBao = "INSTRUCTOR_COURSE_REVIEW",
            TieuDe = "Khóa học có đánh giá mới",
            NoiDung = $"{studentName} vừa đánh giá {soSao} sao cho khóa học {kh.TieuDe}.",
            DuongDan = $"/course/{khoaHocId}",
            Metadata = JsonSerializer.Serialize(new { courseId = khoaHocId, reviewId = dg.Id, studentId = userId }),
            NgayTao = now
        });

        await db.SaveChangesAsync();
        await DongBoThongKeDanhGia(khoaHocId);

        var dgDaLuu = await db.DanhGiaKhoaHoc.AsNoTracking().Include(r => r.NguoiDung).FirstAsync(r => r.Id == dg.Id);
        var khCapNhat = await db.KhoaHoc.AsNoTracking().FirstAsync(c => c.Id == khoaHocId);

        return Results.Ok(new { message = "Đã lưu đánh giá khóa học", review = DanhGiaDto.TuDanhGia(dgDaLuu), averageRating = khCapNhat.DiemDanhGiaTrungBinh, reviewCount = khCapNhat.SoLuongDanhGia });
    }

    public async Task<IResult> XoaDanhGiaAsync(string khoaHocId, string userId)
    {
        var dg = await db.DanhGiaKhoaHoc.FirstOrDefaultAsync(r => r.NguoiDungId == userId && r.KhoaHocId == khoaHocId);
        if (dg is null) return Results.NotFound(new { message = "Bạn chưa có đánh giá nào để xóa" });

        db.DanhGiaKhoaHoc.Remove(dg);
        await db.SaveChangesAsync();
        await DongBoThongKeDanhGia(khoaHocId);

        var kh = await db.KhoaHoc.AsNoTracking().FirstAsync(c => c.Id == khoaHocId);
        return Results.Ok(new { message = "Đã xóa đánh giá của bạn", averageRating = kh.DiemDanhGiaTrungBinh, reviewCount = kh.SoLuongDanhGia });
    }

    public async Task<object> LayChuongTrinhAsync(KhoaHoc khoaHoc)
    {
        return await Task.FromResult(LayChuongTrinh_Static(khoaHoc));
    }

    public static object LayChuongTrinh_Static(KhoaHoc khoaHoc)
    {
        var loiXuatBan = KiemTraXuatBan(khoaHoc);
        return new
        {
            khoaHoc.Id, khoaHoc.TieuDe, khoaHoc.DuongDanThanThien, khoaHoc.MoTa, khoaHoc.AnhDaiDien,
            khoaHoc.Gia, khoaHoc.DiemDanhGiaTrungBinh, khoaHoc.SoLuongDanhGia, khoaHoc.HangThanhVienToiThieu,
            khoaHoc.TongThoiLuongGiay, khoaHoc.DaXuatBan, khoaHoc.NgayXuatBan,
            khoaHoc.StartDate, khoaHoc.EndDate,
            totalLessons = khoaHoc.CacChuongHoc.Sum(c => c.CacBaiHoc.Count),
            sections = khoaHoc.CacChuongHoc.OrderBy(c => c.ThuTu).Select(ChuongDto.TuChuong),
            publishValidationErrors = loiXuatBan,
            canPublish = loiXuatBan.Count == 0
        };
    }

    // ── Hàm nội bộ ──────────────────────────────────────────

    private static string TaoSlug(string value)
    {
        var normalized = value.ToLowerInvariant().Normalize(NormalizationForm.FormD);
        var builder = new StringBuilder();
        foreach (var character in normalized)
        {
            var category = CharUnicodeInfo.GetUnicodeCategory(character);
            if (category == UnicodeCategory.NonSpacingMark) continue;
            if (char.IsLetterOrDigit(character)) builder.Append(character);
            else if (char.IsWhiteSpace(character) || character is '-' or '_') builder.Append('-');
        }
        return string.Join("-", builder.ToString().Split('-', StringSplitOptions.RemoveEmptyEntries));
    }

    private async Task DongBoThongKeDanhGia(string khoaHocId)
    {
        var danhGia = await db.DanhGiaKhoaHoc.Where(r => r.KhoaHocId == khoaHocId).ToListAsync();
        var kh = await db.KhoaHoc.FirstOrDefaultAsync(c => c.Id == khoaHocId);
        if (kh is null) return;
        kh.DiemDanhGiaTrungBinh = danhGia.Count == 0 ? 0 : danhGia.Average(r => r.DiemDanhGia);
        kh.SoLuongDanhGia = danhGia.Count;
        kh.NgayCapNhat = DateTime.UtcNow;
        await db.SaveChangesAsync();
    }

    private static object MapStudentLesson(BaiHoc lesson, bool isLocked, bool isCompleted, bool includeContent)
    {
        return new
        {
            id = lesson.Id,
            lessonId = lesson.Id,
            courseId = lesson.KhoaHocId,
            sectionId = lesson.ChuongHocId,
            sectionTitle = lesson.ChuongHoc?.TieuDe,
            tieuDe = lesson.TieuDe,
            title = lesson.TieuDe,
            noiDung = includeContent ? lesson.NoiDung : null,
            content = includeContent ? lesson.NoiDung : null,
            videoUrl = includeContent ? lesson.VideoUrl : null,
            anhMinhHoa = includeContent ? lesson.IllustrationUrl : null,
            illustrationUrl = includeContent ? lesson.IllustrationUrl : null,
            thoiLuongGiay = lesson.ThoiLuongGiay ?? 0,
            durationSeconds = lesson.ThoiLuongGiay ?? 0,
            choPhepHocThu = lesson.ChoXemTruoc,
            isPreview = lesson.ChoXemTruoc,
            isPublished = lesson.DaXuatBan,
            isLocked,
            isCompleted,
            hasQuiz = lesson.BaiKiemTra is not null,
            quizId = lesson.BaiKiemTra?.Id,
            quiz = lesson.BaiKiemTra == null ? null : new { lesson.BaiKiemTra.Id, lesson.BaiKiemTra.TieuDe, lesson.BaiKiemTra.DiemDat }
        };
    }

    public static List<string> KiemTraXuatBan(KhoaHoc khoaHoc)
    {
        var loi = new List<string>();
        if (string.IsNullOrWhiteSpace(khoaHoc.MoTa)) loi.Add("Khóa học cần có mô tả trước khi xuất bản");
        if (string.IsNullOrWhiteSpace(khoaHoc.AnhDaiDien)) loi.Add("Khóa học cần có ảnh bìa trước khi xuất bản");
        if (khoaHoc.CacChuongHoc.Sum(s => s.CacBaiHoc.Count) < 1)
            loi.Add("Khóa học phải có ít nhất 1 bài giảng đã xuất bản");
        return loi;
    }
}
