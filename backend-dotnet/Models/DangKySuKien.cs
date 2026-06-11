namespace LMS.Api.Models;

public class DangKySuKien
{
    public string Id { get; set; } = string.Empty;
    public string EventId { get; set; } = string.Empty;
    public SuKien? Event { get; set; }
    public string UserId { get; set; } = string.Empty;
    public NguoiDung? User { get; set; }
    public string Status { get; set; } = "REGISTERED";
    public DateTime RegisteredAt { get; set; }
    public DateTime UpdatedAt { get; set; }
}
