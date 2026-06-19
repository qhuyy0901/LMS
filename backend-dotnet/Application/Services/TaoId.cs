namespace LMS.Api.Application.Services;

/// <summary>
/// Tạo ID duy nhất cho các bản ghi trong database.
/// Thay thế cho Cuid cũ, dùng GUID có prefix "c".
/// </summary>
public static class TaoId
{
    /// <summary>Tạo một ID mới duy nhất (ví dụ: "c1a2b3c4d5...")</summary>
    public static string Moi() => $"c{Guid.NewGuid():N}";
}
