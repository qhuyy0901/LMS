using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace LMS.Api.Migrations
{
    /// <inheritdoc />
    public partial class EnsureCourseScheduleColumns : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql("""
                IF COL_LENGTH('Course', 'StartDate') IS NULL
                    ALTER TABLE [Course] ADD [StartDate] datetime2 NULL;

                IF COL_LENGTH('Course', 'EndDate') IS NULL
                    ALTER TABLE [Course] ADD [EndDate] datetime2 NULL;
                """);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql("""
                IF COL_LENGTH('Course', 'StartDate') IS NOT NULL
                    ALTER TABLE [Course] DROP COLUMN [StartDate];

                IF COL_LENGTH('Course', 'EndDate') IS NOT NULL
                    ALTER TABLE [Course] DROP COLUMN [EndDate];
                """);
        }
    }
}
