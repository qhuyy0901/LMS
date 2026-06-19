namespace LMS.Api.Domain.Entities;

public class DoiThuongSuKien
{
    public string Id { get; set; } = string.Empty;
    public string RewardId { get; set; } = string.Empty;
    public string EventTitle { get; set; } = string.Empty;
    public int PointCost { get; set; }
    public string UserId { get; set; } = string.Empty;
    public NguoiDung? User { get; set; }
    public DateTime CreatedAt { get; set; }
}
