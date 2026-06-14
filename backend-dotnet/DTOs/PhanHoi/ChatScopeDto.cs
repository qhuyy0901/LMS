namespace LMS.Api.DTOs.PhanHoi;

public class ChatScopeDto
{
    public string CourseId { get; set; } = string.Empty;
    public string CourseTitle { get; set; } = string.Empty;
    public string ClassId { get; set; } = string.Empty;
    public string? SubjectId { get; set; }
}
