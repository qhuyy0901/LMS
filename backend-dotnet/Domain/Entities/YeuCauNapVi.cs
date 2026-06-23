using System;

namespace LMS.Api.Domain.Entities;

/// <summary>
/// Yêu cầu nạp tiền vào ví của học viên
/// </summary>
public class YeuCauNapVi
{
    public string Id { get; set; } = string.Empty;
    public string NguoiDungId { get; set; } = string.Empty;
    public NguoiDung? NguoiDung { get; set; }
    public int SoTien { get; set; }
    public string NoiDungChuyenKhoan { get; set; } = string.Empty;
    public string TrangThai { get; set; } = "Pending"; // Pending, Approved, Rejected
    public string MaGiaoDich { get; set; } = string.Empty; // Ví dụ: NAP123456
    public DateTime NgayTao { get; set; }
    public DateTime? NgayDuyet { get; set; }
    public string? LyDoTuChoi { get; set; }
}
