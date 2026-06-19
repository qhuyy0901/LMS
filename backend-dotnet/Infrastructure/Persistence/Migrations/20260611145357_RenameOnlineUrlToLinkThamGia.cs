using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace LMS.Api.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class RenameOnlineUrlToLinkThamGia : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(@"
IF EXISTS(SELECT * FROM sys.columns WHERE Name = N'OnlineUrl' AND Object_ID = Object_ID(N'Event'))
BEGIN
    EXEC sp_rename N'Event.OnlineUrl', N'LinkThamGia', 'COLUMN'
END
ELSE IF NOT EXISTS(SELECT * FROM sys.columns WHERE Name = N'LinkThamGia' AND Object_ID = Object_ID(N'Event'))
BEGIN
    ALTER TABLE Event ADD LinkThamGia nvarchar(max) NULL
END
");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "LinkThamGia",
                table: "Event");
            migrationBuilder.AddColumn<string>(
                name: "OnlineUrl",
                table: "Event",
                type: "nvarchar(max)",
                nullable: true);
        }
    }
}
