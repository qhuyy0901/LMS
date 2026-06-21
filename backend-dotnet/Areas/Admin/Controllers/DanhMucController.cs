using System.Security.Claims;
using LMS.Api.Infrastructure.Persistence;
using LMS.Api.Domain.Entities;
using LMS.Api.Application.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace LMS.Api.Areas.Admin.Controllers;

[Area("Admin")]
[Route("Admin/DanhMuc")]
public class DanhMucController(ApplicationDbContext db) : Controller
{
    private string? CurrentUserId => TroGiup.LayUserId(User);
    private bool IsAuthorizedAdmin => User.FindFirstValue(ClaimTypes.Role) == "ADMIN";

    [HttpGet("")]
    public async Task<IActionResult> Index(string? q)
    {
        if (CurrentUserId is null) return Redirect("/login");
        if (!IsAuthorizedAdmin) return Forbid();

        var query = db.DanhMuc.AsNoTracking().AsQueryable();
        if (!string.IsNullOrWhiteSpace(q))
        {
            var cleanQuery = q.Trim().ToLower();
            query = query.Where(dm => dm.Ten.ToLower().Contains(cleanQuery) || (dm.MoTa != null && dm.MoTa.ToLower().Contains(cleanQuery)));
        }

        var list = await query.OrderByDescending(dm => dm.NgayTao).ToListAsync();

        var courseCounts = await db.KhoaHoc
            .Where(c => c.DanhMucId != null)
            .GroupBy(c => c.DanhMucId)
            .Select(g => new { DanhMucId = g.Key, Count = g.Count() })
            .ToDictionaryAsync(g => g.DanhMucId!, g => g.Count);

        ViewData["CourseCounts"] = courseCounts;
        ViewData["SearchQuery"] = q;

        return View(list);
    }

    [HttpGet("Create")]
    public IActionResult Create()
    {
        if (CurrentUserId is null) return Redirect("/login");
        if (!IsAuthorizedAdmin) return Forbid();

        return View(new DanhMuc { HoatDong = true });
    }

    [HttpPost("Create")]
    [ValidateAntiForgeryToken]
    public async Task<IActionResult> Create(DanhMuc model)
    {
        if (CurrentUserId is null) return Redirect("/login");
        if (!IsAuthorizedAdmin) return Forbid();

        var name = model.Ten?.Trim();
        if (string.IsNullOrWhiteSpace(name))
        {
            ModelState.AddModelError("Ten", "Tên danh mục không được để trống.");
        }
        else if (await db.DanhMuc.AnyAsync(dm => dm.Ten.ToLower() == name.ToLower()))
        {
            ModelState.AddModelError("Ten", "Tên danh mục này đã tồn tại.");
        }

        if (!ModelState.IsValid)
        {
            return View(model);
        }

        var baseSlug = TroGiup.TaoSlug(name!);
        var slug = baseSlug;
        int count = 1;
        while (await db.DanhMuc.AnyAsync(dm => dm.Slug == slug))
        {
            slug = $"{baseSlug}-{count++}";
        }

        var now = DateTime.UtcNow;
        var category = new DanhMuc
        {
            Id = Guid.NewGuid().ToString("N"),
            Ten = name!,
            Slug = slug,
            MoTa = model.MoTa?.Trim(),
            HoatDong = model.HoatDong,
            NgayTao = now,
            NgayCapNhat = now
        };

        db.DanhMuc.Add(category);
        await db.SaveChangesAsync();

        return RedirectToAction(nameof(Index));
    }

    [HttpGet("Edit/{id}")]
    public async Task<IActionResult> Edit(string id)
    {
        if (CurrentUserId is null) return Redirect("/login");
        if (!IsAuthorizedAdmin) return Forbid();

        var category = await db.DanhMuc.FirstOrDefaultAsync(dm => dm.Id == id);
        if (category is null) return NotFound();

        return View(category);
    }

    [HttpPost("Edit/{id}")]
    [ValidateAntiForgeryToken]
    public async Task<IActionResult> Edit(string id, DanhMuc model)
    {
        if (CurrentUserId is null) return Redirect("/login");
        if (!IsAuthorizedAdmin) return Forbid();

        var category = await db.DanhMuc.FirstOrDefaultAsync(dm => dm.Id == id);
        if (category is null) return NotFound();

        var name = model.Ten?.Trim();
        if (string.IsNullOrWhiteSpace(name))
        {
            ModelState.AddModelError("Ten", "Tên danh mục không được để trống.");
        }
        else if (await db.DanhMuc.AnyAsync(dm => dm.Ten.ToLower() == name.ToLower() && dm.Id != id))
        {
            ModelState.AddModelError("Ten", "Tên danh mục này đã tồn tại.");
        }

        if (!ModelState.IsValid)
        {
            return View(model);
        }

        if (category.Ten != name)
        {
            category.Ten = name!;
            var baseSlug = TroGiup.TaoSlug(name!);
            var slug = baseSlug;
            int count = 1;
            while (await db.DanhMuc.AnyAsync(dm => dm.Slug == slug && dm.Id != id))
            {
                slug = $"{baseSlug}-{count++}";
            }
            category.Slug = slug;
        }

        category.MoTa = model.MoTa?.Trim();
        category.HoatDong = model.HoatDong;
        category.NgayCapNhat = DateTime.UtcNow;

        await db.SaveChangesAsync();

        return RedirectToAction(nameof(Index));
    }

    [HttpGet("Delete/{id}")]
    public async Task<IActionResult> Delete(string id)
    {
        if (CurrentUserId is null) return Redirect("/login");
        if (!IsAuthorizedAdmin) return Forbid();

        var category = await db.DanhMuc.FirstOrDefaultAsync(dm => dm.Id == id);
        if (category is null) return NotFound();

        var courseCount = await db.KhoaHoc.CountAsync(c => c.DanhMucId == id);
        ViewData["CourseCount"] = courseCount;

        return View(category);
    }

    [HttpPost("Delete/{id}")]
    [ActionName("DeleteConfirmed")]
    [ValidateAntiForgeryToken]
    public async Task<IActionResult> DeleteConfirmed(string id)
    {
        if (CurrentUserId is null) return Redirect("/login");
        if (!IsAuthorizedAdmin) return Forbid();

        var category = await db.DanhMuc.FirstOrDefaultAsync(dm => dm.Id == id);
        if (category is null) return NotFound();

        var courseCount = await db.KhoaHoc.CountAsync(c => c.DanhMucId == id);
        if (courseCount > 0)
        {
            ModelState.AddModelError("", "Không thể xóa danh mục này vì đang có khóa học thuộc danh mục.");
            ViewData["CourseCount"] = courseCount;
            return View("Delete", category);
        }

        db.DanhMuc.Remove(category);
        await db.SaveChangesAsync();

        return RedirectToAction(nameof(Index));
    }

    [HttpPost("ToggleActive/{id}")]
    [ValidateAntiForgeryToken]
    public async Task<IActionResult> ToggleActive(string id)
    {
        if (CurrentUserId is null) return Redirect("/login");
        if (!IsAuthorizedAdmin) return Forbid();

        var category = await db.DanhMuc.FirstOrDefaultAsync(dm => dm.Id == id);
        if (category is null) return NotFound();

        category.HoatDong = !category.HoatDong;
        category.NgayCapNhat = DateTime.UtcNow;
        await db.SaveChangesAsync();

        return RedirectToAction(nameof(Index));
    }
}
