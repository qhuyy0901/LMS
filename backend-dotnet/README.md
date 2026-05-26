# LMS ASP.NET Core API

Backend ASP.NET Core/C# cho dự án LMS.

## Chạy local

```bash
dotnet restore
dotnet tool restore
dotnet run --project backend-dotnet/LMS.Api.csproj --urls http://localhost:5000
```

API mặc định:

```txt
http://localhost:5000
```

Nếu muốn frontend dùng backend C#, cập nhật `frontend/.env`:

```env
VITE_API_URL=http://localhost:5000
```

## Database

Backend này dùng SQL Server. Connection string mặc định nằm trong `appsettings.json`:

```txt
Server=127.0.0.1,11433;Database=lms;User Id=sa;Password=LmsPassw0rd#2026;TrustServerCertificate=True;Encrypt=False
```

Chạy SQL Server local bằng Docker Compose ở thư mục gốc:

```bash
docker compose up -d
```

Tạo hoặc cập nhật schema bằng EF Core migration:

```bash
dotnet tool restore
dotnet tool run dotnet-ef database update --project backend-dotnet/LMS.Api.csproj --startup-project backend-dotnet/LMS.Api.csproj
```

Hoặc dùng script ở thư mục gốc:

```bash
npm run db:dotnet:migrate
```

## Dữ liệu mẫu

Khi chạy backend ở môi trường Development, hệ thống tự tạo dữ liệu mẫu nếu database chưa có user.

| Vai trò | Email | Mật khẩu |
| --- | --- | --- |
| Quản trị viên | `admin@gmail.com` | `123456` |
| Giảng viên | `instructor@gmail.com` | `123456` |
| Học viên | `student@gmail.com` | `123456` |

## Migration

Migration đầu tiên đã được tạo tại `backend-dotnet/Migrations`.

Khi thay đổi model, tạo migration mới bằng:

```bash
dotnet tool run dotnet-ef migrations add TenMigration --project backend-dotnet/LMS.Api.csproj --startup-project backend-dotnet/LMS.Api.csproj --output-dir Migrations
```

## API đã migrate sang C#

- Auth: đăng ký, đăng nhập, lấy người dùng hiện tại.
- User: hồ sơ, avatar mock, lịch sử ví, chứng chỉ, xóa tài khoản.
- Courses: danh sách, chi tiết, ghi danh, đánh giá, tiến độ học, bình luận.
- Instructor: dashboard, doanh thu, học viên, tạo/sửa/publish khóa học, chương, bài học, reorder giáo trình, upload video mock.
- Payments: nạp ví mock, mua khóa học bằng ví, áp dụng coupon.
- Quiz: tạo/sửa/xóa quiz, lấy quiz theo bài học, nộp bài.
- Admin: người dùng, khóa học, giao dịch, audit logs.
- Coupon: tạo, liệt kê, validate, bật/tắt, xóa.

## Lưu ý

Upload avatar/video hiện đang ở chế độ mock để frontend không lỗi khi chạy local. Nếu cần upload thật, nên nối Cloudinary hoặc lưu file local qua `IFormFile`.
