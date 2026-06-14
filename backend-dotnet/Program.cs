using System.Text;
using LMS.Api.Data;
using LMS.Api.Services;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using System.Text.Json.Serialization;

var builder = WebApplication.CreateBuilder(args);

builder.Logging.ClearProviders();
builder.Logging.AddConsole();

var connectionString =
    builder.Configuration.GetConnectionString("DefaultConnection")
    ?? builder.Configuration["DATABASE_URL"]
    ?? "Server=127.0.0.1,11433;Database=lms;User Id=sa;Password=LmsPassw0rd#2026;TrustServerCertificate=True;Encrypt=False";

var frontendUrl = builder.Configuration["FRONTEND_URL"] ?? "http://localhost:5173";
var jwtSecret = builder.Configuration["JWT_SECRET"] ?? "change-me-to-a-long-random-secret";
var jwtKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtSecret));
static string? FirstConfigured(params string?[] values) =>
    values.FirstOrDefault(value => !string.IsNullOrWhiteSpace(value));

builder.Services.AddDbContext<LmsDbContext>(options =>
    options.UseSqlServer(connectionString, sqlOptions =>
    {
        sqlOptions.EnableRetryOnFailure();
        sqlOptions.UseQuerySplittingBehavior(QuerySplittingBehavior.SplitQuery);
    }));
builder.Services.AddScoped<IDichVuXacThuc, DichVuXacThuc>();
builder.Services.AddScoped<IDichVuNguoiDung, DichVuNguoiDung>();
builder.Services.AddScoped<IDichVuKhoaHoc, DichVuKhoaHoc>();
builder.Services.AddScoped<IDichVuGhiDanh, DichVuGhiDanh>();
builder.Services.AddScoped<IDichVuThanhToan, DichVuThanhToan>();
builder.Services.AddScoped<IDichVuBaiKiemTra, DichVuBaiKiemTra>();
builder.Services.AddScoped<IDichVuChat, DichVuChat>();

builder.Services.AddControllers()
    .AddJsonOptions(options =>
    {
        options.JsonSerializerOptions.ReferenceHandler = ReferenceHandler.IgnoreCycles;
        options.JsonSerializerOptions.WriteIndented = true;
    });
builder.Services.AddControllersWithViews();
builder.Services.AddOpenApi();
builder.Services.AddSignalR();

var authentication = builder.Services
    .AddAuthentication(options =>
    {
        options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
        options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
    })
    .AddJwtBearer(options =>
    {
        options.Events = new JwtBearerEvents
        {
            OnMessageReceived = context =>
            {
                var accessToken = context.Request.Query["access_token"];
                var path = context.HttpContext.Request.Path;

                if (!string.IsNullOrEmpty(accessToken) && path.StartsWithSegments("/chatHub"))
                {
                    context.Token = accessToken;
                }
                else if (string.IsNullOrWhiteSpace(context.Token) &&
                    context.Request.Cookies.TryGetValue("LmsAuthToken", out var cookieToken))
                {
                    context.Token = cookieToken;
                }

                return Task.CompletedTask;
            }
        };
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = false,
            ValidateAudience = false,
            ValidateIssuerSigningKey = true,
            IssuerSigningKey = jwtKey,
            ClockSkew = TimeSpan.FromMinutes(1)
        };
    })
    .AddCookie("External", options =>
    {
        options.Cookie.Name = "LmsExternalAuth";
        options.ExpireTimeSpan = TimeSpan.FromMinutes(10);
    });

// Google authentication configuration
var googleClientId = FirstConfigured(builder.Configuration["Authentication:Google:ClientId"], builder.Configuration["GOOGLE_CLIENT_ID"]);
var googleClientSecret = FirstConfigured(builder.Configuration["Authentication:Google:ClientSecret"], builder.Configuration["GOOGLE_CLIENT_SECRET"]);
if (!string.IsNullOrWhiteSpace(googleClientId) && !string.IsNullOrWhiteSpace(googleClientSecret))
{
    authentication.AddGoogle("Google", options =>
    {
        options.ClientId = googleClientId;
        options.ClientSecret = googleClientSecret;
        options.SignInScheme = "External";
        options.Events.OnRemoteFailure = context =>
        {
            context.HandleResponse();

            var message = "Không thể đăng nhập bằng Google. Vui lòng kiểm tra lại Google Client ID và Client Secret.";
            if (context.Failure?.Message.Contains("invalid_client", StringComparison.OrdinalIgnoreCase) == true ||
                context.Failure?.Message.Contains("client secret", StringComparison.OrdinalIgnoreCase) == true)
            {
                message = "Google Client Secret không đúng với Client ID hiện tại. Vui lòng cập nhật lại Client Secret trong cấu hình.";
            }

            context.Response.Redirect($"{frontendUrl}/oauth-callback?error={Uri.EscapeDataString(message)}");
            return Task.CompletedTask;
        };
    });
}

builder.Services.AddAuthorization();
builder.Services.AddCors(options =>
{
    options.AddPolicy("Frontend", policy =>
    {
        policy
            .WithOrigins(
                frontendUrl,
                "http://localhost:5173",
                "http://localhost:5174",
                "http://127.0.0.1:5173",
                "http://127.0.0.1:5174")
            .AllowAnyHeader()
            .AllowAnyMethod()
            .AllowCredentials();
    });
});

var app = builder.Build();

await using (var scope = app.Services.CreateAsyncScope())
{
    var db = scope.ServiceProvider.GetRequiredService<LmsDbContext>();
    await db.Database.MigrateAsync();

    if (app.Environment.IsDevelopment())
    {
        await SeedData.SeedAsync(db);
    }
}

if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
}

app.UseCors("Frontend");
app.UseStaticFiles();
app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();
app.MapControllerRoute(
    name: "default",
    pattern: "{controller=SinhVien}/{action=Vi}/{id?}");
app.MapHub<LMS.Api.Hubs.ChatHub>("/chatHub");

app.Run();
