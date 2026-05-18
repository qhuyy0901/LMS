import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';
import {
  ArrowRight,
  BookOpen,
  CheckCircle,
  ChevronLeft,
  Clock,
  Lock,
  MessageSquare,
  PlayCircle,
  Star,
  Users,
  Wallet,
} from 'lucide-react';

const formatCurrency = (amount = 0) =>
  new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(amount);

const formatDuration = (seconds = 0) => {
  const total = Math.max(0, Number(seconds) || 0);
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}m`;
};

const formatReviewDate = (value) => {
  if (!value) return '';
  return new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(new Date(value));
};

const ReviewStars = ({ value, onChange, interactive = false }) => (
  <div className="flex items-center gap-1">
    {[1, 2, 3, 4, 5].map((star) => (
      <button
        key={star}
        type="button"
        onClick={interactive ? () => onChange(star) : undefined}
        className={interactive ? 'transition-transform hover:scale-110' : 'cursor-default'}
      >
        <Star
          className={`h-5 w-5 ${
            star <= value ? 'fill-amber-400 text-amber-400' : 'text-slate-300'
          }`}
        />
      </button>
    ))}
  </div>
);

export default function CourseDetails() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [course, setCourse] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [enrolling, setEnrolling] = useState(false);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);
  const [deletingReview, setDeletingReview] = useState(false);

  useEffect(() => {
    const fetchCourse = async () => {
      try {
        const response = await axios.get(`/api/courses/${id}`);
        setCourse(response.data);
      } catch (err) {
        setError(err.response?.data?.message || err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchCourse();

    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('success')) {
      fetchCourse();
      window.history.replaceState(null, '', window.location.pathname);
    }
  }, [id]);

  useEffect(() => {
    if (course?.userReview) {
      setReviewRating(course.userReview.rating);
      setReviewComment(course.userReview.comment || '');
    } else {
      setReviewRating(5);
      setReviewComment('');
    }
  }, [course?.userReview]);

  const handleEnroll = async () => {
    setEnrolling(true);
    try {
      if (course.price > 0) {
        const response = await axios.post('/api/payments/create-checkout-session', {
          type: 'course',
          courseId: id,
        });

        if (response.data.successUrl) {
          window.location.href = response.data.successUrl;
        }
      } else {
        await axios.post(`/api/courses/${id}/enroll`);
        setCourse((prev) => ({ ...prev, isEnrolled: true, progress: 0, canReview: true }));
      }
    } catch (err) {
      const shortfall = err.response?.data?.shortfall;
      const message = err.response?.data?.message || err.message;

      if (shortfall) {
        window.alert(`${message}. Bạn cần nạp thêm ${formatCurrency(shortfall)} vào ví.`);
      } else {
        window.alert(message);
      }
    } finally {
      setEnrolling(false);
    }
  };

  const handleSubmitReview = async () => {
    setSubmittingReview(true);
    try {
      const response = await axios.post(`/api/courses/${id}/reviews`, {
        rating: reviewRating,
        comment: reviewComment,
      });

      const nextReview = response.data.review;
      setCourse((prev) => {
        const existingReviews = prev.reviews || [];
        const filtered = existingReviews.filter((review) => review.userId !== nextReview.userId);
        return {
          ...prev,
          averageRating: response.data.averageRating,
          reviewCount: response.data.reviewCount,
          userReview: nextReview,
          reviews: [nextReview, ...filtered].slice(0, 10),
        };
      });
    } catch (err) {
      window.alert(err.response?.data?.message || err.message);
    } finally {
      setSubmittingReview(false);
    }
  };

  const handleDeleteReview = async () => {
    setDeletingReview(true);
    try {
      const response = await axios.delete(`/api/courses/${id}/reviews/me`);
      setCourse((prev) => ({
        ...prev,
        averageRating: response.data.averageRating,
        reviewCount: response.data.reviewCount,
        userReview: null,
        reviews: (prev.reviews || []).filter((review) => review.userId !== prev.userReview?.userId),
      }));
      setReviewRating(5);
      setReviewComment('');
    } catch (err) {
      window.alert(err.response?.data?.message || err.message);
    } finally {
      setDeletingReview(false);
    }
  };

  const meta = useMemo(() => {
    if (!course?.description) {
      return {};
    }
    try {
      return JSON.parse(course.description);
    } catch {
      return {};
    }
  }, [course?.description]);

  const rawDescription = useMemo(() => {
    if (!course?.description) {
      return '';
    }
    try {
      JSON.parse(course.description);
      return '';
    } catch {
      return course.description;
    }
  }, [course?.description]);

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-purple-600"></div>
      </div>
    );
  }

  if (error || !course) {
    return (
      <div className="p-8 text-center">
        <h2 className="mb-4 text-2xl font-bold text-slate-800">Oops!</h2>
        <p className="mb-6 text-slate-600">{error || 'Không tìm thấy khóa học'}</p>
        <button
          onClick={() => navigate('/explore')}
          className="inline-flex items-center gap-2 text-purple-600 hover:underline"
        >
          <ChevronLeft className="h-4 w-4" /> Quay lại khám phá
        </button>
      </div>
    );
  }

  const totalLessons = course.lessons?.length || course._count?.lessons || 0;
  const isEnrolled = course.isEnrolled;
  const averageRating = Number(course.averageRating || 0);
  const reviewCount = Number(course.reviewCount || 0);

  return (
    <div className="mx-auto max-w-6xl pb-24">
      <button
        onClick={() => navigate('/explore')}
        className="mb-6 inline-flex items-center gap-2 text-sm text-slate-500 transition-colors hover:text-slate-900"
      >
        <ChevronLeft className="h-4 w-4" />
        Quay lại
      </button>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        <div className="space-y-8 lg:col-span-2">
          <div className="rounded-3xl border border-slate-100 bg-white p-8 shadow-sm">
            <div
              className={`mb-8 flex aspect-video items-center justify-center overflow-hidden rounded-2xl bg-gradient-to-br ${
                meta.gradient || 'from-indigo-500 to-purple-600'
              }`}
            >
              {course.thumbnail ? (
                <img src={course.thumbnail} alt={course.title} className="h-full w-full object-cover" />
              ) : (
                <div className="text-8xl">{meta.icon || '🎓'}</div>
              )}
            </div>

            <div className="mb-4 flex flex-wrap items-center gap-3">
              <span className="rounded-full bg-purple-50 px-3 py-1 text-xs font-semibold text-purple-700">
                {meta.category || 'Lập trình'}
              </span>
              <span className="flex items-center gap-1 text-sm font-medium text-amber-500">
                <Star className="h-4 w-4 fill-current" />
                {reviewCount > 0 ? `${averageRating.toFixed(1)} · ${reviewCount} đánh giá` : 'Chưa có đánh giá'}
              </span>
              <span className="flex items-center gap-1 text-sm text-slate-500">
                <Users className="h-4 w-4" />
                {course._count?.enrollments || 0} học viên
              </span>
              <span className="flex items-center gap-1 text-sm text-slate-500">
                <Clock className="h-4 w-4" />
                {formatDuration(course.totalDurationSeconds || 0)}
              </span>
            </div>

            <h1 className="mb-4 text-3xl font-bold leading-tight text-slate-900 sm:text-4xl">{course.title}</h1>

            <p className="mb-6 text-lg leading-relaxed text-slate-600">
              {rawDescription ||
                meta.summary ||
                'Một khóa học thực chiến để bạn học, làm và tích lũy giá trị thật cho hành trình phát triển kỹ năng.'}
            </p>

            <div className="flex items-center gap-4 border-t border-slate-100 py-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-200 text-lg font-bold text-slate-500">
                {course.instructor?.name?.charAt(0) || 'G'}
              </div>
              <div>
                <p className="text-sm text-slate-500">Giảng viên</p>
                <p className="font-semibold text-slate-900">{course.instructor?.name || 'Chưa cập nhật'}</p>
              </div>
            </div>
          </div>

          <div className="rounded-3xl border border-slate-100 bg-white p-8 shadow-sm">
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-2xl font-bold text-slate-900">Nội dung khóa học</h2>
              <span className="rounded-full bg-slate-100 px-3 py-1 text-sm font-medium text-slate-500">
                {totalLessons} bài học
              </span>
            </div>

            <div className="space-y-6">
              {(course.sections || []).length > 0 ? (
                course.sections.map((section, sectionIndex) => (
                  <div key={section.id} className="rounded-2xl border border-slate-100 p-4">
                    <div className="mb-3">
                      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                        Chương {sectionIndex + 1}
                      </p>
                      <h3 className="mt-2 text-lg font-semibold text-slate-900">{section.title}</h3>
                      {section.description ? (
                        <p className="mt-1 text-sm text-slate-500">{section.description}</p>
                      ) : null}
                    </div>

                    <div className="space-y-3">
                      {(section.lessons || []).map((lesson, lessonIndex) => {
                        const unlocked = isEnrolled || lesson.isPreview;
                        return (
                          <div
                            key={lesson.id}
                            className={`flex items-start gap-4 rounded-2xl border p-4 transition-all ${
                              unlocked
                                ? 'cursor-pointer border-slate-100 hover:border-purple-200 hover:bg-purple-50'
                                : 'border-slate-100 opacity-80'
                            }`}
                          >
                            <div className={`mt-1 flex-shrink-0 ${unlocked ? 'text-purple-600' : 'text-slate-400'}`}>
                              {unlocked ? <PlayCircle className="h-6 w-6" /> : <Lock className="h-6 w-6" />}
                            </div>
                            <div>
                              <h4 className={`font-semibold ${unlocked ? 'text-slate-900' : 'text-slate-600'}`}>
                                {lessonIndex + 1}. {lesson.title}
                              </h4>
                              <p className="mt-1 line-clamp-1 text-sm text-slate-500">
                                {lesson.content || 'Video bài giảng và tài liệu đính kèm'}
                              </p>
                              <div className="mt-2 flex items-center gap-3 text-xs text-slate-400">
                                {lesson.durationSeconds ? <span>{formatDuration(lesson.durationSeconds)}</span> : null}
                                {lesson.isPreview ? (
                                  <span className="rounded-full bg-emerald-50 px-2 py-1 text-emerald-600">
                                    Preview
                                  </span>
                                ) : null}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))
              ) : (
                <div className="py-12 text-center text-slate-500">Chưa có bài giảng nào được thêm vào.</div>
              )}
            </div>
          </div>

          <div className="rounded-3xl border border-slate-100 bg-white p-8 shadow-sm">
            <div className="mb-6 flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-slate-900">Đánh giá khóa học</h2>
                <p className="mt-1 text-sm text-slate-500">
                  {reviewCount > 0
                    ? `${averageRating.toFixed(1)} trên 5 từ ${reviewCount} học viên`
                    : 'Khóa học này chưa có đánh giá nào.'}
                </p>
              </div>
              <div className="rounded-2xl bg-amber-50 px-4 py-3 text-right">
                <p className="text-2xl font-bold text-amber-500">
                  {reviewCount > 0 ? averageRating.toFixed(1) : '--'}
                </p>
                <ReviewStars value={Math.round(averageRating)} />
              </div>
            </div>

            {course.canReview ? (
              <div className="mb-6 rounded-2xl border border-slate-100 bg-slate-50 p-5">
                <div className="mb-3 flex items-center justify-between gap-4">
                  <div>
                    <h3 className="font-semibold text-slate-900">
                      {course.userReview ? 'Cập nhật đánh giá của bạn' : 'Viết đánh giá đầu tiên của bạn'}
                    </h3>
                    <p className="text-sm text-slate-500">Chia sẻ cảm nhận để học viên khác dễ quyết định hơn.</p>
                  </div>
                  <ReviewStars value={reviewRating} onChange={setReviewRating} interactive />
                </div>

                <textarea
                  value={reviewComment}
                  onChange={(event) => setReviewComment(event.target.value)}
                  rows={4}
                  placeholder="Bạn thích điều gì ở khóa học này?"
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition-colors focus:border-purple-400"
                />

                <div className="mt-4 flex items-center justify-end gap-3">
                  {course.userReview ? (
                    <button
                      type="button"
                      onClick={handleDeleteReview}
                      disabled={deletingReview}
                      className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100 disabled:opacity-60"
                    >
                      {deletingReview ? 'Đang xóa...' : 'Xóa đánh giá'}
                    </button>
                  ) : null}
                  <button
                    type="button"
                    onClick={handleSubmitReview}
                    disabled={submittingReview}
                    className="rounded-xl bg-purple-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-purple-700 disabled:opacity-60"
                  >
                    {submittingReview ? 'Đang lưu...' : course.userReview ? 'Cập nhật đánh giá' : 'Gửi đánh giá'}
                  </button>
                </div>
              </div>
            ) : null}

            <div className="space-y-4">
              {(course.reviews || []).length > 0 ? (
                course.reviews.map((review) => (
                  <div key={review.id} className="rounded-2xl border border-slate-100 p-4">
                    <div className="mb-2 flex items-center justify-between gap-4">
                      <div>
                        <p className="font-semibold text-slate-900">{review.user?.name || 'Học viên'}</p>
                        <p className="text-xs text-slate-400">{formatReviewDate(review.createdAt)}</p>
                      </div>
                      <ReviewStars value={review.rating} />
                    </div>
                    <p className="text-sm leading-relaxed text-slate-600">
                      {review.comment || 'Học viên này chưa để lại nhận xét bằng chữ.'}
                    </p>
                  </div>
                ))
              ) : (
                <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-6 text-center text-slate-500">
                  <MessageSquare className="mx-auto mb-3 h-6 w-6 text-slate-400" />
                  Chưa có đánh giá nào cho khóa học này.
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="lg:col-span-1">
          <div className="sticky top-6 rounded-3xl border border-slate-100 bg-white p-6 shadow-xl shadow-slate-200/50">
            <div className="mb-6 text-center">
              <span className="text-3xl font-bold text-slate-900">
                {course.price > 0 ? formatCurrency(course.price) : 'Miễn phí'}
              </span>
            </div>

            {!isEnrolled && course.price > 0 ? (
              <div className="mb-5 rounded-2xl border border-amber-100 bg-amber-50 p-4 text-sm text-amber-900">
                <div className="flex items-start gap-3">
                  <Wallet className="mt-0.5 h-5 w-5 text-amber-600" />
                  <div>
                    <p className="mb-1 font-semibold">Khóa học này sử dụng ví nội bộ</p>
                    <p className="text-amber-800/80">
                      Nếu số dư chưa đủ, bạn có thể{' '}
                      <Link to="/upgrade" className="font-medium underline">
                        nạp thêm vào ví
                      </Link>{' '}
                      trước khi mua.
                    </p>
                  </div>
                </div>
              </div>
            ) : null}

            {isEnrolled ? (
              <div className="space-y-4">
                <div className="flex items-center gap-3 rounded-2xl bg-green-50 p-4 text-green-700">
                  <CheckCircle className="h-6 w-6 flex-shrink-0" />
                  <p className="text-sm font-medium">Bạn đã đăng ký khóa học này</p>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between text-xs font-medium text-slate-500">
                    <span>Tiến độ học tập</span>
                    <span>{course.progress}%</span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
                    <div
                      className="h-full rounded-full bg-green-500 transition-all duration-500"
                      style={{ width: `${course.progress}%` }}
                    />
                  </div>
                </div>

                <button
                  onClick={() => navigate(`/learn/${id}`)}
                  className="group flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-900 px-6 py-4 font-semibold text-white transition-colors hover:bg-slate-800"
                >
                  Tiếp tục học
                  <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
                </button>
              </div>
            ) : (
              <button
                onClick={handleEnroll}
                disabled={enrolling}
                className="w-full rounded-2xl bg-purple-600 px-6 py-4 font-semibold text-white transition-all hover:bg-purple-700 hover:shadow-lg hover:shadow-purple-200 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {enrolling ? 'Đang xử lý...' : course.price > 0 ? 'Mua bằng ví nội bộ' : 'Đăng ký học ngay'}
              </button>
            )}

            <div className="mt-8 space-y-4">
              <h3 className="font-semibold text-slate-900">Khóa học bao gồm:</h3>
              <ul className="space-y-3 text-sm text-slate-600">
                <li className="flex items-center gap-3">
                  <BookOpen className="h-4 w-4 text-purple-600" />
                  <span>{totalLessons} bài giảng chất lượng</span>
                </li>
                <li className="flex items-center gap-3">
                  <Clock className="h-4 w-4 text-purple-600" />
                  <span>{formatDuration(course.totalDurationSeconds || 0)} nội dung video</span>
                </li>
                <li className="flex items-center gap-3">
                  <CheckCircle className="h-4 w-4 text-purple-600" />
                  <span>Cập nhật tiến độ và hỏi đáp trong bài học</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
