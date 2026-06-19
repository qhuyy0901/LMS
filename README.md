# Skillio LMS

Du an LMS Skillio gom backend ASP.NET Core va frontend React. Backend da duoc sap xep theo huong MVC-style Areas + Domain/Application/Infrastructure, nhung van giu cac endpoint hien co de frontend hien tai chay nhu cu.

## Cau truc

- `backend-dotnet`: ma nguon ASP.NET Core.
- `backend-dotnet/Areas`: controller/view theo vai tro Admin, Instructor, Student.
- `backend-dotnet/Domain/Entities`: entity database.
- `backend-dotnet/Application/Services`: service nghiep vu hien co.
- `backend-dotnet/Infrastructure/Persistence`: DbContext, migrations, seed data.
- `backend-dotnet/ViewModels`: ViewModel dung chung.
- `frontend`: giao dien React hien tai.
- `Archive/pending-review`: noi luu cau hinh chua dung trong pham vi hoc phan hien tai.
- `dotnet-tools.json`: cau hinh cong cu .NET, gom `dotnet-ef`.

## Cai dat

```bash
dotnet tool restore
dotnet restore backend-dotnet/LMS.Api.csproj
cd frontend
npm install
```

## Database

Chuan bi SQL Server local hoac cap nhat connection string trong `backend-dotnet/appsettings.json`.

Thong tin database mac dinh:

```txt
Server=127.0.0.1,11433
Database=lms
User Id=sa
Password=LmsPassw0rd#2026
```

Cap nhat schema bang EF Core migrations:

```bash
dotnet tool run dotnet-ef database update --project backend-dotnet/LMS.Api.csproj --startup-project backend-dotnet/LMS.Api.csproj
```

Khi chay o moi truong Development, du lieu seed se duoc them neu database con trong. Tai khoan mau:

```txt
admin@gmail.com / 123456
instructor@gmail.com / 123456
student@gmail.com / 123456
```

## Chay local

Backend:

```bash
dotnet run --project backend-dotnet/LMS.Api.csproj --urls http://localhost:5000
```

Frontend:

```bash
cd frontend
npm run dev
```

## Build

```bash
dotnet build backend-dotnet/LMS.Api.csproj
cd frontend
npm run build
```

## Bien moi truong

Backend doc cau hinh tu `backend-dotnet/appsettings.json` hoac environment variables:

```env
ConnectionStrings__DefaultConnection=Server=127.0.0.1,11433;Database=lms;User Id=sa;Password=LmsPassw0rd#2026;TrustServerCertificate=True;Encrypt=False
JWT_SECRET=change-me-to-a-long-random-secret
FRONTEND_URL=http://localhost:5173
```












dotnet run --project backend-dotnet/LMS.Api.csproj --urls http://localhost:5000


cd frontend
npm run dev
