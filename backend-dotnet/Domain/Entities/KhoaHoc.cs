namespace LMS.Api.Domain.Entities;

public class KhoaHoc
{
    public string Id { get; set; } = string.Empty;
    public string TieuDe { get; set; } = string.Empty;
    public string DuongDanThanThien { get; set; } = string.Empty;
    public string? MoTaNgan { get; set; }
    public string? MoTa { get; set; }
    public string? MoTaChiTiet { get; set; }
    public string? AnhDaiDien { get; set; }
    public string ChuyenMuc { get; set; } = "Lập trình";
    public string? DanhMucId { get; set; }
    public DanhMuc? DanhMuc { get; set; }
    public string TrinhDo { get; set; } = "BEGINNER";
    public int Gia { get; set; }
    public double DiemDanhGiaTrungBinh { get; set; }
    public int SoLuongDanhGia { get; set; }
    public string HangThanhVienToiThieu { get; set; } = "BRONZE";
    public int TongThoiLuongGiay { get; set; }
    public bool DaXuatBan { get; set; }
    public string TrangThai { get; set; } = "DRAFT";
    public string? LyDoTuChoi { get; set; }
    public DateTime? NgayXuatBan { get; set; }
    public DateTime? StartDate { get; set; }
    public DateTime? EndDate { get; set; }
    public string GiangVienId { get; set; } = string.Empty;
    public NguoiDung? GiangVien { get; set; }
    public DateTime NgayTao { get; set; }
    public DateTime NgayCapNhat { get; set; }

    public ICollection<ChuongHoc> CacChuongHoc { get; set; } = [];
    public ICollection<BaiHoc> CacBaiHoc { get; set; } = [];
    public ICollection<GhiDanh> CacGhiDanh { get; set; } = [];
    public ICollection<DonMua> CacDonMua { get; set; } = [];
    public ICollection<GiaoDichVi> CacGiaoDichVi { get; set; } = [];
    public ICollection<DanhGiaKhoaHoc> CacDanhGia { get; set; } = [];
    public ICollection<ChungChi> CacChungChi { get; set; } = [];
    public ICollection<MaGiamGia> CacMaGiamGia { get; set; } = [];
    public ICollection<BaiTap> CacBaiTap { get; set; } = [];
    public ICollection<KhoaHocDaLuu> CacNguoiDungDaLuu { get; set; } = [];
    public ICollection<KhoaHocAnh> CacHinhAnh { get; set; } = [];
}
