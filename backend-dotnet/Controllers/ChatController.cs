using System.Security.Claims;
using LMS.Api.Data;
using LMS.Api.DTOs.PhanHoi;
using LMS.Api.Hubs;
using LMS.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;

namespace LMS.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class ChatController(LmsDbContext db, IDichVuChat chat, IHubContext<ChatHub> hubContext) : ControllerBase
{
    private string GetUserId() => User.FindFirstValue(ClaimTypes.NameIdentifier) ?? string.Empty;

    [HttpGet("conversations")]
    public async Task<IActionResult> GetConversations()
    {
        var userId = GetUserId();

        var conversations = await db.ConversationParticipants
            .Where(participant => participant.UserId == userId)
            .Include(participant => participant.Conversation)
                .ThenInclude(conversation => conversation.Participants)
                    .ThenInclude(participant => participant.User)
            .Include(participant => participant.Conversation)
                .ThenInclude(conversation => conversation.Messages.OrderByDescending(message => message.SentAt).Take(1))
                    .ThenInclude(message => message.Attachments)
            .OrderByDescending(participant => participant.Conversation.UpdatedAt)
            .ToListAsync();

        var courseIds = conversations
            .Select(item => item.Conversation.CourseId)
            .Where(courseId => !string.IsNullOrWhiteSpace(courseId))
            .Distinct()
            .ToList();

        var courseTitles = await db.Courses.AsNoTracking()
            .Where(course => courseIds.Contains(course.Id))
            .ToDictionaryAsync(course => course.Id, course => course.Title);

        var dtos = new List<CuocTroChuyenDto>();
        foreach (var participant in conversations)
        {
            if (!await chat.CoQuyenTruyCapCuocTroChuyenAsync(userId, participant.ConversationId)) continue;

            var conversation = participant.Conversation;
            var otherParticipant = conversation.Participants.FirstOrDefault(item => item.UserId != userId)?.User;
            var lastMessage = conversation.Messages.OrderByDescending(message => message.SentAt).FirstOrDefault();
            var lastMessageHasImages = lastMessage?.Attachments.Count > 0;

            var lastReadAt = participant.LastReadAt;
            var unreadCount = lastReadAt.HasValue
                ? await db.Messages.CountAsync(m => m.ConversationId == participant.ConversationId && m.SentAt > lastReadAt.Value && m.SenderId != userId)
                : await db.Messages.CountAsync(m => m.ConversationId == participant.ConversationId && m.SenderId != userId);

            dtos.Add(new CuocTroChuyenDto
            {
                Id = participant.ConversationId,
                Title = conversation.Title,
                IsGroup = conversation.IsGroup,
                CourseId = conversation.CourseId,
                CourseTitle = conversation.CourseId is not null && courseTitles.TryGetValue(conversation.CourseId, out var courseTitle)
                    ? courseTitle
                    : null,
                ClassId = conversation.ClassId,
                SubjectId = conversation.SubjectId,
                CreatedAt = conversation.CreatedAt,
                UpdatedAt = conversation.UpdatedAt,
                OtherUserId = otherParticipant?.Id ?? string.Empty,
                OtherUserName = otherParticipant?.Name ?? string.Empty,
                OtherUserAvatar = otherParticipant?.Avatar,
                LastMessage = !string.IsNullOrWhiteSpace(lastMessage?.Content)
                    ? lastMessage.Content
                    : lastMessageHasImages == true ? "Đã gửi ảnh" : null,
                LastMessageHasImages = lastMessageHasImages == true,
                LastMessageAt = lastMessage?.SentAt,
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

        var userParticipant = await db.ConversationParticipants
            .FirstOrDefaultAsync(p => p.ConversationId == conversationId && p.UserId == userId);
        if (userParticipant is not null)
        {
            userParticipant.LastReadAt = DateTime.UtcNow;
            await db.SaveChangesAsync();
        }

        page = Math.Max(1, page);
        pageSize = Math.Clamp(pageSize, 1, 100);

        var messages = await db.Messages
            .Where(message => message.ConversationId == conversationId)
            .Include(message => message.Sender)
            .Include(message => message.Attachments)
            .OrderByDescending(message => message.SentAt)
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

        var userParticipant = await db.ConversationParticipants
            .FirstOrDefaultAsync(p => p.ConversationId == conversationId && p.UserId == userId);
        if (userParticipant is not null)
        {
            userParticipant.LastReadAt = DateTime.UtcNow;
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
        return Ok(new { ConversationId = result.GiaTri });
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
        var conversations = await db.Conversations
            .Include(c => c.Participants)
                .ThenInclude(p => p.User)
            .Include(c => c.Messages)
            .ToListAsync();

        return Ok(conversations.Select(c => new
        {
            c.Id,
            c.Title,
            c.IsGroup,
            c.CourseId,
            c.ClassId,
            c.SubjectId,
            c.CreatedAt,
            c.UpdatedAt,
            Participants = c.Participants.Select(p => new { p.UserId, Name = p.User != null ? p.User.Name : null }),
            Messages = c.Messages.OrderBy(m => m.SentAt).Select(m => new { m.Id, m.SenderId, m.Content, m.SentAt })
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
