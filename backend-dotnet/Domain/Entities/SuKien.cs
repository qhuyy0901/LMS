namespace LMS.Api.Domain.Entities;

public class SuKien
{
    public string Id { get; set; } = string.Empty;
    public string TieuDe { get; set; } = string.Empty;
    public string MoTa { get; set; } = string.Empty;
    public string LoaiSuKien { get; set; } = "WORKSHOP";
    public string Format { get; set; } = "OFFLINE";
    public DateTime ThoiGianBatDau { get; set; }
    public DateTime ThoiGianKetThuc { get; set; }
    public string? DiaDiem { get; set; }
    public string? LinkThamGia { get; set; }
    public string? AnhUrl { get; set; }
    public int SucChua { get; set; } = 50;
    public int DiemYeuCau { get; set; }
    public string TrangThai { get; set; } = "DRAFT";
    public string GiangVienId { get; set; } = string.Empty;
    public NguoiDung? GiangVien { get; set; }
    public DateTime NgayTao { get; set; }
    public DateTime NgayCapNhat { get; set; }

    public ICollection<DangKySuKien> CacDangKy { get; set; } = [];
    public ICollection<SuKienAnh> CacHinhAnh { get; set; } = [];
}
