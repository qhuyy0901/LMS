using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace LMS.Api.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddEventRegistrationCreatedAt : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(
                """
                IF COL_LENGTH(N'EventRegistration', N'CreatedAt') IS NULL
                    ALTER TABLE [EventRegistration] ADD [CreatedAt] datetime2 NOT NULL
                        CONSTRAINT [DF_EventRegistration_CreatedAt] DEFAULT SYSUTCDATETIME();
                """);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(
                """
                IF COL_LENGTH(N'EventRegistration', N'CreatedAt') IS NOT NULL
                    ALTER TABLE [EventRegistration] DROP COLUMN [CreatedAt];
                """);
        }
    }
}
