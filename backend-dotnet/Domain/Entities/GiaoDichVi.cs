using System.ComponentModel.DataAnnotations.Schema;

namespace LMS.Api.Domain.Entities;

public class GiaoDichVi
{
    public const string NapTien = "NAP_TIEN";
    public const string MuaKhoaHoc = "MUA_KHOA_HOC";
    public const string HoanTien = "HOAN_TIEN";

    public string Id { get; set; } = string.Empty;
    public string LoaiGiaoDich { get; set; } = string.Empty;
    public int SoTien { get; set; }
    public int SoDuSauGiaoDich { get; set; }
    public string? NoiDung { get; set; }
    public string TrangThai { get; set; } = "COMPLETED";
    public string? Metadata { get; set; }
    public string NguoiDungId { get; set; } = string.Empty;
    public NguoiDung? NguoiDung { get; set; }
    public string? KhoaHocId { get; set; }
    public KhoaHoc? KhoaHoc { get; set; }
    public string? DonMuaId { get; set; }
    public DonMua? DonMua { get; set; }
    public string? ThanhToanId { get; set; }
    public ThanhToan? ThanhToan { get; set; }
    public DateTime NgayTao { get; set; }
}
