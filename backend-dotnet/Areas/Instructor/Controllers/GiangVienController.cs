using System.Text;
using System.Text.Json;
using System.Text.RegularExpressions;
using System.Data;
using System.Net;
using LMS.Api.Infrastructure.Persistence;
using LMS.Api.DTOs.PhanHoi;
using LMS.Api.DTOs.YeuCau;
using LMS.Api.Domain.Entities;
using LMS.Api.Application.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace LMS.Api.Areas.GiangVien.Controllers;

[ApiController]
[Authorize]
[Area("Instructor")]
public class GiangVienController(ApplicationDbContext db, IWebHostEnvironment env) : ControllerBase
{
    private static readonly HashSet<string> ImageTypes = ["image/png", "image/jpeg", "image/jpg", "image/webp"];
    private static readonly HashSet<string> VideoTypes = ["video/mp4", "video/webm", "video/quicktime"];
    private static readonly HashSet<string> DocumentTypes =
    [
        "application/pdf",
        "application/msword",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "application/vnd.ms-powerpoint",
        "application/vnd.openxmlformats-officedocument.presentationml.presentation"
    ];

    [HttpGet("/api/instructor/courses")]
    public async Task<IResult> DanhSachKhoaHoc()
    {
        var loi = TroGiup.YeuCauGiangVien(User);
        if (loi is not null) return loi;

        var userId = TroGiup.LayUserId(User)!;
        var ds = await db.KhoaHoc.AsNoTracking()
            .Where(c => c.GiangVienId == userId)
            .Include(c => c.CacHinhAnh.OrderBy(i => i.NgayTao))
            .Include(c => c.CacChuongHoc.OrderBy(s => s.ThuTu))
                .ThenInclude(s => s.CacBaiHoc.OrderBy(l => l.ThuTu))
            .Include(c => c.CacGhiDanh)
            .OrderByDescending(c => c.NgayTao)
            .ToListAsync();

        return Results.Ok(ds.Select(MapCourse));
    }

    [HttpGet("/api/instructor/dashboard")]
    public async Task<IResult> Dashboard()
    {
        var loi = TroGiup.YeuCauGiangVien(User);
        if (loi is not null) return loi;

        var userId = TroGiup.LayUserId(User)!;
        var khoaHocs = await db.KhoaHoc.AsNoTracking()
            .Where(c => c.GiangVienId == userId)
            .Include(c => c.CacHinhAnh.OrderBy(i => i.NgayTao))
            .Include(c => c.CacChuongHoc)
                .ThenInclude(s => s.CacBaiHoc)
            .Include(c => c.CacGhiDanh)
            .Include(c => c.CacDonMua)
            .Include(c => c.CacDanhGia)
            .OrderByDescending(c => c.NgayTao)
            .ToListAsync();

        var khoaHocIds = khoaHocs.Select(c => c.Id).ToList();
        var giaoDich = await db.DonMua.AsNoTracking()
            .Where(p => khoaHocIds.Contains(p.KhoaHocId) && p.TrangThai == "COMPLETED")
            .Include(p => p.NguoiDung)
            .Include(p => p.KhoaHoc)
            .OrderByDescending(p => p.NgayTao)
            .ToListAsync();

        var hocVienMoi = await db.GhiDanh.AsNoTracking()
            .Where(e => khoaHocIds.Contains(e.KhoaHocId))
            .Include(e => e.NguoiDung)
            .Include(e => e.KhoaHoc)
            .OrderByDescending(e => e.NgayTao)
            .Take(8)
            .ToListAsync();

        var danhGia = khoaHocs.SelectMany(c => c.CacDanhGia).ToList();
        var khoaHocNhieuHocVienNhat = khoaHocs
            .OrderByDescending(c => c.CacGhiDanh.Count)
            .FirstOrDefault(c => c.CacGhiDanh.Count > 0);

        return Results.Ok(new
        {
            tongDoanhThu = giaoDich.Sum(p => p.SoTienCuoi),
            tongHocVien = khoaHocs.Sum(c => c.CacGhiDanh.Count),
            tongKhoaHoc = khoaHocs.Count,
            khoaHocCongKhai = khoaHocs.Count(IsCoursePublished),
            khoaHocBanNhap = khoaHocs.Count(c => !IsCoursePublished(c) || string.Equals(c.TrangThai, "DRAFT", StringComparison.OrdinalIgnoreCase)),
            danhGiaTrungBinh = danhGia.Count == 0 ? (double?)null : Math.Round(danhGia.Average(r => r.DiemDanhGia), 1),
            hocVienMoi = hocVienMoi.Select(e => new
            {
                id = e.Id,
                hocVienId = e.NguoiDungId,
                tenHocVien = e.NguoiDung?.Ten ?? "Học viên",
                emailHocVien = e.NguoiDung?.Email,
                khoaHocId = e.KhoaHocId,
                tenKhoaHoc = e.KhoaHoc?.TieuDe ?? "Khóa học",
                tienDo = e.TienDo,
                ngayDangKy = e.NgayTao
            }),
            khoaHocCuaToi = khoaHocs.Take(5).Select(MapDashboardCourse),
            khoaHocNhieuHocVienNhat = khoaHocNhieuHocVienNhat is null ? null : MapDashboardCourse(khoaHocNhieuHocVienNhat),
            doanhThuGanDay = giaoDich.Take(5).Select(p => new
            {
                id = p.Id,
                soTien = p.SoTienCuoi,
                amount = p.SoTienCuoi,
                khoaHocId = p.KhoaHocId,
                tenKhoaHoc = p.KhoaHoc?.TieuDe ?? "Khóa học",
                hocVienId = p.NguoiDungId,
                tenHocVien = p.NguoiDung?.Ten ?? "Học viên",
                ngayThanhToan = p.NgayTao,
                createdAt = p.NgayTao
            })
        });
    }

    [HttpGet("/api/instructor/courses/{id}")]
    public async Task<IResult> ChiTietKhoaHoc(string id)
    {
        var kh = await LoadOwnedCourse(id, asNoTracking: true);
        return kh is null ? Results.Json(new { message = "Bạn không có quyền chỉnh sửa khóa học này." }, statusCode: 403) : Results.Ok(MapCourse(kh));
    }

    [HttpPost("/api/instructor/courses")]
    [RequestSizeLimit(230_000_000)]
    public async Task<IResult> TaoKhoaHoc([FromForm] LuuKhoaHocForm yeuCau)
    {
        var loi = TroGiup.YeuCauGiangVien(User);
        if (loi is not null) return loi;

        var tieuDe = (yeuCau.TieuDe ?? yeuCau.Title ?? string.Empty).Trim();
        if (tieuDe.Length < 5) return Results.BadRequest(new { message = "Tiêu đề khóa học tối thiểu 5 ký tự." });

        var moTa = SanitizeRichText(yeuCau.MoTa ?? yeuCau.Description ?? string.Empty);
        if (DemKyTuNoiDung(moTa) < 20) return Results.BadRequest(new { message = "Mô tả khóa học tối thiểu 20 ký tự." });
        if (yeuCau.Gia < 0) return Results.BadRequest(new { message = "Giá khóa học không được âm." });

        string? anhBia = null;
        if (yeuCau.CoverImageFile is not null)
        {
            var validate = ValidateFile(yeuCau.CoverImageFile, ImageTypes, 5 * 1024 * 1024, "Ảnh bìa");
            if (validate is not null) return validate;
            anhBia = await SaveUpload(yeuCau.CoverImageFile, "uploads/courses");
        }

        var selectedCategoryName = "Lập trình";
        string? danhMucId = null;
        if (!string.IsNullOrWhiteSpace(yeuCau.DanhMuc))
        {
            var dm = await db.DanhMuc.AsNoTracking().FirstOrDefaultAsync(d => d.Id == yeuCau.DanhMuc || d.Ten == yeuCau.DanhMuc);
            if (dm is not null)
            {
                selectedCategoryName = dm.Ten;
                danhMucId = dm.Id;
            }
            else
            {
                selectedCategoryName = yeuCau.DanhMuc.Trim();
            }
        }

        var now = DateTime.UtcNow;
        var khoaHoc = new KhoaHoc
        {
            Id = TaoId.Moi(),
            TieuDe = tieuDe,
            DuongDanThanThien = await TaoSlugDuyNhat(tieuDe),
            MoTaNgan = yeuCau.MoTaNgan,
            MoTa = moTa,
            MoTaChiTiet = yeuCau.MoTaChiTiet,
            AnhDaiDien = anhBia ?? yeuCau.Thumbnail,
            DanhMucId = danhMucId,
            ChuyenMuc = selectedCategoryName,
            TrinhDo = string.IsNullOrWhiteSpace(yeuCau.TrinhDo) ? "BEGINNER" : yeuCau.TrinhDo.Trim(),
            Gia = yeuCau.Gia,
            HangThanhVienToiThieu = "BRONZE",
            GiangVienId = TroGiup.LayUserId(User)!,
            DaXuatBan = false,
            TrangThai = "DRAFT",
            NgayTao = now,
            NgayCapNhat = now
        };

        db.KhoaHoc.Add(khoaHoc);
        if (!string.IsNullOrWhiteSpace(khoaHoc.AnhDaiDien))
        {
            khoaHoc.CacHinhAnh.Add(new KhoaHocAnh
            {
                Id = TaoId.Moi(),
                KhoaHocId = khoaHoc.Id,
                AnhUrl = khoaHoc.AnhDaiDien,
                AnhChinh = true,
                NgayTao = now
            });
        }
        await db.SaveChangesAsync();

        return Results.Created($"/api/instructor/courses/{khoaHoc.Id}", MapCourse(khoaHoc));
    }

    [HttpPut("/api/instructor/courses/{id}")]
    [RequestSizeLimit(230_000_000)]
    public async Task<IResult> CapNhatKhoaHoc(string id, [FromForm] LuuKhoaHocForm yeuCau)
    {
        var kh = await LoadOwnedCourse(id);
        if (kh is null) return Results.Json(new { message = "Bạn không có quyền chỉnh sửa khóa học này." }, statusCode: 403);

        var tieuDe = (yeuCau.TieuDe ?? yeuCau.Title)?.Trim();
        if (!string.IsNullOrWhiteSpace(tieuDe) && tieuDe != kh.TieuDe)
        {
            if (tieuDe.Length < 5) return Results.BadRequest(new { message = "Tiêu đề khóa học tối thiểu 5 ký tự." });
            kh.TieuDe = tieuDe;
            kh.DuongDanThanThien = await TaoSlugDuyNhat(kh.TieuDe, kh.Id);
        }

        var moTa = yeuCau.MoTa ?? yeuCau.Description;
        if (moTa is not null)
        {
            var clean = SanitizeRichText(moTa);
            if (DemKyTuNoiDung(clean) < 20) return Results.BadRequest(new { message = "Mô tả khóa học tối thiểu 20 ký tự." });
            kh.MoTa = clean;
        }
        if (yeuCau.MoTaNgan is not null) kh.MoTaNgan = yeuCau.MoTaNgan.Trim();
        if (yeuCau.MoTaChiTiet is not null) kh.MoTaChiTiet = yeuCau.MoTaChiTiet.Trim();
        if (!string.IsNullOrWhiteSpace(yeuCau.DanhMuc))
        {
            var dm = await db.DanhMuc.AsNoTracking().FirstOrDefaultAsync(d => d.Id == yeuCau.DanhMuc || d.Ten == yeuCau.DanhMuc);
            if (dm is not null)
            {
                kh.ChuyenMuc = dm.Ten;
                kh.DanhMucId = dm.Id;
            }
            else
            {
                kh.ChuyenMuc = yeuCau.DanhMuc.Trim();
            }
        }
        if (!string.IsNullOrWhiteSpace(yeuCau.TrinhDo)) kh.TrinhDo = yeuCau.TrinhDo.Trim();
        if (!string.IsNullOrWhiteSpace(yeuCau.TrangThai))
        {
            kh.TrangThai = NormalizeCourseStatus(yeuCau.TrangThai);
            kh.DaXuatBan = kh.TrangThai == "PUBLIC";
        }

        if (yeuCau.Gia < 0) return Results.BadRequest(new { message = "Giá khóa học không được âm." });
        kh.Gia = yeuCau.Gia;

        if (yeuCau.CoverImageFile is not null)
        {
            var validate = ValidateFile(yeuCau.CoverImageFile, ImageTypes, 5 * 1024 * 1024, "Ảnh bìa");
            if (validate is not null) return validate;
            kh.AnhDaiDien = await SaveUpload(yeuCau.CoverImageFile, "uploads/courses");
            await ThemAnhKhoaHoc(kh, kh.AnhDaiDien, true);
        }

        kh.NgayCapNhat = DateTime.UtcNow;
        await db.SaveChangesAsync();
        return Results.Ok(MapCourse(kh));
    }

    [HttpPost("/api/instructor/courses/{id}/images")]
    [RequestSizeLimit(60 * 1024 * 1024)]
    public async Task<IResult> UploadAnhKhoaHoc(string id, [FromForm] List<IFormFile> files)
    {
        var kh = await LoadOwnedCourse(id);
        if (kh is null) return Results.Json(new { message = "Báº¡n khÃ´ng cÃ³ quyá»n chá»‰nh sá»­a khÃ³a há»c nÃ y." }, statusCode: 403);
        if (files is null || files.Count == 0) return Results.BadRequest(new { message = "Vui lÃ²ng chá»n Ã­t nháº¥t má»™t áº£nh." });

        await DongBoAnhDaiDienCu(kh);

        var errors = new List<string>();
        foreach (var file in files.Where(file => file is not null && file.Length > 0))
        {
            var validate = ValidateFile(file, ImageTypes, 5 * 1024 * 1024, "áº¢nh khÃ³a há»c");
            if (validate is not null)
            {
                errors.Add(file.FileName);
                continue;
            }

            var url = await SaveUpload(file, "uploads/courses");
            await ThemAnhKhoaHoc(kh, url, !kh.CacHinhAnh.Any(item => item.AnhChinh));
        }

        kh.NgayCapNhat = DateTime.UtcNow;
        await db.SaveChangesAsync();

        return Results.Ok(new
        {
            message = errors.Count == 0 ? "ÄÃ£ táº£i áº£nh khÃ³a há»c." : $"Má»™t sá»‘ áº£nh khÃ´ng há»£p lá»‡: {string.Join(", ", errors)}",
            course = MapCourse(kh)
        });
    }

    [HttpPatch("/api/instructor/courses/{id}/images/{imageId}/primary")]
    public async Task<IResult> ChonAnhChinhKhoaHoc(string id, string imageId)
    {
        var kh = await LoadOwnedCourse(id);
        if (kh is null) return Results.Json(new { message = "Báº¡n khÃ´ng cÃ³ quyá»n chá»‰nh sá»­a khÃ³a há»c nÃ y." }, statusCode: 403);

        var image = kh.CacHinhAnh.FirstOrDefault(item => item.Id == imageId);
        if (image is null) return Results.NotFound(new { message = "KhÃ´ng tÃ¬m tháº¥y áº£nh khÃ³a há»c." });

        foreach (var item in kh.CacHinhAnh)
        {
            item.AnhChinh = item.Id == imageId;
        }

        kh.AnhDaiDien = image.AnhUrl;
        kh.NgayCapNhat = DateTime.UtcNow;
        await db.SaveChangesAsync();
        return Results.Ok(MapCourse(kh));
    }

    [HttpDelete("/api/instructor/courses/{id}/images/{imageId}")]
    public async Task<IResult> XoaAnhKhoaHoc(string id, string imageId)
    {
        var kh = await LoadOwnedCourse(id);
        if (kh is null) return Results.Json(new { message = "Báº¡n khÃ´ng cÃ³ quyá»n chá»‰nh sá»­a khÃ³a há»c nÃ y." }, statusCode: 403);

        var image = kh.CacHinhAnh.FirstOrDefault(item => item.Id == imageId);
        if (image is null) return Results.NotFound(new { message = "KhÃ´ng tÃ¬m tháº¥y áº£nh khÃ³a há»c." });

        var wasPrimary = image.AnhChinh || string.Equals(kh.AnhDaiDien, image.AnhUrl, StringComparison.OrdinalIgnoreCase);
        XoaFileUpload(image.AnhUrl);
        db.KhoaHocAnh.Remove(image);
        kh.CacHinhAnh.Remove(image);

        if (wasPrimary)
        {
            var next = kh.CacHinhAnh.OrderBy(item => item.NgayTao).FirstOrDefault();
            if (next is not null)
            {
                next.AnhChinh = true;
                kh.AnhDaiDien = next.AnhUrl;
            }
            else
            {
                kh.AnhDaiDien = null;
            }
        }

        kh.NgayCapNhat = DateTime.UtcNow;
        await db.SaveChangesAsync();
        return Results.Ok(MapCourse(kh));
    }

    [HttpGet("/api/instructor/courses/{id}/curriculum")]
    public async Task<IResult> ChuongTrinh(string id)
    {
        var kh = await LoadOwnedCourse(id, asNoTracking: true);
        return kh is null ? Results.Json(new { message = "Bạn không có quyền chỉnh sửa khóa học này." }, statusCode: 403) : Results.Ok(MapCourse(kh));
    }

    [HttpPatch("/api/instructor/courses/{id}/publish")]
    public async Task<IResult> XuatBan(string id, [FromBody] XuatBanRequest yeuCau)
    {
        var kh = await LoadOwnedCourse(id);
        if (kh is null) return Results.Json(new { message = "Bạn không có quyền chỉnh sửa khóa học này." }, statusCode: 403);

        if (yeuCau.IsPublished)
        {
            kh.StartDate = yeuCau.StartDate;
            kh.EndDate = yeuCau.EndDate;

            if (kh.StartDate is null || kh.EndDate is null || kh.EndDate.Value.Date <= kh.StartDate.Value.Date)
            {
                return Results.BadRequest(new
                {
                    message = "Vui lòng chọn ngày bắt đầu và ngày kết thúc hợp lệ. Ngày kết thúc phải sau ngày bắt đầu."
                });
            }
        }

        var errors = PublishErrors(kh);
        if (yeuCau.IsPublished && errors.Count > 0)
        {
            return Results.BadRequest(new
            {
                message = "Khóa học cần có ít nhất 1 chương và 1 bài học trước khi xuất bản.",
                errors
            });
        }

        kh.DaXuatBan = yeuCau.IsPublished;
        kh.TrangThai = yeuCau.IsPublished ? "PUBLIC" : "DRAFT";
        kh.NgayXuatBan = yeuCau.IsPublished ? DateTime.UtcNow : kh.NgayXuatBan;
        kh.NgayCapNhat = DateTime.UtcNow;
        await db.SaveChangesAsync();

        var reloaded = await LoadOwnedCourse(id, asNoTracking: true);
        return Results.Ok(MapCourse(reloaded!));
    }

    [HttpPatch("/api/instructor/courses/{id}/hide")]
    public async Task<IResult> AnKhoaHoc(string id)
    {
        var kh = await LoadOwnedCourse(id);
        if (kh is null) return Results.Json(new { message = "Bạn không có quyền chỉnh sửa khóa học này." }, statusCode: 403);

        kh.DaXuatBan = false;
        kh.TrangThai = "HIDDEN";
        kh.NgayCapNhat = DateTime.UtcNow;
        await db.SaveChangesAsync();

        var reloaded = await LoadOwnedCourse(id, asNoTracking: true);
        return Results.Ok(MapCourse(reloaded!));
    }

    [HttpDelete("/api/instructor/courses/{id}")]
    public async Task<IResult> XoaKhoaHoc(string id)
    {
        var kh = await LoadOwnedCourse(id);
        if (kh is null) return Results.Json(new { message = "Bạn không có quyền chỉnh sửa khóa học này." }, statusCode: 403);
        if (await db.DonMua.AnyAsync(p => p.KhoaHocId == id)) return Results.BadRequest(new { message = "Không thể xóa khóa học đã có sinh viên mua. Bạn chỉ có thể ẩn khóa học." });
        if (await db.GhiDanh.AnyAsync(e => e.KhoaHocId == id)) return Results.BadRequest(new { message = "Không thể xóa khóa học đã có học viên đăng ký. Bạn chỉ có thể ẩn khóa học." });

        // Remove quiz submissions, questions, and quizzes (child-first order)
        var lessonIds = await db.BaiHoc.Where(l => l.KhoaHocId == id).Select(l => l.Id).ToListAsync();
        var quizIds = await db.BaiKiemTra.Where(q => lessonIds.Contains(q.BaiHocId)).Select(q => q.Id).ToListAsync();
        if (quizIds.Count > 0)
        {
            db.BaiNopKiemTra.RemoveRange(db.BaiNopKiemTra.Where(s => quizIds.Contains(s.BaiKiemTraId)));
            db.CauHoiKiemTra.RemoveRange(db.CauHoiKiemTra.Where(q => quizIds.Contains(q.BaiKiemTraId)));
            db.BaiKiemTra.RemoveRange(db.BaiKiemTra.Where(q => quizIds.Contains(q.Id)));
        }

        // Remove lesson-level children: comments, lesson progresses
        if (lessonIds.Count > 0)
        {
            db.BinhLuan.RemoveRange(db.BinhLuan.Where(c => lessonIds.Contains(c.BaiHocId)));
            db.TienDoBaiHoc.RemoveRange(db.TienDoBaiHoc.Where(p => lessonIds.Contains(p.BaiHocId)));
        }

        // Remove coupon children (usages, recipients), then coupons
        var couponIds = await db.MaGiamGia.Where(c => c.KhoaHocId == id).Select(c => c.Id).ToListAsync();
        if (couponIds.Count > 0)
        {
            db.LichSuDungMaGiamGia.RemoveRange(db.LichSuDungMaGiamGia.Where(u => couponIds.Contains(u.MaGiamGiaId)));
            db.NguoiNhanMaGiamGia.RemoveRange(db.NguoiNhanMaGiamGia.Where(r => couponIds.Contains(r.MaGiamGiaId)));
            db.MaGiamGia.RemoveRange(db.MaGiamGia.Where(c => couponIds.Contains(c.Id)));
        }

        // Remove other course-level children
        db.DanhGiaKhoaHoc.RemoveRange(db.DanhGiaKhoaHoc.Where(r => r.KhoaHocId == id));
        db.ChungChi.RemoveRange(db.ChungChi.Where(c => c.KhoaHocId == id));
        db.KhoaHocDaLuu.RemoveRange(db.KhoaHocDaLuu.Where(s => s.KhoaHocId == id));
        db.LichSuDungMaGiamGia.RemoveRange(db.LichSuDungMaGiamGia.Where(u => u.KhoaHocId == id));

        // Nullify nullable CourseId references
        await db.GiaoDichVi.Where(w => w.KhoaHocId == id).ExecuteUpdateAsync(s => s.SetProperty(w => w.KhoaHocId, (string?)null));
        await db.CuocTroChuyen.Where(c => c.KhoaHocId == id).ExecuteUpdateAsync(s => s.SetProperty(c => c.KhoaHocId, (string?)null));
        await db.NguoiNhanMaGiamGia.Where(r => r.SourceCourseId == id).ExecuteUpdateAsync(s => s.SetProperty(r => r.SourceCourseId, (string?)null));

        // Remove assignments, lessons, sections, then the course itself
        db.BaiTap.RemoveRange(db.BaiTap.Where(assignment => assignment.KhoaHocId == id));
        db.BaiHoc.RemoveRange(db.BaiHoc.Where(lesson => lesson.KhoaHocId == id));
        db.ChuongHoc.RemoveRange(db.ChuongHoc.Where(section => section.KhoaHocId == id));
        db.KhoaHoc.Remove(kh);
        await db.SaveChangesAsync();
        return Results.Ok(new { message = "Đã xóa khóa học." });
    }

    [HttpPost("/api/instructor/courses/{courseId}/sections")]
    public async Task<IResult> ThemChuong(string courseId, [FromBody] LuuChuongForm yeuCau)
    {
        var kh = await LoadOwnedCourse(courseId);
        if (kh is null) return Results.Json(new { message = "Bạn không có quyền chỉnh sửa khóa học này." }, statusCode: 403);

        var tieuDe = (yeuCau.TieuDe ?? yeuCau.Title ?? string.Empty).Trim();
        if (tieuDe.Length < 3) return Results.BadRequest(new { message = "Tên chương tối thiểu 3 ký tự." });
        var thuTu = Math.Max(1, yeuCau.ThuTu ?? kh.CacChuongHoc.Count + 1);
        var now = DateTime.UtcNow;

        var chuong = new ChuongHoc
        {
            Id = TaoId.Moi(),
            TieuDe = tieuDe,
            MoTa = yeuCau.MoTa ?? yeuCau.Description,
            ThuTu = thuTu,
            KhoaHocId = courseId,
            NgayTao = now,
            NgayCapNhat = now
        };

        db.ChuongHoc.Add(chuong);
        await db.SaveChangesAsync();
        await ChuanHoaViTriChuong(courseId);
        return Results.Created($"/api/instructor/sections/{chuong.Id}", MapSection(chuong));
    }

    [HttpPut("/api/instructor/sections/{sectionId}")]
    public async Task<IResult> CapNhatChuongNgan(string sectionId, [FromBody] LuuChuongForm yeuCau)
    {
        var chuong = await LoadOwnedSection(sectionId);
        if (chuong is null) return Results.Json(new { message = "Bạn không có quyền chỉnh sửa khóa học này." }, statusCode: 403);
        return await UpdateSection(chuong, yeuCau);
    }

    [HttpPut("/api/instructor/courses/{courseId}/sections/{sectionId}")]
    public async Task<IResult> CapNhatChuong(string courseId, string sectionId, [FromBody] LuuChuongForm yeuCau)
    {
        var chuong = await LoadOwnedSection(sectionId, courseId);
        if (chuong is null) return Results.Json(new { message = "Bạn không có quyền chỉnh sửa khóa học này." }, statusCode: 403);
        return await UpdateSection(chuong, yeuCau);
    }

    [HttpDelete("/api/instructor/sections/{sectionId}")]
    public async Task<IResult> XoaChuongNgan(string sectionId)
    {
        var chuong = await LoadOwnedSection(sectionId);
        if (chuong is null) return Results.Json(new { message = "Bạn không có quyền chỉnh sửa khóa học này." }, statusCode: 403);
        return await DeleteSection(chuong);
    }

    [HttpDelete("/api/instructor/courses/{courseId}/sections/{sectionId}")]
    public async Task<IResult> XoaChuong(string courseId, string sectionId)
    {
        var chuong = await LoadOwnedSection(sectionId, courseId);
        if (chuong is null) return Results.Json(new { message = "Bạn không có quyền chỉnh sửa khóa học này." }, statusCode: 403);
        return await DeleteSection(chuong);
    }

    [HttpPost("/api/instructor/sections/{sectionId}/lessons")]
    [RequestSizeLimit(230_000_000)]
    public async Task<IResult> ThemBaiHoc(string sectionId, [FromForm] LuuBaiHocForm yeuCau)
    {
        var chuong = await LoadOwnedSection(sectionId);
        if (chuong is null) return Results.Json(new { message = "Bạn không có quyền chỉnh sửa khóa học này." }, statusCode: 403);

        var validation = ValidateLessonForm(yeuCau);
        if (validation is not null) return validation;

        var now = DateTime.UtcNow;
        var baiHoc = new BaiHoc
        {
            Id = TaoId.Moi(),
            TieuDe = yeuCau.TieuDe!.Trim(),
            NoiDung = string.IsNullOrWhiteSpace(yeuCau.NoiDung) ? null : yeuCau.NoiDung.Trim(),
            ThoiLuongGiay = Math.Max(0, yeuCau.ThoiLuongGiay),
            ChoXemTruoc = yeuCau.ChoPhepHocThu,
            TrangThai = NormalizeLessonStatus(yeuCau.TrangThai),
            DaXuatBan = NormalizeLessonStatus(yeuCau.TrangThai) == "PUBLIC",
            ThuTu = Math.Max(1, yeuCau.ThuTu),
            KhoaHocId = chuong.KhoaHocId,
            ChuongHocId = sectionId,
            NgayTao = now,
            NgayCapNhat = now
        };

        if (yeuCau.VideoFile is not null) baiHoc.VideoUrl = await SaveUpload(yeuCau.VideoFile, "uploads/lessons/videos");
        if (yeuCau.ImageFiles is not null && yeuCau.ImageFiles.Any())
        {
            var imageUrls = new List<string>();
            foreach (var img in yeuCau.ImageFiles)
            {
                var url = await SaveUpload(img, "uploads/lessons/images");
                imageUrls.Add(url);
            }
            baiHoc.IllustrationUrl = string.Join(",", imageUrls);
        }
        if (yeuCau.RemoveDocument)
        {
            baiHoc.FileUrl = null;
        }
        else if (yeuCau.DocumentFile is not null)
        {
            baiHoc.FileUrl = await SaveUpload(yeuCau.DocumentFile, "uploads/lessons/files");
        }
        else if (yeuCau.FileUrl is not null)
        {
            baiHoc.FileUrl = string.IsNullOrWhiteSpace(yeuCau.FileUrl) ? null : yeuCau.FileUrl.Trim();
        }

        db.BaiHoc.Add(baiHoc);
        await db.SaveChangesAsync();
        await ChuanHoaViTriBaiGiang(sectionId);
        await TinhLaiThoiLuong(chuong.KhoaHocId);
        return Results.Created($"/api/instructor/lessons/{baiHoc.Id}", MapLesson(baiHoc));
    }

    [HttpPut("/api/instructor/lessons/{lessonId}")]
    [RequestSizeLimit(230_000_000)]
    public async Task<IResult> CapNhatBaiHoc(string lessonId, [FromForm] LuuBaiHocForm yeuCau)
    {
        var baiHoc = await LoadOwnedLesson(lessonId);
        if (baiHoc is null) return Results.Json(new { message = "Bạn không có quyền chỉnh sửa khóa học này." }, statusCode: 403);

        var validation = ValidateLessonForm(yeuCau, isUpdate: true);
        if (validation is not null) return validation;

        baiHoc.TieuDe = yeuCau.TieuDe!.Trim();
        baiHoc.NoiDung = string.IsNullOrWhiteSpace(yeuCau.NoiDung) ? null : yeuCau.NoiDung.Trim();
        baiHoc.ThoiLuongGiay = Math.Max(0, yeuCau.ThoiLuongGiay);
        baiHoc.ChoXemTruoc = yeuCau.ChoPhepHocThu;
        baiHoc.TrangThai = NormalizeLessonStatus(yeuCau.TrangThai);
        baiHoc.DaXuatBan = baiHoc.TrangThai == "PUBLIC";
        baiHoc.ThuTu = Math.Max(1, yeuCau.ThuTu);
        baiHoc.NgayCapNhat = DateTime.UtcNow;

        if (yeuCau.RemoveVideo)
        {
            baiHoc.VideoUrl = null;
            baiHoc.ThoiLuongGiay = 0;
        }
        else if (yeuCau.VideoFile is not null)
        {
            baiHoc.VideoUrl = await SaveUpload(yeuCau.VideoFile, "uploads/lessons/videos");
        }
        else if (yeuCau.VideoUrl is not null)
        {
            baiHoc.VideoUrl = string.IsNullOrWhiteSpace(yeuCau.VideoUrl) ? null : yeuCau.VideoUrl.Trim();
        }

        if (yeuCau.RemoveImage)
        {
            baiHoc.IllustrationUrl = null;
        }
        else if (yeuCau.ImageFiles is not null && yeuCau.ImageFiles.Any())
        {
            var imageUrls = new List<string>();
            foreach (var img in yeuCau.ImageFiles)
            {
                var url = await SaveUpload(img, "uploads/lessons/images");
                imageUrls.Add(url);
            }
            baiHoc.IllustrationUrl = string.Join(",", imageUrls);
        }
        else if (yeuCau.ImageUrls is not null)
        {
            baiHoc.IllustrationUrl = string.IsNullOrWhiteSpace(yeuCau.ImageUrls) ? null : yeuCau.ImageUrls.Trim();
        }

        if (yeuCau.DocumentFile is not null) baiHoc.FileUrl = await SaveUpload(yeuCau.DocumentFile, "uploads/lessons/files");

        await db.SaveChangesAsync();
        await ChuanHoaViTriBaiGiang(baiHoc.ChuongHocId);
        await TinhLaiThoiLuong(baiHoc.KhoaHocId);
        return Results.Ok(MapLesson(baiHoc));
    }

    [HttpDelete("/api/instructor/lessons/{lessonId}")]
    public async Task<IResult> XoaBaiHoc(string lessonId)
    {
        var baiHoc = await LoadOwnedLesson(lessonId);
        if (baiHoc is null) return Results.Json(new { message = "Bạn không có quyền chỉnh sửa khóa học này." }, statusCode: 403);

        var sectionId = baiHoc.ChuongHocId;
        var courseId = baiHoc.KhoaHocId;
        db.BaiHoc.Remove(baiHoc);
        await db.SaveChangesAsync();
        await ChuanHoaViTriBaiGiang(sectionId);
        await TinhLaiThoiLuong(courseId);
        return Results.Ok(new { message = "Đã xóa bài học." });
    }

    [HttpGet("/api/instructor/revenue")]
    public async Task<IResult> DoanhThu()
    {
        var loi = TroGiup.YeuCauGiangVien(User); if (loi is not null) return loi;
        var userId = TroGiup.LayUserId(User)!;
        var khoaHocs = await db.KhoaHoc.AsNoTracking()
            .Where(c => c.GiangVienId == userId)
            .Include(c => c.CacGhiDanh)
            .Include(c => c.CacDonMua)
                .ThenInclude(p => p.NguoiDung)
            .OrderByDescending(c => c.NgayTao)
            .ToListAsync();

        var khoaHocIds = khoaHocs.Select(c => c.Id).ToList();
        var giaoDichHoanTat = await db.DonMua.AsNoTracking()
            .Where(p => khoaHocIds.Contains(p.KhoaHocId) && p.TrangThai == "COMPLETED")
            .Include(p => p.NguoiDung)
            .Include(p => p.KhoaHoc)
            .OrderByDescending(p => p.NgayTao)
            .ToListAsync();

        var tongDoanhThu = giaoDichHoanTat.Sum(p => p.SoTienCuoi);
        var lichSuRutTien = await db.InstructorWithdrawals.AsNoTracking()
            .Where(item => item.GiangVienId == userId && item.TrangThai == "COMPLETED")
            .OrderByDescending(item => item.NgayTao)
            .ToListAsync();
        var doanhThuDaThanhToan = lichSuRutTien.Sum(item => item.SoTien);
        var doanhThuChoThanhToan = Math.Max(0, tongDoanhThu - doanhThuDaThanhToan);
        var giaoDichDaThanhToan = new HashSet<string>();
        var soTienDaThanhToanConLai = doanhThuDaThanhToan;
        foreach (var giaoDich in giaoDichHoanTat.OrderBy(item => item.NgayTao))
        {
            if (soTienDaThanhToanConLai < giaoDich.SoTienCuoi) break;
            giaoDichDaThanhToan.Add(giaoDich.Id);
            soTienDaThanhToanConLai -= giaoDich.SoTienCuoi;
        }
        var soMua = giaoDichHoanTat.Count;
        var soHocVienMua = giaoDichHoanTat.Select(p => p.NguoiDungId).Distinct().Count();
        var giaTriTrungBinh = soMua == 0 ? 0 : (int)Math.Round(tongDoanhThu / (double)soMua);

        var lichSuDoanhThu = giaoDichHoanTat.Select(p => new GiaoDichDoanhThu(
                p.Id, "COURSE_REVENUE", p.SoTienCuoi,
                giaoDichDaThanhToan.Contains(p.Id) ? "PAID" : "PENDING",
                giaoDichDaThanhToan.Contains(p.Id) ? "Đã thanh toán" : "Chờ thanh toán",
                null, null, null, null, p.NgayTao,
                p.NguoiDung == null ? null : new { p.NguoiDung.Id, p.NguoiDung.Ten, p.NguoiDung.Email, p.NguoiDung.AnhDaiDien },
                p.KhoaHoc == null ? null : new { p.KhoaHoc.Id, p.KhoaHoc.TieuDe, p.KhoaHoc.AnhDaiDien }))
            .Concat(lichSuRutTien.Select(item => new GiaoDichDoanhThu(
                item.Id, "DEMO_WITHDRAWAL", -item.SoTien, item.TrangThai, "Rút tiền demo thành công", item.NoiDung,
                item.TenNganHang, item.SoTaiKhoan, item.ChuTaiKhoan, item.NgayTao, null, null)))
            .OrderByDescending(item => item.NgayTao)
            .Take(20)
            .ToList();

        return Results.Ok(new
        {
            totalRevenue = tongDoanhThu,
            pendingRevenue = doanhThuChoThanhToan,
            paidRevenue = doanhThuDaThanhToan,
            totalPurchases = soMua,
            totalStudents = soHocVienMua,
            averageOrderValue = giaTriTrungBinh,
            courseCount = khoaHocs.Count,
            courses = khoaHocs.Select(c =>
            {
                var purchases = c.CacDonMua.Where(p => p.TrangThai == "COMPLETED").ToList();
                return new
                {
                    c.Id,
                    title = c.TieuDe,
                    price = c.Gia,
                    isPublished = IsCoursePublished(c),
                    status = c.TrangThai,
                    enrollments = c.CacGhiDanh.Count,
                    purchases = purchases.Count,
                    revenue = purchases.Sum(p => p.SoTienCuoi),
                    averageRating = c.DiemDanhGiaTrungBinh,
                    reviewCount = c.SoLuongDanhGia,
                    createdAt = c.NgayTao,
                    updatedAt = c.NgayCapNhat
                };
            }),
            recentPurchases = giaoDichHoanTat.Take(10).Select(p => new
            {
                p.Id,
                amount = p.SoTienCuoi,
                payoutStatus = giaoDichDaThanhToan.Contains(p.Id) ? "PAID" : "PENDING",
                originalAmount = p.SoTienGoc,
                discountAmount = p.SoTienGiam,
                status = p.TrangThai,
                createdAt = p.NgayTao,
                user = p.NguoiDung == null ? null : new { p.NguoiDung.Id, p.NguoiDung.Ten, p.NguoiDung.Email, p.NguoiDung.AnhDaiDien },
                course = p.KhoaHoc == null ? null : new { p.KhoaHoc.Id, p.KhoaHoc.TieuDe, p.KhoaHoc.AnhDaiDien }
            }),
            recentTransactions = lichSuDoanhThu.Select(t => new
            {
                t.Id,
                t.Type,
                t.Amount,
                t.PayoutStatus,
                t.StatusLabel,
                t.Note,
                t.BankName,
                t.AccountNumber,
                t.AccountHolder,
                createdAt = t.NgayTao,
                t.User,
                t.Course
            })
        });
    }

    [HttpPost("/api/instructor/revenue/withdraw-demo")]
    public async Task<IResult> RutTienDemo([FromBody] RutTienDemoRequest yeuCau)
    {
        var loi = TroGiup.YeuCauGiangVien(User); if (loi is not null) return loi;
        var userId = TroGiup.LayUserId(User)!;

        if (yeuCau.SoTien < 50_000)
        {
            return Results.BadRequest(new { message = "Số tiền rút không hợp lệ" });
        }

        var giangVien = await db.NguoiDung.FirstOrDefaultAsync(item => item.Id == userId);
        var taiKhoanNhanTien = DocTaiKhoanNhanTien(giangVien?.CaiDat);
        if (taiKhoanNhanTien is null)
        {
            return Results.BadRequest(new { message = "Vui lòng lưu tài khoản nhận tiền trước khi rút" });
        }

        var strategy = db.Database.CreateExecutionStrategy();
        var ketQua = await strategy.ExecuteAsync(async () =>
        {
            await using var transaction = await db.Database.BeginTransactionAsync(IsolationLevel.Serializable);
            var tongDoanhThu = await db.DonMua
                .Where(item => item.TrangThai == "COMPLETED" && item.KhoaHoc!.GiangVienId == userId)
                .SumAsync(item => item.SoTienCuoi);
            var doanhThuDaThanhToan = await db.InstructorWithdrawals
                .Where(item => item.GiangVienId == userId && item.TrangThai == "COMPLETED")
                .SumAsync(item => item.SoTien);
            var doanhThuChoThanhToan = Math.Max(0, tongDoanhThu - doanhThuDaThanhToan);

            if (yeuCau.SoTien > doanhThuChoThanhToan)
            {
                await transaction.RollbackAsync();
                return new KetQuaRutTien(false, tongDoanhThu, doanhThuChoThanhToan, doanhThuDaThanhToan);
            }

            db.InstructorWithdrawals.Add(new RutTienGiangVien
            {
                Id = TaoId.Moi(),
                GiangVienId = userId,
                SoTien = yeuCau.SoTien,
                TrangThai = "COMPLETED",
                TenNganHang = taiKhoanNhanTien.TenNganHang,
                SoTaiKhoan = taiKhoanNhanTien.SoTaiKhoan,
                ChuTaiKhoan = taiKhoanNhanTien.ChuTaiKhoan,
                NoiDung = string.IsNullOrWhiteSpace(yeuCau.GhiChu) ? null : yeuCau.GhiChu.Trim(),
                NgayTao = DateTime.UtcNow
            });
            await db.SaveChangesAsync();
            await transaction.CommitAsync();
            return new KetQuaRutTien(true, tongDoanhThu, doanhThuChoThanhToan - yeuCau.SoTien, doanhThuDaThanhToan + yeuCau.SoTien);
        });

        if (!ketQua.ThanhCong)
        {
            return Results.BadRequest(new { message = "Số tiền rút vượt quá doanh thu chờ thanh toán" });
        }

        return Results.Ok(new
        {
            message = "Rút tiền demo thành công",
            tongDoanhThu = ketQua.TongDoanhThu,
            doanhThuChoThanhToan = ketQua.DoanhThuChoThanhToan,
            doanhThuDaThanhToan = ketQua.DoanhThuDaThanhToan
        });
    }

    private static TaiKhoanNhanTien? DocTaiKhoanNhanTien(string? settings)
    {
        if (string.IsNullOrWhiteSpace(settings)) return null;

        try
        {
            using var document = JsonDocument.Parse(settings);
            if (!document.RootElement.TryGetProperty("payoutAccount", out var account)) return null;
            var bankName = account.TryGetProperty("bankName", out var bank) ? bank.GetString()?.Trim() : null;
            var accountNumber = account.TryGetProperty("accountNumber", out var number) ? number.GetString()?.Trim() : null;
            var accountHolder = account.TryGetProperty("accountHolder", out var holder) ? holder.GetString()?.Trim() : null;

            return string.IsNullOrWhiteSpace(bankName) || string.IsNullOrWhiteSpace(accountNumber) || string.IsNullOrWhiteSpace(accountHolder)
                ? null
                : new TaiKhoanNhanTien(bankName, accountNumber, accountHolder);
        }
        catch (JsonException)
        {
            return null;
        }
    }

    private sealed record TaiKhoanNhanTien(string TenNganHang, string SoTaiKhoan, string ChuTaiKhoan);
    private sealed record KetQuaRutTien(bool ThanhCong, int TongDoanhThu, int DoanhThuChoThanhToan, int DoanhThuDaThanhToan);
    private sealed record GiaoDichDoanhThu(
        string Id,
        string Type,
        int Amount,
        string PayoutStatus,
        string StatusLabel,
        string? Note,
        string? BankName,
        string? AccountNumber,
        string? AccountHolder,
        DateTime NgayTao,
        object? User,
        object? Course);

    [HttpGet("/api/instructor/wallet")]
    [HttpGet("/instructor/wallet")]
    public async Task<IResult> ViDoanhThuGiangVien()
    {
        var loi = TroGiup.YeuCauGiangVien(User); if (loi is not null) return loi;
        var userId = TroGiup.LayUserId(User)!;
        var data = await TaoDuLieuViDoanhThu(userId);
        return Results.Ok(TaoPhanHoiViDoanhThu(data));
    }

    [HttpGet("/api/instructor/wallet/history")]
    [HttpGet("/instructor/wallet/history")]
    public async Task<IResult> LichSuViDoanhThuGiangVien()
    {
        var loi = TroGiup.YeuCauGiangVien(User); if (loi is not null) return loi;
        var userId = TroGiup.LayUserId(User)!;
        var data = await TaoDuLieuViDoanhThu(userId, 100);
        return Results.Ok(data.History);
    }

    [HttpPost("/api/instructor/withdraw-request")]
    [HttpPost("/instructor/withdraw-request")]
    public async Task<IResult> TaoYeuCauRutTien([FromBody] RutTienGiangVienRequest yeuCau)
    {
        var loi = TroGiup.YeuCauGiangVien(User); if (loi is not null) return loi;
        var userId = TroGiup.LayUserId(User)!;

        if (yeuCau.SoTien < SoTienRutToiThieu)
        {
            return Results.BadRequest(new { message = $"Số tiền rút tối thiểu là {TroGiup.DinhDangTienVND(SoTienRutToiThieu)}." });
        }

        if (string.IsNullOrWhiteSpace(yeuCau.BankName) ||
            string.IsNullOrWhiteSpace(yeuCau.AccountHolder) ||
            string.IsNullOrWhiteSpace(yeuCau.AccountNumber))
        {
            return Results.BadRequest(new { message = "Vui lòng nhập đầy đủ ngân hàng, chủ tài khoản và số tài khoản." });
        }

        var strategy = db.Database.CreateExecutionStrategy();
        var ketQua = await strategy.ExecuteAsync(async () =>
        {
            await using var transaction = await db.Database.BeginTransactionAsync(IsolationLevel.Serializable);
            var data = await TaoDuLieuViDoanhThu(userId);
            if (yeuCau.SoTien > data.AvailableBalance)
            {
                await transaction.RollbackAsync();
                return new KetQuaYeuCauRutTien(false, data);
            }

            db.InstructorWithdrawals.Add(new RutTienGiangVien
            {
                Id = TaoId.Moi(),
                GiangVienId = userId,
                SoTien = yeuCau.SoTien,
                TrangThai = "PENDING",
                TenNganHang = yeuCau.BankName.Trim(),
                ChuTaiKhoan = yeuCau.AccountHolder.Trim(),
                SoTaiKhoan = yeuCau.AccountNumber.Trim(),
                NoiDung = TaoGhiChuRutTien(yeuCau.Branch, yeuCau.GhiChu),
                NgayTao = DateTime.UtcNow
            });

            await db.SaveChangesAsync();
            await transaction.CommitAsync();

            var nextData = await TaoDuLieuViDoanhThu(userId);
            return new KetQuaYeuCauRutTien(true, nextData);
        });

        if (!ketQua.ThanhCong)
        {
            return Results.BadRequest(new { message = "Số tiền rút vượt quá số dư khả dụng." });
        }

        return Results.Ok(new
        {
            message = "Đã tạo yêu cầu rút tiền.",
            wallet = TaoPhanHoiViDoanhThu(ketQua.Data)
        });
    }

    private const int SoTienRutToiThieu = 100_000;
    private const int SoNgayXacNhanDoanhThu = 7;

    private async Task<DuLieuViDoanhThu> TaoDuLieuViDoanhThu(string userId, int historyLimit = 30)
    {
        var now = DateTime.UtcNow;
        var cutoff = now.AddDays(-SoNgayXacNhanDoanhThu);
        var monthStart = new DateTime(now.Year, now.Month, 1, 0, 0, 0, DateTimeKind.Utc);

        var giangVien = await db.NguoiDung.AsNoTracking().FirstOrDefaultAsync(item => item.Id == userId);
        var taiKhoanNhanTien = DocTaiKhoanNhanTien(giangVien?.CaiDat);
        var khoaHocs = await db.KhoaHoc.AsNoTracking()
            .Where(c => c.GiangVienId == userId)
            .Include(c => c.CacGhiDanh)
            .Include(c => c.CacDonMua)
                .ThenInclude(p => p.NguoiDung)
            .OrderByDescending(c => c.NgayTao)
            .ToListAsync();

        var khoaHocIds = khoaHocs.Select(c => c.Id).ToList();
        var giaoDichHoanTat = await db.DonMua.AsNoTracking()
            .Where(p => khoaHocIds.Contains(p.KhoaHocId) && p.TrangThai == "COMPLETED")
            .Include(p => p.NguoiDung)
            .Include(p => p.KhoaHoc)
            .OrderByDescending(p => p.NgayTao)
            .ToListAsync();

        var lichSuRutTien = await db.InstructorWithdrawals.AsNoTracking()
            .Where(item => item.GiangVienId == userId)
            .OrderByDescending(item => item.NgayTao)
            .ToListAsync();

        var tongDoanhThu = giaoDichHoanTat.Sum(p => p.SoTienCuoi);
        var doanhThuThangNay = giaoDichHoanTat.Where(p => p.NgayTao >= monthStart).Sum(p => p.SoTienCuoi);
        var doanhThuChoXacNhan = giaoDichHoanTat.Where(p => p.NgayTao > cutoff).Sum(p => p.SoTienCuoi);
        var doanhThuDaSanSang = giaoDichHoanTat.Where(p => p.NgayTao <= cutoff).Sum(p => p.SoTienCuoi);
        var daRut = lichSuRutTien.Where(item => LaTrangThaiDaTraMoi(item.TrangThai)).Sum(item => item.SoTien);
        var dangXuLy = lichSuRutTien.Where(item => LaTrangThaiDangXuLyMoi(item.TrangThai)).Sum(item => item.SoTien);
        var soDuKhaDung = Math.Max(0, doanhThuDaSanSang - daRut - dangXuLy);
        var soMua = giaoDichHoanTat.Count;
        var soHocVienMua = giaoDichHoanTat.Select(p => p.NguoiDungId).Distinct().Count();
        var giaTriTrungBinh = soMua == 0 ? 0 : (int)Math.Round(tongDoanhThu / (double)soMua);

        var history = giaoDichHoanTat.Select(p =>
        {
            var sanSang = p.NgayTao <= cutoff;
            return (object)new
            {
                p.Id,
                type = "COURSE_SALE",
                typeLabel = "Bán khóa học",
                amount = p.SoTienCuoi,
                status = sanSang ? "APPROVED" : "PENDING",
                statusLabel = sanSang ? "Approved" : "Pending",
                note = p.KhoaHoc == null ? "Doanh thu khóa học" : $"Doanh thu: {p.KhoaHoc.TieuDe}",
                createdAt = p.NgayTao,
                date = p.NgayTao,
                user = p.NguoiDung == null ? null : new { p.NguoiDung.Id, p.NguoiDung.Ten, p.NguoiDung.Email, p.NguoiDung.AnhDaiDien },
                course = p.KhoaHoc == null ? null : new { p.KhoaHoc.Id, p.KhoaHoc.TieuDe, p.KhoaHoc.AnhDaiDien },
                bankName = (string?)null,
                accountNumber = (string?)null,
                accountHolder = (string?)null
            };
        })
        .Concat(lichSuRutTien.Select(item =>
        {
            var status = ChuanHoaTrangThaiRutTienMoi(item.TrangThai);
            return (object)new
            {
                item.Id,
                type = "WITHDRAWAL",
                typeLabel = "Rút tiền",
                amount = -item.SoTien,
                status,
                statusLabel = VietHoaTrangThaiGiaoDichMoi(status),
                note = item.NoiDung,
                createdAt = item.NgayTao,
                date = item.NgayTao,
                user = (object?)null,
                course = (object?)null,
                item.TenNganHang,
                item.SoTaiKhoan,
                item.ChuTaiKhoan
            };
        }))
        .OrderByDescending(item => LayNgayGiaoDichMoi(item))
        .Take(historyLimit)
        .ToList();

        return new DuLieuViDoanhThu(
            tongDoanhThu,
            doanhThuThangNay,
            doanhThuChoXacNhan,
            soDuKhaDung,
            daRut,
            dangXuLy,
            SoTienRutToiThieu,
            soMua,
            soHocVienMua,
            giaTriTrungBinh,
            khoaHocs.Count,
            taiKhoanNhanTien is null ? null : new { taiKhoanNhanTien.TenNganHang, taiKhoanNhanTien.SoTaiKhoan, taiKhoanNhanTien.ChuTaiKhoan },
            khoaHocs.Select(c =>
            {
                var purchases = c.CacDonMua.Where(p => p.TrangThai == "COMPLETED").ToList();
                return (object)new
                {
                    c.Id,
                    title = c.TieuDe,
                    price = c.Gia,
                    isPublished = IsCoursePublished(c),
                    status = c.TrangThai,
                    enrollments = c.CacGhiDanh.Count,
                    purchases = purchases.Count,
                    revenue = purchases.Sum(p => p.SoTienCuoi),
                    availableRevenue = purchases.Where(p => p.NgayTao <= cutoff).Sum(p => p.SoTienCuoi),
                    pendingRevenue = purchases.Where(p => p.NgayTao > cutoff).Sum(p => p.SoTienCuoi),
                    averageRating = c.DiemDanhGiaTrungBinh,
                    reviewCount = c.SoLuongDanhGia,
                    createdAt = c.NgayTao,
                    updatedAt = c.NgayCapNhat
                };
            }).ToList(),
            giaoDichHoanTat.Take(10).Select(p => (object)new
            {
                p.Id,
                amount = p.SoTienCuoi,
                payoutStatus = p.NgayTao <= cutoff ? "APPROVED" : "PENDING",
                originalAmount = p.SoTienGoc,
                discountAmount = p.SoTienGiam,
                status = p.TrangThai,
                createdAt = p.NgayTao,
                user = p.NguoiDung == null ? null : new { p.NguoiDung.Id, p.NguoiDung.Ten, p.NguoiDung.Email, p.NguoiDung.AnhDaiDien },
                course = p.KhoaHoc == null ? null : new { p.KhoaHoc.Id, p.KhoaHoc.TieuDe, p.KhoaHoc.AnhDaiDien }
            }).ToList(),
            history);
    }

    private static object TaoPhanHoiViDoanhThu(DuLieuViDoanhThu data) => new
    {
        totalRevenue = data.TotalRevenue,
        monthRevenue = data.MonthRevenue,
        pendingRevenue = data.PendingRevenue,
        availableBalance = data.AvailableBalance,
        availableRevenue = data.AvailableBalance,
        paidRevenue = data.PaidWithdrawals,
        totalWithdrawn = data.PaidWithdrawals,
        processingWithdrawals = data.ProcessingWithdrawals,
        minimumWithdrawal = data.MinimumWithdrawal,
        totalPurchases = data.TotalPurchases,
        totalStudents = data.TotalStudents,
        averageOrderValue = data.AverageOrderValue,
        courseCount = data.CourseCount,
        payoutAccount = data.PayoutAccount,
        courses = data.CacKhoaHoc,
        recentPurchases = data.RecentPurchases,
        recentTransactions = data.History,
        history = data.History
    };

    private static DateTime LayNgayGiaoDichMoi(object item)
    {
        var property = item.GetType().GetProperty("createdAt");
        return property?.GetValue(item) is DateTime value ? value : DateTime.MinValue;
    }

    private static bool LaTrangThaiDaTraMoi(string? status) => ChuanHoaTrangThaiRutTienMoi(status) == "PAID";

    private static bool LaTrangThaiDangXuLyMoi(string? status)
    {
        var normalized = ChuanHoaTrangThaiRutTienMoi(status);
        return normalized is "PENDING" or "APPROVED";
    }

    private static string ChuanHoaTrangThaiRutTienMoi(string? status)
    {
        var normalized = (status ?? "PENDING").Trim().ToUpperInvariant();
        return normalized switch
        {
            "COMPLETED" => "PAID",
            "SUCCESS" => "PAID",
            "DONE" => "PAID",
            "PAID" => "PAID",
            "APPROVED" => "APPROVED",
            "REJECTED" => "REJECTED",
            _ => "PENDING"
        };
    }

    private static string VietHoaTrangThaiGiaoDichMoi(string status) => status switch
    {
        "APPROVED" => "Approved",
        "REJECTED" => "Rejected",
        "PAID" => "Paid",
        _ => "Pending"
    };

    private static string? TaoGhiChuRutTien(string? branch, string? note)
    {
        var parts = new List<string>();
        if (!string.IsNullOrWhiteSpace(branch)) parts.Add($"Chi nhánh: {branch.Trim()}");
        if (!string.IsNullOrWhiteSpace(note)) parts.Add(note.Trim());
        return parts.Count == 0 ? null : string.Join(" | ", parts);
    }

    private sealed record KetQuaYeuCauRutTien(bool ThanhCong, DuLieuViDoanhThu Data);
    private sealed record DuLieuViDoanhThu(
        int TotalRevenue,
        int MonthRevenue,
        int PendingRevenue,
        int AvailableBalance,
        int PaidWithdrawals,
        int ProcessingWithdrawals,
        int MinimumWithdrawal,
        int TotalPurchases,
        int TotalStudents,
        int AverageOrderValue,
        int CourseCount,
        object? PayoutAccount,
        List<object> CacKhoaHoc,
        List<object> RecentPurchases,
        List<object> History);

    [NonAction]
    public async Task<IResult> DanhSachHocVien()
    {
        var loi = TroGiup.YeuCauGiangVien(User); if (loi is not null) return loi;
        var userId = TroGiup.LayUserId(User)!;
        var khoaHocIds = await db.KhoaHoc.AsNoTracking().Where(c => c.GiangVienId == userId).Select(c => c.Id).ToListAsync();
        var ghiDanh = await db.GhiDanh.AsNoTracking()
            .Where(e => khoaHocIds.Contains(e.KhoaHocId)).Include(e => e.NguoiDung).Include(e => e.KhoaHoc)
            .OrderByDescending(e => e.NgayTao).Take(100)
            .ToListAsync();

        var hocViens = ghiDanh
            .Where(e => e.NguoiDung is not null)
            .GroupBy(e => e.NguoiDungId)
            .Select(group =>
            {
                var moiNhat = group.OrderByDescending(e => e.NgayTao).First();
                var courses = group
                    .OrderByDescending(e => e.NgayTao)
                    .Select(e => new
                    {
                        id = e.KhoaHocId,
                        title = e.KhoaHoc?.TieuDe ?? "Khóa học",
                        progress = e.TienDo,
                        completedAt = e.NgayHoanThanh,
                        enrolledAt = e.NgayTao
                    })
                    .ToList();

                return new
                {
                    id = moiNhat.NguoiDungId,
                    name = moiNhat.NguoiDung?.Ten ?? "Học viên",
                    email = moiNhat.NguoiDung?.Email,
                    avatar = moiNhat.NguoiDung?.AnhDaiDien,
                    courses,
                    courseCount = courses.Count,
                    averageProgress = Math.Round(group.Average(e => e.TienDo)),
                    latestEnrollmentAt = moiNhat.NgayTao
                };
            })
            .OrderByDescending(student => student.latestEnrollmentAt)
            .ToList();

        return Results.Ok(new
        {
            students = hocViens,
            totalStudents = hocViens.Count,
            totalEnrollments = ghiDanh.Count,
            averageProgress = hocViens.Count == 0 ? 0 : Math.Round(hocViens.Average(student => student.averageProgress))
        });
    }

    [HttpGet("/api/instructor/courses/select-list")]
    public async Task<IResult> DanhSachKhoaHocChon()
    {
        var loi = TroGiup.YeuCauGiangVien(User); if (loi is not null) return loi;
        var userId = TroGiup.LayUserId(User)!;
        return Results.Ok(await db.KhoaHoc.AsNoTracking()
            .Where(course => course.GiangVienId == userId)
            .OrderByDescending(course => course.NgayTao)
            .Select(course => new { course.Id, tenKhoaHoc = course.TieuDe })
            .ToListAsync());
    }

    [HttpGet("/api/instructor/students")]
    public async Task<IResult> DanhSachHocVienTheoKhoaHoc([FromQuery] string? courseId = "all")
    {
        var loi = TroGiup.YeuCauGiangVien(User); if (loi is not null) return loi;
        var userId = TroGiup.LayUserId(User)!;
        var khoaHocIds = await db.KhoaHoc.AsNoTracking()
            .Where(course => course.GiangVienId == userId)
            .Select(course => course.Id)
            .ToListAsync();
        var locTatCa = string.IsNullOrWhiteSpace(courseId) || string.Equals(courseId, "all", StringComparison.OrdinalIgnoreCase);

        if (!locTatCa && !khoaHocIds.Contains(courseId!))
        {
            return Results.Json(new { message = "Bạn không có quyền xem học viên của khóa học này." }, statusCode: 403);
        }

        var ghiDanhQuery = db.GhiDanh.AsNoTracking()
            .Where(enrollment => khoaHocIds.Contains(enrollment.KhoaHocId));
        if (!locTatCa)
        {
            ghiDanhQuery = ghiDanhQuery.Where(enrollment => enrollment.KhoaHocId == courseId);
        }

        var ghiDanh = await ghiDanhQuery
            .Include(enrollment => enrollment.NguoiDung)
            .Include(enrollment => enrollment.KhoaHoc)
            .OrderByDescending(enrollment => enrollment.NgayTao)
            .ToListAsync();
        var khoaHocDangLoc = locTatCa ? khoaHocIds : [courseId!];
        var doanhThu = await db.DonMua.AsNoTracking()
            .Where(purchase => khoaHocDangLoc.Contains(purchase.KhoaHocId) && purchase.TrangThai == "COMPLETED")
            .SumAsync(purchase => purchase.SoTienCuoi);
        var hocVienHoanThanh = ghiDanh.Count(enrollment => enrollment.NgayHoanThanh is not null || enrollment.TienDo >= 100);
        var hocVienDangHoc = ghiDanh.Count - hocVienHoanThanh;
        var tongHocVien = ghiDanh.Select(enrollment => enrollment.NguoiDungId).Distinct().Count();
        var tienDoTrungBinh = ghiDanh.Count == 0 ? 0 : Math.Round(ghiDanh.Average(enrollment => enrollment.TienDo));

        var hocViens = ghiDanh.Select(enrollment =>
        {
            var hoanThanh = enrollment.NgayHoanThanh is not null || enrollment.TienDo >= 100;
            return new
            {
                id = enrollment.Id,
                hocVienId = enrollment.NguoiDungId,
                hoTen = enrollment.NguoiDung?.Ten ?? "Học viên",
                email = enrollment.NguoiDung?.Email ?? string.Empty,
                avatar = enrollment.NguoiDung?.AnhDaiDien,
                courseId = enrollment.KhoaHocId,
                tenKhoaHoc = enrollment.KhoaHoc?.TieuDe ?? "Khóa học",
                ngayGhiDanh = enrollment.NgayTao,
                tienDo = Math.Round(enrollment.TienDo),
                trangThai = hoanThanh ? "HOAN_THANH" : "DANG_HOC",
                trangThaiText = hoanThanh ? "Hoàn thành" : "Đang học"
            };
        }).ToList();

        return Results.Ok(new
        {
            summary = new
            {
                tongHocVien,
                tongGhiDanh = ghiDanh.Count,
                tienDoTrungBinh,
                hocVienHoanThanh,
                hocVienDangHoc,
                doanhThu
            },
            students = hocViens,
            totalStudents = tongHocVien,
            totalEnrollments = ghiDanh.Count,
            averageProgress = tienDoTrungBinh
        });
    }

    private async Task<IResult> UpdateSection(ChuongHoc chuong, LuuChuongForm yeuCau)
    {
        var tieuDe = (yeuCau.TieuDe ?? yeuCau.Title ?? string.Empty).Trim();
        if (tieuDe.Length < 3) return Results.BadRequest(new { message = "Tên chương tối thiểu 3 ký tự." });

        chuong.TieuDe = tieuDe;
        chuong.MoTa = yeuCau.MoTa ?? yeuCau.Description;
        if (yeuCau.ThuTu is not null) chuong.ThuTu = Math.Max(1, yeuCau.ThuTu.Value);
        chuong.NgayCapNhat = DateTime.UtcNow;
        await db.SaveChangesAsync();
        await ChuanHoaViTriChuong(chuong.KhoaHocId);
        return Results.Ok(MapSection(chuong));
    }

    private async Task<IResult> DeleteSection(ChuongHoc chuong)
    {
        var courseId = chuong.KhoaHocId;
        var lessonIds = await db.BaiHoc
            .Where(lesson => lesson.ChuongHocId == chuong.Id)
            .Select(lesson => lesson.Id)
            .ToListAsync();

        if (lessonIds.Count > 0)
        {
            var quizIds = await db.BaiKiemTra
                .Where(quiz => lessonIds.Contains(quiz.BaiHocId))
                .Select(quiz => quiz.Id)
                .ToListAsync();

            if (quizIds.Count > 0)
            {
                db.BaiNopKiemTra.RemoveRange(db.BaiNopKiemTra.Where(submission => quizIds.Contains(submission.BaiKiemTraId)));
                db.CauHoiKiemTra.RemoveRange(db.CauHoiKiemTra.Where(question => quizIds.Contains(question.BaiKiemTraId)));
                db.BaiKiemTra.RemoveRange(db.BaiKiemTra.Where(quiz => quizIds.Contains(quiz.Id)));
            }

            db.BaiTap.RemoveRange(db.BaiTap.Where(assignment => assignment.BaiHocId != null && lessonIds.Contains(assignment.BaiHocId)));
            db.TienDoBaiHoc.RemoveRange(db.TienDoBaiHoc.Where(progress => lessonIds.Contains(progress.BaiHocId)));

            var comments = await db.BinhLuan
                .Where(comment => lessonIds.Contains(comment.BaiHocId))
                .ToListAsync();
            var commentIds = comments.Select(comment => comment.Id).ToList();
            db.BinhLuan.RemoveRange(comments.Where(comment => comment.BinhLuanChaId != null && commentIds.Contains(comment.BinhLuanChaId)));
            db.BinhLuan.RemoveRange(comments.Where(comment => comment.BinhLuanChaId == null || !commentIds.Contains(comment.BinhLuanChaId)));

            db.BaiHoc.RemoveRange(db.BaiHoc.Where(lesson => lessonIds.Contains(lesson.Id)));
        }

        db.ChuongHoc.Remove(chuong);
        await db.SaveChangesAsync();
        await ChuanHoaViTriChuong(courseId);
        await TinhLaiThoiLuong(courseId);
        return Results.Ok(new { message = "Đã xóa chương học." });
    }

    private async Task<KhoaHoc?> LoadOwnedCourse(string courseId, bool asNoTracking = false)
    {
        var loi = TroGiup.YeuCauGiangVien(User);
        if (loi is not null) return null;

        var userId = TroGiup.LayUserId(User)!;
        var query = db.KhoaHoc
            .Include(c => c.CacHinhAnh.OrderBy(i => i.NgayTao))
            .Include(c => c.CacChuongHoc.OrderBy(s => s.ThuTu))
                .ThenInclude(s => s.CacBaiHoc.OrderBy(l => l.ThuTu))
            .Include(c => c.CacGhiDanh)
            .Where(c => c.Id == courseId && c.GiangVienId == userId);
        if (asNoTracking) query = query.AsNoTracking();
        return await query.FirstOrDefaultAsync();
    }

    private async Task<ChuongHoc?> LoadOwnedSection(string sectionId, string? courseId = null)
    {
        var userId = TroGiup.LayUserId(User);
        if (userId is null) return null;

        return await db.ChuongHoc
            .Include(s => s.KhoaHoc)
            .Include(s => s.CacBaiHoc)
            .FirstOrDefaultAsync(s => s.Id == sectionId && (courseId == null || s.KhoaHocId == courseId) && s.KhoaHoc != null && s.KhoaHoc.GiangVienId == userId);
    }

    private async Task<BaiHoc?> LoadOwnedLesson(string lessonId)
    {
        var userId = TroGiup.LayUserId(User);
        if (userId is null) return null;

        return await db.BaiHoc
            .Include(l => l.KhoaHoc)
            .FirstOrDefaultAsync(l => l.Id == lessonId && l.KhoaHoc != null && l.KhoaHoc.GiangVienId == userId);
    }

    private IResult? ValidateLessonForm(LuuBaiHocForm yeuCau, bool isUpdate = false)
    {
        if (string.IsNullOrWhiteSpace(yeuCau.TieuDe) || yeuCau.TieuDe.Trim().Length < 3)
            return Results.BadRequest(new { message = "Tiêu đề bài học tối thiểu 3 ký tự." });
        if (yeuCau.ThoiLuongGiay < 0) return Results.BadRequest(new { message = "Thời lượng không được âm." });
        if (string.IsNullOrWhiteSpace(yeuCau.NoiDung) && yeuCau.VideoFile is null && !isUpdate)
            return Results.BadRequest(new { message = "Bài học cần có nội dung lý thuyết hoặc video." });

        if (yeuCau.VideoFile is not null)
        {
            var error = ValidateFile(yeuCau.VideoFile, VideoTypes, 200 * 1024 * 1024, "Video");
            if (error is not null) return error;
        }
        if (yeuCau.ImageFiles is not null && yeuCau.ImageFiles.Any())
        {
            foreach (var img in yeuCau.ImageFiles)
            {
                var error = ValidateFile(img, ImageTypes, 5 * 1024 * 1024, "Ảnh");
                if (error is not null) return error;
            }
        }
        if (yeuCau.DocumentFile is not null)
        {
            var error = ValidateFile(yeuCau.DocumentFile, DocumentTypes, 50 * 1024 * 1024, "Tài liệu");
            if (error is not null) return error;
        }
        return null;
    }

    private static string NormalizeCourseStatus(string? status) => (status ?? "DRAFT").Trim().ToUpperInvariant() switch
    {
        "PUBLIC" or "PUBLISHED" or "CONG_KHAI" => "PUBLIC",
        "HIDDEN" or "AN" => "HIDDEN",
        "CLOSED" or "DONG" => "CLOSED",
        _ => "DRAFT"
    };

    private static string NormalizeLessonStatus(string? status) => (status ?? "DRAFT").Trim().ToUpperInvariant() switch
    {
        "PUBLIC" or "PUBLISHED" or "CONG_KHAI" => "PUBLIC",
        _ => "DRAFT"
    };

    private static bool IsCoursePublished(KhoaHoc kh)
    {
        return kh.DaXuatBan
            || string.Equals(kh.TrangThai, "PUBLIC", StringComparison.OrdinalIgnoreCase)
            || string.Equals(kh.TrangThai, "PUBLISHED", StringComparison.OrdinalIgnoreCase);
    }


    private static string SanitizeRichText(string? html)
    {
        if (string.IsNullOrWhiteSpace(html)) return string.Empty;

        var clean = Regex.Replace(html, @"<(script|style)[\s\S]*?</\1>", string.Empty, RegexOptions.IgnoreCase);
        clean = Regex.Replace(clean, @"\s+on\w+\s*=\s*(""[^""]*""|'[^']*')", string.Empty, RegexOptions.IgnoreCase);
        clean = Regex.Replace(clean, @"\s+(style|class|id)\s*=\s*(""[^""]*""|'[^']*')", string.Empty, RegexOptions.IgnoreCase);

        var allowed = new HashSet<string>(StringComparer.OrdinalIgnoreCase)
        {
            "p", "br", "strong", "b", "em", "i", "ul", "ol", "li", "h3", "h4", "a"
        };

        clean = Regex.Replace(clean, @"</?([a-zA-Z0-9]+)([^>]*)>", match =>
        {
            var tag = match.Groups[1].Value.ToLowerInvariant();
            if (!allowed.Contains(tag)) return string.Empty;
            var isClosing = match.Value.StartsWith("</", StringComparison.Ordinal);
            if (isClosing) return tag == "br" ? string.Empty : $"</{tag}>";
            if (tag == "br") return "<br>";
            if (tag != "a") return $"<{tag}>";

            var hrefMatch = Regex.Match(match.Groups[2].Value, @"href\s*=\s*(""([^""]*)""|'([^']*)')", RegexOptions.IgnoreCase);
            var href = hrefMatch.Success ? (hrefMatch.Groups[2].Value.Length > 0 ? hrefMatch.Groups[2].Value : hrefMatch.Groups[3].Value) : "#";
            if (!Uri.TryCreate(href, UriKind.RelativeOrAbsolute, out var uri) ||
                (uri.IsAbsoluteUri && uri.Scheme != Uri.UriSchemeHttp && uri.Scheme != Uri.UriSchemeHttps))
            {
                href = "#";
            }

            return $"<a href=\"{WebUtility.HtmlEncode(href)}\" target=\"_blank\" rel=\"noopener noreferrer\">";
        }, RegexOptions.IgnoreCase);

        return clean.Trim();
    }

    private static int DemKyTuNoiDung(string? html)
    {
        var text = Regex.Replace(html ?? string.Empty, "<[^>]+>", " ");
        text = WebUtility.HtmlDecode(text);
        text = Regex.Replace(text, @"\s+", " ").Trim();
        return text.Length;
    }

    private static IResult? ValidateFile(IFormFile file, HashSet<string> allowedTypes, long maxSize, string label)
    {
        if (!allowedTypes.Contains(file.ContentType)) return Results.BadRequest(new { message = $"{label} không đúng định dạng được hỗ trợ." });
        var extension = Path.GetExtension(file.FileName).ToLowerInvariant();
        if (allowedTypes == ImageTypes && extension is not ".jpg" and not ".jpeg" and not ".png" and not ".webp")
            return Results.BadRequest(new { message = $"{label} chỉ hỗ trợ JPG, JPEG, PNG hoặc WEBP." });
        if (file.Length > maxSize) return Results.BadRequest(new { message = $"{label} vượt quá dung lượng cho phép." });
        return null;
    }

    private async Task<string> SaveUpload(IFormFile file, string relativeFolder)
    {
        var root = env.WebRootPath;
        if (string.IsNullOrWhiteSpace(root))
        {
            root = Path.Combine(env.ContentRootPath, "wwwroot");
        }

        var folder = Path.Combine(root, relativeFolder.Replace('/', Path.DirectorySeparatorChar));
        Directory.CreateDirectory(folder);

        var extension = Path.GetExtension(file.FileName);
        var fileName = $"{Guid.NewGuid():N}{extension}";
        var fullPath = Path.Combine(folder, fileName);

        await using var stream = System.IO.File.Create(fullPath);
        await file.CopyToAsync(stream);
        return "/" + relativeFolder.Trim('/').Replace("\\", "/") + "/" + fileName;
    }


    private void XoaFileUpload(string? url)
    {
        if (string.IsNullOrWhiteSpace(url) || url.StartsWith("http", StringComparison.OrdinalIgnoreCase)) return;
        var root = string.IsNullOrWhiteSpace(env.WebRootPath) ? Path.Combine(env.ContentRootPath, "wwwroot") : env.WebRootPath;
        var path = Path.Combine(root, url.TrimStart('/').Replace('/', Path.DirectorySeparatorChar));
        if (System.IO.File.Exists(path)) System.IO.File.Delete(path);
    }

    private async Task DongBoAnhDaiDienCu(KhoaHoc kh)
    {
        if (kh.CacHinhAnh.Count > 0 || string.IsNullOrWhiteSpace(kh.AnhDaiDien)) return;
        await ThemAnhKhoaHoc(kh, kh.AnhDaiDien, true);
    }

    private Task ThemAnhKhoaHoc(KhoaHoc kh, string url, bool primary)
    {
        if (primary)
        {
            foreach (var image in kh.CacHinhAnh)
            {
                image.AnhChinh = false;
            }
            kh.AnhDaiDien = url;
        }

        if (!kh.CacHinhAnh.Any(item => string.Equals(item.AnhUrl, url, StringComparison.OrdinalIgnoreCase)))
        {
            kh.CacHinhAnh.Add(new KhoaHocAnh
            {
                Id = TaoId.Moi(),
                KhoaHocId = kh.Id,
                AnhUrl = url,
                AnhChinh = primary,
                NgayTao = DateTime.UtcNow
            });
        }

        return Task.CompletedTask;
    }

    private static object MapCourse(KhoaHoc kh)
    {
        var sections = kh.CacChuongHoc.OrderBy(s => s.ThuTu).Select(MapSection).ToList();
        var errors = PublishErrors(kh);
        var courseImages = kh.CacHinhAnh
            .OrderByDescending(item => item.AnhChinh)
            .ThenBy(item => item.NgayTao)
            .Select(item => new
            {
                id = item.Id,
                imageUrl = item.AnhUrl,
                url = item.AnhUrl,
                isPrimary = item.AnhChinh,
                createdAt = item.NgayTao,
                canDelete = true
            })
            .Cast<object>()
            .ToList();
        if (courseImages.Count == 0 && !string.IsNullOrWhiteSpace(kh.AnhDaiDien))
        {
            courseImages.Add(new
            {
                id = "current-cover",
                imageUrl = kh.AnhDaiDien,
                url = kh.AnhDaiDien,
                isPrimary = true,
                createdAt = kh.NgayCapNhat,
                canDelete = false
            });
        }

        return new
        {
            id = kh.Id,
            title = kh.TieuDe,
            tieuDe = kh.TieuDe,
            moTaNgan = kh.MoTaNgan,
            moTa = kh.MoTa,
            moTaChiTiet = kh.MoTaChiTiet,
            description = kh.MoTa,
            thumbnail = kh.AnhDaiDien,
            anhBia = kh.AnhDaiDien,
            primaryImage = kh.AnhDaiDien,
            images = courseImages,
            courseImages,
            danhMuc = kh.ChuyenMuc,
            danhMucId = kh.DanhMucId,
            trinhDo = kh.TrinhDo,
            price = kh.Gia,
            gia = kh.Gia,
            trangThai = kh.TrangThai,
            status = kh.TrangThai,
            isPublished = kh.DaXuatBan,
            daXuatBan = kh.DaXuatBan,
            totalDurationSeconds = kh.TongThoiLuongGiay,
            sectionCount = kh.CacChuongHoc.Count,
            lessonCount = kh.CacChuongHoc.Sum(s => s.CacBaiHoc.Count),
            studentCount = kh.CacGhiDanh.Count,
            totalLessons = kh.CacChuongHoc.Sum(s => s.CacBaiHoc.Count),
            enrollments = kh.CacGhiDanh.Count,
            createdAt = kh.NgayTao,
            updatedAt = kh.NgayCapNhat,
            startDate = kh.StartDate,
            endDate = kh.EndDate,
            instructorId = kh.GiangVienId,
            sections,
            publishValidationErrors = errors,
            canPublish = errors.Count == 0
        };
    }

    private static object MapDashboardCourse(KhoaHoc kh)
    {
        var soChuong = kh.CacChuongHoc.Count;
        var soBaiHoc = kh.CacChuongHoc.Sum(s => s.CacBaiHoc.Count);
        var soHocVien = kh.CacGhiDanh.Count;
        var doanhThu = kh.CacDonMua.Where(p => p.TrangThai == "COMPLETED").Sum(p => p.SoTienCuoi);
        var danhGia = kh.CacDanhGia.Count == 0 ? null : (double?)Math.Round(kh.CacDanhGia.Average(r => r.DiemDanhGia), 1);

        return new
        {
            id = kh.Id,
            title = kh.TieuDe,
            tenKhoaHoc = kh.TieuDe,
            moTaNgan = kh.MoTaNgan ?? kh.MoTa,
            description = kh.MoTa,
            thumbnail = kh.AnhDaiDien,
            anhBia = kh.AnhDaiDien,
            price = kh.Gia,
            gia = kh.Gia,
            trangThai = kh.TrangThai,
            status = kh.TrangThai,
            isPublished = kh.DaXuatBan,
            daXuatBan = IsCoursePublished(kh),
            sectionCount = soChuong,
            chuong = soChuong,
            lessonCount = soBaiHoc,
            baiHoc = soBaiHoc,
            studentCount = soHocVien,
            hocVien = soHocVien,
            revenue = doanhThu,
            doanhThu,
            rating = danhGia,
            reviewCount = kh.CacDanhGia.Count,
            createdAt = kh.NgayTao,
            updatedAt = kh.NgayCapNhat
        };
    }

    private static object MapSection(ChuongHoc chuong)
    {
        var lessons = chuong.CacBaiHoc.OrderBy(l => l.ThuTu).Select(MapLesson).ToList();
        return new
        {
            id = chuong.Id,
            title = chuong.TieuDe,
            tieuDe = chuong.TieuDe,
            description = chuong.MoTa,
            moTa = chuong.MoTa,
            position = chuong.ThuTu,
            thuTu = chuong.ThuTu,
            lessons,
            baiHocs = lessons
        };
    }

    private static object MapLesson(BaiHoc bai)
    {
        return new
        {
            id = bai.Id,
            title = bai.TieuDe,
            tieuDe = bai.TieuDe,
            content = bai.NoiDung,
            noiDung = bai.NoiDung,
            videoUrl = bai.VideoUrl,
            anhMinhHoa = bai.IllustrationUrl,
            illustrationUrl = bai.IllustrationUrl,
            fileUrl = bai.FileUrl,
            durationSeconds = bai.ThoiLuongGiay ?? 0,
            thoiLuongGiay = bai.ThoiLuongGiay ?? 0,
            isPreview = bai.ChoXemTruoc,
            choPhepHocThu = bai.ChoXemTruoc,
            isPublished = bai.DaXuatBan,
            status = bai.TrangThai,
            position = bai.ThuTu,
            thuTu = bai.ThuTu,
            sectionId = bai.ChuongHocId
        };
    }

    private static List<string> PublishErrors(KhoaHoc kh)
    {
        var errors = new List<string>();
        if (string.IsNullOrWhiteSpace(kh.TieuDe)) errors.Add("Khóa học cần có tiêu đề.");
        if (string.IsNullOrWhiteSpace(kh.MoTa)) errors.Add("Khóa học cần có mô tả.");
        if (kh.CacChuongHoc.Count == 0) errors.Add("Khóa học cần ít nhất 1 chương.");
        if (kh.CacChuongHoc.Sum(s => s.CacBaiHoc.Count) == 0) errors.Add("Khóa học cần ít nhất 1 bài học.");
        return errors;
    }

    private async Task<string> TaoSlugDuyNhat(string tieuDe, string? boQuaId = null)
    {
        var slugGoc = TaoSlug(tieuDe);
        var slug = slugGoc;
        var dem = 2;
        while (await db.KhoaHoc.AnyAsync(c => c.DuongDanThanThien == slug && c.Id != boQuaId))
        {
            slug = $"{slugGoc}-{dem}";
            dem++;
        }
        return slug;
    }

    private static string TaoSlug(string giaTri)
    {
        var chuanHoa = giaTri.ToLowerInvariant().Normalize(System.Text.NormalizationForm.FormD);
        var sb = new StringBuilder();
        foreach (var ky in chuanHoa)
        {
            var loai = System.Globalization.CharUnicodeInfo.GetUnicodeCategory(ky);
            if (loai == System.Globalization.UnicodeCategory.NonSpacingMark) continue;
            if (char.IsLetterOrDigit(ky)) sb.Append(ky);
            else if (char.IsWhiteSpace(ky) || ky is '-' or '_') sb.Append('-');
        }
        var slug = Regex.Replace(sb.ToString(), "-+", "-").Trim('-');
        return string.IsNullOrWhiteSpace(slug) ? "khoa-hoc-moi" : slug;
    }

    private async Task ChuanHoaViTriChuong(string courseId)
    {
        var ds = await db.ChuongHoc.Where(s => s.KhoaHocId == courseId).OrderBy(s => s.ThuTu).ToListAsync();
        for (var i = 0; i < ds.Count; i++) ds[i].ThuTu = i + 1;
        await db.SaveChangesAsync();
    }

    private async Task ChuanHoaViTriBaiGiang(string sectionId)
    {
        var ds = await db.BaiHoc.Where(l => l.ChuongHocId == sectionId).OrderBy(l => l.ThuTu).ToListAsync();
        for (var i = 0; i < ds.Count; i++) ds[i].ThuTu = i + 1;
        await db.SaveChangesAsync();
    }

    private async Task TinhLaiThoiLuong(string courseId)
    {
        var tong = await db.BaiHoc.Where(l => l.KhoaHocId == courseId).SumAsync(l => l.ThoiLuongGiay ?? 0);
        var kh = await db.KhoaHoc.FirstOrDefaultAsync(c => c.Id == courseId);
        if (kh is null) return;
        kh.TongThoiLuongGiay = tong;
        kh.NgayCapNhat = DateTime.UtcNow;
        await db.SaveChangesAsync();
    }
}

[Area("Instructor")]
public class LuuKhoaHocForm
{
    public string? TieuDe { get; set; }
    public string? Title { get; set; }
    public string? MoTa { get; set; }
    public string? MoTaNgan { get; set; }
    public string? MoTaChiTiet { get; set; }
    public string? Description { get; set; }
    public string? DanhMuc { get; set; }
    public string? TrinhDo { get; set; }
    public int Gia { get; set; }
    public bool ChoPhepHocThu { get; set; }
    public string? TrangThai { get; set; }
    public string? Thumbnail { get; set; }
    public IFormFile? CoverImageFile { get; set; }
}

public record LuuChuongForm(string? TieuDe, string? Title, string? MoTa, string? Description, int? ThuTu);

[Area("Instructor")]
public class LuuBaiHocForm
{
    public string? TieuDe { get; set; }
    public string? NoiDung { get; set; }
    public int ThoiLuongGiay { get; set; }
    public bool ChoPhepHocThu { get; set; }
    public int ThuTu { get; set; } = 1;
    public IFormFile? VideoFile { get; set; }
    public string? VideoUrl { get; set; }
    public bool RemoveVideo { get; set; }
    public List<IFormFile>? ImageFiles { get; set; }
    public string? ImageUrls { get; set; }
    public bool RemoveImage { get; set; }
    public IFormFile? DocumentFile { get; set; }
    public string? FileUrl { get; set; }
    public bool RemoveDocument { get; set; }
    public string? TrangThai { get; set; }
}
