namespace LMS.Api.Security;

public static class Cuid
{
    public static string New() => $"c{Guid.NewGuid():N}";
}
