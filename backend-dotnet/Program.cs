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

builder.Services.AddControllers()
    .AddJsonOptions(options =>
    {
        options.JsonSerializerOptions.ReferenceHandler = ReferenceHandler.IgnoreCycles;
        options.JsonSerializerOptions.WriteIndented = true;
    });
builder.Services.AddControllersWithViews();
builder.Services.AddOpenApi();

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
                if (string.IsNullOrWhiteSpace(context.Token) &&
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

// Google and Facebook authentication configuration
var googleClientId = builder.Configuration["Authentication:Google:ClientId"] ?? builder.Configuration["GOOGLE_CLIENT_ID"];
var googleClientSecret = builder.Configuration["Authentication:Google:ClientSecret"] ?? builder.Configuration["GOOGLE_CLIENT_SECRET"];
if (!string.IsNullOrWhiteSpace(googleClientId) && !string.IsNullOrWhiteSpace(googleClientSecret))
{
    authentication.AddGoogle("Google", options =>
    {
        options.ClientId = googleClientId;
        options.ClientSecret = googleClientSecret;
        options.SignInScheme = "External";
    });
}

var facebookAppId = builder.Configuration["Authentication:Facebook:AppId"] ?? builder.Configuration["FACEBOOK_APP_ID"];
var facebookAppSecret = builder.Configuration["Authentication:Facebook:AppSecret"] ?? builder.Configuration["FACEBOOK_APP_SECRET"];
if (!string.IsNullOrWhiteSpace(facebookAppId) && !string.IsNullOrWhiteSpace(facebookAppSecret))
{
    authentication.AddFacebook("Facebook", options =>
    {
        options.AppId = facebookAppId;
        options.AppSecret = facebookAppSecret;
        options.SignInScheme = "External";
        options.Fields.Add("name");
        options.Fields.Add("email");
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

app.Run();
