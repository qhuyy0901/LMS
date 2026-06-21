using LMS.Api.Infrastructure.Persistence;
using LMS.Api.Domain.Entities;
using LMS.Api.Application.Services;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace LMS.Api.Controllers;

[Route("KhamPha")]
public class KhamPhaController(ApplicationDbContext db) : Controller
{
    [HttpGet("")]
    public async Task<IActionResult> Index(string? danhMucSlug = null, string? danhMucId = null, string? search = null)
    {
        // Get active categories that have at least one published course
        var categories = await db.DanhMuc
            .AsNoTracking()
            .Where(dm => dm.HoatDong && db.KhoaHoc.Any(c => c.DanhMucId == dm.Id && c.DaXuatBan))
            .OrderBy(dm => dm.Ten)
            .ToListAsync();

        var query = db.KhoaHoc
            .AsNoTracking()
            .Include(c => c.GiangVien)
            .Include(c => c.CacBaiHoc)
            .Where(c => c.DaXuatBan);

        string? selectedCategoryId = null;

        if (!string.IsNullOrWhiteSpace(danhMucId))
        {
            query = query.Where(c => c.DanhMucId == danhMucId);
            selectedCategoryId = danhMucId;
        }
        else if (!string.IsNullOrWhiteSpace(danhMucSlug))
        {
            var categoryBySlug = await db.DanhMuc.AsNoTracking().FirstOrDefaultAsync(dm => dm.Slug == danhMucSlug);
            if (categoryBySlug != null)
            {
                query = query.Where(c => c.DanhMucId == categoryBySlug.Id);
                selectedCategoryId = categoryBySlug.Id;
            }
        }

        if (!string.IsNullOrWhiteSpace(search))
        {
            var term = search.Trim().ToLower();
            query = query.Where(c => c.TieuDe.ToLower().Contains(term) || (c.MoTaNgan != null && c.MoTaNgan.ToLower().Contains(term)));
            ViewData["SearchQuery"] = search;
        }

        var courses = await query.OrderByDescending(c => c.NgayTao).ToListAsync();

        ViewData["Categories"] = categories;
        ViewData["SelectedCategoryId"] = selectedCategoryId;

        return View(courses);
    }
}
