using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace LMS.Api.Models;

public class NguoiThamGiaTroChuyen
{
    public Guid ConversationId { get; set; }
    public CuocTroChuyen Conversation { get; set; } = null!;

    public string UserId { get; set; } = string.Empty;
    public NguoiDung User { get; set; } = null!;

    public DateTime JoinedAt { get; set; } = DateTime.UtcNow;
    
    // To track unread messages
    public DateTime? LastReadAt { get; set; }
}
