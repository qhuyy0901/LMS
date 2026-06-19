using LMS.Api.Infrastructure.Persistence;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace LMS.Api.Controllers;

/// <summary>Controller hệ thống — health check, trang chủ API</summary>
[ApiController]
public class HeThongController : ControllerBase
{
    [HttpGet("/")]
    public IActionResult TrangChu() => Content("LMS API đang chạy!");

    [HttpGet("/health")]
    public IActionResult KiemTraSucKhoe() => Ok(new { status = "ok", time = DateTime.UtcNow });

    [HttpGet("/debug-users")]
    public async Task<IActionResult> DebugUsers([FromServices] ApplicationDbContext db, [FromQuery] bool reset = false)
    {
        var users = await db.Users.ToListAsync();
        if (users.Count == 0 || reset)
        {
            if (reset)
            {
                // Clear existing database to re-seed cleanly
                db.Users.RemoveRange(users);
                await db.SaveChangesAsync();
            }
            await SeedData.SeedAsync(db);
            users = await db.Users.ToListAsync();
            return Ok(new { message = "Database seeded/reset successfully!", users = users.Select(u => new { u.Email, u.Role, u.Name }) });
        }
        
        // Check if any user's password does not look like a BCrypt hash (usually starts with $2)
        bool needsReset = users.Any(u => string.IsNullOrWhiteSpace(u.Password) || !u.Password.StartsWith("$2"));
        if (needsReset)
        {
            foreach (var u in users)
            {
                u.Password = BCrypt.Net.BCrypt.HashPassword("123456");
            }
            await db.SaveChangesAsync();
            return Ok(new { message = "Detected old plain-text or invalid hashed passwords. All passwords reset to '123456' successfully using BCrypt!", users = users.Select(u => new { u.Email, u.Role, u.Name }) });
        }

        return Ok(new { message = "Current users in database (all passwords look valid!):", users = users.Select(u => new { u.Email, u.Role, u.Name }) });
    }
}
