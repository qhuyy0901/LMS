using System.ComponentModel.DataAnnotations;

namespace LMS.Api.Domain.Entities;

public class TinNhanDinhKem
{
    [Key]
    public Guid Id { get; set; }

    public Guid TinNhanId { get; set; }
    public TinNhan TinNhan { get; set; } = null!;

    public string TenFile { get; set; } = string.Empty;
    public string TenFileGoc { get; set; } = string.Empty;
    public string LoaiNoiDung { get; set; } = string.Empty;
    public long KichThuoc { get; set; }
    public DateTime NgayTao { get; set; } = DateTime.UtcNow;
}
