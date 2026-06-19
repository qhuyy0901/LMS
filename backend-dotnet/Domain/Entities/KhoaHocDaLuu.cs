namespace LMS.Api.Domain.Entities;

/// <summary>Khóa học đã lưu / giỏ hàng của người dùng</summary>
public class KhoaHocDaLuu
{
    public string Id { get; set; } = string.Empty;
    public string UserId { get; set; } = string.Empty;
    public string CourseId { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }

    public NguoiDung? User { get; set; }
    public KhoaHoc? Course { get; set; }
}
