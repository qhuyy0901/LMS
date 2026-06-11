namespace LMS.Api.Models;

public class SuKienAnh
{
    public string Id { get; set; } = string.Empty;
    public string SuKienId { get; set; } = string.Empty;
    public SuKien? SuKien { get; set; }
    public string ImageUrl { get; set; } = string.Empty;
    public bool IsCover { get; set; }
    public DateTime CreatedAt { get; set; }
}
