import request from 'supertest';
import jwt from 'jsonwebtoken';
import app from '../../src/index.js';
import prisma from '../../src/lib/prisma.js';
import { deleteUserGraph } from '../../src/lib/delete-graph.js';

const generateToken = (id, role) => {
  return jwt.sign({ id, role }, process.env.JWT_SECRET || 'test-secret', { expiresIn: '1h' });
};

describe('Integration Test: GET /api/user/reports', () => {
  let instructor;
  let student;
  let studentToken;

  beforeAll(async () => {
    const existingUsers = await prisma.user.findMany({
      where: {
        email: {
          in: ['reports_instructor@test.com', 'reports_student@test.com'],
        },
      },
      select: { id: true },
    });

    for (const user of existingUsers) {
      await deleteUserGraph(prisma, user.id);
    }

    instructor = await prisma.user.create({
      data: {
        name: 'Reports Instructor',
        email: 'reports_instructor@test.com',
        password: 'hashedpassword',
        role: 'INSTRUCTOR',
      },
    });

    student = await prisma.user.create({
      data: {
        name: 'Reports Student',
        email: 'reports_student@test.com',
        password: 'hashedpassword',
        role: 'STUDENT',
      },
    });

    studentToken = generateToken(student.id, student.role);

    const course = await prisma.course.create({
      data: {
        title: 'Reports Course',
        slug: `reports-course-${Date.now()}`,
        description: 'Course used by user reports integration tests',
        isPublished: true,
        instructorId: instructor.id,
      },
    });

    const section = await prisma.section.create({
      data: {
        title: 'Reports Section',
        position: 1,
        courseId: course.id,
      },
    });

    const firstLesson = await prisma.lesson.create({
      data: {
        title: 'Completed Lesson',
        position: 1,
        isPublished: true,
        durationSeconds: 1800,
        courseId: course.id,
        sectionId: section.id,
      },
    });

    const secondLesson = await prisma.lesson.create({
      data: {
        title: 'In Progress Lesson',
        position: 2,
        isPublished: true,
        durationSeconds: 900,
        courseId: course.id,
        sectionId: section.id,
      },
    });

    await prisma.enrollment.create({
      data: {
        userId: student.id,
        courseId: course.id,
        progress: 50,
      },
    });

    await prisma.lessonProgress.createMany({
      data: [
        {
          userId: student.id,
          lessonId: firstLesson.id,
          watchedSeconds: 1800,
          lastPositionSeconds: 1800,
          completionRate: 100,
          isCompleted: true,
          completedAt: new Date(),
        },
        {
          userId: student.id,
          lessonId: secondLesson.id,
          watchedSeconds: 900,
          lastPositionSeconds: 900,
          completionRate: 50,
          isCompleted: false,
        },
      ],
    });

    const quiz = await prisma.quiz.create({
      data: {
        title: 'Reports Quiz',
        passingScore: 80,
        lessonId: firstLesson.id,
      },
    });

    await prisma.quizSubmission.createMany({
      data: [
        {
          userId: student.id,
          quizId: quiz.id,
          score: 80,
          passed: true,
          answers: '[]',
        },
        {
          userId: student.id,
          quizId: quiz.id,
          score: 100,
          passed: true,
          answers: '[]',
        },
      ],
    });

    await prisma.certificate.create({
      data: {
        certificateNo: `REPORT-${Date.now()}`,
        verifyCode: `VERIFY-${Date.now()}`,
        userId: student.id,
        courseId: course.id,
      },
    });
  });

  afterAll(async () => {
    for (const userId of [student?.id, instructor?.id].filter(Boolean)) {
      await deleteUserGraph(prisma, userId);
    }

    await prisma.$disconnect();
  });

  it('1. Nen tra ve 401 neu request khong co token', async () => {
    const res = await request(app).get('/api/user/reports');

    expect(res.status).toBe(401);
    expect(res.body).toHaveProperty('message');
  });

  it('2. Nen tra ve bao cao hoc tap theo du lieu that cua hoc vien', async () => {
    const res = await request(app).get('/api/user/reports').set('Authorization', `Bearer ${studentToken}`);

    expect(res.status).toBe(200);
    expect(res.body.summary).toMatchObject({
      learningMinutes: 45,
      learningHours: 0.8,
      completedLessons: 1,
      averageQuizScore: 9,
      certificates: 1,
    });

    expect(res.body.weeklyActivity).toHaveLength(7);
    expect(res.body.weeklyActivity.reduce((total, item) => total + item.minutes, 0)).toBe(45);
    expect(res.body.weeklyActivity.reduce((total, item) => total + item.completedLessons, 0)).toBe(1);

    expect(res.body.courseProgress).toHaveLength(1);
    expect(res.body.courseProgress[0]).toMatchObject({
      title: 'Reports Course',
      completedLessons: 1,
      totalLessons: 2,
      progress: 50,
      instructorName: 'Reports Instructor',
    });

    expect(res.body.recentQuizSubmissions).toHaveLength(2);
    expect(res.body.recentAchievements.length).toBeGreaterThanOrEqual(2);
    expect(res.body.weeklyGoals).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: 'weekly-hours', current: 0.8, target: 10 }),
        expect.objectContaining({ id: 'weekly-lessons', current: 1, target: 5 }),
        expect.objectContaining({ id: 'weekly-certificate', current: 1, target: 1 }),
      ])
    );
  });
});
