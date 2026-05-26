import express from 'express';
import prisma from '../lib/prisma.js';
import { verifyToken } from '../middleware/auth.middleware.js';
import { upsertLessonProgress } from '../lib/progress.js';
import { parseJsonField, stringifyJsonField } from '../lib/json-field.js';

const router = express.Router();

const serializeQuestion = (question) => ({
  ...question,
  options: parseJsonField(question.options, []),
});

const serializeSubmission = (submission) => ({
  ...submission,
  answers: parseJsonField(submission.answers, {}),
});

// Helper kiểm tra quyền truy cập khóa học của Giảng viên / Admin
const checkInstructorOrAdmin = async (userId, lessonId) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, role: true }
  });

  if (user?.role === 'ADMIN') return true;

  // Tìm khóa học của bài học này để xem giảng viên có sở hữu không
  const lesson = await prisma.lesson.findUnique({
    where: { id: lessonId },
    include: {
      course: {
        select: { instructorId: true }
      }
    }
  });

  if (!lesson) return false;
  return lesson.course.instructorId === userId;
};

/* ──────────────────────────────────────────────────────────
 *  GET /lesson/:lessonId
 *  Lấy Quiz và các câu hỏi của bài học
 * ────────────────────────────────────────────────────────── */
router.get('/lesson/:lessonId', verifyToken, async (req, res) => {
  try {
    const { lessonId } = req.params;
    const userId = req.userId;

    const lesson = await prisma.lesson.findUnique({
      where: { id: lessonId },
      select: { id: true, courseId: true }
    });

    if (!lesson) {
      return res.status(404).json({ message: 'Không tìm thấy bài học này' });
    }

    // Kiểm tra enrollment (hoặc là instructor/admin)
    const enrollment = await prisma.enrollment.findUnique({
      where: { userId_courseId: { userId, courseId: lesson.courseId } }
    });

    const isInstructor = await checkInstructorOrAdmin(userId, lessonId);

    if (!enrollment && !isInstructor) {
      return res.status(403).json({ message: 'Bạn không có quyền truy cập bài học này' });
    }

    const quiz = await prisma.quiz.findUnique({
      where: { lessonId },
      include: {
        questions: {
          orderBy: { position: 'asc' }
        }
      }
    });

    if (!quiz) {
      return res.status(200).json(null); // Trả về null nếu chưa có Quiz
    }

    // Nếu là học viên (không phải instructor/admin), ẩn correctOptionIndex và explanation
    if (!isInstructor) {
      quiz.questions = quiz.questions.map(q => {
        const { correctOptionIndex, explanation, ...publicFields } = q;
        return serializeQuestion(publicFields);
      });
    } else {
      quiz.questions = quiz.questions.map(serializeQuestion);
    }

    // Lấy submission gần nhất của học viên đối với Quiz này (nếu có)
    const submissions = await prisma.quizSubmission.findMany({
      where: { userId, quizId: quiz.id },
      orderBy: { createdAt: 'desc' },
      take: 5
    });

    return res.status(200).json({
      ...quiz,
      submissions: submissions.map(serializeSubmission)
    });
  } catch (error) {
    console.error('Fetch quiz error:', error);
    return res.status(500).json({ message: 'Lỗi server khi lấy bài trắc nghiệm' });
  }
});

/* ──────────────────────────────────────────────────────────
 *  POST /lesson/:lessonId
 *  Tạo mới hoặc cập nhật Quiz (Admin / Giảng viên)
 * ────────────────────────────────────────────────────────── */
router.post('/lesson/:lessonId', verifyToken, async (req, res) => {
  try {
    const { lessonId } = req.params;
    const { title, description, passingScore = 80, questions = [] } = req.body;
    const userId = req.userId;

    const isAuthorized = await checkInstructorOrAdmin(userId, lessonId);
    if (!isAuthorized) {
      return res.status(403).json({ message: 'Bạn không có quyền quản lý bài trắc nghiệm cho bài học này' });
    }

    if (!title || title.trim() === '') {
      return res.status(400).json({ message: 'Tiêu đề Quiz không được để trống' });
    }

    if (questions.length === 0) {
      return res.status(400).json({ message: 'Quiz phải có ít nhất 1 câu hỏi' });
    }

    // Xác thực các câu hỏi gửi lên
    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      if (!q.questionText || !q.options || q.options.length < 2) {
        return res.status(400).json({ message: `Câu hỏi thứ ${i + 1} không đầy đủ nội dung hoặc thiếu lựa chọn` });
      }
      if (q.correctOptionIndex === undefined || q.correctOptionIndex < 0 || q.correctOptionIndex >= q.options.length) {
        return res.status(400).json({ message: `Câu hỏi thứ ${i + 1} có đáp án đúng không hợp lệ` });
      }
    }

    // Sử dụng transaction để xóa câu hỏi cũ và ghi đè câu hỏi mới
    const resultQuiz = await prisma.$transaction(async (tx) => {
      // 1. Tạo hoặc update Quiz
      const quiz = await tx.quiz.upsert({
        where: { lessonId },
        update: {
          title,
          description,
          passingScore: Number(passingScore) || 80
        },
        create: {
          lessonId,
          title,
          description,
          passingScore: Number(passingScore) || 80
        }
      });

      // 2. Xóa các câu hỏi cũ của Quiz này
      await tx.quizQuestion.deleteMany({
        where: { quizId: quiz.id }
      });

      // 3. Tạo mới các câu hỏi
      const questionsData = questions.map((q, idx) => ({
        quizId: quiz.id,
        questionText: q.questionText,
        options: stringifyJsonField(q.options),
        correctOptionIndex: Number(q.correctOptionIndex),
        explanation: q.explanation || null,
        position: idx
      }));

      await tx.quizQuestion.createMany({
        data: questionsData
      });

      return tx.quiz.findUnique({
        where: { id: quiz.id },
        include: { questions: { orderBy: { position: 'asc' } } }
      });
    });

    return res.status(200).json({
      ...resultQuiz,
      questions: resultQuiz.questions.map(serializeQuestion),
    });
  } catch (error) {
    console.error('Upsert quiz error:', error);
    return res.status(500).json({ message: 'Lỗi server khi cập nhật bài trắc nghiệm' });
  }
});

/* ──────────────────────────────────────────────────────────
 *  POST /lesson/:lessonId/submit
 *  Học viên nộp bài trắc nghiệm, trả về kết quả
 * ────────────────────────────────────────────────────────── */
router.post('/lesson/:lessonId/submit', verifyToken, async (req, res) => {
  try {
    const { lessonId } = req.params;
    const { answers = {} } = req.body; // format: { questionId: selectedIndex }
    const userId = req.userId;

    const lesson = await prisma.lesson.findUnique({
      where: { id: lessonId },
      select: { id: true, courseId: true }
    });

    if (!lesson) {
      return res.status(404).json({ message: 'Không tìm thấy bài học này' });
    }

    // Kiểm tra quyền học viên
    const enrollment = await prisma.enrollment.findUnique({
      where: { userId_courseId: { userId, courseId: lesson.courseId } }
    });

    if (!enrollment) {
      return res.status(403).json({ message: 'Bạn chưa đăng ký khóa học này' });
    }

    const quiz = await prisma.quiz.findUnique({
      where: { lessonId },
      include: {
        questions: {
          orderBy: { position: 'asc' }
        }
      }
    });

    if (!quiz) {
      return res.status(404).json({ message: 'Bài học này chưa có bài trắc nghiệm' });
    }

    // Chấm điểm
    let correctCount = 0;
    const totalQuestions = quiz.questions.length;
    const detailedResults = quiz.questions.map((rawQuestion) => {
      const q = serializeQuestion(rawQuestion);
      const selectedIndex = answers[q.id];
      const isCorrect = selectedIndex !== undefined && Number(selectedIndex) === q.correctOptionIndex;
      if (isCorrect) {
        correctCount++;
      }
      return {
        questionId: q.id,
        questionText: q.questionText,
        options: q.options,
        selectedIndex: selectedIndex !== undefined ? Number(selectedIndex) : null,
        correctOptionIndex: q.correctOptionIndex,
        isCorrect,
        explanation: q.explanation
      };
    });

    const score = totalQuestions > 0 ? Math.round((correctCount / totalQuestions) * 100) : 0;
    const passed = score >= quiz.passingScore;

    // Lưu kết quả submission vào Database
    const submission = await prisma.quizSubmission.create({
      data: {
        userId,
        quizId: quiz.id,
        score,
        passed,
        answers: stringifyJsonField(answers)
      }
    });

    // Nếu đạt yêu cầu (passed = true), cập nhật trạng thái bài học thành Đã hoàn thành
    let progressUpdate = null;
    if (passed) {
      progressUpdate = await upsertLessonProgress({
        userId,
        courseId: lesson.courseId,
        lessonId,
        markCompleted: true
      });
    }

    return res.status(200).json({
      submissionId: submission.id,
      score,
      passed,
      passingScore: quiz.passingScore,
      correctCount,
      totalQuestions,
      detailedResults,
      progress: progressUpdate?.progress ?? null
    });
  } catch (error) {
    console.error('Submit quiz error:', error);
    return res.status(500).json({ message: 'Lỗi server khi nộp bài trắc nghiệm' });
  }
});

/* ──────────────────────────────────────────────────────────
 *  DELETE /:id
 *  Xóa bài trắc nghiệm
 * ────────────────────────────────────────────────────────── */
router.delete('/:id', verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.userId;

    const quiz = await prisma.quiz.findUnique({
      where: { id }
    });

    if (!quiz) {
      return res.status(404).json({ message: 'Không tìm thấy bài trắc nghiệm' });
    }

    const isAuthorized = await checkInstructorOrAdmin(userId, quiz.lessonId);
    if (!isAuthorized) {
      return res.status(403).json({ message: 'Bạn không có quyền xóa bài trắc nghiệm này' });
    }

    await prisma.quiz.delete({
      where: { id }
    });

    return res.status(200).json({ message: 'Xóa bài trắc nghiệm thành công' });
  } catch (error) {
    console.error('Delete quiz error:', error);
    return res.status(500).json({ message: 'Lỗi server khi xóa bài trắc nghiệm' });
  }
});

export default router;
