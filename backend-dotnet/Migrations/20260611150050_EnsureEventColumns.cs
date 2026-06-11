using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace LMS.Api.Migrations
{
    /// <inheritdoc />
    public partial class EnsureEventColumns : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(@"
                IF COL_LENGTH(N'Event', N'Capacity') IS NULL
                    ALTER TABLE [Event] ADD [Capacity] int NOT NULL CONSTRAINT [DF_Event_Capacity_Fix] DEFAULT 50;

                IF COL_LENGTH(N'Event', N'Format') IS NULL
                    ALTER TABLE [Event] ADD [Format] nvarchar(max) NOT NULL CONSTRAINT [DF_Event_Format_Fix] DEFAULT N'OFFLINE';

                IF COL_LENGTH(N'Event', N'ImageUrl') IS NULL
                    ALTER TABLE [Event] ADD [ImageUrl] nvarchar(max) NULL;

                IF COL_LENGTH(N'Event', N'Type') IS NULL
                    ALTER TABLE [Event] ADD [Type] nvarchar(max) NOT NULL CONSTRAINT [DF_Event_Type_Fix] DEFAULT N'WORKSHOP';
            ");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {

        }
    }
}
