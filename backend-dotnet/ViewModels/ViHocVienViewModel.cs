namespace LMS.Api.ViewModels;

public class ViHocVienViewModel
{
    public int SoDuHienTai { get; set; }
    public string TenSinhVien { get; set; } = string.Empty;
    public string? SoTienNap { get; set; }
    public string? PhuongThucNap { get; set; }
    public IReadOnlyList<int> MenhGiaNapNhanh { get; set; } = [];
    public IReadOnlyList<ViGiaoDichViewModel> LichSuGiaoDich { get; set; } = [];
    public ViGiaoDichViewModel? GiaoDichDangXuLy { get; set; }
}

public class ViGiaoDichViewModel
{
    public string Id { get; set; } = string.Empty;
    public string MaGiaoDich { get; set; } = string.Empty;
    public DateTime NgayTao { get; set; }
    public string PhuongThuc { get; set; } = string.Empty;
    public string NoiDung { get; set; } = string.Empty;
    public int SoTien { get; set; }
    public string TrangThai { get; set; } = string.Empty;
    public int SoDuSauGiaoDich { get; set; }
    public string NganHang { get; set; } = "MB Bank";
    public string ChuTaiKhoan { get; set; } = "LMS SKILLIO DEMO";
    public string SoTaiKhoan { get; set; } = "0901000000";
}
