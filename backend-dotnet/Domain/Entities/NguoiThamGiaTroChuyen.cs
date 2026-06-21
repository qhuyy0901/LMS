using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace LMS.Api.Domain.Entities;

public class NguoiThamGiaTroChuyen
{
    public Guid CuocTroChuyenId { get; set; }
    public CuocTroChuyen CuocTroChuyen { get; set; } = null!;

    public string NguoiDungId { get; set; } = string.Empty;
    public NguoiDung NguoiDung { get; set; } = null!;

    public DateTime NgayThamGia { get; set; } = DateTime.UtcNow;
    
    // To track unread messages
    public DateTime? DocCuoiLuc { get; set; }
}
