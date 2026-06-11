using System.ComponentModel.DataAnnotations.Schema;

namespace LMS.Api.Models;

public class GiaoDichVi
{
    public const string NapTien = "NAP_TIEN";
    public const string MuaKhoaHoc = "MUA_KHOA_HOC";
    public const string HoanTien = "HOAN_TIEN";

    public string Id { get; set; } = string.Empty;
    public string Type { get; set; } = string.Empty;
    public int Amount { get; set; }
    public int BalanceAfter { get; set; }
    public string? Note { get; set; }
    public string Status { get; set; } = "COMPLETED";
    public string? Metadata { get; set; }
    public string UserId { get; set; } = string.Empty;
    public NguoiDung? User { get; set; }
    public string? CourseId { get; set; }
    public KhoaHoc? Course { get; set; }
    public string? PurchaseId { get; set; }
    public GiaoDichMua? Purchase { get; set; }
    public string? ExternalPaymentId { get; set; }
    public ThanhToanNgoai? ExternalPayment { get; set; }
    public DateTime CreatedAt { get; set; }

    [NotMapped]
    public string NguoiDungId
    {
        get => UserId;
        set => UserId = value;
    }

    [NotMapped]
    public int SoTien
    {
        get => Amount;
        set => Amount = value;
    }

    [NotMapped]
    public string LoaiGiaoDich
    {
        get => Type;
        set => Type = value;
    }

    [NotMapped]
    public string? NoiDung
    {
        get => Note;
        set => Note = value;
    }

    [NotMapped]
    public string TrangThai
    {
        get => Status;
        set => Status = value;
    }

    [NotMapped]
    public DateTime NgayTao
    {
        get => CreatedAt;
        set => CreatedAt = value;
    }
}
