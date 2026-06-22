import { useEffect, useState, useMemo } from 'react';
import { useParams, useNavigate, useLocation, Link } from 'react-router-dom';
import axios from 'axios';
import {
  ChevronLeft,
  BookOpen,
  Wallet,
  Tag,
  X,
  Loader2,
  ShieldCheck,
  AlertCircle,
  CreditCard,
  CheckCircle,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useSavedCourses } from '../context/SavedCoursesContext';
import { resolveMediaUrl } from '../utils/mediaUrl';

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

export default function Checkout() {
  const { courseId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { user, refreshUser } = useAuth();
  const { removeCourse } = useSavedCourses();

  const [course, setCourse] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [imageError, setImageError] = useState(false);

  // Coupon state
  const [couponCode, setCouponCode] = useState('');
  const [couponResult, setCouponResult] = useState(null);
  const [validatingCoupon, setValidatingCoupon] = useState(false);

  // Purchasing state
  const [purchasing, setPurchasing] = useState(false);
  const [purchaseSuccess, setPurchaseSuccess] = useState(false);

  // Prefill coupon from navigation state if available
  useEffect(() => {
    if (location.state?.couponCode) {
      const initialCode = location.state.couponCode;
      setCouponCode(initialCode);
      // Validate automatically if prefilled
      const autoValidate = async () => {
        setValidatingCoupon(true);
        try {
          const response = await axios.post('/api/coupons/validate', {
            code: initialCode,
            courseId: courseId,
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
      autoValidate();
    }
  }, [location.state?.couponCode, courseId]);

  // Fetch course and refresh user balance
  useEffect(() => {
    const initData = async () => {
      setLoading(true);
      setError(null);
      try {
        const [courseRes] = await Promise.all([
          axios.get(`/api/courses/${courseId}`),
          refreshUser(), // Ensure wallet balance is synchronized
        ]);
        setCourse(courseRes.data);
      } catch (err) {
        setError(err.response?.data?.message || err.message || 'Không thể tải thông tin khóa học.');
      } finally {
        setLoading(false);
      }
    };
    initData();
  }, [courseId, refreshUser]);

  const coursePrice = Number(course?.price ?? course?.gia ?? 0) || 0;
  const rawImage = course?.thumbnail || course?.imageUrl || course?.anhBia || '';
  const courseImageUrl = rawImage ? resolveMediaUrl(rawImage) : '';

  const finalPrice = couponResult?.valid ? couponResult.finalPrice : coursePrice;
  const discountAmount = couponResult?.valid ? couponResult.discountAmount : 0;
  const isBalanceSufficient = (user?.walletBalance ?? 0) >= finalPrice;

  const handleValidateCoupon = async () => {
    if (!couponCode.trim()) return;
    setValidatingCoupon(true);
    setCouponResult(null);
    try {
      const response = await axios.post('/api/coupons/validate', {
        code: couponCode.trim(),
        courseId: courseId,
      });
      setCouponResult(response.data);
    } catch (err) {
      setCouponResult({
        valid: false,
        error: err.response?.data?.error || err.response?.data?.message || err.message || 'Mã giảm giá không hợp lệ',
      });
    } finally {
      setValidatingCoupon(false);
    }
  };

  const handleRemoveCoupon = () => {
    setCouponCode('');
    setCouponResult(null);
  };

  const handlePurchase = async () => {
    if (purchasing) return;
    if (!isBalanceSufficient) {
      alert('Số dư ví không đủ, vui lòng nạp thêm tiền.');
      return;
    }

    setPurchasing(true);
    try {
      // Call create-checkout-session using type course, which deducts balance
      const response = await axios.post('/api/payments/create-checkout-session', {
        type: 'course',
        courseId: courseId,
        couponCode: couponResult?.valid ? couponResult.couponCode : undefined,
      });

      // Synchronize balance and user profile immediately
      await refreshUser();

      // Remove course from cart if saved
      await removeCourse(courseId);

      setPurchaseSuccess(true);

      // Redirect user to the workspace after 2 seconds
      setTimeout(() => {
        navigate(`/learn/${courseId}`);
      }, 1500);
    } catch (err) {
      alert(err.response?.data?.message || err.message || 'Giao dịch thất bại. Vui lòng thử lại.');
    } finally {
      setPurchasing(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4">
        <Loader2 className="h-12 w-12 animate-spin text-purple-650" />
        <p className="text-sm font-medium text-slate-500">Đang chuẩn bị thông tin thanh toán...</p>
      </div>
    );
  }

  if (error || !course) {
    return (
      <div className="mx-auto max-w-md p-8 text-center bg-white rounded-3xl border border-slate-100 shadow-sm my-12">
        <AlertCircle className="h-12 w-12 text-rose-500 mx-auto mb-4" />
        <h2 className="mb-2 text-xl font-bold text-slate-800">Thanh toán không hợp lệ</h2>
        <p className="mb-6 text-sm text-slate-500">{error || 'Không tìm thấy thông tin khóa học.'}</p>
        <button
          type="button"
          onClick={() => navigate('/explore')}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
        >
          <ChevronLeft className="h-4 w-4" />
          Quay lại khám phá
        </button>
      </div>
    );
  }

  if (purchaseSuccess) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center px-4">
        <div className="max-w-md w-full text-center bg-white rounded-3xl border border-slate-100 p-8 shadow-2xl animate-[fadeIn_0.4s_ease-out]">
          <div className="w-20 h-20 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg shadow-purple-200">
            <CheckCircle className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 mb-2">Thanh toán thành công!</h1>
          <p className="text-slate-500 mb-6 text-sm leading-relaxed">
            Cảm ơn bạn đã mua khóa học. Chúng tôi đang chuyển bạn tới không gian học tập...
          </p>
          <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
            <div className="h-full bg-purple-650 rounded-full animate-[loadingProgress_1.5s_ease-in-out_forwards]" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="animate-fade-in-up mx-auto max-w-5xl px-4 py-8 pb-24">
      {/* Back Button */}
      <button
        type="button"
        onClick={() => navigate(`/course/${courseId}`)}
        className="mb-6 inline-flex items-center gap-2 text-sm font-semibold text-slate-500 transition hover:text-slate-900"
      >
        <ChevronLeft className="h-4 w-4" />
        Quay lại chi tiết khóa học
      </button>

      <div className="mb-8">
        <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">Xác nhận thanh toán</h1>
        <p className="mt-1.5 text-sm text-slate-500">
          Vui lòng kiểm tra lại thông tin chi tiết và số dư tài khoản của bạn trước khi thực hiện giao dịch.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
        {/* Left Column: Course Detail Card */}
        <div className="lg:col-span-7 space-y-6">
          <section className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-bold text-slate-900 mb-4 border-b border-slate-50 pb-3 flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-purple-650" />
              Thông tin khóa học
            </h2>

            <div className="flex flex-col sm:flex-row gap-5">
              {/* Course Thumbnail */}
              <div className="relative aspect-[16/10] w-full sm:w-44 shrink-0 overflow-hidden rounded-2xl bg-slate-50 border border-slate-100">
                {courseImageUrl && !imageError ? (
                  <img
                    src={courseImageUrl}
                    alt={course.title}
                    onError={() => setImageError(true)}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full flex-col items-center justify-center bg-gradient-to-tr from-purple-600 to-indigo-700 text-white p-3 text-center">
                    <BookOpen className="h-8 w-8 text-purple-200 mb-1" />
                    <span className="text-[10px] font-semibold tracking-wider uppercase text-purple-250">Skillio</span>
                  </div>
                )}
              </div>

              {/* Course Info text */}
              <div className="flex-1 min-w-0">
                <span className="rounded-full bg-purple-50 px-2.5 py-0.5 text-[11.5px] font-semibold text-purple-750">
                  {course.category || course.danhMuc || 'Chưa phân loại'}
                </span>
                <h3 className="mt-2 text-base font-bold text-slate-900 leading-snug line-clamp-2">
                  {course.title}
                </h3>
                <p className="mt-1 text-sm text-slate-500 font-medium">
                  Giảng viên: <span className="font-semibold text-slate-800">{course.instructor?.name || 'Chưa cập nhật'}</span>
                </p>

                <div className="mt-4 flex flex-wrap items-center gap-4 text-xs text-slate-400 font-medium border-t border-slate-50 pt-3">
                  <span>
                    Tổng số: <span className="text-slate-800 font-semibold">{course.sections?.reduce((acc, s) => acc + (s.lessons?.length || 0), 0) || course.lessons?.length || 0} bài học</span>
                  </span>
                  <span>•</span>
                  <span>
                    Thời lượng: <span className="text-slate-800 font-semibold">{formatDuration(course.totalDurationSeconds || course.durationSeconds)}</span>
                  </span>
                </div>
              </div>
            </div>
          </section>

          {/* Secure purchase banner */}
          <div className="rounded-2xl border border-emerald-100 bg-emerald-50/40 p-4 text-sm text-emerald-800 flex items-start gap-3">
            <ShieldCheck className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">Bảo mật & an toàn giao dịch</p>
              <p className="text-xs text-emerald-700/90 mt-0.5 leading-relaxed">
                Hệ thống sử dụng ví tài khoản nội bộ bảo mật của Skillio. Giao dịch mua sẽ trừ tiền trực tiếp từ số dư ví và mở khóa học vĩnh viễn.
              </p>
            </div>
          </div>
        </div>

        {/* Right Column: Checkout Detail Card */}
        <div className="lg:col-span-5 space-y-6">
          <section className="rounded-3xl border border-slate-100 bg-white p-6 shadow-md shadow-slate-100">
            <h2 className="text-lg font-bold text-slate-900 mb-5 border-b border-slate-50 pb-3 flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-purple-650" />
              Chi tiết thanh toán
            </h2>

            {/* Wallet Info Box */}
            <div className="rounded-2xl border border-slate-100 bg-slate-50/50 p-4.5 mb-5">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2.5">
                  <Wallet className="h-5 w-5 text-purple-600" />
                  <div>
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Số dư ví của bạn</p>
                    <p className="text-sm font-medium text-slate-800">{user?.name || user?.email}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-lg font-extrabold text-slate-900">{formatCurrency(user?.walletBalance || 0)}</p>
                  <span className="text-[10px] font-mono tracking-widest uppercase text-slate-400 bg-slate-200/50 px-1.5 py-0.5 rounded">
                    {user?.memberTier || 'BRONZE'}
                  </span>
                </div>
              </div>
            </div>

            {/* Coupon Code Input */}
            <div className="mb-5">
              <label htmlFor="coupon-code" className="mb-2 block text-xs font-bold text-slate-700 uppercase tracking-wider">
                Mã giảm giá
              </label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Tag className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    id="coupon-code"
                    value={couponCode}
                    onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                    placeholder="NHẬP MÃ GIẢM GIÁ"
                    disabled={purchasing || validatingCoupon || couponResult?.valid}
                    className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-10 text-sm font-semibold uppercase tracking-wider text-slate-700 outline-none transition focus:border-purple-400 focus:ring-4 focus:ring-purple-100 disabled:bg-slate-55 disabled:cursor-not-allowed"
                  />
                  {couponCode && !validatingCoupon && (
                    <button
                      type="button"
                      onClick={handleRemoveCoupon}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 transition hover:text-slate-700"
                      aria-label="Xóa mã giảm giá"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>
                {!couponResult?.valid ? (
                  <button
                    type="button"
                    onClick={handleValidateCoupon}
                    disabled={!couponCode.trim() || validatingCoupon || purchasing}
                    className="rounded-xl bg-slate-900 px-4 py-2.5 text-xs font-bold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {validatingCoupon ? 'Đang duyệt...' : 'Áp dụng'}
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleRemoveCoupon}
                    className="rounded-xl bg-rose-50 border border-rose-200 px-4 py-2.5 text-xs font-bold text-rose-600 transition hover:bg-rose-100"
                  >
                    Hủy
                  </button>
                )}
              </div>
              {couponResult && (
                <p className={`mt-2 text-xs font-semibold ${couponResult.valid ? 'text-emerald-600' : 'text-rose-600'}`}>
                  {couponResult.valid
                    ? `Áp dụng thành công! Giảm ${formatCurrency(couponResult.discountAmount)}`
                    : couponResult.error || 'Mã giảm giá không hợp lệ.'}
                </p>
              )}
            </div>

            {/* Price Breakdown */}
            <div className="border-t border-slate-100 pt-4.5 space-y-3 mb-6">
              <div className="flex justify-between text-sm text-slate-500">
                <span>Học phí khóa học</span>
                <span className="font-semibold text-slate-800">{formatCurrency(coursePrice)}</span>
              </div>
              {discountAmount > 0 && (
                <div className="flex justify-between text-sm text-emerald-600">
                  <span>Mã giảm giá áp dụng</span>
                  <span className="font-semibold">- {formatCurrency(discountAmount)}</span>
                </div>
              )}
              <div className="flex justify-between text-base font-extrabold text-slate-900 border-t border-slate-50 pt-3">
                <span>Tổng số tiền</span>
                <span className="text-xl text-purple-650">{formatCurrency(finalPrice)}</span>
              </div>
            </div>

            {/* Wallet validation warnings */}
            {!isBalanceSufficient && (
              <div className="rounded-2xl border border-rose-100 bg-rose-50 p-4 text-sm text-rose-800 mb-6 flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-rose-600 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="font-bold">Số dư không đủ, vui lòng nạp thêm vào ví</p>
                  <p className="text-xs text-rose-700 mt-1 leading-relaxed">
                    Bạn còn thiếu <span className="font-bold">{formatCurrency(finalPrice - (user?.walletBalance ?? 0))}</span> để thực hiện giao dịch này.
                  </p>
                  <Link
                    to="/upgrade"
                    className="mt-3.5 inline-flex items-center justify-center rounded-xl bg-rose-600 text-white font-bold text-xs px-4.5 py-2 transition hover:bg-rose-700 hover:shadow-md hover:shadow-rose-100"
                  >
                    Nạp thêm tiền ngay
                  </Link>
                </div>
              </div>
            )}

            {/* Action purchase button */}
            <button
              type="button"
              onClick={handlePurchase}
              disabled={purchasing || !isBalanceSufficient}
              className="w-full rounded-2xl bg-purple-600 px-6 py-4 font-bold text-white transition-all hover:bg-purple-700 hover:shadow-lg hover:shadow-purple-200 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:shadow-none"
            >
              {purchasing ? (
                <span className="flex items-center justify-center gap-2">
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Đang xử lý giao dịch...
                </span>
              ) : (
                'Xác nhận mua khóa học'
              )}
            </button>

            <p className="mt-4 text-center text-[10.5px] text-slate-400 font-medium">
              Bằng việc hoàn tất thanh toán, bạn đồng ý với các chính sách & điều khoản của Skillio.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
