using System.Security.Claims;
using LMS.Api.Data;
using LMS.Api.Models;
using LMS.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace LMS.Api.Controllers;

[ApiController]
[Authorize]
public class SuKienController(LmsDbContext db) : ControllerBase
{
    private static readonly HashSet<string> EventTypes = ["WORKSHOP", "SEMINAR", "SPECIAL_TOPIC", "WEBINAR", "OTHER"];
    private static readonly HashSet<string> EventFormats = ["ONLINE", "OFFLINE", "HYBRID"];

    [HttpGet("/api/events")]
    public async Task<IResult> DanhSachCongKhai()
    {
        var userId = TroGiup.LayUserId(User);
        var events = await db.Events.AsNoTracking()
            .Where(item => item.Status == "PUBLISHED")
            .Include(item => item.Instructor)
            .Include(item => item.Registrations)
            .OrderBy(item => item.StartAt)
            .ToListAsync();

        return Results.Ok(events.Select(item => MapEvent(item, userId)));
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
            .OrderByDescending(item => item.CreatedAt)
            .ToListAsync();

        return Results.Ok(events.Select(item => MapEvent(item, userId, includeAttendees: true)));
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
        return Results.Ok(MapEvent(item, item.InstructorId));
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
        if (format is "ONLINE" or "HYBRID" && string.IsNullOrWhiteSpace(request.OnlineUrl)) return "Vui lòng nhập liên kết tham gia trực tuyến.";
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
        item.OnlineUrl = string.IsNullOrWhiteSpace(request.OnlineUrl) ? null : request.OnlineUrl.Trim();
        item.ImageUrl = string.IsNullOrWhiteSpace(request.ImageUrl) ? null : request.ImageUrl.Trim();
        item.Capacity = request.Capacity;
    }

    private static object MapEvent(SuKien item, string? userId, bool includeAttendees = false)
    {
        var activeRegistrations = item.Registrations.Where(entry => entry.Status == "REGISTERED").ToList();
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
            onlineUrl = item.OnlineUrl,
            imageUrl = item.ImageUrl,
            capacity = item.Capacity,
            status = item.Status,
            instructorId = item.InstructorId,
            instructorName = item.Instructor?.Name ?? "Giảng viên",
            registrationCount = activeRegistrations.Count,
            isRegistered = activeRegistrations.Any(entry => entry.UserId == userId),
            attendees = includeAttendees
                ? activeRegistrations.Select(entry => new { id = entry.UserId, name = entry.User?.Name, email = entry.User?.Email, registeredAt = entry.RegisteredAt })
                : null,
            createdAt = item.CreatedAt,
            updatedAt = item.UpdatedAt
        };
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
    public string? OnlineUrl { get; set; }
    public string? ImageUrl { get; set; }
    public int Capacity { get; set; } = 50;
}
