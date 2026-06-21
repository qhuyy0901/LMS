using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace LMS.Api.Domain.Entities;

public class TinNhan
{
    [Key]
    public Guid Id { get; set; }

    public Guid CuocTroChuyenId { get; set; }
    public CuocTroChuyen CuocTroChuyen { get; set; } = null!;

    public string NguoiGuiId { get; set; } = string.Empty;
    public NguoiDung NguoiGui { get; set; } = null!;

    public string NoiDung { get; set; } = string.Empty;

    public DateTime GuiLuc { get; set; } = DateTime.UtcNow;

    public ICollection<TinNhanDinhKem> CacFileDinhKem { get; set; } = [];
}
