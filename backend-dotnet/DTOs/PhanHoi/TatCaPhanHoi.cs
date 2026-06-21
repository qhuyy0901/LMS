using System.Text.Json;
using LMS.Api.Domain.Entities;
using LMS.Api.Application.Services;

namespace LMS.Api.DTOs.PhanHoi;

// ═══════════════════════════════════════════════════════════════
// NGƯỜI DÙNG
// ═══════════════════════════════════════════════════════════════

/// <summary>Phản hồi khi đăng nhập/đăng ký thành công — chứa token và thông tin user</summary>
public record XacThucPhanHoi(string Token, NguoiDungDto User)
{
    public static XacThucPhanHoi TuUser(NguoiDung user, string token) => new(token, NguoiDungDto.TuUser(user));
}

/// <summary>Thông tin người dùng trả về cho client</summary>
public record NguoiDungDto(
    string Id, string Email, string Name, string Role,
    string? Avatar, string? Phone, string? Bio, JsonElement? Settings,
    int WalletBalance, int TotalSpent, string MemberTier,
    string MemberTierLabel, int MemberTierMinSpent,
    int RewardPoints, int LoginStreak, DateTime? LastRewardLoginDate)
{
    public static NguoiDungDto TuUser(NguoiDung user)
    {
        JsonElement? settings = null;
        if (!string.IsNullOrWhiteSpace(user.CaiDat))
        {
            try { settings = JsonSerializer.Deserialize<JsonElement>(user.CaiDat); }
            catch (JsonException) { /* bỏ qua lỗi parse */ }
        }

        var hang = TroGiup.TinhHangThanhVien(user.SoDuVi);
        return new(user.Id, user.Email, user.Ten, user.VaiTro, user.AnhDaiDien, user.SoDienThoai, user.TieuSu,
            settings, user.SoDuVi, user.TongChiTieu, hang.Hang, hang.NhanHieu, hang.HanMucToiThieu,
            user.DiemThuong, user.ChuoiDangNhap, user.NgayNhanThuongDangNhapCuoi);
    }

    private static (string NhanHieu, int ChiTieuToiThieu) TinhHang(int tongChiTieu) =>
        tongChiTieu >= 15_000_000 ? ("Kim cương", 15_000_000) :
        tongChiTieu >= 7_000_000 ? ("Bạch kim", 7_000_000) :
        tongChiTieu >= 3_000_000 ? ("Vàng", 3_000_000) :
        tongChiTieu >= 1_000_000 ? ("Bạc", 1_000_000) :
        ("Đồng", 0);
}

/// <summary>Thông tin user cho trang admin</summary>
public record NguoiDungAdminDto(
    string Id, string Email, string Name, string Role,
    string? Avatar, string? Phone, int WalletBalance, int TotalSpent, string MemberTier,
    DateTime CreatedAt, DateTime UpdatedAt, object _count)
{
    public static NguoiDungAdminDto TuUser(NguoiDung user, int soKhoaHoc, int soGhiDanh, int soMuaHang) =>
        new(user.Id, user.Email, user.Ten, user.VaiTro, user.AnhDaiDien, user.SoDienThoai,
            user.SoDuVi, user.TongChiTieu, user.HangThanhVien,
            user.NgayTao, user.NgayCapNhat,
            new { courses = soKhoaHoc, enrollments = soGhiDanh, purchases = soMuaHang });
}

// ═══════════════════════════════════════════════════════════════
// KHÓA HỌC
// ═══════════════════════════════════════════════════════════════

/// <summary>Thông tin tóm tắt khóa học</summary>
public record KhoaHocDto(
    string Id, string Title, string Slug, string? Description, string? Thumbnail,
    int Price, double AverageRating, int ReviewCount, string MinimumMemberTier,
    int TotalDurationSeconds, bool IsPublished,
    string Category, string Level, string InstructorName,
    int SectionCount, int LessonCount, int StudentCount, bool CanPreview,
    DateTime? StartDate, DateTime? EndDate)
{
    private static int TinhTongThoiLuong(KhoaHoc khoaHoc)
    {
        var tongTuBaiHoc = khoaHoc.CacBaiHoc.Sum(bai => bai.ThoiLuongGiay ?? 0);
        return khoaHoc.TongThoiLuongGiay > 0 ? khoaHoc.TongThoiLuongGiay : tongTuBaiHoc;
    }

    public static KhoaHocDto TuKhoaHoc(KhoaHoc khoaHoc) =>
        new(khoaHoc.Id, khoaHoc.TieuDe, khoaHoc.DuongDanThanThien, khoaHoc.MoTa, khoaHoc.AnhDaiDien,
            khoaHoc.Gia, khoaHoc.DiemDanhGiaTrungBinh, khoaHoc.SoLuongDanhGia, khoaHoc.HangThanhVienToiThieu,
            TinhTongThoiLuong(khoaHoc), khoaHoc.DaXuatBan,
            khoaHoc.DanhMuc?.Ten ?? khoaHoc.ChuyenMuc, khoaHoc.TrinhDo, khoaHoc.GiangVien?.Ten ?? "Giảng viên",
            khoaHoc.CacChuongHoc.Count, khoaHoc.CacBaiHoc.Count, khoaHoc.CacGhiDanh.Count,
            khoaHoc.CacBaiHoc.Any(bai => bai.ChoXemTruoc), khoaHoc.StartDate, khoaHoc.EndDate);
}

/// <summary>Thông tin chi tiết khóa học (trang xem khóa học)</summary>
public record ChiTietKhoaHocDto(
    string Id, string Title, string Slug, string? ShortDescription, string? Description, string? DetailedDescription, string? Thumbnail,
    int Price, double AverageRating, int ReviewCount, string MinimumMemberTier,
    int TotalDurationSeconds, bool IsPublished,
    string Category, string Level, int StudentCount, int PurchaseCount, object _count,
    string InstructorName, object? Instructor,
    IEnumerable<ChuongDto> Sections, IEnumerable<ChiTietBaiDto> Lessons,
    bool IsEnrolled, double Progress, IEnumerable<string> CompletedLessons,
    DanhGiaKhoaHoc? UserReview, IEnumerable<DanhGiaDto> Reviews,
    bool CanPreview, bool CanReview, bool CanPurchase,
    DateTime? StartDate, DateTime? EndDate)
{
    public static ChiTietKhoaHocDto TuKhoaHoc(KhoaHoc kh, GhiDanh? ghiDanh, IEnumerable<string> baiHoanThanh, DanhGiaKhoaHoc? danhGiaCuaToi, bool laChuSoHuu, int studentCount, int purchaseCount)
    {
        var coQuyenHoc = ghiDanh is not null || laChuSoHuu;
        var tongThoiLuong = kh.TongThoiLuongGiay > 0
            ? kh.TongThoiLuongGiay
            : kh.CacChuongHoc.SelectMany(c => c.CacBaiHoc).Sum(b => b.ThoiLuongGiay ?? 0);
        var chuongHienThi = kh.CacChuongHoc
            .OrderBy(c => c.ThuTu)
            .Select(c => new ChuongHoc
            {
                Id = c.Id, TieuDe = c.TieuDe, MoTa = c.MoTa, ThuTu = c.ThuTu, KhoaHocId = c.KhoaHocId,
                CacBaiHoc = c.CacBaiHoc.OrderBy(b => b.ThuTu).ToList()
            }).ToList();
        var sections = chuongHienThi.Select(c => new ChuongDto(
            c.Id,
            c.TieuDe,
            c.ThuTu,
            c.CacBaiHoc.OrderBy(b => b.ThuTu).Select(b =>
            {
                var biKhoa = !coQuyenHoc && !b.ChoXemTruoc;
                return new BaiGiangDto(
                    b.Id, b.TieuDe, b.ThuTu, b.DaXuatBan, b.ChoXemTruoc, b.ThoiLuongGiay,
                    biKhoa ? null : b.NoiDung,
                    biKhoa ? null : b.VideoUrl,
                    biKhoa ? null : b.IllustrationUrl,
                    b.BaiKiemTra == null ? null : new { b.BaiKiemTra.Id, b.BaiKiemTra.TieuDe, b.BaiKiemTra.DiemDat },
                    biKhoa,
                    baiHoanThanh.Contains(b.Id));
            })));
        var baiGiang = chuongHienThi.SelectMany(c => c.CacBaiHoc.Select(b =>
        {
            var biKhoa = !coQuyenHoc && !b.ChoXemTruoc;
            return new ChiTietBaiDto(
                b.Id, b.TieuDe,
                biKhoa ? null : b.NoiDung,
                biKhoa ? null : b.VideoUrl,
                biKhoa ? null : b.IllustrationUrl,
                b.ThoiLuongGiay, b.ThuTu, b.DaXuatBan, b.ChoXemTruoc,
                c.Id, c.TieuDe,
                b.BaiKiemTra == null ? null : new { b.BaiKiemTra.Id, b.BaiKiemTra.TieuDe, b.BaiKiemTra.DiemDat });
        }));

        return new(kh.Id, kh.TieuDe, kh.DuongDanThanThien, kh.MoTaNgan, kh.MoTa, kh.MoTaChiTiet, kh.AnhDaiDien,
            kh.Gia, kh.DiemDanhGiaTrungBinh, kh.SoLuongDanhGia, kh.HangThanhVienToiThieu,
            tongThoiLuong, kh.DaXuatBan,
            kh.DanhMuc?.Ten ?? kh.ChuyenMuc, kh.TrinhDo, studentCount, purchaseCount, new { enrollments = studentCount, purchases = purchaseCount, reviews = kh.SoLuongDanhGia },
            kh.GiangVien?.Ten ?? "Giảng viên",
            kh.GiangVien == null ? null : new { kh.GiangVien.Id, kh.GiangVien.Ten, kh.GiangVien.AnhDaiDien, kh.GiangVien.TieuSu },
            sections, baiGiang,
            ghiDanh is not null, ghiDanh?.TienDo ?? 0, baiHoanThanh, danhGiaCuaToi,
            kh.CacDanhGia.Select(DanhGiaDto.TuDanhGia),
            chuongHienThi.SelectMany(c => c.CacBaiHoc).Any(b => b.ChoXemTruoc),
            ghiDanh is not null && !laChuSoHuu, !coQuyenHoc, kh.StartDate, kh.EndDate);
    }
}

/// <summary>Khóa học cho trang admin</summary>
public record KhoaHocAdminDto(
    string Id,
    string Title,
    string Slug,
    int Price,
    double AverageRating,
    int ReviewCount,
    bool IsPublished,
    string Status,
    string? Category,
    string? Description,
    string? ShortDescription,
    string? Thumbnail,
    string? RejectReason,
    object? Instructor,
    object _count,
    IEnumerable<object> Lessons)
{
    public static KhoaHocAdminDto TuKhoaHoc(KhoaHoc kh) =>
        new(kh.Id, kh.TieuDe, kh.DuongDanThanThien, kh.Gia, kh.DiemDanhGiaTrungBinh, kh.SoLuongDanhGia, kh.DaXuatBan, kh.DaXuatBan ? "PUBLIC" : (kh.TrangThai ?? "DRAFT"),
            kh.DanhMuc?.Ten ?? kh.ChuyenMuc,
            kh.MoTaChiTiet ?? kh.MoTa ?? kh.MoTaNgan,
            kh.MoTaNgan,
            kh.AnhDaiDien,
            kh.LyDoTuChoi,
            kh.GiangVien == null ? null : new { id = kh.GiangVien.Id, name = kh.GiangVien.Ten, email = kh.GiangVien.Email },
            new { lessons = kh.CacBaiHoc.Count, enrollments = kh.CacGhiDanh.Count, reviews = kh.CacDanhGia.Count },
            kh.CacBaiHoc
                .OrderBy(bai => bai.ThuTu)
                .Select(bai => new { id = bai.Id, title = bai.TieuDe, position = bai.ThuTu, status = bai.TrangThai, isPublished = bai.DaXuatBan, durationSeconds = bai.ThoiLuongGiay }));
}

// ═══════════════════════════════════════════════════════════════
// CHƯƠNG & BÀI GIẢNG
// ═══════════════════════════════════════════════════════════════

/// <summary>Thông tin chương (section)</summary>
public record ChuongDto(string Id, string Title, int Position, IEnumerable<BaiGiangDto> Lessons)
{
    public static ChuongDto TuChuong(ChuongHoc chuong) =>
        new(chuong.Id, chuong.TieuDe, chuong.ThuTu, chuong.CacBaiHoc.OrderBy(b => b.ThuTu).Select(BaiGiangDto.TuBaiGiang));
}

/// <summary>Thông tin bài giảng (lesson)</summary>
public record BaiGiangDto(string Id, string Title, int Position, bool IsPublished, bool IsPreview, int? DurationSeconds, string? Content = null, string? VideoUrl = null, string? IllustrationUrl = null, object? Quiz = null, bool IsLocked = false, bool IsCompleted = false)
{
    public static BaiGiangDto TuBaiGiang(BaiHoc bai) =>
        new(bai.Id, bai.TieuDe, bai.ThuTu, bai.DaXuatBan, bai.ChoXemTruoc, bai.ThoiLuongGiay, bai.NoiDung, bai.VideoUrl, bai.IllustrationUrl,
            bai.BaiKiemTra == null ? null : new { bai.BaiKiemTra.Id, bai.BaiKiemTra.TieuDe, bai.BaiKiemTra.DiemDat });
}

/// <summary>Chi tiết bài giảng (bao gồm tên chương)</summary>
public record ChiTietBaiDto(string Id, string Title, string? Content, string? VideoUrl, string? IllustrationUrl, int? DurationSeconds, int Position, bool IsPublished, bool IsPreview, string SectionId, string SectionTitle, object? Quiz)
{
    public static ChiTietBaiDto TuBaiGiang(BaiHoc bai, ChuongHoc chuong) =>
        new(bai.Id, bai.TieuDe, bai.NoiDung, bai.VideoUrl, bai.IllustrationUrl, bai.ThoiLuongGiay, bai.ThuTu, bai.DaXuatBan, bai.ChoXemTruoc,
            chuong.Id, chuong.TieuDe, bai.BaiKiemTra == null ? null : new { bai.BaiKiemTra.Id, bai.BaiKiemTra.TieuDe, bai.BaiKiemTra.DiemDat });
}

// ═══════════════════════════════════════════════════════════════
// ĐÁNH GIÁ & BÌNH LUẬN
// ═══════════════════════════════════════════════════════════════

/// <summary>Đánh giá khóa học</summary>
public record DanhGiaDto(string Id, int Rating, string? Comment, DateTime CreatedAt, object? User)
{
    public static DanhGiaDto TuDanhGia(DanhGiaKhoaHoc dg) =>
        new(dg.Id, dg.DiemDanhGia, dg.BinhLuan, dg.NgayTao, dg.NguoiDung == null ? null : new { dg.NguoiDung.Id, dg.NguoiDung.Ten });
}

/// <summary>Bình luận bài giảng</summary>
public record BinhLuanDto(string Id, string Content, DateTime CreatedAt, object? User, IEnumerable<BinhLuanDto> Replies)
{
    public static BinhLuanDto TuBinhLuan(BinhLuan bl) =>
        new(bl.Id, bl.NoiDung, bl.NgayTao,
            bl.NguoiDung == null ? null : new { bl.NguoiDung.Id, bl.NguoiDung.Ten, bl.NguoiDung.VaiTro },
            bl.CacPhanHoi.OrderBy(r => r.NgayTao).Select(TuBinhLuan));
}

// ═══════════════════════════════════════════════════════════════
// BÀI KIỂM TRA (QUIZ)
// ═══════════════════════════════════════════════════════════════

/// <summary>Bài kiểm tra</summary>
public record BaiKiemTraDto(string Id, string Title, string? Description, int PassingScore, string LessonId, IEnumerable<CauHoiDto> Questions, IEnumerable<BaiNopDto> Submissions)
{
    public static BaiKiemTraDto TuQuiz(BaiKiemTra qt, IEnumerable<BaiNopKiemTra> baiNop, bool hienDapAn) =>
        new(qt.Id, qt.TieuDe, qt.MoTa, qt.DiemDat, qt.BaiHocId,
            qt.CacCauHoi.OrderBy(c => c.ThuTu).Select(c => CauHoiDto.TuCauHoi(c, hienDapAn)),
            baiNop.Select(BaiNopDto.TuBaiNop));
}

/// <summary>Câu hỏi trong bài kiểm tra</summary>
public record CauHoiDto(string Id, string QuestionText, IEnumerable<string> Options, int? CorrectOptionIndex, string? Explanation, int Position)
{
    public static CauHoiDto TuCauHoi(CauHoiKiemTra ch, bool hienDapAn) =>
        new(ch.Id, ch.NoiDungCauHoi, PhanTichLuaChon(ch.CacLuaChon),
            hienDapAn ? ch.DapAnDungIndex : null, hienDapAn ? ch.GiaiThich : null, ch.ThuTu);

    private static List<string> PhanTichLuaChon(string json)
    {
        try { return JsonSerializer.Deserialize<List<string>>(json) ?? []; }
        catch (JsonException) { return []; }
    }
}

/// <summary>Bài nộp (submission)</summary>
public record BaiNopDto(string Id, double Score, bool Passed, JsonElement? Answers, DateTime CreatedAt)
{
    public static BaiNopDto TuBaiNop(BaiNopKiemTra bn)
    {
        JsonElement? cauTraLoi = null;
        try { cauTraLoi = JsonSerializer.Deserialize<JsonElement>(bn.DapAn); }
        catch (JsonException) { /* bỏ qua */ }
        return new(bn.Id, bn.Diem, bn.Dat, cauTraLoi, bn.NgayTao);
    }
}

// ═══════════════════════════════════════════════════════════════
// THANH TOÁN & QUẢN TRỊ
// ═══════════════════════════════════════════════════════════════

/// <summary>Mã giảm giá</summary>
public record MaGiamGiaDto(
    string Id, string Code, string DiscountType, int DiscountValue,
    int MinPurchaseAmount, int? MaxDiscountAmount,
    DateTime? StartDate, DateTime? EndDate, bool IsActive,
    int? UsageLimit, int UsageCount, string? CourseId, object? Course,
    DateTime CreatedAt, DateTime UpdatedAt,
    string? TeacherId, string Status, bool IsPrivate, int RecipientCount, int UsedCount)
{
    public static MaGiamGiaDto TuCoupon(MaGiamGia c) =>
        new(c.Id, c.Ma, c.DiscountType, c.DiscountValue, c.MinPurchaseAmount, c.MaxDiscountAmount,
            c.StartDate, c.EndDate, c.HoatDong, c.UsageLimit, c.UsageCount, c.KhoaHocId,
            c.KhoaHoc == null ? null : new { c.KhoaHoc.Id, c.KhoaHoc.TieuDe, c.KhoaHoc.DuongDanThanThien },
            c.NgayTao, c.NgayCapNhat, c.GiangVienId, TinhTrangThai(c), c.IsPrivate, c.CacNguoiNhan.Count, c.UsageCount);

    private static string TinhTrangThai(MaGiamGia c)
    {
        if (!c.HoatDong || string.Equals(c.TrangThai, "INACTIVE", StringComparison.OrdinalIgnoreCase)) return "INACTIVE";
        if (c.EndDate is not null && DateTime.UtcNow > c.EndDate.Value) return "EXPIRED";
        return "ACTIVE";
    }
}

/// <summary>Giao dịch ví</summary>
public record GiaoDichDto(string Id, string Type, int Amount, int BalanceAfter, string? Note, string Status, DateTime CreatedAt, object? User, object? Course, object? Purchase, object? ExternalPayment)
{
    public static GiaoDichDto TuGiaoDich(GiaoDichVi gd) =>
        new(gd.Id, gd.LoaiGiaoDich, gd.SoTien, gd.SoDuSauGiaoDich, gd.NoiDung, gd.TrangThai ?? "COMPLETED", gd.NgayTao,
            gd.NguoiDung == null ? null : new { gd.NguoiDung.Id, gd.NguoiDung.Ten, gd.NguoiDung.Email },
            gd.KhoaHoc == null ? null : new { gd.KhoaHoc.Id, gd.KhoaHoc.TieuDe },
            gd.DonMua == null ? null : new { gd.DonMua.Id, gd.DonMua.SoTienCuoi, gd.DonMua.TrangThai },
            gd.ThanhToan == null ? null : new { gd.ThanhToan.Id, gd.ThanhToan.NhaCungCap, gd.ThanhToan.TrangThai, gd.ThanhToan.SoTien, gd.ThanhToan.NgayTao });
}

/// <summary>Nhật ký kiểm toán</summary>
public record NhatKyDto(string Id, string? ActorId, string? ActorEmail, string Action, string EntityType, string? EntityId, JsonElement? Metadata, string? IpAddress, string? UserAgent, DateTime CreatedAt)
{
    public static NhatKyDto TuNhatKy(NhatKyHeThong nk)
    {
        JsonElement? metadata = null;
        if (!string.IsNullOrWhiteSpace(nk.Metadata))
        {
            try { metadata = JsonSerializer.Deserialize<JsonElement>(nk.Metadata); }
            catch (JsonException) { /* bỏ qua */ }
        }
        return new(nk.Id, nk.NguoiThucHienId, nk.EmailNguoiThucHien, nk.HanhDong, nk.LoaiThucTe, nk.ThucTheId, metadata, nk.IpAddress, nk.UserAgent, nk.NgayTao);
    }
}

// ═══════════════════════════════════════════════════════════════
// DTO DÙNG CHUNG
// ═══════════════════════════════════════════════════════════════

/// <summary>Thành tựu học tập</summary>
public record ThanhTuuDto(string Id, string Type, string Title, string Description, DateTime Date, int? Score);

/// <summary>Bucket thống kê theo ngày (dùng trong báo cáo)</summary>
public record ThongKeNgay(DateTime Date, string Key, string Label, int Minutes, int CompletedLessons)
{
    public int Minutes { get; set; } = Minutes;
    public int CompletedLessons { get; set; } = CompletedLessons;
}
