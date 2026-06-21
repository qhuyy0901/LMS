using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace LMS.Api.Domain.Entities;

public class CuocTroChuyen
{
    [Key]
    public Guid Id { get; set; }

    public string? TieuDe { get; set; }
    
    public bool LaNhom { get; set; }
    
    public string? KhoaHocId { get; set; }
    public string? ClassId { get; set; }
    public string? SubjectId { get; set; }

    public DateTime NgayTao { get; set; } = DateTime.UtcNow;
    public DateTime NgayCapNhat { get; set; } = DateTime.UtcNow;

    // Navigation
    public ICollection<NguoiThamGiaTroChuyen> CacNguoiThamGia { get; set; } = [];
    public ICollection<TinNhan> CacTinNhan { get; set; } = [];
}
