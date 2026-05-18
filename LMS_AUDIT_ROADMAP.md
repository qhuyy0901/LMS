# LMS Audit Roadmap

Generated: 2026-05-13

Scope: architecture, database design, API design, frontend design, and security audit for the current LMS codebase.

## Executive Summary

The project already has a usable LMS core:

- Student auth, protected routes, and role-based navigation.
- Published course catalog, course detail, enrollment, learning workspace, lesson progress, comments, reviews, and certificate issuance in the backend.
- Instructor course builder with sections, lessons, video upload, reorder, publish/unpublish.
- Internal wallet, Stripe/mock top-up, paid course purchase, membership tiers, wallet transactions.
- Role-tailored dashboard stats for student, instructor, and admin.

The biggest gap is not the lack of a course player. The bigger issue is that several visible screens imply features that are not actually implemented, while admin, assessment, reporting, and security/account controls are still thin. For an MVP, hide or clearly mark fake/static areas. For a production LMS, prioritize the items below.

## P0 - Must Fix Before Production

### 1. Build Real Admin Operations

Evidence:

- Backend has only `/api/dashboard/stats` for admin-level data.
- There is no `admin.routes.js`.
- Frontend links to admin-like pages such as `/admin/users`, but no route exists in `frontend/src/App.jsx`.

Impact:

- No way to manage users, roles, courses, payments, refunds, pending transactions, reports, or abuse.
- Admin dashboard is observational only.

Recommended implementation:

- Add `/api/admin/users` with list/search/pagination, role update, lock/unlock, delete/restore.
- Add `/api/admin/courses` with moderation, publish override, takedown, owner transfer.
- Add `/api/admin/payments` with transaction review, refund workflow, pending payment reconciliation.
- Add frontend routes: `/admin/users`, `/admin/courses`, `/admin/payments`, `/admin/audit-log`.
- Add an `AuditLog` database model for admin actions.

### 2. Add Assessment System

Evidence:

- `prisma/schema.prisma` has no quiz, assignment, question, submission, or grade models.
- `frontend/src/pages/MyCourses.jsx` shows "Bài tập cần hoàn thành" using static UI.
- `frontend/src/pages/Reports.jsx` shows scores and skill analytics using static values.

Impact:

- The product can host videos, but cannot evaluate learning.
- Reports cannot be trusted because there is no assessment source of truth.

Recommended implementation:

- Add models: `Quiz`, `QuizQuestion`, `QuizAttempt`, `QuizAnswer`, `Assignment`, `Submission`, `Grade`.
- Add instructor UI to create quizzes/assignments per lesson or section.
- Add student UI to submit quiz/assignment.
- Add grading and attempt history.
- Feed reports from real progress and grade data.

### 3. Replace Static Product Screens With Real Data Or Hide Them

Evidence:

- `frontend/src/pages/Events.jsx`, `frontend/src/pages/Instructors.jsx`, and large parts of `frontend/src/pages/Reports.jsx` are static.
- `frontend/src/pages/InstructorDashboard.jsx` hardcodes rating as `4.8/5`.
- `frontend/src/pages/Explore.jsx` has static hero, trending topics, recommendations, and top instructors.

Impact:

- Users will see numbers/actions that are not backed by the database.
- This damages trust more than an absent feature.

Recommended implementation:

- MVP option: remove/hide static nav entries until implemented.
- Product option: create real `Event`, `InstructorProfile`, `LearningReport`, `Recommendation` APIs.
- Replace hardcoded dashboard stats with backend aggregates.

### 4. Strengthen Authentication And Account Security

Evidence:

- Auth only supports register/login with 24h JWT.
- Tokens are stored in `localStorage` in `frontend/src/context/AuthContext.jsx`.
- Settings UI shows password change, 2FA, sessions, but there are no backend APIs for them.
- `.env.example` uses `JWT_SECRET=change-me-to-a-long-random-secret`.

Impact:

- XSS would expose bearer tokens from localStorage.
- Users cannot recover accounts or rotate compromised passwords.
- Security UI is misleading.

Recommended implementation:

- Add password change and forgot/reset password flow.
- Add email verification.
- Add short-lived access token plus refresh token in httpOnly, Secure, SameSite cookies.
- Validate production startup: fail if `JWT_SECRET` is missing/default/too short.
- Remove or disable fake 2FA/session controls until implemented.

## P1 - High Value After MVP Core

### 5. Improve Course Search, Filtering, Pagination

Evidence:

- `GET /api/courses` returns all published courses ordered by created date.
- Explore has category/filter UI but does not pass query parameters.

Recommended API:

- `GET /api/courses?page=1&pageSize=20&q=react&category=programming&minPrice=0&maxPrice=500000&sort=rating`
- Return `{ items, total, page, pageSize, pages }`.
- Add database fields for structured category/tags instead of overloading `description` JSON.

Database changes:

- Add `Category`, `CourseCategory`, `Tag`, `CourseTag`, or a simpler `category` enum/string depending on scope.
- Add indexes for `isPublished`, `price`, `averageRating`, `createdAt`, and category lookup.

### 6. Make Certificates Verifiable

Evidence:

- Backend issues certificates in `backend/src/lib/progress.js`.
- `Certificate` has `certificateNo`, `verifyCode`, and `pdfUrl`.
- There is no public verify endpoint or frontend certificate page.

Recommended implementation:

- `GET /api/certificates/verify/:verifyCode` public endpoint.
- `GET /api/user/certificates` page in frontend.
- Generate/download certificate PDF or at least printable certificate page.
- Add share link from course completion screen.

### 7. Build Notification Center

Evidence:

- Backend has notification list and mark-read endpoints.
- UI does not expose a full notification center.

Recommended implementation:

- Topbar notification dropdown with unread count.
- `/notifications` page.
- Mark one/all as read.
- Link notification events to course, payment, and certificate pages.

### 8. Improve Instructor Analytics

Evidence:

- Instructor dashboard aggregates revenue/students/courses, but lacks per-course analytics.
- Rating is hardcoded in frontend.

Recommended implementation:

- Per-course completion rate, average progress, drop-off lesson, review average, revenue by time range.
- Export CSV for enrollments and revenue.
- Recent Q&A/comments needing instructor reply.

## P2 - Product Expansion

### 9. Events And Live Sessions

Current status: static frontend only.

Recommended models:

- `Event`, `EventRegistration`, `LiveSession`, `Attendance`.

Recommended features:

- Instructor/admin event creation.
- Student registration.
- Calendar view.
- Live link access control.

### 10. Instructor Directory And Profiles

Current status: static frontend only.

Recommended features:

- Public instructor profile.
- Instructor bio, skills, course list, rating aggregate.
- Follow/message only if you plan to implement social/community features.

### 11. Notes, Resources, And Downloads

Evidence:

- Learning workspace has tabs for notes/resources, but notes are placeholder and resources are static.

Recommended models:

- `LessonResource`, `LessonNote`.

Recommended features:

- Instructor attaches files/links per lesson.
- Student private notes per lesson with timestamps.

## Architecture Assessment

Current shape:

- Simple monolith backend with Express routes.
- React SPA frontend.
- PostgreSQL via Prisma.
- Good fit for the current project size.

Keep this architecture for now. Do not split into microservices. The next architectural step should be modular boundaries inside the monolith:

- `auth`
- `courses`
- `learning`
- `assessment`
- `billing`
- `admin`
- `notifications`
- `reports`

Recommended backend structure:

```text
src/modules/
  auth/
    auth.routes.js
    auth.service.js
    auth.validation.js
  courses/
  learning/
  billing/
  admin/
```

This keeps complexity low while preventing route files from growing into all-purpose modules.

## Database Assessment

Strengths:

- Core relationships are normalized: users, courses, sections, lessons, enrollments, progress, reviews, purchases, wallet transactions.
- Wallet purchase uses transaction logic and atomic `updateMany` balance check.
- Useful unique constraints exist for enrollment, review, purchase, progress, certificate.

Issues:

- `User.settings` is a `String` containing JSON. Use Prisma `Json?` if PostgreSQL is the long-term database.
- `Course.description` appears to be used both as text and JSON metadata in frontend. Split structured fields.
- No audit log for admin/payment-sensitive operations.
- No category/tag model.
- No assessment models.
- Some seed/test files use old lowercase roles (`admin`, `student`, `instructor`) while Prisma enum is uppercase.

Recommended schema additions:

```prisma
model AuditLog {
  id          String   @id @default(cuid())
  actorId     String?
  action      String
  entityType  String
  entityId    String?
  metadata    Json?
  ipAddress   String?
  userAgent   String?
  createdAt   DateTime @default(now())

  @@index([actorId, createdAt])
  @@index([entityType, entityId])
  @@index([action, createdAt])
}
```

## API Design Assessment

Strengths:

- Resource grouping is mostly understandable: `/api/courses`, `/api/instructor`, `/api/user`, `/api/payments`.
- HTTP methods are mostly appropriate.
- Rate limiting is present for general, auth, and payments.

Issues:

- No API versioning.
- Error response shape is inconsistent: mostly `{ message }`, sometimes additional fields.
- No pagination for list endpoints.
- `/api/payments/create-checkout-session` handles both top-up and course purchase; the name does not match wallet purchase behavior.
- Some action endpoints are acceptable but should be named consistently: publish/unpublish, complete, reorder.

Recommended standards:

- Version public API under `/api/v1`.
- Standard error:

```json
{
  "error": "INSUFFICIENT_FUNDS",
  "message": "So du vi khong du de mua khoa hoc nay",
  "details": {
    "requiredAmount": 500000,
    "walletBalance": 200000
  }
}
```

- Rename or split payments:
  - `POST /api/v1/wallet/top-up-sessions`
  - `POST /api/v1/courses/:courseId/purchases`
  - `GET /api/v1/wallet/transactions`

## Frontend Design Assessment

Current direction:

- The app is a modern SaaS-like dashboard with soft cards, purple accents, and learning/productivity imagery.
- This is acceptable for an LMS MVP, but the visual system is inconsistent: many pages use static decorative sections and repeated card-heavy layouts.

Main UX problem:

- Visible controls often imply functionality that is not implemented: filters, event registration, instructor follow, integrations, reports export, 2FA, session management.

Recommended design direction:

- Use an "academic operating system" direction: quiet, information-dense, trustworthy, less marketing-like.
- Keep strong visual hierarchy for learning and instructor workflows.
- Reduce decorative hero panels inside authenticated app screens.
- Use real empty states instead of fake populated states.

Frontend backlog:

- Add a shared `EmptyState`, `PageHeader`, `DataTable`, `ConfirmDialog`, `Toast`, `Pagination`, and `FilterBar`.
- Replace `window.alert`/`confirm` with app-native toast and modal.
- Add route guards for admin pages once implemented.
- Add loading/error states consistently.

## Security Assessment

Good controls already present:

- Helmet is enabled.
- CORS allowlist is configured.
- Rate limits exist for auth/payment/general API.
- Passwords use bcrypt.
- Course builder checks instructor ownership for most write operations.
- Stripe webhook idempotency is handled with `ProcessedWebhookEvent`.
- Dependency audit currently reports 0 vulnerabilities for frontend and backend.

High-priority risks:

1. JWT in localStorage
   - Move to httpOnly cookie refresh flow.

2. Missing production secret validation
   - Fail server startup if required secrets are missing, default, or weak.

3. Misleading security UI
   - Disable password/2FA/session controls until real backend exists.

4. Account deletion is immediate hard delete
   - For production, prefer soft delete/deactivation, especially with purchases, certificates, and audit requirements.

5. No admin audit trail
   - Required before admin payment/user/course operations.

6. User-uploaded video/avatar path depends on Cloudinary config
   - Keep strict file type/size validation and add server-side MIME checks if accepting production uploads.

Additional recommendations:

- Add Content Security Policy tuned for Cloudinary/YouTube/Stripe.
- Add request ID logging.
- Add audit logs for login failures, password changes, payment events, admin actions.
- Avoid returning `providerSessionId` in normal billing history unless needed by user support.

## Verification Notes

Commands run:

```text
frontend: npm run build
Result: passed. Warning: main JS chunk > 500 kB.

backend: npm test
Result: failed. Existing test uses lowercase Prisma role values.

backend: npm audit --audit-level=moderate
Result: 0 vulnerabilities.

frontend: npm audit --audit-level=moderate
Result: 0 vulnerabilities.
```

Backend test fix:

- Update `tests/integration/course.test.js` role values from `instructor`/`student` to `INSTRUCTOR`/`STUDENT`.
- Guard `afterAll` cleanup against setup failure.

## Suggested Implementation Order

1. Fix backend tests and seed role enum drift.
2. Hide or mark static screens/features that are not real.
3. Add admin routes and audit logging.
4. Add course search/filter/pagination.
5. Add assessment system.
6. Add certificate verification and certificate page.
7. Add notification center.
8. Replace localStorage auth with cookie-based refresh flow.
9. Add instructor analytics.
10. Implement events/instructor directory only if they are core to the product strategy.
