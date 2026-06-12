using System.Security.Claims;
using System.Text.Json;
using LMS.Api.Data;
using LMS.Api.Models;
using LMS.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace LMS.Api.Controllers;

[ApiController]
[Authorize]
public class SuKienController(LmsDbContext db, IWebHostEnvironment env) : ControllerBase
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
        var events = await db.Events.AsNoTracking()
            .Where(item => item.Status == "PUBLISHED")
            .Include(item => item.Instructor)
            .Include(item => item.Registrations)
            .Include(item => item.Images)
            .OrderBy(item => item.StartAt)
            .ToListAsync();

        return Results.Ok(events.Select(item => MapEvent(item, userId)));
    }

    [HttpGet("/api/student/events/{id}")]
    public async Task<IResult> ChiTietCongKhai(string id)
    {
        var userId = TroGiup.LayUserId(User);
        var item = await db.Events.AsNoTracking()
            .Where(item => item.Id == id && item.Status == "PUBLISHED")
            .Include(item => item.Instructor)
            .Include(item => item.Registrations)
            .Include(item => item.Images)
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
        var settings = await db.Users.AsNoTracking()
            .Where(user => user.Id == userId)
            .Select(user => user.Settings)
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
        var user = await db.Users.FirstOrDefaultAsync(user => user.Id == userId);
        if (user is null) return Results.Unauthorized();
        Dictionary<string, JsonElement> settings;
        try
        {
            settings = string.IsNullOrWhiteSpace(user.Settings)
                ? []
                : JsonSerializer.Deserialize<Dictionary<string, JsonElement>>(user.Settings) ?? [];
        }
        catch (JsonException)
        {
            settings = [];
        }
        settings["googleMeetLink"] = JsonSerializer.SerializeToElement(link);
        user.Settings = JsonSerializer.Serialize(settings);
        user.UpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync();
        return Results.Ok(new { message = "Đã lưu liên kết Google Meet.", googleMeetLink = link });
    }

    [HttpGet("/api/instructor/events")]
    public async Task<IResult> DanhSachCuaGiangVien()
    {
        var permissionError = TroGiup.YeuCauGiangVien(User);
        if (permissionError is not null) return permissionError;

        var userId = TroGiup.LayUserId(User)!;
        var events = await db.Events.AsNoTracking()
            .Where(item => item.InstructorId == userId)
            .Include(item => item.Instructor)
            .Include(item => item.Registrations)
                .ThenInclude(item => item.User)
            .Include(item => item.Images)
            .OrderByDescending(item => item.CreatedAt)
            .ToListAsync();

        return Results.Ok(events.Select(item => MapEvent(item, userId, includeAttendees: true)));
    }

    [HttpGet("/api/instructor/events/{id}")]
    public async Task<IResult> ChiTietSuKien(string id)
    {
        var permissionError = TroGiup.YeuCauGiangVien(User);
        if (permissionError is not null) return permissionError;

        var userId = TroGiup.LayUserId(User)!;
        var item = await db.Events.AsNoTracking()
            .Include(e => e.Instructor)
            .Include(e => e.Registrations).ThenInclude(r => r.User)
            .Include(e => e.Images)
            .FirstOrDefaultAsync(e => e.Id == id && e.InstructorId == userId);

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
            InstructorId = TroGiup.LayUserId(User)!,
            Status = "PUBLISHED",
            CreatedAt = now,
            UpdatedAt = now
        };
        Apply(item, request);
        db.Events.Add(item);
        await db.SaveChangesAsync();
        return Results.Created($"/api/instructor/events/{item.Id}", MapEvent(item, item.InstructorId));
    }

    [HttpPut("/api/instructor/events/{id}")]
    public async Task<IResult> CapNhatSuKien(string id, [FromBody] LuuSuKienRequest request)
    {
        var item = await LoadOwnedEvent(id);
        if (item is null) return Results.Json(new { message = "Bạn không có quyền chỉnh sửa sự kiện này." }, statusCode: 403);

        var validationError = Validate(request);
        if (validationError is not null) return Results.BadRequest(new { message = validationError });

        Apply(item, request);
        item.UpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync();

        // Reload with images for response
        await db.Entry(item).Collection(e => e.Images).LoadAsync();
        return Results.Ok(MapEvent(item, item.InstructorId));
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
        var existingCount = await db.EventImages.CountAsync(img => img.SuKienId == id);
        var hasCover = existingCount > 0 && await db.EventImages.AnyAsync(img => img.SuKienId == id && img.IsCover);

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
                ImageUrl = $"/uploads/events/{fileName}",
                IsCover = isCover,
                CreatedAt = DateTime.UtcNow
            };

            db.EventImages.Add(imageRecord);
            existingCount++;
            if (isCover) hasCover = true;

            uploadedImages.Add(new
            {
                id = imageRecord.Id,
                imageUrl = imageRecord.ImageUrl,
                isCover = imageRecord.IsCover,
                createdAt = imageRecord.CreatedAt
            });
        }

        // Sync SuKien.ImageUrl with cover image
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

        var image = await db.EventImages.FirstOrDefaultAsync(img => img.Id == imageId && img.SuKienId == id);
        if (image is null) return Results.NotFound(new { message = "Không tìm thấy ảnh." });

        // Delete physical file
        var filePath = Path.Combine(env.WebRootPath, image.ImageUrl.TrimStart('/').Replace('/', Path.DirectorySeparatorChar));
        if (System.IO.File.Exists(filePath))
        {
            System.IO.File.Delete(filePath);
        }

        var wasCover = image.IsCover;
        db.EventImages.Remove(image);
        await db.SaveChangesAsync();

        // If deleted image was cover, assign cover to first remaining image
        if (wasCover)
        {
            var firstRemaining = await db.EventImages
                .Where(img => img.SuKienId == id)
                .OrderBy(img => img.CreatedAt)
                .FirstOrDefaultAsync();

            if (firstRemaining is not null)
            {
                firstRemaining.IsCover = true;
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

        var image = await db.EventImages.FirstOrDefaultAsync(img => img.Id == imageId && img.SuKienId == id);
        if (image is null) return Results.NotFound(new { message = "Không tìm thấy ảnh." });

        // Clear all covers for this event
        var currentCovers = await db.EventImages
            .Where(img => img.SuKienId == id && img.IsCover)
            .ToListAsync();
        foreach (var cover in currentCovers)
        {
            cover.IsCover = false;
        }

        // Set new cover
        image.IsCover = true;
        item.ImageUrl = image.ImageUrl;
        item.UpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync();

        return Results.Ok(new { message = "Đã đặt ảnh đại diện." });
    }

    [HttpPatch("/api/instructor/events/{id}/publish")]
    public async Task<IResult> XuatBan(string id)
    {
        var item = await LoadOwnedEvent(id);
        if (item is null) return Results.Json(new { message = "Bạn không có quyền xuất bản sự kiện này." }, statusCode: 403);
        if (item.EndAt <= item.StartAt || item.EndAt <= DateTime.UtcNow)
            return Results.BadRequest(new { message = "Thời gian sự kiện không hợp lệ hoặc sự kiện đã kết thúc." });

        item.Status = "PUBLISHED";
        item.UpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync();
        return Results.Ok(new { message = "Đã xuất bản sự kiện." });
    }

    [HttpPatch("/api/instructor/events/{id}/cancel")]
    public async Task<IResult> HuySuKien(string id)
    {
        var item = await LoadOwnedEvent(id);
        if (item is null) return Results.Json(new { message = "Bạn không có quyền hủy sự kiện này." }, statusCode: 403);

        item.Status = "CANCELLED";
        item.UpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync();
        return Results.Ok(new { message = "Đã hủy sự kiện." });
    }

    [HttpDelete("/api/instructor/events/{id}")]
    public async Task<IResult> XoaSuKien(string id)
    {
        var item = await LoadOwnedEvent(id);
        if (item is null) return Results.Json(new { message = "Bạn không có quyền xóa sự kiện này." }, statusCode: 403);
        if (item.Registrations.Any(registration => registration.Status == "REGISTERED"))
            return Results.BadRequest(new { message = "Sự kiện đã có người đăng ký nên không thể xóa. Bạn có thể hủy sự kiện." });

        // Delete all image files
        var images = await db.EventImages.Where(img => img.SuKienId == id).ToListAsync();
        foreach (var image in images)
        {
            var filePath = Path.Combine(env.WebRootPath, image.ImageUrl.TrimStart('/').Replace('/', Path.DirectorySeparatorChar));
            if (System.IO.File.Exists(filePath))
            {
                System.IO.File.Delete(filePath);
            }
        }

        db.EventImages.RemoveRange(images);
        db.EventRegistrations.RemoveRange(item.Registrations);
        db.Events.Remove(item);
        await db.SaveChangesAsync();
        return Results.Ok(new { message = "Đã xóa sự kiện." });
    }

    [HttpPost("/api/events/{id}/register")]
    public async Task<IResult> DangKy(string id)
    {
        if (User.FindFirstValue(ClaimTypes.Role) != "STUDENT") return Results.Forbid();
        var userId = TroGiup.LayUserId(User)!;
        var item = await db.Events.Include(item => item.Registrations).FirstOrDefaultAsync(item => item.Id == id);
        if (item is null || item.Status != "PUBLISHED") return Results.NotFound(new { message = "Không tìm thấy sự kiện đang mở đăng ký." });
        if (item.StartAt <= DateTime.UtcNow) return Results.BadRequest(new { message = "Sự kiện đã bắt đầu, không thể đăng ký." });

        var registration = item.Registrations.FirstOrDefault(entry => entry.UserId == userId);
        var activeCount = item.Registrations.Count(entry => entry.Status == "REGISTERED");
        if (registration?.Status == "REGISTERED") return Results.BadRequest(new { message = "Bạn đã đăng ký sự kiện này." });
        if (activeCount >= item.Capacity) return Results.BadRequest(new { message = "Sự kiện đã đủ số lượng người tham gia." });

        var now = DateTime.UtcNow;
        if (registration is null)
        {
            registration = new DangKySuKien
            {
                Id = TaoId.Moi(),
                EventId = id,
                UserId = userId,
                RegisteredAt = now,
                UpdatedAt = now
            };
            db.EventRegistrations.Add(registration);
        }
        else
        {
            registration.Status = "REGISTERED";
            registration.RegisteredAt = now;
            registration.UpdatedAt = now;
        }

        var studentName = await db.Users.AsNoTracking()
            .Where(user => user.Id == userId)
            .Select(user => user.Name)
            .FirstOrDefaultAsync() ?? "Một học viên";
        db.Notifications.Add(new ThongBao
        {
            Id = TaoId.Moi(),
            UserId = item.InstructorId,
            Type = "INSTRUCTOR_EVENT_REGISTRATION",
            Title = "Có học viên đăng ký sự kiện",
            Body = $"{studentName} vừa đăng ký sự kiện {item.Title}.",
            Link = "/instructor/events",
            Metadata = System.Text.Json.JsonSerializer.Serialize(new { eventId = item.Id, studentId = userId }),
            CreatedAt = now
        });

        await db.SaveChangesAsync();
        return Results.Ok(new { message = "Đăng ký sự kiện thành công." });
    }

    [HttpDelete("/api/events/{id}/register")]
    public async Task<IResult> HuyDangKy(string id)
    {
        if (User.FindFirstValue(ClaimTypes.Role) != "STUDENT") return Results.Forbid();
        var userId = TroGiup.LayUserId(User)!;
        var registration = await db.EventRegistrations
            .Include(item => item.Event)
            .FirstOrDefaultAsync(item => item.EventId == id && item.UserId == userId);
        if (registration is null || registration.Status != "REGISTERED")
            return Results.NotFound(new { message = "Bạn chưa đăng ký sự kiện này." });
        if (registration.Event?.StartAt <= DateTime.UtcNow)
            return Results.BadRequest(new { message = "Sự kiện đã bắt đầu, không thể hủy đăng ký." });

        registration.Status = "CANCELLED";
        registration.UpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync();
        return Results.Ok(new { message = "Đã hủy đăng ký sự kiện." });
    }

    private async Task<SuKien?> LoadOwnedEvent(string id)
    {
        if (TroGiup.YeuCauGiangVien(User) is not null) return null;
        var userId = TroGiup.LayUserId(User);
        return await db.Events.Include(item => item.Registrations)
            .FirstOrDefaultAsync(item => item.Id == id && item.InstructorId == userId);
    }

    private async Task SyncCoverImage(SuKien item)
    {
        var coverImage = await db.EventImages
            .Where(img => img.SuKienId == item.Id && img.IsCover)
            .FirstOrDefaultAsync();

        item.ImageUrl = coverImage?.ImageUrl;
        item.UpdatedAt = DateTime.UtcNow;
    }

    private static string? Validate(LuuSuKienRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Title) || request.Title.Trim().Length < 5) return "Tên sự kiện phải có ít nhất 5 ký tự.";
        if (string.IsNullOrWhiteSpace(request.Description) || request.Description.Trim().Length < 20) return "Mô tả sự kiện phải có ít nhất 20 ký tự.";
        if (!EventTypes.Contains(request.Type?.Trim().ToUpperInvariant() ?? "")) return "Loại sự kiện không hợp lệ.";
        if (!EventFormats.Contains(request.Format?.Trim().ToUpperInvariant() ?? "")) return "Hình thức tổ chức không hợp lệ.";
        if (request.EndAt <= request.StartAt) return "Thời gian kết thúc phải sau thời gian bắt đầu.";
        if (request.Capacity < 1 || request.Capacity > 10000) return "Số lượng người tham gia phải từ 1 đến 10.000.";
        var format = request.Format!.Trim().ToUpperInvariant();
        if (format is "OFFLINE" or "HYBRID" && string.IsNullOrWhiteSpace(request.Location)) return "Vui lòng nhập địa điểm tổ chức.";
        if (format is "ONLINE" or "HYBRID" && string.IsNullOrWhiteSpace(request.LinkThamGia)) return "Vui lòng nhập liên kết tham gia trực tuyến.";
        return null;
    }

    private static void Apply(SuKien item, LuuSuKienRequest request)
    {
        item.Title = request.Title!.Trim();
        item.Description = request.Description!.Trim();
        item.Type = request.Type!.Trim().ToUpperInvariant();
        item.Format = request.Format!.Trim().ToUpperInvariant();
        item.StartAt = request.StartAt;
        item.EndAt = request.EndAt;
        item.Location = string.IsNullOrWhiteSpace(request.Location) ? null : request.Location.Trim();
        item.LinkThamGia = string.IsNullOrWhiteSpace(request.LinkThamGia) ? null : request.LinkThamGia.Trim();
        item.Capacity = request.Capacity;
        // Note: ImageUrl is now managed via SuKienAnh (cover image sync)
        // Keep backward compat: if request has imageUrl and no images uploaded yet, use it
        if (!string.IsNullOrWhiteSpace(request.ImageUrl))
            item.ImageUrl = request.ImageUrl.Trim();
    }

    private static object MapEvent(SuKien item, string? userId, bool includeAttendees = false)
    {
        var activeRegistrations = item.Registrations.Where(entry => entry.Status == "REGISTERED").ToList();
        var images = item.Images?.OrderByDescending(img => img.IsCover).ThenBy(img => img.CreatedAt)
            .Select(img => new { id = img.Id, imageUrl = img.ImageUrl, isCover = img.IsCover, createdAt = img.CreatedAt })
            .ToList();
        var coverImage = item.Images?.FirstOrDefault(img => img.IsCover) ?? item.Images?.FirstOrDefault();

        return new
        {
            id = item.Id,
            title = item.Title,
            description = item.Description,
            type = item.Type,
            format = item.Format,
            startAt = item.StartAt,
            endAt = item.EndAt,
            location = item.Location,
            onlineUrl = item.LinkThamGia,
            linkThamGia = item.LinkThamGia,
            imageUrl = coverImage?.ImageUrl ?? item.ImageUrl,
            capacity = item.Capacity,
            status = item.Status,
            instructorId = item.InstructorId,
            instructorName = item.Instructor?.Name ?? "Giảng viên",
            registrationCount = activeRegistrations.Count,
            isRegistered = activeRegistrations.Any(entry => entry.UserId == userId),
            images,
            attendees = includeAttendees
                ? activeRegistrations.Select(entry => new { id = entry.UserId, name = entry.User?.Name, email = entry.User?.Email, registeredAt = entry.RegisteredAt })
                : null,
            createdAt = item.CreatedAt,
            updatedAt = item.UpdatedAt
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
}

public sealed class LuuLienKetMeetRequest
{
    public string? GoogleMeetLink { get; set; }
}
