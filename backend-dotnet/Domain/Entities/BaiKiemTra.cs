namespace LMS.Api.Domain.Entities;

public class BaiKiemTra
{
    public string Id { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public string? Description { get; set; }
    public int PassingScore { get; set; } = 80;
    public string LessonId { get; set; } = string.Empty;
    public BaiHoc? Lesson { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }

    public ICollection<CauHoiKiemTra> Questions { get; set; } = [];
    public ICollection<NopBaiKiemTra> Submissions { get; set; } = [];
}
