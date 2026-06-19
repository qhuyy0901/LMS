using LMS.Api.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace LMS.Api.Infrastructure.Persistence.Migrations
{
    [DbContext(typeof(ApplicationDbContext))]
    [Migration("20260617093000_AddEventPointCost")]
    public partial class AddEventPointCost : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql("""
                IF COL_LENGTH(N'Event', N'PointCost') IS NULL
                    ALTER TABLE [Event] ADD [PointCost] int NOT NULL
                        CONSTRAINT [DF_Event_PointCost] DEFAULT 0;

                IF COL_LENGTH(N'EventRegistration', N'PointsUsed') IS NULL
                    ALTER TABLE [EventRegistration] ADD [PointsUsed] int NOT NULL
                        CONSTRAINT [DF_EventRegistration_PointsUsed] DEFAULT 0;
                """);
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql("""
                IF COL_LENGTH(N'EventRegistration', N'PointsUsed') IS NOT NULL
                BEGIN
                    IF OBJECT_ID(N'DF_EventRegistration_PointsUsed', N'D') IS NOT NULL
                        ALTER TABLE [EventRegistration] DROP CONSTRAINT [DF_EventRegistration_PointsUsed];
                    ALTER TABLE [EventRegistration] DROP COLUMN [PointsUsed];
                END

                IF COL_LENGTH(N'Event', N'PointCost') IS NOT NULL
                BEGIN
                    IF OBJECT_ID(N'DF_Event_PointCost', N'D') IS NOT NULL
                        ALTER TABLE [Event] DROP CONSTRAINT [DF_Event_PointCost];
                    ALTER TABLE [Event] DROP COLUMN [PointCost];
                END
                """);
        }
    }
}
