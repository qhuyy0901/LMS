using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace LMS.Api.Models;

public class TinNhan
{
    [Key]
    public Guid Id { get; set; }

    public Guid ConversationId { get; set; }
    public CuocTroChuyen Conversation { get; set; } = null!;

    public string SenderId { get; set; } = string.Empty;
    public NguoiDung Sender { get; set; } = null!;

    public string Content { get; set; } = string.Empty;

    public DateTime SentAt { get; set; } = DateTime.UtcNow;

    public ICollection<TinNhanDinhKem> Attachments { get; set; } = [];
}
