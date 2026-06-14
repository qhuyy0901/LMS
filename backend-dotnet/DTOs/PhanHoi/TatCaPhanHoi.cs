using System.Text.Json;
using LMS.Api.Models;
using LMS.Api.Services;

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
        if (!string.IsNullOrWhiteSpace(user.Settings))
        {
            try { settings = JsonSerializer.Deserialize<JsonElement>(user.Settings); }
            catch (JsonException) { /* bỏ qua lỗi parse */ }
        }

        var hang = TroGiup.TinhHangThanhVien(user.WalletBalance);
        return new(user.Id, user.Email, user.Name, user.Role, user.Avatar, user.Phone, user.Bio,
            settings, user.WalletBalance, user.TotalSpent, hang.Hang, hang.NhanHieu, hang.HanMucToiThieu,
            user.RewardPoints, user.LoginStreak, user.LastRewardLoginDate);
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
        new(user.Id, user.Email, user.Name, user.Role, user.Avatar, user.Phone,
            user.WalletBalance, user.TotalSpent, user.MemberTier,
            user.CreatedAt, user.UpdatedAt,
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
        var tongTuBaiHoc = khoaHoc.Lessons.Sum(bai => bai.DurationSeconds ?? 0);
        return khoaHoc.TotalDurationSeconds > 0 ? khoaHoc.TotalDurationSeconds : tongTuBaiHoc;
    }

    public static KhoaHocDto TuKhoaHoc(KhoaHoc khoaHoc) =>
        new(khoaHoc.Id, khoaHoc.Title, khoaHoc.Slug, khoaHoc.Description, khoaHoc.Thumbnail,
            khoaHoc.Price, khoaHoc.AverageRating, khoaHoc.ReviewCount, khoaHoc.MinimumMemberTier,
            TinhTongThoiLuong(khoaHoc), khoaHoc.IsPublished,
            khoaHoc.Category, khoaHoc.Level, khoaHoc.Instructor?.Name ?? "Giảng viên",
            khoaHoc.Sections.Count, khoaHoc.Lessons.Count, khoaHoc.Enrollments.Count,
            khoaHoc.Lessons.Any(bai => bai.IsPreview), khoaHoc.StartDate, khoaHoc.EndDate);
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
        var tongThoiLuong = kh.TotalDurationSeconds > 0
            ? kh.TotalDurationSeconds
            : kh.Sections.SelectMany(c => c.Lessons).Sum(b => b.DurationSeconds ?? 0);
        var chuongHienThi = kh.Sections
            .OrderBy(c => c.Position)
            .Select(c => new ChuongHoc
            {
                Id = c.Id, Title = c.Title, Description = c.Description, Position = c.Position, CourseId = c.CourseId,
                Lessons = c.Lessons.OrderBy(b => b.Position).ToList()
            }).ToList();
        var sections = chuongHienThi.Select(c => new ChuongDto(
            c.Id,
            c.Title,
            c.Position,
            c.Lessons.OrderBy(b => b.Position).Select(b =>
            {
                var biKhoa = !coQuyenHoc && !b.IsPreview;
                return new BaiGiangDto(
                    b.Id, b.Title, b.Position, b.IsPublished, b.IsPreview, b.DurationSeconds,
                    biKhoa ? null : b.Content,
                    biKhoa ? null : b.VideoUrl,
                    biKhoa ? null : b.IllustrationUrl,
                    b.Quiz == null ? null : new { b.Quiz.Id, b.Quiz.Title, b.Quiz.PassingScore },
                    biKhoa,
                    baiHoanThanh.Contains(b.Id));
            })));
        var baiGiang = chuongHienThi.SelectMany(c => c.Lessons.Select(b =>
        {
            var biKhoa = !coQuyenHoc && !b.IsPreview;
            return new ChiTietBaiDto(
                b.Id, b.Title,
                biKhoa ? null : b.Content,
                biKhoa ? null : b.VideoUrl,
                biKhoa ? null : b.IllustrationUrl,
                b.DurationSeconds, b.Position, b.IsPublished, b.IsPreview,
                c.Id, c.Title,
                b.Quiz == null ? null : new { b.Quiz.Id, b.Quiz.Title, b.Quiz.PassingScore });
        }));

        return new(kh.Id, kh.Title, kh.Slug, kh.ShortDescription, kh.Description, kh.DetailedDescription, kh.Thumbnail,
            kh.Price, kh.AverageRating, kh.ReviewCount, kh.MinimumMemberTier,
            tongThoiLuong, kh.IsPublished,
            kh.Category, kh.Level, studentCount, purchaseCount, new { enrollments = studentCount, purchases = purchaseCount, reviews = kh.ReviewCount },
            kh.Instructor?.Name ?? "Giảng viên",
            kh.Instructor == null ? null : new { kh.Instructor.Id, kh.Instructor.Name, kh.Instructor.Avatar, kh.Instructor.Bio },
            sections, baiGiang,
            ghiDanh is not null, ghiDanh?.Progress ?? 0, baiHoanThanh, danhGiaCuaToi,
            kh.Reviews.Select(DanhGiaDto.TuDanhGia),
            chuongHienThi.SelectMany(c => c.Lessons).Any(b => b.IsPreview),
            ghiDanh is not null && !laChuSoHuu, !coQuyenHoc, kh.StartDate, kh.EndDate);
    }
}

/// <summary>Khóa học cho trang admin</summary>
public record KhoaHocAdminDto(string Id, string Title, string Slug, int Price, double AverageRating, int ReviewCount, bool IsPublished, object? Instructor, object _count)
{
    public static KhoaHocAdminDto TuKhoaHoc(KhoaHoc kh) =>
        new(kh.Id, kh.Title, kh.Slug, kh.Price, kh.AverageRating, kh.ReviewCount, kh.IsPublished,
            kh.Instructor == null ? null : new { kh.Instructor.Id, kh.Instructor.Name, kh.Instructor.Email },
            new { lessons = kh.Lessons.Count, enrollments = kh.Enrollments.Count, reviews = kh.Reviews.Count });
}

// ═══════════════════════════════════════════════════════════════
// CHƯƠNG & BÀI GIẢNG
// ═══════════════════════════════════════════════════════════════

/// <summary>Thông tin chương (section)</summary>
public record ChuongDto(string Id, string Title, int Position, IEnumerable<BaiGiangDto> Lessons)
{
    public static ChuongDto TuChuong(ChuongHoc chuong) =>
        new(chuong.Id, chuong.Title, chuong.Position, chuong.Lessons.OrderBy(b => b.Position).Select(BaiGiangDto.TuBaiGiang));
}

/// <summary>Thông tin bài giảng (lesson)</summary>
public record BaiGiangDto(string Id, string Title, int Position, bool IsPublished, bool IsPreview, int? DurationSeconds, string? Content = null, string? VideoUrl = null, string? IllustrationUrl = null, object? Quiz = null, bool IsLocked = false, bool IsCompleted = false)
{
    public static BaiGiangDto TuBaiGiang(BaiHoc bai) =>
        new(bai.Id, bai.Title, bai.Position, bai.IsPublished, bai.IsPreview, bai.DurationSeconds, bai.Content, bai.VideoUrl, bai.IllustrationUrl,
            bai.Quiz == null ? null : new { bai.Quiz.Id, bai.Quiz.Title, bai.Quiz.PassingScore });
}

/// <summary>Chi tiết bài giảng (bao gồm tên chương)</summary>
public record ChiTietBaiDto(string Id, string Title, string? Content, string? VideoUrl, string? IllustrationUrl, int? DurationSeconds, int Position, bool IsPublished, bool IsPreview, string SectionId, string SectionTitle, object? Quiz)
{
    public static ChiTietBaiDto TuBaiGiang(BaiHoc bai, ChuongHoc chuong) =>
        new(bai.Id, bai.Title, bai.Content, bai.VideoUrl, bai.IllustrationUrl, bai.DurationSeconds, bai.Position, bai.IsPublished, bai.IsPreview,
            chuong.Id, chuong.Title, bai.Quiz == null ? null : new { bai.Quiz.Id, bai.Quiz.Title, bai.Quiz.PassingScore });
}

// ═══════════════════════════════════════════════════════════════
// ĐÁNH GIÁ & BÌNH LUẬN
// ═══════════════════════════════════════════════════════════════

/// <summary>Đánh giá khóa học</summary>
public record DanhGiaDto(string Id, int Rating, string? Comment, DateTime CreatedAt, object? User)
{
    public static DanhGiaDto TuDanhGia(DanhGiaKhoaHoc dg) =>
        new(dg.Id, dg.Rating, dg.Comment, dg.CreatedAt, dg.User == null ? null : new { dg.User.Id, dg.User.Name });
}

/// <summary>Bình luận bài giảng</summary>
public record BinhLuanDto(string Id, string Content, DateTime CreatedAt, object? User, IEnumerable<BinhLuanDto> Replies)
{
    public static BinhLuanDto TuBinhLuan(BinhLuan bl) =>
        new(bl.Id, bl.Content, bl.CreatedAt,
            bl.User == null ? null : new { bl.User.Id, bl.User.Name, bl.User.Role },
            bl.Replies.OrderBy(r => r.CreatedAt).Select(TuBinhLuan));
}

// ═══════════════════════════════════════════════════════════════
// BÀI KIỂM TRA (QUIZ)
// ═══════════════════════════════════════════════════════════════

/// <summary>Bài kiểm tra</summary>
public record BaiKiemTraDto(string Id, string Title, string? Description, int PassingScore, string LessonId, IEnumerable<CauHoiDto> Questions, IEnumerable<BaiNopDto> Submissions)
{
    public static BaiKiemTraDto TuQuiz(BaiKiemTra qt, IEnumerable<NopBaiKiemTra> baiNop, bool hienDapAn) =>
        new(qt.Id, qt.Title, qt.Description, qt.PassingScore, qt.LessonId,
            qt.Questions.OrderBy(c => c.Position).Select(c => CauHoiDto.TuCauHoi(c, hienDapAn)),
            baiNop.Select(BaiNopDto.TuBaiNop));
}

/// <summary>Câu hỏi trong bài kiểm tra</summary>
public record CauHoiDto(string Id, string QuestionText, IEnumerable<string> Options, int? CorrectOptionIndex, string? Explanation, int Position)
{
    public static CauHoiDto TuCauHoi(CauHoiKiemTra ch, bool hienDapAn) =>
        new(ch.Id, ch.QuestionText, PhanTichLuaChon(ch.Options),
            hienDapAn ? ch.CorrectOptionIndex : null, hienDapAn ? ch.Explanation : null, ch.Position);

    private static List<string> PhanTichLuaChon(string json)
    {
        try { return JsonSerializer.Deserialize<List<string>>(json) ?? []; }
        catch (JsonException) { return []; }
    }
}

/// <summary>Bài nộp (submission)</summary>
public record BaiNopDto(string Id, double Score, bool Passed, JsonElement? Answers, DateTime CreatedAt)
{
    public static BaiNopDto TuBaiNop(NopBaiKiemTra bn)
    {
        JsonElement? cauTraLoi = null;
        try { cauTraLoi = JsonSerializer.Deserialize<JsonElement>(bn.Answers); }
        catch (JsonException) { /* bỏ qua */ }
        return new(bn.Id, bn.Score, bn.Passed, cauTraLoi, bn.CreatedAt);
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
        new(c.Id, c.Code, c.DiscountType, c.DiscountValue, c.MinPurchaseAmount, c.MaxDiscountAmount,
            c.StartDate, c.EndDate, c.IsActive, c.UsageLimit, c.UsageCount, c.CourseId,
            c.Course == null ? null : new { c.Course.Id, c.Course.Title, c.Course.Slug },
            c.CreatedAt, c.UpdatedAt, c.TeacherId, TinhTrangThai(c), c.IsPrivate, c.Recipients.Count, c.UsageCount);

    private static string TinhTrangThai(MaGiamGia c)
    {
        if (!c.IsActive || string.Equals(c.Status, "INACTIVE", StringComparison.OrdinalIgnoreCase)) return "INACTIVE";
        if (c.EndDate is not null && DateTime.UtcNow > c.EndDate.Value) return "EXPIRED";
        return "ACTIVE";
    }
}

/// <summary>Giao dịch ví</summary>
public record GiaoDichDto(string Id, string Type, int Amount, int BalanceAfter, string? Note, DateTime CreatedAt, object? User, object? Course, object? Purchase, object? ExternalPayment)
{
    public static GiaoDichDto TuGiaoDich(GiaoDichVi gd) =>
        new(gd.Id, gd.Type, gd.Amount, gd.BalanceAfter, gd.Note, gd.CreatedAt,
            gd.User == null ? null : new { gd.User.Id, gd.User.Name, gd.User.Email },
            gd.Course == null ? null : new { gd.Course.Id, gd.Course.Title },
            gd.Purchase == null ? null : new { gd.Purchase.Id, gd.Purchase.FinalAmount, gd.Purchase.Status },
            gd.ExternalPayment == null ? null : new { gd.ExternalPayment.Id, gd.ExternalPayment.Provider, gd.ExternalPayment.Status, gd.ExternalPayment.Amount, gd.ExternalPayment.CreatedAt });
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
        return new(nk.Id, nk.ActorId, nk.ActorEmail, nk.Action, nk.EntityType, nk.EntityId, metadata, nk.IpAddress, nk.UserAgent, nk.CreatedAt);
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
