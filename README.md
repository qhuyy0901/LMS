# Skillio LMS

Monorepo cho dự án LMS:

- `frontend`: ứng dụng React/Vite
- `backend-dotnet`: API ASP.NET Core C# dùng Entity Framework Core và SQL Server

Backend mặc định hiện tại là ASP.NET Core tại `http://localhost:5000`. Backend Node.js/Express đã được loại khỏi repo.

## Cài Đặt

```bash
npm run install:all
dotnet tool restore
```

## Database

Dự án dùng SQL Server. Cách nhanh nhất để chạy local là dùng Docker Compose:

```bash
docker compose up -d
```

Database local mặc định:

```txt
Server=127.0.0.1,11433
Database=lms
User Id=sa
Password=LmsPassw0rd#2026
```

Tạo schema bằng EF Core migrations:

```bash
npm run db:migrate
```

Khi chạy ASP.NET Core ở môi trường Development, dữ liệu seed sẽ tự được thêm nếu database còn trống. Tài khoản mẫu:

```txt
admin@gmail.com / 123456
instructor@gmail.com / 123456
student@gmail.com / 123456
```

## Biến Môi Trường

Frontend:

```env
VITE_API_URL=http://localhost:5000
```

Backend ASP.NET Core đọc cấu hình từ `backend-dotnet/appsettings.json` hoặc environment variables:

```env
ConnectionStrings__DefaultConnection=Server=127.0.0.1,11433;Database=lms;User Id=sa;Password=LmsPassw0rd#2026;TrustServerCertificate=True;Encrypt=False
JWT_SECRET=change-me-to-a-long-random-secret
FRONTEND_URL=http://localhost:5173
```

## Chạy Local

Một lệnh từ root repo:

```bash
npm run dev
```

Lệnh này chạy:

- Backend ASP.NET Core: `http://localhost:5000`
- Frontend Vite: `http://localhost:5173`

Chạy riêng từng phần:

```bash
npm run dev:backend
npm run dev:frontend
```

## Build / Kiểm Tra

```bash
npm run build:frontend
npm run test:backend
```

`test:backend` hiện build project ASP.NET Core. Nếu cần test API sâu hơn, thêm test project .NET riêng.

## Deploy

Frontend:

```env
VITE_API_URL=https://your-backend.example.com
```

Backend:

```env
ConnectionStrings__DefaultConnection=Server=...;Database=lms;User Id=...;Password=...;TrustServerCertificate=True;Encrypt=True
JWT_SECRET=...
FRONTEND_URL=https://your-frontend.example.com
```
