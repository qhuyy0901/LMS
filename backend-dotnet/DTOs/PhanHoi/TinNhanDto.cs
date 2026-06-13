namespace LMS.Api.DTOs.PhanHoi;

public class TinNhanDto
{
    public Guid Id { get; set; }
    public Guid ConversationId { get; set; }
    
    public string SenderId { get; set; } = string.Empty;
    public string SenderName { get; set; } = string.Empty;
    public string? SenderAvatar { get; set; }
    
    public string Content { get; set; } = string.Empty;
    public DateTime SentAt { get; set; }
}
