using System.Security.Claims;
using System.Text.Json;
using LMS.Api.Infrastructure.Persistence;
using LMS.Api.Domain.Entities;
using LMS.Api.Application.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace LMS.Api.Controllers;

[ApiController]
[Authorize]
public class SuKienController(ApplicationDbContext db, IWebHostEnvironment env) : ControllerBase
{
    private static readonly HashSet<string> EventTypes = ["WORKSHOP", "SEMINAR", "SPECIAL_TOPIC", "WEBINAR", "OTHER"];
    private static readonly HashSet<string> EventFormats = ["ONLINE", "OFFLINE", "HYBRID"];
    private static readonly HashSet<string> AllowedExtensions = [".png", ".jpg", ".jpeg", ".webp"];
    private const long MaxImageSize = 5 * 1024 * 1024; // 5MB

    [HttpGet("/api/events")]
    [HttpGet("/api/student/events")]
    public async Task<IResult> DanhSachCongKhai()
    {
        var userId = TroGiup.LayUserId(User);
        var events = await db.SuKien.AsNoTracking()
            .Where(item => item.TrangThai == "PUBLISHED")
            .Include(item => item.GiangVien)
            .Include(item => item.CacDangKy)
            .Include(item => item.CacHinhAnh)
            .OrderBy(item => item.ThoiGianBatDau)
            .ToListAsync();

        return Results.Ok(events.Select(item => MapEvent(item, userId)));
    }

    [HttpGet("/api/student/events/{id}")]
    public async Task<IResult> ChiTietCongKhai(string id)
    {
        var userId = TroGiup.LayUserId(User);
        var item = await db.SuKien.AsNoTracking()
            .Where(item => item.Id == id && item.TrangThai == "PUBLISHED")
            .Include(item => item.GiangVien)
            .Include(item => item.CacDangKy)
            .Include(item => item.CacHinhAnh)
            .FirstOrDefaultAsync();
        return item is null
            ? Results.NotFound(new { message = "Không tìm thấy sự kiện." })
            : Results.Ok(MapEvent(item, userId));
    }

    [HttpGet("/api/instructor/settings/meet-link")]
    public async Task<IResult> LayLienKetMeet()
    {
        var permissionError = TroGiup.YeuCauGiangVien(User);
        if (permissionError is not null) return permissionError;
        var userId = TroGiup.LayUserId(User)!;
        var settings = await db.NguoiDung.AsNoTracking()
            .Where(user => user.Id == userId)
            .Select(user => user.CaiDat)
            .FirstOrDefaultAsync();
        return Results.Ok(new { googleMeetLink = DocGoogleMeetLink(settings) });
    }

    [HttpPut("/api/instructor/settings/meet-link")]
    public async Task<IResult> LuuLienKetMeet([FromBody] LuuLienKetMeetRequest request)
    {
        var permissionError = TroGiup.YeuCauGiangVien(User);
        if (permissionError is not null) return permissionError;
        var link = request.GoogleMeetLink?.Trim();
        if (!IsGoogleMeetLink(link))
            return Results.BadRequest(new { message = "Liên kết Google Meet phải bắt đầu bằng https://meet.google.com/" });

        var userId = TroGiup.LayUserId(User)!;
        var user = await db.NguoiDung.FirstOrDefaultAsync(user => user.Id == userId);
        if (user is null) return Results.Unauthorized();
        Dictionary<string, JsonElement> settings;
        try
        {
            settings = string.IsNullOrWhiteSpace(user.CaiDat)
                ? []
                : JsonSerializer.Deserialize<Dictionary<string, JsonElement>>(user.CaiDat) ?? [];
        }
        catch (JsonException)
        {
            settings = [];
        }
        settings["googleMeetLink"] = JsonSerializer.SerializeToElement(link);
        user.CaiDat = JsonSerializer.Serialize(settings);
        user.NgayCapNhat = DateTime.UtcNow;
        await db.SaveChangesAsync();
        return Results.Ok(new { message = "Đã lưu liên kết Google Meet.", googleMeetLink = link });
    }

    [HttpGet("/api/instructor/events")]
    public async Task<IResult> DanhSachCuaGiangVien()
    {
        var permissionError = TroGiup.YeuCauGiangVien(User);
        if (permissionError is not null) return permissionError;

        var userId = TroGiup.LayUserId(User)!;
        var events = await db.SuKien.AsNoTracking()
            .Where(item => item.GiangVienId == userId)
            .Include(item => item.GiangVien)
            .Include(item => item.CacDangKy)
                .ThenInclude(item => item.NguoiDung)
            .Include(item => item.CacHinhAnh)
            .OrderByDescending(item => item.NgayTao)
            .ToListAsync();

        return Results.Ok(events.Select(item => MapEvent(item, userId, includeAttendees: true)));
    }

    [HttpGet("/api/instructor/events/{id}")]
    public async Task<IResult> ChiTietSuKien(string id)
    {
        var permissionError = TroGiup.YeuCauGiangVien(User);
        if (permissionError is not null) return permissionError;

        var userId = TroGiup.LayUserId(User)!;
        var item = await db.SuKien.AsNoTracking()
            .Include(e => e.GiangVien)
            .Include(e => e.CacDangKy).ThenInclude(r => r.NguoiDung)
            .Include(e => e.CacHinhAnh)
            .FirstOrDefaultAsync(e => e.Id == id && e.GiangVienId == userId);

        if (item is null) return Results.NotFound(new { message = "Không tìm thấy sự kiện." });
        return Results.Ok(MapEvent(item, userId, includeAttendees: true));
    }

    [HttpPost("/api/instructor/events")]
    public async Task<IResult> TaoSuKien([FromBody] LuuSuKienRequest request)
    {
        var permissionError = TroGiup.YeuCauGiangVien(User);
        if (permissionError is not null) return permissionError;

        var validationError = Validate(request);
        if (validationError is not null) return Results.BadRequest(new { message = validationError });

        var now = DateTime.UtcNow;
        var item = new SuKien
        {
            Id = TaoId.Moi(),
            GiangVienId = TroGiup.LayUserId(User)!,
            TrangThai = "PUBLISHED",
            NgayTao = now,
            NgayCapNhat = now
        };
        Apply(item, request);
        db.SuKien.Add(item);
        await db.SaveChangesAsync();
        return Results.Created($"/api/instructor/events/{item.Id}", MapEvent(item, item.GiangVienId));
    }

    [HttpPut("/api/instructor/events/{id}")]
    public async Task<IResult> CapNhatSuKien(string id, [FromBody] LuuSuKienRequest request)
    {
        var item = await LoadOwnedEvent(id);
        if (item is null) return Results.Json(new { message = "Bạn không có quyền chỉnh sửa sự kiện này." }, statusCode: 403);

        var validationError = Validate(request);
        if (validationError is not null) return Results.BadRequest(new { message = validationError });

        Apply(item, request);
        item.NgayCapNhat = DateTime.UtcNow;
        await db.SaveChangesAsync();

        // Reload with images for response
        await db.Entry(item).Collection(e => e.CacHinhAnh).LoadAsync();
        return Results.Ok(MapEvent(item, item.GiangVienId));
    }

    [HttpPost("/api/instructor/events/{id}/images")]
    [RequestSizeLimit(50 * 1024 * 1024)] // 50MB total limit
    public async Task<IResult> UploadAnhSuKien(string id, [FromForm] List<IFormFile> files)
    {
        var item = await LoadOwnedEvent(id);
        if (item is null) return Results.Json(new { message = "Bạn không có quyền chỉnh sửa sự kiện này." }, statusCode: 403);

        if (files is null || files.Count == 0)
            return Results.BadRequest(new { message = "Vui lòng chọn ít nhất một ảnh." });

        var errors = new List<string>();
        var uploadedImages = new List<object>();
        var uploadsDir = Path.Combine(env.WebRootPath, "uploads", "events");
        Directory.CreateDirectory(uploadsDir);

        // Check if event already has any images (for auto-cover)
        var existingCount = await db.SuKienAnh.CountAsync(img => img.SuKienId == id);
        var hasCover = existingCount > 0 && await db.SuKienAnh.AnyAsync(img => img.SuKienId == id && img.AnhBia);

        for (int i = 0; i < files.Count; i++)
        {
            var file = files[i];
            var ext = Path.GetExtension(file.FileName).ToLowerInvariant();

            if (!AllowedExtensions.Contains(ext))
            {
                errors.Add($"Ảnh {i + 1}: Chỉ hỗ trợ định dạng PNG, JPG, JPEG, WEBP.");
                continue;
            }

            if (file.Length > MaxImageSize)
            {
                errors.Add($"Ảnh {i + 1}: Kích thước tối đa là 5MB.");
                continue;
            }

            var fileName = $"{id}_{Guid.NewGuid():N}{ext}";
            var filePath = Path.Combine(uploadsDir, fileName);

            await using (var stream = new FileStream(filePath, FileMode.Create))
            {
                await file.CopyToAsync(stream);
            }

            var isCover = !hasCover && existingCount == 0 && i == 0;
            var imageRecord = new SuKienAnh
            {
                Id = TaoId.Moi(),
                SuKienId = id,
                AnhUrl = $"/uploads/events/{fileName}",
                AnhBia = isCover,
                NgayTao = DateTime.UtcNow
            };

            db.SuKienAnh.Add(imageRecord);
            existingCount++;
            if (isCover) hasCover = true;

            uploadedImages.Add(new
            {
                id = imageRecord.Id,
                imageUrl = imageRecord.AnhUrl,
                isCover = imageRecord.AnhBia,
                createdAt = imageRecord.NgayTao
            });
        }

        // Sync SuKien.AnhUrl with cover image
        await SyncCoverImage(item);
        await db.SaveChangesAsync();

        return Results.Ok(new
        {
            message = errors.Count > 0
                ? $"Đã upload {uploadedImages.Count} ảnh. {string.Join(" ", errors)}"
                : $"Đã upload {uploadedImages.Count} ảnh thành công.",
            images = uploadedImages,
            errors
        });
    }

    [HttpDelete("/api/instructor/events/{id}/images/{imageId}")]
    public async Task<IResult> XoaAnhSuKien(string id, string imageId)
    {
        var item = await LoadOwnedEvent(id);
        if (item is null) return Results.Json(new { message = "Bạn không có quyền chỉnh sửa sự kiện này." }, statusCode: 403);

        var suKienAnh = await db.SuKienAnh.FirstOrDefaultAsync(img => img.Id == imageId && img.SuKienId == id);
        if (suKienAnh is null) return Results.NotFound(new { message = "Không tìm thấy ảnh." });

        // Delete physical file
        var filePath = Path.Combine(env.WebRootPath, suKienAnh.AnhUrl.TrimStart('/').Replace('/', Path.DirectorySeparatorChar));
        if (System.IO.File.Exists(filePath))
        {
            System.IO.File.Delete(filePath);
        }

        var wasCover = suKienAnh.AnhBia;
        db.SuKienAnh.Remove(suKienAnh);
        await db.SaveChangesAsync();

        // If deleted image was cover, assign cover to first remaining image
        if (wasCover)
        {
            var firstRemaining = await db.SuKienAnh
                .Where(img => img.SuKienId == id)
                .OrderBy(img => img.NgayTao)
                .FirstOrDefaultAsync();

            if (firstRemaining is not null)
            {
                firstRemaining.AnhBia = true;
            }

            await SyncCoverImage(item);
            await db.SaveChangesAsync();
        }

        return Results.Ok(new { message = "Đã xóa ảnh." });
    }

    [HttpPatch("/api/instructor/events/{id}/images/{imageId}/set-cover")]
    public async Task<IResult> DatAnhDaiDien(string id, string imageId)
    {
        var item = await LoadOwnedEvent(id);
        if (item is null) return Results.Json(new { message = "Bạn không có quyền chỉnh sửa sự kiện này." }, statusCode: 403);

        var suKienAnh = await db.SuKienAnh.FirstOrDefaultAsync(img => img.Id == imageId && img.SuKienId == id);
        if (suKienAnh is null) return Results.NotFound(new { message = "Không tìm thấy ảnh." });

        // Clear all covers for this event
        var currentCovers = await db.SuKienAnh
            .Where(img => img.SuKienId == id && img.AnhBia)
            .ToListAsync();
        foreach (var cover in currentCovers)
        {
            cover.AnhBia = false;
        }

        // Set new cover
        suKienAnh.AnhBia = true;
        item.AnhUrl = suKienAnh.AnhUrl;
        item.NgayCapNhat = DateTime.UtcNow;
        await db.SaveChangesAsync();

        return Results.Ok(new { message = "Đã đặt ảnh đại diện." });
    }

    [HttpPatch("/api/instructor/events/{id}/publish")]
    public async Task<IResult> XuatBan(string id)
    {
        var item = await LoadOwnedEvent(id);
        if (item is null) return Results.Json(new { message = "Bạn không có quyền xuất bản sự kiện này." }, statusCode: 403);
        if (item.ThoiGianKetThuc <= item.ThoiGianBatDau || item.ThoiGianKetThuc <= DateTime.UtcNow)
            return Results.BadRequest(new { message = "Thời gian sự kiện không hợp lệ hoặc sự kiện đã kết thúc." });

        item.TrangThai = "PUBLISHED";
        item.NgayCapNhat = DateTime.UtcNow;
        await db.SaveChangesAsync();
        return Results.Ok(new { message = "Đã xuất bản sự kiện." });
    }

    [HttpPatch("/api/instructor/events/{id}/cancel")]
    public async Task<IResult> HuySuKien(string id)
    {
        var item = await LoadOwnedEvent(id);
        if (item is null) return Results.Json(new { message = "Bạn không có quyền hủy sự kiện này." }, statusCode: 403);

        item.TrangThai = "CANCELLED";
        item.NgayCapNhat = DateTime.UtcNow;
        await db.SaveChangesAsync();
        return Results.Ok(new { message = "Đã hủy sự kiện." });
    }

    [HttpDelete("/api/instructor/events/{id}")]
    public async Task<IResult> XoaSuKien(string id)
    {
        var item = await LoadOwnedEvent(id);
        if (item is null) return Results.Json(new { message = "Bạn không có quyền xóa sự kiện này." }, statusCode: 403);
        if (item.CacDangKy.Any(registration => registration.TrangThai == "REGISTERED"))
            return Results.BadRequest(new { message = "Sự kiện đã có người đăng ký nên không thể xóa. Bạn có thể hủy sự kiện." });

        // Delete all image files
        var dsSuKienAnh = await db.SuKienAnh.Where(img => img.SuKienId == id).ToListAsync();
        foreach (var suKienAnh in dsSuKienAnh)
        {
            var filePath = Path.Combine(env.WebRootPath, suKienAnh.AnhUrl.TrimStart('/').Replace('/', Path.DirectorySeparatorChar));
            if (System.IO.File.Exists(filePath))
            {
                System.IO.File.Delete(filePath);
            }
        }

        db.SuKienAnh.RemoveRange(dsSuKienAnh);
        db.DangKySuKien.RemoveRange(item.CacDangKy);
        db.SuKien.Remove(item);
        await db.SaveChangesAsync();
        return Results.Ok(new { message = "Đã xóa sự kiện." });
    }

    [HttpPost("/api/events/{id}/register")]
    [HttpPost("/api/student/events/{id}/register")]
    public async Task<IResult> DangKy(string id)
    {
        if (User.FindFirstValue(ClaimTypes.Role) != "STUDENT") return Results.Forbid();
        var userId = TroGiup.LayUserId(User)!;
        var item = await db.SuKien.Include(item => item.CacDangKy).FirstOrDefaultAsync(item => item.Id == id);
        if (item is null || item.TrangThai != "PUBLISHED") return Results.NotFound(new { message = "Không tìm thấy sự kiện đang mở đăng ký." });
        if (item.ThoiGianKetThuc <= DateTime.UtcNow) return Results.BadRequest(new { message = "Sự kiện đã kết thúc, không thể đăng ký." });

        var registration = item.CacDangKy.FirstOrDefault(entry => entry.NguoiDungId == userId);
        var activeCount = item.CacDangKy.Count(entry => entry.TrangThai == "REGISTERED");
        if (registration?.TrangThai == "REGISTERED") return Results.BadRequest(new { message = "Bạn đã đăng ký sự kiện này." });
        if (activeCount >= item.SucChua) return Results.BadRequest(new { message = "Sự kiện đã đủ số lượng đăng ký." });

        var now = DateTime.UtcNow;
        var user = await db.NguoiDung.FirstOrDefaultAsync(user => user.Id == userId);
        if (user is null) return Results.Unauthorized();
        var pointsUsed = Math.Max(0, item.DiemYeuCau);
        if (pointsUsed > 0)
        {
            if (user.DiemThuong < pointsUsed)
                return Results.BadRequest(new { message = "Bạn không đủ điểm để tham gia sự kiện này" });

            user.DiemThuong -= pointsUsed;
            user.NgayCapNhat = now;
        }

        if (registration is null)
        {
            registration = new DangKySuKien
            {
                Id = TaoId.Moi(),
                SuKienId = id,
                NguoiDungId = userId,
                DiemDaDung = pointsUsed,
                NgayDangKy = now,
                NgayTao = now,
                NgayCapNhat = now
            };
            db.DangKySuKien.Add(registration);
        }
        else
        {
            registration.TrangThai = "REGISTERED";
            registration.DiemDaDung = pointsUsed;
            registration.NgayDangKy = now;
            registration.NgayCapNhat = now;
        }

        var studentName = user.Ten;
        db.ThongBao.Add(new ThongBao
        {
            Id = TaoId.Moi(),
            NguoiDungId = item.GiangVienId,
            LoaiThongBao = "INSTRUCTOR_EVENT_REGISTRATION",
            TieuDe = "Có học viên đăng ký sự kiện",
            NoiDung = $"{studentName} vừa đăng ký sự kiện {item.TieuDe}.",
            DuongDan = "/instructor/events",
            Metadata = System.Text.Json.JsonSerializer.Serialize(new { eventId = item.Id, studentId = userId }),
            NgayTao = now
        });

        await db.SaveChangesAsync();
        return Results.Ok(new
        {
            message = "Đăng ký sự kiện thành công",
            isRegistered = true,
            registrationCount = activeCount + 1,
            pointsUsed,
            rewardPoints = user.DiemThuong,
            linkThamGia = item.LinkThamGia,
            onlineUrl = item.LinkThamGia
        });
    }

    [HttpDelete("/api/events/{id}/register")]
    [HttpDelete("/api/student/events/{id}/register")]
    public async Task<IResult> HuyDangKy(string id)
    {
        if (User.FindFirstValue(ClaimTypes.Role) != "STUDENT") return Results.Forbid();
        var userId = TroGiup.LayUserId(User)!;
        var registration = await db.DangKySuKien
            .Include(item => item.Event)
            .FirstOrDefaultAsync(item => item.SuKienId == id && item.NguoiDungId == userId);
        if (registration is null || registration.TrangThai != "REGISTERED")
            return Results.NotFound(new { message = "Bạn chưa đăng ký sự kiện này." });
        if (registration.Event?.ThoiGianBatDau <= DateTime.UtcNow)
            return Results.BadRequest(new { message = "Sự kiện đã bắt đầu, không thể hủy đăng ký." });

        registration.TrangThai = "CANCELLED";
        registration.NgayCapNhat = DateTime.UtcNow;
        await db.SaveChangesAsync();
        return Results.Ok(new { message = "Đã hủy đăng ký sự kiện." });
    }

    private async Task<SuKien?> LoadOwnedEvent(string id)
    {
        if (TroGiup.YeuCauGiangVien(User) is not null) return null;
        var userId = TroGiup.LayUserId(User);
        return await db.SuKien.Include(item => item.CacDangKy)
            .FirstOrDefaultAsync(item => item.Id == id && item.GiangVienId == userId);
    }

    private async Task SyncCoverImage(SuKien item)
    {
        var coverImage = await db.SuKienAnh
            .Where(img => img.SuKienId == item.Id && img.AnhBia)
            .FirstOrDefaultAsync();

        item.AnhUrl = coverImage?.AnhUrl;
        item.NgayCapNhat = DateTime.UtcNow;
    }

    private static string? Validate(LuuSuKienRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Title) || request.Title.Trim().Length < 5) return "Tên sự kiện phải có ít nhất 5 ký tự.";
        if (string.IsNullOrWhiteSpace(request.Description) || request.Description.Trim().Length < 20) return "Mô tả sự kiện phải có ít nhất 20 ký tự.";
        if (!EventTypes.Contains(request.Type?.Trim().ToUpperInvariant() ?? "")) return "Loại sự kiện không hợp lệ.";
        if (!EventFormats.Contains(request.Format?.Trim().ToUpperInvariant() ?? "")) return "Hình thức tổ chức không hợp lệ.";
        if (request.EndAt <= request.StartAt) return "Thời gian kết thúc phải sau thời gian bắt đầu.";
        if (request.Capacity < 1 || request.Capacity > 10000) return "Số lượng người tham gia phải từ 1 đến 10.000.";
        if (request.PointCost < 0 || request.PointCost > 10000) return "Số điểm cần đổi phải từ 0 đến 10.000.";
        var format = request.Format!.Trim().ToUpperInvariant();
        if (format is "OFFLINE" or "HYBRID" && string.IsNullOrWhiteSpace(request.Location)) return "Vui lòng nhập địa điểm tổ chức.";
        if (format is "ONLINE" or "HYBRID" && string.IsNullOrWhiteSpace(request.LinkThamGia)) return "Vui lòng nhập liên kết tham gia trực tuyến.";
        return null;
    }

    private static void Apply(SuKien item, LuuSuKienRequest request)
    {
        item.TieuDe = request.Title!.Trim();
        item.MoTa = request.Description!.Trim();
        item.LoaiSuKien = request.Type!.Trim().ToUpperInvariant();
        item.Format = request.Format!.Trim().ToUpperInvariant();
        item.ThoiGianBatDau = request.StartAt;
        item.ThoiGianKetThuc = request.EndAt;
        item.DiaDiem = string.IsNullOrWhiteSpace(request.Location) ? null : request.Location.Trim();
        item.LinkThamGia = string.IsNullOrWhiteSpace(request.LinkThamGia) ? null : request.LinkThamGia.Trim();
        item.SucChua = request.Capacity;
        item.DiemYeuCau = request.PointCost;
        // Note: ImageUrl is now managed via SuKienAnh (cover image sync)
        // Keep backward compat: if request has imageUrl and no images uploaded yet, use it
        if (!string.IsNullOrWhiteSpace(request.ImageUrl))
            item.AnhUrl = request.ImageUrl.Trim();
    }

    private static object MapEvent(SuKien item, string? userId, bool includeAttendees = false)
    {
        var activeRegistrations = item.CacDangKy.Where(entry => entry.TrangThai == "REGISTERED").ToList();
        var isRegistered = activeRegistrations.Any(entry => entry.NguoiDungId == userId);
        var joinLink = includeAttendees || isRegistered ? item.LinkThamGia : null;
        var images = item.CacHinhAnh?.OrderByDescending(img => img.AnhBia).ThenBy(img => img.NgayTao)
            .Select(img => new { id = img.Id, imageUrl = img.AnhUrl, isCover = img.AnhBia, createdAt = img.NgayTao })
            .ToList();
        var coverImage = item.CacHinhAnh?.FirstOrDefault(img => img.AnhBia) ?? item.CacHinhAnh?.FirstOrDefault();

        return new
        {
            id = item.Id,
            title = item.TieuDe,
            description = item.MoTa,
            type = item.LoaiSuKien,
            format = item.Format,
            startAt = item.ThoiGianBatDau,
            endAt = item.ThoiGianKetThuc,
            location = item.DiaDiem,
            onlineUrl = joinLink,
            linkThamGia = joinLink,
            imageUrl = coverImage?.AnhUrl ?? item.AnhUrl,
            capacity = item.SucChua,
            pointCost = Math.Max(0, item.DiemYeuCau),
            pointsUsed = activeRegistrations.FirstOrDefault(entry => entry.NguoiDungId == userId)?.DiemDaDung ?? 0,
            status = item.TrangThai,
            instructorId = item.GiangVienId,
            instructorName = item.GiangVien?.Ten ?? "Giảng viên",
            registrationCount = activeRegistrations.Count,
            isRegistered,
            images,
            attendees = includeAttendees
                ? activeRegistrations.Select(entry => new { id = entry.NguoiDungId, name = entry.NguoiDung?.Ten, email = entry.NguoiDung?.Email, pointsUsed = entry.DiemDaDung, registeredAt = entry.NgayDangKy })
                : null,
            createdAt = item.NgayTao,
            updatedAt = item.NgayCapNhat
        };
    }

    private static bool IsGoogleMeetLink(string? link) =>
        !string.IsNullOrWhiteSpace(link) &&
        link.StartsWith("https://meet.google.com/", StringComparison.OrdinalIgnoreCase);

    private static string? DocGoogleMeetLink(string? settings)
    {
        if (string.IsNullOrWhiteSpace(settings)) return null;
        try
        {
            using var document = JsonDocument.Parse(settings);
            return document.RootElement.TryGetProperty("googleMeetLink", out var value) ? value.GetString() : null;
        }
        catch (JsonException)
        {
            return null;
        }
    }
}

public sealed class LuuSuKienRequest
{
    public string? Title { get; set; }
    public string? Description { get; set; }
    public string? Type { get; set; }
    public string? Format { get; set; }
    public DateTime StartAt { get; set; }
    public DateTime EndAt { get; set; }
    public string? Location { get; set; }
    public string? LinkThamGia { get; set; }
    public string? ImageUrl { get; set; }
    public int Capacity { get; set; } = 50;
    public int PointCost { get; set; }
}

public sealed class LuuLienKetMeetRequest
{
    public string? GoogleMeetLink { get; set; }
}
