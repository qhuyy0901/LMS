using System.Security.Claims;
using LMS.Api.Data;
using LMS.Api.DTOs.PhanHoi;
using LMS.Api.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace LMS.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class ChatController(LmsDbContext db) : ControllerBase
{
    private string GetUserId() => User.FindFirstValue(ClaimTypes.NameIdentifier) ?? string.Empty;

    [HttpGet("conversations")]
    public async Task<IActionResult> GetConversations()
    {
        var userId = GetUserId();
        
        var conversations = await db.ConversationParticipants
            .Where(cp => cp.UserId == userId)
            .Include(cp => cp.Conversation)
                .ThenInclude(c => c.Participants)
                    .ThenInclude(p => p.User)
            .Include(cp => cp.Conversation)
                .ThenInclude(c => c.Messages.OrderByDescending(m => m.SentAt).Take(1))
            .OrderByDescending(cp => cp.Conversation.UpdatedAt)
            .ToListAsync();

        var dtos = conversations.Select(cp => 
        {
            var otherParticipant = cp.Conversation.Participants.FirstOrDefault(p => p.UserId != userId)?.User;
            var lastMessage = cp.Conversation.Messages.FirstOrDefault();

            return new CuocTroChuyenDto
            {
                Id = cp.ConversationId,
                Title = cp.Conversation.Title,
                IsGroup = cp.Conversation.IsGroup,
                CourseId = cp.Conversation.CourseId,
                CreatedAt = cp.Conversation.CreatedAt,
                UpdatedAt = cp.Conversation.UpdatedAt,
                OtherUserId = otherParticipant?.Id ?? string.Empty,
                OtherUserName = otherParticipant?.Name ?? string.Empty,
                OtherUserAvatar = otherParticipant?.Avatar,
                LastMessage = lastMessage?.Content,
                LastMessageAt = lastMessage?.SentAt,
                UnreadCount = 0 // Future implementation
            };
        });

        return Ok(dtos);
    }

    [HttpGet("conversations/{conversationId}/messages")]
    public async Task<IActionResult> GetMessages(Guid conversationId, [FromQuery] int page = 1, [FromQuery] int pageSize = 50)
    {
        var userId = GetUserId();
        
        // Verify user is in conversation
        var isParticipant = await db.ConversationParticipants
            .AnyAsync(cp => cp.ConversationId == conversationId && cp.UserId == userId);
            
        if (!isParticipant) return Forbid();

        var messages = await db.Messages
            .Where(m => m.ConversationId == conversationId)
            .Include(m => m.Sender)
            .OrderByDescending(m => m.SentAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(m => new TinNhanDto
            {
                Id = m.Id,
                ConversationId = m.ConversationId,
                SenderId = m.SenderId,
                SenderName = m.Sender.Name,
                SenderAvatar = m.Sender.Avatar,
                Content = m.Content,
                SentAt = m.SentAt
            })
            .ToListAsync();

        messages.Reverse(); // Return chronological order for UI
        return Ok(messages);
    }

    [HttpPost("conversations/direct/{otherUserId}")]
    public async Task<IActionResult> GetOrCreateDirectConversation(string otherUserId)
    {
        var userId = GetUserId();
        if (userId == otherUserId) return BadRequest("Cannot start conversation with yourself.");

        var otherUser = await db.Users.FindAsync(otherUserId);
        if (otherUser == null) return NotFound("User not found.");

        // Find existing 1-1 conversation
        var existingConv = await db.Conversations
            .Where(c => !c.IsGroup)
            .Where(c => c.Participants.Any(p => p.UserId == userId) && c.Participants.Any(p => p.UserId == otherUserId))
            .FirstOrDefaultAsync();

        if (existingConv != null)
        {
            return Ok(new { ConversationId = existingConv.Id });
        }

        // Create new
        var newConv = new CuocTroChuyen
        {
            Id = Guid.NewGuid(),
            IsGroup = false,
            Title = null,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow,
            Participants = new List<NguoiThamGiaTroChuyen>
            {
                new() { UserId = userId },
                new() { UserId = otherUserId }
            }
        };

        db.Conversations.Add(newConv);
        await db.SaveChangesAsync();

        return Ok(new { ConversationId = newConv.Id });
    }

    [HttpGet("users/search")]
    public async Task<IActionResult> SearchUsers([FromQuery] string query = "")
    {
        var userId = GetUserId();
        var users = await db.Users
            .Where(u => u.Id != userId && (string.IsNullOrEmpty(query) || u.Name.Contains(query) || u.Email.Contains(query)))
            .Take(10)
            .Select(u => new 
            {
                u.Id,
                u.Name,
                u.Email,
                u.Avatar,
                u.Role
            })
            .ToListAsync();
            
        return Ok(users);
    }

    [HttpGet("users/online")]
    public async Task<IActionResult> GetOnlineUsers()
    {
        var userId = GetUserId();
        var onlineIds = LMS.Api.Hubs.ChatHub.GetOnlineUserIds();
        
        var users = await db.Users
            .Where(u => u.Id != userId && onlineIds.Contains(u.Id))
            .Select(u => new
            {
                u.Id,
                u.Name,
                u.Avatar,
                u.Role
            })
            .ToListAsync();

        return Ok(users);
    }
}

