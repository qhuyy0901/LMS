using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace LMS.Api.Migrations
{
    /// <inheritdoc />
    public partial class TeacherCourseAssignments : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "FileUrl",
                table: "Lesson",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Status",
                table: "Lesson",
                type: "nvarchar(max)",
                nullable: false,
                defaultValue: "DRAFT");

            migrationBuilder.AddColumn<string>(
                name: "Category",
                table: "Course",
                type: "nvarchar(max)",
                nullable: false,
                defaultValue: "Lập trình");

            migrationBuilder.AddColumn<string>(
                name: "DetailedDescription",
                table: "Course",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Level",
                table: "Course",
                type: "nvarchar(max)",
                nullable: false,
                defaultValue: "BEGINNER");

            migrationBuilder.AddColumn<string>(
                name: "ShortDescription",
                table: "Course",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Status",
                table: "Course",
                type: "nvarchar(max)",
                nullable: false,
                defaultValue: "DRAFT");

            migrationBuilder.CreateTable(
                name: "Assignment",
                columns: table => new
                {
                    Id = table.Column<string>(type: "nvarchar(450)", nullable: false),
                    CourseId = table.Column<string>(type: "nvarchar(450)", nullable: false),
                    LessonId = table.Column<string>(type: "nvarchar(450)", nullable: true),
                    TeacherId = table.Column<string>(type: "nvarchar(450)", nullable: false),
                    Title = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    Description = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    DueDate = table.Column<DateTime>(type: "datetime2", nullable: true),
                    MaxScore = table.Column<int>(type: "int", nullable: false, defaultValue: 100),
                    AttachmentUrl = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    AllowTextSubmission = table.Column<bool>(type: "bit", nullable: false, defaultValue: true),
                    AllowFileSubmission = table.Column<bool>(type: "bit", nullable: false, defaultValue: true),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Assignment", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Assignment_Course_CourseId",
                        column: x => x.CourseId,
                        principalTable: "Course",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_Assignment_Lesson_LessonId",
                        column: x => x.LessonId,
                        principalTable: "Lesson",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_Assignment_User_TeacherId",
                        column: x => x.TeacherId,
                        principalTable: "User",
                        principalColumn: "Id");
                });

            migrationBuilder.CreateIndex(
                name: "IX_Assignment_CourseId",
                table: "Assignment",
                column: "CourseId");

            migrationBuilder.CreateIndex(
                name: "IX_Assignment_LessonId",
                table: "Assignment",
                column: "LessonId");

            migrationBuilder.CreateIndex(
                name: "IX_Assignment_TeacherId",
                table: "Assignment",
                column: "TeacherId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "Assignment");

            migrationBuilder.DropColumn(
                name: "FileUrl",
                table: "Lesson");

            migrationBuilder.DropColumn(
                name: "Status",
                table: "Lesson");

            migrationBuilder.DropColumn(
                name: "Category",
                table: "Course");

            migrationBuilder.DropColumn(
                name: "DetailedDescription",
                table: "Course");

            migrationBuilder.DropColumn(
                name: "Level",
                table: "Course");

            migrationBuilder.DropColumn(
                name: "ShortDescription",
                table: "Course");

            migrationBuilder.DropColumn(
                name: "Status",
                table: "Course");
        }
    }
}
