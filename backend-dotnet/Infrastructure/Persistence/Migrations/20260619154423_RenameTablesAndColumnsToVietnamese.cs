using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace LMS.Api.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class RenameTablesAndColumnsToVietnamese : Migration
    {
        private static string EscapeIdentifier(string value)
        {
            return value.Replace("]", "]]");
        }

        private static string EscapeLiteral(string value)
        {
            return value.Replace("'", "''");
        }

        private static string TableObjectNameLiteral(string table)
        {
            return EscapeLiteral($"[dbo].[{EscapeIdentifier(table)}]");
        }

        private static void DropForeignKeyIfExists(MigrationBuilder migrationBuilder, string table, string name)
        {
            var escapedTableIdentifier = EscapeIdentifier(table);
            var escapedTableLiteral = EscapeLiteral(escapedTableIdentifier);
            var escapedNameIdentifier = EscapeIdentifier(name);
            var escapedNameLiteral = EscapeLiteral(name);

            migrationBuilder.Sql($"""
                IF EXISTS (
                    SELECT 1
                    FROM sys.foreign_keys
                    WHERE [name] = N'{escapedNameLiteral}'
                      AND [parent_object_id] = OBJECT_ID(N'[dbo].[{escapedTableLiteral}]')
                )
                BEGIN
                    ALTER TABLE [dbo].[{escapedTableIdentifier}] DROP CONSTRAINT [{escapedNameIdentifier}];
                END
                """);
        }

        private static void DropTableIfExists(MigrationBuilder migrationBuilder, string table)
        {
            var escapedTableIdentifier = EscapeIdentifier(table);
            var tableObjectName = TableObjectNameLiteral(table);

            migrationBuilder.Sql($"""
                IF OBJECT_ID(N'{tableObjectName}', N'U') IS NOT NULL
                BEGIN
                    DROP TABLE [dbo].[{escapedTableIdentifier}];
                END
                """);
        }

        private static void DropPrimaryKeyIfExists(MigrationBuilder migrationBuilder, string table, string name)
        {
            var escapedTableIdentifier = EscapeIdentifier(table);
            var escapedNameIdentifier = EscapeIdentifier(name);
            var escapedNameLiteral = EscapeLiteral(name);
            var tableObjectName = TableObjectNameLiteral(table);

            migrationBuilder.Sql($"""
                IF EXISTS (
                    SELECT 1
                    FROM sys.key_constraints
                    WHERE [type] = N'PK'
                      AND [name] = N'{escapedNameLiteral}'
                      AND [parent_object_id] = OBJECT_ID(N'{tableObjectName}')
                )
                BEGIN
                    ALTER TABLE [dbo].[{escapedTableIdentifier}] DROP CONSTRAINT [{escapedNameIdentifier}];
                END
                """);
        }

        private static void DropIndexIfExists(MigrationBuilder migrationBuilder, string table, string name)
        {
            var escapedTableIdentifier = EscapeIdentifier(table);
            var escapedNameIdentifier = EscapeIdentifier(name);
            var escapedNameLiteral = EscapeLiteral(name);
            var tableObjectName = TableObjectNameLiteral(table);

            migrationBuilder.Sql($"""
                IF EXISTS (
                    SELECT 1
                    FROM sys.indexes
                    WHERE [name] = N'{escapedNameLiteral}'
                      AND [object_id] = OBJECT_ID(N'{tableObjectName}')
                )
                BEGIN
                    DROP INDEX [{escapedNameIdentifier}] ON [dbo].[{escapedTableIdentifier}];
                END
                """);
        }

        private static void RenameTableIfExists(MigrationBuilder migrationBuilder, string oldName, string newName)
        {
            var oldObjectName = TableObjectNameLiteral(oldName);
            var newObjectName = TableObjectNameLiteral(newName);
            var escapedNewNameLiteral = EscapeLiteral(newName);

            migrationBuilder.Sql($"""
                IF OBJECT_ID(N'{oldObjectName}', N'U') IS NOT NULL
                   AND OBJECT_ID(N'{newObjectName}', N'U') IS NULL
                BEGIN
                    EXEC sp_rename N'{oldObjectName}', N'{escapedNewNameLiteral}';
                END
                """);
        }

        private static void RenameColumnIfExists(MigrationBuilder migrationBuilder, string table, string oldName, string newName)
        {
            var tableObjectName = TableObjectNameLiteral(table);
            var oldColumnLiteral = EscapeLiteral(oldName);
            var newColumnLiteral = EscapeLiteral(newName);
            var oldColumnObjectName = EscapeLiteral($"[dbo].[{EscapeIdentifier(table)}].[{EscapeIdentifier(oldName)}]");

            migrationBuilder.Sql($"""
                IF OBJECT_ID(N'{tableObjectName}', N'U') IS NOT NULL
                   AND COL_LENGTH(N'{tableObjectName}', N'{oldColumnLiteral}') IS NOT NULL
                   AND COL_LENGTH(N'{tableObjectName}', N'{newColumnLiteral}') IS NULL
                BEGIN
                    EXEC sp_rename N'{oldColumnObjectName}', N'{newColumnLiteral}', N'COLUMN';
                END
                """);
        }

        private static void RenameIndexIfExists(MigrationBuilder migrationBuilder, string table, string oldName, string newName)
        {
            var tableObjectName = TableObjectNameLiteral(table);
            var oldNameLiteral = EscapeLiteral(oldName);
            var newNameLiteral = EscapeLiteral(newName);
            var oldIndexObjectName = EscapeLiteral($"[dbo].[{EscapeIdentifier(table)}].[{EscapeIdentifier(oldName)}]");

            migrationBuilder.Sql($"""
                IF OBJECT_ID(N'{tableObjectName}', N'U') IS NOT NULL
                   AND EXISTS (
                       SELECT 1
                       FROM sys.indexes
                       WHERE [object_id] = OBJECT_ID(N'{tableObjectName}')
                         AND [name] = N'{oldNameLiteral}'
                   )
                   AND NOT EXISTS (
                       SELECT 1
                       FROM sys.indexes
                       WHERE [object_id] = OBJECT_ID(N'{tableObjectName}')
                         AND [name] = N'{newNameLiteral}'
                   )
                BEGIN
                    EXEC sp_rename N'{oldIndexObjectName}', N'{newNameLiteral}', N'INDEX';
                END
                """);
        }

        private static void EnsureCouponAuxiliaryTables(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql("""
                IF OBJECT_ID(N'[dbo].[NguoiNhanMaGiamGia]', N'U') IS NULL
                BEGIN
                    CREATE TABLE [dbo].[NguoiNhanMaGiamGia] (
                        [Id] nvarchar(450) NOT NULL,
                        [MaGiamGiaId] nvarchar(450) NOT NULL,
                        [NguoiDungId] nvarchar(450) NOT NULL,
                        [GiangVienId] nvarchar(450) NOT NULL,
                        [SourceCourseId] nvarchar(450) NULL,
                        [NgayTao] datetime2 NOT NULL
                    );
                END

                IF OBJECT_ID(N'[dbo].[LichSuDungMaGiamGia]', N'U') IS NULL
                BEGIN
                    CREATE TABLE [dbo].[LichSuDungMaGiamGia] (
                        [Id] nvarchar(450) NOT NULL,
                        [MaGiamGiaId] nvarchar(450) NOT NULL,
                        [NguoiDungId] nvarchar(450) NOT NULL,
                        [KhoaHocId] nvarchar(450) NOT NULL,
                        [DonMuaId] nvarchar(450) NOT NULL,
                        [NgayTao] datetime2 NOT NULL
                    );
                END

                IF OBJECT_ID(N'[dbo].[MaGiamGia]', N'U') IS NOT NULL
                   AND COL_LENGTH(N'[dbo].[MaGiamGia]', N'GiangVienId') IS NULL
                BEGIN
                    ALTER TABLE [dbo].[MaGiamGia] ADD [GiangVienId] nvarchar(450) NULL;
                END
                """);
        }

        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            DropForeignKeyIfExists(migrationBuilder, "Assignment", "FK_Assignment_Course_CourseId");

            DropForeignKeyIfExists(migrationBuilder, "Assignment", "FK_Assignment_Lesson_LessonId");

            DropForeignKeyIfExists(migrationBuilder, "Assignment", "FK_Assignment_User_TeacherId");

            DropForeignKeyIfExists(migrationBuilder, "Certificate", "FK_Certificate_Course_CourseId");

            DropForeignKeyIfExists(migrationBuilder, "Certificate", "FK_Certificate_User_UserId");

            DropForeignKeyIfExists(migrationBuilder, "Comment", "FK_Comment_Comment_ParentId");

            DropForeignKeyIfExists(migrationBuilder, "Comment", "FK_Comment_Lesson_LessonId");

            DropForeignKeyIfExists(migrationBuilder, "Comment", "FK_Comment_User_UserId");

            DropForeignKeyIfExists(migrationBuilder, "ConversationParticipant", "FK_ConversationParticipant_Conversation_ConversationId");

            DropForeignKeyIfExists(migrationBuilder, "ConversationParticipant", "FK_ConversationParticipant_User_UserId");

            DropForeignKeyIfExists(migrationBuilder, "Coupon", "FK_Coupon_Course_CourseId");

            DropForeignKeyIfExists(migrationBuilder, "Coupon", "FK_Coupon_User_TeacherId");

            DropForeignKeyIfExists(migrationBuilder, "Coupon", "FK_Coupon_User_InstructorId");

            DropForeignKeyIfExists(migrationBuilder, "CouponRecipient", "FK_CouponRecipient_Coupon_CouponId");

            DropForeignKeyIfExists(migrationBuilder, "CouponRecipient", "FK_CouponRecipient_Course_SourceCourseId");

            DropForeignKeyIfExists(migrationBuilder, "CouponRecipient", "FK_CouponRecipient_User_TeacherId");

            DropForeignKeyIfExists(migrationBuilder, "CouponRecipient", "FK_CouponRecipient_User_UserId");

            DropForeignKeyIfExists(migrationBuilder, "CouponUsage", "FK_CouponUsage_Coupon_CouponId");

            DropForeignKeyIfExists(migrationBuilder, "CouponUsage", "FK_CouponUsage_Course_CourseId");

            DropForeignKeyIfExists(migrationBuilder, "CouponUsage", "FK_CouponUsage_Purchase_PurchaseId");

            DropForeignKeyIfExists(migrationBuilder, "CouponUsage", "FK_CouponUsage_User_UserId");

            DropForeignKeyIfExists(migrationBuilder, "Course", "FK_Course_User_InstructorId");

            DropForeignKeyIfExists(migrationBuilder, "CourseReview", "FK_CourseReview_Course_CourseId");

            DropForeignKeyIfExists(migrationBuilder, "CourseReview", "FK_CourseReview_User_UserId");

            DropForeignKeyIfExists(migrationBuilder, "Enrollment", "FK_Enrollment_Course_CourseId");

            DropForeignKeyIfExists(migrationBuilder, "Enrollment", "FK_Enrollment_User_UserId");

            DropForeignKeyIfExists(migrationBuilder, "Event", "FK_Event_User_InstructorId");

            DropForeignKeyIfExists(migrationBuilder, "EventImage", "FK_EventImage_Event_SuKienId");

            DropForeignKeyIfExists(migrationBuilder, "EventRegistration", "FK_EventRegistration_Event_EventId");

            DropForeignKeyIfExists(migrationBuilder, "EventRegistration", "FK_EventRegistration_User_UserId");

            DropForeignKeyIfExists(migrationBuilder, "EventRewardRedemption", "FK_EventRewardRedemption_User_UserId");

            DropForeignKeyIfExists(migrationBuilder, "InstructorWithdrawal", "FK_InstructorWithdrawal_User_InstructorId");

            DropForeignKeyIfExists(migrationBuilder, "Lesson", "FK_Lesson_Course_CourseId");

            DropForeignKeyIfExists(migrationBuilder, "Lesson", "FK_Lesson_Section_SectionId");

            DropForeignKeyIfExists(migrationBuilder, "LessonProgress", "FK_LessonProgress_Lesson_LessonId");

            DropForeignKeyIfExists(migrationBuilder, "LessonProgress", "FK_LessonProgress_User_UserId");

            DropForeignKeyIfExists(migrationBuilder, "Message", "FK_Message_Conversation_ConversationId");

            DropForeignKeyIfExists(migrationBuilder, "Message", "FK_Message_User_SenderId");

            DropForeignKeyIfExists(migrationBuilder, "MessageAttachment", "FK_MessageAttachment_Message_MessageId");

            DropForeignKeyIfExists(migrationBuilder, "Notification", "FK_Notification_User_UserId");

            DropForeignKeyIfExists(migrationBuilder, "Quiz", "FK_Quiz_Lesson_LessonId");

            DropForeignKeyIfExists(migrationBuilder, "QuizQuestion", "FK_QuizQuestion_Quiz_QuizId");

            DropForeignKeyIfExists(migrationBuilder, "SavedCourse", "FK_SavedCourse_Course_CourseId");

            DropForeignKeyIfExists(migrationBuilder, "SavedCourse", "FK_SavedCourse_User_UserId");

            DropForeignKeyIfExists(migrationBuilder, "Section", "FK_Section_Course_CourseId");

            DropForeignKeyIfExists(migrationBuilder, "WalletTransaction", "FK_WalletTransaction_Course_CourseId");

            DropForeignKeyIfExists(migrationBuilder, "WalletTransaction", "FK_WalletTransaction_ExternalPayment_ExternalPaymentId");

            DropForeignKeyIfExists(migrationBuilder, "WalletTransaction", "FK_WalletTransaction_Purchase_PurchaseId");

            DropForeignKeyIfExists(migrationBuilder, "WalletTransaction", "FK_WalletTransaction_User_UserId");

            DropTableIfExists(migrationBuilder, "ExternalPayment");

            DropTableIfExists(migrationBuilder, "Purchase");

            DropTableIfExists(migrationBuilder, "QuizSubmission");

            DropPrimaryKeyIfExists(migrationBuilder, "WalletTransaction", "PK_WalletTransaction");

            DropPrimaryKeyIfExists(migrationBuilder, "User", "PK_User");

            DropPrimaryKeyIfExists(migrationBuilder, "Section", "PK_Section");

            DropPrimaryKeyIfExists(migrationBuilder, "SavedCourse", "PK_SavedCourse");

            DropPrimaryKeyIfExists(migrationBuilder, "QuizQuestion", "PK_QuizQuestion");

            DropPrimaryKeyIfExists(migrationBuilder, "Quiz", "PK_Quiz");

            DropPrimaryKeyIfExists(migrationBuilder, "Notification", "PK_Notification");

            DropPrimaryKeyIfExists(migrationBuilder, "MessageAttachment", "PK_MessageAttachment");

            DropPrimaryKeyIfExists(migrationBuilder, "Message", "PK_Message");

            DropPrimaryKeyIfExists(migrationBuilder, "LessonProgress", "PK_LessonProgress");

            DropPrimaryKeyIfExists(migrationBuilder, "Lesson", "PK_Lesson");

            DropPrimaryKeyIfExists(migrationBuilder, "InstructorWithdrawal", "PK_InstructorWithdrawal");

            DropPrimaryKeyIfExists(migrationBuilder, "EventRewardRedemption", "PK_EventRewardRedemption");

            DropIndexIfExists(migrationBuilder, "EventRewardRedemption", "IX_EventRewardRedemption_UserId_RewardId");

            DropPrimaryKeyIfExists(migrationBuilder, "EventRegistration", "PK_EventRegistration");

            DropIndexIfExists(migrationBuilder, "EventRegistration", "IX_EventRegistration_EventId_UserId");

            DropIndexIfExists(migrationBuilder, "EventRegistration", "IX_EventRegistration_UserId_RegisteredAt");

            DropPrimaryKeyIfExists(migrationBuilder, "EventImage", "PK_EventImage");

            DropPrimaryKeyIfExists(migrationBuilder, "Event", "PK_Event");

            DropPrimaryKeyIfExists(migrationBuilder, "Enrollment", "PK_Enrollment");

            DropPrimaryKeyIfExists(migrationBuilder, "CourseReview", "PK_CourseReview");

            DropIndexIfExists(migrationBuilder, "CourseReview", "IX_CourseReview_CourseId_CreatedAt");

            DropIndexIfExists(migrationBuilder, "CourseReview", "IX_CourseReview_UserId_CreatedAt");

            DropPrimaryKeyIfExists(migrationBuilder, "Course", "PK_Course");

            DropIndexIfExists(migrationBuilder, "Course", "IX_Course_InstructorId");

            DropIndexIfExists(migrationBuilder, "Course", "IX_Course_Slug");

            DropPrimaryKeyIfExists(migrationBuilder, "CouponUsage", "PK_CouponUsage");

            DropIndexIfExists(migrationBuilder, "CouponUsage", "IX_CouponUsage_CouponId_UserId");

            DropIndexIfExists(migrationBuilder, "CouponUsage", "IX_CouponUsage_PurchaseId");

            DropPrimaryKeyIfExists(migrationBuilder, "CouponRecipient", "PK_CouponRecipient");

            DropIndexIfExists(migrationBuilder, "CouponRecipient", "IX_CouponRecipient_CouponId_UserId");

            DropIndexIfExists(migrationBuilder, "CouponRecipient", "IX_CouponRecipient_TeacherId");

            DropPrimaryKeyIfExists(migrationBuilder, "Coupon", "PK_Coupon");

            DropIndexIfExists(migrationBuilder, "Coupon", "IX_Coupon_InstructorId");

            DropPrimaryKeyIfExists(migrationBuilder, "ConversationParticipant", "PK_ConversationParticipant");

            DropPrimaryKeyIfExists(migrationBuilder, "Conversation", "PK_Conversation");

            DropPrimaryKeyIfExists(migrationBuilder, "Comment", "PK_Comment");

            DropPrimaryKeyIfExists(migrationBuilder, "Certificate", "PK_Certificate");

            DropPrimaryKeyIfExists(migrationBuilder, "AuditLog", "PK_AuditLog");

            DropPrimaryKeyIfExists(migrationBuilder, "Assignment", "PK_Assignment");

            RenameTableIfExists(migrationBuilder, "WalletTransaction", "GiaoDichVi");

            RenameTableIfExists(migrationBuilder, "User", "NguoiDung");

            RenameTableIfExists(migrationBuilder, "Section", "ChuongHoc");

            RenameTableIfExists(migrationBuilder, "SavedCourse", "KhoaHocDaLuu");

            RenameTableIfExists(migrationBuilder, "QuizQuestion", "CauHoiKiemTra");

            RenameTableIfExists(migrationBuilder, "Quiz", "BaiKiemTra");

            RenameTableIfExists(migrationBuilder, "Notification", "ThongBao");

            RenameTableIfExists(migrationBuilder, "MessageAttachment", "TinNhanDinhKem");

            RenameTableIfExists(migrationBuilder, "Message", "TinNhan");

            RenameTableIfExists(migrationBuilder, "LessonProgress", "TienDoBaiHoc");

            RenameTableIfExists(migrationBuilder, "Lesson", "BaiHoc");

            RenameTableIfExists(migrationBuilder, "InstructorWithdrawal", "RutTienGiangVien");

            RenameTableIfExists(migrationBuilder, "EventRewardRedemption", "DoiThuongSuKien");

            RenameTableIfExists(migrationBuilder, "EventRegistration", "DangKySuKien");

            RenameTableIfExists(migrationBuilder, "EventImage", "SuKienAnh");

            RenameTableIfExists(migrationBuilder, "Event", "SuKien");

            RenameTableIfExists(migrationBuilder, "Enrollment", "GhiDanh");

            RenameTableIfExists(migrationBuilder, "CourseReview", "DanhGiaKhoaHoc");

            RenameTableIfExists(migrationBuilder, "Course", "KhoaHoc");

            RenameTableIfExists(migrationBuilder, "CouponUsage", "LichSuDungMaGiamGia");

            RenameTableIfExists(migrationBuilder, "CouponRecipient", "NguoiNhanMaGiamGia");

            RenameTableIfExists(migrationBuilder, "Coupon", "MaGiamGia");

            RenameTableIfExists(migrationBuilder, "ConversationParticipant", "NguoiThamGiaTroChuyen");

            RenameTableIfExists(migrationBuilder, "Conversation", "CuocTroChuyen");

            RenameTableIfExists(migrationBuilder, "Comment", "BinhLuan");

            RenameTableIfExists(migrationBuilder, "Certificate", "ChungChi");

            RenameTableIfExists(migrationBuilder, "AuditLog", "NhatKyHeThong");

            RenameTableIfExists(migrationBuilder, "Assignment", "BaiTap");

            RenameColumnIfExists(migrationBuilder, "GiaoDichVi", "UserId", "NguoiDungId");

            RenameColumnIfExists(migrationBuilder, "GiaoDichVi", "Type", "LoaiGiaoDich");

            RenameColumnIfExists(migrationBuilder, "GiaoDichVi", "Status", "TrangThai");

            RenameColumnIfExists(migrationBuilder, "GiaoDichVi", "PurchaseId", "ThanhToanId");

            RenameColumnIfExists(migrationBuilder, "GiaoDichVi", "Note", "NoiDung");

            RenameColumnIfExists(migrationBuilder, "GiaoDichVi", "ExternalPaymentId", "KhoaHocId");

            RenameColumnIfExists(migrationBuilder, "GiaoDichVi", "CreatedAt", "NgayTao");

            RenameColumnIfExists(migrationBuilder, "GiaoDichVi", "CourseId", "DonMuaId");

            RenameColumnIfExists(migrationBuilder, "GiaoDichVi", "BalanceAfter", "SoTien");

            RenameColumnIfExists(migrationBuilder, "GiaoDichVi", "Amount", "SoDuSauGiaoDich");

            RenameIndexIfExists(migrationBuilder, "GiaoDichVi", "IX_WalletTransaction_UserId_CreatedAt", "IX_GiaoDichVi_NguoiDungId_NgayTao");

            RenameIndexIfExists(migrationBuilder, "GiaoDichVi", "IX_WalletTransaction_Type_CreatedAt", "IX_GiaoDichVi_LoaiGiaoDich_NgayTao");

            RenameIndexIfExists(migrationBuilder, "GiaoDichVi", "IX_WalletTransaction_PurchaseId", "IX_GiaoDichVi_ThanhToanId");

            RenameIndexIfExists(migrationBuilder, "GiaoDichVi", "IX_WalletTransaction_ExternalPaymentId", "IX_GiaoDichVi_KhoaHocId");

            RenameIndexIfExists(migrationBuilder, "GiaoDichVi", "IX_WalletTransaction_CourseId", "IX_GiaoDichVi_DonMuaId");

            RenameColumnIfExists(migrationBuilder, "NguoiDung", "WalletBalance", "TongChiTieu");

            RenameColumnIfExists(migrationBuilder, "NguoiDung", "UpdatedAt", "NgayTao");

            RenameColumnIfExists(migrationBuilder, "NguoiDung", "TotalSpent", "SoDuVi");

            RenameColumnIfExists(migrationBuilder, "NguoiDung", "Settings", "TieuSu");

            RenameColumnIfExists(migrationBuilder, "NguoiDung", "Role", "VaiTro");

            RenameColumnIfExists(migrationBuilder, "NguoiDung", "RewardPoints", "DiemThuong");

            RenameColumnIfExists(migrationBuilder, "NguoiDung", "Phone", "SoDienThoai");

            RenameColumnIfExists(migrationBuilder, "NguoiDung", "Password", "Ten");

            RenameColumnIfExists(migrationBuilder, "NguoiDung", "Name", "MatKhau");

            RenameColumnIfExists(migrationBuilder, "NguoiDung", "MemberTier", "HangThanhVien");

            RenameColumnIfExists(migrationBuilder, "NguoiDung", "LoginStreak", "ChuoiDangNhap");

            RenameColumnIfExists(migrationBuilder, "NguoiDung", "LastSeenAt", "NgayNhanThuongDangNhapCuoi");

            RenameColumnIfExists(migrationBuilder, "NguoiDung", "LastRewardLoginDate", "NgayNhanThuongBaiHocCuoi");

            RenameColumnIfExists(migrationBuilder, "NguoiDung", "LastPurchaseRewardWeek", "TuanNhanThuongMuaCuoi");

            RenameColumnIfExists(migrationBuilder, "NguoiDung", "LastLessonRewardDate", "LanCuoiHoatDong");

            RenameColumnIfExists(migrationBuilder, "NguoiDung", "CreatedAt", "NgayCapNhat");

            RenameColumnIfExists(migrationBuilder, "NguoiDung", "Bio", "CaiDat");

            RenameColumnIfExists(migrationBuilder, "NguoiDung", "Avatar", "AnhDaiDien");

            RenameIndexIfExists(migrationBuilder, "NguoiDung", "IX_User_Email", "IX_NguoiDung_Email");

            RenameColumnIfExists(migrationBuilder, "ChuongHoc", "UpdatedAt", "NgayTao");

            RenameColumnIfExists(migrationBuilder, "ChuongHoc", "Title", "TieuDe");

            RenameColumnIfExists(migrationBuilder, "ChuongHoc", "Position", "ThuTu");

            RenameColumnIfExists(migrationBuilder, "ChuongHoc", "Description", "MoTa");

            RenameColumnIfExists(migrationBuilder, "ChuongHoc", "CreatedAt", "NgayCapNhat");

            RenameColumnIfExists(migrationBuilder, "ChuongHoc", "CourseId", "KhoaHocId");

            RenameIndexIfExists(migrationBuilder, "ChuongHoc", "IX_Section_CourseId", "IX_ChuongHoc_KhoaHocId");

            RenameColumnIfExists(migrationBuilder, "KhoaHocDaLuu", "UserId", "NguoiDungId");

            RenameColumnIfExists(migrationBuilder, "KhoaHocDaLuu", "CreatedAt", "NgayTao");

            RenameColumnIfExists(migrationBuilder, "KhoaHocDaLuu", "CourseId", "KhoaHocId");

            RenameIndexIfExists(migrationBuilder, "KhoaHocDaLuu", "IX_SavedCourse_UserId_CreatedAt", "IX_KhoaHocDaLuu_NguoiDungId_NgayTao");

            RenameIndexIfExists(migrationBuilder, "KhoaHocDaLuu", "IX_SavedCourse_UserId_CourseId", "IX_KhoaHocDaLuu_NguoiDungId_KhoaHocId");

            RenameIndexIfExists(migrationBuilder, "KhoaHocDaLuu", "IX_SavedCourse_CourseId", "IX_KhoaHocDaLuu_KhoaHocId");

            RenameColumnIfExists(migrationBuilder, "CauHoiKiemTra", "UpdatedAt", "NgayTao");

            RenameColumnIfExists(migrationBuilder, "CauHoiKiemTra", "QuizId", "BaiKiemTraId");

            RenameColumnIfExists(migrationBuilder, "CauHoiKiemTra", "QuestionText", "NoiDungCauHoi");

            RenameColumnIfExists(migrationBuilder, "CauHoiKiemTra", "Position", "ThuTu");

            RenameColumnIfExists(migrationBuilder, "CauHoiKiemTra", "Options", "CacLuaChon");

            RenameColumnIfExists(migrationBuilder, "CauHoiKiemTra", "Explanation", "GiaiThich");

            RenameColumnIfExists(migrationBuilder, "CauHoiKiemTra", "CreatedAt", "NgayCapNhat");

            RenameColumnIfExists(migrationBuilder, "CauHoiKiemTra", "CorrectOptionIndex", "DapAnDungIndex");

            RenameIndexIfExists(migrationBuilder, "CauHoiKiemTra", "IX_QuizQuestion_QuizId", "IX_CauHoiKiemTra_BaiKiemTraId");

            RenameColumnIfExists(migrationBuilder, "BaiKiemTra", "UpdatedAt", "NgayTao");

            RenameColumnIfExists(migrationBuilder, "BaiKiemTra", "Title", "TieuDe");

            RenameColumnIfExists(migrationBuilder, "BaiKiemTra", "PassingScore", "DiemDat");

            RenameColumnIfExists(migrationBuilder, "BaiKiemTra", "LessonId", "BaiHocId");

            RenameColumnIfExists(migrationBuilder, "BaiKiemTra", "Description", "MoTa");

            RenameColumnIfExists(migrationBuilder, "BaiKiemTra", "CreatedAt", "NgayCapNhat");

            RenameIndexIfExists(migrationBuilder, "BaiKiemTra", "IX_Quiz_LessonId", "IX_BaiKiemTra_BaiHocId");

            RenameColumnIfExists(migrationBuilder, "ThongBao", "UserId", "NguoiDungId");

            RenameColumnIfExists(migrationBuilder, "ThongBao", "Type", "TieuDe");

            RenameColumnIfExists(migrationBuilder, "ThongBao", "Title", "NoiDung");

            RenameColumnIfExists(migrationBuilder, "ThongBao", "ReadAt", "DocLuc");

            RenameColumnIfExists(migrationBuilder, "ThongBao", "Link", "DuongDan");

            RenameColumnIfExists(migrationBuilder, "ThongBao", "IsRead", "DaDoc");

            RenameColumnIfExists(migrationBuilder, "ThongBao", "CreatedAt", "NgayTao");

            RenameColumnIfExists(migrationBuilder, "ThongBao", "Body", "LoaiThongBao");

            RenameIndexIfExists(migrationBuilder, "ThongBao", "IX_Notification_UserId_IsRead_CreatedAt", "IX_ThongBao_NguoiDungId_DaDoc_NgayTao");

            RenameColumnIfExists(migrationBuilder, "TinNhanDinhKem", "Size", "KichThuoc");

            RenameColumnIfExists(migrationBuilder, "TinNhanDinhKem", "OriginalFileName", "TenFileGoc");

            RenameColumnIfExists(migrationBuilder, "TinNhanDinhKem", "MessageId", "TinNhanId");

            RenameColumnIfExists(migrationBuilder, "TinNhanDinhKem", "FileName", "TenFile");

            RenameColumnIfExists(migrationBuilder, "TinNhanDinhKem", "CreatedAt", "NgayTao");

            RenameColumnIfExists(migrationBuilder, "TinNhanDinhKem", "ContentType", "LoaiNoiDung");

            RenameIndexIfExists(migrationBuilder, "TinNhanDinhKem", "IX_MessageAttachment_MessageId", "IX_TinNhanDinhKem_TinNhanId");

            RenameColumnIfExists(migrationBuilder, "TinNhan", "SentAt", "GuiLuc");

            RenameColumnIfExists(migrationBuilder, "TinNhan", "SenderId", "NguoiGuiId");

            RenameColumnIfExists(migrationBuilder, "TinNhan", "ConversationId", "CuocTroChuyenId");

            RenameColumnIfExists(migrationBuilder, "TinNhan", "Content", "NoiDung");

            RenameIndexIfExists(migrationBuilder, "TinNhan", "IX_Message_SentAt", "IX_TinNhan_GuiLuc");

            RenameIndexIfExists(migrationBuilder, "TinNhan", "IX_Message_SenderId", "IX_TinNhan_NguoiGuiId");

            RenameIndexIfExists(migrationBuilder, "TinNhan", "IX_Message_ConversationId", "IX_TinNhan_CuocTroChuyenId");

            RenameColumnIfExists(migrationBuilder, "TienDoBaiHoc", "WatchedSeconds", "ViTriXemCuoiGiay");

            RenameColumnIfExists(migrationBuilder, "TienDoBaiHoc", "UserId", "NguoiDungId");

            RenameColumnIfExists(migrationBuilder, "TienDoBaiHoc", "UpdatedAt", "NgayTao");

            RenameColumnIfExists(migrationBuilder, "TienDoBaiHoc", "LessonId", "BaiHocId");

            RenameColumnIfExists(migrationBuilder, "TienDoBaiHoc", "LastPositionSeconds", "GiayDaXem");

            RenameColumnIfExists(migrationBuilder, "TienDoBaiHoc", "IsCompleted", "DaHoanThanh");

            RenameColumnIfExists(migrationBuilder, "TienDoBaiHoc", "CreatedAt", "NgayCapNhat");

            RenameColumnIfExists(migrationBuilder, "TienDoBaiHoc", "CompletionRate", "TyLeHoanThanh");

            RenameColumnIfExists(migrationBuilder, "TienDoBaiHoc", "CompletedAt", "NgayHoanThanh");

            RenameIndexIfExists(migrationBuilder, "TienDoBaiHoc", "IX_LessonProgress_UserId_LessonId", "IX_TienDoBaiHoc_NguoiDungId_BaiHocId");

            RenameIndexIfExists(migrationBuilder, "TienDoBaiHoc", "IX_LessonProgress_UserId_IsCompleted", "IX_TienDoBaiHoc_NguoiDungId_DaHoanThanh");

            RenameIndexIfExists(migrationBuilder, "TienDoBaiHoc", "IX_LessonProgress_UserId", "IX_TienDoBaiHoc_NguoiDungId");

            RenameIndexIfExists(migrationBuilder, "TienDoBaiHoc", "IX_LessonProgress_LessonId", "IX_TienDoBaiHoc_BaiHocId");

            RenameColumnIfExists(migrationBuilder, "BaiHoc", "UpdatedAt", "NgayTao");

            RenameColumnIfExists(migrationBuilder, "BaiHoc", "Title", "TieuDe");

            RenameColumnIfExists(migrationBuilder, "BaiHoc", "Status", "TrangThai");

            RenameColumnIfExists(migrationBuilder, "BaiHoc", "CourseId", "KhoaHocId");

            RenameColumnIfExists(migrationBuilder, "BaiHoc", "Position", "ThuTu");

            RenameColumnIfExists(migrationBuilder, "BaiHoc", "IsPublished", "DaXuatBan");

            RenameColumnIfExists(migrationBuilder, "BaiHoc", "IsPreview", "ChoXemTruoc");

            RenameColumnIfExists(migrationBuilder, "BaiHoc", "DurationSeconds", "ThoiLuongGiay");

            RenameColumnIfExists(migrationBuilder, "BaiHoc", "CreatedAt", "NgayCapNhat");

            RenameColumnIfExists(migrationBuilder, "BaiHoc", "SectionId", "ChuongHocId");

            RenameColumnIfExists(migrationBuilder, "BaiHoc", "Content", "NoiDung");

            RenameIndexIfExists(migrationBuilder, "BaiHoc", "IX_Lesson_CourseId", "IX_BaiHoc_KhoaHocId");

            RenameIndexIfExists(migrationBuilder, "BaiHoc", "IX_Lesson_SectionId", "IX_BaiHoc_ChuongHocId");

            RenameColumnIfExists(migrationBuilder, "RutTienGiangVien", "Status", "TrangThai");

            RenameColumnIfExists(migrationBuilder, "RutTienGiangVien", "Note", "NoiDung");

            RenameColumnIfExists(migrationBuilder, "RutTienGiangVien", "InstructorId", "GiangVienId");

            RenameColumnIfExists(migrationBuilder, "RutTienGiangVien", "CreatedAt", "NgayTao");

            RenameColumnIfExists(migrationBuilder, "RutTienGiangVien", "BankName", "TenNganHang");

            RenameColumnIfExists(migrationBuilder, "RutTienGiangVien", "Amount", "SoTien");

            RenameColumnIfExists(migrationBuilder, "RutTienGiangVien", "AccountNumber", "SoTaiKhoan");

            RenameColumnIfExists(migrationBuilder, "RutTienGiangVien", "AccountHolder", "ChuTaiKhoan");

            RenameIndexIfExists(migrationBuilder, "RutTienGiangVien", "IX_InstructorWithdrawal_InstructorId_CreatedAt", "IX_RutTienGiangVien_GiangVienId_NgayTao");

            RenameColumnIfExists(migrationBuilder, "DoiThuongSuKien", "UserId", "PhanThuongId");

            RenameColumnIfExists(migrationBuilder, "DoiThuongSuKien", "RewardId", "NguoiDungId");

            RenameColumnIfExists(migrationBuilder, "DoiThuongSuKien", "PointCost", "DiemYeuCau");

            RenameColumnIfExists(migrationBuilder, "DoiThuongSuKien", "EventTitle", "TieuDeSuKien");

            RenameColumnIfExists(migrationBuilder, "DoiThuongSuKien", "CreatedAt", "NgayTao");

            RenameColumnIfExists(migrationBuilder, "DangKySuKien", "UserId", "SuKienId");

            RenameColumnIfExists(migrationBuilder, "DangKySuKien", "UpdatedAt", "NgayTao");

            RenameColumnIfExists(migrationBuilder, "DangKySuKien", "Status", "TrangThai");

            RenameColumnIfExists(migrationBuilder, "DangKySuKien", "RegisteredAt", "NgayDangKy");

            RenameColumnIfExists(migrationBuilder, "DangKySuKien", "PointsUsed", "DiemDaDung");

            RenameColumnIfExists(migrationBuilder, "DangKySuKien", "EventId", "NguoiDungId");

            RenameColumnIfExists(migrationBuilder, "DangKySuKien", "CreatedAt", "NgayCapNhat");

            RenameColumnIfExists(migrationBuilder, "SuKienAnh", "IsCover", "AnhBia");

            RenameColumnIfExists(migrationBuilder, "SuKienAnh", "ImageUrl", "AnhUrl");

            RenameColumnIfExists(migrationBuilder, "SuKienAnh", "CreatedAt", "NgayTao");

            RenameIndexIfExists(migrationBuilder, "SuKienAnh", "IX_EventImage_SuKienId", "IX_SuKienAnh_SuKienId");

            RenameColumnIfExists(migrationBuilder, "SuKien", "UpdatedAt", "ThoiGianKetThuc");

            RenameColumnIfExists(migrationBuilder, "SuKien", "Type", "LoaiSuKien");

            RenameColumnIfExists(migrationBuilder, "SuKien", "Title", "TieuDe");

            RenameColumnIfExists(migrationBuilder, "SuKien", "Status", "TrangThai");

            RenameColumnIfExists(migrationBuilder, "SuKien", "StartAt", "ThoiGianBatDau");

            RenameColumnIfExists(migrationBuilder, "SuKien", "PointCost", "DiemYeuCau");

            RenameColumnIfExists(migrationBuilder, "SuKien", "Location", "DiaDiem");

            RenameColumnIfExists(migrationBuilder, "SuKien", "InstructorId", "GiangVienId");

            RenameColumnIfExists(migrationBuilder, "SuKien", "ImageUrl", "AnhUrl");

            RenameColumnIfExists(migrationBuilder, "SuKien", "EndAt", "NgayTao");

            RenameColumnIfExists(migrationBuilder, "SuKien", "Description", "MoTa");

            RenameColumnIfExists(migrationBuilder, "SuKien", "CreatedAt", "NgayCapNhat");

            RenameColumnIfExists(migrationBuilder, "SuKien", "Capacity", "SucChua");

            RenameIndexIfExists(migrationBuilder, "SuKien", "IX_Event_Status_StartAt", "IX_SuKien_TrangThai_ThoiGianBatDau");

            RenameIndexIfExists(migrationBuilder, "SuKien", "IX_Event_InstructorId", "IX_SuKien_GiangVienId");

            RenameColumnIfExists(migrationBuilder, "GhiDanh", "UserId", "NguoiDungId");

            RenameColumnIfExists(migrationBuilder, "GhiDanh", "UpdatedAt", "NgayTao");

            RenameColumnIfExists(migrationBuilder, "GhiDanh", "Progress", "TienDo");

            RenameColumnIfExists(migrationBuilder, "GhiDanh", "CreatedAt", "NgayCapNhat");

            RenameColumnIfExists(migrationBuilder, "GhiDanh", "CourseId", "KhoaHocId");

            RenameColumnIfExists(migrationBuilder, "GhiDanh", "CompletedAt", "NgayHoanThanh");

            RenameIndexIfExists(migrationBuilder, "GhiDanh", "IX_Enrollment_UserId_CourseId", "IX_GhiDanh_NguoiDungId_KhoaHocId");

            RenameIndexIfExists(migrationBuilder, "GhiDanh", "IX_Enrollment_CourseId", "IX_GhiDanh_KhoaHocId");

            RenameColumnIfExists(migrationBuilder, "DanhGiaKhoaHoc", "UserId", "NguoiDungId");

            RenameColumnIfExists(migrationBuilder, "DanhGiaKhoaHoc", "UpdatedAt", "NgayTao");

            RenameColumnIfExists(migrationBuilder, "DanhGiaKhoaHoc", "Rating", "DiemDanhGia");

            RenameColumnIfExists(migrationBuilder, "DanhGiaKhoaHoc", "CreatedAt", "NgayCapNhat");

            RenameColumnIfExists(migrationBuilder, "DanhGiaKhoaHoc", "CourseId", "KhoaHocId");

            RenameColumnIfExists(migrationBuilder, "DanhGiaKhoaHoc", "Comment", "BinhLuan");

            RenameIndexIfExists(migrationBuilder, "DanhGiaKhoaHoc", "IX_CourseReview_UserId_CourseId", "IX_DanhGiaKhoaHoc_NguoiDungId_KhoaHocId");

            RenameColumnIfExists(migrationBuilder, "KhoaHoc", "CreatedAt", "NgayTao");

            RenameColumnIfExists(migrationBuilder, "KhoaHoc", "TotalDurationSeconds", "TongThoiLuongGiay");

            RenameColumnIfExists(migrationBuilder, "KhoaHoc", "Title", "TieuDe");

            RenameColumnIfExists(migrationBuilder, "KhoaHoc", "Thumbnail", "MoTaNgan");

            RenameColumnIfExists(migrationBuilder, "KhoaHoc", "Status", "TrangThai");

            RenameColumnIfExists(migrationBuilder, "KhoaHoc", "Slug", "DuongDanThanThien");

            RenameColumnIfExists(migrationBuilder, "KhoaHoc", "ShortDescription", "MoTaChiTiet");

            RenameColumnIfExists(migrationBuilder, "KhoaHoc", "ReviewCount", "SoLuongDanhGia");

            RenameColumnIfExists(migrationBuilder, "KhoaHoc", "PublishedAt", "NgayXuatBan");

            RenameColumnIfExists(migrationBuilder, "KhoaHoc", "Price", "Gia");

            RenameColumnIfExists(migrationBuilder, "KhoaHoc", "MinimumMemberTier", "HangThanhVienToiThieu");

            RenameColumnIfExists(migrationBuilder, "KhoaHoc", "Level", "TrinhDo");

            RenameColumnIfExists(migrationBuilder, "KhoaHoc", "IsPublished", "DaXuatBan");

            RenameColumnIfExists(migrationBuilder, "KhoaHoc", "InstructorId", "GiangVienId");

            RenameColumnIfExists(migrationBuilder, "KhoaHoc", "DetailedDescription", "MoTa");

            RenameColumnIfExists(migrationBuilder, "KhoaHoc", "Description", "AnhDaiDien");

            RenameColumnIfExists(migrationBuilder, "KhoaHoc", "UpdatedAt", "NgayCapNhat");

            RenameColumnIfExists(migrationBuilder, "KhoaHoc", "Category", "ChuyenMuc");

            RenameColumnIfExists(migrationBuilder, "KhoaHoc", "AverageRating", "DiemDanhGiaTrungBinh");

            RenameColumnIfExists(migrationBuilder, "LichSuDungMaGiamGia", "UserId", "NguoiDungId");

            RenameColumnIfExists(migrationBuilder, "LichSuDungMaGiamGia", "CouponId", "MaGiamGiaId");

            RenameColumnIfExists(migrationBuilder, "LichSuDungMaGiamGia", "CreatedAt", "NgayTao");

            RenameColumnIfExists(migrationBuilder, "LichSuDungMaGiamGia", "CourseId", "KhoaHocId");

            RenameColumnIfExists(migrationBuilder, "LichSuDungMaGiamGia", "PurchaseId", "DonMuaId");

            RenameIndexIfExists(migrationBuilder, "LichSuDungMaGiamGia", "IX_CouponUsage_UserId", "IX_LichSuDungMaGiamGia_NguoiDungId");

            RenameIndexIfExists(migrationBuilder, "LichSuDungMaGiamGia", "IX_CouponUsage_CourseId", "IX_LichSuDungMaGiamGia_KhoaHocId");

            RenameColumnIfExists(migrationBuilder, "NguoiNhanMaGiamGia", "UserId", "NguoiDungId");

            RenameColumnIfExists(migrationBuilder, "NguoiNhanMaGiamGia", "CouponId", "MaGiamGiaId");

            RenameColumnIfExists(migrationBuilder, "NguoiNhanMaGiamGia", "CreatedAt", "NgayTao");

            RenameColumnIfExists(migrationBuilder, "NguoiNhanMaGiamGia", "TeacherId", "GiangVienId");

            RenameIndexIfExists(migrationBuilder, "NguoiNhanMaGiamGia", "IX_CouponRecipient_UserId", "IX_NguoiNhanMaGiamGia_NguoiDungId");

            RenameIndexIfExists(migrationBuilder, "NguoiNhanMaGiamGia", "IX_CouponRecipient_SourceCourseId", "IX_NguoiNhanMaGiamGia_SourceCourseId");

            RenameColumnIfExists(migrationBuilder, "MaGiamGia", "CreatedAt", "NgayTao");

            RenameColumnIfExists(migrationBuilder, "MaGiamGia", "CourseId", "KhoaHocId");

            RenameColumnIfExists(migrationBuilder, "MaGiamGia", "Status", "TrangThai");

            RenameColumnIfExists(migrationBuilder, "MaGiamGia", "IsActive", "HoatDong");

            RenameColumnIfExists(migrationBuilder, "MaGiamGia", "UpdatedAt", "NgayCapNhat");

            RenameColumnIfExists(migrationBuilder, "MaGiamGia", "TeacherId", "GiangVienId");

            RenameColumnIfExists(migrationBuilder, "MaGiamGia", "InstructorId", "GiangVienId");

            RenameColumnIfExists(migrationBuilder, "MaGiamGia", "Code", "Ma");

            RenameIndexIfExists(migrationBuilder, "MaGiamGia", "IX_Coupon_CourseId", "IX_MaGiamGia_KhoaHocId");

            RenameIndexIfExists(migrationBuilder, "MaGiamGia", "IX_Coupon_TeacherId", "IX_MaGiamGia_GiangVienId");

            RenameIndexIfExists(migrationBuilder, "MaGiamGia", "IX_Coupon_InstructorId", "IX_MaGiamGia_GiangVienId");

            RenameIndexIfExists(migrationBuilder, "MaGiamGia", "IX_Coupon_Code", "IX_MaGiamGia_Ma");

            RenameColumnIfExists(migrationBuilder, "NguoiThamGiaTroChuyen", "LastReadAt", "DocCuoiLuc");

            RenameColumnIfExists(migrationBuilder, "NguoiThamGiaTroChuyen", "JoinedAt", "NgayThamGia");

            RenameColumnIfExists(migrationBuilder, "NguoiThamGiaTroChuyen", "UserId", "NguoiDungId");

            RenameColumnIfExists(migrationBuilder, "NguoiThamGiaTroChuyen", "ConversationId", "CuocTroChuyenId");

            RenameIndexIfExists(migrationBuilder, "NguoiThamGiaTroChuyen", "IX_ConversationParticipant_UserId", "IX_NguoiThamGiaTroChuyen_NguoiDungId");

            RenameColumnIfExists(migrationBuilder, "CuocTroChuyen", "UpdatedAt", "NgayTao");

            RenameColumnIfExists(migrationBuilder, "CuocTroChuyen", "Title", "TieuDe");

            RenameColumnIfExists(migrationBuilder, "CuocTroChuyen", "IsGroup", "LaNhom");

            RenameColumnIfExists(migrationBuilder, "CuocTroChuyen", "CreatedAt", "NgayCapNhat");

            RenameColumnIfExists(migrationBuilder, "CuocTroChuyen", "CourseId", "KhoaHocId");

            RenameIndexIfExists(migrationBuilder, "CuocTroChuyen", "IX_Conversation_CourseId_ClassId_SubjectId", "IX_CuocTroChuyen_KhoaHocId_ClassId_SubjectId");

            RenameIndexIfExists(migrationBuilder, "CuocTroChuyen", "IX_Conversation_CourseId", "IX_CuocTroChuyen_KhoaHocId");

            RenameColumnIfExists(migrationBuilder, "BinhLuan", "UserId", "NguoiDungId");

            RenameColumnIfExists(migrationBuilder, "BinhLuan", "UpdatedAt", "NgayTao");

            RenameColumnIfExists(migrationBuilder, "BinhLuan", "ParentId", "BinhLuanChaId");

            RenameColumnIfExists(migrationBuilder, "BinhLuan", "LessonId", "BaiHocId");

            RenameColumnIfExists(migrationBuilder, "BinhLuan", "CreatedAt", "NgayCapNhat");

            RenameColumnIfExists(migrationBuilder, "BinhLuan", "Content", "NoiDung");

            RenameIndexIfExists(migrationBuilder, "BinhLuan", "IX_Comment_UserId", "IX_BinhLuan_NguoiDungId");

            RenameIndexIfExists(migrationBuilder, "BinhLuan", "IX_Comment_ParentId", "IX_BinhLuan_BinhLuanChaId");

            RenameIndexIfExists(migrationBuilder, "BinhLuan", "IX_Comment_LessonId", "IX_BinhLuan_BaiHocId");

            RenameColumnIfExists(migrationBuilder, "ChungChi", "VerifyCode", "SoChungChi");

            RenameColumnIfExists(migrationBuilder, "ChungChi", "UserId", "NguoiDungId");

            RenameColumnIfExists(migrationBuilder, "ChungChi", "IssuedAt", "NgayCap");

            RenameColumnIfExists(migrationBuilder, "ChungChi", "CourseId", "KhoaHocId");

            RenameColumnIfExists(migrationBuilder, "ChungChi", "CompletionSnapshot", "AnhChupHoanThanh");

            RenameColumnIfExists(migrationBuilder, "ChungChi", "CertificateNo", "MaXacThuc");

            RenameIndexIfExists(migrationBuilder, "ChungChi", "IX_Certificate_UserId_CourseId", "IX_ChungChi_NguoiDungId_KhoaHocId");

            RenameIndexIfExists(migrationBuilder, "ChungChi", "IX_Certificate_CourseId", "IX_ChungChi_KhoaHocId");

            RenameColumnIfExists(migrationBuilder, "NhatKyHeThong", "EntityType", "LoaiThucTe");

            RenameColumnIfExists(migrationBuilder, "NhatKyHeThong", "EntityId", "ThucTheId");

            RenameColumnIfExists(migrationBuilder, "NhatKyHeThong", "CreatedAt", "NgayTao");

            RenameColumnIfExists(migrationBuilder, "NhatKyHeThong", "ActorId", "NguoiThucHienId");

            RenameColumnIfExists(migrationBuilder, "NhatKyHeThong", "ActorEmail", "EmailNguoiThucHien");

            RenameColumnIfExists(migrationBuilder, "NhatKyHeThong", "Action", "HanhDong");

            RenameIndexIfExists(migrationBuilder, "NhatKyHeThong", "IX_AuditLog_EntityType_EntityId", "IX_NhatKyHeThong_LoaiThucTe_ThucTheId");

            RenameIndexIfExists(migrationBuilder, "NhatKyHeThong", "IX_AuditLog_ActorId_CreatedAt", "IX_NhatKyHeThong_NguoiThucHienId_NgayTao");

            RenameIndexIfExists(migrationBuilder, "NhatKyHeThong", "IX_AuditLog_Action_CreatedAt", "IX_NhatKyHeThong_HanhDong_NgayTao");

            RenameColumnIfExists(migrationBuilder, "BaiTap", "UpdatedAt", "NgayTao");

            RenameColumnIfExists(migrationBuilder, "BaiTap", "Title", "TieuDe");

            RenameColumnIfExists(migrationBuilder, "BaiTap", "TeacherId", "KhoaHocId");

            RenameColumnIfExists(migrationBuilder, "BaiTap", "MaxScore", "DiemToiDa");

            RenameColumnIfExists(migrationBuilder, "BaiTap", "LessonId", "BaiHocId");

            RenameColumnIfExists(migrationBuilder, "BaiTap", "DueDate", "HanNop");

            RenameColumnIfExists(migrationBuilder, "BaiTap", "Description", "MoTa");

            RenameColumnIfExists(migrationBuilder, "BaiTap", "CreatedAt", "NgayCapNhat");

            RenameColumnIfExists(migrationBuilder, "BaiTap", "CourseId", "GiangVienId");

            RenameColumnIfExists(migrationBuilder, "BaiTap", "AttachmentUrl", "FileDinhKemUrl");

            RenameColumnIfExists(migrationBuilder, "BaiTap", "AllowTextSubmission", "ChoPhepNopText");

            RenameColumnIfExists(migrationBuilder, "BaiTap", "AllowFileSubmission", "ChoPhepNopFile");

            RenameIndexIfExists(migrationBuilder, "BaiTap", "IX_Assignment_TeacherId", "IX_BaiTap_KhoaHocId");

            RenameIndexIfExists(migrationBuilder, "BaiTap", "IX_Assignment_LessonId", "IX_BaiTap_BaiHocId");

            RenameIndexIfExists(migrationBuilder, "BaiTap", "IX_Assignment_CourseId", "IX_BaiTap_GiangVienId");

            EnsureCouponAuxiliaryTables(migrationBuilder);

            migrationBuilder.AddPrimaryKey(
                name: "PK_GiaoDichVi",
                table: "GiaoDichVi",
                column: "Id");

            migrationBuilder.AddPrimaryKey(
                name: "PK_NguoiDung",
                table: "NguoiDung",
                column: "Id");

            migrationBuilder.AddPrimaryKey(
                name: "PK_ChuongHoc",
                table: "ChuongHoc",
                column: "Id");

            migrationBuilder.AddPrimaryKey(
                name: "PK_KhoaHocDaLuu",
                table: "KhoaHocDaLuu",
                column: "Id");

            migrationBuilder.AddPrimaryKey(
                name: "PK_CauHoiKiemTra",
                table: "CauHoiKiemTra",
                column: "Id");

            migrationBuilder.AddPrimaryKey(
                name: "PK_BaiKiemTra",
                table: "BaiKiemTra",
                column: "Id");

            migrationBuilder.AddPrimaryKey(
                name: "PK_ThongBao",
                table: "ThongBao",
                column: "Id");

            migrationBuilder.AddPrimaryKey(
                name: "PK_TinNhanDinhKem",
                table: "TinNhanDinhKem",
                column: "Id");

            migrationBuilder.AddPrimaryKey(
                name: "PK_TinNhan",
                table: "TinNhan",
                column: "Id");

            migrationBuilder.AddPrimaryKey(
                name: "PK_TienDoBaiHoc",
                table: "TienDoBaiHoc",
                column: "Id");

            migrationBuilder.AddPrimaryKey(
                name: "PK_BaiHoc",
                table: "BaiHoc",
                column: "Id");

            migrationBuilder.AddPrimaryKey(
                name: "PK_RutTienGiangVien",
                table: "RutTienGiangVien",
                column: "Id");

            migrationBuilder.AddPrimaryKey(
                name: "PK_DoiThuongSuKien",
                table: "DoiThuongSuKien",
                column: "Id");

            migrationBuilder.AddPrimaryKey(
                name: "PK_DangKySuKien",
                table: "DangKySuKien",
                column: "Id");

            migrationBuilder.AddPrimaryKey(
                name: "PK_SuKienAnh",
                table: "SuKienAnh",
                column: "Id");

            migrationBuilder.AddPrimaryKey(
                name: "PK_SuKien",
                table: "SuKien",
                column: "Id");

            migrationBuilder.AddPrimaryKey(
                name: "PK_GhiDanh",
                table: "GhiDanh",
                column: "Id");

            migrationBuilder.AddPrimaryKey(
                name: "PK_DanhGiaKhoaHoc",
                table: "DanhGiaKhoaHoc",
                column: "Id");

            migrationBuilder.AddPrimaryKey(
                name: "PK_KhoaHoc",
                table: "KhoaHoc",
                column: "Id");

            migrationBuilder.AddPrimaryKey(
                name: "PK_LichSuDungMaGiamGia",
                table: "LichSuDungMaGiamGia",
                column: "Id");

            migrationBuilder.AddPrimaryKey(
                name: "PK_NguoiNhanMaGiamGia",
                table: "NguoiNhanMaGiamGia",
                column: "Id");

            migrationBuilder.AddPrimaryKey(
                name: "PK_MaGiamGia",
                table: "MaGiamGia",
                column: "Id");

            migrationBuilder.AddPrimaryKey(
                name: "PK_NguoiThamGiaTroChuyen",
                table: "NguoiThamGiaTroChuyen",
                columns: new[] { "CuocTroChuyenId", "NguoiDungId" });

            migrationBuilder.AddPrimaryKey(
                name: "PK_CuocTroChuyen",
                table: "CuocTroChuyen",
                column: "Id");

            migrationBuilder.AddPrimaryKey(
                name: "PK_BinhLuan",
                table: "BinhLuan",
                column: "Id");

            migrationBuilder.AddPrimaryKey(
                name: "PK_ChungChi",
                table: "ChungChi",
                column: "Id");

            migrationBuilder.AddPrimaryKey(
                name: "PK_NhatKyHeThong",
                table: "NhatKyHeThong",
                column: "Id");

            migrationBuilder.AddPrimaryKey(
                name: "PK_BaiTap",
                table: "BaiTap",
                column: "Id");

            migrationBuilder.CreateTable(
                name: "BaiNopKiemTra",
                columns: table => new
                {
                    Id = table.Column<string>(type: "nvarchar(450)", nullable: false),
                    Diem = table.Column<double>(type: "float", nullable: false),
                    Dat = table.Column<bool>(type: "bit", nullable: false),
                    DapAn = table.Column<string>(type: "nvarchar(4000)", maxLength: 4000, nullable: false),
                    NguoiDungId = table.Column<string>(type: "nvarchar(450)", nullable: false),
                    BaiKiemTraId = table.Column<string>(type: "nvarchar(450)", nullable: false),
                    NgayTao = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_BaiNopKiemTra", x => x.Id);
                    table.ForeignKey(
                        name: "FK_BaiNopKiemTra_BaiKiemTra_BaiKiemTraId",
                        column: x => x.BaiKiemTraId,
                        principalTable: "BaiKiemTra",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_BaiNopKiemTra_NguoiDung_NguoiDungId",
                        column: x => x.NguoiDungId,
                        principalTable: "NguoiDung",
                        principalColumn: "Id");
                });

            migrationBuilder.CreateTable(
                name: "DonMua",
                columns: table => new
                {
                    Id = table.Column<string>(type: "nvarchar(450)", nullable: false),
                    SoTienGoc = table.Column<int>(type: "int", nullable: false),
                    SoTienGiam = table.Column<int>(type: "int", nullable: false, defaultValue: 0),
                    SoTienCuoi = table.Column<int>(type: "int", nullable: false),
                    LoaiTien = table.Column<string>(type: "nvarchar(max)", nullable: false, defaultValue: "VND"),
                    TrangThai = table.Column<string>(type: "nvarchar(max)", nullable: false, defaultValue: "COMPLETED"),
                    NguoiDungId = table.Column<string>(type: "nvarchar(450)", nullable: false),
                    KhoaHocId = table.Column<string>(type: "nvarchar(450)", nullable: false),
                    MaGiamGiaId = table.Column<string>(type: "nvarchar(450)", nullable: true),
                    NgayTao = table.Column<DateTime>(type: "datetime2", nullable: false),
                    NgayCapNhat = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_DonMua", x => x.Id);
                    table.ForeignKey(
                        name: "FK_DonMua_KhoaHoc_KhoaHocId",
                        column: x => x.KhoaHocId,
                        principalTable: "KhoaHoc",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_DonMua_MaGiamGia_MaGiamGiaId",
                        column: x => x.MaGiamGiaId,
                        principalTable: "MaGiamGia",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_DonMua_NguoiDung_NguoiDungId",
                        column: x => x.NguoiDungId,
                        principalTable: "NguoiDung",
                        principalColumn: "Id");
                });

            migrationBuilder.CreateTable(
                name: "ThanhToan",
                columns: table => new
                {
                    Id = table.Column<string>(type: "nvarchar(450)", nullable: false),
                    NhaCungCap = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    TrangThai = table.Column<string>(type: "nvarchar(450)", nullable: false, defaultValue: "PENDING"),
                    SoTien = table.Column<int>(type: "int", nullable: false),
                    LoaiTien = table.Column<string>(type: "nvarchar(max)", nullable: false, defaultValue: "VND"),
                    NoiDung = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    PhienNhaCungCapId = table.Column<string>(type: "nvarchar(450)", nullable: false),
                    MaThanhToanNhaCungCap = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    NgayHoanThanh = table.Column<DateTime>(type: "datetime2", nullable: true),
                    NguoiDungId = table.Column<string>(type: "nvarchar(450)", nullable: false),
                    NgayTao = table.Column<DateTime>(type: "datetime2", nullable: false),
                    NgayCapNhat = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ThanhToan", x => x.Id);
                    table.ForeignKey(
                        name: "FK_ThanhToan_NguoiDung_NguoiDungId",
                        column: x => x.NguoiDungId,
                        principalTable: "NguoiDung",
                        principalColumn: "Id");
                });

            migrationBuilder.CreateIndex(
                name: "IX_DoiThuongSuKien_NguoiDungId_PhanThuongId",
                table: "DoiThuongSuKien",
                columns: new[] { "NguoiDungId", "PhanThuongId" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_DangKySuKien_NguoiDungId_NgayDangKy",
                table: "DangKySuKien",
                columns: new[] { "NguoiDungId", "NgayDangKy" });

            migrationBuilder.CreateIndex(
                name: "IX_DangKySuKien_SuKienId_NguoiDungId",
                table: "DangKySuKien",
                columns: new[] { "SuKienId", "NguoiDungId" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_DanhGiaKhoaHoc_KhoaHocId_NgayTao",
                table: "DanhGiaKhoaHoc",
                columns: new[] { "KhoaHocId", "NgayTao" });

            migrationBuilder.CreateIndex(
                name: "IX_DanhGiaKhoaHoc_NguoiDungId_NgayTao",
                table: "DanhGiaKhoaHoc",
                columns: new[] { "NguoiDungId", "NgayTao" });

            migrationBuilder.CreateIndex(
                name: "IX_KhoaHoc_DuongDanThanThien",
                table: "KhoaHoc",
                column: "DuongDanThanThien",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_KhoaHoc_GiangVienId",
                table: "KhoaHoc",
                column: "GiangVienId");

            migrationBuilder.CreateIndex(
                name: "IX_LichSuDungMaGiamGia_DonMuaId",
                table: "LichSuDungMaGiamGia",
                column: "DonMuaId",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_LichSuDungMaGiamGia_MaGiamGiaId_NguoiDungId",
                table: "LichSuDungMaGiamGia",
                columns: new[] { "MaGiamGiaId", "NguoiDungId" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_NguoiNhanMaGiamGia_GiangVienId",
                table: "NguoiNhanMaGiamGia",
                column: "GiangVienId");

            migrationBuilder.CreateIndex(
                name: "IX_NguoiNhanMaGiamGia_MaGiamGiaId_NguoiDungId",
                table: "NguoiNhanMaGiamGia",
                columns: new[] { "MaGiamGiaId", "NguoiDungId" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_BaiNopKiemTra_BaiKiemTraId",
                table: "BaiNopKiemTra",
                column: "BaiKiemTraId");

            migrationBuilder.CreateIndex(
                name: "IX_BaiNopKiemTra_NguoiDungId",
                table: "BaiNopKiemTra",
                column: "NguoiDungId");

            migrationBuilder.CreateIndex(
                name: "IX_DonMua_KhoaHocId_NgayTao",
                table: "DonMua",
                columns: new[] { "KhoaHocId", "NgayTao" });

            migrationBuilder.CreateIndex(
                name: "IX_DonMua_MaGiamGiaId",
                table: "DonMua",
                column: "MaGiamGiaId");

            migrationBuilder.CreateIndex(
                name: "IX_DonMua_NguoiDungId_KhoaHocId",
                table: "DonMua",
                columns: new[] { "NguoiDungId", "KhoaHocId" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_DonMua_NguoiDungId_NgayTao",
                table: "DonMua",
                columns: new[] { "NguoiDungId", "NgayTao" });

            migrationBuilder.CreateIndex(
                name: "IX_ThanhToan_NguoiDungId_NgayTao",
                table: "ThanhToan",
                columns: new[] { "NguoiDungId", "NgayTao" });

            migrationBuilder.CreateIndex(
                name: "IX_ThanhToan_PhienNhaCungCapId",
                table: "ThanhToan",
                column: "PhienNhaCungCapId",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_ThanhToan_TrangThai_NgayTao",
                table: "ThanhToan",
                columns: new[] { "TrangThai", "NgayTao" });

            migrationBuilder.AddForeignKey(
                name: "FK_BaiHoc_ChuongHoc_ChuongHocId",
                table: "BaiHoc",
                column: "ChuongHocId",
                principalTable: "ChuongHoc",
                principalColumn: "Id");

            migrationBuilder.AddForeignKey(
                name: "FK_BaiHoc_KhoaHoc_KhoaHocId",
                table: "BaiHoc",
                column: "KhoaHocId",
                principalTable: "KhoaHoc",
                principalColumn: "Id");

            migrationBuilder.AddForeignKey(
                name: "FK_BaiKiemTra_BaiHoc_BaiHocId",
                table: "BaiKiemTra",
                column: "BaiHocId",
                principalTable: "BaiHoc",
                principalColumn: "Id");

            migrationBuilder.AddForeignKey(
                name: "FK_BaiTap_BaiHoc_BaiHocId",
                table: "BaiTap",
                column: "BaiHocId",
                principalTable: "BaiHoc",
                principalColumn: "Id");

            migrationBuilder.AddForeignKey(
                name: "FK_BaiTap_KhoaHoc_KhoaHocId",
                table: "BaiTap",
                column: "KhoaHocId",
                principalTable: "KhoaHoc",
                principalColumn: "Id");

            migrationBuilder.AddForeignKey(
                name: "FK_BaiTap_NguoiDung_GiangVienId",
                table: "BaiTap",
                column: "GiangVienId",
                principalTable: "NguoiDung",
                principalColumn: "Id");

            migrationBuilder.AddForeignKey(
                name: "FK_BinhLuan_BaiHoc_BaiHocId",
                table: "BinhLuan",
                column: "BaiHocId",
                principalTable: "BaiHoc",
                principalColumn: "Id");

            migrationBuilder.AddForeignKey(
                name: "FK_BinhLuan_BinhLuan_BinhLuanChaId",
                table: "BinhLuan",
                column: "BinhLuanChaId",
                principalTable: "BinhLuan",
                principalColumn: "Id");

            migrationBuilder.AddForeignKey(
                name: "FK_BinhLuan_NguoiDung_NguoiDungId",
                table: "BinhLuan",
                column: "NguoiDungId",
                principalTable: "NguoiDung",
                principalColumn: "Id");

            migrationBuilder.AddForeignKey(
                name: "FK_CauHoiKiemTra_BaiKiemTra_BaiKiemTraId",
                table: "CauHoiKiemTra",
                column: "BaiKiemTraId",
                principalTable: "BaiKiemTra",
                principalColumn: "Id");

            migrationBuilder.AddForeignKey(
                name: "FK_ChungChi_KhoaHoc_KhoaHocId",
                table: "ChungChi",
                column: "KhoaHocId",
                principalTable: "KhoaHoc",
                principalColumn: "Id");

            migrationBuilder.AddForeignKey(
                name: "FK_ChungChi_NguoiDung_NguoiDungId",
                table: "ChungChi",
                column: "NguoiDungId",
                principalTable: "NguoiDung",
                principalColumn: "Id");

            migrationBuilder.AddForeignKey(
                name: "FK_ChuongHoc_KhoaHoc_KhoaHocId",
                table: "ChuongHoc",
                column: "KhoaHocId",
                principalTable: "KhoaHoc",
                principalColumn: "Id");

            migrationBuilder.AddForeignKey(
                name: "FK_DangKySuKien_NguoiDung_NguoiDungId",
                table: "DangKySuKien",
                column: "NguoiDungId",
                principalTable: "NguoiDung",
                principalColumn: "Id");

            migrationBuilder.AddForeignKey(
                name: "FK_DangKySuKien_SuKien_SuKienId",
                table: "DangKySuKien",
                column: "SuKienId",
                principalTable: "SuKien",
                principalColumn: "Id");

            migrationBuilder.AddForeignKey(
                name: "FK_DanhGiaKhoaHoc_KhoaHoc_KhoaHocId",
                table: "DanhGiaKhoaHoc",
                column: "KhoaHocId",
                principalTable: "KhoaHoc",
                principalColumn: "Id");

            migrationBuilder.AddForeignKey(
                name: "FK_DanhGiaKhoaHoc_NguoiDung_NguoiDungId",
                table: "DanhGiaKhoaHoc",
                column: "NguoiDungId",
                principalTable: "NguoiDung",
                principalColumn: "Id");

            migrationBuilder.AddForeignKey(
                name: "FK_DoiThuongSuKien_NguoiDung_NguoiDungId",
                table: "DoiThuongSuKien",
                column: "NguoiDungId",
                principalTable: "NguoiDung",
                principalColumn: "Id");

            migrationBuilder.AddForeignKey(
                name: "FK_GhiDanh_KhoaHoc_KhoaHocId",
                table: "GhiDanh",
                column: "KhoaHocId",
                principalTable: "KhoaHoc",
                principalColumn: "Id");

            migrationBuilder.AddForeignKey(
                name: "FK_GhiDanh_NguoiDung_NguoiDungId",
                table: "GhiDanh",
                column: "NguoiDungId",
                principalTable: "NguoiDung",
                principalColumn: "Id");

            migrationBuilder.AddForeignKey(
                name: "FK_GiaoDichVi_DonMua_DonMuaId",
                table: "GiaoDichVi",
                column: "DonMuaId",
                principalTable: "DonMua",
                principalColumn: "Id");

            migrationBuilder.AddForeignKey(
                name: "FK_GiaoDichVi_KhoaHoc_KhoaHocId",
                table: "GiaoDichVi",
                column: "KhoaHocId",
                principalTable: "KhoaHoc",
                principalColumn: "Id");

            migrationBuilder.AddForeignKey(
                name: "FK_GiaoDichVi_NguoiDung_NguoiDungId",
                table: "GiaoDichVi",
                column: "NguoiDungId",
                principalTable: "NguoiDung",
                principalColumn: "Id");

            migrationBuilder.AddForeignKey(
                name: "FK_GiaoDichVi_ThanhToan_ThanhToanId",
                table: "GiaoDichVi",
                column: "ThanhToanId",
                principalTable: "ThanhToan",
                principalColumn: "Id");

            migrationBuilder.AddForeignKey(
                name: "FK_KhoaHoc_NguoiDung_GiangVienId",
                table: "KhoaHoc",
                column: "GiangVienId",
                principalTable: "NguoiDung",
                principalColumn: "Id");

            migrationBuilder.AddForeignKey(
                name: "FK_KhoaHocDaLuu_KhoaHoc_KhoaHocId",
                table: "KhoaHocDaLuu",
                column: "KhoaHocId",
                principalTable: "KhoaHoc",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_KhoaHocDaLuu_NguoiDung_NguoiDungId",
                table: "KhoaHocDaLuu",
                column: "NguoiDungId",
                principalTable: "NguoiDung",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_LichSuDungMaGiamGia_DonMua_DonMuaId",
                table: "LichSuDungMaGiamGia",
                column: "DonMuaId",
                principalTable: "DonMua",
                principalColumn: "Id");

            migrationBuilder.AddForeignKey(
                name: "FK_LichSuDungMaGiamGia_KhoaHoc_KhoaHocId",
                table: "LichSuDungMaGiamGia",
                column: "KhoaHocId",
                principalTable: "KhoaHoc",
                principalColumn: "Id");

            migrationBuilder.AddForeignKey(
                name: "FK_LichSuDungMaGiamGia_MaGiamGia_MaGiamGiaId",
                table: "LichSuDungMaGiamGia",
                column: "MaGiamGiaId",
                principalTable: "MaGiamGia",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_LichSuDungMaGiamGia_NguoiDung_NguoiDungId",
                table: "LichSuDungMaGiamGia",
                column: "NguoiDungId",
                principalTable: "NguoiDung",
                principalColumn: "Id");

            migrationBuilder.AddForeignKey(
                name: "FK_MaGiamGia_KhoaHoc_KhoaHocId",
                table: "MaGiamGia",
                column: "KhoaHocId",
                principalTable: "KhoaHoc",
                principalColumn: "Id");

            migrationBuilder.AddForeignKey(
                name: "FK_MaGiamGia_NguoiDung_GiangVienId",
                table: "MaGiamGia",
                column: "GiangVienId",
                principalTable: "NguoiDung",
                principalColumn: "Id");

            migrationBuilder.AddForeignKey(
                name: "FK_NguoiNhanMaGiamGia_KhoaHoc_SourceCourseId",
                table: "NguoiNhanMaGiamGia",
                column: "SourceCourseId",
                principalTable: "KhoaHoc",
                principalColumn: "Id");

            migrationBuilder.AddForeignKey(
                name: "FK_NguoiNhanMaGiamGia_MaGiamGia_MaGiamGiaId",
                table: "NguoiNhanMaGiamGia",
                column: "MaGiamGiaId",
                principalTable: "MaGiamGia",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_NguoiNhanMaGiamGia_NguoiDung_GiangVienId",
                table: "NguoiNhanMaGiamGia",
                column: "GiangVienId",
                principalTable: "NguoiDung",
                principalColumn: "Id");

            migrationBuilder.AddForeignKey(
                name: "FK_NguoiNhanMaGiamGia_NguoiDung_NguoiDungId",
                table: "NguoiNhanMaGiamGia",
                column: "NguoiDungId",
                principalTable: "NguoiDung",
                principalColumn: "Id");

            migrationBuilder.AddForeignKey(
                name: "FK_NguoiThamGiaTroChuyen_CuocTroChuyen_CuocTroChuyenId",
                table: "NguoiThamGiaTroChuyen",
                column: "CuocTroChuyenId",
                principalTable: "CuocTroChuyen",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_NguoiThamGiaTroChuyen_NguoiDung_NguoiDungId",
                table: "NguoiThamGiaTroChuyen",
                column: "NguoiDungId",
                principalTable: "NguoiDung",
                principalColumn: "Id");

            migrationBuilder.AddForeignKey(
                name: "FK_RutTienGiangVien_NguoiDung_GiangVienId",
                table: "RutTienGiangVien",
                column: "GiangVienId",
                principalTable: "NguoiDung",
                principalColumn: "Id");

            migrationBuilder.AddForeignKey(
                name: "FK_SuKien_NguoiDung_GiangVienId",
                table: "SuKien",
                column: "GiangVienId",
                principalTable: "NguoiDung",
                principalColumn: "Id");

            migrationBuilder.AddForeignKey(
                name: "FK_SuKienAnh_SuKien_SuKienId",
                table: "SuKienAnh",
                column: "SuKienId",
                principalTable: "SuKien",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_ThongBao_NguoiDung_NguoiDungId",
                table: "ThongBao",
                column: "NguoiDungId",
                principalTable: "NguoiDung",
                principalColumn: "Id");

            migrationBuilder.AddForeignKey(
                name: "FK_TienDoBaiHoc_BaiHoc_BaiHocId",
                table: "TienDoBaiHoc",
                column: "BaiHocId",
                principalTable: "BaiHoc",
                principalColumn: "Id");

            migrationBuilder.AddForeignKey(
                name: "FK_TienDoBaiHoc_NguoiDung_NguoiDungId",
                table: "TienDoBaiHoc",
                column: "NguoiDungId",
                principalTable: "NguoiDung",
                principalColumn: "Id");

            migrationBuilder.AddForeignKey(
                name: "FK_TinNhan_CuocTroChuyen_CuocTroChuyenId",
                table: "TinNhan",
                column: "CuocTroChuyenId",
                principalTable: "CuocTroChuyen",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_TinNhan_NguoiDung_NguoiGuiId",
                table: "TinNhan",
                column: "NguoiGuiId",
                principalTable: "NguoiDung",
                principalColumn: "Id");

            migrationBuilder.AddForeignKey(
                name: "FK_TinNhanDinhKem_TinNhan_TinNhanId",
                table: "TinNhanDinhKem",
                column: "TinNhanId",
                principalTable: "TinNhan",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            DropForeignKeyIfExists(migrationBuilder, "BaiHoc", "FK_BaiHoc_ChuongHoc_ChuongHocId");

            DropForeignKeyIfExists(migrationBuilder, "BaiHoc", "FK_BaiHoc_KhoaHoc_KhoaHocId");

            DropForeignKeyIfExists(migrationBuilder, "BaiKiemTra", "FK_BaiKiemTra_BaiHoc_BaiHocId");

            DropForeignKeyIfExists(migrationBuilder, "BaiTap", "FK_BaiTap_BaiHoc_BaiHocId");

            DropForeignKeyIfExists(migrationBuilder, "BaiTap", "FK_BaiTap_KhoaHoc_KhoaHocId");

            DropForeignKeyIfExists(migrationBuilder, "BaiTap", "FK_BaiTap_NguoiDung_GiangVienId");

            DropForeignKeyIfExists(migrationBuilder, "BinhLuan", "FK_BinhLuan_BaiHoc_BaiHocId");

            DropForeignKeyIfExists(migrationBuilder, "BinhLuan", "FK_BinhLuan_BinhLuan_BinhLuanChaId");

            DropForeignKeyIfExists(migrationBuilder, "BinhLuan", "FK_BinhLuan_NguoiDung_NguoiDungId");

            DropForeignKeyIfExists(migrationBuilder, "CauHoiKiemTra", "FK_CauHoiKiemTra_BaiKiemTra_BaiKiemTraId");

            DropForeignKeyIfExists(migrationBuilder, "ChungChi", "FK_ChungChi_KhoaHoc_KhoaHocId");

            DropForeignKeyIfExists(migrationBuilder, "ChungChi", "FK_ChungChi_NguoiDung_NguoiDungId");

            DropForeignKeyIfExists(migrationBuilder, "ChuongHoc", "FK_ChuongHoc_KhoaHoc_KhoaHocId");

            DropForeignKeyIfExists(migrationBuilder, "DangKySuKien", "FK_DangKySuKien_NguoiDung_NguoiDungId");

            DropForeignKeyIfExists(migrationBuilder, "DangKySuKien", "FK_DangKySuKien_SuKien_SuKienId");

            DropForeignKeyIfExists(migrationBuilder, "DanhGiaKhoaHoc", "FK_DanhGiaKhoaHoc_KhoaHoc_KhoaHocId");

            DropForeignKeyIfExists(migrationBuilder, "DanhGiaKhoaHoc", "FK_DanhGiaKhoaHoc_NguoiDung_NguoiDungId");

            DropForeignKeyIfExists(migrationBuilder, "DoiThuongSuKien", "FK_DoiThuongSuKien_NguoiDung_NguoiDungId");

            DropForeignKeyIfExists(migrationBuilder, "GhiDanh", "FK_GhiDanh_KhoaHoc_KhoaHocId");

            DropForeignKeyIfExists(migrationBuilder, "GhiDanh", "FK_GhiDanh_NguoiDung_NguoiDungId");

            DropForeignKeyIfExists(migrationBuilder, "GiaoDichVi", "FK_GiaoDichVi_DonMua_DonMuaId");

            DropForeignKeyIfExists(migrationBuilder, "GiaoDichVi", "FK_GiaoDichVi_KhoaHoc_KhoaHocId");

            DropForeignKeyIfExists(migrationBuilder, "GiaoDichVi", "FK_GiaoDichVi_NguoiDung_NguoiDungId");

            DropForeignKeyIfExists(migrationBuilder, "GiaoDichVi", "FK_GiaoDichVi_ThanhToan_ThanhToanId");

            DropForeignKeyIfExists(migrationBuilder, "KhoaHoc", "FK_KhoaHoc_NguoiDung_GiangVienId");

            DropForeignKeyIfExists(migrationBuilder, "KhoaHocDaLuu", "FK_KhoaHocDaLuu_KhoaHoc_KhoaHocId");

            DropForeignKeyIfExists(migrationBuilder, "KhoaHocDaLuu", "FK_KhoaHocDaLuu_NguoiDung_NguoiDungId");

            DropForeignKeyIfExists(migrationBuilder, "LichSuDungMaGiamGia", "FK_LichSuDungMaGiamGia_DonMua_DonMuaId");

            DropForeignKeyIfExists(migrationBuilder, "LichSuDungMaGiamGia", "FK_LichSuDungMaGiamGia_KhoaHoc_KhoaHocId");

            DropForeignKeyIfExists(migrationBuilder, "LichSuDungMaGiamGia", "FK_LichSuDungMaGiamGia_MaGiamGia_MaGiamGiaId");

            DropForeignKeyIfExists(migrationBuilder, "LichSuDungMaGiamGia", "FK_LichSuDungMaGiamGia_NguoiDung_NguoiDungId");

            DropForeignKeyIfExists(migrationBuilder, "MaGiamGia", "FK_MaGiamGia_KhoaHoc_KhoaHocId");

            DropForeignKeyIfExists(migrationBuilder, "MaGiamGia", "FK_MaGiamGia_NguoiDung_GiangVienId");

            DropForeignKeyIfExists(migrationBuilder, "NguoiNhanMaGiamGia", "FK_NguoiNhanMaGiamGia_KhoaHoc_SourceCourseId");

            DropForeignKeyIfExists(migrationBuilder, "NguoiNhanMaGiamGia", "FK_NguoiNhanMaGiamGia_MaGiamGia_MaGiamGiaId");

            DropForeignKeyIfExists(migrationBuilder, "NguoiNhanMaGiamGia", "FK_NguoiNhanMaGiamGia_NguoiDung_GiangVienId");

            DropForeignKeyIfExists(migrationBuilder, "NguoiNhanMaGiamGia", "FK_NguoiNhanMaGiamGia_NguoiDung_NguoiDungId");

            DropForeignKeyIfExists(migrationBuilder, "NguoiThamGiaTroChuyen", "FK_NguoiThamGiaTroChuyen_CuocTroChuyen_CuocTroChuyenId");

            DropForeignKeyIfExists(migrationBuilder, "NguoiThamGiaTroChuyen", "FK_NguoiThamGiaTroChuyen_NguoiDung_NguoiDungId");

            DropForeignKeyIfExists(migrationBuilder, "RutTienGiangVien", "FK_RutTienGiangVien_NguoiDung_GiangVienId");

            DropForeignKeyIfExists(migrationBuilder, "SuKien", "FK_SuKien_NguoiDung_GiangVienId");

            DropForeignKeyIfExists(migrationBuilder, "SuKienAnh", "FK_SuKienAnh_SuKien_SuKienId");

            DropForeignKeyIfExists(migrationBuilder, "ThongBao", "FK_ThongBao_NguoiDung_NguoiDungId");

            DropForeignKeyIfExists(migrationBuilder, "TienDoBaiHoc", "FK_TienDoBaiHoc_BaiHoc_BaiHocId");

            DropForeignKeyIfExists(migrationBuilder, "TienDoBaiHoc", "FK_TienDoBaiHoc_NguoiDung_NguoiDungId");

            DropForeignKeyIfExists(migrationBuilder, "TinNhan", "FK_TinNhan_CuocTroChuyen_CuocTroChuyenId");

            DropForeignKeyIfExists(migrationBuilder, "TinNhan", "FK_TinNhan_NguoiDung_NguoiGuiId");

            DropForeignKeyIfExists(migrationBuilder, "TinNhanDinhKem", "FK_TinNhanDinhKem_TinNhan_TinNhanId");

            DropTableIfExists(migrationBuilder, "BaiNopKiemTra");

            DropTableIfExists(migrationBuilder, "DonMua");

            DropTableIfExists(migrationBuilder, "ThanhToan");

            DropPrimaryKeyIfExists(migrationBuilder, "TinNhanDinhKem", "PK_TinNhanDinhKem");

            DropPrimaryKeyIfExists(migrationBuilder, "TinNhan", "PK_TinNhan");

            DropPrimaryKeyIfExists(migrationBuilder, "TienDoBaiHoc", "PK_TienDoBaiHoc");

            DropPrimaryKeyIfExists(migrationBuilder, "ThongBao", "PK_ThongBao");

            DropPrimaryKeyIfExists(migrationBuilder, "SuKienAnh", "PK_SuKienAnh");

            DropPrimaryKeyIfExists(migrationBuilder, "SuKien", "PK_SuKien");

            DropPrimaryKeyIfExists(migrationBuilder, "RutTienGiangVien", "PK_RutTienGiangVien");

            DropPrimaryKeyIfExists(migrationBuilder, "NhatKyHeThong", "PK_NhatKyHeThong");

            DropPrimaryKeyIfExists(migrationBuilder, "NguoiThamGiaTroChuyen", "PK_NguoiThamGiaTroChuyen");

            DropPrimaryKeyIfExists(migrationBuilder, "NguoiNhanMaGiamGia", "PK_NguoiNhanMaGiamGia");

            DropIndexIfExists(migrationBuilder, "NguoiNhanMaGiamGia", "IX_NguoiNhanMaGiamGia_GiangVienId");

            DropIndexIfExists(migrationBuilder, "NguoiNhanMaGiamGia", "IX_NguoiNhanMaGiamGia_MaGiamGiaId_NguoiDungId");

            DropPrimaryKeyIfExists(migrationBuilder, "NguoiDung", "PK_NguoiDung");

            DropPrimaryKeyIfExists(migrationBuilder, "MaGiamGia", "PK_MaGiamGia");

            DropPrimaryKeyIfExists(migrationBuilder, "LichSuDungMaGiamGia", "PK_LichSuDungMaGiamGia");

            DropIndexIfExists(migrationBuilder, "LichSuDungMaGiamGia", "IX_LichSuDungMaGiamGia_DonMuaId");

            DropIndexIfExists(migrationBuilder, "LichSuDungMaGiamGia", "IX_LichSuDungMaGiamGia_MaGiamGiaId_NguoiDungId");

            DropPrimaryKeyIfExists(migrationBuilder, "KhoaHocDaLuu", "PK_KhoaHocDaLuu");

            DropPrimaryKeyIfExists(migrationBuilder, "KhoaHoc", "PK_KhoaHoc");

            DropIndexIfExists(migrationBuilder, "KhoaHoc", "IX_KhoaHoc_DuongDanThanThien");

            DropIndexIfExists(migrationBuilder, "KhoaHoc", "IX_KhoaHoc_GiangVienId");

            DropPrimaryKeyIfExists(migrationBuilder, "GiaoDichVi", "PK_GiaoDichVi");

            DropPrimaryKeyIfExists(migrationBuilder, "GhiDanh", "PK_GhiDanh");

            DropPrimaryKeyIfExists(migrationBuilder, "DoiThuongSuKien", "PK_DoiThuongSuKien");

            DropIndexIfExists(migrationBuilder, "DoiThuongSuKien", "IX_DoiThuongSuKien_NguoiDungId_PhanThuongId");

            DropPrimaryKeyIfExists(migrationBuilder, "DanhGiaKhoaHoc", "PK_DanhGiaKhoaHoc");

            DropIndexIfExists(migrationBuilder, "DanhGiaKhoaHoc", "IX_DanhGiaKhoaHoc_KhoaHocId_NgayTao");

            DropIndexIfExists(migrationBuilder, "DanhGiaKhoaHoc", "IX_DanhGiaKhoaHoc_NguoiDungId_NgayTao");

            DropPrimaryKeyIfExists(migrationBuilder, "DangKySuKien", "PK_DangKySuKien");

            DropIndexIfExists(migrationBuilder, "DangKySuKien", "IX_DangKySuKien_NguoiDungId_NgayDangKy");

            DropIndexIfExists(migrationBuilder, "DangKySuKien", "IX_DangKySuKien_SuKienId_NguoiDungId");

            DropPrimaryKeyIfExists(migrationBuilder, "CuocTroChuyen", "PK_CuocTroChuyen");

            DropPrimaryKeyIfExists(migrationBuilder, "ChuongHoc", "PK_ChuongHoc");

            DropPrimaryKeyIfExists(migrationBuilder, "ChungChi", "PK_ChungChi");

            DropPrimaryKeyIfExists(migrationBuilder, "CauHoiKiemTra", "PK_CauHoiKiemTra");

            DropPrimaryKeyIfExists(migrationBuilder, "BinhLuan", "PK_BinhLuan");

            DropPrimaryKeyIfExists(migrationBuilder, "BaiTap", "PK_BaiTap");

            DropPrimaryKeyIfExists(migrationBuilder, "BaiKiemTra", "PK_BaiKiemTra");

            DropPrimaryKeyIfExists(migrationBuilder, "BaiHoc", "PK_BaiHoc");

            RenameTableIfExists(migrationBuilder, "TinNhanDinhKem", "MessageAttachment");

            RenameTableIfExists(migrationBuilder, "TinNhan", "Message");

            RenameTableIfExists(migrationBuilder, "TienDoBaiHoc", "LessonProgress");

            RenameTableIfExists(migrationBuilder, "ThongBao", "Notification");

            RenameTableIfExists(migrationBuilder, "SuKienAnh", "EventImage");

            RenameTableIfExists(migrationBuilder, "SuKien", "Event");

            RenameTableIfExists(migrationBuilder, "RutTienGiangVien", "InstructorWithdrawal");

            RenameTableIfExists(migrationBuilder, "NhatKyHeThong", "AuditLog");

            RenameTableIfExists(migrationBuilder, "NguoiThamGiaTroChuyen", "ConversationParticipant");

            RenameTableIfExists(migrationBuilder, "NguoiNhanMaGiamGia", "CouponRecipient");

            RenameTableIfExists(migrationBuilder, "NguoiDung", "User");

            RenameTableIfExists(migrationBuilder, "MaGiamGia", "Coupon");

            RenameTableIfExists(migrationBuilder, "LichSuDungMaGiamGia", "CouponUsage");

            RenameTableIfExists(migrationBuilder, "KhoaHocDaLuu", "SavedCourse");

            RenameTableIfExists(migrationBuilder, "KhoaHoc", "Course");

            RenameTableIfExists(migrationBuilder, "GiaoDichVi", "WalletTransaction");

            RenameTableIfExists(migrationBuilder, "GhiDanh", "Enrollment");

            RenameTableIfExists(migrationBuilder, "DoiThuongSuKien", "EventRewardRedemption");

            RenameTableIfExists(migrationBuilder, "DanhGiaKhoaHoc", "CourseReview");

            RenameTableIfExists(migrationBuilder, "DangKySuKien", "EventRegistration");

            RenameTableIfExists(migrationBuilder, "CuocTroChuyen", "Conversation");

            RenameTableIfExists(migrationBuilder, "ChuongHoc", "Section");

            RenameTableIfExists(migrationBuilder, "ChungChi", "Certificate");

            RenameTableIfExists(migrationBuilder, "CauHoiKiemTra", "QuizQuestion");

            RenameTableIfExists(migrationBuilder, "BinhLuan", "Comment");

            RenameTableIfExists(migrationBuilder, "BaiTap", "Assignment");

            RenameTableIfExists(migrationBuilder, "BaiKiemTra", "Quiz");

            RenameTableIfExists(migrationBuilder, "BaiHoc", "Lesson");

            RenameColumnIfExists(migrationBuilder, "MessageAttachment", "TinNhanId", "MessageId");

            RenameColumnIfExists(migrationBuilder, "MessageAttachment", "TenFileGoc", "OriginalFileName");

            RenameColumnIfExists(migrationBuilder, "MessageAttachment", "TenFile", "FileName");

            RenameColumnIfExists(migrationBuilder, "MessageAttachment", "NgayTao", "CreatedAt");

            RenameColumnIfExists(migrationBuilder, "MessageAttachment", "LoaiNoiDung", "ContentType");

            RenameColumnIfExists(migrationBuilder, "MessageAttachment", "KichThuoc", "Size");

            RenameIndexIfExists(migrationBuilder, "MessageAttachment", "IX_TinNhanDinhKem_TinNhanId", "IX_MessageAttachment_MessageId");

            RenameColumnIfExists(migrationBuilder, "Message", "NoiDung", "Content");

            RenameColumnIfExists(migrationBuilder, "Message", "NguoiGuiId", "SenderId");

            RenameColumnIfExists(migrationBuilder, "Message", "GuiLuc", "SentAt");

            RenameColumnIfExists(migrationBuilder, "Message", "CuocTroChuyenId", "ConversationId");

            RenameIndexIfExists(migrationBuilder, "Message", "IX_TinNhan_NguoiGuiId", "IX_Message_SenderId");

            RenameIndexIfExists(migrationBuilder, "Message", "IX_TinNhan_GuiLuc", "IX_Message_SentAt");

            RenameIndexIfExists(migrationBuilder, "Message", "IX_TinNhan_CuocTroChuyenId", "IX_Message_ConversationId");

            RenameColumnIfExists(migrationBuilder, "LessonProgress", "ViTriXemCuoiGiay", "WatchedSeconds");

            RenameColumnIfExists(migrationBuilder, "LessonProgress", "TyLeHoanThanh", "CompletionRate");

            RenameColumnIfExists(migrationBuilder, "LessonProgress", "NguoiDungId", "UserId");

            RenameColumnIfExists(migrationBuilder, "LessonProgress", "NgayTao", "UpdatedAt");

            RenameColumnIfExists(migrationBuilder, "LessonProgress", "NgayHoanThanh", "CompletedAt");

            RenameColumnIfExists(migrationBuilder, "LessonProgress", "NgayCapNhat", "CreatedAt");

            RenameColumnIfExists(migrationBuilder, "LessonProgress", "GiayDaXem", "LastPositionSeconds");

            RenameColumnIfExists(migrationBuilder, "LessonProgress", "DaHoanThanh", "IsCompleted");

            RenameColumnIfExists(migrationBuilder, "LessonProgress", "BaiHocId", "LessonId");

            RenameIndexIfExists(migrationBuilder, "LessonProgress", "IX_TienDoBaiHoc_NguoiDungId_DaHoanThanh", "IX_LessonProgress_UserId_IsCompleted");

            RenameIndexIfExists(migrationBuilder, "LessonProgress", "IX_TienDoBaiHoc_NguoiDungId_BaiHocId", "IX_LessonProgress_UserId_LessonId");

            RenameIndexIfExists(migrationBuilder, "LessonProgress", "IX_TienDoBaiHoc_NguoiDungId", "IX_LessonProgress_UserId");

            RenameIndexIfExists(migrationBuilder, "LessonProgress", "IX_TienDoBaiHoc_BaiHocId", "IX_LessonProgress_LessonId");

            RenameColumnIfExists(migrationBuilder, "Notification", "TieuDe", "Type");

            RenameColumnIfExists(migrationBuilder, "Notification", "NoiDung", "Title");

            RenameColumnIfExists(migrationBuilder, "Notification", "NguoiDungId", "UserId");

            RenameColumnIfExists(migrationBuilder, "Notification", "NgayTao", "CreatedAt");

            RenameColumnIfExists(migrationBuilder, "Notification", "LoaiThongBao", "Body");

            RenameColumnIfExists(migrationBuilder, "Notification", "DuongDan", "Link");

            RenameColumnIfExists(migrationBuilder, "Notification", "DocLuc", "ReadAt");

            RenameColumnIfExists(migrationBuilder, "Notification", "DaDoc", "IsRead");

            RenameIndexIfExists(migrationBuilder, "Notification", "IX_ThongBao_NguoiDungId_DaDoc_NgayTao", "IX_Notification_UserId_IsRead_CreatedAt");

            RenameColumnIfExists(migrationBuilder, "EventImage", "NgayTao", "CreatedAt");

            RenameColumnIfExists(migrationBuilder, "EventImage", "AnhUrl", "ImageUrl");

            RenameColumnIfExists(migrationBuilder, "EventImage", "AnhBia", "IsCover");

            RenameIndexIfExists(migrationBuilder, "EventImage", "IX_SuKienAnh_SuKienId", "IX_EventImage_SuKienId");

            RenameColumnIfExists(migrationBuilder, "Event", "TrangThai", "Status");

            RenameColumnIfExists(migrationBuilder, "Event", "TieuDe", "Title");

            RenameColumnIfExists(migrationBuilder, "Event", "ThoiGianKetThuc", "UpdatedAt");

            RenameColumnIfExists(migrationBuilder, "Event", "ThoiGianBatDau", "StartAt");

            RenameColumnIfExists(migrationBuilder, "Event", "SucChua", "Capacity");

            RenameColumnIfExists(migrationBuilder, "Event", "NgayTao", "EndAt");

            RenameColumnIfExists(migrationBuilder, "Event", "NgayCapNhat", "CreatedAt");

            RenameColumnIfExists(migrationBuilder, "Event", "MoTa", "Description");

            RenameColumnIfExists(migrationBuilder, "Event", "LoaiSuKien", "Type");

            RenameColumnIfExists(migrationBuilder, "Event", "GiangVienId", "InstructorId");

            RenameColumnIfExists(migrationBuilder, "Event", "DiemYeuCau", "PointCost");

            RenameColumnIfExists(migrationBuilder, "Event", "DiaDiem", "Location");

            RenameColumnIfExists(migrationBuilder, "Event", "AnhUrl", "ImageUrl");

            RenameIndexIfExists(migrationBuilder, "Event", "IX_SuKien_TrangThai_ThoiGianBatDau", "IX_Event_Status_StartAt");

            RenameIndexIfExists(migrationBuilder, "Event", "IX_SuKien_GiangVienId", "IX_Event_InstructorId");

            RenameColumnIfExists(migrationBuilder, "InstructorWithdrawal", "TrangThai", "Status");

            RenameColumnIfExists(migrationBuilder, "InstructorWithdrawal", "TenNganHang", "BankName");

            RenameColumnIfExists(migrationBuilder, "InstructorWithdrawal", "SoTien", "Amount");

            RenameColumnIfExists(migrationBuilder, "InstructorWithdrawal", "SoTaiKhoan", "AccountNumber");

            RenameColumnIfExists(migrationBuilder, "InstructorWithdrawal", "NoiDung", "Note");

            RenameColumnIfExists(migrationBuilder, "InstructorWithdrawal", "NgayTao", "CreatedAt");

            RenameColumnIfExists(migrationBuilder, "InstructorWithdrawal", "GiangVienId", "InstructorId");

            RenameColumnIfExists(migrationBuilder, "InstructorWithdrawal", "ChuTaiKhoan", "AccountHolder");

            RenameIndexIfExists(migrationBuilder, "InstructorWithdrawal", "IX_RutTienGiangVien_GiangVienId_NgayTao", "IX_InstructorWithdrawal_InstructorId_CreatedAt");

            RenameColumnIfExists(migrationBuilder, "AuditLog", "ThucTheId", "EntityId");

            RenameColumnIfExists(migrationBuilder, "AuditLog", "NguoiThucHienId", "ActorId");

            RenameColumnIfExists(migrationBuilder, "AuditLog", "NgayTao", "CreatedAt");

            RenameColumnIfExists(migrationBuilder, "AuditLog", "LoaiThucTe", "EntityType");

            RenameColumnIfExists(migrationBuilder, "AuditLog", "HanhDong", "Action");

            RenameColumnIfExists(migrationBuilder, "AuditLog", "EmailNguoiThucHien", "ActorEmail");

            RenameIndexIfExists(migrationBuilder, "AuditLog", "IX_NhatKyHeThong_NguoiThucHienId_NgayTao", "IX_AuditLog_ActorId_CreatedAt");

            RenameIndexIfExists(migrationBuilder, "AuditLog", "IX_NhatKyHeThong_LoaiThucTe_ThucTheId", "IX_AuditLog_EntityType_EntityId");

            RenameIndexIfExists(migrationBuilder, "AuditLog", "IX_NhatKyHeThong_HanhDong_NgayTao", "IX_AuditLog_Action_CreatedAt");

            RenameColumnIfExists(migrationBuilder, "ConversationParticipant", "NgayThamGia", "JoinedAt");

            RenameColumnIfExists(migrationBuilder, "ConversationParticipant", "DocCuoiLuc", "LastReadAt");

            RenameColumnIfExists(migrationBuilder, "ConversationParticipant", "NguoiDungId", "UserId");

            RenameColumnIfExists(migrationBuilder, "ConversationParticipant", "CuocTroChuyenId", "ConversationId");

            RenameIndexIfExists(migrationBuilder, "ConversationParticipant", "IX_NguoiThamGiaTroChuyen_NguoiDungId", "IX_ConversationParticipant_UserId");

            RenameColumnIfExists(migrationBuilder, "CouponRecipient", "NguoiDungId", "UserId");

            RenameColumnIfExists(migrationBuilder, "CouponRecipient", "NgayTao", "CreatedAt");

            RenameColumnIfExists(migrationBuilder, "CouponRecipient", "MaGiamGiaId", "CouponId");

            RenameColumnIfExists(migrationBuilder, "CouponRecipient", "GiangVienId", "TeacherId");

            RenameIndexIfExists(migrationBuilder, "CouponRecipient", "IX_NguoiNhanMaGiamGia_SourceCourseId", "IX_CouponRecipient_SourceCourseId");

            RenameIndexIfExists(migrationBuilder, "CouponRecipient", "IX_NguoiNhanMaGiamGia_NguoiDungId", "IX_CouponRecipient_UserId");

            RenameColumnIfExists(migrationBuilder, "User", "VaiTro", "Role");

            RenameColumnIfExists(migrationBuilder, "User", "TuanNhanThuongMuaCuoi", "LastPurchaseRewardWeek");

            RenameColumnIfExists(migrationBuilder, "User", "TongChiTieu", "WalletBalance");

            RenameColumnIfExists(migrationBuilder, "User", "TieuSu", "Settings");

            RenameColumnIfExists(migrationBuilder, "User", "Ten", "Password");

            RenameColumnIfExists(migrationBuilder, "User", "SoDuVi", "TotalSpent");

            RenameColumnIfExists(migrationBuilder, "User", "SoDienThoai", "Phone");

            RenameColumnIfExists(migrationBuilder, "User", "NgayTao", "UpdatedAt");

            RenameColumnIfExists(migrationBuilder, "User", "NgayNhanThuongDangNhapCuoi", "LastSeenAt");

            RenameColumnIfExists(migrationBuilder, "User", "NgayNhanThuongBaiHocCuoi", "LastRewardLoginDate");

            RenameColumnIfExists(migrationBuilder, "User", "NgayCapNhat", "CreatedAt");

            RenameColumnIfExists(migrationBuilder, "User", "MatKhau", "Name");

            RenameColumnIfExists(migrationBuilder, "User", "LanCuoiHoatDong", "LastLessonRewardDate");

            RenameColumnIfExists(migrationBuilder, "User", "HangThanhVien", "MemberTier");

            RenameColumnIfExists(migrationBuilder, "User", "DiemThuong", "RewardPoints");

            RenameColumnIfExists(migrationBuilder, "User", "ChuoiDangNhap", "LoginStreak");

            RenameColumnIfExists(migrationBuilder, "User", "CaiDat", "Bio");

            RenameColumnIfExists(migrationBuilder, "User", "AnhDaiDien", "Avatar");

            RenameIndexIfExists(migrationBuilder, "User", "IX_NguoiDung_Email", "IX_User_Email");

            RenameColumnIfExists(migrationBuilder, "Coupon", "TrangThai", "Status");

            RenameColumnIfExists(migrationBuilder, "Coupon", "NgayTao", "CreatedAt");

            RenameColumnIfExists(migrationBuilder, "Coupon", "NgayCapNhat", "UpdatedAt");

            RenameColumnIfExists(migrationBuilder, "Coupon", "Ma", "Code");

            RenameColumnIfExists(migrationBuilder, "Coupon", "KhoaHocId", "CourseId");

            RenameColumnIfExists(migrationBuilder, "Coupon", "HoatDong", "IsActive");

            RenameColumnIfExists(migrationBuilder, "Coupon", "GiangVienId", "TeacherId");

            RenameIndexIfExists(migrationBuilder, "Coupon", "IX_MaGiamGia_Ma", "IX_Coupon_Code");

            RenameIndexIfExists(migrationBuilder, "Coupon", "IX_MaGiamGia_KhoaHocId", "IX_Coupon_CourseId");

            RenameIndexIfExists(migrationBuilder, "Coupon", "IX_MaGiamGia_GiangVienId", "IX_Coupon_TeacherId");

            RenameColumnIfExists(migrationBuilder, "CouponUsage", "NguoiDungId", "UserId");

            RenameColumnIfExists(migrationBuilder, "CouponUsage", "NgayTao", "CreatedAt");

            RenameColumnIfExists(migrationBuilder, "CouponUsage", "MaGiamGiaId", "CouponId");

            RenameColumnIfExists(migrationBuilder, "CouponUsage", "KhoaHocId", "CourseId");

            RenameColumnIfExists(migrationBuilder, "CouponUsage", "DonMuaId", "PurchaseId");

            RenameIndexIfExists(migrationBuilder, "CouponUsage", "IX_LichSuDungMaGiamGia_NguoiDungId", "IX_CouponUsage_UserId");

            RenameIndexIfExists(migrationBuilder, "CouponUsage", "IX_LichSuDungMaGiamGia_KhoaHocId", "IX_CouponUsage_CourseId");

            RenameColumnIfExists(migrationBuilder, "SavedCourse", "NguoiDungId", "UserId");

            RenameColumnIfExists(migrationBuilder, "SavedCourse", "NgayTao", "CreatedAt");

            RenameColumnIfExists(migrationBuilder, "SavedCourse", "KhoaHocId", "CourseId");

            RenameIndexIfExists(migrationBuilder, "SavedCourse", "IX_KhoaHocDaLuu_NguoiDungId_NgayTao", "IX_SavedCourse_UserId_CreatedAt");

            RenameIndexIfExists(migrationBuilder, "SavedCourse", "IX_KhoaHocDaLuu_NguoiDungId_KhoaHocId", "IX_SavedCourse_UserId_CourseId");

            RenameIndexIfExists(migrationBuilder, "SavedCourse", "IX_KhoaHocDaLuu_KhoaHocId", "IX_SavedCourse_CourseId");

            RenameColumnIfExists(migrationBuilder, "Course", "TrinhDo", "Level");

            RenameColumnIfExists(migrationBuilder, "Course", "TrangThai", "Status");

            RenameColumnIfExists(migrationBuilder, "Course", "TongThoiLuongGiay", "TotalDurationSeconds");

            RenameColumnIfExists(migrationBuilder, "Course", "TieuDe", "Title");

            RenameColumnIfExists(migrationBuilder, "Course", "SoLuongDanhGia", "ReviewCount");

            RenameColumnIfExists(migrationBuilder, "Course", "NgayXuatBan", "PublishedAt");

            RenameColumnIfExists(migrationBuilder, "Course", "NgayTao", "CreatedAt");

            RenameColumnIfExists(migrationBuilder, "Course", "NgayCapNhat", "UpdatedAt");

            RenameColumnIfExists(migrationBuilder, "Course", "MoTaNgan", "Thumbnail");

            RenameColumnIfExists(migrationBuilder, "Course", "MoTaChiTiet", "ShortDescription");

            RenameColumnIfExists(migrationBuilder, "Course", "MoTa", "DetailedDescription");

            RenameColumnIfExists(migrationBuilder, "Course", "HangThanhVienToiThieu", "MinimumMemberTier");

            RenameColumnIfExists(migrationBuilder, "Course", "DuongDanThanThien", "Slug");

            RenameColumnIfExists(migrationBuilder, "Course", "Gia", "Price");

            RenameColumnIfExists(migrationBuilder, "Course", "GiangVienId", "InstructorId");

            RenameColumnIfExists(migrationBuilder, "Course", "DiemDanhGiaTrungBinh", "AverageRating");

            RenameColumnIfExists(migrationBuilder, "Course", "DaXuatBan", "IsPublished");

            RenameColumnIfExists(migrationBuilder, "Course", "ChuyenMuc", "Category");

            RenameColumnIfExists(migrationBuilder, "Course", "AnhDaiDien", "Description");

            RenameColumnIfExists(migrationBuilder, "WalletTransaction", "TrangThai", "Status");

            RenameColumnIfExists(migrationBuilder, "WalletTransaction", "ThanhToanId", "PurchaseId");

            RenameColumnIfExists(migrationBuilder, "WalletTransaction", "SoTien", "BalanceAfter");

            RenameColumnIfExists(migrationBuilder, "WalletTransaction", "SoDuSauGiaoDich", "Amount");

            RenameColumnIfExists(migrationBuilder, "WalletTransaction", "NoiDung", "Note");

            RenameColumnIfExists(migrationBuilder, "WalletTransaction", "NguoiDungId", "UserId");

            RenameColumnIfExists(migrationBuilder, "WalletTransaction", "NgayTao", "CreatedAt");

            RenameColumnIfExists(migrationBuilder, "WalletTransaction", "LoaiGiaoDich", "Type");

            RenameColumnIfExists(migrationBuilder, "WalletTransaction", "KhoaHocId", "ExternalPaymentId");

            RenameColumnIfExists(migrationBuilder, "WalletTransaction", "DonMuaId", "CourseId");

            RenameIndexIfExists(migrationBuilder, "WalletTransaction", "IX_GiaoDichVi_ThanhToanId", "IX_WalletTransaction_PurchaseId");

            RenameIndexIfExists(migrationBuilder, "WalletTransaction", "IX_GiaoDichVi_NguoiDungId_NgayTao", "IX_WalletTransaction_UserId_CreatedAt");

            RenameIndexIfExists(migrationBuilder, "WalletTransaction", "IX_GiaoDichVi_LoaiGiaoDich_NgayTao", "IX_WalletTransaction_Type_CreatedAt");

            RenameIndexIfExists(migrationBuilder, "WalletTransaction", "IX_GiaoDichVi_KhoaHocId", "IX_WalletTransaction_ExternalPaymentId");

            RenameIndexIfExists(migrationBuilder, "WalletTransaction", "IX_GiaoDichVi_DonMuaId", "IX_WalletTransaction_CourseId");

            RenameColumnIfExists(migrationBuilder, "Enrollment", "TienDo", "Progress");

            RenameColumnIfExists(migrationBuilder, "Enrollment", "NguoiDungId", "UserId");

            RenameColumnIfExists(migrationBuilder, "Enrollment", "NgayTao", "UpdatedAt");

            RenameColumnIfExists(migrationBuilder, "Enrollment", "NgayHoanThanh", "CompletedAt");

            RenameColumnIfExists(migrationBuilder, "Enrollment", "NgayCapNhat", "CreatedAt");

            RenameColumnIfExists(migrationBuilder, "Enrollment", "KhoaHocId", "CourseId");

            RenameIndexIfExists(migrationBuilder, "Enrollment", "IX_GhiDanh_NguoiDungId_KhoaHocId", "IX_Enrollment_UserId_CourseId");

            RenameIndexIfExists(migrationBuilder, "Enrollment", "IX_GhiDanh_KhoaHocId", "IX_Enrollment_CourseId");

            RenameColumnIfExists(migrationBuilder, "EventRewardRedemption", "TieuDeSuKien", "EventTitle");

            RenameColumnIfExists(migrationBuilder, "EventRewardRedemption", "PhanThuongId", "UserId");

            RenameColumnIfExists(migrationBuilder, "EventRewardRedemption", "NguoiDungId", "RewardId");

            RenameColumnIfExists(migrationBuilder, "EventRewardRedemption", "NgayTao", "CreatedAt");

            RenameColumnIfExists(migrationBuilder, "EventRewardRedemption", "DiemYeuCau", "PointCost");

            RenameColumnIfExists(migrationBuilder, "CourseReview", "NguoiDungId", "UserId");

            RenameColumnIfExists(migrationBuilder, "CourseReview", "NgayTao", "UpdatedAt");

            RenameColumnIfExists(migrationBuilder, "CourseReview", "NgayCapNhat", "CreatedAt");

            RenameColumnIfExists(migrationBuilder, "CourseReview", "KhoaHocId", "CourseId");

            RenameColumnIfExists(migrationBuilder, "CourseReview", "DiemDanhGia", "Rating");

            RenameColumnIfExists(migrationBuilder, "CourseReview", "BinhLuan", "Comment");

            RenameIndexIfExists(migrationBuilder, "CourseReview", "IX_DanhGiaKhoaHoc_NguoiDungId_KhoaHocId", "IX_CourseReview_UserId_CourseId");

            RenameColumnIfExists(migrationBuilder, "EventRegistration", "TrangThai", "Status");

            RenameColumnIfExists(migrationBuilder, "EventRegistration", "SuKienId", "UserId");

            RenameColumnIfExists(migrationBuilder, "EventRegistration", "NguoiDungId", "EventId");

            RenameColumnIfExists(migrationBuilder, "EventRegistration", "NgayTao", "UpdatedAt");

            RenameColumnIfExists(migrationBuilder, "EventRegistration", "NgayDangKy", "RegisteredAt");

            RenameColumnIfExists(migrationBuilder, "EventRegistration", "NgayCapNhat", "CreatedAt");

            RenameColumnIfExists(migrationBuilder, "EventRegistration", "DiemDaDung", "PointsUsed");

            RenameColumnIfExists(migrationBuilder, "Conversation", "TieuDe", "Title");

            RenameColumnIfExists(migrationBuilder, "Conversation", "NgayTao", "UpdatedAt");

            RenameColumnIfExists(migrationBuilder, "Conversation", "NgayCapNhat", "CreatedAt");

            RenameColumnIfExists(migrationBuilder, "Conversation", "LaNhom", "IsGroup");

            RenameColumnIfExists(migrationBuilder, "Conversation", "KhoaHocId", "CourseId");

            RenameIndexIfExists(migrationBuilder, "Conversation", "IX_CuocTroChuyen_KhoaHocId_ClassId_SubjectId", "IX_Conversation_CourseId_ClassId_SubjectId");

            RenameIndexIfExists(migrationBuilder, "Conversation", "IX_CuocTroChuyen_KhoaHocId", "IX_Conversation_CourseId");

            RenameColumnIfExists(migrationBuilder, "Section", "TieuDe", "Title");

            RenameColumnIfExists(migrationBuilder, "Section", "ThuTu", "Position");

            RenameColumnIfExists(migrationBuilder, "Section", "NgayTao", "UpdatedAt");

            RenameColumnIfExists(migrationBuilder, "Section", "NgayCapNhat", "CreatedAt");

            RenameColumnIfExists(migrationBuilder, "Section", "MoTa", "Description");

            RenameColumnIfExists(migrationBuilder, "Section", "KhoaHocId", "CourseId");

            RenameIndexIfExists(migrationBuilder, "Section", "IX_ChuongHoc_KhoaHocId", "IX_Section_CourseId");

            RenameColumnIfExists(migrationBuilder, "Certificate", "SoChungChi", "VerifyCode");

            RenameColumnIfExists(migrationBuilder, "Certificate", "NguoiDungId", "UserId");

            RenameColumnIfExists(migrationBuilder, "Certificate", "NgayCap", "IssuedAt");

            RenameColumnIfExists(migrationBuilder, "Certificate", "MaXacThuc", "CertificateNo");

            RenameColumnIfExists(migrationBuilder, "Certificate", "KhoaHocId", "CourseId");

            RenameColumnIfExists(migrationBuilder, "Certificate", "AnhChupHoanThanh", "CompletionSnapshot");

            RenameIndexIfExists(migrationBuilder, "Certificate", "IX_ChungChi_NguoiDungId_KhoaHocId", "IX_Certificate_UserId_CourseId");

            RenameIndexIfExists(migrationBuilder, "Certificate", "IX_ChungChi_KhoaHocId", "IX_Certificate_CourseId");

            RenameColumnIfExists(migrationBuilder, "QuizQuestion", "ThuTu", "Position");

            RenameColumnIfExists(migrationBuilder, "QuizQuestion", "NoiDungCauHoi", "QuestionText");

            RenameColumnIfExists(migrationBuilder, "QuizQuestion", "NgayTao", "UpdatedAt");

            RenameColumnIfExists(migrationBuilder, "QuizQuestion", "NgayCapNhat", "CreatedAt");

            RenameColumnIfExists(migrationBuilder, "QuizQuestion", "GiaiThich", "Explanation");

            RenameColumnIfExists(migrationBuilder, "QuizQuestion", "DapAnDungIndex", "CorrectOptionIndex");

            RenameColumnIfExists(migrationBuilder, "QuizQuestion", "CacLuaChon", "Options");

            RenameColumnIfExists(migrationBuilder, "QuizQuestion", "BaiKiemTraId", "QuizId");

            RenameIndexIfExists(migrationBuilder, "QuizQuestion", "IX_CauHoiKiemTra_BaiKiemTraId", "IX_QuizQuestion_QuizId");

            RenameColumnIfExists(migrationBuilder, "Comment", "NoiDung", "Content");

            RenameColumnIfExists(migrationBuilder, "Comment", "NguoiDungId", "UserId");

            RenameColumnIfExists(migrationBuilder, "Comment", "NgayTao", "UpdatedAt");

            RenameColumnIfExists(migrationBuilder, "Comment", "NgayCapNhat", "CreatedAt");

            RenameColumnIfExists(migrationBuilder, "Comment", "BinhLuanChaId", "ParentId");

            RenameColumnIfExists(migrationBuilder, "Comment", "BaiHocId", "LessonId");

            RenameIndexIfExists(migrationBuilder, "Comment", "IX_BinhLuan_NguoiDungId", "IX_Comment_UserId");

            RenameIndexIfExists(migrationBuilder, "Comment", "IX_BinhLuan_BinhLuanChaId", "IX_Comment_ParentId");

            RenameIndexIfExists(migrationBuilder, "Comment", "IX_BinhLuan_BaiHocId", "IX_Comment_LessonId");

            RenameColumnIfExists(migrationBuilder, "Assignment", "TieuDe", "Title");

            RenameColumnIfExists(migrationBuilder, "Assignment", "NgayTao", "UpdatedAt");

            RenameColumnIfExists(migrationBuilder, "Assignment", "NgayCapNhat", "CreatedAt");

            RenameColumnIfExists(migrationBuilder, "Assignment", "MoTa", "Description");

            RenameColumnIfExists(migrationBuilder, "Assignment", "KhoaHocId", "TeacherId");

            RenameColumnIfExists(migrationBuilder, "Assignment", "HanNop", "DueDate");

            RenameColumnIfExists(migrationBuilder, "Assignment", "GiangVienId", "CourseId");

            RenameColumnIfExists(migrationBuilder, "Assignment", "FileDinhKemUrl", "AttachmentUrl");

            RenameColumnIfExists(migrationBuilder, "Assignment", "DiemToiDa", "MaxScore");

            RenameColumnIfExists(migrationBuilder, "Assignment", "ChoPhepNopText", "AllowTextSubmission");

            RenameColumnIfExists(migrationBuilder, "Assignment", "ChoPhepNopFile", "AllowFileSubmission");

            RenameColumnIfExists(migrationBuilder, "Assignment", "BaiHocId", "LessonId");

            RenameIndexIfExists(migrationBuilder, "Assignment", "IX_BaiTap_KhoaHocId", "IX_Assignment_TeacherId");

            RenameIndexIfExists(migrationBuilder, "Assignment", "IX_BaiTap_GiangVienId", "IX_Assignment_CourseId");

            RenameIndexIfExists(migrationBuilder, "Assignment", "IX_BaiTap_BaiHocId", "IX_Assignment_LessonId");

            RenameColumnIfExists(migrationBuilder, "Quiz", "TieuDe", "Title");

            RenameColumnIfExists(migrationBuilder, "Quiz", "NgayTao", "UpdatedAt");

            RenameColumnIfExists(migrationBuilder, "Quiz", "NgayCapNhat", "CreatedAt");

            RenameColumnIfExists(migrationBuilder, "Quiz", "MoTa", "Description");

            RenameColumnIfExists(migrationBuilder, "Quiz", "DiemDat", "PassingScore");

            RenameColumnIfExists(migrationBuilder, "Quiz", "BaiHocId", "LessonId");

            RenameIndexIfExists(migrationBuilder, "Quiz", "IX_BaiKiemTra_BaiHocId", "IX_Quiz_LessonId");

            RenameColumnIfExists(migrationBuilder, "Lesson", "TrangThai", "Status");

            RenameColumnIfExists(migrationBuilder, "Lesson", "TieuDe", "Title");

            RenameColumnIfExists(migrationBuilder, "Lesson", "ThuTu", "Position");

            RenameColumnIfExists(migrationBuilder, "Lesson", "ThoiLuongGiay", "DurationSeconds");

            RenameColumnIfExists(migrationBuilder, "Lesson", "NoiDung", "Content");

            RenameColumnIfExists(migrationBuilder, "Lesson", "NgayTao", "UpdatedAt");

            RenameColumnIfExists(migrationBuilder, "Lesson", "NgayCapNhat", "CreatedAt");

            RenameColumnIfExists(migrationBuilder, "Lesson", "KhoaHocId", "CourseId");

            RenameColumnIfExists(migrationBuilder, "Lesson", "DaXuatBan", "IsPublished");

            RenameColumnIfExists(migrationBuilder, "Lesson", "ChuongHocId", "SectionId");

            RenameColumnIfExists(migrationBuilder, "Lesson", "ChoXemTruoc", "IsPreview");

            RenameIndexIfExists(migrationBuilder, "Lesson", "IX_BaiHoc_KhoaHocId", "IX_Lesson_CourseId");

            RenameIndexIfExists(migrationBuilder, "Lesson", "IX_BaiHoc_ChuongHocId", "IX_Lesson_SectionId");

            migrationBuilder.AddPrimaryKey(
                name: "PK_MessageAttachment",
                table: "MessageAttachment",
                column: "Id");

            migrationBuilder.AddPrimaryKey(
                name: "PK_Message",
                table: "Message",
                column: "Id");

            migrationBuilder.AddPrimaryKey(
                name: "PK_LessonProgress",
                table: "LessonProgress",
                column: "Id");

            migrationBuilder.AddPrimaryKey(
                name: "PK_Notification",
                table: "Notification",
                column: "Id");

            migrationBuilder.AddPrimaryKey(
                name: "PK_EventImage",
                table: "EventImage",
                column: "Id");

            migrationBuilder.AddPrimaryKey(
                name: "PK_Event",
                table: "Event",
                column: "Id");

            migrationBuilder.AddPrimaryKey(
                name: "PK_InstructorWithdrawal",
                table: "InstructorWithdrawal",
                column: "Id");

            migrationBuilder.AddPrimaryKey(
                name: "PK_AuditLog",
                table: "AuditLog",
                column: "Id");

            migrationBuilder.AddPrimaryKey(
                name: "PK_ConversationParticipant",
                table: "ConversationParticipant",
                columns: new[] { "ConversationId", "UserId" });

            migrationBuilder.AddPrimaryKey(
                name: "PK_CouponRecipient",
                table: "CouponRecipient",
                column: "Id");

            migrationBuilder.AddPrimaryKey(
                name: "PK_User",
                table: "User",
                column: "Id");

            migrationBuilder.AddPrimaryKey(
                name: "PK_Coupon",
                table: "Coupon",
                column: "Id");

            migrationBuilder.AddPrimaryKey(
                name: "PK_CouponUsage",
                table: "CouponUsage",
                column: "Id");

            migrationBuilder.AddPrimaryKey(
                name: "PK_SavedCourse",
                table: "SavedCourse",
                column: "Id");

            migrationBuilder.AddPrimaryKey(
                name: "PK_Course",
                table: "Course",
                column: "Id");

            migrationBuilder.AddPrimaryKey(
                name: "PK_WalletTransaction",
                table: "WalletTransaction",
                column: "Id");

            migrationBuilder.AddPrimaryKey(
                name: "PK_Enrollment",
                table: "Enrollment",
                column: "Id");

            migrationBuilder.AddPrimaryKey(
                name: "PK_EventRewardRedemption",
                table: "EventRewardRedemption",
                column: "Id");

            migrationBuilder.AddPrimaryKey(
                name: "PK_CourseReview",
                table: "CourseReview",
                column: "Id");

            migrationBuilder.AddPrimaryKey(
                name: "PK_EventRegistration",
                table: "EventRegistration",
                column: "Id");

            migrationBuilder.AddPrimaryKey(
                name: "PK_Conversation",
                table: "Conversation",
                column: "Id");

            migrationBuilder.AddPrimaryKey(
                name: "PK_Section",
                table: "Section",
                column: "Id");

            migrationBuilder.AddPrimaryKey(
                name: "PK_Certificate",
                table: "Certificate",
                column: "Id");

            migrationBuilder.AddPrimaryKey(
                name: "PK_QuizQuestion",
                table: "QuizQuestion",
                column: "Id");

            migrationBuilder.AddPrimaryKey(
                name: "PK_Comment",
                table: "Comment",
                column: "Id");

            migrationBuilder.AddPrimaryKey(
                name: "PK_Assignment",
                table: "Assignment",
                column: "Id");

            migrationBuilder.AddPrimaryKey(
                name: "PK_Quiz",
                table: "Quiz",
                column: "Id");

            migrationBuilder.AddPrimaryKey(
                name: "PK_Lesson",
                table: "Lesson",
                column: "Id");

            migrationBuilder.CreateTable(
                name: "ExternalPayment",
                columns: table => new
                {
                    Id = table.Column<string>(type: "nvarchar(450)", nullable: false),
                    UserId = table.Column<string>(type: "nvarchar(450)", nullable: false),
                    Amount = table.Column<int>(type: "int", nullable: false),
                    CompletedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    Currency = table.Column<string>(type: "nvarchar(max)", nullable: false, defaultValue: "VND"),
                    Note = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    Provider = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    ProviderPaymentIntentId = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    ProviderSessionId = table.Column<string>(type: "nvarchar(450)", nullable: false),
                    Status = table.Column<string>(type: "nvarchar(450)", nullable: false, defaultValue: "PENDING"),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ExternalPayment", x => x.Id);
                    table.ForeignKey(
                        name: "FK_ExternalPayment_User_UserId",
                        column: x => x.UserId,
                        principalTable: "User",
                        principalColumn: "Id");
                });

            migrationBuilder.CreateTable(
                name: "Purchase",
                columns: table => new
                {
                    Id = table.Column<string>(type: "nvarchar(450)", nullable: false),
                    CouponId = table.Column<string>(type: "nvarchar(450)", nullable: true),
                    CourseId = table.Column<string>(type: "nvarchar(450)", nullable: false),
                    UserId = table.Column<string>(type: "nvarchar(450)", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    Currency = table.Column<string>(type: "nvarchar(max)", nullable: false, defaultValue: "VND"),
                    DiscountAmount = table.Column<int>(type: "int", nullable: false, defaultValue: 0),
                    FinalAmount = table.Column<int>(type: "int", nullable: false),
                    OriginalAmount = table.Column<int>(type: "int", nullable: false),
                    Status = table.Column<string>(type: "nvarchar(max)", nullable: false, defaultValue: "COMPLETED"),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Purchase", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Purchase_Coupon_CouponId",
                        column: x => x.CouponId,
                        principalTable: "Coupon",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_Purchase_Course_CourseId",
                        column: x => x.CourseId,
                        principalTable: "Course",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_Purchase_User_UserId",
                        column: x => x.UserId,
                        principalTable: "User",
                        principalColumn: "Id");
                });

            migrationBuilder.CreateTable(
                name: "QuizSubmission",
                columns: table => new
                {
                    Id = table.Column<string>(type: "nvarchar(450)", nullable: false),
                    QuizId = table.Column<string>(type: "nvarchar(450)", nullable: false),
                    UserId = table.Column<string>(type: "nvarchar(450)", nullable: false),
                    Answers = table.Column<string>(type: "nvarchar(4000)", maxLength: 4000, nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    Passed = table.Column<bool>(type: "bit", nullable: false),
                    Score = table.Column<double>(type: "float", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_QuizSubmission", x => x.Id);
                    table.ForeignKey(
                        name: "FK_QuizSubmission_Quiz_QuizId",
                        column: x => x.QuizId,
                        principalTable: "Quiz",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_QuizSubmission_User_UserId",
                        column: x => x.UserId,
                        principalTable: "User",
                        principalColumn: "Id");
                });

            migrationBuilder.CreateIndex(
                name: "IX_CouponRecipient_CouponId_UserId",
                table: "CouponRecipient",
                columns: new[] { "CouponId", "UserId" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_CouponRecipient_TeacherId",
                table: "CouponRecipient",
                column: "TeacherId");

            migrationBuilder.CreateIndex(
                name: "IX_CouponUsage_CouponId_UserId",
                table: "CouponUsage",
                columns: new[] { "CouponId", "UserId" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_CouponUsage_PurchaseId",
                table: "CouponUsage",
                column: "PurchaseId",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Course_InstructorId",
                table: "Course",
                column: "InstructorId");

            migrationBuilder.CreateIndex(
                name: "IX_Course_Slug",
                table: "Course",
                column: "Slug",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_EventRewardRedemption_UserId_RewardId",
                table: "EventRewardRedemption",
                columns: new[] { "UserId", "RewardId" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_CourseReview_CourseId_CreatedAt",
                table: "CourseReview",
                columns: new[] { "CourseId", "CreatedAt" });

            migrationBuilder.CreateIndex(
                name: "IX_CourseReview_UserId_CreatedAt",
                table: "CourseReview",
                columns: new[] { "UserId", "CreatedAt" });

            migrationBuilder.CreateIndex(
                name: "IX_EventRegistration_EventId_UserId",
                table: "EventRegistration",
                columns: new[] { "EventId", "UserId" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_EventRegistration_UserId_RegisteredAt",
                table: "EventRegistration",
                columns: new[] { "UserId", "RegisteredAt" });

            migrationBuilder.CreateIndex(
                name: "IX_ExternalPayment_ProviderSessionId",
                table: "ExternalPayment",
                column: "ProviderSessionId",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_ExternalPayment_Status_CreatedAt",
                table: "ExternalPayment",
                columns: new[] { "Status", "CreatedAt" });

            migrationBuilder.CreateIndex(
                name: "IX_ExternalPayment_UserId_CreatedAt",
                table: "ExternalPayment",
                columns: new[] { "UserId", "CreatedAt" });

            migrationBuilder.CreateIndex(
                name: "IX_Purchase_CouponId",
                table: "Purchase",
                column: "CouponId");

            migrationBuilder.CreateIndex(
                name: "IX_Purchase_CourseId_CreatedAt",
                table: "Purchase",
                columns: new[] { "CourseId", "CreatedAt" });

            migrationBuilder.CreateIndex(
                name: "IX_Purchase_UserId_CourseId",
                table: "Purchase",
                columns: new[] { "UserId", "CourseId" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Purchase_UserId_CreatedAt",
                table: "Purchase",
                columns: new[] { "UserId", "CreatedAt" });

            migrationBuilder.CreateIndex(
                name: "IX_QuizSubmission_QuizId",
                table: "QuizSubmission",
                column: "QuizId");

            migrationBuilder.CreateIndex(
                name: "IX_QuizSubmission_UserId",
                table: "QuizSubmission",
                column: "UserId");

            migrationBuilder.AddForeignKey(
                name: "FK_Assignment_Course_CourseId",
                table: "Assignment",
                column: "CourseId",
                principalTable: "Course",
                principalColumn: "Id");

            migrationBuilder.AddForeignKey(
                name: "FK_Assignment_Lesson_LessonId",
                table: "Assignment",
                column: "LessonId",
                principalTable: "Lesson",
                principalColumn: "Id");

            migrationBuilder.AddForeignKey(
                name: "FK_Assignment_User_TeacherId",
                table: "Assignment",
                column: "TeacherId",
                principalTable: "User",
                principalColumn: "Id");

            migrationBuilder.AddForeignKey(
                name: "FK_Certificate_Course_CourseId",
                table: "Certificate",
                column: "CourseId",
                principalTable: "Course",
                principalColumn: "Id");

            migrationBuilder.AddForeignKey(
                name: "FK_Certificate_User_UserId",
                table: "Certificate",
                column: "UserId",
                principalTable: "User",
                principalColumn: "Id");

            migrationBuilder.AddForeignKey(
                name: "FK_Comment_Comment_ParentId",
                table: "Comment",
                column: "ParentId",
                principalTable: "Comment",
                principalColumn: "Id");

            migrationBuilder.AddForeignKey(
                name: "FK_Comment_Lesson_LessonId",
                table: "Comment",
                column: "LessonId",
                principalTable: "Lesson",
                principalColumn: "Id");

            migrationBuilder.AddForeignKey(
                name: "FK_Comment_User_UserId",
                table: "Comment",
                column: "UserId",
                principalTable: "User",
                principalColumn: "Id");

            migrationBuilder.AddForeignKey(
                name: "FK_ConversationParticipant_Conversation_ConversationId",
                table: "ConversationParticipant",
                column: "ConversationId",
                principalTable: "Conversation",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_ConversationParticipant_User_UserId",
                table: "ConversationParticipant",
                column: "UserId",
                principalTable: "User",
                principalColumn: "Id");

            migrationBuilder.AddForeignKey(
                name: "FK_Coupon_Course_CourseId",
                table: "Coupon",
                column: "CourseId",
                principalTable: "Course",
                principalColumn: "Id");

            migrationBuilder.AddForeignKey(
                name: "FK_Coupon_User_TeacherId",
                table: "Coupon",
                column: "TeacherId",
                principalTable: "User",
                principalColumn: "Id");

            migrationBuilder.AddForeignKey(
                name: "FK_CouponRecipient_Coupon_CouponId",
                table: "CouponRecipient",
                column: "CouponId",
                principalTable: "Coupon",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_CouponRecipient_Course_SourceCourseId",
                table: "CouponRecipient",
                column: "SourceCourseId",
                principalTable: "Course",
                principalColumn: "Id");

            migrationBuilder.AddForeignKey(
                name: "FK_CouponRecipient_User_TeacherId",
                table: "CouponRecipient",
                column: "TeacherId",
                principalTable: "User",
                principalColumn: "Id");

            migrationBuilder.AddForeignKey(
                name: "FK_CouponRecipient_User_UserId",
                table: "CouponRecipient",
                column: "UserId",
                principalTable: "User",
                principalColumn: "Id");

            migrationBuilder.AddForeignKey(
                name: "FK_CouponUsage_Coupon_CouponId",
                table: "CouponUsage",
                column: "CouponId",
                principalTable: "Coupon",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_CouponUsage_Course_CourseId",
                table: "CouponUsage",
                column: "CourseId",
                principalTable: "Course",
                principalColumn: "Id");

            migrationBuilder.AddForeignKey(
                name: "FK_CouponUsage_Purchase_PurchaseId",
                table: "CouponUsage",
                column: "PurchaseId",
                principalTable: "Purchase",
                principalColumn: "Id");

            migrationBuilder.AddForeignKey(
                name: "FK_CouponUsage_User_UserId",
                table: "CouponUsage",
                column: "UserId",
                principalTable: "User",
                principalColumn: "Id");

            migrationBuilder.AddForeignKey(
                name: "FK_Course_User_InstructorId",
                table: "Course",
                column: "InstructorId",
                principalTable: "User",
                principalColumn: "Id");

            migrationBuilder.AddForeignKey(
                name: "FK_CourseReview_Course_CourseId",
                table: "CourseReview",
                column: "CourseId",
                principalTable: "Course",
                principalColumn: "Id");

            migrationBuilder.AddForeignKey(
                name: "FK_CourseReview_User_UserId",
                table: "CourseReview",
                column: "UserId",
                principalTable: "User",
                principalColumn: "Id");

            migrationBuilder.AddForeignKey(
                name: "FK_Enrollment_Course_CourseId",
                table: "Enrollment",
                column: "CourseId",
                principalTable: "Course",
                principalColumn: "Id");

            migrationBuilder.AddForeignKey(
                name: "FK_Enrollment_User_UserId",
                table: "Enrollment",
                column: "UserId",
                principalTable: "User",
                principalColumn: "Id");

            migrationBuilder.AddForeignKey(
                name: "FK_Event_User_InstructorId",
                table: "Event",
                column: "InstructorId",
                principalTable: "User",
                principalColumn: "Id");

            migrationBuilder.AddForeignKey(
                name: "FK_EventImage_Event_SuKienId",
                table: "EventImage",
                column: "SuKienId",
                principalTable: "Event",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_EventRegistration_Event_EventId",
                table: "EventRegistration",
                column: "EventId",
                principalTable: "Event",
                principalColumn: "Id");

            migrationBuilder.AddForeignKey(
                name: "FK_EventRegistration_User_UserId",
                table: "EventRegistration",
                column: "UserId",
                principalTable: "User",
                principalColumn: "Id");

            migrationBuilder.AddForeignKey(
                name: "FK_EventRewardRedemption_User_UserId",
                table: "EventRewardRedemption",
                column: "UserId",
                principalTable: "User",
                principalColumn: "Id");

            migrationBuilder.AddForeignKey(
                name: "FK_InstructorWithdrawal_User_InstructorId",
                table: "InstructorWithdrawal",
                column: "InstructorId",
                principalTable: "User",
                principalColumn: "Id");

            migrationBuilder.AddForeignKey(
                name: "FK_Lesson_Course_CourseId",
                table: "Lesson",
                column: "CourseId",
                principalTable: "Course",
                principalColumn: "Id");

            migrationBuilder.AddForeignKey(
                name: "FK_Lesson_Section_SectionId",
                table: "Lesson",
                column: "SectionId",
                principalTable: "Section",
                principalColumn: "Id");

            migrationBuilder.AddForeignKey(
                name: "FK_LessonProgress_Lesson_LessonId",
                table: "LessonProgress",
                column: "LessonId",
                principalTable: "Lesson",
                principalColumn: "Id");

            migrationBuilder.AddForeignKey(
                name: "FK_LessonProgress_User_UserId",
                table: "LessonProgress",
                column: "UserId",
                principalTable: "User",
                principalColumn: "Id");

            migrationBuilder.AddForeignKey(
                name: "FK_Message_Conversation_ConversationId",
                table: "Message",
                column: "ConversationId",
                principalTable: "Conversation",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_Message_User_SenderId",
                table: "Message",
                column: "SenderId",
                principalTable: "User",
                principalColumn: "Id");

            migrationBuilder.AddForeignKey(
                name: "FK_MessageAttachment_Message_MessageId",
                table: "MessageAttachment",
                column: "MessageId",
                principalTable: "Message",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_Notification_User_UserId",
                table: "Notification",
                column: "UserId",
                principalTable: "User",
                principalColumn: "Id");

            migrationBuilder.AddForeignKey(
                name: "FK_Quiz_Lesson_LessonId",
                table: "Quiz",
                column: "LessonId",
                principalTable: "Lesson",
                principalColumn: "Id");

            migrationBuilder.AddForeignKey(
                name: "FK_QuizQuestion_Quiz_QuizId",
                table: "QuizQuestion",
                column: "QuizId",
                principalTable: "Quiz",
                principalColumn: "Id");

            migrationBuilder.AddForeignKey(
                name: "FK_SavedCourse_Course_CourseId",
                table: "SavedCourse",
                column: "CourseId",
                principalTable: "Course",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_SavedCourse_User_UserId",
                table: "SavedCourse",
                column: "UserId",
                principalTable: "User",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_Section_Course_CourseId",
                table: "Section",
                column: "CourseId",
                principalTable: "Course",
                principalColumn: "Id");

            migrationBuilder.AddForeignKey(
                name: "FK_WalletTransaction_Course_CourseId",
                table: "WalletTransaction",
                column: "CourseId",
                principalTable: "Course",
                principalColumn: "Id");

            migrationBuilder.AddForeignKey(
                name: "FK_WalletTransaction_ExternalPayment_ExternalPaymentId",
                table: "WalletTransaction",
                column: "ExternalPaymentId",
                principalTable: "ExternalPayment",
                principalColumn: "Id");

            migrationBuilder.AddForeignKey(
                name: "FK_WalletTransaction_Purchase_PurchaseId",
                table: "WalletTransaction",
                column: "PurchaseId",
                principalTable: "Purchase",
                principalColumn: "Id");

            migrationBuilder.AddForeignKey(
                name: "FK_WalletTransaction_User_UserId",
                table: "WalletTransaction",
                column: "UserId",
                principalTable: "User",
                principalColumn: "Id");
        }
    }
}


