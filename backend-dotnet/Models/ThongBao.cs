namespace LMS.Api.Models;

public class ThongBao
{
    public string Id { get; set; } = string.Empty;
    public string Type { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public string Body { get; set; } = string.Empty;
    public string? Link { get; set; }
    public bool IsRead { get; set; }
    public string? Metadata { get; set; }
    public DateTime? ReadAt { get; set; }
    public string UserId { get; set; } = string.Empty;
    public NguoiDung? User { get; set; }
    public DateTime CreatedAt { get; set; }
}
