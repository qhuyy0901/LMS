import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';
import {
  ArrowRight,
  Award,
  BookOpen,
  CalendarDays,
  CheckCircle,
  ChevronLeft,
  Clock,
  GraduationCap,
  Lock,
  MessageSquare,
  PlayCircle,
  Star,
  Tag,
  UserRound,
  Users,
  Wallet,
  X,
} from 'lucide-react';
import { resolveMediaUrl } from '../utils/mediaUrl';
import { useDashboardView } from '../context/DashboardViewContext';
import { useAuth } from '../context/AuthContext';

const formatCurrency = (amount = 0) =>
  new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(Number(amount) || 0);

const formatDuration = (seconds = 0) => {
  const total = Math.max(0, Number(seconds) || 0);
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
};

const formatDate = (value, fallback = 'Chưa cập nhật') => {
  if (!value) return fallback;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return fallback;
  return new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(date);
};

const parseMeta = (description) => {
  if (!description) return {};
  try {
    const parsed = JSON.parse(description);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
};

const getPlainDescription = (course, meta) => {
  if (course?.shortDescription) return course.shortDescription;
  if (course?.moTaNgan) return course.moTaNgan;
  if (meta.summary) return meta.summary;
  if (!course?.description) return '';
  try {
    JSON.parse(course.description);
    return '';
  } catch {
    return course.description;
  }
};

const getCourseImage = (course) =>
  course?.thumbnail ||
  course?.imageUrl ||
  course?.coverImage ||
  course?.courseImage ||
  course?.anhBia ||
  course?.cover ||
  course?.anhDaiDien ||
  '';

const getStudentCount = (course) =>
  Number(
    course?.studentCount ??
      course?.hocVien ??
      course?._count?.students ??
      course?._count?.enrollments ??
      course?.enrollments ??
      0
  ) || 0;

const getTeacherId = (course) =>
  course?.instructor?.id || course?.instructorId || course?.teacherId || course?.giangVienId || '';

const getTeacherName = (course) =>
  course?.instructor?.name || course?.instructorName || course?.teacherName || course?.tenGiangVien || 'Chưa cập nhật';

const getTeacherAvatar = (course) =>
  course?.instructor?.avatar || course?.instructorAvatar || course?.teacherAvatar || course?.logoGiangVien || '';

const ReviewStars = ({ value, onChange, interactive = false }) => (
  <div className="flex items-center gap-1">
    {[1, 2, 3, 4, 5].map((star) => (
      <button
        key={star}
        type="button"
        onClick={interactive ? () => onChange(star) : undefined}
        className={interactive ? 'transition-transform hover:scale-110 active:scale-90 cursor-pointer' : 'cursor-default'}
        aria-label={`${star} sao`}
      >
        <Star
          className={`h-4 w-4 transition-colors ${
            star <= value ? 'fill-amber-400 text-amber-400' : 'text-slate-250 dark:text-slate-850'
          }`}
        />
      </button>
    ))}
  </div>
);

const Avatar = ({ src, name, size = 'h-12 w-12' }) => {
  const imageUrl = resolveMediaUrl(src);
  if (imageUrl) {
    return <img src={imageUrl} alt={name || 'Giảng viên'} className={`${size} rounded-2xl object-cover border border-slate-100/50 dark:border-slate-800/30`} />;
  }

  return (
    <div className={`${size} flex items-center justify-center rounded-2xl bg-purple-50 dark:bg-purple-950/30 text-lg font-bold text-purple-705 dark:text-purple-400 border border-purple-100/30 dark:border-purple-900/20`}>
      {(name || 'G').charAt(0).toUpperCase()}
    </div>
  );
};

export default function CourseDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { isImpersonating } = useDashboardView();
  const { user } = useAuth();

  const [course, setCourse] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [imageError, setImageError] = useState(false);
  const [enrolling, setEnrolling] = useState(false);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);
  const [deletingReview, setDeletingReview] = useState(false);
  const [couponCode, setCouponCode] = useState('');
  const [couponResult, setCouponResult] = useState(null);
  const [validatingCoupon, setValidatingCoupon] = useState(false);
  const [teacherOpen, setTeacherOpen] = useState(false);
  const [teacherDetails, setTeacherDetails] = useState(null);
  const [teacherLoading, setTeacherLoading] = useState(false);
  const [teacherError, setTeacherError] = useState('');

  useEffect(() => {
    const fetchCourse = async () => {
      setLoading(true);
      setError(null);
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
      window.history.replaceState(null, '', window.location.pathname);
    }
  }, [id]);

  useEffect(() => {
    if (course?.userReview) {
      setReviewRating(course.userReview.rating);
      setReviewComment(course.userReview.comment || '');
    } else {
      setReviewRating(0);
      setReviewComment('');
    }
  }, [course?.userReview]);

  const meta = useMemo(() => parseMeta(course?.description), [course?.description]);
  const courseImageUrl = useMemo(() => resolveMediaUrl(getCourseImage(course)), [course]);

  useEffect(() => {
    setImageError(false);
  }, [courseImageUrl]);

  const coursePrice = Number(course?.price ?? course?.gia ?? 0) || 0;
  const category = course?.category || course?.danhMuc || meta.category || 'Chưa cập nhật';
  const studentCount = getStudentCount(course);
  const purchaseCount = Number(course?.purchaseCount ?? course?._count?.purchases ?? 0) || 0;
  const totalLessons = course?.sections
    ? course.sections.reduce((acc, section) => acc + (section.lessons?.length || 0), 0)
    : course?.lessons?.length || course?._count?.lessons || 0;
  const totalDuration = Number(course?.totalDurationSeconds ?? course?.durationSeconds ?? 0) || 0;
  const hasPreview =
    course?.sections?.some((section) => section.lessons?.some((lesson) => lesson.isPreview)) ||
    course?.lessons?.some((lesson) => lesson.isPreview);
  const isEnrolled = Boolean(course?.isEnrolled);
  const progress = Number(course?.progress ?? 0) || 0;
  const averageRating = Number(course?.averageRating || 0);
  const reviewCount = Number(course?.reviewCount || 0);
  const description =
    getPlainDescription(course, meta) ||
    'Một khóa học thực chiến để bạn học, làm và tích lũy kỹ năng theo lộ trình rõ ràng.';
  const detailedDescription = course?.detailedDescription || course?.moTaChiTiet || '';
  const teacherId = getTeacherId(course);
  const teacherName = getTeacherName(course);
  const teacherAvatar = getTeacherAvatar(course);
  const isInstructor = Boolean(user && teacherId && user.id === teacherId);

  const handleValidateCoupon = async () => {
    if (!couponCode.trim()) return;
    setValidatingCoupon(true);
    try {
      const response = await axios.post('/api/coupons/validate', {
        code: couponCode.trim(),
        courseId: id,
      });
      setCouponResult(response.data);
    } catch (err) {
      setCouponResult({
        valid: false,
        error: err.response?.data?.error || err.response?.data?.message || err.message,
      });
    } finally {
      setValidatingCoupon(false);
    }
  };

  const handleRemoveCoupon = () => {
    setCouponCode('');
    setCouponResult(null);
  };

  const handleEnroll = async () => {
    if (isImpersonating) {
      window.alert('Chế độ xem thử chỉ mô phỏng trải nghiệm sinh viên và không phát sinh đăng ký hoặc giao dịch.');
      return;
    }

    setEnrolling(true);
    try {
      if (coursePrice > 0) {
        const response = await axios.post('/api/payments/create-checkout-session', {
          type: 'course',
          courseId: id,
          couponCode: couponResult?.valid ? couponResult.couponCode : undefined,
        });

        if (response.data.successUrl) {
          window.location.href = response.data.successUrl;
        }
      } else {
        await axios.post(`/api/courses/${id}/enroll`);
        setCourse((prev) => ({
          ...prev,
          isEnrolled: true,
          progress: 0,
          canReview: false,
          studentCount: getStudentCount(prev) + 1,
        }));
      }
    } catch (err) {
      const shortfall = err.response?.data?.shortfall;
      const message = err.response?.data?.message || err.message;
      window.alert(shortfall ? `${message}. Bạn cần nạp thêm ${formatCurrency(shortfall)} vào ví.` : message);
    } finally {
      setEnrolling(false);
    }
  };

  const handleSubmitReview = async () => {
    if (isImpersonating) {
      window.alert('Chế độ xem thử không hỗ trợ gửi đánh giá.');
      return;
    }
    if (!reviewRating || reviewRating < 1 || reviewRating > 5) {
      window.alert('Vui lòng chọn số sao đánh giá.');
      return;
    }
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
    if (isImpersonating) {
      window.alert('Chế độ xem thử không hỗ trợ xóa đánh giá.');
      return;
    }
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
      setReviewRating(0);
      setReviewComment('');
    } catch (err) {
      window.alert(err.response?.data?.message || err.message);
    } finally {
      setDeletingReview(false);
    }
  };

  const openTeacherDetails = async () => {
    if (!teacherId) return;
    setTeacherOpen(true);
    if (teacherDetails?.id === teacherId) return;

    setTeacherLoading(true);
    setTeacherError('');
    try {
      const response = await axios.get(`/api/teachers/${teacherId}`);
      setTeacherDetails(response.data);
    } catch (err) {
      setTeacherError(err.response?.data?.message || 'Không thể tải thông tin giảng viên.');
    } finally {
      setTeacherLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-purple-600" />
      </div>
    );
  }

  if (error || !course) {
    return (
      <div className="p-8 text-center">
        <h2 className="mb-4 text-2xl font-bold text-slate-800">Oops!</h2>
        <p className="mb-6 text-slate-600">{error || 'Không tìm thấy khóa học'}</p>
        <button
          type="button"
          onClick={() => navigate('/explore')}
          className="inline-flex items-center gap-2 text-purple-650 hover:underline"
        >
          <ChevronLeft className="h-4 w-4" />
          Quay lại khám phá
        </button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl pb-24 px-4 sm:px-6">
      <button
        type="button"
        onClick={() => navigate('/explore')}
        className="group mb-6 inline-flex items-center gap-2 rounded-full border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-4 py-2 text-xs font-semibold text-slate-500 dark:text-slate-400 transition-all hover:text-slate-900 dark:hover:text-slate-100 hover:border-slate-300 active:scale-95 cursor-pointer shadow-sm animate-[fadeIn_0.4s_ease-out]"
      >
        <ChevronLeft className="h-4 w-4 transition-transform group-hover:-translate-x-0.5" />
        Quay lại khám phá
      </button>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3 items-start">
        {/* Left Column (2/3) */}
        <div className="space-y-8 lg:col-span-2">
          {/* Main Course Details Card */}
          <section className="p-1.5 rounded-[2rem] bg-slate-50/50 dark:bg-slate-900/50 border border-slate-100/60 dark:border-slate-800/40 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.02)]">
            <div className="bg-white dark:bg-slate-950 rounded-[calc(2rem-6px)] p-6 sm:p-8 border border-slate-100/50 dark:border-slate-855/50">
              {/* Cover Image Bezel nested */}
              <div className="relative mb-8 aspect-video overflow-hidden rounded-[calc(2rem-10px)] bg-slate-50 dark:bg-slate-900 border border-slate-100/30 dark:border-slate-800/20">
                {courseImageUrl && !imageError ? (
                  <img
                    src={courseImageUrl}
                    alt={course.title || 'Ảnh khóa học'}
                    onError={() => setImageError(true)}
                    className="h-full w-full object-cover transition duration-700 hover:scale-102"
                  />
                ) : (
                  <div className="flex h-full w-full flex-col items-center justify-center bg-gradient-to-tr from-purple-900/30 to-indigo-900/30 p-6 text-center select-none">
                    <BookOpen className="h-16 w-16 text-purple-500/45 dark:text-purple-400/30 mb-4 animate-pulse" strokeWidth={1.2} />
                    <h3 className="text-xl font-bold tracking-tight line-clamp-2 max-w-md text-slate-800 dark:text-slate-200">{course.title}</h3>
                    <span className="mt-2 text-[10px] font-mono tracking-wider uppercase text-purple-650 dark:text-purple-400 bg-purple-500/5 px-2 py-0.5 rounded border border-purple-500/10">Skillio Academy</span>
                  </div>
                )}
              </div>

              {/* Course Meta Info Tags */}
              <div className="mb-6 flex flex-wrap items-center gap-3 text-xs">
                <span className="rounded-md bg-purple-50 dark:bg-purple-950/20 border border-purple-100/20 dark:border-purple-900/10 px-3 py-1 font-mono uppercase text-purple-700 dark:text-purple-400">
                  {category}
                </span>
                
                <span className="flex items-center gap-1.5 font-semibold text-amber-500 bg-amber-500/5 px-3 py-1 rounded-md border border-amber-500/10">
                  <Star className="h-3.5 w-3.5 fill-current" />
                  {reviewCount > 0 ? `${averageRating.toFixed(1)} · ${reviewCount} đánh giá` : 'Chưa có đánh giá'}
                </span>

                <span className="flex items-center gap-1.5 text-slate-550 dark:text-slate-400 bg-slate-50 dark:bg-slate-900 px-3 py-1 rounded-md border border-slate-100/60 dark:border-slate-800/40">
                  <Users className="h-3.5 w-3.5" />
                  {studentCount} học viên
                </span>

                <span className="flex items-center gap-1.5 text-slate-550 dark:text-slate-400 bg-slate-50 dark:bg-slate-900 px-3 py-1 rounded-md border border-slate-100/60 dark:border-slate-800/40">
                  <Clock className="h-3.5 w-3.5" />
                  {formatDuration(totalDuration)}
                </span>
              </div>

              {/* Course Title and Description */}
              <h1 className="mb-4 text-3xl font-extrabold leading-tight text-slate-900 dark:text-white sm:text-4xl tracking-tight">{course.title}</h1>
              <p className="mb-6 text-base leading-relaxed text-slate-650 dark:text-slate-450 max-w-[65ch] font-medium">{description}</p>
              {detailedDescription ? (
                <p className="mb-6 text-sm leading-relaxed text-slate-550 dark:text-slate-500 max-w-[65ch] font-normal">{detailedDescription}</p>
              ) : null}

              {/* Date Box Widgets */}
              <div className="grid gap-4 border-t border-slate-100/80 dark:border-slate-900 py-6 sm:grid-cols-2">
                <div className="flex items-center gap-3.5 rounded-2xl bg-slate-50/50 dark:bg-slate-900/40 border border-slate-100/50 dark:border-slate-900/30 p-4">
                  <div className="p-2 rounded-xl bg-purple-50 dark:bg-purple-950/20 text-purple-600 dark:text-purple-400">
                    <CalendarDays className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Ngày bắt đầu</p>
                    <p className="font-bold text-sm text-slate-800 dark:text-slate-200 mt-0.5">{formatDate(course.startDate)}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3.5 rounded-2xl bg-slate-50/50 dark:bg-slate-900/40 border border-slate-100/50 dark:border-slate-900/30 p-4">
                  <div className="p-2 rounded-xl bg-purple-50 dark:bg-purple-950/20 text-purple-600 dark:text-purple-400">
                    <CalendarDays className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Ngày kết thúc</p>
                    <p className="font-bold text-sm text-slate-800 dark:text-slate-200 mt-0.5">{formatDate(course.endDate)}</p>
                  </div>
                </div>
              </div>

              {/* Teacher Summary Button */}
              <button
                type="button"
                onClick={openTeacherDetails}
                className="flex w-full items-center gap-4 border-t border-slate-100/80 dark:border-slate-900 pt-6 text-left transition hover:opacity-90 group cursor-pointer bg-transparent"
              >
                <Avatar src={teacherAvatar} name={teacherName} size="h-12 w-12" />
                <div className="min-w-0">
                  <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Giảng viên phụ trách</p>
                  <p className="font-bold text-slate-800 dark:text-slate-200 group-hover:text-purple-600 transition-colors mt-0.5">{teacherName}</p>
                </div>
              </button>
            </div>
          </section>

          {/* Curriculum Section */}
          <section className="p-1.5 rounded-[2rem] bg-slate-50/50 dark:bg-slate-900/50 border border-slate-100/60 dark:border-slate-800/40 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.02)]">
            <div className="bg-white dark:bg-slate-950 rounded-[calc(2rem-6px)] p-6 sm:p-8 border border-slate-100/50 dark:border-slate-855/50">
              <div className="mb-6 flex items-center justify-between">
                <h2 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">Chương trình học</h2>
                <span className="rounded-full bg-slate-50 dark:bg-slate-900 border border-slate-100/50 dark:border-slate-800/40 px-3.5 py-1 text-xs font-mono font-bold text-slate-555 dark:text-slate-400">
                  {totalLessons} bài học
                </span>
              </div>

              <div className="space-y-6">
                {(course.sections || []).length > 0 ? (
                  course.sections.map((section, sectionIndex) => (
                    <div key={section.id} className="rounded-[1.5rem] border border-slate-100 dark:border-slate-900 bg-slate-50/30 dark:bg-slate-950/20 p-5">
                      <div className="mb-4">
                        <p className="text-[9px] font-mono font-bold uppercase tracking-[0.2em] text-purple-605 dark:text-purple-450">
                          Chương {sectionIndex + 1}
                        </p>
                        <h3 className="mt-1 text-base font-bold text-slate-850 dark:text-slate-200 tracking-tight leading-snug">{section.title}</h3>
                        {section.description ? (
                          <p className="mt-1.5 text-xs text-slate-450 dark:text-slate-500 leading-relaxed">{section.description}</p>
                        ) : null}
                      </div>

                      <div className="space-y-3">
                        {(section.lessons || []).map((lesson, lessonIndex) => {
                          const unlocked = isEnrolled || lesson.isPreview;
                          return (
                            <div
                              key={lesson.id}
                              className={`flex items-start gap-4 rounded-2xl border p-4 transition-all duration-300 ${
                                unlocked
                                  ? 'cursor-pointer border-slate-100/80 dark:border-slate-900/60 bg-white dark:bg-slate-900 hover:border-purple-200/50 dark:hover:border-purple-900/30 hover:shadow-[0_4px_12px_rgba(139,92,246,0.03)]'
                                  : 'border-slate-100/50 dark:border-slate-900/30 bg-slate-50/20 dark:bg-slate-950/10 opacity-75'
                              }`}
                            >
                              <div className={`mt-0.5 flex-shrink-0 ${unlocked ? 'text-purple-600 dark:text-purple-400' : 'text-slate-400 dark:text-slate-700'}`}>
                                {unlocked ? <PlayCircle className="h-5 w-5" /> : <Lock className="h-5 w-5" />}
                              </div>
                              <div className="min-w-0 flex-1">
                                <h4 className={`text-sm font-semibold leading-snug ${unlocked ? 'text-slate-850 dark:text-slate-200' : 'text-slate-500 dark:text-slate-500'}`}>
                                  {lessonIndex + 1}. {lesson.title}
                                </h4>
                                <p className="mt-1 line-clamp-1 text-xs text-slate-400 dark:text-slate-550 font-normal">
                                  {lesson.content || 'Video bài giảng và tài liệu đính kèm'}
                                </p>
                                <div className="mt-2.5 flex items-center gap-3 text-[10px] font-mono font-medium text-slate-400 dark:text-slate-650">
                                  {lesson.durationSeconds ? <span>{formatDuration(lesson.durationSeconds)}</span> : null}
                                  {lesson.isPreview ? (
                                    <span className="rounded bg-emerald-500/5 text-emerald-600 dark:text-emerald-400 border border-emerald-500/10 px-1.5 py-0.5 uppercase tracking-wider text-[8px] font-bold">Học thử</span>
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
                  <div className="py-12 text-center text-slate-400 dark:text-slate-600 text-sm font-medium">Chưa có bài giảng nào được thêm vào.</div>
                )}
              </div>
            </div>
          </section>

          {/* Reviews Section */}
          <section className="p-1.5 rounded-[2rem] bg-slate-50/50 dark:bg-slate-900/50 border border-slate-100/60 dark:border-slate-800/40 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.02)]">
            <div className="bg-white dark:bg-slate-950 rounded-[calc(2rem-6px)] p-6 sm:p-8 border border-slate-100/50 dark:border-slate-855/50">
              <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <h2 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">Đánh giá khóa học</h2>
                  <p className="mt-1.5 text-xs text-slate-450 dark:text-slate-500 leading-relaxed font-medium">
                    {reviewCount > 0
                      ? `${averageRating.toFixed(1)} trên 5 từ ${reviewCount} học viên`
                      : 'Khóa học này chưa có đánh giá nào.'}
                  </p>
                </div>
                <div className="flex items-center gap-3 rounded-2xl bg-amber-500/5 px-4.5 py-3 border border-amber-500/10">
                  <div className="text-right">
                    <p className="text-2xl font-black text-amber-500 font-mono tracking-tight">{reviewCount > 0 ? averageRating.toFixed(1) : '--'}</p>
                    <div className="mt-1">
                      <ReviewStars value={Math.round(averageRating)} />
                    </div>
                  </div>
                </div>
              </div>

              {isEnrolled && progress >= 100 && !isInstructor ? (
                <div className="mb-8 rounded-[1.5rem] border border-slate-100 dark:border-slate-900 bg-slate-50/40 dark:bg-slate-950/20 p-5">
                  <div className="mb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <h3 className="font-bold text-sm text-slate-850 dark:text-slate-200">
                        {course.userReview ? 'Cập nhật đánh giá của bạn' : 'Viết đánh giá đầu tiên của bạn'}
                      </h3>
                      <p className="text-xs text-slate-400 mt-0.5">Chia sẻ cảm nhận thực tế để giúp các học viên khác lựa chọn.</p>
                    </div>
                    <ReviewStars value={reviewRating} onChange={setReviewRating} interactive />
                  </div>

                  <textarea
                    value={reviewComment}
                    onChange={(event) => setReviewComment(event.target.value)}
                    rows={4}
                    placeholder="Bạn thích nhất điểm nào ở khóa học này? Lời khuyên cho các bạn học sau?"
                    className="w-full rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-4 py-3 text-sm text-slate-700 dark:text-slate-300 outline-none transition focus:border-purple-400 dark:focus:border-purple-900"
                  />

                  <div className="mt-4 flex items-center justify-end gap-3">
                    {course.userReview ? (
                      <button
                        type="button"
                        onClick={handleDeleteReview}
                        disabled={deletingReview}
                        className="rounded-full border border-slate-200 dark:border-slate-850 px-4 py-2 text-xs font-semibold text-slate-500 hover:text-rose-600 hover:border-rose-200 hover:bg-rose-500/5 transition disabled:opacity-60 cursor-pointer"
                      >
                        {deletingReview ? 'Đang xóa...' : 'Xóa đánh giá'}
                      </button>
                    ) : null}
                    <button
                      type="button"
                      onClick={handleSubmitReview}
                      disabled={submittingReview || reviewRating === 0}
                      className="rounded-full bg-purple-650 hover:bg-purple-750 px-5 py-2 text-xs font-bold text-white transition disabled:opacity-65 disabled:cursor-not-allowed cursor-pointer"
                    >
                      {submittingReview ? 'Đang lưu...' : course.userReview ? 'Cập nhật đánh giá' : 'Gửi đánh giá'}
                    </button>
                  </div>
                </div>
              ) : !isInstructor ? (
                <div className="mb-8 rounded-[1.5rem] border border-slate-100/80 dark:border-slate-900/60 bg-slate-50/30 dark:bg-slate-950/10 p-5 text-center text-slate-500">
                  {!isEnrolled ? (
                    <p className="text-xs font-semibold text-slate-550 dark:text-slate-400">Bạn cần sở hữu khóa học để gửi đánh giá</p>
                  ) : (
                    <div className="space-y-3">
                      <p className="text-xs font-semibold text-slate-550 dark:text-slate-400">Hoàn thành 100% khóa học để mở khóa tính năng đánh giá</p>
                      <div className="mx-auto max-w-xs">
                        <div className="flex justify-between text-[10px] font-mono font-bold text-slate-400 dark:text-slate-600 mb-1.5">
                          <span>TIẾN ĐỘ HỌC TẬP</span>
                          <span>{progress}%</span>
                        </div>
                        <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-900">
                          <div
                            className="h-full rounded-full bg-purple-500 transition-all duration-500"
                            style={{ width: `${progress}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ) : null}

              {/* Review List */}
              <div className="space-y-4">
                {(course.reviews || []).length > 0 ? (
                  course.reviews.map((review) => (
                    <div key={review.id} className="rounded-2xl border border-slate-100 dark:border-slate-900/60 bg-slate-50/20 dark:bg-slate-950/10 p-4">
                      <div className="mb-3 flex items-center justify-between gap-4">
                        <div>
                          <p className="font-bold text-sm text-slate-805 dark:text-slate-200">{review.user?.name || 'Học viên'}</p>
                          <p className="text-[10px] font-mono text-slate-400 mt-0.5">{formatDate(review.createdAt, '')}</p>
                        </div>
                        <ReviewStars value={review.rating} />
                      </div>
                      <p className="text-xs leading-relaxed text-slate-600 dark:text-slate-400 font-medium">
                        {review.comment || 'Học viên này chưa để lại nhận xét bằng chữ.'}
                      </p>
                    </div>
                  ))
                ) : (
                  <div className="rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 bg-slate-50/20 dark:bg-slate-950/10 p-8 text-center text-slate-400 dark:text-slate-600">
                    <MessageSquare className="mx-auto mb-3 h-8 w-8 text-slate-350 dark:text-slate-750 stroke-[1.2]" />
                    <p className="text-xs font-semibold">Chưa có đánh giá nào cho khóa học này</p>
                  </div>
                )}
              </div>
            </div>
          </section>
        </div>

        {/* Right Column Sidebar (1/3) */}
        <aside className="lg:col-span-1">
          <div className="sticky top-6 p-1.5 rounded-[2rem] bg-slate-50/50 dark:bg-slate-900/50 border border-slate-100/60 dark:border-slate-800/40 shadow-[0_8px_30px_-6px_rgba(0,0,0,0.02)] animate-[fadeIn_0.5s_ease-out]">
            <div className="bg-white dark:bg-slate-950 rounded-[calc(2rem-6px)] p-6 border border-slate-100/50 dark:border-slate-855/50">
              {/* Price display area */}
              <div className="mb-6 text-center">
                {couponResult?.valid ? (
                  <div>
                    <span className="text-sm text-slate-400 dark:text-slate-650 line-through font-mono font-medium">{formatCurrency(coursePrice)}</span>
                    <span className="ml-2 text-3xl font-black text-purple-650 dark:text-purple-405 font-mono tracking-tight">{formatCurrency(couponResult.finalPrice)}</span>
                    <div className="mt-2.5 inline-flex items-center gap-1 rounded bg-green-500/5 border border-green-500/10 px-2.5 py-0.5 text-[10px] font-mono font-bold text-green-600 dark:text-green-400 uppercase tracking-wide">
                      <Tag className="h-3 w-3" />
                      Giảm {formatCurrency(couponResult.discountAmount)}
                    </div>
                  </div>
                ) : (
                  <span className="text-3xl font-black text-slate-900 dark:text-white font-mono tracking-tight">
                    {coursePrice > 0 ? formatCurrency(coursePrice) : 'Miễn phí'}
                  </span>
                )}
              </div>

              {/* Wallet Warning */}
              {!isEnrolled && coursePrice > 0 ? (
                <div className="mb-5 rounded-2xl border border-amber-100 dark:border-amber-900/30 bg-amber-500/5 p-4 text-xs text-amber-700 dark:text-amber-450">
                  <div className="flex items-start gap-3">
                    <Wallet className="mt-0.5 h-4 w-4 text-amber-600 dark:text-amber-500" strokeWidth={1.5} />
                    <div className="min-w-0 flex-1">
                      <p className="font-bold">Khóa học này sử dụng ví nội bộ</p>
                      <p className="text-amber-800/80 dark:text-amber-500/80 mt-1 leading-relaxed">
                        Nếu số dư chưa đủ, bạn có thể{' '}
                        <Link to="/upgrade" className="font-bold underline text-purple-600 hover:text-purple-750 dark:text-purple-400 dark:hover:text-purple-300">
                          nạp thêm vào ví
                        </Link>{' '}
                        trước khi mua.
                      </p>
                    </div>
                  </div>
                </div>
              ) : null}

              {/* Purchase / Start study buttons */}
              {isImpersonating ? (
                <div className="space-y-4">
                  <div className="flex items-center gap-3 rounded-2xl bg-purple-50 dark:bg-purple-950/20 border border-purple-100/30 dark:border-purple-900/10 p-4 text-purple-700 dark:text-purple-400">
                    <PlayCircle className="h-5 w-5 flex-shrink-0" />
                    <p className="text-xs font-semibold leading-relaxed">Xem toàn bộ khóa học theo giao diện học viên</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => navigate(`/learn/${id}`)}
                    className="group flex w-full items-center justify-center gap-2 rounded-full bg-slate-900 hover:bg-slate-850 dark:bg-slate-800 dark:hover:bg-slate-700 px-6 py-4 font-bold text-white transition-all cursor-pointer shadow-sm hover:scale-[1.01] active:scale-[0.99]"
                  >
                    Xem không gian học tập
                    <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                  </button>
                </div>
              ) : isEnrolled ? (
                <div className="space-y-4">
                  <div className="flex items-center gap-3 rounded-2xl bg-emerald-500/5 border border-emerald-500/10 p-4 text-emerald-600 dark:text-emerald-400">
                    <CheckCircle className="h-5 w-5 flex-shrink-0" />
                    <p className="text-xs font-semibold leading-relaxed">Bạn đã đăng ký khóa học này</p>
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex justify-between text-[10px] font-mono font-bold text-slate-400 dark:text-slate-600">
                      <span>TIẾN ĐỘ HỌC TẬP</span>
                      <span>{progress}%</span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-slate-50 dark:bg-slate-900 border border-slate-100/50 dark:border-slate-800/30">
                      <div
                        className="h-full rounded-full bg-emerald-500 transition-all duration-500"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => navigate(`/learn/${id}`)}
                    className="group flex w-full items-center justify-center gap-2 rounded-full bg-purple-650 hover:bg-purple-750 px-6 py-4 font-bold text-white transition-all cursor-pointer shadow-sm hover:scale-[1.01] active:scale-[0.99]"
                  >
                    Tiếp tục học
                    <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                  </button>
                </div>
              ) : (
                <>
                  {/* Coupon section */}
                  {coursePrice > 0 ? (
                    <div className="mb-4 rounded-2xl border border-slate-100/80 dark:border-slate-900/60 bg-slate-50/40 dark:bg-slate-950/20 p-4">
                      <label htmlFor="coupon-code" className="mb-2 block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                        Mã giảm giá
                      </label>
                      <div className="flex gap-2">
                        <div className="relative flex-1">
                          <Tag className="pointer-events-none absolute left-3.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                          <input
                            id="coupon-code"
                            value={couponCode}
                            onChange={(event) => setCouponCode(event.target.value.toUpperCase())}
                            placeholder="MÃ GIẢM GIÁ"
                            className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 py-2.5 pl-9 pr-9 text-xs font-mono font-bold text-slate-700 dark:text-slate-300 outline-none transition focus:border-purple-400 dark:focus:border-purple-900"
                          />
                          {couponCode ? (
                            <button
                              type="button"
                              onClick={handleRemoveCoupon}
                              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 transition hover:text-slate-600 cursor-pointer"
                              aria-label="Xóa mã giảm giá"
                            >
                              <X className="h-4.5 w-4.5" />
                            </button>
                          ) : null}
                        </div>
                        <button
                          type="button"
                          onClick={handleValidateCoupon}
                          disabled={!couponCode.trim() || validatingCoupon}
                          className="rounded-xl bg-slate-900 dark:bg-slate-800 px-4 py-2.5 text-xs font-bold text-white transition hover:bg-slate-800 dark:hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer active:scale-95"
                        >
                          {validatingCoupon ? 'Kiểm tra...' : 'Áp dụng'}
                        </button>
                      </div>
                      {couponResult ? (
                        <p className={`mt-2 text-[10px] font-semibold ${couponResult.valid ? 'text-emerald-600' : 'text-rose-600'}`}>
                          {couponResult.valid ? 'Áp dụng mã thành công.' : couponResult.error || 'Mã giảm giá không hợp lệ.'}
                        </p>
                      ) : null}
                    </div>
                  ) : null}

                  {/* Enroll button actions */}
                  <div className="space-y-3">
                    <button
                      type="button"
                      onClick={handleEnroll}
                      disabled={enrolling}
                      className="w-full rounded-full bg-purple-650 hover:bg-purple-755 px-6 py-4 font-bold text-white transition-all hover:shadow-lg hover:shadow-purple-500/10 disabled:cursor-not-allowed disabled:opacity-70 cursor-pointer active:scale-[0.99]"
                    >
                      {enrolling
                        ? 'Đang xử lý...'
                        : coursePrice > 0
                          ? couponResult?.valid
                            ? `Mua với ${formatCurrency(couponResult.finalPrice)}`
                            : 'Mua khóa học'
                          : 'Đăng ký học miễn phí'}
                    </button>
                    {hasPreview ? (
                      <button
                        type="button"
                        onClick={() => navigate(`/learn/${id}`)}
                        className="w-full rounded-full border border-purple-200 dark:border-purple-900 bg-white dark:bg-slate-950 px-6 py-4 font-bold text-purple-650 dark:text-purple-400 transition-all hover:bg-purple-50/30 cursor-pointer active:scale-[0.99]"
                      >
                        Học thử
                      </button>
                    ) : null}
                  </div>
                </>
              )}

              {/* Course features checklist list */}
              <div className="mt-8 pt-6 border-t border-slate-100/80 dark:border-slate-900 space-y-4">
                <h3 className="font-bold text-xs text-slate-805 dark:text-slate-200 uppercase tracking-wider">Khóa học bao gồm:</h3>
                <ul className="space-y-3.5 text-xs text-slate-600 dark:text-slate-400 font-medium">
                  <li className="flex items-center gap-3">
                    <BookOpen className="h-4 w-4 text-purple-600 dark:text-purple-400" strokeWidth={1.5} />
                    <span>{totalLessons} bài giảng thực chiến</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <Clock className="h-4 w-4 text-purple-600 dark:text-purple-400" strokeWidth={1.5} />
                    <span>{formatDuration(totalDuration)} nội dung video</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <Users className="h-4 w-4 text-purple-600 dark:text-purple-400" strokeWidth={1.5} />
                    <span>{studentCount} học viên đã tham gia</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <Tag className="h-4 w-4 text-purple-600 dark:text-purple-400" strokeWidth={1.5} />
                    <span>{purchaseCount} lượt mua đã xác nhận</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </aside>
      </div>

      {/* Modal Giảng viên */}
      {teacherOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-955/40 p-4 backdrop-blur-md">
          <div className="relative max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-[2.5rem] bg-white dark:bg-slate-950 p-6 sm:p-8 shadow-2xl border border-slate-150/40 dark:border-slate-850/60 animate-[scaleUp_0.3s_ease-out]">
            <button
              type="button"
              onClick={() => setTeacherOpen(false)}
              className="absolute right-6 top-6 rounded-full p-1.5 text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-900 hover:text-slate-700 dark:hover:text-slate-200 cursor-pointer"
              aria-label="Đóng"
            >
              <X className="h-5 w-5" />
            </button>

            {teacherLoading ? (
              <div className="flex min-h-48 items-center justify-center">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-purple-600 border-t-transparent" />
              </div>
            ) : teacherError ? (
              <div className="rounded-2xl border border-rose-100 bg-rose-50 p-5 text-sm text-rose-700">{teacherError}</div>
            ) : (
              <div className="space-y-6">
                <div className="flex flex-col gap-5 sm:flex-row sm:items-start pt-3">
                  <Avatar src={teacherDetails?.avatar || teacherAvatar} name={teacherDetails?.name || teacherName} size="h-20 w-20" />
                  <div className="min-w-0 flex-1">
                    <p className="text-[10px] font-mono font-bold uppercase tracking-[0.2em] text-purple-605 dark:text-purple-400">Giảng viên chuyên môn</p>
                    <h2 className="mt-1 text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">{teacherDetails?.name || teacherName}</h2>
                    <p className="mt-3.5 text-xs leading-relaxed text-slate-500 dark:text-slate-400 font-medium">
                      {teacherDetails?.bio || 'Giảng viên chưa cập nhật phần giới thiệu công khai.'}
                    </p>
                  </div>
                </div>

                <div className="grid gap-3 grid-cols-2 sm:grid-cols-4">
                  {[
                    { label: 'Chuyên môn', value: teacherDetails?.specialty || 'Chưa cập nhật', icon: Award },
                    { label: 'Khóa học', value: teacherDetails?.courseCount ?? 0, icon: BookOpen },
                    { label: 'Học viên', value: teacherDetails?.studentCount ?? 0, icon: GraduationCap },
                    { label: 'Rating', value: teacherDetails?.averageRating ? teacherDetails.averageRating.toFixed(1) : '--', icon: Star },
                  ].map((stat) => (
                    <div key={stat.label} className="rounded-2xl border border-slate-100 dark:border-slate-900 bg-slate-50/50 dark:bg-slate-900/30 p-4">
                      <stat.icon className="mb-3 h-4 w-4 text-purple-600 dark:text-purple-400" />
                      <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">{stat.label}</p>
                      <p className="mt-1 text-base font-extrabold text-slate-800 dark:text-slate-200 font-mono leading-tight">{stat.value}</p>
                    </div>
                  ))}
                </div>

                <div className="pt-2">
                  <h3 className="mb-4 text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">Khóa học của giảng viên</h3>
                  {(teacherDetails?.courses || []).length > 0 ? (
                    <div className="grid gap-4 sm:grid-cols-2">
                      {teacherDetails.courses.map((item) => (
                        <Link
                          key={item.id}
                          to={`/course/${item.id}`}
                          onClick={() => setTeacherOpen(false)}
                          className="flex gap-3 rounded-2xl border border-slate-100 dark:border-slate-900/80 p-3 bg-white dark:bg-slate-950 hover:border-purple-200/50 dark:hover:border-purple-900/30 hover:shadow-[0_4px_12px_rgba(139,92,246,0.03)] transition duration-300"
                        >
                          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-purple-50 dark:bg-purple-950/20 text-purple-605">
                            <BookOpen className="h-5 w-5" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="truncate font-semibold text-sm text-slate-850 dark:text-slate-200 leading-snug">{item.title}</p>
                            <p className="mt-1 text-[11px] text-slate-400 dark:text-slate-500 font-medium">
                              {formatCurrency(item.price)} · {item.studentCount ?? 0} học viên
                            </p>
                          </div>
                        </Link>
                      ))}
                    </div>
                  ) : (
                    <div className="rounded-2xl border border-dashed border-slate-200 dark:border-slate-855 bg-slate-50/30 dark:bg-slate-955/10 p-6 text-center text-xs text-slate-400 dark:text-slate-650">
                      Chưa có khóa học công khai nào khác.
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
