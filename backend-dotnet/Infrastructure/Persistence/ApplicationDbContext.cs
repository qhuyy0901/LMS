using LMS.Api.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace LMS.Api.Infrastructure.Persistence;

public class ApplicationDbContext(DbContextOptions<ApplicationDbContext> options) : DbContext(options)
{
    public DbSet<NguoiDung> NguoiDung => Set<NguoiDung>();
    public DbSet<DanhMuc> DanhMuc => Set<DanhMuc>();
    public DbSet<KhoaHoc> KhoaHoc => Set<KhoaHoc>();
    public DbSet<KhoaHocAnh> KhoaHocAnh => Set<KhoaHocAnh>();
    public DbSet<ChuongHoc> ChuongHoc => Set<ChuongHoc>();
    public DbSet<BaiHoc> BaiHoc => Set<BaiHoc>();
    public DbSet<GhiDanh> GhiDanh => Set<GhiDanh>();
    public DbSet<ChungChi> ChungChi => Set<ChungChi>();
    public DbSet<DonMua> DonMua => Set<DonMua>();
    public DbSet<GiaoDichVi> GiaoDichVi => Set<GiaoDichVi>();
    public DbSet<ThanhToan> ThanhToan => Set<ThanhToan>();
    public DbSet<ThongBao> ThongBao => Set<ThongBao>();
    public DbSet<DanhGiaKhoaHoc> DanhGiaKhoaHoc => Set<DanhGiaKhoaHoc>();
    public DbSet<TienDoBaiHoc> TienDoBaiHoc => Set<TienDoBaiHoc>();
    public DbSet<BinhLuan> BinhLuan => Set<BinhLuan>();
    public DbSet<BaiKiemTra> BaiKiemTra => Set<BaiKiemTra>();
    public DbSet<CauHoiKiemTra> CauHoiKiemTra => Set<CauHoiKiemTra>();
    public DbSet<BaiNopKiemTra> BaiNopKiemTra => Set<BaiNopKiemTra>();
    public DbSet<MaGiamGia> MaGiamGia => Set<MaGiamGia>();
    public DbSet<NguoiNhanMaGiamGia> NguoiNhanMaGiamGia => Set<NguoiNhanMaGiamGia>();
    public DbSet<LichSuDungMaGiamGia> LichSuDungMaGiamGia => Set<LichSuDungMaGiamGia>();
    public DbSet<NhatKyHeThong> NhatKyHeThong => Set<NhatKyHeThong>();
    public DbSet<BaiTap> BaiTap => Set<BaiTap>();
    public DbSet<DoiThuongSuKien> DoiThuongSuKien => Set<DoiThuongSuKien>();
    public DbSet<SuKien> SuKien => Set<SuKien>();
    public DbSet<DangKySuKien> DangKySuKien => Set<DangKySuKien>();
    public DbSet<SuKienAnh> SuKienAnh => Set<SuKienAnh>();
    public DbSet<RutTienGiangVien> InstructorWithdrawals => Set<RutTienGiangVien>();
    public DbSet<CuocTroChuyen> CuocTroChuyen => Set<CuocTroChuyen>();
    public DbSet<NguoiThamGiaTroChuyen> NguoiThamGiaTroChuyen => Set<NguoiThamGiaTroChuyen>();
    public DbSet<TinNhan> TinNhan => Set<TinNhan>();
    public DbSet<TinNhanDinhKem> TinNhanDinhKem => Set<TinNhanDinhKem>();
    public DbSet<KhoaHocDaLuu> KhoaHocDaLuu => Set<KhoaHocDaLuu>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<NguoiDung>(entity =>
        {
            entity.ToTable("NguoiDung");
            entity.HasKey(item => item.Id);
            entity.HasIndex(item => item.Email).IsUnique();
            entity.Property(item => item.VaiTro).HasDefaultValue("STUDENT");
            entity.Property(item => item.HangThanhVien).HasDefaultValue("BRONZE");
            entity.Property(item => item.SoDuVi).HasDefaultValue(0);
            entity.Property(item => item.TongChiTieu).HasDefaultValue(0);
            entity.Property(item => item.DiemThuong).HasDefaultValue(0);
            entity.Property(item => item.ChuoiDangNhap).HasDefaultValue(0);
            entity.Property(item => item.TuanNhanThuongMuaCuoi).HasMaxLength(10);
        });

        modelBuilder.Entity<DoiThuongSuKien>(entity =>
        {
            entity.ToTable("DoiThuongSuKien");
            entity.HasKey(item => item.Id);
            entity.HasIndex(item => new { item.NguoiDungId, item.PhanThuongId }).IsUnique();
            entity.HasOne(item => item.NguoiDung)
                .WithMany(item => item.CacDoiThuongSuKien)
                .HasForeignKey(item => item.NguoiDungId)
                .OnDelete(DeleteBehavior.NoAction);
        });

        modelBuilder.Entity<SuKien>(entity =>
        {
            entity.ToTable("SuKien");
            entity.HasKey(item => item.Id);
            entity.HasIndex(item => new { item.TrangThai, item.ThoiGianBatDau });
            entity.HasIndex(item => item.GiangVienId);
            entity.Property(item => item.LoaiSuKien).HasDefaultValue("WORKSHOP");
            entity.Property(item => item.Format).HasDefaultValue("OFFLINE");
            entity.Property(item => item.TrangThai).HasDefaultValue("DRAFT");
            entity.Property(item => item.SucChua).HasDefaultValue(50);
            entity.Property(item => item.DiemYeuCau).HasDefaultValue(0);
            entity.HasOne(item => item.GiangVien)
                .WithMany(item => item.CacSuKienToChuc)
                .HasForeignKey(item => item.GiangVienId)
                .OnDelete(DeleteBehavior.NoAction);
        });

        modelBuilder.Entity<DangKySuKien>(entity =>
        {
            entity.ToTable("DangKySuKien");
            entity.HasKey(item => item.Id);
            entity.HasIndex(item => new { item.SuKienId, item.NguoiDungId }).IsUnique();
            entity.HasIndex(item => new { item.NguoiDungId, item.NgayDangKy });
            entity.Property(item => item.TrangThai).HasDefaultValue("REGISTERED");
            entity.Property(item => item.DiemDaDung).HasDefaultValue(0);
            entity.HasOne(item => item.Event)
                .WithMany(item => item.CacDangKy)
                .HasForeignKey(item => item.SuKienId)
                .OnDelete(DeleteBehavior.NoAction);
            entity.HasOne(item => item.NguoiDung)
                .WithMany(item => item.CacDangKySuKien)
                .HasForeignKey(item => item.NguoiDungId)
                .OnDelete(DeleteBehavior.NoAction);
        });

        modelBuilder.Entity<SuKienAnh>(entity =>
        {
            entity.ToTable("SuKienAnh");
            entity.HasKey(item => item.Id);
            entity.HasIndex(item => item.SuKienId);
            entity.HasOne(item => item.SuKien)
                .WithMany(item => item.CacHinhAnh)
                .HasForeignKey(item => item.SuKienId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<RutTienGiangVien>(entity =>
        {
            entity.ToTable("RutTienGiangVien");
            entity.HasKey(item => item.Id);
            entity.HasIndex(item => new { item.GiangVienId, item.NgayTao });
            entity.Property(item => item.TrangThai).HasDefaultValue("COMPLETED");
            entity.Property(item => item.TenNganHang).HasMaxLength(150);
            entity.Property(item => item.SoTaiKhoan).HasMaxLength(50);
            entity.Property(item => item.ChuTaiKhoan).HasMaxLength(150);
            entity.Property(item => item.NoiDung).HasMaxLength(500);
            entity.HasOne(item => item.GiangVien)
                .WithMany(item => item.InstructorWithdrawals)
                .HasForeignKey(item => item.GiangVienId)
                .OnDelete(DeleteBehavior.NoAction);
        });

        modelBuilder.Entity<DanhMuc>(entity =>
        {
            entity.ToTable("DanhMuc");
            entity.HasKey(item => item.Id);
            entity.HasIndex(item => item.Ten).IsUnique();
            entity.HasIndex(item => item.Slug).IsUnique();
        });

        modelBuilder.Entity<KhoaHoc>(entity =>
        {
            entity.ToTable("KhoaHoc");
            entity.HasKey(item => item.Id);
            entity.HasIndex(item => item.DuongDanThanThien).IsUnique();
            entity.HasOne(item => item.GiangVien)
                .WithMany(item => item.CacKhoaHoc)
                .HasForeignKey(item => item.GiangVienId)
                .OnDelete(DeleteBehavior.NoAction);
            entity.HasOne(item => item.DanhMuc)
                .WithMany(item => item.CacKhoaHoc)
                .HasForeignKey(item => item.DanhMucId)
                .OnDelete(DeleteBehavior.SetNull);
            entity.Property(item => item.HangThanhVienToiThieu).HasDefaultValue("BRONZE");
            entity.Property(item => item.ChuyenMuc).HasDefaultValue("Lập trình");
            entity.Property(item => item.TrinhDo).HasDefaultValue("BEGINNER");
            entity.Property(item => item.TrangThai).HasDefaultValue("DRAFT");
            entity.Property(item => item.LyDoTuChoi).HasMaxLength(1000);
        });

        modelBuilder.Entity<KhoaHocAnh>(entity =>
        {
            entity.ToTable("KhoaHocAnh");
            entity.HasKey(item => item.Id);
            entity.HasIndex(item => item.KhoaHocId);
            entity.HasOne(item => item.KhoaHoc)
                .WithMany(item => item.CacHinhAnh)
                .HasForeignKey(item => item.KhoaHocId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<ChuongHoc>(entity =>
        {
            entity.ToTable("ChuongHoc");
            entity.HasKey(item => item.Id);
            entity.HasOne(item => item.KhoaHoc)
                .WithMany(item => item.CacChuongHoc)
                .HasForeignKey(item => item.KhoaHocId)
                .OnDelete(DeleteBehavior.NoAction);
        });

        modelBuilder.Entity<BaiHoc>(entity =>
        {
            entity.ToTable("BaiHoc");
            entity.HasKey(item => item.Id);
            entity.HasOne(item => item.KhoaHoc)
                .WithMany(item => item.CacBaiHoc)
                .HasForeignKey(item => item.KhoaHocId)
                .OnDelete(DeleteBehavior.NoAction);
            entity.HasOne(item => item.ChuongHoc)
                .WithMany(item => item.CacBaiHoc)
                .HasForeignKey(item => item.ChuongHocId)
                .OnDelete(DeleteBehavior.NoAction);
            entity.Property(item => item.TrangThai).HasDefaultValue("DRAFT");
        });

        modelBuilder.Entity<BaiTap>(entity =>
        {
            entity.ToTable("BaiTap");
            entity.HasKey(item => item.Id);
            entity.HasIndex(item => item.KhoaHocId);
            entity.HasIndex(item => item.BaiHocId);
            entity.HasIndex(item => item.GiangVienId);
            entity.Property(item => item.DiemToiDa).HasDefaultValue(100);
            entity.Property(item => item.ChoPhepNopText).HasDefaultValue(true);
            entity.Property(item => item.ChoPhepNopFile).HasDefaultValue(true);
            entity.HasOne(item => item.KhoaHoc)
                .WithMany(item => item.CacBaiTap)
                .HasForeignKey(item => item.KhoaHocId)
                .OnDelete(DeleteBehavior.NoAction);
            entity.HasOne(item => item.BaiHoc)
                .WithMany(item => item.CacBaiTap)
                .HasForeignKey(item => item.BaiHocId)
                .OnDelete(DeleteBehavior.NoAction);
            entity.HasOne(item => item.GiangVien)
                .WithMany()
                .HasForeignKey(item => item.GiangVienId)
                .OnDelete(DeleteBehavior.NoAction);
        });

        modelBuilder.Entity<GhiDanh>(entity =>
        {
            entity.ToTable("GhiDanh");
            entity.HasKey(item => item.Id);
            entity.HasIndex(item => new { item.NguoiDungId, item.KhoaHocId }).IsUnique();
            entity.HasOne(item => item.NguoiDung)
                .WithMany(item => item.CacGhiDanh)
                .HasForeignKey(item => item.NguoiDungId)
                .OnDelete(DeleteBehavior.NoAction);
            entity.HasOne(item => item.KhoaHoc)
                .WithMany(item => item.CacGhiDanh)
                .HasForeignKey(item => item.KhoaHocId)
                .OnDelete(DeleteBehavior.NoAction);
        });

        modelBuilder.Entity<ChungChi>(entity =>
        {
            entity.ToTable("ChungChi");
            entity.HasKey(item => item.Id);
            entity.HasIndex(item => new { item.NguoiDungId, item.KhoaHocId }).IsUnique();
            entity.HasOne(item => item.NguoiDung)
                .WithMany(item => item.CacChungChi)
                .HasForeignKey(item => item.NguoiDungId)
                .OnDelete(DeleteBehavior.NoAction);
            entity.HasOne(item => item.KhoaHoc)
                .WithMany(item => item.CacChungChi)
                .HasForeignKey(item => item.KhoaHocId)
                .OnDelete(DeleteBehavior.NoAction);
        });

        modelBuilder.Entity<DanhGiaKhoaHoc>(entity =>
        {
            entity.ToTable("DanhGiaKhoaHoc");
            entity.HasKey(item => item.Id);
            entity.HasIndex(item => new { item.NguoiDungId, item.KhoaHocId }).IsUnique();
            entity.HasIndex(item => new { item.KhoaHocId, item.NgayTao });
            entity.HasIndex(item => new { item.NguoiDungId, item.NgayTao });
            entity.HasOne(item => item.NguoiDung)
                .WithMany(item => item.CacDanhGia)
                .HasForeignKey(item => item.NguoiDungId)
                .OnDelete(DeleteBehavior.NoAction);
            entity.HasOne(item => item.KhoaHoc)
                .WithMany(item => item.CacDanhGia)
                .HasForeignKey(item => item.KhoaHocId)
                .OnDelete(DeleteBehavior.NoAction);
        });

        modelBuilder.Entity<TienDoBaiHoc>(entity =>
        {
            entity.ToTable("TienDoBaiHoc");
            entity.HasKey(item => item.Id);
            entity.HasIndex(item => new { item.NguoiDungId, item.BaiHocId }).IsUnique();
            entity.HasIndex(item => item.NguoiDungId);
            entity.HasIndex(item => item.BaiHocId);
            entity.HasIndex(item => new { item.NguoiDungId, item.DaHoanThanh });
            entity.HasOne(item => item.NguoiDung)
                .WithMany(item => item.CacTienDoBaiHoc)
                .HasForeignKey(item => item.NguoiDungId)
                .OnDelete(DeleteBehavior.NoAction);
            entity.HasOne(item => item.BaiHoc)
                .WithMany(item => item.CacTienDoBaiHoc)
                .HasForeignKey(item => item.BaiHocId)
                .OnDelete(DeleteBehavior.NoAction);
        });

        modelBuilder.Entity<BinhLuan>(entity =>
        {
            entity.ToTable("BinhLuan");
            entity.HasKey(item => item.Id);
            entity.HasIndex(item => item.BaiHocId);
            entity.HasIndex(item => item.NguoiDungId);
            entity.HasOne(item => item.NguoiDung)
                .WithMany(item => item.CacBinhLuan)
                .HasForeignKey(item => item.NguoiDungId)
                .OnDelete(DeleteBehavior.NoAction);
            entity.HasOne(item => item.BaiHoc)
                .WithMany(item => item.CacBinhLuan)
                .HasForeignKey(item => item.BaiHocId)
                .OnDelete(DeleteBehavior.NoAction);
            entity.HasOne(item => item.BinhLuanCha)
                .WithMany(item => item.CacPhanHoi)
                .HasForeignKey(item => item.BinhLuanChaId)
                .OnDelete(DeleteBehavior.NoAction);
        });

        modelBuilder.Entity<BaiKiemTra>(entity =>
        {
            entity.ToTable("BaiKiemTra");
            entity.HasKey(item => item.Id);
            entity.HasIndex(item => item.BaiHocId).IsUnique();
            entity.Property(item => item.DiemDat).HasDefaultValue(80);
            entity.HasOne(item => item.BaiHoc)
                .WithOne(item => item.BaiKiemTra)
                .HasForeignKey<BaiKiemTra>(item => item.BaiHocId)
                .OnDelete(DeleteBehavior.NoAction);
        });

        modelBuilder.Entity<CauHoiKiemTra>(entity =>
        {
            entity.ToTable("CauHoiKiemTra");
            entity.HasKey(item => item.Id);
            entity.HasIndex(item => item.BaiKiemTraId);
            entity.Property(item => item.CacLuaChon).HasMaxLength(4000);
            entity.HasOne(item => item.BaiKiemTra)
                .WithMany(item => item.CacCauHoi)
                .HasForeignKey(item => item.BaiKiemTraId)
                .OnDelete(DeleteBehavior.NoAction);
        });

        modelBuilder.Entity<BaiNopKiemTra>(entity =>
        {
            entity.ToTable("BaiNopKiemTra");
            entity.HasKey(item => item.Id);
            entity.HasIndex(item => item.NguoiDungId);
            entity.HasIndex(item => item.BaiKiemTraId);
            entity.Property(item => item.DapAn).HasMaxLength(4000);
            entity.HasOne(item => item.NguoiDung)
                .WithMany(item => item.CacBaiNopKiemTra)
                .HasForeignKey(item => item.NguoiDungId)
                .OnDelete(DeleteBehavior.NoAction);
            entity.HasOne(item => item.BaiKiemTra)
                .WithMany(item => item.CacBaiNop)
                .HasForeignKey(item => item.BaiKiemTraId)
                .OnDelete(DeleteBehavior.NoAction);
        });

        modelBuilder.Entity<MaGiamGia>(entity =>
        {
            entity.ToTable("MaGiamGia");
            entity.HasKey(item => item.Id);
            entity.HasIndex(item => item.Ma).IsUnique();
            entity.HasIndex(item => item.KhoaHocId);
            entity.HasIndex(item => item.GiangVienId);
            entity.Property(item => item.DiscountType).HasDefaultValue("PERCENTAGE");
            entity.Property(item => item.MinPurchaseAmount).HasDefaultValue(0);
            entity.Property(item => item.HoatDong).HasDefaultValue(true);
            entity.Property(item => item.UsageCount).HasDefaultValue(0);
            entity.Property(item => item.TrangThai).HasDefaultValue("ACTIVE");
            entity.Property(item => item.IsPrivate).HasDefaultValue(false);
            entity.HasOne(item => item.KhoaHoc)
                .WithMany(item => item.CacMaGiamGia)
                .HasForeignKey(item => item.KhoaHocId)
                .OnDelete(DeleteBehavior.NoAction);
            entity.HasOne(item => item.GiangVien)
                .WithMany()
                .HasForeignKey(item => item.GiangVienId)
                .OnDelete(DeleteBehavior.NoAction);
        });

        modelBuilder.Entity<NguoiNhanMaGiamGia>(entity =>
        {
            entity.ToTable("NguoiNhanMaGiamGia");
            entity.HasKey(item => item.Id);
            entity.HasIndex(item => new { item.MaGiamGiaId, item.NguoiDungId }).IsUnique();
            entity.HasIndex(item => item.GiangVienId);
            entity.HasIndex(item => item.SourceCourseId);
            entity.HasOne(item => item.MaGiamGia)
                .WithMany(item => item.CacNguoiNhan)
                .HasForeignKey(item => item.MaGiamGiaId)
                .OnDelete(DeleteBehavior.Cascade);
            entity.HasOne(item => item.NguoiDung)
                .WithMany()
                .HasForeignKey(item => item.NguoiDungId)
                .OnDelete(DeleteBehavior.NoAction);
            entity.HasOne(item => item.GiangVien)
                .WithMany()
                .HasForeignKey(item => item.GiangVienId)
                .OnDelete(DeleteBehavior.NoAction);
            entity.HasOne(item => item.SourceCourse)
                .WithMany()
                .HasForeignKey(item => item.SourceCourseId)
                .OnDelete(DeleteBehavior.NoAction);
        });

        modelBuilder.Entity<LichSuDungMaGiamGia>(entity =>
        {
            entity.ToTable("LichSuDungMaGiamGia");
            entity.HasKey(item => item.Id);
            entity.HasIndex(item => new { item.MaGiamGiaId, item.NguoiDungId }).IsUnique();
            entity.HasIndex(item => item.KhoaHocId);
            entity.HasIndex(item => item.DonMuaId).IsUnique();
            entity.HasOne(item => item.MaGiamGia)
                .WithMany(item => item.CacLuotSuDung)
                .HasForeignKey(item => item.MaGiamGiaId)
                .OnDelete(DeleteBehavior.Cascade);
            entity.HasOne(item => item.NguoiDung)
                .WithMany()
                .HasForeignKey(item => item.NguoiDungId)
                .OnDelete(DeleteBehavior.NoAction);
            entity.HasOne(item => item.KhoaHoc)
                .WithMany()
                .HasForeignKey(item => item.KhoaHocId)
                .OnDelete(DeleteBehavior.NoAction);
            entity.HasOne(item => item.DonMua)
                .WithOne()
                .HasForeignKey<LichSuDungMaGiamGia>(item => item.DonMuaId)
                .OnDelete(DeleteBehavior.NoAction);
        });

        modelBuilder.Entity<NhatKyHeThong>(entity =>
        {
            entity.ToTable("NhatKyHeThong");
            entity.HasKey(item => item.Id);
            entity.HasIndex(item => new { item.NguoiThucHienId, item.NgayTao });
            entity.HasIndex(item => new { item.LoaiThucTe, item.ThucTheId });
            entity.HasIndex(item => new { item.HanhDong, item.NgayTao });
            entity.Property(item => item.Metadata).HasMaxLength(4000);
        });

        modelBuilder.Entity<DonMua>(entity =>
        {
            entity.ToTable("DonMua");
            entity.HasKey(item => item.Id);
            entity.HasIndex(item => new { item.NguoiDungId, item.KhoaHocId }).IsUnique();
            entity.HasIndex(item => new { item.KhoaHocId, item.NgayTao });
            entity.HasIndex(item => new { item.NguoiDungId, item.NgayTao });
            entity.Property(item => item.LoaiTien).HasDefaultValue("VND");
            entity.Property(item => item.TrangThai).HasDefaultValue("COMPLETED");
            entity.Property(item => item.SoTienGiam).HasDefaultValue(0);
            entity.HasOne(item => item.NguoiDung)
                .WithMany(item => item.CacDonMua)
                .HasForeignKey(item => item.NguoiDungId)
                .OnDelete(DeleteBehavior.NoAction);
            entity.HasOne(item => item.KhoaHoc)
                .WithMany(item => item.CacDonMua)
                .HasForeignKey(item => item.KhoaHocId)
                .OnDelete(DeleteBehavior.NoAction);
            entity.HasOne(item => item.MaGiamGia)
                .WithMany()
                .HasForeignKey(item => item.MaGiamGiaId)
                .OnDelete(DeleteBehavior.NoAction);
        });

        modelBuilder.Entity<GiaoDichVi>(entity =>
        {
            entity.ToTable("GiaoDichVi");
            entity.HasKey(item => item.Id);
            entity.HasIndex(item => new { item.NguoiDungId, item.NgayTao });
            entity.HasIndex(item => item.KhoaHocId);
            entity.HasIndex(item => new { item.LoaiGiaoDich, item.NgayTao });
            entity.Property(item => item.TrangThai).HasDefaultValue("COMPLETED");
            entity.Property(item => item.Metadata).HasMaxLength(4000);
            entity.HasOne(item => item.NguoiDung)
                .WithMany(item => item.CacGiaoDichVi)
                .HasForeignKey(item => item.NguoiDungId)
                .OnDelete(DeleteBehavior.NoAction);
            entity.HasOne(item => item.KhoaHoc)
                .WithMany(item => item.CacGiaoDichVi)
                .HasForeignKey(item => item.KhoaHocId)
                .OnDelete(DeleteBehavior.NoAction);
            entity.HasOne(item => item.DonMua)
                .WithMany(item => item.CacGiaoDichVi)
                .HasForeignKey(item => item.DonMuaId)
                .OnDelete(DeleteBehavior.NoAction);
            entity.HasOne(item => item.ThanhToan)
                .WithMany(item => item.CacGiaoDichVi)
                .HasForeignKey(item => item.ThanhToanId)
                .OnDelete(DeleteBehavior.NoAction);
        });

        modelBuilder.Entity<ThanhToan>(entity =>
        {
            entity.ToTable("ThanhToan");
            entity.HasKey(item => item.Id);
            entity.HasIndex(item => item.PhienNhaCungCapId).IsUnique();
            entity.HasIndex(item => new { item.NguoiDungId, item.NgayTao });
            entity.HasIndex(item => new { item.TrangThai, item.NgayTao });
            entity.Property(item => item.TrangThai).HasDefaultValue("PENDING");
            entity.Property(item => item.LoaiTien).HasDefaultValue("VND");
            entity.HasOne(item => item.NguoiDung)
                .WithMany(item => item.ExternalPayments)
                .HasForeignKey(item => item.NguoiDungId)
                .OnDelete(DeleteBehavior.NoAction);
        });

        modelBuilder.Entity<ThongBao>(entity =>
        {
            entity.ToTable("ThongBao");
            entity.HasKey(item => item.Id);
            entity.HasIndex(item => new { item.NguoiDungId, item.DaDoc, item.NgayTao });
            entity.Property(item => item.Metadata).HasMaxLength(4000);
            entity.HasOne(item => item.NguoiDung)
                .WithMany(item => item.CacThongBao)
                .HasForeignKey(item => item.NguoiDungId)
                .OnDelete(DeleteBehavior.NoAction);
        });

        modelBuilder.Entity<CuocTroChuyen>(entity =>
        {
            entity.ToTable("CuocTroChuyen");
            entity.HasKey(item => item.Id);
            entity.HasIndex(item => item.KhoaHocId);
            entity.HasIndex(item => new { item.KhoaHocId, item.ClassId, item.SubjectId });
            entity.Property(item => item.KhoaHocId).HasMaxLength(450);
            entity.Property(item => item.ClassId).HasMaxLength(450);
            entity.Property(item => item.SubjectId).HasMaxLength(450);
            entity.Property(item => item.TieuDe).HasMaxLength(255);
            entity.Property(item => item.LaNhom).HasDefaultValue(false);
        });

        modelBuilder.Entity<NguoiThamGiaTroChuyen>(entity =>
        {
            entity.ToTable("NguoiThamGiaTroChuyen");
            entity.HasKey(item => new { item.CuocTroChuyenId, item.NguoiDungId });
            entity.HasOne(item => item.CuocTroChuyen)
                .WithMany(item => item.CacNguoiThamGia)
                .HasForeignKey(item => item.CuocTroChuyenId)
                .OnDelete(DeleteBehavior.Cascade);
            entity.HasOne(item => item.NguoiDung)
                .WithMany(item => item.Conversations)
                .HasForeignKey(item => item.NguoiDungId)
                .OnDelete(DeleteBehavior.NoAction);
        });

        modelBuilder.Entity<TinNhan>(entity =>
        {
            entity.ToTable("TinNhan");
            entity.HasKey(item => item.Id);
            entity.HasIndex(item => item.CuocTroChuyenId);
            entity.HasIndex(item => item.GuiLuc);
            entity.Property(item => item.NoiDung).HasDefaultValue(string.Empty);
            entity.HasOne(item => item.CuocTroChuyen)
                .WithMany(item => item.CacTinNhan)
                .HasForeignKey(item => item.CuocTroChuyenId)
                .OnDelete(DeleteBehavior.Cascade);
            entity.HasOne(item => item.NguoiGui)
                .WithMany(item => item.CacTinNhanDaGui)
                .HasForeignKey(item => item.NguoiGuiId)
                .OnDelete(DeleteBehavior.NoAction);
        });

        modelBuilder.Entity<TinNhanDinhKem>(entity =>
        {
            entity.ToTable("TinNhanDinhKem");
            entity.HasKey(item => item.Id);
            entity.HasIndex(item => item.TinNhanId);
            entity.Property(item => item.TenFile).HasMaxLength(255);
            entity.Property(item => item.TenFileGoc).HasMaxLength(255);
            entity.Property(item => item.LoaiNoiDung).HasMaxLength(100);
            entity.HasOne(item => item.TinNhan)
                .WithMany(item => item.CacFileDinhKem)
                .HasForeignKey(item => item.TinNhanId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<KhoaHocDaLuu>(entity =>
        {
            entity.ToTable("KhoaHocDaLuu");
            entity.HasKey(item => item.Id);
            entity.HasIndex(item => new { item.NguoiDungId, item.KhoaHocId }).IsUnique();
            entity.HasIndex(item => new { item.NguoiDungId, item.NgayTao });
            entity.HasOne(item => item.NguoiDung)
                .WithMany(item => item.CacKhoaHocDaLuu)
                .HasForeignKey(item => item.NguoiDungId)
                .OnDelete(DeleteBehavior.Cascade);
            entity.HasOne(item => item.KhoaHoc)
                .WithMany(item => item.CacNguoiDungDaLuu)
                .HasForeignKey(item => item.KhoaHocId)
                .OnDelete(DeleteBehavior.Cascade);
        });
    }
}
