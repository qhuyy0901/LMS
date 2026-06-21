namespace LMS.Api.Domain.Entities;

public class SuKienAnh
{
    public string Id { get; set; } = string.Empty;
    public string SuKienId { get; set; } = string.Empty;
    public SuKien? SuKien { get; set; }
    public string AnhUrl { get; set; } = string.Empty;
    public bool AnhBia { get; set; }
    public DateTime NgayTao { get; set; }
}
