namespace LMS.Api.Domain.Entities;

public class ChuongHoc
{
    public string Id { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public string? Description { get; set; }
    public int Position { get; set; }
    public string CourseId { get; set; } = string.Empty;
    public KhoaHoc? Course { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }

    public ICollection<BaiHoc> Lessons { get; set; } = [];
}
