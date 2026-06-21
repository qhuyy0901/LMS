using System.ComponentModel.DataAnnotations.Schema;

namespace LMS.Api.Domain.Entities;

public class NguoiDung
{
    public string Id { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string Ten { get; set; } = string.Empty;
    public string MatKhau { get; set; } = string.Empty;
    public string VaiTro { get; set; } = "STUDENT";
    public string? AnhDaiDien { get; set; }
    public string? SoDienThoai { get; set; }
    public string? TieuSu { get; set; }
    public string? CaiDat { get; set; }
    public int SoDuVi { get; set; }
    public int TongChiTieu { get; set; }
    public string HangThanhVien { get; set; } = "BRONZE";
    public int DiemThuong { get; set; }
    public int ChuoiDangNhap { get; set; }
    public DateTime? NgayNhanThuongDangNhapCuoi { get; set; }
    public DateTime? NgayNhanThuongBaiHocCuoi { get; set; }
    public string? TuanNhanThuongMuaCuoi { get; set; }
    public DateTime NgayTao { get; set; }
    public DateTime NgayCapNhat { get; set; }
    public DateTime? LanCuoiHoatDong { get; set; }

    [NotMapped]
    public string HoTen
    {
        get => Ten;
        set => Ten = value;
    }

    public ICollection<KhoaHoc> CacKhoaHoc { get; set; } = [];
    public ICollection<GhiDanh> CacGhiDanh { get; set; } = [];
    public ICollection<ChungChi> CacChungChi { get; set; } = [];
    public ICollection<DonMua> CacDonMua { get; set; } = [];
    public ICollection<GiaoDichVi> CacGiaoDichVi { get; set; } = [];
    public ICollection<ThanhToan> ExternalPayments { get; set; } = [];
    public ICollection<ThongBao> CacThongBao { get; set; } = [];
    public ICollection<DanhGiaKhoaHoc> CacDanhGia { get; set; } = [];
    public ICollection<TienDoBaiHoc> CacTienDoBaiHoc { get; set; } = [];
    public ICollection<BinhLuan> CacBinhLuan { get; set; } = [];
    public ICollection<BaiNopKiemTra> CacBaiNopKiemTra { get; set; } = [];
    public ICollection<DoiThuongSuKien> CacDoiThuongSuKien { get; set; } = [];
    public ICollection<SuKien> CacSuKienToChuc { get; set; } = [];
    public ICollection<DangKySuKien> CacDangKySuKien { get; set; } = [];
    public ICollection<RutTienGiangVien> InstructorWithdrawals { get; set; } = [];
    
    public ICollection<NguoiThamGiaTroChuyen> Conversations { get; set; } = [];
    public ICollection<TinNhan> CacTinNhanDaGui { get; set; } = [];
    public ICollection<KhoaHocDaLuu> CacKhoaHocDaLuu { get; set; } = [];
}
