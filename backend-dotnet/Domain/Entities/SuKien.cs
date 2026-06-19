namespace LMS.Api.Domain.Entities;

public class SuKien
{
    public string Id { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public string Type { get; set; } = "WORKSHOP";
    public string Format { get; set; } = "OFFLINE";
    public DateTime StartAt { get; set; }
    public DateTime EndAt { get; set; }
    public string? Location { get; set; }
    public string? LinkThamGia { get; set; }
    public string? ImageUrl { get; set; }
    public int Capacity { get; set; } = 50;
    public int PointCost { get; set; }
    public string Status { get; set; } = "DRAFT";
    public string InstructorId { get; set; } = string.Empty;
    public NguoiDung? Instructor { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }

    public ICollection<DangKySuKien> Registrations { get; set; } = [];
    public ICollection<SuKienAnh> Images { get; set; } = [];
}
