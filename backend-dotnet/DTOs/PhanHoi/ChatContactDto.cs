namespace LMS.Api.DTOs.PhanHoi;

public class ChatContactDto
{
    public string Id { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string? Avatar { get; set; }
    public string Role { get; set; } = string.Empty;
    public string CourseId { get; set; } = string.Empty;
    public string CourseTitle { get; set; } = string.Empty;
    public string ClassId { get; set; } = string.Empty;
    public string? SubjectId { get; set; }
}
