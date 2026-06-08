using System.Globalization;
using System.Security.Claims;
using System.Text.Json;
using LMS.Api.Data;
using LMS.Api.Models;
using LMS.Api.Services;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace LMS.Api.Controllers;

public class SinhVienController(LmsDbContext db, IConfiguration cauHinh) : Controller
{
    private const string TrangThaiDangXuLy = "PENDING";
    private const string TrangThaiThanhCong = "COMPLETED";
    private static readonly int[] MenhGiaNapNhanh = [100000, 200000, 500000, 1000000, 2000000];
    private static readonly HashSet<string> PhuongThucHopLe = ["BANK_TRANSFER", "QR"];
    private string FrontendUrl => cauHinh["FRONTEND_URL"] ?? "http://localhost:5173";

    [HttpGet("/student/wallet")]
    [HttpGet("/SinhVien/Vi")]
    public async Task<IActionResult> Vi()
    {
        var ketQuaKiemTra = KiemTraQuyenSinhVien();
        if (ketQuaKiemTra is not null) return ketQuaKiemTra;

        var userId = TroGiup.LayUserId(User)!;
        var viewModel = await TaoViewModelAsync(userId);
        return View(viewModel);
    }

    [HttpPost("/student/wallet/create")]
    [HttpPost("/SinhVien/NapVi")]
    [ValidateAntiForgeryToken]
    public async Task<IActionResult> TaoYeuCauNapVi(string? soTien, string? phuongThucNap)
    {
        var ketQuaKiemTra = KiemTraQuyenSinhVien();
        if (ketQuaKiemTra is not null) return ketQuaKiemTra;

        var userId = TroGiup.LayUserId(User)!;
        if (!ThuDocSoTien(soTien, out var soTienHopLe))
        {
            var viewModelLoi = await TaoViewModelAsync(userId);
            viewModelLoi.SoTienNap = soTien;
            viewModelLoi.PhuongThucNap = phuongThucNap;
            TempData["Error"] = "Số tiền không hợp lệ";
            return View("Vi", viewModelLoi);
        }

        if (string.IsNullOrWhiteSpace(phuongThucNap) || !PhuongThucHopLe.Contains(phuongThucNap))
        {
            var viewModelLoi = await TaoViewModelAsync(userId);
            viewModelLoi.SoTienNap = soTien;
            viewModelLoi.PhuongThucNap = phuongThucNap;
            TempData["Error"] = "Phải chọn phương thức nạp";
            return View("Vi", viewModelLoi);
        }

        var sinhVien = await db.Users.FirstOrDefaultAsync(u => u.Id == userId);
        if (sinhVien is null)
        {
            return NotFound("Không tìm thấy người dùng");
        }

        var now = DateTime.UtcNow;
        var giaoDichId = TaoId.Moi();
        var maGiaoDich = TaoMaGiaoDich(giaoDichId);
        var noiDungChuyenKhoan = TaoNoiDungChuyenKhoan(maGiaoDich, sinhVien.Name);

        db.WalletTransactions.Add(new GiaoDichVi
        {
            Id = giaoDichId,
            NguoiDungId = sinhVien.Id,
            LoaiGiaoDich = GiaoDichVi.NapTien,
            SoTien = soTienHopLe,
            BalanceAfter = sinhVien.SoDuVi,
            NoiDung = noiDungChuyenKhoan,
            TrangThai = TrangThaiDangXuLy,
            Metadata = JsonSerializer.Serialize(new
            {
                paymentMethod = phuongThucNap,
                bankName = "MB Bank",
                accountName = "LMS SKILLIO DEMO",
                accountNumber = "0901000000",
                transactionCode = maGiaoDich
            }),
            NgayTao = now
        });

        await db.SaveChangesAsync();
        TempData["Success"] = "Đã tạo yêu cầu nạp ví. Giao dịch đang xử lý.";

        return RedirectToAction(nameof(Vi));
    }

    [HttpPost("/student/wallet/confirm")]
    [ValidateAntiForgeryToken]
    public async Task<IActionResult> XacNhanThanhToanDemo(string id)
    {
        var ketQuaKiemTra = KiemTraQuyenSinhVien();
        if (ketQuaKiemTra is not null) return ketQuaKiemTra;

        var userId = TroGiup.LayUserId(User)!;
        var sinhVien = await db.Users.FirstOrDefaultAsync(u => u.Id == userId);
        if (sinhVien is null) return NotFound("Không tìm thấy người dùng");

        var giaoDich = await db.WalletTransactions
            .FirstOrDefaultAsync(g => g.Id == id && g.UserId == userId && g.Type == GiaoDichVi.NapTien);

        if (giaoDich is null)
        {
            TempData["Error"] = "Không tìm thấy giao dịch nạp ví";
            return RedirectToAction(nameof(Vi));
        }

        if (giaoDich.TrangThai != TrangThaiDangXuLy)
        {
            TempData["Error"] = "Giao dịch này không còn ở trạng thái đang xử lý";
            return RedirectToAction(nameof(Vi));
        }

        sinhVien.SoDuVi += giaoDich.SoTien;
        sinhVien.UpdatedAt = DateTime.UtcNow;
        giaoDich.BalanceAfter = sinhVien.SoDuVi;
        giaoDich.TrangThai = TrangThaiThanhCong;

        await db.SaveChangesAsync();
        TempData["Success"] = "Nạp ví thành công";

        return RedirectToAction(nameof(Vi));
    }

    private IActionResult? KiemTraQuyenSinhVien()
    {
        if (User.Identity?.IsAuthenticated != true)
        {
            return Redirect($"{FrontendUrl}/login");
        }

        var vaiTro = User.FindFirstValue(ClaimTypes.Role);
        if (vaiTro != "STUDENT")
        {
            return Content("Bạn không có quyền truy cập", "text/plain; charset=utf-8");
        }

        return null;
    }

    private async Task<ViSinhVienViewModel> TaoViewModelAsync(string userId)
    {
        var sinhVien = await db.Users.AsNoTracking().FirstOrDefaultAsync(u => u.Id == userId);
        var lichSu = await db.WalletTransactions.AsNoTracking()
            .Where(g => g.UserId == userId && g.Type == GiaoDichVi.NapTien)
            .OrderByDescending(g => g.CreatedAt)
            .Take(50)
            .ToListAsync();

        var lichSuViewModel = lichSu.Select(TaoGiaoDichViewModel).ToList();

        return new ViSinhVienViewModel
        {
            SoDuHienTai = sinhVien?.SoDuVi ?? 0,
            TenSinhVien = sinhVien?.Name ?? string.Empty,
            MenhGiaNapNhanh = MenhGiaNapNhanh,
            LichSuGiaoDich = lichSuViewModel,
            GiaoDichDangXuLy = lichSuViewModel.FirstOrDefault(g => g.TrangThai == TrangThaiDangXuLy)
        };
    }

    private static ViGiaoDichViewModel TaoGiaoDichViewModel(GiaoDichVi giaoDich)
    {
        var metadata = DocMetadata(giaoDich.Metadata);
        var maGiaoDich = metadata.TransactionCode ?? TaoMaGiaoDich(giaoDich.Id);

        return new ViGiaoDichViewModel
        {
            Id = giaoDich.Id,
            MaGiaoDich = maGiaoDich,
            NgayTao = giaoDich.NgayTao,
            PhuongThuc = metadata.PaymentMethod ?? "BANK_TRANSFER",
            NoiDung = giaoDich.NoiDung ?? TaoNoiDungChuyenKhoan(maGiaoDich, giaoDich.User?.Name ?? string.Empty),
            SoTien = giaoDich.SoTien,
            TrangThai = giaoDich.TrangThai,
            SoDuSauGiaoDich = giaoDich.BalanceAfter,
            NganHang = metadata.BankName ?? "MB Bank",
            ChuTaiKhoan = metadata.AccountName ?? "LMS SKILLIO DEMO",
            SoTaiKhoan = metadata.AccountNumber ?? "0901000000"
        };
    }

    private static WalletTransactionMetadata DocMetadata(string? metadata)
    {
        if (string.IsNullOrWhiteSpace(metadata)) return new WalletTransactionMetadata();

        try
        {
            return JsonSerializer.Deserialize<WalletTransactionMetadata>(
                metadata,
                new JsonSerializerOptions { PropertyNameCaseInsensitive = true }) ?? new WalletTransactionMetadata();
        }
        catch
        {
            return new WalletTransactionMetadata();
        }
    }

    private static bool ThuDocSoTien(string? giaTri, out int soTien)
    {
        soTien = 0;
        if (string.IsNullOrWhiteSpace(giaTri)) return false;

        var giaTriChuan = giaTri.Trim()
            .Replace(".", string.Empty)
            .Replace(",", string.Empty)
            .Replace(" ", string.Empty);

        if (!int.TryParse(giaTriChuan, NumberStyles.None, CultureInfo.InvariantCulture, out soTien))
        {
            return false;
        }

        return soTien >= 10000;
    }

    private static string TaoMaGiaoDich(string id)
    {
        var raw = id.Replace("c", string.Empty, StringComparison.OrdinalIgnoreCase);
        return raw.Length <= 8 ? raw.ToUpperInvariant() : raw[..8].ToUpperInvariant();
    }

    private static string TaoNoiDungChuyenKhoan(string maGiaoDich, string tenSinhVien)
    {
        return $"LMS {maGiaoDich} {tenSinhVien}".Trim();
    }

    public static string DinhDangTien(int soTien)
    {
        return string.Format(CultureInfo.GetCultureInfo("vi-VN"), "{0:N0} đ", soTien);
    }

    private sealed class WalletTransactionMetadata
    {
        public string? PaymentMethod { get; set; }
        public string? BankName { get; set; }
        public string? AccountName { get; set; }
        public string? AccountNumber { get; set; }
        public string? TransactionCode { get; set; }
    }
}
