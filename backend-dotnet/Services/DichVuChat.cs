using LMS.Api.Data;
using LMS.Api.DTOs.PhanHoi;
using LMS.Api.Models;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;

namespace LMS.Api.Services;

public interface IDichVuChat
{
    Task<List<ChatScopeDto>> LayPhamViAsync(string userId);
    Task<List<ChatContactDto>> LayNguoiCoTheNhanAsync(string userId, string? query, string? courseId, string? classId, string? subjectId, IReadOnlyCollection<string>? onlyUserIds = null);
    Task<KetQuaChat<Guid>> LayHoacTaoCuocTroChuyenAsync(string userId, string otherUserId, string? courseId, string? classId, string? subjectId);
    Task<KetQuaChat<TinNhanDaGui>> GuiTinNhanAsync(string userId, Guid conversationId, string? content, IReadOnlyList<IFormFile>? images = null);
    Task<bool> CoQuyenTruyCapCuocTroChuyenAsync(string userId, Guid conversationId);
    Task<bool> CoQuyenGuiTinNhanAsync(string userId, Guid conversationId);
    Task<KetQuaChat<AnhChat>> LayAnhAsync(string userId, Guid attachmentId);
    TinNhanDto TaoTinNhanDto(TinNhan message, NguoiDung? sender = null);
}

public sealed record KetQuaChat<T>(bool ThanhCong, T? GiaTri, string? Loi, int StatusCode)
{
    public static KetQuaChat<T> Ok(T value) => new(true, value, null, StatusCodes.Status200OK);
    public static KetQuaChat<T> BadRequest(string error) => new(false, default, error, StatusCodes.Status400BadRequest);
    public static KetQuaChat<T> Forbidden(string error) => new(false, default, error, StatusCodes.Status403Forbidden);
    public static KetQuaChat<T> NotFound(string error) => new(false, default, error, StatusCodes.Status404NotFound);
}

public sealed record TinNhanDaGui(TinNhanDto Message, List<string> ParticipantIds);
public sealed record AnhChat(string FullPath, string ContentType, string DownloadName);

internal sealed record PhamViChat(string CourseId, string CourseTitle, string ClassId, string? SubjectId);

public class DichVuChat(LmsDbContext db, IWebHostEnvironment env) : IDichVuChat
{
    private const int MaxImagesPerMessage = 5;
    private const long MaxImageSize = 5 * 1024 * 1024;
    private const int MaxContentLength = 4000;

    private static readonly HashSet<string> AllowedImageTypes = new(StringComparer.OrdinalIgnoreCase)
    {
        "image/jpeg",
        "image/jpg",
        "image/png",
        "image/webp"
    };

    private static readonly HashSet<string> AllowedImageExtensions = new(StringComparer.OrdinalIgnoreCase)
    {
        ".jpg",
        ".jpeg",
        ".png",
        ".webp"
    };

    public async Task<List<ChatScopeDto>> LayPhamViAsync(string userId)
    {
        var courses = await KhoaHocNguoiDungCoQuyen(userId)
            .OrderBy(course => course.Title)
            .Select(course => new ChatScopeDto
            {
                CourseId = course.Id,
                CourseTitle = course.Title,
                ClassId = course.Id,
                SubjectId = null
            })
            .ToListAsync();

        return courses;
    }

    public async Task<List<ChatContactDto>> LayNguoiCoTheNhanAsync(
        string userId,
        string? query,
        string? courseId,
        string? classId,
        string? subjectId,
        IReadOnlyCollection<string>? onlyUserIds = null)
    {
        var normalizedQuery = ChuanHoaTimKiem(query);
        var normalizedCourseId = ChuanHoaTuyChon(courseId);
        var normalizedClassId = ChuanHoaTuyChon(classId);
        var normalizedSubjectId = ChuanHoaTuyChon(subjectId);
        if (onlyUserIds is { Count: 0 }) return [];
        var onlineFilter = onlyUserIds is not null ? new HashSet<string>(onlyUserIds) : null;

        var courseQuery = KhoaHocNguoiDungCoQuyen(userId);
        if (normalizedCourseId is not null)
        {
            courseQuery = courseQuery.Where(course => course.Id == normalizedCourseId);
        }
        if (normalizedClassId is not null)
        {
            courseQuery = courseQuery.Where(course => course.Id == normalizedClassId);
        }

        var courses = await courseQuery
            .OrderBy(course => course.Title)
            .Select(course => new
            {
                course.Id,
                course.Title,
                Instructor = new
                {
                    Id = course.Instructor!.Id,
                    course.Instructor.Name,
                    course.Instructor.Email,
                    course.Instructor.Avatar,
                    course.Instructor.Role
                },
                Students = course.Enrollments.Select(enrollment => new
                {
                    Id = enrollment.User!.Id,
                    enrollment.User.Name,
                    enrollment.User.Email,
                    enrollment.User.Avatar,
                    enrollment.User.Role
                }).ToList()
            })
            .ToListAsync();

        var result = new List<ChatContactDto>();
        var seen = new HashSet<string>(StringComparer.OrdinalIgnoreCase);

        foreach (var course in courses)
        {
            AddContact(course.Instructor.Id, course.Instructor.Name, course.Instructor.Email, course.Instructor.Avatar, course.Instructor.Role, course.Id, course.Title);

            foreach (var student in course.Students)
            {
                AddContact(student.Id, student.Name, student.Email, student.Avatar, student.Role, course.Id, course.Title);
            }
        }

        return result
            .OrderBy(contact => contact.CourseTitle)
            .ThenBy(contact => LaGiangVien(contact.Role) ? 0 : 1)
            .ThenBy(contact => contact.Name)
            .ToList();

        void AddContact(string contactId, string name, string email, string? avatar, string role, string contactCourseId, string contactCourseTitle)
        {
            if (contactId == userId) return;
            if (onlineFilter is not null && !onlineFilter.Contains(contactId)) return;
            if (normalizedQuery is not null && !TimThay(normalizedQuery, name, email, contactCourseTitle)) return;

            var contactClassId = contactCourseId;
            var key = $"{contactId}|{contactCourseId}|{contactClassId}|{normalizedSubjectId}";
            if (!seen.Add(key)) return;

            result.Add(new ChatContactDto
            {
                Id = contactId,
                Name = name,
                Email = email,
                Avatar = avatar,
                Role = role,
                CourseId = contactCourseId,
                CourseTitle = contactCourseTitle,
                ClassId = contactClassId,
                SubjectId = normalizedSubjectId
            });
        }
    }

    public async Task<KetQuaChat<Guid>> LayHoacTaoCuocTroChuyenAsync(string userId, string otherUserId, string? courseId, string? classId, string? subjectId)
    {
        if (string.Equals(userId, otherUserId, StringComparison.Ordinal))
            return KetQuaChat<Guid>.BadRequest("Không thể tự nhắn tin cho chính mình.");

        var otherExists = await db.Users.AsNoTracking().AnyAsync(user => user.Id == otherUserId);
        if (!otherExists) return KetQuaChat<Guid>.NotFound("Không tìm thấy người dùng.");

        var scope = await TimPhamViHopLeAsync(userId, otherUserId, courseId, classId, subjectId);
        if (scope is null)
            return KetQuaChat<Guid>.Forbidden("Bạn chỉ có thể nhắn tin với giáo viên hoặc học viên trong cùng lớp/khóa học.");

        var existing = await db.Conversations
            .Where(conversation => !conversation.IsGroup)
            .Where(conversation =>
                conversation.CourseId == scope.CourseId &&
                conversation.ClassId == scope.ClassId &&
                conversation.SubjectId == scope.SubjectId &&
                conversation.Participants.Count == 2 &&
                conversation.Participants.Any(participant => participant.UserId == userId) &&
                conversation.Participants.Any(participant => participant.UserId == otherUserId))
            .OrderByDescending(conversation => conversation.UpdatedAt)
            .FirstOrDefaultAsync();

        if (existing is not null) return KetQuaChat<Guid>.Ok(existing.Id);

        var now = DateTime.UtcNow;
        var conversation = new CuocTroChuyen
        {
            Id = Guid.NewGuid(),
            IsGroup = false,
            Title = null,
            CourseId = scope.CourseId,
            ClassId = scope.ClassId,
            SubjectId = scope.SubjectId,
            CreatedAt = now,
            UpdatedAt = now,
            Participants =
            [
                new() { UserId = userId, JoinedAt = now },
                new() { UserId = otherUserId, JoinedAt = now }
            ]
        };

        db.Conversations.Add(conversation);
        await db.SaveChangesAsync();

        return KetQuaChat<Guid>.Ok(conversation.Id);
    }

    public async Task<KetQuaChat<TinNhanDaGui>> GuiTinNhanAsync(string userId, Guid conversationId, string? content, IReadOnlyList<IFormFile>? images = null)
    {
        var normalizedContent = (content ?? string.Empty).Trim();
        var imageList = images?.Where(file => file is { Length: > 0 }).ToList() ?? [];

        if (normalizedContent.Length == 0 && imageList.Count == 0)
            return KetQuaChat<TinNhanDaGui>.BadRequest("Vui lòng nhập nội dung hoặc chọn ảnh để gửi.");
        if (normalizedContent.Length > MaxContentLength)
            return KetQuaChat<TinNhanDaGui>.BadRequest($"Nội dung tin nhắn tối đa {MaxContentLength} ký tự.");
        if (imageList.Count > MaxImagesPerMessage)
            return KetQuaChat<TinNhanDaGui>.BadRequest($"Mỗi lần gửi tối đa {MaxImagesPerMessage} ảnh.");

        foreach (var image in imageList)
        {
            var error = KiemTraAnh(image);
            if (error is not null) return KetQuaChat<TinNhanDaGui>.BadRequest(error);
        }

        var validation = await LayCuocTroChuyenDuocGuiAsync(userId, conversationId);
        if (!validation.ThanhCong || validation.GiaTri is null)
            return KetQuaChat<TinNhanDaGui>.Forbidden(validation.Loi ?? "Bạn không có quyền gửi tin nhắn trong cuộc trò chuyện này.");

        var conversation = validation.GiaTri;
        var now = DateTime.UtcNow;
        var message = new TinNhan
        {
            Id = Guid.NewGuid(),
            ConversationId = conversation.Id,
            SenderId = userId,
            Content = normalizedContent,
            SentAt = now
        };

        db.Messages.Add(message);

        var savedFiles = new List<string>();
        try
        {
            foreach (var image in imageList)
            {
                var attachmentId = Guid.NewGuid();
                var extension = Path.GetExtension(image.FileName).ToLowerInvariant();
                var fileName = $"{attachmentId:N}{extension}";
                var fullPath = Path.Combine(ThuMucAnhChat, fileName);
                Directory.CreateDirectory(ThuMucAnhChat);

                await using (var stream = File.Create(fullPath))
                {
                    await image.CopyToAsync(stream);
                }
                savedFiles.Add(fullPath);

                message.Attachments.Add(new TinNhanDinhKem
                {
                    Id = attachmentId,
                    MessageId = message.Id,
                    FileName = fileName,
                    OriginalFileName = Path.GetFileName(image.FileName),
                    ContentType = image.ContentType,
                    Size = image.Length,
                    CreatedAt = now
                });
            }

            conversation.UpdatedAt = now;
            await db.SaveChangesAsync();
        }
        catch
        {
            foreach (var fullPath in savedFiles)
            {
                if (File.Exists(fullPath)) File.Delete(fullPath);
            }
            throw;
        }

        var sender = await db.Users.AsNoTracking().FirstOrDefaultAsync(user => user.Id == userId);
        var participantIds = conversation.Participants.Select(participant => participant.UserId).ToList();

        return KetQuaChat<TinNhanDaGui>.Ok(new TinNhanDaGui(TaoTinNhanDto(message, sender), participantIds));
    }

    public async Task<bool> CoQuyenTruyCapCuocTroChuyenAsync(string userId, Guid conversationId)
    {
        var conversation = await db.Conversations
            .AsNoTracking()
            .Include(item => item.Participants)
            .FirstOrDefaultAsync(item => item.Id == conversationId);

        if (conversation is null) return false;
        if (!conversation.Participants.Any(participant => participant.UserId == userId)) return false;
        if (string.IsNullOrWhiteSpace(conversation.CourseId)) return false;

        return await NguoiDungCoQuyenKhoaHocAsync(userId, conversation.CourseId);
    }

    public async Task<bool> CoQuyenGuiTinNhanAsync(string userId, Guid conversationId)
    {
        var result = await LayCuocTroChuyenDuocGuiAsync(userId, conversationId);
        return result.ThanhCong;
    }

    public async Task<KetQuaChat<AnhChat>> LayAnhAsync(string userId, Guid attachmentId)
    {
        var attachment = await db.MessageAttachments
            .Include(item => item.Message)
                .ThenInclude(message => message.Conversation)
                    .ThenInclude(conversation => conversation.Participants)
            .FirstOrDefaultAsync(item => item.Id == attachmentId);

        if (attachment is null) return KetQuaChat<AnhChat>.NotFound("Không tìm thấy ảnh.");

        var conversation = attachment.Message.Conversation;
        if (!conversation.Participants.Any(participant => participant.UserId == userId))
            return KetQuaChat<AnhChat>.Forbidden("Bạn không có quyền xem ảnh này.");
        if (string.IsNullOrWhiteSpace(conversation.CourseId) || !await NguoiDungCoQuyenKhoaHocAsync(userId, conversation.CourseId))
            return KetQuaChat<AnhChat>.Forbidden("Bạn không có quyền xem ảnh này.");

        var fullPath = Path.Combine(ThuMucAnhChat, attachment.FileName);
        if (!File.Exists(fullPath)) return KetQuaChat<AnhChat>.NotFound("Không tìm thấy file ảnh.");

        return KetQuaChat<AnhChat>.Ok(new AnhChat(fullPath, attachment.ContentType, attachment.OriginalFileName));
    }

    public TinNhanDto TaoTinNhanDto(TinNhan message, NguoiDung? sender = null)
    {
        return new TinNhanDto
        {
            Id = message.Id,
            ConversationId = message.ConversationId,
            SenderId = message.SenderId,
            SenderName = sender?.Name ?? message.Sender?.Name ?? "Unknown",
            SenderAvatar = sender?.Avatar ?? message.Sender?.Avatar,
            Content = message.Content,
            SentAt = message.SentAt,
            Attachments = message.Attachments
                .OrderBy(attachment => attachment.CreatedAt)
                .Select(attachment => new TinNhanAnhDto
                {
                    Id = attachment.Id,
                    FileName = attachment.OriginalFileName,
                    ContentType = attachment.ContentType,
                    Size = attachment.Size,
                    Url = $"/api/chat/images/{attachment.Id}"
                })
                .ToList()
        };
    }

    private IQueryable<KhoaHoc> KhoaHocNguoiDungCoQuyen(string userId)
    {
        return db.Courses.AsNoTracking()
            .Where(course => course.InstructorId == userId || course.Enrollments.Any(enrollment => enrollment.UserId == userId));
    }

    private async Task<bool> NguoiDungCoQuyenKhoaHocAsync(string userId, string courseId)
    {
        return await db.Courses.AsNoTracking()
            .AnyAsync(course => course.Id == courseId &&
                (course.InstructorId == userId || course.Enrollments.Any(enrollment => enrollment.UserId == userId)));
    }

    private async Task<PhamViChat?> TimPhamViHopLeAsync(string userId, string otherUserId, string? courseId, string? classId, string? subjectId)
    {
        var normalizedCourseId = ChuanHoaTuyChon(courseId);
        var normalizedClassId = ChuanHoaTuyChon(classId);
        var normalizedSubjectId = ChuanHoaTuyChon(subjectId);

        var query = db.Courses.AsNoTracking()
            .Where(course =>
                (course.InstructorId == userId || course.Enrollments.Any(enrollment => enrollment.UserId == userId)) &&
                (course.InstructorId == otherUserId || course.Enrollments.Any(enrollment => enrollment.UserId == otherUserId)));

        if (normalizedCourseId is not null)
        {
            query = query.Where(course => course.Id == normalizedCourseId);
        }

        if (normalizedClassId is not null)
        {
            query = query.Where(course => course.Id == normalizedClassId);
        }

        var course = await query.OrderBy(course => course.Title).FirstOrDefaultAsync();
        if (course is null) return null;

        return new PhamViChat(course.Id, course.Title, course.Id, normalizedSubjectId);
    }

    private async Task<KetQuaChat<CuocTroChuyen>> LayCuocTroChuyenDuocGuiAsync(string userId, Guid conversationId)
    {
        var conversation = await db.Conversations
            .Include(item => item.Participants)
            .FirstOrDefaultAsync(item => item.Id == conversationId);

        if (conversation is null) return KetQuaChat<CuocTroChuyen>.NotFound("Không tìm thấy cuộc trò chuyện.");
        if (!conversation.Participants.Any(participant => participant.UserId == userId))
            return KetQuaChat<CuocTroChuyen>.Forbidden("Bạn không thuộc cuộc trò chuyện này.");
        if (string.IsNullOrWhiteSpace(conversation.CourseId))
            return KetQuaChat<CuocTroChuyen>.Forbidden("Cuộc trò chuyện chưa gắn với lớp/khóa học hợp lệ.");

        var participantIds = conversation.Participants.Select(participant => participant.UserId).ToList();
        var eligibleCount = await db.Users.AsNoTracking()
            .Where(user => participantIds.Contains(user.Id))
            .CountAsync(user => user.Courses.Any(course => course.Id == conversation.CourseId) ||
                                user.Enrollments.Any(enrollment => enrollment.CourseId == conversation.CourseId));

        if (eligibleCount != participantIds.Count)
            return KetQuaChat<CuocTroChuyen>.Forbidden("Người gửi và người nhận không còn cùng lớp/khóa học.");

        return KetQuaChat<CuocTroChuyen>.Ok(conversation);
    }

    private string ThuMucAnhChat => Path.Combine(env.ContentRootPath, "private-uploads", "chat");

    private static string? KiemTraAnh(IFormFile image)
    {
        var extension = Path.GetExtension(image.FileName).ToLowerInvariant();
        if (!AllowedImageExtensions.Contains(extension) || !AllowedImageTypes.Contains(image.ContentType))
            return "Ảnh chat chỉ hỗ trợ JPG, JPEG, PNG hoặc WEBP.";
        if (image.Length > MaxImageSize)
            return "Mỗi ảnh chat tối đa 5MB.";
        return null;
    }

    private static string? ChuanHoaTuyChon(string? value)
    {
        var trimmed = value?.Trim();
        return string.IsNullOrWhiteSpace(trimmed) || string.Equals(trimmed, "all", StringComparison.OrdinalIgnoreCase)
            ? null
            : trimmed;
    }

    private static string? ChuanHoaTimKiem(string? value)
    {
        var trimmed = value?.Trim();
        return string.IsNullOrWhiteSpace(trimmed) ? null : trimmed.ToLowerInvariant();
    }

    private static bool TimThay(string query, params string?[] values)
    {
        return values
            .Where(value => !string.IsNullOrWhiteSpace(value))
            .Any(value => value!.ToLowerInvariant().Contains(query));
    }

    private static bool LaGiangVien(string role)
    {
        return string.Equals(role, "INSTRUCTOR", StringComparison.OrdinalIgnoreCase) ||
               string.Equals(role, "TEACHER", StringComparison.OrdinalIgnoreCase) ||
               string.Equals(role, "GIANGVIEN", StringComparison.OrdinalIgnoreCase);
    }
}
