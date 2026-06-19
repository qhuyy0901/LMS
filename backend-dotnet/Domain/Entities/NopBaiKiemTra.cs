namespace LMS.Api.Domain.Entities;

public class NopBaiKiemTra
{
    public string Id { get; set; } = string.Empty;
    public double Score { get; set; }
    public bool Passed { get; set; }
    public string Answers { get; set; } = "{}";
    public string UserId { get; set; } = string.Empty;
    public NguoiDung? User { get; set; }
    public string QuizId { get; set; } = string.Empty;
    public BaiKiemTra? Quiz { get; set; }
    public DateTime CreatedAt { get; set; }
}
