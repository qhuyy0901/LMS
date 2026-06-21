using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace LMS.Api.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddDanhMucTable : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "DanhMucId",
                table: "KhoaHoc",
                type: "nvarchar(450)",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "DanhMuc",
                columns: table => new
                {
                    Id = table.Column<string>(type: "nvarchar(450)", nullable: false),
                    Ten = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    Slug = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    MoTa = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: true),
                    HoatDong = table.Column<bool>(type: "bit", nullable: false),
                    NgayTao = table.Column<DateTime>(type: "datetime2", nullable: false),
                    NgayCapNhat = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_DanhMuc", x => x.Id);
                });

            migrationBuilder.CreateIndex(
                name: "IX_KhoaHoc_DanhMucId",
                table: "KhoaHoc",
                column: "DanhMucId");

            migrationBuilder.CreateIndex(
                name: "IX_DanhMuc_Slug",
                table: "DanhMuc",
                column: "Slug",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_DanhMuc_Ten",
                table: "DanhMuc",
                column: "Ten",
                unique: true);

            migrationBuilder.AddForeignKey(
                name: "FK_KhoaHoc_DanhMuc_DanhMucId",
                table: "KhoaHoc",
                column: "DanhMucId",
                principalTable: "DanhMuc",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_KhoaHoc_DanhMuc_DanhMucId",
                table: "KhoaHoc");

            migrationBuilder.DropTable(
                name: "DanhMuc");

            migrationBuilder.DropIndex(
                name: "IX_KhoaHoc_DanhMucId",
                table: "KhoaHoc");

            migrationBuilder.DropColumn(
                name: "DanhMucId",
                table: "KhoaHoc");
        }
    }
}
