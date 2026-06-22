using LMS.Api.Infrastructure.Persistence;
using LMS.Api.DTOs.PhanHoi;
using LMS.Api.Domain.Entities;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;

namespace LMS.Api.Application.Services;

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

public class DichVuChat(ApplicationDbContext db, IWebHostEnvironment env) : IDichVuChat
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
        var user = await db.NguoiDung.AsNoTracking().FirstOrDefaultAsync(u => u.Id == userId);
        if (user?.VaiTro == "ADMIN")
        {
            return new List<ChatScopeDto>
            {
                new() { CourseId = "all", CourseTitle = "Tất cả người dùng", ClassId = "all", SubjectId = null }
            };
        }

        var courses = await KhoaHocNguoiDungCoQuyen(userId)
            .OrderBy(course => course.TieuDe)
            .Select(course => new ChatScopeDto
            {
                CourseId = course.Id,
                CourseTitle = course.TieuDe,
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

        var user = await db.NguoiDung.AsNoTracking().FirstOrDefaultAsync(u => u.Id == userId);
        if (user?.VaiTro == "ADMIN")
        {
            var userQuery = db.NguoiDung.AsNoTracking()
                .Where(u => u.Id != userId && (u.VaiTro == "STUDENT" || u.VaiTro == "INSTRUCTOR"));

            if (normalizedQuery is not null)
            {
                userQuery = userQuery.Where(u => u.Ten.ToLower().Contains(normalizedQuery) || u.Email.ToLower().Contains(normalizedQuery));
            }

            if (onlineFilter is not null)
            {
                userQuery = userQuery.Where(u => onlineFilter.Contains(u.Id));
            }

            var matchingUsers = await userQuery.Take(100).ToListAsync();
            return matchingUsers.Select(u => new ChatContactDto
            {
                Id = u.Id,
                Name = u.Ten,
                Email = u.Email,
                Avatar = u.AnhDaiDien,
                Role = u.VaiTro,
                CourseId = "ADMIN_SUPPORT",
                CourseTitle = "Hỗ trợ trực tuyến",
                ClassId = "ADMIN_SUPPORT",
                SubjectId = null
            }).ToList();
        }

        var courseQuery = KhoaHocNguoiDungCoQuyen(userId);
        if (normalizedCourseId is not null)
        {
            query = null; // reset to avoid conflict in parameters
            courseQuery = courseQuery.Where(course => course.Id == normalizedCourseId);
        }
        if (normalizedClassId is not null)
        {
            courseQuery = courseQuery.Where(course => course.Id == normalizedClassId);
        }

        var courses = await courseQuery
            .OrderBy(course => course.TieuDe)
            .Select(course => new
            {
                course.Id,
                course.TieuDe,
                GiangVien = new
                {
                    Id = course.GiangVien!.Id,
                    course.GiangVien.Ten,
                    course.GiangVien.Email,
                    course.GiangVien.AnhDaiDien,
                    course.GiangVien.VaiTro
                },
                Students = course.CacGhiDanh.Select(enrollment => new
                {
                    Id = enrollment.NguoiDung!.Id,
                    enrollment.NguoiDung.Ten,
                    enrollment.NguoiDung.Email,
                    enrollment.NguoiDung.AnhDaiDien,
                    enrollment.NguoiDung.VaiTro
                }).ToList()
            })
            .ToListAsync();

        var result = new List<ChatContactDto>();
        var seen = new HashSet<string>(StringComparer.OrdinalIgnoreCase);

        foreach (var course in courses)
        {
            AddContact(course.GiangVien.Id, course.GiangVien.Ten, course.GiangVien.Email, course.GiangVien.AnhDaiDien, course.GiangVien.VaiTro, course.Id, course.TieuDe);

            foreach (var student in course.Students)
            {
                AddContact(student.Id, student.Ten, student.Email, student.AnhDaiDien, student.VaiTro, course.Id, course.TieuDe);
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

        var otherExists = await db.NguoiDung.AsNoTracking().AnyAsync(user => user.Id == otherUserId);
        if (!otherExists) return KetQuaChat<Guid>.NotFound("Không tìm thấy người dùng.");

        var scope = await TimPhamViHopLeAsync(userId, otherUserId, courseId, classId, subjectId);
        if (scope is null)
            return KetQuaChat<Guid>.Forbidden("Bạn chỉ có thể nhắn tin với giáo viên hoặc học viên trong cùng lớp/khóa học.");

        var existing = await db.CuocTroChuyen
            .Where(conversation => !conversation.LaNhom)
            .Where(conversation =>
                conversation.KhoaHocId == scope.CourseId &&
                conversation.ClassId == scope.ClassId &&
                conversation.SubjectId == scope.SubjectId &&
                conversation.CacNguoiThamGia.Count == 2 &&
                conversation.CacNguoiThamGia.Any(participant => participant.NguoiDungId == userId) &&
                conversation.CacNguoiThamGia.Any(participant => participant.NguoiDungId == otherUserId))
            .OrderByDescending(conversation => conversation.NgayCapNhat)
            .FirstOrDefaultAsync();

        if (existing is not null) return KetQuaChat<Guid>.Ok(existing.Id);

        var now = DateTime.UtcNow;
        var conversation = new CuocTroChuyen
        {
            Id = Guid.NewGuid(),
            LaNhom = false,
            TieuDe = null,
            KhoaHocId = scope.CourseId,
            ClassId = scope.ClassId,
            SubjectId = scope.SubjectId,
            NgayTao = now,
            NgayCapNhat = now,
            CacNguoiThamGia = [
                new() { NguoiDungId = userId, NgayThamGia = now },
                new() { NguoiDungId = otherUserId, NgayThamGia = now }
            ]
        };

        db.CuocTroChuyen.Add(conversation);
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
            CuocTroChuyenId = conversation.Id,
            NguoiGuiId = userId,
            NoiDung = normalizedContent,
            GuiLuc = now
        };

        db.TinNhan.Add(message);

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

                message.CacFileDinhKem.Add(new TinNhanDinhKem
                {
                    Id = attachmentId,
                    TinNhanId = message.Id,
                    TenFile = fileName,
                    TenFileGoc = Path.GetFileName(image.FileName),
                    LoaiNoiDung = image.ContentType,
                    KichThuoc = image.Length,
                    NgayTao = now
                });
            }

            conversation.NgayCapNhat = now;
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

        var sender = await db.NguoiDung.AsNoTracking().FirstOrDefaultAsync(user => user.Id == userId);
        var participantIds = conversation.CacNguoiThamGia.Select(participant => participant.NguoiDungId).ToList();

        return KetQuaChat<TinNhanDaGui>.Ok(new TinNhanDaGui(TaoTinNhanDto(message, sender), participantIds));
    }

    public async Task<bool> CoQuyenTruyCapCuocTroChuyenAsync(string userId, Guid conversationId)
    {
        var conversation = await db.CuocTroChuyen
            .AsNoTracking()
            .Include(item => item.CacNguoiThamGia)
            .FirstOrDefaultAsync(item => item.Id == conversationId);

        if (conversation is null) return false;

        // Primary gate: user must be a participant in the conversation.
        // They were explicitly added when the conversation was created,
        // so being a participant is sufficient proof of access.
        return conversation.CacNguoiThamGia.Any(participant => participant.NguoiDungId == userId);
    }

    public async Task<bool> CoQuyenGuiTinNhanAsync(string userId, Guid conversationId)
    {
        var result = await LayCuocTroChuyenDuocGuiAsync(userId, conversationId);
        return result.ThanhCong;
    }

    public async Task<KetQuaChat<AnhChat>> LayAnhAsync(string userId, Guid attachmentId)
    {
        var attachment = await db.TinNhanDinhKem
            .Include(item => item.TinNhan)
                .ThenInclude(message => message.CuocTroChuyen)
                    .ThenInclude(conversation => conversation.CacNguoiThamGia)
            .FirstOrDefaultAsync(item => item.Id == attachmentId);

        if (attachment is null) return KetQuaChat<AnhChat>.NotFound("Không tìm thấy ảnh.");

        var conversation = attachment.TinNhan.CuocTroChuyen;

        // Primary gate: user must be a participant in the conversation to view images.
        if (!conversation.CacNguoiThamGia.Any(participant => participant.NguoiDungId == userId))
            return KetQuaChat<AnhChat>.Forbidden("Bạn không có quyền xem ảnh này.");

        var fullPath = Path.Combine(ThuMucAnhChat, attachment.TenFile);
        if (!File.Exists(fullPath)) return KetQuaChat<AnhChat>.NotFound("Không tìm thấy file ảnh.");

        return KetQuaChat<AnhChat>.Ok(new AnhChat(fullPath, attachment.LoaiNoiDung, attachment.TenFileGoc));
    }

    public TinNhanDto TaoTinNhanDto(TinNhan message, NguoiDung? sender = null)
    {
        return new TinNhanDto
        {
            Id = message.Id,
            ConversationId = message.CuocTroChuyenId,
            SenderId = message.NguoiGuiId,
            SenderName = sender?.Ten ?? message.NguoiGui?.Ten ?? "Unknown",
            SenderAvatar = sender?.AnhDaiDien ?? message.NguoiGui?.AnhDaiDien,
            Content = message.NoiDung,
            SentAt = message.GuiLuc,
            Attachments = message.CacFileDinhKem
                .OrderBy(attachment => attachment.NgayTao)
                .Select(attachment => new TinNhanAnhDto
                {
                    Id = attachment.Id,
                    FileName = attachment.TenFileGoc,
                    ContentType = attachment.LoaiNoiDung,
                    Size = attachment.KichThuoc,
                    Url = $"/api/chat/images/{attachment.Id}"
                })
                .ToList()
        };
    }

    private IQueryable<KhoaHoc> KhoaHocNguoiDungCoQuyen(string userId)
    {
        return db.KhoaHoc.AsNoTracking()
            .Where(course => course.GiangVienId == userId || course.CacGhiDanh.Any(enrollment => enrollment.NguoiDungId == userId));
    }

    private async Task<bool> NguoiDungCoQuyenKhoaHocAsync(string userId, string courseId)
    {
        return await db.KhoaHoc.AsNoTracking()
            .AnyAsync(course => course.Id == courseId &&
                (course.GiangVienId == userId || course.CacGhiDanh.Any(enrollment => enrollment.NguoiDungId == userId)));
    }

    private async Task<PhamViChat?> TimPhamViHopLeAsync(string userId, string otherUserId, string? courseId, string? classId, string? subjectId)
    {
        var user1 = await db.NguoiDung.AsNoTracking().FirstOrDefaultAsync(u => u.Id == userId);
        var user2 = await db.NguoiDung.AsNoTracking().FirstOrDefaultAsync(u => u.Id == otherUserId);

        var isSupportChat = user1?.VaiTro == "ADMIN" || user2?.VaiTro == "ADMIN";
        if (isSupportChat)
        {
            return new PhamViChat("ADMIN_SUPPORT", "Hỗ trợ trực tuyến", "ADMIN_SUPPORT", null);
        }

        var normalizedCourseId = ChuanHoaTuyChon(courseId);
        var normalizedClassId = ChuanHoaTuyChon(classId);
        var normalizedSubjectId = ChuanHoaTuyChon(subjectId);

        var query = db.KhoaHoc.AsNoTracking()
            .Where(course =>
                (course.GiangVienId == userId || course.CacGhiDanh.Any(enrollment => enrollment.NguoiDungId == userId)) &&
                (course.GiangVienId == otherUserId || course.CacGhiDanh.Any(enrollment => enrollment.NguoiDungId == otherUserId)));

        if (normalizedCourseId is not null)
        {
            query = query.Where(course => course.Id == normalizedCourseId);
        }

        if (normalizedClassId is not null)
        {
            query = query.Where(course => course.Id == normalizedClassId);
        }

        var course = await query.OrderBy(course => course.TieuDe).FirstOrDefaultAsync();
        if (course is null) return null;

        return new PhamViChat(course.Id, course.TieuDe, course.Id, normalizedSubjectId);
    }

    private async Task<KetQuaChat<CuocTroChuyen>> LayCuocTroChuyenDuocGuiAsync(string userId, Guid conversationId)
    {
        var conversation = await db.CuocTroChuyen
            .Include(item => item.CacNguoiThamGia)
            .FirstOrDefaultAsync(item => item.Id == conversationId);

        if (conversation is null) return KetQuaChat<CuocTroChuyen>.NotFound("Không tìm thấy cuộc trò chuyện.");

        // Primary gate: user must be a participant in the conversation.
        if (!conversation.CacNguoiThamGia.Any(participant => participant.NguoiDungId == userId))
            return KetQuaChat<CuocTroChuyen>.Forbidden("Bạn không thuộc cuộc trò chuyện này.");

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
