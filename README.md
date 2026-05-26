# Skillio LMS

Monorepo cho dự án LMS, gồm:

- `frontend`: ứng dụng React/Vite
- `backend`: API Express/Prisma
- `backend-dotnet`: API ASP.NET Core đang được migrate/đối chiếu, chưa phải backend mặc định

Backend mặc định của frontend hiện tại là `backend` Node/Express tại `http://localhost:3000`.
Chỉ đổi `VITE_API_URL` sang `http://localhost:5000` khi muốn chạy thử backend .NET.

## Cài Đặt

```bash
npm run install:all
```

## Biến Môi Trường

Tạo file môi trường cho backend:

```bash
cp backend/.env.example backend/.env
```

Tạo file môi trường cho frontend:

```bash
cp frontend/.env.example frontend/.env
```

Giá trị local mặc định:

```env
# backend/.env
PORT=3000
NODE_ENV=development
DATABASE_URL=sqlserver://localhost:1433;database=lms;user=sa;password=YourStrongPassword123;encrypt=true;trustServerCertificate=true
JWT_SECRET=change-me-to-a-long-random-secret
FRONTEND_URL=http://localhost:5173
```

```env
# frontend/.env
VITE_API_URL=http://localhost:3000
```

## Database

Không push database thật lên Git. Git chỉ nên lưu:

- `backend/prisma/schema.prisma`
- `backend/prisma/seed.cjs`
- các file `.env.example`

Project hiện dùng SQL Server qua Prisma. Khi chạy local, hãy cài SQL Server hoặc dùng SQL Server qua Docker, sau đó tạo database tên `lms`.

Ví dụ chạy SQL Server bằng Docker Compose:

```bash
docker compose up -d
```

Nếu database local đang trống, tạo schema và seed dữ liệu:

```bash
npm run db:push
npm run db:seed
```

Lưu ý: các migration cũ trong repo được tạo cho PostgreSQL, không dùng cho SQL Server. Với bản SQL Server hiện tại, dùng `db:push` để dựng schema.

Tài khoản seed:

```txt
admin@gmail.com / 123456
instructor@gmail.com / 123456
student@gmail.com / 123456
```

Mở Prisma Studio:

```bash
npm run db:studio
```

## Chạy Local

Chạy Node/Express backend mặc định.

Một lệnh từ root repo:

```bash
npm run dev
```

Lệnh này chạy backend Node tại `http://localhost:3000` và frontend Vite tại
`http://localhost:5173`. Nếu muốn xem log riêng từng service, dùng cách 2
terminal bên dưới.

Terminal 1:

```bash
npm run dev:backend
```

Terminal 2:

```bash
npm run dev:frontend
```

Frontend mặc định chạy ở `http://localhost:5173`.
Backend mặc định chạy ở `http://localhost:3000`.

Nếu frontend được mở bằng `http://127.0.0.1:5173` hoặc Vite tự nhảy sang
`5174`, backend đã whitelist các origin local này. Khi gặp lỗi login/API
`ERR_CONNECTION_REFUSED`, kiểm tra `frontend/.env` trước: Node backend dùng
`VITE_API_URL=http://127.0.0.1:3000`; chỉ đổi sang `5000` khi chạy backend .NET.

Chạy thử backend .NET:

```bash
npm run dev:backend:dotnet
```

Sau đó đổi `frontend/.env` sang:

```env
VITE_API_URL=http://127.0.0.1:5000
```

## Deploy

Frontend:

```env
VITE_API_URL=https://your-backend.onrender.com
```

Backend:

```env
DATABASE_URL=sqlserver://host:1433;database=lms;user=sa;password=...;encrypt=true;trustServerCertificate=true
JWT_SECRET=...
FRONTEND_URL=https://your-frontend.vercel.app
```

Sau khi set env backend trên Render, hãy redeploy service để biến môi trường có hiệu lực.
