using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace LMS.Api.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddYeuCauNapVi : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "YeuCauNapVi",
                columns: table => new
                {
                    Id = table.Column<string>(type: "nvarchar(450)", nullable: false),
                    NguoiDungId = table.Column<string>(type: "nvarchar(450)", nullable: false),
                    SoTien = table.Column<int>(type: "int", nullable: false),
                    NoiDungChuyenKhoan = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    TrangThai = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    MaGiaoDich = table.Column<string>(type: "nvarchar(450)", nullable: false),
                    NgayTao = table.Column<DateTime>(type: "datetime2", nullable: false),
                    NgayDuyet = table.Column<DateTime>(type: "datetime2", nullable: true),
                    LyDoTuChoi = table.Column<string>(type: "nvarchar(max)", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_YeuCauNapVi", x => x.Id);
                    table.ForeignKey(
                        name: "FK_YeuCauNapVi_NguoiDung_NguoiDungId",
                        column: x => x.NguoiDungId,
                        principalTable: "NguoiDung",
                        principalColumn: "Id");
                });

            migrationBuilder.CreateIndex(
                name: "IX_YeuCauNapVi_MaGiaoDich",
                table: "YeuCauNapVi",
                column: "MaGiaoDich",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_YeuCauNapVi_NguoiDungId_NgayTao",
                table: "YeuCauNapVi",
                columns: new[] { "NguoiDungId", "NgayTao" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "YeuCauNapVi");
        }
    }
}
