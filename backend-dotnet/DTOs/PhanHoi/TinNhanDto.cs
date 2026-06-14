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
    public List<TinNhanAnhDto> Attachments { get; set; } = [];
}

public class TinNhanAnhDto
{
    public Guid Id { get; set; }
    public string FileName { get; set; } = string.Empty;
    public string ContentType { get; set; } = string.Empty;
    public long Size { get; set; }
    public string Url { get; set; } = string.Empty;
}
