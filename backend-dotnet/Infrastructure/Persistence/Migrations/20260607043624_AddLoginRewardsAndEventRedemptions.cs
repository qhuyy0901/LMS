using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace LMS.Api.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddLoginRewardsAndEventRedemptions : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<DateTime>(
                name: "LastRewardLoginDate",
                table: "User",
                type: "datetime2",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "LoginStreak",
                table: "User",
                type: "int",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<int>(
                name: "RewardPoints",
                table: "User",
                type: "int",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.CreateTable(
                name: "EventRewardRedemption",
                columns: table => new
                {
                    Id = table.Column<string>(type: "nvarchar(450)", nullable: false),
                    RewardId = table.Column<string>(type: "nvarchar(450)", nullable: false),
                    EventTitle = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    PointCost = table.Column<int>(type: "int", nullable: false),
                    UserId = table.Column<string>(type: "nvarchar(450)", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_EventRewardRedemption", x => x.Id);
                    table.ForeignKey(
                        name: "FK_EventRewardRedemption_User_UserId",
                        column: x => x.UserId,
                        principalTable: "User",
                        principalColumn: "Id");
                });

            migrationBuilder.CreateIndex(
                name: "IX_EventRewardRedemption_UserId_RewardId",
                table: "EventRewardRedemption",
                columns: new[] { "UserId", "RewardId" },
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "EventRewardRedemption");

            migrationBuilder.DropColumn(
                name: "LastRewardLoginDate",
                table: "User");

            migrationBuilder.DropColumn(
                name: "LoginStreak",
                table: "User");

            migrationBuilder.DropColumn(
                name: "RewardPoints",
                table: "User");
        }
    }
}
