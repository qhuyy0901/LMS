using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace LMS.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddTeacherVouchers : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AlterColumn<string>(
                name: "CouponId",
                table: "Purchase",
                type: "nvarchar(450)",
                nullable: true,
                oldClrType: typeof(string),
                oldType: "nvarchar(max)",
                oldNullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "IsPrivate",
                table: "Coupon",
                type: "bit",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<string>(
                name: "Status",
                table: "Coupon",
                type: "nvarchar(max)",
                nullable: false,
                defaultValue: "ACTIVE");

            migrationBuilder.AddColumn<string>(
                name: "TeacherId",
                table: "Coupon",
                type: "nvarchar(450)",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "CouponRecipient",
                columns: table => new
                {
                    Id = table.Column<string>(type: "nvarchar(450)", nullable: false),
                    CouponId = table.Column<string>(type: "nvarchar(450)", nullable: false),
                    UserId = table.Column<string>(type: "nvarchar(450)", nullable: false),
                    TeacherId = table.Column<string>(type: "nvarchar(450)", nullable: false),
                    SourceCourseId = table.Column<string>(type: "nvarchar(450)", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_CouponRecipient", x => x.Id);
                    table.ForeignKey(
                        name: "FK_CouponRecipient_Coupon_CouponId",
                        column: x => x.CouponId,
                        principalTable: "Coupon",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_CouponRecipient_Course_SourceCourseId",
                        column: x => x.SourceCourseId,
                        principalTable: "Course",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_CouponRecipient_User_TeacherId",
                        column: x => x.TeacherId,
                        principalTable: "User",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_CouponRecipient_User_UserId",
                        column: x => x.UserId,
                        principalTable: "User",
                        principalColumn: "Id");
                });

            migrationBuilder.CreateTable(
                name: "CouponUsage",
                columns: table => new
                {
                    Id = table.Column<string>(type: "nvarchar(450)", nullable: false),
                    CouponId = table.Column<string>(type: "nvarchar(450)", nullable: false),
                    UserId = table.Column<string>(type: "nvarchar(450)", nullable: false),
                    CourseId = table.Column<string>(type: "nvarchar(450)", nullable: false),
                    PurchaseId = table.Column<string>(type: "nvarchar(450)", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_CouponUsage", x => x.Id);
                    table.ForeignKey(
                        name: "FK_CouponUsage_Coupon_CouponId",
                        column: x => x.CouponId,
                        principalTable: "Coupon",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_CouponUsage_Course_CourseId",
                        column: x => x.CourseId,
                        principalTable: "Course",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_CouponUsage_Purchase_PurchaseId",
                        column: x => x.PurchaseId,
                        principalTable: "Purchase",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_CouponUsage_User_UserId",
                        column: x => x.UserId,
                        principalTable: "User",
                        principalColumn: "Id");
                });

            migrationBuilder.CreateIndex(
                name: "IX_Purchase_CouponId",
                table: "Purchase",
                column: "CouponId");

            migrationBuilder.CreateIndex(
                name: "IX_Coupon_TeacherId",
                table: "Coupon",
                column: "TeacherId");

            migrationBuilder.CreateIndex(
                name: "IX_CouponRecipient_CouponId_UserId",
                table: "CouponRecipient",
                columns: new[] { "CouponId", "UserId" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_CouponRecipient_SourceCourseId",
                table: "CouponRecipient",
                column: "SourceCourseId");

            migrationBuilder.CreateIndex(
                name: "IX_CouponRecipient_TeacherId",
                table: "CouponRecipient",
                column: "TeacherId");

            migrationBuilder.CreateIndex(
                name: "IX_CouponRecipient_UserId",
                table: "CouponRecipient",
                column: "UserId");

            migrationBuilder.CreateIndex(
                name: "IX_CouponUsage_CouponId_UserId",
                table: "CouponUsage",
                columns: new[] { "CouponId", "UserId" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_CouponUsage_CourseId",
                table: "CouponUsage",
                column: "CourseId");

            migrationBuilder.CreateIndex(
                name: "IX_CouponUsage_PurchaseId",
                table: "CouponUsage",
                column: "PurchaseId",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_CouponUsage_UserId",
                table: "CouponUsage",
                column: "UserId");

            migrationBuilder.AddForeignKey(
                name: "FK_Coupon_User_TeacherId",
                table: "Coupon",
                column: "TeacherId",
                principalTable: "User",
                principalColumn: "Id");

            migrationBuilder.AddForeignKey(
                name: "FK_Purchase_Coupon_CouponId",
                table: "Purchase",
                column: "CouponId",
                principalTable: "Coupon",
                principalColumn: "Id");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Coupon_User_TeacherId",
                table: "Coupon");

            migrationBuilder.DropForeignKey(
                name: "FK_Purchase_Coupon_CouponId",
                table: "Purchase");

            migrationBuilder.DropTable(
                name: "CouponRecipient");

            migrationBuilder.DropTable(
                name: "CouponUsage");

            migrationBuilder.DropIndex(
                name: "IX_Purchase_CouponId",
                table: "Purchase");

            migrationBuilder.DropIndex(
                name: "IX_Coupon_TeacherId",
                table: "Coupon");

            migrationBuilder.DropColumn(
                name: "IsPrivate",
                table: "Coupon");

            migrationBuilder.DropColumn(
                name: "Status",
                table: "Coupon");

            migrationBuilder.DropColumn(
                name: "TeacherId",
                table: "Coupon");

            migrationBuilder.AlterColumn<string>(
                name: "CouponId",
                table: "Purchase",
                type: "nvarchar(max)",
                nullable: true,
                oldClrType: typeof(string),
                oldType: "nvarchar(450)",
                oldNullable: true);
        }
    }
}
