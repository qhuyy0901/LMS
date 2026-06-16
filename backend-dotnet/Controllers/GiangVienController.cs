using System.Text;
using System.Text.Json;
using System.Text.RegularExpressions;
using System.Data;
using LMS.Api.Data;
using LMS.Api.DTOs.PhanHoi;
using LMS.Api.DTOs.YeuCau;
using LMS.Api.Models;
using LMS.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace LMS.Api.Controllers;

[ApiController]
[Authorize]
public class GiangVienController(LmsDbContext db, IWebHostEnvironment env) : ControllerBase
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
        var ds = await db.Courses.AsNoTracking()
            .Where(c => c.InstructorId == userId)
            .Include(c => c.Sections.OrderBy(s => s.Position))
                .ThenInclude(s => s.Lessons.OrderBy(l => l.Position))
            .Include(c => c.Enrollments)
            .OrderByDescending(c => c.CreatedAt)
            .ToListAsync();

        return Results.Ok(ds.Select(MapCourse));
    }

    [HttpGet("/api/instructor/dashboard")]
    public async Task<IResult> Dashboard()
    {
        var loi = TroGiup.YeuCauGiangVien(User);
        if (loi is not null) return loi;

        var userId = TroGiup.LayUserId(User)!;
        var khoaHocs = await db.Courses.AsNoTracking()
            .Where(c => c.InstructorId == userId)
            .Include(c => c.Sections)
                .ThenInclude(s => s.Lessons)
            .Include(c => c.Enrollments)
            .Include(c => c.Purchases)
            .Include(c => c.Reviews)
            .OrderByDescending(c => c.CreatedAt)
            .ToListAsync();

        var khoaHocIds = khoaHocs.Select(c => c.Id).ToList();
        var giaoDich = await db.Purchases.AsNoTracking()
            .Where(p => khoaHocIds.Contains(p.CourseId) && p.Status == "COMPLETED")
            .Include(p => p.User)
            .Include(p => p.Course)
            .OrderByDescending(p => p.CreatedAt)
            .ToListAsync();

        var hocVienMoi = await db.Enrollments.AsNoTracking()
            .Where(e => khoaHocIds.Contains(e.CourseId))
            .Include(e => e.User)
            .Include(e => e.Course)
            .OrderByDescending(e => e.CreatedAt)
            .Take(8)
            .ToListAsync();

        var danhGia = khoaHocs.SelectMany(c => c.Reviews).ToList();
        var khoaHocNhieuHocVienNhat = khoaHocs
            .OrderByDescending(c => c.Enrollments.Count)
            .FirstOrDefault(c => c.Enrollments.Count > 0);

        return Results.Ok(new
        {
            tongDoanhThu = giaoDich.Sum(p => p.FinalAmount),
            tongHocVien = khoaHocs.Sum(c => c.Enrollments.Count),
            tongKhoaHoc = khoaHocs.Count,
            khoaHocCongKhai = khoaHocs.Count(IsCoursePublished),
            khoaHocBanNhap = khoaHocs.Count(c => !IsCoursePublished(c) || string.Equals(c.Status, "DRAFT", StringComparison.OrdinalIgnoreCase)),
            danhGiaTrungBinh = danhGia.Count == 0 ? (double?)null : Math.Round(danhGia.Average(r => r.Rating), 1),
            hocVienMoi = hocVienMoi.Select(e => new
            {
                id = e.Id,
                hocVienId = e.UserId,
                tenHocVien = e.User?.Name ?? "Học viên",
                emailHocVien = e.User?.Email,
                khoaHocId = e.CourseId,
                tenKhoaHoc = e.Course?.Title ?? "Khóa học",
                tienDo = e.Progress,
                ngayDangKy = e.CreatedAt
            }),
            khoaHocCuaToi = khoaHocs.Take(5).Select(MapDashboardCourse),
            khoaHocNhieuHocVienNhat = khoaHocNhieuHocVienNhat is null ? null : MapDashboardCourse(khoaHocNhieuHocVienNhat),
            doanhThuGanDay = giaoDich.Take(5).Select(p => new
            {
                id = p.Id,
                soTien = p.FinalAmount,
                amount = p.FinalAmount,
                khoaHocId = p.CourseId,
                tenKhoaHoc = p.Course?.Title ?? "Khóa học",
                hocVienId = p.UserId,
                tenHocVien = p.User?.Name ?? "Học viên",
                ngayThanhToan = p.CreatedAt,
                createdAt = p.CreatedAt
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

        var moTa = (yeuCau.MoTa ?? yeuCau.Description ?? string.Empty).Trim();
        if (moTa.Length < 20) return Results.BadRequest(new { message = "Mô tả khóa học tối thiểu 20 ký tự." });
        if (yeuCau.Gia < 0) return Results.BadRequest(new { message = "Giá khóa học không được âm." });

        string? anhBia = null;
        if (yeuCau.CoverImageFile is not null)
        {
            var validate = ValidateFile(yeuCau.CoverImageFile, ImageTypes, 5 * 1024 * 1024, "Ảnh bìa");
            if (validate is not null) return validate;
            anhBia = await SaveUpload(yeuCau.CoverImageFile, "uploads/courses");
        }

        var now = DateTime.UtcNow;
        var khoaHoc = new KhoaHoc
        {
            Id = TaoId.Moi(),
            Title = tieuDe,
            Slug = await TaoSlugDuyNhat(tieuDe),
            ShortDescription = yeuCau.MoTaNgan,
            Description = moTa,
            DetailedDescription = yeuCau.MoTaChiTiet,
            Thumbnail = anhBia ?? yeuCau.Thumbnail,
            Category = string.IsNullOrWhiteSpace(yeuCau.DanhMuc) ? "Lập trình" : yeuCau.DanhMuc.Trim(),
            Level = string.IsNullOrWhiteSpace(yeuCau.TrinhDo) ? "BEGINNER" : yeuCau.TrinhDo.Trim(),
            Price = yeuCau.Gia,
            MinimumMemberTier = "BRONZE",
            InstructorId = TroGiup.LayUserId(User)!,
            IsPublished = false,
            Status = "DRAFT",
            CreatedAt = now,
            UpdatedAt = now
        };

        db.Courses.Add(khoaHoc);
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
        if (!string.IsNullOrWhiteSpace(tieuDe) && tieuDe != kh.Title)
        {
            if (tieuDe.Length < 5) return Results.BadRequest(new { message = "Tiêu đề khóa học tối thiểu 5 ký tự." });
            kh.Title = tieuDe;
            kh.Slug = await TaoSlugDuyNhat(kh.Title, kh.Id);
        }

        var moTa = yeuCau.MoTa ?? yeuCau.Description;
        if (moTa is not null)
        {
            if (moTa.Trim().Length < 20) return Results.BadRequest(new { message = "Mô tả khóa học tối thiểu 20 ký tự." });
            kh.Description = moTa.Trim();
        }
        if (yeuCau.MoTaNgan is not null) kh.ShortDescription = yeuCau.MoTaNgan.Trim();
        if (yeuCau.MoTaChiTiet is not null) kh.DetailedDescription = yeuCau.MoTaChiTiet.Trim();
        if (!string.IsNullOrWhiteSpace(yeuCau.DanhMuc)) kh.Category = yeuCau.DanhMuc.Trim();
        if (!string.IsNullOrWhiteSpace(yeuCau.TrinhDo)) kh.Level = yeuCau.TrinhDo.Trim();
        if (!string.IsNullOrWhiteSpace(yeuCau.TrangThai))
        {
            kh.Status = NormalizeCourseStatus(yeuCau.TrangThai);
            kh.IsPublished = kh.Status == "PUBLIC";
        }

        if (yeuCau.Gia < 0) return Results.BadRequest(new { message = "Giá khóa học không được âm." });
        kh.Price = yeuCau.Gia;

        if (yeuCau.CoverImageFile is not null)
        {
            var validate = ValidateFile(yeuCau.CoverImageFile, ImageTypes, 5 * 1024 * 1024, "Ảnh bìa");
            if (validate is not null) return validate;
            kh.Thumbnail = await SaveUpload(yeuCau.CoverImageFile, "uploads/courses");
        }

        kh.UpdatedAt = DateTime.UtcNow;
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

        kh.IsPublished = yeuCau.IsPublished;
        kh.Status = yeuCau.IsPublished ? "PUBLIC" : "DRAFT";
        kh.PublishedAt = yeuCau.IsPublished ? DateTime.UtcNow : kh.PublishedAt;
        kh.UpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync();

        var reloaded = await LoadOwnedCourse(id, asNoTracking: true);
        return Results.Ok(MapCourse(reloaded!));
    }

    [HttpPatch("/api/instructor/courses/{id}/hide")]
    public async Task<IResult> AnKhoaHoc(string id)
    {
        var kh = await LoadOwnedCourse(id);
        if (kh is null) return Results.Json(new { message = "Bạn không có quyền chỉnh sửa khóa học này." }, statusCode: 403);

        kh.IsPublished = false;
        kh.Status = "HIDDEN";
        kh.UpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync();

        var reloaded = await LoadOwnedCourse(id, asNoTracking: true);
        return Results.Ok(MapCourse(reloaded!));
    }

    [HttpDelete("/api/instructor/courses/{id}")]
    public async Task<IResult> XoaKhoaHoc(string id)
    {
        var kh = await LoadOwnedCourse(id);
        if (kh is null) return Results.Json(new { message = "Bạn không có quyền chỉnh sửa khóa học này." }, statusCode: 403);
        if (await db.Enrollments.AnyAsync(e => e.CourseId == id)) return Results.BadRequest(new { message = "Không thể xóa khóa học đã có học viên đăng ký." });

        db.Assignments.RemoveRange(db.Assignments.Where(assignment => assignment.CourseId == id));
        db.Lessons.RemoveRange(db.Lessons.Where(lesson => lesson.CourseId == id));
        db.Sections.RemoveRange(db.Sections.Where(section => section.CourseId == id));
        db.Courses.Remove(kh);
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
        var thuTu = Math.Max(1, yeuCau.ThuTu ?? kh.Sections.Count + 1);
        var now = DateTime.UtcNow;

        var chuong = new ChuongHoc
        {
            Id = TaoId.Moi(),
            Title = tieuDe,
            Description = yeuCau.MoTa ?? yeuCau.Description,
            Position = thuTu,
            CourseId = courseId,
            CreatedAt = now,
            UpdatedAt = now
        };

        db.Sections.Add(chuong);
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
            Title = yeuCau.TieuDe!.Trim(),
            Content = string.IsNullOrWhiteSpace(yeuCau.NoiDung) ? null : yeuCau.NoiDung.Trim(),
            DurationSeconds = Math.Max(0, yeuCau.ThoiLuongGiay),
            IsPreview = yeuCau.ChoPhepHocThu,
            Status = NormalizeLessonStatus(yeuCau.TrangThai),
            IsPublished = NormalizeLessonStatus(yeuCau.TrangThai) == "PUBLIC",
            Position = Math.Max(1, yeuCau.ThuTu),
            CourseId = chuong.CourseId,
            SectionId = sectionId,
            CreatedAt = now,
            UpdatedAt = now
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

        db.Lessons.Add(baiHoc);
        await db.SaveChangesAsync();
        await ChuanHoaViTriBaiGiang(sectionId);
        await TinhLaiThoiLuong(chuong.CourseId);
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

        baiHoc.Title = yeuCau.TieuDe!.Trim();
        baiHoc.Content = string.IsNullOrWhiteSpace(yeuCau.NoiDung) ? null : yeuCau.NoiDung.Trim();
        baiHoc.DurationSeconds = Math.Max(0, yeuCau.ThoiLuongGiay);
        baiHoc.IsPreview = yeuCau.ChoPhepHocThu;
        baiHoc.Status = NormalizeLessonStatus(yeuCau.TrangThai);
        baiHoc.IsPublished = baiHoc.Status == "PUBLIC";
        baiHoc.Position = Math.Max(1, yeuCau.ThuTu);
        baiHoc.UpdatedAt = DateTime.UtcNow;

        if (yeuCau.RemoveVideo)
        {
            baiHoc.VideoUrl = null;
            baiHoc.DurationSeconds = 0;
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
        await ChuanHoaViTriBaiGiang(baiHoc.SectionId);
        await TinhLaiThoiLuong(baiHoc.CourseId);
        return Results.Ok(MapLesson(baiHoc));
    }

    [HttpDelete("/api/instructor/lessons/{lessonId}")]
    public async Task<IResult> XoaBaiHoc(string lessonId)
    {
        var baiHoc = await LoadOwnedLesson(lessonId);
        if (baiHoc is null) return Results.Json(new { message = "Bạn không có quyền chỉnh sửa khóa học này." }, statusCode: 403);

        var sectionId = baiHoc.SectionId;
        var courseId = baiHoc.CourseId;
        db.Lessons.Remove(baiHoc);
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
        var khoaHocs = await db.Courses.AsNoTracking()
            .Where(c => c.InstructorId == userId)
            .Include(c => c.Enrollments)
            .Include(c => c.Purchases)
                .ThenInclude(p => p.User)
            .OrderByDescending(c => c.CreatedAt)
            .ToListAsync();

        var khoaHocIds = khoaHocs.Select(c => c.Id).ToList();
        var giaoDichHoanTat = await db.Purchases.AsNoTracking()
            .Where(p => khoaHocIds.Contains(p.CourseId) && p.Status == "COMPLETED")
            .Include(p => p.User)
            .Include(p => p.Course)
            .OrderByDescending(p => p.CreatedAt)
            .ToListAsync();

        var tongDoanhThu = giaoDichHoanTat.Sum(p => p.FinalAmount);
        var lichSuRutTien = await db.InstructorWithdrawals.AsNoTracking()
            .Where(item => item.InstructorId == userId && item.Status == "COMPLETED")
            .OrderByDescending(item => item.CreatedAt)
            .ToListAsync();
        var doanhThuDaThanhToan = lichSuRutTien.Sum(item => item.Amount);
        var doanhThuChoThanhToan = Math.Max(0, tongDoanhThu - doanhThuDaThanhToan);
        var giaoDichDaThanhToan = new HashSet<string>();
        var soTienDaThanhToanConLai = doanhThuDaThanhToan;
        foreach (var giaoDich in giaoDichHoanTat.OrderBy(item => item.CreatedAt))
        {
            if (soTienDaThanhToanConLai < giaoDich.FinalAmount) break;
            giaoDichDaThanhToan.Add(giaoDich.Id);
            soTienDaThanhToanConLai -= giaoDich.FinalAmount;
        }
        var soMua = giaoDichHoanTat.Count;
        var soHocVienMua = giaoDichHoanTat.Select(p => p.UserId).Distinct().Count();
        var giaTriTrungBinh = soMua == 0 ? 0 : (int)Math.Round(tongDoanhThu / (double)soMua);

        var lichSuDoanhThu = giaoDichHoanTat.Select(p => new GiaoDichDoanhThu(
                p.Id, "COURSE_REVENUE", p.FinalAmount,
                giaoDichDaThanhToan.Contains(p.Id) ? "PAID" : "PENDING",
                giaoDichDaThanhToan.Contains(p.Id) ? "Đã thanh toán" : "Chờ thanh toán",
                null, null, null, null, p.CreatedAt,
                p.User == null ? null : new { p.User.Id, p.User.Name, p.User.Email, p.User.Avatar },
                p.Course == null ? null : new { p.Course.Id, p.Course.Title, p.Course.Thumbnail }))
            .Concat(lichSuRutTien.Select(item => new GiaoDichDoanhThu(
                item.Id, "DEMO_WITHDRAWAL", -item.Amount, item.Status, "Rút tiền demo thành công", item.Note,
                item.BankName, item.AccountNumber, item.AccountHolder, item.CreatedAt, null, null)))
            .OrderByDescending(item => item.CreatedAt)
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
                var purchases = c.Purchases.Where(p => p.Status == "COMPLETED").ToList();
                return new
                {
                    c.Id,
                    title = c.Title,
                    price = c.Price,
                    isPublished = IsCoursePublished(c),
                    status = c.Status,
                    enrollments = c.Enrollments.Count,
                    purchases = purchases.Count,
                    revenue = purchases.Sum(p => p.FinalAmount),
                    averageRating = c.AverageRating,
                    reviewCount = c.ReviewCount,
                    createdAt = c.CreatedAt,
                    updatedAt = c.UpdatedAt
                };
            }),
            recentPurchases = giaoDichHoanTat.Take(10).Select(p => new
            {
                p.Id,
                amount = p.FinalAmount,
                payoutStatus = giaoDichDaThanhToan.Contains(p.Id) ? "PAID" : "PENDING",
                originalAmount = p.OriginalAmount,
                discountAmount = p.DiscountAmount,
                status = p.Status,
                createdAt = p.CreatedAt,
                user = p.User == null ? null : new { p.User.Id, p.User.Name, p.User.Email, p.User.Avatar },
                course = p.Course == null ? null : new { p.Course.Id, p.Course.Title, p.Course.Thumbnail }
            }),
            recentTransactions = lichSuDoanhThu
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

        var giangVien = await db.Users.FirstOrDefaultAsync(item => item.Id == userId);
        var taiKhoanNhanTien = DocTaiKhoanNhanTien(giangVien?.Settings);
        if (taiKhoanNhanTien is null)
        {
            return Results.BadRequest(new { message = "Vui lòng lưu tài khoản nhận tiền trước khi rút" });
        }

        var strategy = db.Database.CreateExecutionStrategy();
        var ketQua = await strategy.ExecuteAsync(async () =>
        {
            await using var transaction = await db.Database.BeginTransactionAsync(IsolationLevel.Serializable);
            var tongDoanhThu = await db.Purchases
                .Where(item => item.Status == "COMPLETED" && item.Course!.InstructorId == userId)
                .SumAsync(item => item.FinalAmount);
            var doanhThuDaThanhToan = await db.InstructorWithdrawals
                .Where(item => item.InstructorId == userId && item.Status == "COMPLETED")
                .SumAsync(item => item.Amount);
            var doanhThuChoThanhToan = Math.Max(0, tongDoanhThu - doanhThuDaThanhToan);

            if (yeuCau.SoTien > doanhThuChoThanhToan)
            {
                await transaction.RollbackAsync();
                return new KetQuaRutTien(false, tongDoanhThu, doanhThuChoThanhToan, doanhThuDaThanhToan);
            }

            db.InstructorWithdrawals.Add(new RutTienGiangVien
            {
                Id = TaoId.Moi(),
                InstructorId = userId,
                Amount = yeuCau.SoTien,
                Status = "COMPLETED",
                BankName = taiKhoanNhanTien.BankName,
                AccountNumber = taiKhoanNhanTien.AccountNumber,
                AccountHolder = taiKhoanNhanTien.AccountHolder,
                Note = string.IsNullOrWhiteSpace(yeuCau.GhiChu) ? null : yeuCau.GhiChu.Trim(),
                CreatedAt = DateTime.UtcNow
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

    private sealed record TaiKhoanNhanTien(string BankName, string AccountNumber, string AccountHolder);
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
        DateTime CreatedAt,
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
                InstructorId = userId,
                Amount = yeuCau.SoTien,
                Status = "PENDING",
                BankName = yeuCau.BankName.Trim(),
                AccountHolder = yeuCau.AccountHolder.Trim(),
                AccountNumber = yeuCau.AccountNumber.Trim(),
                Note = TaoGhiChuRutTien(yeuCau.Branch, yeuCau.GhiChu),
                CreatedAt = DateTime.UtcNow
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

        var giangVien = await db.Users.AsNoTracking().FirstOrDefaultAsync(item => item.Id == userId);
        var taiKhoanNhanTien = DocTaiKhoanNhanTien(giangVien?.Settings);
        var khoaHocs = await db.Courses.AsNoTracking()
            .Where(c => c.InstructorId == userId)
            .Include(c => c.Enrollments)
            .Include(c => c.Purchases)
                .ThenInclude(p => p.User)
            .OrderByDescending(c => c.CreatedAt)
            .ToListAsync();

        var khoaHocIds = khoaHocs.Select(c => c.Id).ToList();
        var giaoDichHoanTat = await db.Purchases.AsNoTracking()
            .Where(p => khoaHocIds.Contains(p.CourseId) && p.Status == "COMPLETED")
            .Include(p => p.User)
            .Include(p => p.Course)
            .OrderByDescending(p => p.CreatedAt)
            .ToListAsync();

        var lichSuRutTien = await db.InstructorWithdrawals.AsNoTracking()
            .Where(item => item.InstructorId == userId)
            .OrderByDescending(item => item.CreatedAt)
            .ToListAsync();

        var tongDoanhThu = giaoDichHoanTat.Sum(p => p.FinalAmount);
        var doanhThuThangNay = giaoDichHoanTat.Where(p => p.CreatedAt >= monthStart).Sum(p => p.FinalAmount);
        var doanhThuChoXacNhan = giaoDichHoanTat.Where(p => p.CreatedAt > cutoff).Sum(p => p.FinalAmount);
        var doanhThuDaSanSang = giaoDichHoanTat.Where(p => p.CreatedAt <= cutoff).Sum(p => p.FinalAmount);
        var daRut = lichSuRutTien.Where(item => LaTrangThaiDaTraMoi(item.Status)).Sum(item => item.Amount);
        var dangXuLy = lichSuRutTien.Where(item => LaTrangThaiDangXuLyMoi(item.Status)).Sum(item => item.Amount);
        var soDuKhaDung = Math.Max(0, doanhThuDaSanSang - daRut - dangXuLy);
        var soMua = giaoDichHoanTat.Count;
        var soHocVienMua = giaoDichHoanTat.Select(p => p.UserId).Distinct().Count();
        var giaTriTrungBinh = soMua == 0 ? 0 : (int)Math.Round(tongDoanhThu / (double)soMua);

        var history = giaoDichHoanTat.Select(p =>
        {
            var sanSang = p.CreatedAt <= cutoff;
            return (object)new
            {
                p.Id,
                type = "COURSE_SALE",
                typeLabel = "Bán khóa học",
                amount = p.FinalAmount,
                status = sanSang ? "APPROVED" : "PENDING",
                statusLabel = sanSang ? "Approved" : "Pending",
                note = p.Course == null ? "Doanh thu khóa học" : $"Doanh thu: {p.Course.Title}",
                createdAt = p.CreatedAt,
                date = p.CreatedAt,
                user = p.User == null ? null : new { p.User.Id, p.User.Name, p.User.Email, p.User.Avatar },
                course = p.Course == null ? null : new { p.Course.Id, p.Course.Title, p.Course.Thumbnail },
                bankName = (string?)null,
                accountNumber = (string?)null,
                accountHolder = (string?)null
            };
        })
        .Concat(lichSuRutTien.Select(item =>
        {
            var status = ChuanHoaTrangThaiRutTienMoi(item.Status);
            return (object)new
            {
                item.Id,
                type = "WITHDRAWAL",
                typeLabel = "Rút tiền",
                amount = -item.Amount,
                status,
                statusLabel = VietHoaTrangThaiGiaoDichMoi(status),
                note = item.Note,
                createdAt = item.CreatedAt,
                date = item.CreatedAt,
                user = (object?)null,
                course = (object?)null,
                item.BankName,
                item.AccountNumber,
                item.AccountHolder
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
            taiKhoanNhanTien is null ? null : new { taiKhoanNhanTien.BankName, taiKhoanNhanTien.AccountNumber, taiKhoanNhanTien.AccountHolder },
            khoaHocs.Select(c =>
            {
                var purchases = c.Purchases.Where(p => p.Status == "COMPLETED").ToList();
                return (object)new
                {
                    c.Id,
                    title = c.Title,
                    price = c.Price,
                    isPublished = IsCoursePublished(c),
                    status = c.Status,
                    enrollments = c.Enrollments.Count,
                    purchases = purchases.Count,
                    revenue = purchases.Sum(p => p.FinalAmount),
                    availableRevenue = purchases.Where(p => p.CreatedAt <= cutoff).Sum(p => p.FinalAmount),
                    pendingRevenue = purchases.Where(p => p.CreatedAt > cutoff).Sum(p => p.FinalAmount),
                    averageRating = c.AverageRating,
                    reviewCount = c.ReviewCount,
                    createdAt = c.CreatedAt,
                    updatedAt = c.UpdatedAt
                };
            }).ToList(),
            giaoDichHoanTat.Take(10).Select(p => (object)new
            {
                p.Id,
                amount = p.FinalAmount,
                payoutStatus = p.CreatedAt <= cutoff ? "APPROVED" : "PENDING",
                originalAmount = p.OriginalAmount,
                discountAmount = p.DiscountAmount,
                status = p.Status,
                createdAt = p.CreatedAt,
                user = p.User == null ? null : new { p.User.Id, p.User.Name, p.User.Email, p.User.Avatar },
                course = p.Course == null ? null : new { p.Course.Id, p.Course.Title, p.Course.Thumbnail }
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
        courses = data.Courses,
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
        List<object> Courses,
        List<object> RecentPurchases,
        List<object> History);

    [NonAction]
    public async Task<IResult> DanhSachHocVien()
    {
        var loi = TroGiup.YeuCauGiangVien(User); if (loi is not null) return loi;
        var userId = TroGiup.LayUserId(User)!;
        var khoaHocIds = await db.Courses.AsNoTracking().Where(c => c.InstructorId == userId).Select(c => c.Id).ToListAsync();
        var ghiDanh = await db.Enrollments.AsNoTracking()
            .Where(e => khoaHocIds.Contains(e.CourseId)).Include(e => e.User).Include(e => e.Course)
            .OrderByDescending(e => e.CreatedAt).Take(100)
            .ToListAsync();

        var hocViens = ghiDanh
            .Where(e => e.User is not null)
            .GroupBy(e => e.UserId)
            .Select(group =>
            {
                var moiNhat = group.OrderByDescending(e => e.CreatedAt).First();
                var courses = group
                    .OrderByDescending(e => e.CreatedAt)
                    .Select(e => new
                    {
                        id = e.CourseId,
                        title = e.Course?.Title ?? "Khóa học",
                        progress = e.Progress,
                        completedAt = e.CompletedAt,
                        enrolledAt = e.CreatedAt
                    })
                    .ToList();

                return new
                {
                    id = moiNhat.UserId,
                    name = moiNhat.User?.Name ?? "Học viên",
                    email = moiNhat.User?.Email,
                    avatar = moiNhat.User?.Avatar,
                    courses,
                    courseCount = courses.Count,
                    averageProgress = Math.Round(group.Average(e => e.Progress)),
                    latestEnrollmentAt = moiNhat.CreatedAt
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
        return Results.Ok(await db.Courses.AsNoTracking()
            .Where(course => course.InstructorId == userId)
            .OrderByDescending(course => course.CreatedAt)
            .Select(course => new { course.Id, tenKhoaHoc = course.Title })
            .ToListAsync());
    }

    [HttpGet("/api/instructor/students")]
    public async Task<IResult> DanhSachHocVienTheoKhoaHoc([FromQuery] string? courseId = "all")
    {
        var loi = TroGiup.YeuCauGiangVien(User); if (loi is not null) return loi;
        var userId = TroGiup.LayUserId(User)!;
        var khoaHocIds = await db.Courses.AsNoTracking()
            .Where(course => course.InstructorId == userId)
            .Select(course => course.Id)
            .ToListAsync();
        var locTatCa = string.IsNullOrWhiteSpace(courseId) || string.Equals(courseId, "all", StringComparison.OrdinalIgnoreCase);

        if (!locTatCa && !khoaHocIds.Contains(courseId!))
        {
            return Results.Json(new { message = "Bạn không có quyền xem học viên của khóa học này." }, statusCode: 403);
        }

        var ghiDanhQuery = db.Enrollments.AsNoTracking()
            .Where(enrollment => khoaHocIds.Contains(enrollment.CourseId));
        if (!locTatCa)
        {
            ghiDanhQuery = ghiDanhQuery.Where(enrollment => enrollment.CourseId == courseId);
        }

        var ghiDanh = await ghiDanhQuery
            .Include(enrollment => enrollment.User)
            .Include(enrollment => enrollment.Course)
            .OrderByDescending(enrollment => enrollment.CreatedAt)
            .ToListAsync();
        var khoaHocDangLoc = locTatCa ? khoaHocIds : [courseId!];
        var doanhThu = await db.Purchases.AsNoTracking()
            .Where(purchase => khoaHocDangLoc.Contains(purchase.CourseId) && purchase.Status == "COMPLETED")
            .SumAsync(purchase => purchase.FinalAmount);
        var hocVienHoanThanh = ghiDanh.Count(enrollment => enrollment.CompletedAt is not null || enrollment.Progress >= 100);
        var hocVienDangHoc = ghiDanh.Count - hocVienHoanThanh;
        var tongHocVien = ghiDanh.Select(enrollment => enrollment.UserId).Distinct().Count();
        var tienDoTrungBinh = ghiDanh.Count == 0 ? 0 : Math.Round(ghiDanh.Average(enrollment => enrollment.Progress));

        var hocViens = ghiDanh.Select(enrollment =>
        {
            var hoanThanh = enrollment.CompletedAt is not null || enrollment.Progress >= 100;
            return new
            {
                id = enrollment.Id,
                hocVienId = enrollment.UserId,
                hoTen = enrollment.User?.Name ?? "Học viên",
                email = enrollment.User?.Email ?? string.Empty,
                avatar = enrollment.User?.Avatar,
                courseId = enrollment.CourseId,
                tenKhoaHoc = enrollment.Course?.Title ?? "Khóa học",
                ngayGhiDanh = enrollment.CreatedAt,
                tienDo = Math.Round(enrollment.Progress),
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

        chuong.Title = tieuDe;
        chuong.Description = yeuCau.MoTa ?? yeuCau.Description;
        if (yeuCau.ThuTu is not null) chuong.Position = Math.Max(1, yeuCau.ThuTu.Value);
        chuong.UpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync();
        await ChuanHoaViTriChuong(chuong.CourseId);
        return Results.Ok(MapSection(chuong));
    }

    private async Task<IResult> DeleteSection(ChuongHoc chuong)
    {
        var courseId = chuong.CourseId;
        var lessonIds = await db.Lessons
            .Where(lesson => lesson.SectionId == chuong.Id)
            .Select(lesson => lesson.Id)
            .ToListAsync();

        if (lessonIds.Count > 0)
        {
            var quizIds = await db.Quizzes
                .Where(quiz => lessonIds.Contains(quiz.LessonId))
                .Select(quiz => quiz.Id)
                .ToListAsync();

            if (quizIds.Count > 0)
            {
                db.QuizSubmissions.RemoveRange(db.QuizSubmissions.Where(submission => quizIds.Contains(submission.QuizId)));
                db.QuizQuestions.RemoveRange(db.QuizQuestions.Where(question => quizIds.Contains(question.QuizId)));
                db.Quizzes.RemoveRange(db.Quizzes.Where(quiz => quizIds.Contains(quiz.Id)));
            }

            db.Assignments.RemoveRange(db.Assignments.Where(assignment => assignment.LessonId != null && lessonIds.Contains(assignment.LessonId)));
            db.LessonProgresses.RemoveRange(db.LessonProgresses.Where(progress => lessonIds.Contains(progress.LessonId)));

            var comments = await db.Comments
                .Where(comment => lessonIds.Contains(comment.LessonId))
                .ToListAsync();
            var commentIds = comments.Select(comment => comment.Id).ToList();
            db.Comments.RemoveRange(comments.Where(comment => comment.ParentId != null && commentIds.Contains(comment.ParentId)));
            db.Comments.RemoveRange(comments.Where(comment => comment.ParentId == null || !commentIds.Contains(comment.ParentId)));

            db.Lessons.RemoveRange(db.Lessons.Where(lesson => lessonIds.Contains(lesson.Id)));
        }

        db.Sections.Remove(chuong);
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
        var query = db.Courses
            .Include(c => c.Sections.OrderBy(s => s.Position))
                .ThenInclude(s => s.Lessons.OrderBy(l => l.Position))
            .Include(c => c.Enrollments)
            .Where(c => c.Id == courseId && c.InstructorId == userId);
        if (asNoTracking) query = query.AsNoTracking();
        return await query.FirstOrDefaultAsync();
    }

    private async Task<ChuongHoc?> LoadOwnedSection(string sectionId, string? courseId = null)
    {
        var userId = TroGiup.LayUserId(User);
        if (userId is null) return null;

        return await db.Sections
            .Include(s => s.Course)
            .Include(s => s.Lessons)
            .FirstOrDefaultAsync(s => s.Id == sectionId && (courseId == null || s.CourseId == courseId) && s.Course != null && s.Course.InstructorId == userId);
    }

    private async Task<BaiHoc?> LoadOwnedLesson(string lessonId)
    {
        var userId = TroGiup.LayUserId(User);
        if (userId is null) return null;

        return await db.Lessons
            .Include(l => l.Course)
            .FirstOrDefaultAsync(l => l.Id == lessonId && l.Course != null && l.Course.InstructorId == userId);
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
        return kh.IsPublished
            || string.Equals(kh.Status, "PUBLIC", StringComparison.OrdinalIgnoreCase)
            || string.Equals(kh.Status, "PUBLISHED", StringComparison.OrdinalIgnoreCase);
    }

    private static IResult? ValidateFile(IFormFile file, HashSet<string> allowedTypes, long maxSize, string label)
    {
        if (!allowedTypes.Contains(file.ContentType)) return Results.BadRequest(new { message = $"{label} không đúng định dạng được hỗ trợ." });
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

    private static object MapCourse(KhoaHoc kh)
    {
        var sections = kh.Sections.OrderBy(s => s.Position).Select(MapSection).ToList();
        var errors = PublishErrors(kh);
        return new
        {
            id = kh.Id,
            title = kh.Title,
            tieuDe = kh.Title,
            moTaNgan = kh.ShortDescription,
            moTa = kh.Description,
            moTaChiTiet = kh.DetailedDescription,
            description = kh.Description,
            thumbnail = kh.Thumbnail,
            anhBia = kh.Thumbnail,
            danhMuc = kh.Category,
            trinhDo = kh.Level,
            price = kh.Price,
            gia = kh.Price,
            trangThai = kh.Status,
            status = kh.Status,
            isPublished = kh.IsPublished,
            daXuatBan = kh.IsPublished,
            totalDurationSeconds = kh.TotalDurationSeconds,
            sectionCount = kh.Sections.Count,
            lessonCount = kh.Sections.Sum(s => s.Lessons.Count),
            studentCount = kh.Enrollments.Count,
            totalLessons = kh.Sections.Sum(s => s.Lessons.Count),
            enrollments = kh.Enrollments.Count,
            createdAt = kh.CreatedAt,
            updatedAt = kh.UpdatedAt,
            startDate = kh.StartDate,
            endDate = kh.EndDate,
            instructorId = kh.InstructorId,
            sections,
            publishValidationErrors = errors,
            canPublish = errors.Count == 0
        };
    }

    private static object MapDashboardCourse(KhoaHoc kh)
    {
        var soChuong = kh.Sections.Count;
        var soBaiHoc = kh.Sections.Sum(s => s.Lessons.Count);
        var soHocVien = kh.Enrollments.Count;
        var doanhThu = kh.Purchases.Where(p => p.Status == "COMPLETED").Sum(p => p.FinalAmount);
        var danhGia = kh.Reviews.Count == 0 ? null : (double?)Math.Round(kh.Reviews.Average(r => r.Rating), 1);

        return new
        {
            id = kh.Id,
            title = kh.Title,
            tenKhoaHoc = kh.Title,
            moTaNgan = kh.ShortDescription ?? kh.Description,
            description = kh.Description,
            thumbnail = kh.Thumbnail,
            anhBia = kh.Thumbnail,
            price = kh.Price,
            gia = kh.Price,
            trangThai = kh.Status,
            status = kh.Status,
            isPublished = kh.IsPublished,
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
            reviewCount = kh.Reviews.Count,
            createdAt = kh.CreatedAt,
            updatedAt = kh.UpdatedAt
        };
    }

    private static object MapSection(ChuongHoc chuong)
    {
        var lessons = chuong.Lessons.OrderBy(l => l.Position).Select(MapLesson).ToList();
        return new
        {
            id = chuong.Id,
            title = chuong.Title,
            tieuDe = chuong.Title,
            description = chuong.Description,
            moTa = chuong.Description,
            position = chuong.Position,
            thuTu = chuong.Position,
            lessons,
            baiHocs = lessons
        };
    }

    private static object MapLesson(BaiHoc bai)
    {
        return new
        {
            id = bai.Id,
            title = bai.Title,
            tieuDe = bai.Title,
            content = bai.Content,
            noiDung = bai.Content,
            videoUrl = bai.VideoUrl,
            anhMinhHoa = bai.IllustrationUrl,
            illustrationUrl = bai.IllustrationUrl,
            fileUrl = bai.FileUrl,
            durationSeconds = bai.DurationSeconds ?? 0,
            thoiLuongGiay = bai.DurationSeconds ?? 0,
            isPreview = bai.IsPreview,
            choPhepHocThu = bai.IsPreview,
            isPublished = bai.IsPublished,
            status = bai.Status,
            position = bai.Position,
            thuTu = bai.Position,
            sectionId = bai.SectionId
        };
    }

    private static List<string> PublishErrors(KhoaHoc kh)
    {
        var errors = new List<string>();
        if (string.IsNullOrWhiteSpace(kh.Title)) errors.Add("Khóa học cần có tiêu đề.");
        if (string.IsNullOrWhiteSpace(kh.Description)) errors.Add("Khóa học cần có mô tả.");
        if (kh.Sections.Count == 0) errors.Add("Khóa học cần ít nhất 1 chương.");
        if (kh.Sections.Sum(s => s.Lessons.Count) == 0) errors.Add("Khóa học cần ít nhất 1 bài học.");
        return errors;
    }

    private async Task<string> TaoSlugDuyNhat(string tieuDe, string? boQuaId = null)
    {
        var slugGoc = TaoSlug(tieuDe);
        var slug = slugGoc;
        var dem = 2;
        while (await db.Courses.AnyAsync(c => c.Slug == slug && c.Id != boQuaId))
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
        var ds = await db.Sections.Where(s => s.CourseId == courseId).OrderBy(s => s.Position).ToListAsync();
        for (var i = 0; i < ds.Count; i++) ds[i].Position = i + 1;
        await db.SaveChangesAsync();
    }

    private async Task ChuanHoaViTriBaiGiang(string sectionId)
    {
        var ds = await db.Lessons.Where(l => l.SectionId == sectionId).OrderBy(l => l.Position).ToListAsync();
        for (var i = 0; i < ds.Count; i++) ds[i].Position = i + 1;
        await db.SaveChangesAsync();
    }

    private async Task TinhLaiThoiLuong(string courseId)
    {
        var tong = await db.Lessons.Where(l => l.CourseId == courseId).SumAsync(l => l.DurationSeconds ?? 0);
        var kh = await db.Courses.FirstOrDefaultAsync(c => c.Id == courseId);
        if (kh is null) return;
        kh.TotalDurationSeconds = tong;
        kh.UpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync();
    }
}

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
