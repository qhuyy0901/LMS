using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace LMS.Api.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddCourseIdAndNullableLessonIdToBinhLuan : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AlterColumn<string>(
                name: "BaiHocId",
                table: "BinhLuan",
                type: "nvarchar(450)",
                nullable: true,
                oldClrType: typeof(string),
                oldType: "nvarchar(450)");

            migrationBuilder.AddColumn<string>(
                name: "KhoaHocId",
                table: "BinhLuan",
                type: "nvarchar(450)",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_BinhLuan_KhoaHocId",
                table: "BinhLuan",
                column: "KhoaHocId");

            migrationBuilder.AddForeignKey(
                name: "FK_BinhLuan_KhoaHoc_KhoaHocId",
                table: "BinhLuan",
                column: "KhoaHocId",
                principalTable: "KhoaHoc",
                principalColumn: "Id");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_BinhLuan_KhoaHoc_KhoaHocId",
                table: "BinhLuan");

            migrationBuilder.DropIndex(
                name: "IX_BinhLuan_KhoaHocId",
                table: "BinhLuan");

            migrationBuilder.DropColumn(
                name: "KhoaHocId",
                table: "BinhLuan");

            migrationBuilder.AlterColumn<string>(
                name: "BaiHocId",
                table: "BinhLuan",
                type: "nvarchar(450)",
                nullable: false,
                defaultValue: "",
                oldClrType: typeof(string),
                oldType: "nvarchar(450)",
                oldNullable: true);
        }
    }
}
