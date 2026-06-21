using System.Security.Claims;
using LMS.Api.Infrastructure.Persistence;
using LMS.Api.Domain.Entities;
using LMS.Api.Application.Services;
using LMS.Api.Areas.GiangVien.ViewModels;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Rendering;
using Microsoft.EntityFrameworkCore;

namespace LMS.Api.Areas.GiangVien.Controllers;

[Area("Instructor")]
[Route("Instructor/KhoaHoc")]
public class KhoaHocController(ApplicationDbContext db, IWebHostEnvironment env) : Controller
{
    private static readonly HashSet<string> AllowedImageTypes = ["image/png", "image/jpeg", "image/jpg", "image/webp"];

    private string? CurrentUserId => TroGiup.LayUserId(User);
    private bool IsAuthorizedTeacher => User.FindFirstValue(ClaimTypes.Role) is "INSTRUCTOR" or "ADMIN";

    [HttpGet("Create")]
    public async Task<IActionResult> Create()
    {
        if (CurrentUserId is null) return Redirect("/login");
        if (!IsAuthorizedTeacher) return Forbid();

        var categories = await db.DanhMuc
            .Where(dm => dm.HoatDong)
            .OrderBy(dm => dm.Ten)
            .ToListAsync();

        var viewModel = new KhoaHocFormViewModel
        {
            KhoaHoc = new KhoaHoc { Gia = 0, TrinhDo = "BEGINNER" },
            DanhSachDanhMuc = new SelectList(categories, "Id", "Ten")
        };

        return View(viewModel);
    }

    [HttpPost("Create")]
    [ValidateAntiForgeryToken]
    public async Task<IActionResult> Create(KhoaHocFormViewModel model, IFormFile? CoverImageFile)
    {
        if (CurrentUserId is null) return Redirect("/login");
        if (!IsAuthorizedTeacher) return Forbid();

        var categories = await db.DanhMuc.Where(dm => dm.HoatDong).OrderBy(dm => dm.Ten).ToListAsync();
        model.DanhSachDanhMuc = new SelectList(categories, "Id", "Ten", model.KhoaHoc.DanhMucId);

        var title = model.KhoaHoc.TieuDe?.Trim();
        if (string.IsNullOrWhiteSpace(title) || title.Length < 5)
        {
            ModelState.AddModelError("KhoaHoc.TieuDe", "Tiêu đề khóa học tối thiểu 5 ký tự.");
        }

        var description = model.KhoaHoc.MoTa?.Trim();
        if (string.IsNullOrWhiteSpace(description) || description.Length < 20)
        {
            ModelState.AddModelError("KhoaHoc.MoTa", "Mô tả khóa học tối thiểu 20 ký tự.");
        }

        if (model.KhoaHoc.Gia < 0)
        {
            ModelState.AddModelError("KhoaHoc.Gia", "Giá khóa học không được âm.");
        }

        if (string.IsNullOrWhiteSpace(model.KhoaHoc.DanhMucId))
        {
            ModelState.AddModelError("KhoaHoc.DanhMucId", "Vui lòng chọn ngành / mảng của khóa học.");
        }

        if (!ModelState.IsValid)
        {
            return View(model);
        }

        string? coverPath = null;
        if (CoverImageFile is not null)
        {
            if (!AllowedImageTypes.Contains(CoverImageFile.ContentType) || CoverImageFile.Length > 5 * 1024 * 1024)
            {
                ModelState.AddModelError("", "Ảnh bìa không đúng định dạng hoặc vượt quá 5MB.");
                return View(model);
            }
            coverPath = await SaveUpload(CoverImageFile, "uploads/courses");
        }

        var selectedCategoryName = categories.FirstOrDefault(c => c.Id == model.KhoaHoc.DanhMucId)?.Ten ?? "Lập trình";
        var now = DateTime.UtcNow;

        var course = new KhoaHoc
        {
            Id = TaoId.Moi(),
            TieuDe = title!,
            DuongDanThanThien = await TaoSlugDuyNhat(title!),
            MoTaNgan = model.KhoaHoc.MoTaNgan?.Trim(),
            MoTa = description!,
            MoTaChiTiet = model.KhoaHoc.MoTaChiTiet?.Trim(),
            AnhDaiDien = coverPath ?? "/wwwroot/uploads/courses/default.png",
            DanhMucId = model.KhoaHoc.DanhMucId,
            ChuyenMuc = selectedCategoryName,
            TrinhDo = model.KhoaHoc.TrinhDo,
            Gia = model.KhoaHoc.Gia,
            HangThanhVienToiThieu = "BRONZE",
            GiangVienId = CurrentUserId!,
            DaXuatBan = false,
            TrangThai = "DRAFT",
            NgayTao = now,
            NgayCapNhat = now
        };

        db.KhoaHoc.Add(course);
        await db.SaveChangesAsync();

        return Redirect("http://localhost:5173/instructor/courses");
    }

    [HttpGet("Edit/{id}")]
    public async Task<IActionResult> Edit(string id)
    {
        if (CurrentUserId is null) return Redirect("/login");
        if (!IsAuthorizedTeacher) return Forbid();

        var course = await db.KhoaHoc.FirstOrDefaultAsync(c => c.Id == id && (c.GiangVienId == CurrentUserId || User.IsInRole("ADMIN")));
        if (course is null) return NotFound();

        var categories = await db.DanhMuc
            .Where(dm => dm.HoatDong)
            .OrderBy(dm => dm.Ten)
            .ToListAsync();

        var viewModel = new KhoaHocFormViewModel
        {
            KhoaHoc = course,
            DanhSachDanhMuc = new SelectList(categories, "Id", "Ten", course.DanhMucId)
        };

        return View(viewModel);
    }

    [HttpPost("Edit/{id}")]
    [ValidateAntiForgeryToken]
    public async Task<IActionResult> Edit(string id, KhoaHocFormViewModel model, IFormFile? CoverImageFile)
    {
        if (CurrentUserId is null) return Redirect("/login");
        if (!IsAuthorizedTeacher) return Forbid();

        var course = await db.KhoaHoc.FirstOrDefaultAsync(c => c.Id == id && (c.GiangVienId == CurrentUserId || User.IsInRole("ADMIN")));
        if (course is null) return NotFound();

        var categories = await db.DanhMuc.Where(dm => dm.HoatDong).OrderBy(dm => dm.Ten).ToListAsync();
        model.DanhSachDanhMuc = new SelectList(categories, "Id", "Ten", model.KhoaHoc.DanhMucId);

        var title = model.KhoaHoc.TieuDe?.Trim();
        if (string.IsNullOrWhiteSpace(title) || title.Length < 5)
        {
            ModelState.AddModelError("KhoaHoc.TieuDe", "Tiêu đề khóa học tối thiểu 5 ký tự.");
        }

        var description = model.KhoaHoc.MoTa?.Trim();
        if (string.IsNullOrWhiteSpace(description) || description.Length < 20)
        {
            ModelState.AddModelError("KhoaHoc.MoTa", "Mô tả khóa học tối thiểu 20 ký tự.");
        }

        if (model.KhoaHoc.Gia < 0)
        {
            ModelState.AddModelError("KhoaHoc.Gia", "Giá khóa học không được âm.");
        }

        if (string.IsNullOrWhiteSpace(model.KhoaHoc.DanhMucId))
        {
            ModelState.AddModelError("KhoaHoc.DanhMucId", "Vui lòng chọn ngành / mảng của khóa học.");
        }

        if (!ModelState.IsValid)
        {
            return View(model);
        }

        if (CoverImageFile is not null)
        {
            if (!AllowedImageTypes.Contains(CoverImageFile.ContentType) || CoverImageFile.Length > 5 * 1024 * 1024)
            {
                ModelState.AddModelError("", "Ảnh bìa không đúng định dạng hoặc vượt quá 5MB.");
                return View(model);
            }
            course.AnhDaiDien = await SaveUpload(CoverImageFile, "uploads/courses");
        }

        var selectedCategoryName = categories.FirstOrDefault(c => c.Id == model.KhoaHoc.DanhMucId)?.Ten ?? "Lập trình";

        course.TieuDe = title!;
        if (course.TieuDe != title)
        {
            course.DuongDanThanThien = await TaoSlugDuyNhat(title!, course.Id);
        }
        course.MoTaNgan = model.KhoaHoc.MoTaNgan?.Trim();
        course.MoTa = description!;
        course.MoTaChiTiet = model.KhoaHoc.MoTaChiTiet?.Trim();
        course.DanhMucId = model.KhoaHoc.DanhMucId;
        course.ChuyenMuc = selectedCategoryName;
        course.TrinhDo = model.KhoaHoc.TrinhDo;
        course.Gia = model.KhoaHoc.Gia;
        course.NgayCapNhat = DateTime.UtcNow;

        await db.SaveChangesAsync();

        return Redirect("http://localhost:5173/instructor/courses");
    }

    private async Task<string> SaveUpload(IFormFile file, string relativeFolder)
    {
        var root = env.WebRootPath;
        if (string.IsNullOrWhiteSpace(root)) root = Path.Combine(env.ContentRootPath, "wwwroot");
        var folder = Path.Combine(root, relativeFolder.Replace('/', Path.DirectorySeparatorChar));
        Directory.CreateDirectory(folder);
        var fileName = $"{Guid.NewGuid():N}{Path.GetExtension(file.FileName).ToLowerInvariant()}";
        var path = Path.Combine(folder, fileName);
        await using var stream = System.IO.File.Create(path);
        await file.CopyToAsync(stream);
        return "/" + relativeFolder.Trim('/').Replace("\\", "/") + "/" + fileName;
    }

    private async Task<string> TaoSlugDuyNhat(string tieuDe, string? excludeCourseId = null)
    {
        var baseSlug = TroGiup.TaoSlug(tieuDe);
        var slug = baseSlug;
        var counter = 2;
        while (await db.KhoaHoc.AnyAsync(c => c.DuongDanThanThien == slug && c.Id != excludeCourseId))
        {
            slug = $"{baseSlug}-{counter++}";
        }
        return slug;
    }
}
