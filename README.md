# Skillio LMS

Monorepo cho dự án LMS, gồm:

- `frontend`: React/Vite app
- `backend`: Express/Prisma API

## Cài đặt

```bash
npm run install:all
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

Frontend mặc định chạy ở `http://localhost:5173` hoặc `http://localhost:5174`.
Backend mặc định chạy ở `http://localhost:3000`.

## Biến môi trường

Backend: tạo `backend/.env` từ `backend/.env.example`, tối thiểu cần:

```env
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/lms
JWT_SECRET=change-me-to-a-long-random-secret
FRONTEND_URL=http://localhost:5173
```

Frontend: tạo `frontend/.env`:

```env
VITE_API_URL=http://localhost:3000
```

## Database

```bash
npm run db:push
npm run db:seed
```

Tài khoản seed:

```txt
admin@gmail.com / 123456
instructor@gmail.com / 123456
student@gmail.com / 123456
```

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

## Ghi chú Git

Hiện tại `frontend` và `backend` vẫn là 2 git repo riêng. Nếu muốn chuyển hẳn thành 1 repo GitHub duy nhất, hãy tạo repo ở thư mục gốc và bỏ metadata `.git` con sau khi đã backup hoặc xác nhận không cần giữ lịch sử riêng.
