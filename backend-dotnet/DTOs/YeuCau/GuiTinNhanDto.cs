using System.ComponentModel.DataAnnotations;

namespace LMS.Api.DTOs.YeuCau;

public class GuiTinNhanDto
{
    [Required]
    public Guid ConversationId { get; set; }
    
    public string? Content { get; set; }
}
