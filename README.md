# Skillio LMS

Monorepo cho dự án LMS, gồm:

- `frontend`: ứng dụng React/Vite
- `backend`: API Express/Prisma

## Cài đặt

```bash
npm run install:all
```

## Biến môi trường

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
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/lms
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
- `backend/prisma/migrations`
- `backend/prisma/seed.cjs`
- các file `.env.example`

Project dùng PostgreSQL. Khi chạy local, hãy cài PostgreSQL hoặc dùng PostgreSQL qua Docker, sau đó tạo database tên `lms`.

Nếu database local đang trống, tạo schema và seed dữ liệu:

```bash
npm run db:push
npm run db:seed
```

Nếu deploy lên Render/production và muốn dùng migration:

```bash
npm run db:migrate
```

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

## Chạy local

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

## Deploy

Frontend:

```env
VITE_API_URL=https://your-backend.onrender.com
```

Backend:

```env
DATABASE_URL=...
JWT_SECRET=...
FRONTEND_URL=https://your-frontend.vercel.app
```

Sau khi set env backend trên Render, hãy redeploy service để biến môi trường có hiệu lực.
