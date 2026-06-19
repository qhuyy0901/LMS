using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace LMS.Api.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class InitialCreate : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "AuditLog",
                columns: table => new
                {
                    Id = table.Column<string>(type: "nvarchar(450)", nullable: false),
                    ActorId = table.Column<string>(type: "nvarchar(450)", nullable: true),
                    ActorEmail = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    Action = table.Column<string>(type: "nvarchar(450)", nullable: false),
                    EntityType = table.Column<string>(type: "nvarchar(450)", nullable: false),
                    EntityId = table.Column<string>(type: "nvarchar(450)", nullable: true),
                    Metadata = table.Column<string>(type: "nvarchar(4000)", maxLength: 4000, nullable: true),
                    IpAddress = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    UserAgent = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AuditLog", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "User",
                columns: table => new
                {
                    Id = table.Column<string>(type: "nvarchar(450)", nullable: false),
                    Email = table.Column<string>(type: "nvarchar(450)", nullable: false),
                    Name = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    Password = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    Role = table.Column<string>(type: "nvarchar(max)", nullable: false, defaultValue: "STUDENT"),
                    Avatar = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    Phone = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    Bio = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    Settings = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    WalletBalance = table.Column<int>(type: "int", nullable: false, defaultValue: 0),
                    TotalSpent = table.Column<int>(type: "int", nullable: false, defaultValue: 0),
                    MemberTier = table.Column<string>(type: "nvarchar(max)", nullable: false, defaultValue: "BRONZE"),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_User", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "Course",
                columns: table => new
                {
                    Id = table.Column<string>(type: "nvarchar(450)", nullable: false),
                    Title = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    Slug = table.Column<string>(type: "nvarchar(450)", nullable: false),
                    Description = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    Thumbnail = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    Price = table.Column<int>(type: "int", nullable: false),
                    AverageRating = table.Column<double>(type: "float", nullable: false),
                    ReviewCount = table.Column<int>(type: "int", nullable: false),
                    MinimumMemberTier = table.Column<string>(type: "nvarchar(max)", nullable: false, defaultValue: "BRONZE"),
                    TotalDurationSeconds = table.Column<int>(type: "int", nullable: false),
                    IsPublished = table.Column<bool>(type: "bit", nullable: false),
                    PublishedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    InstructorId = table.Column<string>(type: "nvarchar(450)", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Course", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Course_User_InstructorId",
                        column: x => x.InstructorId,
                        principalTable: "User",
                        principalColumn: "Id");
                });

            migrationBuilder.CreateTable(
                name: "ExternalPayment",
                columns: table => new
                {
                    Id = table.Column<string>(type: "nvarchar(450)", nullable: false),
                    Provider = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    Status = table.Column<string>(type: "nvarchar(450)", nullable: false, defaultValue: "PENDING"),
                    Amount = table.Column<int>(type: "int", nullable: false),
                    Currency = table.Column<string>(type: "nvarchar(max)", nullable: false, defaultValue: "VND"),
                    Note = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    ProviderSessionId = table.Column<string>(type: "nvarchar(450)", nullable: false),
                    ProviderPaymentIntentId = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    CompletedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    UserId = table.Column<string>(type: "nvarchar(450)", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
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
                name: "Notification",
                columns: table => new
                {
                    Id = table.Column<string>(type: "nvarchar(450)", nullable: false),
                    Type = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    Title = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    Body = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    Link = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    IsRead = table.Column<bool>(type: "bit", nullable: false),
                    Metadata = table.Column<string>(type: "nvarchar(4000)", maxLength: 4000, nullable: true),
                    ReadAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    UserId = table.Column<string>(type: "nvarchar(450)", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Notification", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Notification_User_UserId",
                        column: x => x.UserId,
                        principalTable: "User",
                        principalColumn: "Id");
                });

            migrationBuilder.CreateTable(
                name: "Certificate",
                columns: table => new
                {
                    Id = table.Column<string>(type: "nvarchar(450)", nullable: false),
                    CertificateNo = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    VerifyCode = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    PdfUrl = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    CompletionSnapshot = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    IssuedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UserId = table.Column<string>(type: "nvarchar(450)", nullable: false),
                    CourseId = table.Column<string>(type: "nvarchar(450)", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Certificate", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Certificate_Course_CourseId",
                        column: x => x.CourseId,
                        principalTable: "Course",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_Certificate_User_UserId",
                        column: x => x.UserId,
                        principalTable: "User",
                        principalColumn: "Id");
                });

            migrationBuilder.CreateTable(
                name: "Coupon",
                columns: table => new
                {
                    Id = table.Column<string>(type: "nvarchar(450)", nullable: false),
                    Code = table.Column<string>(type: "nvarchar(450)", nullable: false),
                    DiscountType = table.Column<string>(type: "nvarchar(max)", nullable: false, defaultValue: "PERCENTAGE"),
                    DiscountValue = table.Column<int>(type: "int", nullable: false),
                    MinPurchaseAmount = table.Column<int>(type: "int", nullable: false, defaultValue: 0),
                    MaxDiscountAmount = table.Column<int>(type: "int", nullable: true),
                    StartDate = table.Column<DateTime>(type: "datetime2", nullable: true),
                    EndDate = table.Column<DateTime>(type: "datetime2", nullable: true),
                    IsActive = table.Column<bool>(type: "bit", nullable: false, defaultValue: true),
                    UsageLimit = table.Column<int>(type: "int", nullable: true),
                    UsageCount = table.Column<int>(type: "int", nullable: false, defaultValue: 0),
                    CourseId = table.Column<string>(type: "nvarchar(450)", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Coupon", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Coupon_Course_CourseId",
                        column: x => x.CourseId,
                        principalTable: "Course",
                        principalColumn: "Id");
                });

            migrationBuilder.CreateTable(
                name: "CourseReview",
                columns: table => new
                {
                    Id = table.Column<string>(type: "nvarchar(450)", nullable: false),
                    Rating = table.Column<int>(type: "int", nullable: false),
                    Comment = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    UserId = table.Column<string>(type: "nvarchar(450)", nullable: false),
                    CourseId = table.Column<string>(type: "nvarchar(450)", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_CourseReview", x => x.Id);
                    table.ForeignKey(
                        name: "FK_CourseReview_Course_CourseId",
                        column: x => x.CourseId,
                        principalTable: "Course",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_CourseReview_User_UserId",
                        column: x => x.UserId,
                        principalTable: "User",
                        principalColumn: "Id");
                });

            migrationBuilder.CreateTable(
                name: "Enrollment",
                columns: table => new
                {
                    Id = table.Column<string>(type: "nvarchar(450)", nullable: false),
                    Progress = table.Column<double>(type: "float", nullable: false),
                    CompletedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    UserId = table.Column<string>(type: "nvarchar(450)", nullable: false),
                    CourseId = table.Column<string>(type: "nvarchar(450)", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Enrollment", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Enrollment_Course_CourseId",
                        column: x => x.CourseId,
                        principalTable: "Course",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_Enrollment_User_UserId",
                        column: x => x.UserId,
                        principalTable: "User",
                        principalColumn: "Id");
                });

            migrationBuilder.CreateTable(
                name: "Purchase",
                columns: table => new
                {
                    Id = table.Column<string>(type: "nvarchar(450)", nullable: false),
                    OriginalAmount = table.Column<int>(type: "int", nullable: false),
                    DiscountAmount = table.Column<int>(type: "int", nullable: false, defaultValue: 0),
                    FinalAmount = table.Column<int>(type: "int", nullable: false),
                    Currency = table.Column<string>(type: "nvarchar(max)", nullable: false, defaultValue: "VND"),
                    Status = table.Column<string>(type: "nvarchar(max)", nullable: false, defaultValue: "COMPLETED"),
                    UserId = table.Column<string>(type: "nvarchar(450)", nullable: false),
                    CourseId = table.Column<string>(type: "nvarchar(450)", nullable: false),
                    CouponId = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Purchase", x => x.Id);
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
                name: "Section",
                columns: table => new
                {
                    Id = table.Column<string>(type: "nvarchar(450)", nullable: false),
                    Title = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    Description = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    Position = table.Column<int>(type: "int", nullable: false),
                    CourseId = table.Column<string>(type: "nvarchar(450)", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Section", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Section_Course_CourseId",
                        column: x => x.CourseId,
                        principalTable: "Course",
                        principalColumn: "Id");
                });

            migrationBuilder.CreateTable(
                name: "WalletTransaction",
                columns: table => new
                {
                    Id = table.Column<string>(type: "nvarchar(450)", nullable: false),
                    Type = table.Column<string>(type: "nvarchar(450)", nullable: false),
                    Amount = table.Column<int>(type: "int", nullable: false),
                    BalanceAfter = table.Column<int>(type: "int", nullable: false),
                    Note = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    Metadata = table.Column<string>(type: "nvarchar(4000)", maxLength: 4000, nullable: true),
                    UserId = table.Column<string>(type: "nvarchar(450)", nullable: false),
                    CourseId = table.Column<string>(type: "nvarchar(450)", nullable: true),
                    PurchaseId = table.Column<string>(type: "nvarchar(450)", nullable: true),
                    ExternalPaymentId = table.Column<string>(type: "nvarchar(450)", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_WalletTransaction", x => x.Id);
                    table.ForeignKey(
                        name: "FK_WalletTransaction_Course_CourseId",
                        column: x => x.CourseId,
                        principalTable: "Course",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_WalletTransaction_ExternalPayment_ExternalPaymentId",
                        column: x => x.ExternalPaymentId,
                        principalTable: "ExternalPayment",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_WalletTransaction_Purchase_PurchaseId",
                        column: x => x.PurchaseId,
                        principalTable: "Purchase",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_WalletTransaction_User_UserId",
                        column: x => x.UserId,
                        principalTable: "User",
                        principalColumn: "Id");
                });

            migrationBuilder.CreateTable(
                name: "Lesson",
                columns: table => new
                {
                    Id = table.Column<string>(type: "nvarchar(450)", nullable: false),
                    Title = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    Content = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    VideoUrl = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    DurationSeconds = table.Column<int>(type: "int", nullable: true),
                    Position = table.Column<int>(type: "int", nullable: false),
                    IsPublished = table.Column<bool>(type: "bit", nullable: false),
                    IsPreview = table.Column<bool>(type: "bit", nullable: false),
                    CourseId = table.Column<string>(type: "nvarchar(450)", nullable: false),
                    SectionId = table.Column<string>(type: "nvarchar(450)", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Lesson", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Lesson_Course_CourseId",
                        column: x => x.CourseId,
                        principalTable: "Course",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_Lesson_Section_SectionId",
                        column: x => x.SectionId,
                        principalTable: "Section",
                        principalColumn: "Id");
                });

            migrationBuilder.CreateTable(
                name: "Comment",
                columns: table => new
                {
                    Id = table.Column<string>(type: "nvarchar(450)", nullable: false),
                    Content = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    LessonId = table.Column<string>(type: "nvarchar(450)", nullable: false),
                    UserId = table.Column<string>(type: "nvarchar(450)", nullable: false),
                    ParentId = table.Column<string>(type: "nvarchar(450)", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Comment", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Comment_Comment_ParentId",
                        column: x => x.ParentId,
                        principalTable: "Comment",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_Comment_Lesson_LessonId",
                        column: x => x.LessonId,
                        principalTable: "Lesson",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_Comment_User_UserId",
                        column: x => x.UserId,
                        principalTable: "User",
                        principalColumn: "Id");
                });

            migrationBuilder.CreateTable(
                name: "LessonProgress",
                columns: table => new
                {
                    Id = table.Column<string>(type: "nvarchar(450)", nullable: false),
                    IsCompleted = table.Column<bool>(type: "bit", nullable: false),
                    WatchedSeconds = table.Column<int>(type: "int", nullable: false),
                    LastPositionSeconds = table.Column<int>(type: "int", nullable: false),
                    CompletionRate = table.Column<double>(type: "float", nullable: false),
                    CompletedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    UserId = table.Column<string>(type: "nvarchar(450)", nullable: false),
                    LessonId = table.Column<string>(type: "nvarchar(450)", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_LessonProgress", x => x.Id);
                    table.ForeignKey(
                        name: "FK_LessonProgress_Lesson_LessonId",
                        column: x => x.LessonId,
                        principalTable: "Lesson",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_LessonProgress_User_UserId",
                        column: x => x.UserId,
                        principalTable: "User",
                        principalColumn: "Id");
                });

            migrationBuilder.CreateTable(
                name: "Quiz",
                columns: table => new
                {
                    Id = table.Column<string>(type: "nvarchar(450)", nullable: false),
                    Title = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    Description = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    PassingScore = table.Column<int>(type: "int", nullable: false, defaultValue: 80),
                    LessonId = table.Column<string>(type: "nvarchar(450)", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Quiz", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Quiz_Lesson_LessonId",
                        column: x => x.LessonId,
                        principalTable: "Lesson",
                        principalColumn: "Id");
                });

            migrationBuilder.CreateTable(
                name: "QuizQuestion",
                columns: table => new
                {
                    Id = table.Column<string>(type: "nvarchar(450)", nullable: false),
                    QuestionText = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    Options = table.Column<string>(type: "nvarchar(4000)", maxLength: 4000, nullable: false),
                    CorrectOptionIndex = table.Column<int>(type: "int", nullable: false),
                    Explanation = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    Position = table.Column<int>(type: "int", nullable: false),
                    QuizId = table.Column<string>(type: "nvarchar(450)", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_QuizQuestion", x => x.Id);
                    table.ForeignKey(
                        name: "FK_QuizQuestion_Quiz_QuizId",
                        column: x => x.QuizId,
                        principalTable: "Quiz",
                        principalColumn: "Id");
                });

            migrationBuilder.CreateTable(
                name: "QuizSubmission",
                columns: table => new
                {
                    Id = table.Column<string>(type: "nvarchar(450)", nullable: false),
                    Score = table.Column<double>(type: "float", nullable: false),
                    Passed = table.Column<bool>(type: "bit", nullable: false),
                    Answers = table.Column<string>(type: "nvarchar(4000)", maxLength: 4000, nullable: false),
                    UserId = table.Column<string>(type: "nvarchar(450)", nullable: false),
                    QuizId = table.Column<string>(type: "nvarchar(450)", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false)
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
                name: "IX_AuditLog_Action_CreatedAt",
                table: "AuditLog",
                columns: new[] { "Action", "CreatedAt" });

            migrationBuilder.CreateIndex(
                name: "IX_AuditLog_ActorId_CreatedAt",
                table: "AuditLog",
                columns: new[] { "ActorId", "CreatedAt" });

            migrationBuilder.CreateIndex(
                name: "IX_AuditLog_EntityType_EntityId",
                table: "AuditLog",
                columns: new[] { "EntityType", "EntityId" });

            migrationBuilder.CreateIndex(
                name: "IX_Certificate_CourseId",
                table: "Certificate",
                column: "CourseId");

            migrationBuilder.CreateIndex(
                name: "IX_Certificate_UserId_CourseId",
                table: "Certificate",
                columns: new[] { "UserId", "CourseId" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Comment_LessonId",
                table: "Comment",
                column: "LessonId");

            migrationBuilder.CreateIndex(
                name: "IX_Comment_ParentId",
                table: "Comment",
                column: "ParentId");

            migrationBuilder.CreateIndex(
                name: "IX_Comment_UserId",
                table: "Comment",
                column: "UserId");

            migrationBuilder.CreateIndex(
                name: "IX_Coupon_Code",
                table: "Coupon",
                column: "Code",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Coupon_CourseId",
                table: "Coupon",
                column: "CourseId");

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
                name: "IX_CourseReview_CourseId_CreatedAt",
                table: "CourseReview",
                columns: new[] { "CourseId", "CreatedAt" });

            migrationBuilder.CreateIndex(
                name: "IX_CourseReview_UserId_CourseId",
                table: "CourseReview",
                columns: new[] { "UserId", "CourseId" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_CourseReview_UserId_CreatedAt",
                table: "CourseReview",
                columns: new[] { "UserId", "CreatedAt" });

            migrationBuilder.CreateIndex(
                name: "IX_Enrollment_CourseId",
                table: "Enrollment",
                column: "CourseId");

            migrationBuilder.CreateIndex(
                name: "IX_Enrollment_UserId_CourseId",
                table: "Enrollment",
                columns: new[] { "UserId", "CourseId" },
                unique: true);

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
                name: "IX_Lesson_CourseId",
                table: "Lesson",
                column: "CourseId");

            migrationBuilder.CreateIndex(
                name: "IX_Lesson_SectionId",
                table: "Lesson",
                column: "SectionId");

            migrationBuilder.CreateIndex(
                name: "IX_LessonProgress_LessonId",
                table: "LessonProgress",
                column: "LessonId");

            migrationBuilder.CreateIndex(
                name: "IX_LessonProgress_UserId",
                table: "LessonProgress",
                column: "UserId");

            migrationBuilder.CreateIndex(
                name: "IX_LessonProgress_UserId_IsCompleted",
                table: "LessonProgress",
                columns: new[] { "UserId", "IsCompleted" });

            migrationBuilder.CreateIndex(
                name: "IX_LessonProgress_UserId_LessonId",
                table: "LessonProgress",
                columns: new[] { "UserId", "LessonId" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Notification_UserId_IsRead_CreatedAt",
                table: "Notification",
                columns: new[] { "UserId", "IsRead", "CreatedAt" });

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
                name: "IX_Quiz_LessonId",
                table: "Quiz",
                column: "LessonId",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_QuizQuestion_QuizId",
                table: "QuizQuestion",
                column: "QuizId");

            migrationBuilder.CreateIndex(
                name: "IX_QuizSubmission_QuizId",
                table: "QuizSubmission",
                column: "QuizId");

            migrationBuilder.CreateIndex(
                name: "IX_QuizSubmission_UserId",
                table: "QuizSubmission",
                column: "UserId");

            migrationBuilder.CreateIndex(
                name: "IX_Section_CourseId",
                table: "Section",
                column: "CourseId");

            migrationBuilder.CreateIndex(
                name: "IX_User_Email",
                table: "User",
                column: "Email",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_WalletTransaction_CourseId",
                table: "WalletTransaction",
                column: "CourseId");

            migrationBuilder.CreateIndex(
                name: "IX_WalletTransaction_ExternalPaymentId",
                table: "WalletTransaction",
                column: "ExternalPaymentId");

            migrationBuilder.CreateIndex(
                name: "IX_WalletTransaction_PurchaseId",
                table: "WalletTransaction",
                column: "PurchaseId");

            migrationBuilder.CreateIndex(
                name: "IX_WalletTransaction_Type_CreatedAt",
                table: "WalletTransaction",
                columns: new[] { "Type", "CreatedAt" });

            migrationBuilder.CreateIndex(
                name: "IX_WalletTransaction_UserId_CreatedAt",
                table: "WalletTransaction",
                columns: new[] { "UserId", "CreatedAt" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "AuditLog");

            migrationBuilder.DropTable(
                name: "Certificate");

            migrationBuilder.DropTable(
                name: "Comment");

            migrationBuilder.DropTable(
                name: "Coupon");

            migrationBuilder.DropTable(
                name: "CourseReview");

            migrationBuilder.DropTable(
                name: "Enrollment");

            migrationBuilder.DropTable(
                name: "LessonProgress");

            migrationBuilder.DropTable(
                name: "Notification");

            migrationBuilder.DropTable(
                name: "QuizQuestion");

            migrationBuilder.DropTable(
                name: "QuizSubmission");

            migrationBuilder.DropTable(
                name: "WalletTransaction");

            migrationBuilder.DropTable(
                name: "Quiz");

            migrationBuilder.DropTable(
                name: "ExternalPayment");

            migrationBuilder.DropTable(
                name: "Purchase");

            migrationBuilder.DropTable(
                name: "Lesson");

            migrationBuilder.DropTable(
                name: "Section");

            migrationBuilder.DropTable(
                name: "Course");

            migrationBuilder.DropTable(
                name: "User");
        }
    }
}
