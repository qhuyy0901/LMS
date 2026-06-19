using System.ComponentModel.DataAnnotations;

namespace LMS.Api.Domain.Entities;

public class TinNhanDinhKem
{
    [Key]
    public Guid Id { get; set; }

    public Guid MessageId { get; set; }
    public TinNhan Message { get; set; } = null!;

    public string FileName { get; set; } = string.Empty;
    public string OriginalFileName { get; set; } = string.Empty;
    public string ContentType { get; set; } = string.Empty;
    public long Size { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
