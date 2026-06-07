namespace LMS.Api.Models;

public class ChungChi
{
    public string Id { get; set; } = string.Empty;
    public string CertificateNo { get; set; } = string.Empty;
    public string VerifyCode { get; set; } = string.Empty;
    public string? PdfUrl { get; set; }
    public string? CompletionSnapshot { get; set; }
    public DateTime IssuedAt { get; set; }
    public string UserId { get; set; } = string.Empty;
    public NguoiDung? User { get; set; }
    public string CourseId { get; set; } = string.Empty;
    public KhoaHoc? Course { get; set; }
}
