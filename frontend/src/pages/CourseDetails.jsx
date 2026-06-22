import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';
import {
  ArrowLeft,
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

// Extract all course images from either images[] or courseImages[] arrays
const getAllCourseImages = (course) => {
  const list = course?.courseImages || course?.images || [];
  if (list.length > 0) return list.map((img) => img?.url || img?.imageUrl || img?.AnhUrl || img || '');
  const single = getCourseImage(course);
  return single ? [single] : [];
};

const sanitizeRichText = (html = '') => {
  if (!html) return '';
  const template = document.createElement('template');
  template.innerHTML = html;
  const allowed = new Set(['P', 'BR', 'STRONG', 'B', 'EM', 'I', 'UL', 'OL', 'LI', 'H3', 'H4', 'A']);

  template.content.querySelectorAll('*').forEach((node) => {
    if (!allowed.has(node.tagName)) {
      node.replaceWith(...Array.from(node.childNodes));
      return;
    }

    Array.from(node.attributes).forEach((attribute) => {
      const keepHref = node.tagName === 'A' && attribute.name === 'href';
      if (!keepHref) node.removeAttribute(attribute.name);
    });

    if (node.tagName === 'A') {
      const href = node.getAttribute('href') || '#';
      if (/^\s*javascript:/i.test(href)) node.setAttribute('href', '#');
      node.setAttribute('target', '_blank');
      node.setAttribute('rel', 'noopener noreferrer');
    }
  });

  return template.innerHTML;
};

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
        className={interactive ? 'transition-transform hover:scale-110' : 'cursor-default'}
        aria-label={`${star} sao`}
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

const Avatar = ({ src, name, size = 'h-12 w-12' }) => {
  const imageUrl = resolveMediaUrl(src);
  if (imageUrl) {
    return <img src={imageUrl} alt={name || 'Giảng viên'} className={`${size} rounded-full object-cover`} />;
  }

  return (
    <div className={`${size} flex items-center justify-center rounded-full bg-purple-100 text-lg font-bold text-purple-700`}>
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
  const [activeImageIndex, setActiveImageIndex] = useState(0);
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
  const allCourseImages = useMemo(() => getAllCourseImages(course), [course]);
  const courseImageUrl = useMemo(
    () => resolveMediaUrl(allCourseImages[activeImageIndex] || getCourseImage(course)),
    [allCourseImages, activeImageIndex, course]
  );

  // Reset carousel when course changes (not when navigating images)
  useEffect(() => {
    setImageError(false);
    setActiveImageIndex(0);
  }, [course?.id]);

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
  const richDescription = sanitizeRichText(course?.description || course?.moTa || '');
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
    if (!user) {
      navigate('/login', { state: { from: `/course/${id}` } });
      return;
    }

    if (isImpersonating) {
      window.alert('Chế độ xem thử chỉ mô phỏng trải nghiệm sinh viên và không phát sinh đăng ký hoặc giao dịch.');
      return;
    }

    if (coursePrice > 0) {
      navigate(`/checkout/${id}`, { state: { couponCode: couponResult?.valid ? couponResult.couponCode : '' } });
      return;
    }

    setEnrolling(true);
    try {
      await axios.post(`/api/courses/${id}/enroll`);
      setCourse((prev) => ({
        ...prev,
        isEnrolled: true,
        progress: 0,
        canReview: false,
        studentCount: getStudentCount(prev) + 1,
      }));
    } catch (err) {
      window.alert(err.response?.data?.message || err.message);
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
          className="inline-flex items-center gap-2 text-purple-600 hover:underline"
        >
          <ChevronLeft className="h-4 w-4" />
          Quay lại khám phá
        </button>
      </div>
    );
  }

  return (
    <div className="animate-fade-in-up mx-auto max-w-6xl pb-24">
      <button
        type="button"
        onClick={() => navigate('/explore')}
        className="mb-6 inline-flex items-center gap-2 text-sm text-slate-500 transition-colors hover:text-slate-900"
      >
        <ChevronLeft className="h-4 w-4" />
        Quay lại
      </button>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        <div className="space-y-8 lg:col-span-2">
          <section className="rounded-3xl border border-slate-100 bg-white p-8 shadow-sm">
            <div className="mb-8 overflow-hidden rounded-2xl bg-slate-100">
              {/* Main image display */}
              <div className="relative flex aspect-video items-center justify-center">
                {courseImageUrl && !imageError ? (
                  <img
                    src={courseImageUrl}
                    alt={course.title || 'Ảnh khóa học'}
                    onError={() => setImageError(true)}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full flex-col items-center justify-center bg-gradient-to-tr from-purple-600 to-indigo-700 text-white p-6 text-center select-none">
                    <BookOpen className="h-16 w-16 text-purple-200 mb-4 animate-pulse" />
                    <h3 className="text-xl font-bold tracking-tight line-clamp-2 max-w-md">{course.title}</h3>
                    <span className="mt-2 text-xs font-medium tracking-wider uppercase text-purple-200">Skillio Academy</span>
                  </div>
                )}
                {/* Prev / Next arrows — only shown when there are multiple images */}
                {allCourseImages.length > 1 && (
                  <>
                    <button
                      type="button"
                      aria-label="Ảnh trước"
                      onClick={() => setActiveImageIndex((prev) => (prev - 1 + allCourseImages.length) % allCourseImages.length)}
                      className="absolute left-3 top-1/2 -translate-y-1/2 flex h-9 w-9 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur-sm transition hover:bg-black/60"
                    >
                      <ArrowLeft className="h-5 w-5" />
                    </button>
                    <button
                      type="button"
                      aria-label="Ảnh tiếp"
                      onClick={() => setActiveImageIndex((prev) => (prev + 1) % allCourseImages.length)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 flex h-9 w-9 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur-sm transition hover:bg-black/60"
                    >
                      <ArrowRight className="h-5 w-5" />
                    </button>
                  </>
                )}
              </div>

              {/* Thumbnail strip — only shown when there are multiple images */}
              {allCourseImages.length > 1 && (
                <div className="flex gap-2 p-3 overflow-x-auto">
                  {allCourseImages.map((imgUrl, idx) => {
                    const resolved = resolveMediaUrl(imgUrl);
                    return (
                      <button
                        key={idx}
                        type="button"
                        aria-label={`Xem ảnh ${idx + 1}`}
                        onClick={() => { setActiveImageIndex(idx); setImageError(false); }}
                        className={`relative flex-shrink-0 h-16 w-24 overflow-hidden rounded-lg border-2 transition ${
                          idx === activeImageIndex ? 'border-purple-500 ring-2 ring-purple-200' : 'border-transparent opacity-60 hover:opacity-100'
                        }`}
                      >
                        {resolved ? (
                          <img src={resolved} alt={`Ảnh ${idx + 1}`} className="h-full w-full object-cover" />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-purple-500 to-indigo-600">
                            <BookOpen className="h-5 w-5 text-white" />
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="mb-4 flex flex-wrap items-center gap-3">
              <span className="rounded-full bg-purple-50 px-3 py-1 text-xs font-semibold text-purple-700">
                {category}
              </span>
              <span className="flex items-center gap-1 text-sm font-medium text-amber-500">
                <Star className="h-4 w-4 fill-current" />
                {reviewCount > 0 ? `${averageRating.toFixed(1)} · ${reviewCount} đánh giá` : 'Chưa có đánh giá'}
              </span>
              <span className="flex items-center gap-1 text-sm text-slate-500">
                <Users className="h-4 w-4" />
                {studentCount} học viên
              </span>
              <span className="flex items-center gap-1 text-sm text-slate-500">
                <Clock className="h-4 w-4" />
                {formatDuration(totalDuration)}
              </span>
            </div>

            <h1 className="mb-4 text-3xl font-bold leading-tight text-slate-900 sm:text-4xl">{course.title}</h1>
            {richDescription ? (
              <div
                className="rich-text-content mb-6 text-lg leading-relaxed text-slate-600"
                dangerouslySetInnerHTML={{ __html: richDescription }}
              />
            ) : (
              <p className="mb-6 text-lg leading-relaxed text-slate-600">{description}</p>
            )}
            {detailedDescription ? <p className="mb-6 leading-relaxed text-slate-500">{detailedDescription}</p> : null}

            <div className="grid gap-3 border-t border-slate-100 py-5 sm:grid-cols-2">
              <div className="flex items-center gap-3 rounded-2xl bg-slate-50 p-4">
                <CalendarDays className="h-5 w-5 text-purple-600" />
                <div>
                  <p className="text-xs font-medium text-slate-500">Bắt đầu</p>
                  <p className="font-semibold text-slate-900">{formatDate(course.startDate)}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 rounded-2xl bg-slate-50 p-4">
                <CalendarDays className="h-5 w-5 text-purple-600" />
                <div>
                  <p className="text-xs font-medium text-slate-500">Kết thúc</p>
                  <p className="font-semibold text-slate-900">{formatDate(course.endDate)}</p>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={openTeacherDetails}
              className="flex w-full items-center gap-4 border-t border-slate-100 pt-5 text-left transition hover:opacity-80"
            >
              <Avatar src={teacherAvatar} name={teacherName} />
              <div>
                <p className="text-sm text-slate-500">Giảng viên</p>
                <p className="font-semibold text-slate-900">{teacherName}</p>
              </div>
            </button>
          </section>

          <section className="rounded-3xl border border-slate-100 bg-white p-8 shadow-sm">
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
                      {section.description ? <p className="mt-1 text-sm text-slate-500">{section.description}</p> : null}
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
                                  <span className="rounded-full bg-emerald-50 px-2 py-1 text-emerald-600">Học thử</span>
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
          </section>

          <section className="rounded-3xl border border-slate-100 bg-white p-8 shadow-sm">
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
                <p className="text-2xl font-bold text-amber-500">{reviewCount > 0 ? averageRating.toFixed(1) : '--'}</p>
                <ReviewStars value={Math.round(averageRating)} />
              </div>
            </div>

            {isEnrolled && progress >= 100 && !isInstructor ? (
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
                    disabled={submittingReview || reviewRating === 0}
                    className="rounded-xl bg-purple-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-purple-700 disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {submittingReview ? 'Đang lưu...' : course.userReview ? 'Cập nhật đánh giá' : 'Gửi đánh giá'}
                  </button>
                </div>
              </div>
            ) : !isInstructor ? (
              <div className="mb-6 rounded-2xl border border-slate-100 bg-slate-50 p-5 text-center text-slate-500">
                {!isEnrolled ? (
                  <p className="font-medium text-slate-600">Bạn cần mua khóa học để đánh giá</p>
                ) : (
                  <div className="space-y-2">
                    <p className="font-medium text-slate-600">Hoàn thành khóa học để có thể đánh giá</p>
                    <div className="mx-auto max-w-xs">
                      <div className="flex justify-between text-xs font-medium text-slate-400 mb-1">
                        <span>Tiến độ hiện tại</span>
                        <span>{progress}%</span>
                      </div>
                      <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-200">
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

            <div className="space-y-4">
              {(course.reviews || []).length > 0 ? (
                course.reviews.map((review) => (
                  <div key={review.id} className="rounded-2xl border border-slate-100 p-4">
                    <div className="mb-2 flex items-center justify-between gap-4">
                      <div>
                        <p className="font-semibold text-slate-900">{review.user?.name || 'Học viên'}</p>
                        <p className="text-xs text-slate-400">{formatDate(review.createdAt, '')}</p>
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
          </section>
        </div>

        <aside className="lg:col-span-1">
          <div className="sticky top-6 rounded-3xl border border-slate-100 bg-white p-6 shadow-xl shadow-slate-200/50">
            <div className="mb-6 text-center">
              {couponResult?.valid ? (
                <div>
                  <span className="text-lg text-slate-400 line-through">{formatCurrency(coursePrice)}</span>
                  <span className="ml-2 text-3xl font-bold text-purple-600">{formatCurrency(couponResult.finalPrice)}</span>
                  <div className="mt-2 inline-flex items-center gap-1 rounded-full bg-green-50 px-3 py-1 text-xs font-semibold text-green-700">
                    <Tag className="h-3 w-3" />
                    Giảm {formatCurrency(couponResult.discountAmount)}
                  </div>
                </div>
              ) : (
                <span className="text-3xl font-bold text-slate-900">
                  {coursePrice > 0 ? formatCurrency(coursePrice) : 'Miễn phí'}
                </span>
              )}
            </div>

            {!isEnrolled && coursePrice > 0 ? (
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

            {isImpersonating ? (
              <div className="space-y-4">
                <div className="flex items-center gap-3 rounded-2xl bg-purple-50 p-4 text-purple-700">
                  <PlayCircle className="h-6 w-6 flex-shrink-0" />
                  <p className="text-sm font-medium">Xem toàn bộ khóa học theo giao diện học viên</p>
                </div>
                <button
                  type="button"
                  onClick={() => navigate(`/learn/${id}`)}
                  className="group flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-900 px-6 py-4 font-semibold text-white transition-colors hover:bg-slate-800"
                >
                  Xem không gian học tập
                  <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
                </button>
              </div>
            ) : isEnrolled ? (
              <div className="space-y-4">
                <div className="flex items-center gap-3 rounded-2xl bg-green-50 p-4 text-green-700">
                  <CheckCircle className="h-6 w-6 flex-shrink-0" />
                  <p className="text-sm font-medium">Bạn đã đăng ký khóa học này</p>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between text-xs font-medium text-slate-500">
                    <span>Tiến độ học tập</span>
                    <span>{progress}%</span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
                    <div
                      className="h-full rounded-full bg-green-500 transition-all duration-500"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => navigate(`/learn/${id}`)}
                  className="group flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-900 px-6 py-4 font-semibold text-white transition-colors hover:bg-slate-800"
                >
                  Vào học
                  <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
                </button>
              </div>
            ) : (
              <>
                {coursePrice > 0 ? (
                  <div className="mb-4 rounded-2xl border border-slate-100 bg-slate-50 p-4">
                    <label htmlFor="coupon-code" className="mb-2 block text-sm font-semibold text-slate-700">
                      Mã giảm giá
                    </label>
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <Tag className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                        <input
                          id="coupon-code"
                          value={couponCode}
                          onChange={(event) => setCouponCode(event.target.value.toUpperCase())}
                          placeholder="Nhập mã giảm giá"
                          className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-10 pr-10 text-sm font-medium text-slate-700 outline-none transition focus:border-purple-400 focus:ring-4 focus:ring-purple-100"
                        />
                        {couponCode ? (
                          <button
                            type="button"
                            onClick={handleRemoveCoupon}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 transition hover:text-slate-700"
                            aria-label="Xóa mã giảm giá"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        ) : null}
                      </div>
                      <button
                        type="button"
                        onClick={handleValidateCoupon}
                        disabled={!couponCode.trim() || validatingCoupon}
                        className="rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {validatingCoupon ? 'Đang kiểm tra' : 'Áp dụng'}
                      </button>
                    </div>
                    {couponResult ? (
                      <p className={`mt-2 text-xs font-medium ${couponResult.valid ? 'text-emerald-600' : 'text-rose-600'}`}>
                        {couponResult.valid ? 'Mã giảm giá hợp lệ.' : couponResult.error || 'Mã giảm giá không hợp lệ.'}
                      </p>
                    ) : null}
                  </div>
                ) : null}

                <div className="space-y-3">
                  <button
                    type="button"
                    onClick={handleEnroll}
                    disabled={enrolling}
                    className="w-full rounded-2xl bg-purple-600 px-6 py-4 font-semibold text-white transition-all hover:bg-purple-700 hover:shadow-lg hover:shadow-purple-200 disabled:cursor-not-allowed disabled:opacity-70"
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
                      className="w-full rounded-2xl border-2 border-purple-600 bg-white px-6 py-4 font-semibold text-purple-600 transition-all hover:bg-purple-50"
                    >
                      Học thử
                    </button>
                  ) : null}
                </div>
              </>
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
                  <span>{formatDuration(totalDuration)} nội dung video</span>
                </li>
                <li className="flex items-center gap-3">
                  <Users className="h-4 w-4 text-purple-600" />
                  <span>{studentCount} học viên đã tham gia</span>
                </li>
                <li className="flex items-center gap-3">
                  <Tag className="h-4 w-4 text-purple-600" />
                  <span>{purchaseCount} lượt mua hợp lệ</span>
                </li>
              </ul>
            </div>
          </div>
        </aside>
      </div>

      {teacherOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/45 p-4 backdrop-blur-sm">
          <div className="relative max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl">
            <button
              type="button"
              onClick={() => setTeacherOpen(false)}
              className="absolute right-4 top-4 rounded-full p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
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
                <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
                  <Avatar src={teacherDetails?.avatar || teacherAvatar} name={teacherDetails?.name || teacherName} size="h-20 w-20" />
                  <div>
                    <p className="text-sm font-semibold uppercase tracking-[0.18em] text-purple-500">Giảng viên Skillio</p>
                    <h2 className="mt-1 text-2xl font-bold text-slate-900">{teacherDetails?.name || teacherName}</h2>
                    <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-500">
                      {teacherDetails?.bio || 'Giảng viên chưa cập nhật phần giới thiệu công khai.'}
                    </p>
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-4">
                  {[
                    { label: 'Chuyên môn', value: teacherDetails?.specialty || 'Chưa cập nhật', icon: Award },
                    { label: 'Khóa học', value: teacherDetails?.courseCount ?? 0, icon: BookOpen },
                    { label: 'Học viên', value: teacherDetails?.studentCount ?? 0, icon: GraduationCap },
                    { label: 'Rating', value: teacherDetails?.averageRating ? teacherDetails.averageRating.toFixed(1) : '--', icon: Star },
                  ].map((stat) => (
                    <div key={stat.label} className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                      <stat.icon className="mb-3 h-5 w-5 text-purple-600" />
                      <p className="text-xs font-medium text-slate-500">{stat.label}</p>
                      <p className="mt-1 text-lg font-bold text-slate-900">{stat.value}</p>
                    </div>
                  ))}
                </div>

                <div>
                  <h3 className="mb-3 text-lg font-bold text-slate-900">Khóa học của giảng viên</h3>
                  {(teacherDetails?.courses || []).length > 0 ? (
                    <div className="grid gap-3 sm:grid-cols-2">
                      {teacherDetails.courses.map((item) => (
                        <Link
                          key={item.id}
                          to={`/course/${item.id}`}
                          onClick={() => setTeacherOpen(false)}
                          className="flex gap-3 rounded-2xl border border-slate-100 p-3 transition hover:border-purple-200 hover:bg-purple-50"
                        >
                          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-white text-purple-600">
                            <UserRound className="h-5 w-5" />
                          </div>
                          <div className="min-w-0">
                            <p className="truncate font-semibold text-slate-900">{item.title}</p>
                            <p className="mt-1 text-xs text-slate-500">
                              {formatCurrency(item.price)} · {item.studentCount ?? 0} học viên
                            </p>
                          </div>
                        </Link>
                      ))}
                    </div>
                  ) : (
                    <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-6 text-center text-sm text-slate-500">
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
