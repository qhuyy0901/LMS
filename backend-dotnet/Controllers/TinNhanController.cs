using System.Security.Claims;
using LMS.Api.Infrastructure.Persistence;
using LMS.Api.DTOs.PhanHoi;
using LMS.Api.Hubs;
using LMS.Api.Application.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;

namespace LMS.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class TinNhanController(ApplicationDbContext db, IDichVuChat chat, IHubContext<ChatHub> hubContext) : ControllerBase
{
    private string GetUserId() => User.FindFirstValue(ClaimTypes.NameIdentifier) ?? string.Empty;

    [HttpGet("conversations")]
    public async Task<IActionResult> GetConversations()
    {
        var userId = GetUserId();

        var conversations = await db.NguoiThamGiaTroChuyen
            .Where(participant => participant.NguoiDungId == userId)
            .Include(participant => participant.CuocTroChuyen)
                .ThenInclude(conversation => conversation.CacNguoiThamGia)
                    .ThenInclude(participant => participant.NguoiDung)
            .Include(participant => participant.CuocTroChuyen)
                .ThenInclude(conversation => conversation.CacTinNhan.OrderByDescending(message => message.GuiLuc).Take(1))
                    .ThenInclude(message => message.CacFileDinhKem)
            .OrderByDescending(participant => participant.CuocTroChuyen.NgayCapNhat)
            .ToListAsync();

        var courseIds = conversations
            .Select(item => item.CuocTroChuyen.KhoaHocId)
            .Where(courseId => !string.IsNullOrWhiteSpace(courseId))
            .Distinct()
            .ToList();

        var courseTitles = await db.KhoaHoc.AsNoTracking()
            .Where(course => courseIds.Contains(course.Id))
            .ToDictionaryAsync(course => course.Id, course => course.TieuDe);

        var dtos = new List<CuocTroChuyenDto>();
        foreach (var participant in conversations)
        {
            if (!await chat.CoQuyenTruyCapCuocTroChuyenAsync(userId, participant.CuocTroChuyenId)) continue;

            var conversation = participant.CuocTroChuyen;
            var otherParticipant = conversation.CacNguoiThamGia.FirstOrDefault(item => item.NguoiDungId != userId)?.NguoiDung;
            var lastMessage = conversation.CacTinNhan.OrderByDescending(message => message.GuiLuc).FirstOrDefault();
            var lastMessageHasImages = lastMessage?.CacFileDinhKem.Count > 0;

            var lastReadAt = participant.DocCuoiLuc;
            var unreadCount = lastReadAt.HasValue
                ? await db.TinNhan.CountAsync(m => m.CuocTroChuyenId == participant.CuocTroChuyenId && m.GuiLuc > lastReadAt.Value && m.NguoiGuiId != userId)
                : await db.TinNhan.CountAsync(m => m.CuocTroChuyenId == participant.CuocTroChuyenId && m.NguoiGuiId != userId);

            dtos.Add(new CuocTroChuyenDto
            {
                Id = participant.CuocTroChuyenId,
                Title = conversation.TieuDe,
                IsGroup = conversation.LaNhom,
                CourseId = conversation.KhoaHocId,
                CourseTitle = conversation.KhoaHocId is not null && courseTitles.TryGetValue(conversation.KhoaHocId, out var courseTitle)
                    ? courseTitle
                    : null,
                ClassId = conversation.ClassId,
                SubjectId = conversation.SubjectId,
                CreatedAt = conversation.NgayTao,
                UpdatedAt = conversation.NgayCapNhat,
                OtherUserId = otherParticipant?.Id ?? string.Empty,
                OtherUserName = otherParticipant?.Ten ?? string.Empty,
                OtherUserAvatar = otherParticipant?.AnhDaiDien,
                OtherUserLastSeenAt = otherParticipant?.LanCuoiHoatDong,
                LastMessage = !string.IsNullOrWhiteSpace(lastMessage?.NoiDung)
                    ? lastMessage.NoiDung
                    : lastMessageHasImages == true ? "Đã gửi ảnh" : null,
                LastMessageHasImages = lastMessageHasImages == true,
                LastMessageAt = lastMessage?.GuiLuc,
                UnreadCount = unreadCount
            });
        }

        var visibleConversations = dtos
            .GroupBy(item => item.IsGroup ? $"group:{item.Id}" : $"direct:{item.OtherUserId}")
            .Select(group => group
                .OrderByDescending(item => item.LastMessageAt ?? item.UpdatedAt)
                .First())
            .OrderByDescending(item => item.LastMessageAt ?? item.UpdatedAt)
            .ToList();

        return Ok(visibleConversations);
    }

    [HttpGet("conversations/{conversationId:guid}/messages")]
    public async Task<IActionResult> GetMessages(Guid conversationId, [FromQuery] int page = 1, [FromQuery] int pageSize = 50)
    {
        var userId = GetUserId();
        if (!await chat.CoQuyenTruyCapCuocTroChuyenAsync(userId, conversationId))
            return StatusCode(StatusCodes.Status403Forbidden, new { message = "Bạn không có quyền xem cuộc trò chuyện này." });

        var userParticipant = await db.NguoiThamGiaTroChuyen
            .FirstOrDefaultAsync(p => p.CuocTroChuyenId == conversationId && p.NguoiDungId == userId);
        if (userParticipant is not null)
        {
            userParticipant.DocCuoiLuc = DateTime.UtcNow;
            await db.SaveChangesAsync();
        }

        page = Math.Max(1, page);
        pageSize = Math.Clamp(pageSize, 1, 100);

        var messages = await db.TinNhan
            .Where(message => message.CuocTroChuyenId == conversationId)
            .Include(message => message.NguoiGui)
            .Include(message => message.CacFileDinhKem)
            .OrderByDescending(message => message.GuiLuc)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync();

        messages.Reverse();
        return Ok(messages.Select(message => chat.TaoTinNhanDto(message)));
    }

    [HttpPost("conversations/{conversationId:guid}/read")]
    public async Task<IActionResult> MarkAsRead(Guid conversationId)
    {
        var userId = GetUserId();
        if (!await chat.CoQuyenTruyCapCuocTroChuyenAsync(userId, conversationId))
            return StatusCode(StatusCodes.Status403Forbidden, new { message = "Bạn không có quyền truy cập cuộc trò chuyện này." });

        var userParticipant = await db.NguoiThamGiaTroChuyen
            .FirstOrDefaultAsync(p => p.CuocTroChuyenId == conversationId && p.NguoiDungId == userId);
        if (userParticipant is not null)
        {
            userParticipant.DocCuoiLuc = DateTime.UtcNow;
            await db.SaveChangesAsync();
        }

        return Ok(new { message = "Đã đánh dấu đã đọc" });
    }

    [HttpPost("conversations/direct/{otherUserId}")]
    public async Task<IActionResult> GetOrCreateDirectConversation(
        string otherUserId,
        [FromBody] TaoCuocTroChuyenRequest? request,
        [FromQuery] string? courseId = null,
        [FromQuery] string? classId = null,
        [FromQuery] string? subjectId = null)
    {
        var userId = GetUserId();
        var result = await chat.LayHoacTaoCuocTroChuyenAsync(
            userId,
            otherUserId,
            request?.CourseId ?? courseId,
            request?.ClassId ?? classId,
            request?.SubjectId ?? subjectId);

        if (!result.ThanhCong) return ChatError(result);
        return Ok(new { CuocTroChuyenId = result.GiaTri });
    }

    [HttpPost("conversations/{conversationId:guid}/messages")]
    [RequestSizeLimit(30 * 1024 * 1024)]
    public async Task<IActionResult> SendMessage(Guid conversationId, [FromForm] GuiTinNhanForm form)
    {
        var userId = GetUserId();
        var result = await chat.GuiTinNhanAsync(userId, conversationId, form.Content, form.Images);
        if (!result.ThanhCong || result.GiaTri is null) return ChatError(result);

        foreach (var participantId in result.GiaTri.ParticipantIds)
        {
            await hubContext.Clients.Group($"user_{participantId}").SendAsync("ReceiveMessage", result.GiaTri.Message);
        }

        return Ok(result.GiaTri.Message);
    }

    [HttpGet("users/scopes")]
    public async Task<IActionResult> GetChatScopes()
    {
        var userId = GetUserId();
        return Ok(await chat.LayPhamViAsync(userId));
    }

    [HttpGet("users/search")]
    [HttpGet("users/available")]
    public async Task<IActionResult> SearchUsers(
        [FromQuery] string query = "",
        [FromQuery] string? courseId = null,
        [FromQuery] string? classId = null,
        [FromQuery] string? subjectId = null)
    {
        var userId = GetUserId();
        var users = await chat.LayNguoiCoTheNhanAsync(userId, query, courseId, classId, subjectId);
        return Ok(users);
    }

    [HttpGet("users/online")]
    public async Task<IActionResult> GetOnlineUsers(
        [FromQuery] string query = "",
        [FromQuery] string? courseId = null,
        [FromQuery] string? classId = null,
        [FromQuery] string? subjectId = null)
    {
        var userId = GetUserId();
        var onlineIds = ChatHub.GetOnlineUserIds().ToList();
        var users = await chat.LayNguoiCoTheNhanAsync(userId, query, courseId, classId, subjectId, onlineIds);
        return Ok(users);
    }

    [HttpGet("images/{attachmentId:guid}")]
    public async Task<IActionResult> GetImage(Guid attachmentId)
    {
        var userId = GetUserId();
        var result = await chat.LayAnhAsync(userId, attachmentId);
        if (!result.ThanhCong || result.GiaTri is null) return ChatError(result);

        return PhysicalFile(result.GiaTri.FullPath, result.GiaTri.ContentType, enableRangeProcessing: false);
    }

    [HttpGet("debug-data")]
    [AllowAnonymous]
    public async Task<IActionResult> GetDebugData()
    {
        var conversations = await db.CuocTroChuyen
            .Include(c => c.CacNguoiThamGia)
                .ThenInclude(p => p.NguoiDung)
            .Include(c => c.CacTinNhan)
            .ToListAsync();

        return Ok(conversations.Select(c => new
        {
            c.Id,
            c.TieuDe,
            c.LaNhom,
            c.KhoaHocId,
            c.ClassId,
            c.SubjectId,
            c.NgayTao,
            c.NgayCapNhat,
            CacNguoiThamGia = c.CacNguoiThamGia.Select(p => new { p.NguoiDungId, Ten = p.NguoiDung != null ? p.NguoiDung.Ten : null }),
            CacTinNhan = c.CacTinNhan.OrderBy(m => m.GuiLuc).Select(m => new { m.Id, m.NguoiGuiId, m.NoiDung, m.GuiLuc })
        }));
    }

    private ObjectResult ChatError<T>(KetQuaChat<T> result)
    {
        return StatusCode(result.StatusCode, new { message = result.Loi ?? "Không thể xử lý yêu cầu chat." });
    }
}

public sealed class TaoCuocTroChuyenRequest
{
    public string? CourseId { get; set; }
    public string? ClassId { get; set; }
    public string? SubjectId { get; set; }
}

public sealed class GuiTinNhanForm
{
    public string? Content { get; set; }
    public List<IFormFile> Images { get; set; } = [];
}
