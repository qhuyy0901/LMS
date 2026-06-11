namespace LMS.Api.Models;

public class RutTienGiangVien
{
    public string Id { get; set; } = string.Empty;
    public string InstructorId { get; set; } = string.Empty;
    public NguoiDung? Instructor { get; set; }
    public int Amount { get; set; }
    public string Status { get; set; } = "COMPLETED";
    public string BankName { get; set; } = string.Empty;
    public string AccountNumber { get; set; } = string.Empty;
    public string AccountHolder { get; set; } = string.Empty;
    public string? Note { get; set; }
    public DateTime CreatedAt { get; set; }
}
