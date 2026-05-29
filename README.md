# Skillio LMS

Dự án LMS Skillio hiện là API backend ASP.NET Core C# dùng Entity Framework Core và SQL Server.

## Cấu trúc

- `backend-dotnet`: mã nguồn API ASP.NET Core.
- `docker-compose.yml`: SQL Server local.
- `dotnet-tools.json`: cấu hình công cụ .NET, gồm `dotnet-ef`.

## Cài đặt

```bash
dotnet tool restore
dotnet restore backend-dotnet/LMS.Api.csproj
```

## Database

Chạy SQL Server local bằng Docker Compose:

```bash
docker compose up -d
```

Thông tin database mặc định:

```txt
Server=127.0.0.1,11433
Database=lms
User Id=sa
Password=LmsPassw0rd#2026
```

Cập nhật schema bằng EF Core migrations:

```bash
dotnet tool run dotnet-ef database update --project backend-dotnet/LMS.Api.csproj --startup-project backend-dotnet/LMS.Api.csproj
```

Khi chạy ở môi trường Development, dữ liệu seed sẽ được thêm nếu database còn trống. Tài khoản mẫu:

```txt
admin@gmail.com / 123456
instructor@gmail.com / 123456
student@gmail.com / 123456
```

## Chạy local

```bash
dotnet run --project backend-dotnet/LMS.Api.csproj --urls http://localhost:5000
```

API chạy tại:

```txt
http://localhost:5000
```

## Build

```bash
dotnet build backend-dotnet/LMS.Api.csproj
```

## Biến môi trường

Backend đọc cấu hình từ `backend-dotnet/appsettings.json` hoặc environment variables:

```env
ConnectionStrings__DefaultConnection=Server=127.0.0.1,11433;Database=lms;User Id=sa;Password=LmsPassw0rd#2026;TrustServerCertificate=True;Encrypt=False
JWT_SECRET=change-me-to-a-long-random-secret
FRONTEND_URL=http://localhost:5173
```
