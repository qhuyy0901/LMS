export const deleteLessonsGraphInTransaction = async (tx, lessonIds) => {
  const quizzes = lessonIds.length
    ? await tx.quiz.findMany({
        where: { lessonId: { in: lessonIds } },
        select: { id: true },
      })
    : [];
  const quizIds = quizzes.map((quiz) => quiz.id);

  if (quizIds.length) {
    await tx.quizSubmission.deleteMany({ where: { quizId: { in: quizIds } } });
    await tx.quizQuestion.deleteMany({ where: { quizId: { in: quizIds } } });
    await tx.quiz.deleteMany({ where: { id: { in: quizIds } } });
  }

  if (lessonIds.length) {
    await tx.comment.deleteMany({
      where: {
        lessonId: { in: lessonIds },
        parentId: { not: null },
      },
    });
    await tx.comment.deleteMany({ where: { lessonId: { in: lessonIds } } });
    await tx.lessonProgress.deleteMany({ where: { lessonId: { in: lessonIds } } });
    await tx.lesson.deleteMany({ where: { id: { in: lessonIds } } });
  }
};

export const deleteLessonGraph = async (prisma, lessonId) =>
  prisma.$transaction((tx) => deleteLessonsGraphInTransaction(tx, [lessonId]));

export const deleteSectionGraph = async (prisma, sectionId) =>
  prisma.$transaction(async (tx) => {
    const lessons = await tx.lesson.findMany({
      where: { sectionId },
      select: { id: true },
    });

    await deleteLessonsGraphInTransaction(
      tx,
      lessons.map((lesson) => lesson.id)
    );
    await tx.section.delete({ where: { id: sectionId } });
  });

export const deleteCourseGraphInTransaction = async (tx, courseId) => {
  const lessons = await tx.lesson.findMany({
    where: { courseId },
    select: { id: true },
  });
  const lessonIds = lessons.map((lesson) => lesson.id);

  await deleteLessonsGraphInTransaction(tx, lessonIds);

  await tx.walletTransaction.deleteMany({ where: { courseId } });
  await tx.purchase.deleteMany({ where: { courseId } });
  await tx.certificate.deleteMany({ where: { courseId } });
  await tx.courseReview.deleteMany({ where: { courseId } });
  await tx.enrollment.deleteMany({ where: { courseId } });
  await tx.coupon.deleteMany({ where: { courseId } });
  await tx.section.deleteMany({ where: { courseId } });
  await tx.course.delete({ where: { id: courseId } });
};

export const deleteCourseGraph = async (prisma, courseId) =>
  prisma.$transaction((tx) => deleteCourseGraphInTransaction(tx, courseId));

export const deleteUserGraph = async (prisma, userId) => {
  await prisma.$transaction(async (tx) => {
    const ownedCourses = await tx.course.findMany({
      where: { instructorId: userId },
      select: { id: true },
    });

    for (const course of ownedCourses) {
      await deleteCourseGraphInTransaction(tx, course.id);
    }

    await tx.comment.deleteMany({
      where: {
        userId,
        parentId: { not: null },
      },
    });
    await tx.comment.deleteMany({ where: { userId } });
    await tx.quizSubmission.deleteMany({ where: { userId } });
    await tx.lessonProgress.deleteMany({ where: { userId } });
    await tx.walletTransaction.deleteMany({ where: { userId } });
    await tx.purchase.deleteMany({ where: { userId } });
    await tx.externalPayment.deleteMany({ where: { userId } });
    await tx.certificate.deleteMany({ where: { userId } });
    await tx.courseReview.deleteMany({ where: { userId } });
    await tx.enrollment.deleteMany({ where: { userId } });
    await tx.notification.deleteMany({ where: { userId } });
    await tx.user.delete({ where: { id: userId } });
  });
};
