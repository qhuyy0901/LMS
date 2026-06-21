namespace LMS.Api.Domain.Entities;

/// <summary>Khóa học đã lưu / giỏ hàng của người dùng</summary>
public class KhoaHocDaLuu
{
    public string Id { get; set; } = string.Empty;
    public string NguoiDungId { get; set; } = string.Empty;
    public string KhoaHocId { get; set; } = string.Empty;
    public DateTime NgayTao { get; set; }

    public NguoiDung? NguoiDung { get; set; }
    public KhoaHoc? KhoaHoc { get; set; }
}
