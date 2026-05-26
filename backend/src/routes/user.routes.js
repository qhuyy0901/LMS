import express from 'express';
import prisma from '../lib/prisma.js';
import { verifyToken } from '../middleware/auth.middleware.js';
import { uploadAvatar, isCloudinaryConfigured } from '../lib/cloudinary.js';
import { resolveMemberTier, formatCurrencyVnd } from '../lib/membership.js';
import { deleteUserGraph } from '../lib/delete-graph.js';

const router = express.Router();

const parseSettings = (settings) => {
  if (!settings) {
    return {};
  }

  try {
    return JSON.parse(settings);
  } catch (error) {
    console.error('Settings parse error:', error);
    return {};
  }
};

const addDays = (date, days) => {
  const nextDate = new Date(date);
  nextDate.setDate(nextDate.getDate() + days);
  return nextDate;
};

const startOfLocalDay = (date) => {
  const nextDate = new Date(date);
  nextDate.setHours(0, 0, 0, 0);
  return nextDate;
};

const getDayKey = (date) => {
  const localDate = startOfLocalDay(date);
  const year = localDate.getFullYear();
  const month = String(localDate.getMonth() + 1).padStart(2, '0');
  const day = String(localDate.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
};

const buildRecentDayBuckets = (days = 7) => {
  const startDate = addDays(startOfLocalDay(new Date()), -(days - 1));

  return Array.from({ length: days }, (_, index) => {
    const date = addDays(startDate, index);

    return {
      date,
      key: getDayKey(date),
      label: date.toLocaleDateString('vi-VN', { weekday: 'short' }),
      minutes: 0,
      completedLessons: 0,
    };
  });
};

const clampPercent = (value) => Math.min(100, Math.max(0, Math.round(value || 0)));

const serializeUser = (user) => {
  const membership = resolveMemberTier(user.totalSpent);

  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    avatar: user.avatar,
    phone: user.phone,
    bio: user.bio,
    settings: parseSettings(user.settings),
    walletBalance: user.walletBalance,
    totalSpent: user.totalSpent,
    memberTier: user.memberTier,
    memberTierLabel: membership.label,
    memberTierMinSpent: membership.minSpent,
  };
};

router.get('/me', verifyToken, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.userId },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        avatar: true,
        phone: true,
        bio: true,
        settings: true,
        walletBalance: true,
        totalSpent: true,
        memberTier: true,
      },
    });

    if (!user) {
      return res.status(404).json({ message: 'Khong tim thay nguoi dung' });
    }

    res.status(200).json(serializeUser(user));
  } catch (error) {
    console.error('Fetch user error:', error);
    res.status(500).json({ message: 'Loi server' });
  }
});

router.put('/me', verifyToken, async (req, res) => {
  try {
    const { name, phone, bio, settings } = req.body;

    const updatedUser = await prisma.user.update({
      where: { id: req.userId },
      data: {
        ...(name && { name }),
        ...(phone !== undefined && { phone }),
        ...(bio !== undefined && { bio }),
        ...(settings !== undefined && { settings: JSON.stringify(settings) }),
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        avatar: true,
        phone: true,
        bio: true,
        settings: true,
        walletBalance: true,
        totalSpent: true,
        memberTier: true,
      },
    });

    res.status(200).json(serializeUser(updatedUser));
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({ message: 'Loi server' });
  }
});

router.get('/billing-history', verifyToken, async (req, res) => {
  try {
    const transactions = await prisma.walletTransaction.findMany({
      where: { userId: req.userId },
      include: {
        course: {
          select: {
            id: true,
            title: true,
          },
        },
        purchase: {
          select: {
            id: true,
            finalAmount: true,
            status: true,
          },
        },
        externalPayment: {
          select: {
            id: true,
            status: true,
            provider: true,
            providerSessionId: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });

    const mapped = transactions.map((transaction) => ({
      id: transaction.id,
      type: transaction.type,
      amount: transaction.amount,
      amountText: formatCurrencyVnd(transaction.amount),
      balanceAfter: transaction.balanceAfter,
      balanceAfterText: formatCurrencyVnd(transaction.balanceAfter),
      note: transaction.note,
      createdAt: transaction.createdAt,
      course: transaction.course,
      purchase: transaction.purchase,
      externalPayment: transaction.externalPayment,
    }));

    res.status(200).json(mapped);
  } catch (error) {
    console.error('Fetch wallet history error:', error);
    res.status(500).json({ message: 'Loi server' });
  }
});

router.get('/certificates', verifyToken, async (req, res) => {
  try {
    const certificates = await prisma.certificate.findMany({
      where: { userId: req.userId },
      include: {
        course: {
          select: {
            id: true,
            title: true,
            thumbnail: true,
          },
        },
      },
      orderBy: { issuedAt: 'desc' },
    });

    res.status(200).json(certificates);
  } catch (error) {
    console.error('Fetch certificates error:', error);
    res.status(500).json({ message: 'Loi server' });
  }
});

router.get('/notifications', verifyToken, async (req, res) => {
  try {
    const notifications = await prisma.notification.findMany({
      where: { userId: req.userId },
      orderBy: { createdAt: 'desc' },
      take: 30,
    });

    res.status(200).json(notifications);
  } catch (error) {
    console.error('Fetch notifications error:', error);
    res.status(500).json({ message: 'Loi server' });
  }
});

router.patch('/notifications/:id/read', verifyToken, async (req, res) => {
  try {
    const notification = await prisma.notification.updateMany({
      where: {
        id: req.params.id,
        userId: req.userId,
      },
      data: {
        isRead: true,
        readAt: new Date(),
      },
    });

    if (notification.count === 0) {
      return res.status(404).json({ message: 'Khong tim thay thong bao' });
    }

    res.status(200).json({ message: 'Da danh dau da doc' });
  } catch (error) {
    console.error('Update notification error:', error);
    res.status(500).json({ message: 'Loi server' });
  }
});

router.get('/reports', verifyToken, async (req, res) => {
  try {
    const buckets = buildRecentDayBuckets(7);
    const reportStartDate = buckets[0].date;

    const [enrollments, lessonProgress, quizSubmissions, certificates] = await Promise.all([
      prisma.enrollment.findMany({
        where: { userId: req.userId },
        include: {
          course: {
            select: {
              id: true,
              title: true,
              thumbnail: true,
              instructor: {
                select: {
                  id: true,
                  name: true,
                },
              },
              lessons: {
                where: { isPublished: true },
                select: { id: true },
              },
            },
          },
        },
        orderBy: { updatedAt: 'desc' },
      }),
      prisma.lessonProgress.findMany({
        where: { userId: req.userId },
        include: {
          lesson: {
            select: {
              id: true,
              title: true,
              courseId: true,
              course: {
                select: {
                  id: true,
                  title: true,
                },
              },
            },
          },
        },
        orderBy: { updatedAt: 'desc' },
      }),
      prisma.quizSubmission.findMany({
        where: { userId: req.userId },
        include: {
          quiz: {
            select: {
              id: true,
              title: true,
              lesson: {
                select: {
                  course: {
                    select: {
                      id: true,
                      title: true,
                    },
                  },
                },
              },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: 30,
      }),
      prisma.certificate.findMany({
        where: { userId: req.userId },
        include: {
          course: {
            select: {
              id: true,
              title: true,
              thumbnail: true,
            },
          },
        },
        orderBy: { issuedAt: 'desc' },
      }),
    ]);

    const progressByLessonId = new Map(lessonProgress.map((progress) => [progress.lessonId, progress]));
    const weeklyProgress = lessonProgress.filter((progress) => new Date(progress.updatedAt) >= reportStartDate);
    const bucketByKey = new Map(buckets.map((bucket) => [bucket.key, bucket]));

    weeklyProgress.forEach((progress) => {
      const key = getDayKey(progress.completedAt || progress.updatedAt);
      const bucket = bucketByKey.get(key);

      if (!bucket) {
        return;
      }

      bucket.minutes += Math.round((progress.watchedSeconds || 0) / 60);

      if (progress.isCompleted) {
        bucket.completedLessons += 1;
      }
    });

    const completedLessonCount = lessonProgress.filter((progress) => progress.isCompleted).length;
    const learningMinutes = Math.round(
      lessonProgress.reduce((total, progress) => total + (progress.watchedSeconds || 0), 0) / 60
    );
    const averageQuizScore = quizSubmissions.length
      ? quizSubmissions.reduce((total, submission) => total + submission.score, 0) / quizSubmissions.length
      : 0;

    const courseProgress = enrollments.map((enrollment) => {
      const lessonIds = enrollment.course.lessons.map((lesson) => lesson.id);
      const completedLessons = lessonIds.filter((lessonId) => progressByLessonId.get(lessonId)?.isCompleted).length;
      const totalLessons = lessonIds.length;
      const progress = totalLessons > 0 ? (completedLessons / totalLessons) * 100 : enrollment.progress;

      return {
        id: enrollment.course.id,
        title: enrollment.course.title,
        thumbnail: enrollment.course.thumbnail,
        instructorName: enrollment.course.instructor?.name || 'Instructor',
        completedLessons,
        totalLessons,
        progress: clampPercent(progress || enrollment.progress),
        completedAt: enrollment.completedAt,
        updatedAt: enrollment.updatedAt,
      };
    });

    const recentAchievements = [
      ...certificates.map((certificate) => ({
        id: `certificate-${certificate.id}`,
        type: 'certificate',
        title: 'Certificate earned',
        description: certificate.course?.title || 'Completed course',
        date: certificate.issuedAt,
      })),
      ...enrollments
        .filter((enrollment) => enrollment.completedAt)
        .map((enrollment) => ({
          id: `course-${enrollment.id}`,
          type: 'course',
          title: 'Course completed',
          description: enrollment.course?.title || 'Course',
          date: enrollment.completedAt,
        })),
      ...quizSubmissions
        .filter((submission) => submission.passed)
        .map((submission) => ({
          id: `quiz-${submission.id}`,
          type: 'quiz',
          title: 'Quiz passed',
          description: submission.quiz?.title || 'Quiz',
          date: submission.createdAt,
          score: Math.round(submission.score),
        })),
    ]
      .sort((a, b) => new Date(b.date) - new Date(a.date))
      .slice(0, 6);

    const weeklyMinutes = buckets.reduce((total, bucket) => total + bucket.minutes, 0);
    const weeklyCompletedLessons = buckets.reduce((total, bucket) => total + bucket.completedLessons, 0);
    const weeklyCertificates = certificates.filter((certificate) => new Date(certificate.issuedAt) >= reportStartDate)
      .length;

    res.status(200).json({
      summary: {
        learningMinutes,
        learningHours: Number((learningMinutes / 60).toFixed(1)),
        completedLessons: completedLessonCount,
        averageQuizScore: Number((averageQuizScore / 10).toFixed(1)),
        certificates: certificates.length,
      },
      weeklyActivity: buckets.map((bucket) => ({
        date: bucket.key,
        label: bucket.label,
        minutes: bucket.minutes,
        hours: Number((bucket.minutes / 60).toFixed(1)),
        completedLessons: bucket.completedLessons,
      })),
      courseProgress,
      recentAchievements,
      weeklyGoals: [
        {
          id: 'weekly-hours',
          title: 'Study 10 hours',
          current: Number((weeklyMinutes / 60).toFixed(1)),
          target: 10,
          unit: 'h',
          progress: clampPercent((weeklyMinutes / 600) * 100),
        },
        {
          id: 'weekly-lessons',
          title: 'Complete 5 lessons',
          current: weeklyCompletedLessons,
          target: 5,
          unit: 'lessons',
          progress: clampPercent((weeklyCompletedLessons / 5) * 100),
        },
        {
          id: 'weekly-certificate',
          title: 'Earn 1 certificate',
          current: weeklyCertificates,
          target: 1,
          unit: 'certificate',
          progress: clampPercent(weeklyCertificates * 100),
        },
      ],
      recentQuizSubmissions: quizSubmissions.slice(0, 5).map((submission) => ({
        id: submission.id,
        title: submission.quiz?.title || 'Quiz',
        courseTitle: submission.quiz?.lesson?.course?.title || null,
        score: Math.round(submission.score),
        passed: submission.passed,
        createdAt: submission.createdAt,
      })),
    });
  } catch (error) {
    console.error('Fetch reports error:', error);
    res.status(500).json({ message: 'Loi server' });
  }
});

router.post('/avatar', verifyToken, (req, res) => {
  if (!isCloudinaryConfigured()) {
    return res.status(200).json({ avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=mock' });
  }

  const uploadSingle = uploadAvatar.single('avatar');

  uploadSingle(req, res, async function uploadAvatarCallback(err) {
    if (err) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ message: 'Kich thuoc file qua lon. Toi da 2MB.' });
      }
      return res.status(400).json({ message: 'Loi upload file.', error: err.message });
    }

    if (!req.file) {
      return res.status(400).json({ message: 'Khong tim thay file.' });
    }

    try {
      const updatedUser = await prisma.user.update({
        where: { id: req.userId },
        data: { avatar: req.file.path },
      });

      res.status(200).json({
        message: 'Tai anh thanh cong',
        avatarUrl: updatedUser.avatar,
      });
    } catch (error) {
      console.error('Update avatar error:', error);
      res.status(500).json({ message: 'Loi server khi cap nhat anh dai dien' });
    }
  });
});

router.delete('/avatar', verifyToken, async (req, res) => {
  try {
    await prisma.user.update({
      where: { id: req.userId },
      data: { avatar: null },
    });

    res.status(200).json({
      message: 'Da xoa anh dai dien',
      avatarUrl: null,
    });
  } catch (error) {
    console.error('Delete avatar error:', error);
    res.status(500).json({ message: 'Loi server khi xoa anh dai dien' });
  }
});

router.delete('/me', verifyToken, async (req, res) => {
  try {
    await deleteUserGraph(prisma, req.userId);

    res.status(200).json({ message: 'Tai khoan da duoc xoa vinh vien.' });
  } catch (error) {
    console.error('Delete account error:', error);
    res.status(500).json({ message: 'Loi server khi xoa tai khoan' });
  }
});

export default router;
