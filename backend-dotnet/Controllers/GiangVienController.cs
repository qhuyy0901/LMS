using System.Text;
using System.Text.RegularExpressions;
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
            .OrderByDescending(c => c.CreatedAt)
            .ToListAsync();

        return Results.Ok(ds.Select(MapCourse));
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

        var errors = PublishErrors(kh);
        if (yeuCau.IsPublished && errors.Count > 0)
        {
            return Results.BadRequest(new
            {
                message = "Khóa học cần ít nhất 1 chương và 1 bài học có nội dung hoặc video trước khi xuất bản.",
                errors
            });
        }

        kh.IsPublished = yeuCau.IsPublished;
        kh.PublishedAt = yeuCau.IsPublished ? DateTime.UtcNow : kh.PublishedAt;
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
        if (yeuCau.DocumentFile is not null) baiHoc.FileUrl = await SaveUpload(yeuCau.DocumentFile, "uploads/lessons/files");

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
        var khoaHocIds = await db.Courses.AsNoTracking().Where(c => c.InstructorId == userId).Select(c => c.Id).ToListAsync();
        var tongDoanhThu = await db.Purchases.Where(p => khoaHocIds.Contains(p.CourseId)).SumAsync(p => p.FinalAmount);
        var soMua = await db.Purchases.CountAsync(p => khoaHocIds.Contains(p.CourseId));
        return Results.Ok(new { totalRevenue = tongDoanhThu, totalPurchases = soMua, courseCount = khoaHocIds.Count });
    }

    [HttpGet("/api/instructor/students")]
    public async Task<IResult> DanhSachHocVien()
    {
        var loi = TroGiup.YeuCauGiangVien(User); if (loi is not null) return loi;
        var userId = TroGiup.LayUserId(User)!;
        var khoaHocIds = await db.Courses.AsNoTracking().Where(c => c.InstructorId == userId).Select(c => c.Id).ToListAsync();
        var ds = await db.Enrollments.AsNoTracking()
            .Where(e => khoaHocIds.Contains(e.CourseId)).Include(e => e.User).Include(e => e.Course)
            .OrderByDescending(e => e.CreatedAt).Take(100)
            .Select(e => new { e.Id, e.Progress, e.CompletedAt, e.CreatedAt, user = e.User == null ? null : new { e.User.Id, e.User.Name, e.User.Email }, course = e.Course == null ? null : new { e.Course.Id, e.Course.Title } })
            .ToListAsync();
        return Results.Ok(ds);
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
            isPublished = kh.IsPublished,
            daXuatBan = kh.IsPublished,
            totalDurationSeconds = kh.TotalDurationSeconds,
            totalLessons = kh.Sections.Sum(s => s.Lessons.Count),
            createdAt = kh.CreatedAt,
            updatedAt = kh.UpdatedAt,
            instructorId = kh.InstructorId,
            sections,
            publishValidationErrors = errors,
            canPublish = errors.Count == 0
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
        if (string.IsNullOrWhiteSpace(kh.Thumbnail)) errors.Add("Khóa học cần có ảnh bìa.");
        if (kh.Sections.Count == 0) errors.Add("Khóa học cần ít nhất 1 chương.");
        if (kh.Sections.Sum(s => s.Lessons.Count) == 0) errors.Add("Khóa học cần ít nhất 1 bài học.");
        if (kh.Sections.SelectMany(s => s.Lessons).Any(l => string.IsNullOrWhiteSpace(l.Content) && string.IsNullOrWhiteSpace(l.VideoUrl)))
            errors.Add("Mỗi bài học cần có nội dung lý thuyết hoặc video.");
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
    public bool RemoveVideo { get; set; }
    public List<IFormFile>? ImageFiles { get; set; }
    public bool RemoveImage { get; set; }
    public IFormFile? DocumentFile { get; set; }
    public string? TrangThai { get; set; }
}
