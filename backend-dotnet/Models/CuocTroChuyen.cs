using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace LMS.Api.Models;

public class CuocTroChuyen
{
    [Key]
    public Guid Id { get; set; }

    public string? Title { get; set; }
    
    public bool IsGroup { get; set; }
    
    public string? CourseId { get; set; }
    public string? ClassId { get; set; }
    public string? SubjectId { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    // Navigation
    public ICollection<NguoiThamGiaTroChuyen> Participants { get; set; } = [];
    public ICollection<TinNhan> Messages { get; set; } = [];
}
