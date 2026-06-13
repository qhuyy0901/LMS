using System.Security.Claims;
using System.Collections.Concurrent;
using LMS.Api.Data;
using LMS.Api.DTOs.PhanHoi;
using LMS.Api.DTOs.YeuCau;
using LMS.Api.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;

namespace LMS.Api.Hubs;

[Authorize]
public class ChatHub(LmsDbContext db) : Hub
{
    private static readonly ConcurrentDictionary<string, int> ActiveUsers = new();

    public static IEnumerable<string> GetOnlineUserIds()
    {
        return ActiveUsers.Keys;
    }

    public override async Task OnConnectedAsync()
    {
        var userId = Context.User?.FindFirstValue(ClaimTypes.NameIdentifier);
        if (!string.IsNullOrEmpty(userId))
        {
            // Join user to their own personal group to receive messages easily
            await Groups.AddToGroupAsync(Context.ConnectionId, $"user_{userId}");
            
            // Join user to all their conversations
            var conversations = await db.ConversationParticipants
                .Where(cp => cp.UserId == userId)
                .Select(cp => cp.ConversationId)
                .ToListAsync();

            foreach (var convId in conversations)
            {
                await Groups.AddToGroupAsync(Context.ConnectionId, $"conv_{convId}");
            }

            // Track active status
            ActiveUsers.AddOrUpdate(userId, 1, (key, oldVal) => oldVal + 1);

            // Notify others if this is the first connection tab
            if (ActiveUsers.TryGetValue(userId, out var count) && count == 1)
            {
                var userDetails = await db.Users
                    .Where(u => u.Id == userId)
                    .Select(u => new { Id = u.Id, Name = u.Name, Avatar = u.Avatar, Role = u.Role })
                    .FirstOrDefaultAsync();

                if (userDetails != null)
                {
                    await Clients.All.SendAsync("UserOnline", userDetails);
                }
            }
        }
        await base.OnConnectedAsync();
    }

    public override async Task OnDisconnectedAsync(Exception? exception)
    {
        var userId = Context.User?.FindFirstValue(ClaimTypes.NameIdentifier);
        if (!string.IsNullOrEmpty(userId))
        {
            if (ActiveUsers.TryGetValue(userId, out int count))
            {
                if (count <= 1)
                {
                    ActiveUsers.TryRemove(userId, out _);
                    await Clients.All.SendAsync("UserOffline", userId);
                }
                else
                {
                    ActiveUsers.TryUpdate(userId, count - 1, count);
                }
            }
        }
        await base.OnDisconnectedAsync(exception);
    }

    public async Task SendMessage(GuiTinNhanDto request)
    {
        var userId = Context.User?.FindFirstValue(ClaimTypes.NameIdentifier);
        if (string.IsNullOrEmpty(userId)) return;

        // Verify user is in conversation
        var participant = await db.ConversationParticipants
            .FirstOrDefaultAsync(cp => cp.ConversationId == request.ConversationId && cp.UserId == userId);
            
        if (participant == null) return;

        var message = new TinNhan
        {
            Id = Guid.NewGuid(),
            ConversationId = request.ConversationId,
            SenderId = userId,
            Content = request.Content,
            SentAt = DateTime.UtcNow
        };

        db.Messages.Add(message);
        
        var conversation = await db.Conversations.FindAsync(request.ConversationId);
        if (conversation != null)
        {
            conversation.UpdatedAt = DateTime.UtcNow;
        }

        await db.SaveChangesAsync();

        var sender = await db.Users.FindAsync(userId);
        
        var messageDto = new TinNhanDto
        {
            Id = message.Id,
            ConversationId = message.ConversationId,
            SenderId = message.SenderId,
            SenderName = sender?.Name ?? "Unknown",
            SenderAvatar = sender?.Avatar,
            Content = message.Content,
            SentAt = message.SentAt
        };

        // Broadcast to everyone in the conversation by sending to their personal user group
        var participants = await db.ConversationParticipants
            .Where(cp => cp.ConversationId == request.ConversationId)
            .Select(cp => cp.UserId)
            .ToListAsync();
            
        foreach (var participantId in participants)
        {
            await Clients.Group($"user_{participantId}").SendAsync("ReceiveMessage", messageDto);
        }
    }
}
