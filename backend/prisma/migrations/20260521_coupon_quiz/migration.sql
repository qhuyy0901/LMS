DO $$
BEGIN
  CREATE TYPE "CouponType" AS ENUM ('PERCENTAGE', 'FIXED_AMOUNT');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "Coupon" (
  "id" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "discountType" "CouponType" NOT NULL DEFAULT 'PERCENTAGE',
  "discountValue" INTEGER NOT NULL,
  "minPurchaseAmount" INTEGER NOT NULL DEFAULT 0,
  "maxDiscountAmount" INTEGER,
  "startDate" TIMESTAMP(3),
  "endDate" TIMESTAMP(3),
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "usageLimit" INTEGER,
  "usageCount" INTEGER NOT NULL DEFAULT 0,
  "courseId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Coupon_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "Quiz" (
  "id" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT,
  "passingScore" INTEGER NOT NULL DEFAULT 80,
  "lessonId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Quiz_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "QuizQuestion" (
  "id" TEXT NOT NULL,
  "questionText" TEXT NOT NULL,
  "options" TEXT[],
  "correctOptionIndex" INTEGER NOT NULL,
  "explanation" TEXT,
  "position" INTEGER NOT NULL,
  "quizId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "QuizQuestion_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "QuizSubmission" (
  "id" TEXT NOT NULL,
  "score" DOUBLE PRECISION NOT NULL,
  "passed" BOOLEAN NOT NULL,
  "answers" JSONB NOT NULL,
  "userId" TEXT NOT NULL,
  "quizId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "QuizSubmission_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "Purchase"
ADD COLUMN IF NOT EXISTS "couponId" TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS "Coupon_code_key" ON "Coupon"("code");
CREATE INDEX IF NOT EXISTS "Coupon_code_idx" ON "Coupon"("code");
CREATE INDEX IF NOT EXISTS "Coupon_courseId_idx" ON "Coupon"("courseId");
CREATE UNIQUE INDEX IF NOT EXISTS "Quiz_lessonId_key" ON "Quiz"("lessonId");
CREATE INDEX IF NOT EXISTS "QuizQuestion_quizId_idx" ON "QuizQuestion"("quizId");
CREATE INDEX IF NOT EXISTS "QuizSubmission_userId_idx" ON "QuizSubmission"("userId");
CREATE INDEX IF NOT EXISTS "QuizSubmission_quizId_idx" ON "QuizSubmission"("quizId");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'Coupon_courseId_fkey'
  ) THEN
    ALTER TABLE "Coupon"
    ADD CONSTRAINT "Coupon_courseId_fkey"
    FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'Purchase_couponId_fkey'
  ) THEN
    ALTER TABLE "Purchase"
    ADD CONSTRAINT "Purchase_couponId_fkey"
    FOREIGN KEY ("couponId") REFERENCES "Coupon"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'Quiz_lessonId_fkey'
  ) THEN
    ALTER TABLE "Quiz"
    ADD CONSTRAINT "Quiz_lessonId_fkey"
    FOREIGN KEY ("lessonId") REFERENCES "Lesson"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'QuizQuestion_quizId_fkey'
  ) THEN
    ALTER TABLE "QuizQuestion"
    ADD CONSTRAINT "QuizQuestion_quizId_fkey"
    FOREIGN KEY ("quizId") REFERENCES "Quiz"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'QuizSubmission_userId_fkey'
  ) THEN
    ALTER TABLE "QuizSubmission"
    ADD CONSTRAINT "QuizSubmission_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'QuizSubmission_quizId_fkey'
  ) THEN
    ALTER TABLE "QuizSubmission"
    ADD CONSTRAINT "QuizSubmission_quizId_fkey"
    FOREIGN KEY ("quizId") REFERENCES "Quiz"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
