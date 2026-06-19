namespace LMS.Api.Domain.Entities;

public class BaiHoc
{
    public string Id { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public string? Content { get; set; }
    public string? VideoUrl { get; set; }
    public string? IllustrationUrl { get; set; }
    public string? FileUrl { get; set; }
    public int? DurationSeconds { get; set; }
    public int Position { get; set; }
    public bool IsPublished { get; set; }
    public string Status { get; set; } = "DRAFT";
    public bool IsPreview { get; set; }
    public string CourseId { get; set; } = string.Empty;
    public KhoaHoc? Course { get; set; }
    public string SectionId { get; set; } = string.Empty;
    public ChuongHoc? Section { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }

    public ICollection<TienDoBaiHoc> Progresses { get; set; } = [];
    public ICollection<BinhLuan> Comments { get; set; } = [];
    public ICollection<BaiTap> Assignments { get; set; } = [];
    public BaiKiemTra? Quiz { get; set; }
}
