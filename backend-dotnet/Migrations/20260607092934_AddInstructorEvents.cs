using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace LMS.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddInstructorEvents : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // Some existing local databases already contain these tables from manual setup.
            // Keep the migration idempotent so EF can reconcile their migration history.
            migrationBuilder.Sql(
                """
                IF OBJECT_ID(N'[Event]', N'U') IS NULL
                BEGIN
                    CREATE TABLE [Event] (
                        [Id] nvarchar(450) NOT NULL,
                        [Title] nvarchar(max) NOT NULL,
                        [Description] nvarchar(max) NOT NULL,
                        [Type] nvarchar(max) NOT NULL CONSTRAINT [DF_Event_Type] DEFAULT N'WORKSHOP',
                        [Format] nvarchar(max) NOT NULL CONSTRAINT [DF_Event_Format] DEFAULT N'OFFLINE',
                        [StartAt] datetime2 NOT NULL,
                        [EndAt] datetime2 NOT NULL,
                        [Location] nvarchar(max) NULL,
                        [OnlineUrl] nvarchar(max) NULL,
                        [ImageUrl] nvarchar(max) NULL,
                        [Capacity] int NOT NULL CONSTRAINT [DF_Event_Capacity] DEFAULT 50,
                        [Status] nvarchar(450) NOT NULL CONSTRAINT [DF_Event_Status] DEFAULT N'DRAFT',
                        [InstructorId] nvarchar(450) NOT NULL,
                        [CreatedAt] datetime2 NOT NULL,
                        [UpdatedAt] datetime2 NOT NULL,
                        CONSTRAINT [PK_Event] PRIMARY KEY ([Id]),
                        CONSTRAINT [FK_Event_User_InstructorId] FOREIGN KEY ([InstructorId]) REFERENCES [User] ([Id])
                    );
                END;

                IF OBJECT_ID(N'[EventRegistration]', N'U') IS NULL
                BEGIN
                    CREATE TABLE [EventRegistration] (
                        [Id] nvarchar(450) NOT NULL,
                        [EventId] nvarchar(450) NOT NULL,
                        [UserId] nvarchar(450) NOT NULL,
                        [Status] nvarchar(max) NOT NULL CONSTRAINT [DF_EventRegistration_Status] DEFAULT N'REGISTERED',
                        [RegisteredAt] datetime2 NOT NULL,
                        [UpdatedAt] datetime2 NOT NULL,
                        CONSTRAINT [PK_EventRegistration] PRIMARY KEY ([Id]),
                        CONSTRAINT [FK_EventRegistration_Event_EventId] FOREIGN KEY ([EventId]) REFERENCES [Event] ([Id]),
                        CONSTRAINT [FK_EventRegistration_User_UserId] FOREIGN KEY ([UserId]) REFERENCES [User] ([Id])
                    );
                END;

                IF COL_LENGTH(N'EventRegistration', N'RegisteredAt') IS NULL
                    ALTER TABLE [EventRegistration] ADD [RegisteredAt] datetime2 NOT NULL
                        CONSTRAINT [DF_EventRegistration_RegisteredAt] DEFAULT SYSUTCDATETIME();

                IF COL_LENGTH(N'EventRegistration', N'UpdatedAt') IS NULL
                    ALTER TABLE [EventRegistration] ADD [UpdatedAt] datetime2 NOT NULL
                        CONSTRAINT [DF_EventRegistration_UpdatedAt] DEFAULT SYSUTCDATETIME();

                IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_Event_InstructorId' AND object_id = OBJECT_ID(N'[Event]'))
                    EXEC(N'CREATE INDEX [IX_Event_InstructorId] ON [Event] ([InstructorId]);');

                IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_Event_Status_StartAt' AND object_id = OBJECT_ID(N'[Event]'))
                    EXEC(N'CREATE INDEX [IX_Event_Status_StartAt] ON [Event] ([Status], [StartAt]);');

                IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_EventRegistration_EventId_UserId' AND object_id = OBJECT_ID(N'[EventRegistration]'))
                    EXEC(N'CREATE UNIQUE INDEX [IX_EventRegistration_EventId_UserId] ON [EventRegistration] ([EventId], [UserId]);');

                IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_EventRegistration_UserId_RegisteredAt' AND object_id = OBJECT_ID(N'[EventRegistration]'))
                    EXEC(N'CREATE INDEX [IX_EventRegistration_UserId_RegisteredAt] ON [EventRegistration] ([UserId], [RegisteredAt]);');
                """);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "EventRegistration");

            migrationBuilder.DropTable(
                name: "Event");
        }
    }
}
