using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace LMS.Api.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class SecureMessagingWithImages : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AlterColumn<string>(
                name: "Content",
                table: "Message",
                type: "nvarchar(max)",
                nullable: false,
                defaultValue: "",
                oldClrType: typeof(string),
                oldType: "nvarchar(max)");

            migrationBuilder.AlterColumn<string>(
                name: "CourseId",
                table: "Conversation",
                type: "nvarchar(450)",
                maxLength: 450,
                nullable: true,
                oldClrType: typeof(Guid),
                oldType: "uniqueidentifier",
                oldNullable: true);

            migrationBuilder.AddColumn<string>(
                name: "ClassId",
                table: "Conversation",
                type: "nvarchar(450)",
                maxLength: 450,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "SubjectId",
                table: "Conversation",
                type: "nvarchar(450)",
                maxLength: 450,
                nullable: true);

            migrationBuilder.Sql("UPDATE [Conversation] SET [ClassId] = [CourseId] WHERE [ClassId] IS NULL AND [CourseId] IS NOT NULL");

            migrationBuilder.CreateTable(
                name: "MessageAttachment",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    MessageId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    FileName = table.Column<string>(type: "nvarchar(255)", maxLength: 255, nullable: false),
                    OriginalFileName = table.Column<string>(type: "nvarchar(255)", maxLength: 255, nullable: false),
                    ContentType = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    Size = table.Column<long>(type: "bigint", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_MessageAttachment", x => x.Id);
                    table.ForeignKey(
                        name: "FK_MessageAttachment_Message_MessageId",
                        column: x => x.MessageId,
                        principalTable: "Message",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_Conversation_CourseId_ClassId_SubjectId",
                table: "Conversation",
                columns: new[] { "CourseId", "ClassId", "SubjectId" });

            migrationBuilder.CreateIndex(
                name: "IX_MessageAttachment_MessageId",
                table: "MessageAttachment",
                column: "MessageId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "MessageAttachment");

            migrationBuilder.DropIndex(
                name: "IX_Conversation_CourseId_ClassId_SubjectId",
                table: "Conversation");

            migrationBuilder.DropColumn(
                name: "ClassId",
                table: "Conversation");

            migrationBuilder.DropColumn(
                name: "SubjectId",
                table: "Conversation");

            migrationBuilder.AlterColumn<string>(
                name: "Content",
                table: "Message",
                type: "nvarchar(max)",
                nullable: false,
                oldClrType: typeof(string),
                oldType: "nvarchar(max)",
                oldDefaultValue: "");

            migrationBuilder.AlterColumn<Guid>(
                name: "CourseId",
                table: "Conversation",
                type: "uniqueidentifier",
                nullable: true,
                oldClrType: typeof(string),
                oldType: "nvarchar(450)",
                oldMaxLength: 450,
                oldNullable: true);
        }
    }
}
