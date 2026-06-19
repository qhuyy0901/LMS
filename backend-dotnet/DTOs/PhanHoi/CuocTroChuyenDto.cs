namespace LMS.Api.DTOs.PhanHoi;

public class CuocTroChuyenDto
{
    public Guid Id { get; set; }
    public string? Title { get; set; }
    public bool IsGroup { get; set; }
    public string? CourseId { get; set; }
    public string? CourseTitle { get; set; }
    public string? ClassId { get; set; }
    public string? SubjectId { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
    
    // For 1-1 chat, we might want to return the other user's info
    public string OtherUserId { get; set; } = string.Empty;
    public string OtherUserName { get; set; } = string.Empty;
    public string? OtherUserAvatar { get; set; }
    public DateTime? OtherUserLastSeenAt { get; set; }
    
    // Unread count
    public int UnreadCount { get; set; }
    
    // Last message snippet
    public string? LastMessage { get; set; }
    public bool LastMessageHasImages { get; set; }
    public DateTime? LastMessageAt { get; set; }
}
