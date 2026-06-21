using LMS.Api.Infrastructure.Persistence;
using LMS.Api.Domain.Entities;
using LMS.Api.Application.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace LMS.Api.Areas.HocVien.Controllers;

/// <summary>Quản lý giỏ hàng / khóa học đã lưu từ trang Khám phá</summary>
[ApiController]
[Authorize]
[Area("Student")]
public class GioHangController(ApplicationDbContext db) : ControllerBase
{
    /// <summary>Lấy danh sách khóa học đã lưu của người dùng</summary>
    [HttpGet("/api/user/saved-courses")]
    public async Task<IResult> DanhSachDaLuu()
    {
        var userId = TroGiup.LayUserId(User);
        if (userId is null) return Results.Unauthorized();

        // Lấy tất cả các mục đã lưu
        var ds = await db.KhoaHocDaLuu
            .Where(s => s.NguoiDungId == userId)
            .Include(s => s.KhoaHoc)
                .ThenInclude(c => c!.GiangVien)
            .OrderByDescending(s => s.NgayTao)
            .ToListAsync();

        // Lấy danh sách khóa học đã mua/ghi danh của học viên
        var daMuaIds = await db.GhiDanh
            .Where(e => e.NguoiDungId == userId)
            .Select(e => e.KhoaHocId)
            .Union(db.DonMua
                .Where(p => p.NguoiDungId == userId && p.TrangThai == "COMPLETED")
                .Select(p => p.KhoaHocId))
            .Distinct()
            .ToListAsync();

        var daMuaSet = daMuaIds.ToHashSet();

        // Tự động xóa các khóa học đã mua/ghi danh khỏi danh sách đã lưu
        var mucCanXoa = ds.Where(s => daMuaSet.Contains(s.KhoaHocId)).ToList();
        if (mucCanXoa.Any())
        {
            db.KhoaHocDaLuu.RemoveRange(mucCanXoa);
            await db.SaveChangesAsync();
            
            // Cập nhật lại danh sách sau khi xóa
            ds = ds.Where(s => !daMuaSet.Contains(s.KhoaHocId)).ToList();
        }

        var ketQua = ds.Select(s => new
        {
            id = s.Id,
            courseId = s.KhoaHocId,
            savedAt = s.NgayTao,
            course = s.KhoaHoc == null ? null : new
            {
                id = s.KhoaHoc.Id,
                title = s.KhoaHoc.TieuDe,
                thumbnail = s.KhoaHoc.AnhDaiDien,
                price = s.KhoaHoc.Gia,
                category = s.KhoaHoc.ChuyenMuc,
                averageRating = s.KhoaHoc.DiemDanhGiaTrungBinh,
                reviewCount = s.KhoaHoc.SoLuongDanhGia,
                instructorName = s.KhoaHoc.GiangVien?.Ten ?? "Giảng viên",
                lessonCount = s.KhoaHoc.CacBaiHoc?.Count ?? 0,
                isPublished = s.KhoaHoc.DaXuatBan
            }
        });

        return Results.Ok(ketQua);
    }

    /// <summary>Lưu một khóa học vào giỏ hàng</summary>
    [HttpPost("/api/user/saved-courses")]
    public async Task<IResult> LuuKhoaHoc([FromBody] LuuKhoaHocRequest yeuCau)
    {
        var userId = TroGiup.LayUserId(User);
        if (userId is null) return Results.Unauthorized();

        if (string.IsNullOrWhiteSpace(yeuCau.CourseId))
            return Results.BadRequest(new { message = "courseId không được để trống" });

        // Kiểm tra khóa học tồn tại và đã public
        var khoaHoc = await db.KhoaHoc
            .AsNoTracking()
            .FirstOrDefaultAsync(c => c.Id == yeuCau.CourseId && c.DaXuatBan);

        if (khoaHoc is null)
            return Results.NotFound(new { message = "Không tìm thấy khóa học" });

        // Kiểm tra đã mua/ghi danh chưa
        var daMua = await db.GhiDanh.AnyAsync(e => e.NguoiDungId == userId && e.KhoaHocId == yeuCau.CourseId) ||
                     await db.DonMua.AnyAsync(p => p.NguoiDungId == userId && p.KhoaHocId == yeuCau.CourseId && p.TrangThai == "COMPLETED");

        if (daMua)
            return Results.BadRequest(new { message = "Bạn đã mua hoặc ghi danh khóa học này rồi" });

        // Kiểm tra đã lưu chưa
        var daLuu = await db.KhoaHocDaLuu
            .AnyAsync(s => s.NguoiDungId == userId && s.KhoaHocId == yeuCau.CourseId);

        if (daLuu)
            return Results.Conflict(new { message = "Khóa học đã được lưu" });

        var mucDaLuu = new KhoaHocDaLuu
        {
            Id = TaoId.Moi(),
            NguoiDungId = userId,
            KhoaHocId = yeuCau.CourseId,
            NgayTao = DateTime.UtcNow
        };

        db.KhoaHocDaLuu.Add(mucDaLuu);
        await db.SaveChangesAsync();

        return Results.Created($"/api/user/saved-courses/{yeuCau.CourseId}", new
        {
            id = mucDaLuu.Id,
            courseId = mucDaLuu.KhoaHocId,
            savedAt = mucDaLuu.NgayTao
        });
    }

    /// <summary>Xóa khóa học khỏi giỏ hàng</summary>
    [HttpDelete("/api/user/saved-courses/{courseId}")]
    public async Task<IResult> XoaKhoiGio(string courseId)
    {
        var userId = TroGiup.LayUserId(User);
        if (userId is null) return Results.Unauthorized();

        var mucDaLuu = await db.KhoaHocDaLuu
            .FirstOrDefaultAsync(s => s.NguoiDungId == userId && s.KhoaHocId == courseId);

        if (mucDaLuu is null)
            return Results.NotFound(new { message = "Không tìm thấy mục đã lưu" });

        db.KhoaHocDaLuu.Remove(mucDaLuu);
        await db.SaveChangesAsync();

        return Results.Ok(new { message = "Đã xóa khỏi danh sách đã lưu" });
    }

    /// <summary>Kiểm tra một khóa học có được lưu chưa</summary>
    [HttpGet("/api/user/saved-courses/{courseId}/check")]
    public async Task<IResult> KiemTraDaLuu(string courseId)
    {
        var userId = TroGiup.LayUserId(User);
        if (userId is null) return Results.Unauthorized();

        var daLuu = await db.KhoaHocDaLuu
            .AnyAsync(s => s.NguoiDungId == userId && s.KhoaHocId == courseId);

        return Results.Ok(new { saved = daLuu });
    }
}

[Area("Student")]
public class LuuKhoaHocRequest
{
    public string? CourseId { get; set; }
}
