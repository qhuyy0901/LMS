using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace LMS.Api.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddSavedCourses : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "SavedCourse",
                columns: table => new
                {
                    Id = table.Column<string>(type: "nvarchar(450)", nullable: false),
                    UserId = table.Column<string>(type: "nvarchar(450)", nullable: false),
                    CourseId = table.Column<string>(type: "nvarchar(450)", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_SavedCourse", x => x.Id);
                    table.ForeignKey(
                        name: "FK_SavedCourse_Course_CourseId",
                        column: x => x.CourseId,
                        principalTable: "Course",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_SavedCourse_User_UserId",
                        column: x => x.UserId,
                        principalTable: "User",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_SavedCourse_CourseId",
                table: "SavedCourse",
                column: "CourseId");

            migrationBuilder.CreateIndex(
                name: "IX_SavedCourse_UserId_CourseId",
                table: "SavedCourse",
                columns: new[] { "UserId", "CourseId" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_SavedCourse_UserId_CreatedAt",
                table: "SavedCourse",
                columns: new[] { "UserId", "CreatedAt" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(name: "SavedCourse");
        }
    }
}
