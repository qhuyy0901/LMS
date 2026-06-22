import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  BookOpen,
  Plus,
  RefreshCw,
  Star,
  Trophy,
  Users,
  Wallet,
} from 'lucide-react';
import { getInstructorDashboard } from '../api/instructorDashboardApi';
import { getFileUrl } from '../utils/fileUtils';

const numberFormatter = new Intl.NumberFormat('vi-VN');

const formatCurrency = (value) => `${numberFormatter.format(Number(value || 0))} đ`;
const formatNumber = (value) => numberFormatter.format(Number(value || 0));
const formatDate = (value) => {
  if (!value) return 'Chưa có ngày';
  return new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(new Date(value));
};

const statusLabel = (status) => {
  const normalized = String(status || '').toUpperCase();
  if (normalized === 'HIDDEN') return 'Đã ẩn';
  if (normalized === 'PUBLIC' || normalized === 'PUBLISHED') return 'Đã xuất bản';
  return 'Bản nháp';
};

const Avatar = ({ name = '' }) => {
  const charCode = name.charCodeAt(0) || 65;
  const gradients = [
    'from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-700 text-slate-700 dark:text-slate-300',
    'from-purple-100 to-purple-200 dark:from-purple-950 dark:to-purple-900 text-purple-700 dark:text-purple-300',
    'from-emerald-100 to-emerald-200 dark:from-emerald-950 dark:to-emerald-900 text-emerald-700 dark:text-emerald-300',
    'from-blue-100 to-blue-200 dark:from-blue-950 dark:to-blue-900 text-blue-700 dark:text-blue-300',
    'from-rose-100 to-rose-200 dark:from-rose-950 dark:to-rose-900 text-rose-700 dark:text-rose-300',
  ];
  const gradientClass = gradients[charCode % gradients.length];
  
  return (
    <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br font-bold border border-slate-100/50 dark:border-slate-800/30 ${gradientClass} transition-transform duration-500 hover:scale-105 shadow-[0_2px_8px_rgba(0,0,0,0.015)]`}>
      {(name || 'A').trim().charAt(0).toUpperCase()}
    </div>
  );
};

const StatCard = ({ label, value, icon: Icon, color, bg, className = '' }) => {
  return (
    <div className={`group rounded-[2rem] p-1 bg-slate-100/50 dark:bg-slate-900/40 border border-slate-100/60 dark:border-slate-800/60 transition-all duration-500 hover:border-slate-200 dark:hover:border-slate-700/80 ${className}`}>
      <div className="h-full bg-white dark:bg-slate-950 border border-slate-50/50 dark:border-slate-900/50 rounded-[calc(2rem-0.25rem)] shadow-[0_8px_30px_rgb(0,0,0,0.005)] p-5 flex flex-col justify-between min-h-[140px] transition-all duration-300 group-hover:shadow-[0_12px_40px_rgba(0,0,0,0.02)]">
        <div className="flex items-start justify-between">
          <span className="text-sm font-medium text-slate-400 dark:text-slate-500 transition-colors group-hover:text-slate-500 dark:group-hover:text-slate-400">
            {label}
          </span>
          <div className={`flex h-9 w-9 items-center justify-center rounded-xl transition-all duration-500 group-hover:scale-105 ${bg}`}>
            <Icon className={`h-4.5 w-4.5 ${color}`} />
          </div>
        </div>
        <div className="mt-4">
          <span className="text-2xl font-black text-slate-800 dark:text-slate-100 tracking-tight font-mono tabular-nums">
            {value}
          </span>
        </div>
      </div>
    </div>
  );
};

const RevenueStatCard = ({ label, value, icon: Icon, color, bg, className = '' }) => {
  return (
    <div className={`group rounded-[2rem] p-1.5 bg-slate-100/50 dark:bg-slate-900/40 border border-slate-100/60 dark:border-slate-800/60 transition-all duration-500 hover:border-slate-200 dark:hover:border-slate-700/80 ${className}`}>
      <div className="h-full bg-white dark:bg-slate-950 border border-slate-50/50 dark:border-slate-900/50 rounded-[calc(2rem-0.375rem)] shadow-[0_8px_30px_rgb(0,0,0,0.005)] p-6 flex flex-col justify-between md:flex-row md:items-center transition-all duration-300 group-hover:shadow-[0_12px_40px_rgba(0,0,0,0.02)]">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="text-xs uppercase tracking-widest font-mono text-emerald-600 dark:text-emerald-500 font-bold bg-emerald-50 dark:bg-emerald-950/30 px-2.5 py-0.5 rounded-full">
              Thu nhập
            </span>
          </div>
          <p className="text-sm font-medium text-slate-400 dark:text-slate-500">{label}</p>
          <p className="text-3xl font-black text-slate-850 dark:text-slate-100 tracking-tight font-mono tabular-nums pt-1">
            {value}
          </p>
        </div>
        <div className="mt-4 md:mt-0 flex flex-col items-end justify-between h-full">
          <div className={`flex h-12 w-12 items-center justify-center rounded-2xl ${bg} group-hover:scale-105 transition-transform duration-500`}>
            <Icon className={`h-6 w-6 ${color}`} />
          </div>
          <span className="mt-4 text-xs text-slate-400 dark:text-slate-500 flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 dark:bg-emerald-400 animate-pulse" />
            Cập nhật trực tiếp
          </span>
        </div>
      </div>
    </div>
  );
};

const RatingStatCard = ({ label, value, icon: Icon, color, bg, className = '', rawRating }) => {
  const hasRating = rawRating != null;
  return (
    <div className={`group rounded-[2rem] p-1 bg-slate-100/50 dark:bg-slate-900/40 border border-slate-100/60 dark:border-slate-800/60 transition-all duration-500 hover:border-slate-200 dark:hover:border-slate-700/80 ${className}`}>
      <div className="h-full bg-white dark:bg-slate-950 border border-slate-50/50 dark:border-slate-900/50 rounded-[calc(2rem-0.25rem)] shadow-[0_8px_30px_rgb(0,0,0,0.005)] p-5 flex flex-col justify-between min-h-[140px] transition-all duration-300 group-hover:shadow-[0_12px_40px_rgba(0,0,0,0.02)]">
        <div className="flex items-start justify-between">
          <span className="text-sm font-medium text-slate-400 dark:text-slate-500">
            {label}
          </span>
          <div className={`flex h-9 w-9 items-center justify-center rounded-xl ${bg} group-hover:scale-105 transition-transform duration-500`}>
            <Icon className={`h-4.5 w-4.5 ${color}`} />
          </div>
        </div>
        <div className="mt-4 flex items-baseline gap-2">
          <span className="text-2xl font-black text-slate-850 dark:text-slate-100 tracking-tight font-mono">
            {value}
          </span>
          {hasRating && (
            <div className="flex items-center gap-0.5 pb-1">
              <Star className="h-4 w-4 text-amber-500 fill-amber-500" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const BestSellerCard = ({ course, navigate }) => {
  const [imageError, setImageError] = useState(false);
  const courseTitle = course?.title || course?.tenKhoaHoc || 'Chưa có';
  const showImage = (course?.thumbnail || course?.anhBia) && !imageError;
  const isFree = Number(course?.price ?? course?.gia ?? 0) === 0;

  return (
    <div className="group rounded-[2rem] p-1.5 bg-slate-100/50 dark:bg-slate-900/40 border border-slate-100/60 dark:border-slate-800/60 transition-all duration-500 hover:border-slate-200 dark:hover:border-slate-700/80 md:col-span-3">
      <div className="bg-white dark:bg-slate-950 border border-slate-50/50 dark:border-slate-900/50 rounded-[calc(2rem-0.375rem)] p-6 shadow-[0_8px_30px_rgb(0,0,0,0.005)] transition-all duration-300 group-hover:shadow-[0_12px_40px_rgba(0,0,0,0.02)]">
        <div className="flex flex-col gap-6 md:flex-row md:items-center justify-between">
          <div className="flex flex-1 items-start gap-4 min-w-0">
            <div className="relative h-20 w-32 shrink-0 overflow-hidden rounded-2xl bg-gradient-to-br from-purple-100 to-indigo-150 dark:from-purple-950/35 dark:to-indigo-950/30 border border-slate-100 dark:border-slate-900">
              {showImage ? (
                <img
                  src={getFileUrl(course.thumbnail || course.anhBia)}
                  alt={courseTitle}
                  onError={() => setImageError(true)}
                  className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-700 ease-out"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center">
                  <BookOpen className="h-7 w-7 text-purple-400 dark:text-purple-650" />
                </div>
              )}
            </div>
            <div className="min-w-0 flex-1 space-y-1.5">
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-rose-600 dark:text-rose-450 bg-rose-50 dark:bg-rose-950/30 px-2.5 py-0.5 rounded-full">
                  <Trophy className="h-3 w-3 fill-rose-600 dark:fill-rose-450 stroke-none" />
                  Bán chạy nhất
                </span>
                {course?.rating && (
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-600 dark:text-amber-450 bg-amber-50 dark:bg-amber-950/30 px-2.5 py-0.5 rounded-full">
                    <Star className="h-3 w-3 fill-amber-500 dark:fill-amber-450 stroke-none" />
                    {course.rating}
                  </span>
                )}
              </div>
              <h3 className="line-clamp-1 font-bold text-slate-800 dark:text-slate-200 group-hover:text-purple-650 dark:group-hover:text-purple-450 transition-colors text-lg tracking-tight">
                {courseTitle}
              </h3>
              <p className="line-clamp-1 text-sm text-slate-400 dark:text-slate-500">
                {course?.moTaNgan || course?.description || 'Khóa học được học viên đăng ký nhiều nhất.'}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-6 border-t border-slate-100 dark:border-slate-900 pt-4 md:border-t-0 md:pt-0">
            <div className="min-w-[80px]">
              <p className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Học viên</p>
              <p className="text-lg font-black text-slate-850 dark:text-slate-100 font-mono tracking-tight mt-0.5 tabular-nums">
                {formatNumber(course?.studentCount ?? course?.hocVien)}
              </p>
            </div>
            <div className="min-w-[100px]">
              <p className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Doanh thu</p>
              <p className="text-lg font-black text-slate-850 dark:text-slate-100 font-mono tracking-tight mt-0.5 tabular-nums">
                {isFree ? 'Miễn phí' : formatCurrency(course?.revenue ?? course?.doanhThu)}
              </p>
            </div>
            <button
              onClick={() => navigate(`/instructor/courses/${course.id}/edit`)}
              className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-slate-50 hover:bg-slate-100 dark:bg-slate-900 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-850 px-4 py-2.5 text-sm font-semibold text-slate-700 dark:text-slate-300 transition-all duration-300 active:scale-[0.98] cursor-pointer"
            >
              Chỉnh sửa
              <ArrowRight className="h-4 w-4 transition-transform duration-350 group-hover:translate-x-1" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const CourseRow = ({ course, onClick, index }) => {
  const isFree = Number(course.gia ?? course.price ?? 0) === 0;
  const isPublished = Boolean(course.daXuatBan || course.isPublished);
  const courseTitle = course.tenKhoaHoc || course.title;
  const [imageError, setImageError] = useState(false);
  const showImage = (course.anhBia || course.thumbnail) && !imageError;

  return (
    <button
      onClick={onClick}
      style={{ '--index': index }}
      className="grid w-full gap-4 p-5 text-left transition-all duration-500 hover:bg-slate-50/60 dark:hover:bg-slate-900/40 md:grid-cols-[1.3fr_0.7fr_1fr] md:items-center active:scale-[0.99] border-none outline-none group cursor-pointer animate-fade-in-up"
    >
      <div className="flex items-center gap-4">
        <div className="relative h-14 w-20 shrink-0 overflow-hidden rounded-xl bg-gradient-to-br from-purple-100 to-indigo-150 dark:from-purple-950/40 dark:to-indigo-950/40 border border-slate-100 dark:border-slate-900">
          {showImage ? (
            <img
              src={getFileUrl(course.anhBia || course.thumbnail)}
              alt={courseTitle}
              onError={() => setImageError(true)}
              className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-500"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center">
              <BookOpen className="h-5 w-5 text-purple-500 dark:text-purple-650" />
            </div>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="line-clamp-1 font-bold text-slate-800 dark:text-slate-200 group-hover:text-purple-650 dark:group-hover:text-purple-400 transition-colors text-sm tracking-tight">
            {courseTitle}
          </p>
          <p className="mt-1 line-clamp-1 text-xs text-slate-400 dark:text-slate-500">
            {course.moTaNgan || course.description || 'Chưa có mô tả ngắn.'}
          </p>
        </div>
      </div>
      
      <div className="text-xs text-slate-500 dark:text-slate-400">
        <p className="font-bold text-slate-850 dark:text-slate-200 font-mono text-sm tracking-tight">
          {isFree ? 'Miễn phí' : formatCurrency(course.gia ?? course.price)}
        </p>
        <div className="mt-1">
          {isPublished ? (
            <span className="inline-flex items-center gap-1.5 text-[10px] font-bold text-emerald-600 dark:text-emerald-450 bg-emerald-50 dark:bg-emerald-950/30 px-2 py-0.5 rounded-md">
              <span className="h-1 w-1 rounded-full bg-emerald-500 dark:bg-emerald-450" />
              Đã xuất bản
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 text-[10px] font-bold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-900 px-2 py-0.5 rounded-md">
              <span className="h-1 w-1 rounded-full bg-slate-400 dark:bg-slate-500" />
              {statusLabel(course.trangThai || course.status)}
            </span>
          )}
        </div>
      </div>
      
      <div className="grid grid-cols-3 gap-3 text-center text-xs text-slate-400 dark:text-slate-500">
        <Metric label="Chương" value={course.chuong ?? course.sectionCount} />
        <Metric label="Bài học" value={course.baiHoc ?? course.lessonCount} />
        <Metric label="Học viên" value={course.hocVien ?? course.studentCount} />
      </div>
    </button>
  );
};

const StudentRow = ({ student, index }) => {
  return (
    <div
      style={{ '--index': index }}
      className="flex items-start gap-4 p-4 transition-all duration-500 hover:bg-slate-50/60 dark:hover:bg-slate-900/30 rounded-2xl animate-fade-in-up"
    >
      <Avatar name={student.tenHocVien} />
      <div className="min-w-0 flex-1 space-y-1">
        <div className="flex items-center justify-between gap-2">
          <p className="truncate font-bold text-slate-800 dark:text-slate-200 text-sm tracking-tight">
            {student.tenHocVien}
          </p>
          <span className="shrink-0 text-[10px] font-semibold text-slate-450 dark:text-slate-500 font-mono">
            {formatDate(student.ngayDangKy)}
          </span>
        </div>
        <p className="truncate text-xs text-purple-650 dark:text-purple-400 font-semibold bg-purple-50/50 dark:bg-purple-950/20 px-2 py-0.5 rounded w-max">
          {student.tenKhoaHoc}
        </p>
        <div className="flex items-center justify-between text-xs text-slate-400 dark:text-slate-500 pt-1">
          <span className="truncate max-w-[180px] font-mono text-[11px]">{student.emailHocVien || 'Chưa có email'}</span>
          <div className="flex flex-col items-end gap-1 shrink-0">
            <span className="font-bold text-slate-700 dark:text-slate-350 font-mono text-[10.5px]">
              Tiến độ: {student.tienDo}%
            </span>
            <div className="w-20 bg-slate-100 dark:bg-slate-800 h-1 rounded-full overflow-hidden">
              <div
                className="bg-purple-500 dark:bg-purple-650 h-full rounded-full transition-all duration-500"
                style={{ width: `${student.tienDo}%` }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const HeaderActions = ({ navigate }) => (
  <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-slate-100 dark:border-slate-800 pb-5">
    <div>
      <h1 className="text-3xl font-extrabold text-slate-850 dark:text-slate-50 tracking-tight leading-none">
        Bảng điều khiển
      </h1>
      <p className="mt-2 text-sm text-slate-550 dark:text-slate-400">
        Theo dõi hoạt động học tập, doanh thu và quản lý các bài giảng của bạn.
      </p>
    </div>
    <div className="flex flex-wrap gap-3 sm:justify-end">
      <Link
        to="/instructor/courses"
        className="inline-flex items-center justify-center rounded-xl border border-slate-205 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 px-5 py-2.5 text-sm font-semibold transition-all duration-300 hover:border-purple-300 dark:hover:border-purple-800 hover:text-purple-750 dark:hover:text-purple-400 active:scale-[0.98]"
      >
        Quản lý khóa học
      </Link>
      <Link
        to="/instructor/courses/new"
        className="group relative inline-flex items-center justify-center gap-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-slate-50 dark:hover:bg-slate-200 text-white dark:text-slate-950 px-5 py-2.5 text-sm font-semibold shadow-sm transition-all duration-300 active:scale-[0.98]"
      >
        Tạo khóa học mới
        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-white/10 dark:bg-black/10 group-hover:scale-110 transition-transform duration-300">
          <Plus className="h-3.5 w-3.5" />
        </span>
      </Link>
    </div>
  </div>
);

const Metric = ({ label, value }) => (
  <div className="text-center">
    <p className="font-bold text-slate-800 dark:text-slate-200 font-mono text-sm tracking-tight tabular-nums">
      {formatNumber(value)}
    </p>
    <p className="text-[9px] md:text-[10px] text-slate-400 dark:text-slate-500 uppercase tracking-wide font-semibold mt-0.5 whitespace-nowrap">{label}</p>
  </div>
);

const EmptyText = ({ children }) => (
  <p className="rounded-xl bg-slate-50 dark:bg-slate-900 p-6 text-sm text-slate-500 dark:text-slate-400 text-center leading-relaxed">
    {children}
  </p>
);

const DashboardSkeleton = () => (
  <div className="space-y-8 animate-pulse">
    {/* Header Skeleton */}
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-slate-100 dark:border-slate-800 pb-5">
      <div className="space-y-2">
        <div className="h-8 w-48 rounded-lg bg-slate-100 dark:bg-slate-900" />
        <div className="h-4 w-80 rounded-md bg-slate-50 dark:bg-slate-950" />
      </div>
      <div className="flex gap-3">
        <div className="h-10 w-36 rounded-xl bg-slate-100 dark:bg-slate-900" />
        <div className="h-10 w-40 rounded-xl bg-slate-200 dark:bg-slate-800" />
      </div>
    </div>

    {/* Bento Grid Skeleton */}
    <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
      {/* Revenue */}
      <div className="md:col-span-2 rounded-[2rem] p-1.5 bg-slate-100/50 dark:bg-slate-900/40 border border-slate-100/60 dark:border-slate-850">
        <div className="h-36 bg-white dark:bg-slate-950 rounded-[calc(2rem-0.375rem)] p-6 space-y-4">
          <div className="h-4 w-20 rounded bg-slate-100 dark:bg-slate-900" />
          <div className="h-8 w-44 rounded bg-slate-100 dark:bg-slate-900" />
        </div>
      </div>
      {/* Rating */}
      <div className="rounded-[2rem] p-1 bg-slate-100/50 dark:bg-slate-900/40 border border-slate-100/60 dark:border-slate-850">
        <div className="h-36 bg-white dark:bg-slate-950 rounded-[calc(2rem-0.25rem)] p-5 space-y-4">
          <div className="h-4 w-24 rounded bg-slate-100 dark:bg-slate-900" />
          <div className="h-8 w-16 rounded bg-slate-100 dark:bg-slate-900" />
        </div>
      </div>
      {/* Stats 3 columns */}
      {[1, 2, 3].map((i) => (
        <div key={i} className="rounded-[2rem] p-1 bg-slate-100/50 dark:bg-slate-900/40 border border-slate-100/60 dark:border-slate-850">
          <div className="h-32 bg-white dark:bg-slate-950 rounded-[calc(2rem-0.25rem)] p-5 space-y-4">
            <div className="h-4 w-24 rounded bg-slate-100 dark:bg-slate-900" />
            <div className="h-8 w-16 rounded bg-slate-100 dark:bg-slate-900" />
          </div>
        </div>
      ))}
      {/* Best Seller */}
      <div className="md:col-span-3 rounded-[2rem] p-1.5 bg-slate-100/50 dark:bg-slate-900/40 border border-slate-100/60 dark:border-slate-850">
        <div className="h-32 bg-white dark:bg-slate-950 rounded-[calc(2rem-0.375rem)] p-6 space-y-4">
          <div className="h-4 w-28 rounded bg-slate-100 dark:bg-slate-900" />
          <div className="h-10 w-96 rounded bg-slate-100 dark:bg-slate-900" />
        </div>
      </div>
    </div>

    {/* Lists Skeletons */}
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      {[1, 2].map((i) => (
        <div key={i} className="rounded-[2.25rem] p-1.5 bg-slate-100/50 dark:bg-slate-900/40 border border-slate-100 dark:border-slate-850">
          <div className="bg-white dark:bg-slate-950 rounded-[calc(2.25rem-0.375rem)] overflow-hidden p-6 space-y-6">
            <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-900 pb-4">
              <div className="space-y-2">
                <div className="h-6 w-36 rounded bg-slate-100 dark:bg-slate-900" />
                <div className="h-4 w-44 rounded bg-slate-50 dark:bg-slate-950" />
              </div>
              <div className="h-8 w-20 rounded bg-slate-100 dark:bg-slate-900" />
            </div>
            <div className="space-y-4">
              {[1, 2, 3].map((j) => (
                <div key={j} className="flex gap-4 items-center">
                  <div className="h-12 w-16 rounded-xl bg-slate-100 dark:bg-slate-900" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 w-40 rounded bg-slate-100 dark:bg-slate-900" />
                    <div className="h-3 w-64 rounded bg-slate-50 dark:bg-slate-950" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      ))}
    </div>
  </div>
);

const DashboardError = ({ error, onRetry }) => (
  <div className="flex min-h-[60vh] items-center justify-center rounded-[2rem] p-1.5 bg-rose-50/50 dark:bg-rose-950/10 border border-rose-100 dark:border-rose-900/30">
    <div className="bg-white dark:bg-slate-950 border border-rose-50 dark:border-rose-950/40 rounded-[calc(2rem-0.375rem)] p-10 text-center max-w-md shadow-sm">
      <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-100 dark:border-rose-900/40">
        <RefreshCw className="h-7 w-7 text-rose-600 dark:text-rose-450" />
      </div>
      <h1 className="text-xl font-bold text-slate-850 dark:text-slate-50 tracking-tight">Không thể tải dữ liệu</h1>
      <p className="mt-2 text-sm text-slate-500 dark:text-slate-400 leading-relaxed">{error || 'Không thể kết nối tới máy chủ. Vui lòng tải lại trang.'}</p>
      <button
        onClick={onRetry}
        className="mt-6 inline-flex items-center gap-2 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-slate-50 dark:hover:bg-slate-100 text-white dark:text-slate-950 px-5 py-2.5 text-sm font-semibold transition-all duration-300 active:scale-[0.98] cursor-pointer"
      >
        <RefreshCw className="h-4 w-4" />
        Thử lại
      </button>
    </div>
  </div>
);

const EmptyDashboard = ({ onNewCourse, navigate }) => (
  <div className="animate-fade-in-up space-y-6">
    <HeaderActions navigate={navigate} />
    <div className="rounded-[2.5rem] p-1.5 bg-slate-100/50 dark:bg-slate-900/40 border border-slate-100/80 dark:border-slate-800/80">
      <div className="bg-white dark:bg-slate-950 border border-slate-50/50 dark:border-slate-900/50 rounded-[calc(2.5rem-0.375rem)] p-12 text-center shadow-[0_8px_30px_rgb(0,0,0,0.005)]">
        <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-purple-50 dark:bg-purple-950/30 border border-purple-100 dark:border-purple-900/30">
          <BookOpen className="h-7 w-7 text-purple-600 dark:text-purple-400" />
        </div>
        <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100 tracking-tight">Chưa có khóa học nào</h1>
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400 max-w-[45ch] mx-auto leading-relaxed">
          Hãy tạo khóa học đầu tiên của bạn để kích hoạt bảng điều khiển thống kê, theo dõi doanh thu và học viên đăng ký.
        </p>
        <button
          onClick={onNewCourse}
          className="mt-6 inline-flex items-center gap-2 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-slate-50 dark:hover:bg-slate-100 text-white dark:text-slate-950 px-5 py-2.5 text-sm font-semibold transition-all duration-300 active:scale-[0.98] cursor-pointer"
        >
          <Plus className="h-4 w-4" />
          Tạo khóa học mới
        </button>
      </div>
    </div>
  </div>
);

const InstructorDashboard = () => {
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      const response = await getInstructorDashboard();
      setData(response);
    } catch (err) {
      if (err.status === 401) {
        navigate('/login', { replace: true });
        return;
      }

      setError(
        err.status === 403
          ? 'Bạn không có quyền xem dashboard giảng viên.'
          : 'Không thể tải dữ liệu dashboard.'
      );
    } finally {
      setLoading(false);
    }
  }, [navigate]);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  const courses = data?.khoaHocCuaToi || [];
  const newStudents = data?.hocVienMoi || [];
  const hasCourses = Number(data?.tongKhoaHoc || 0) > 0;

  if (loading) {
    return <DashboardSkeleton />;
  }

  if (error) {
    return <DashboardError error={error} onRetry={loadDashboard} />;
  }

  if (!hasCourses) {
    return (
      <EmptyDashboard
        navigate={navigate}
        onNewCourse={() => navigate('/instructor/courses/new')}
      />
    );
  }

  return (
    <div className="animate-fade-in-up space-y-8 pb-8">
      <HeaderActions navigate={navigate} />

      {/* Bento Grid Stats Layout */}
      <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
        {/* Row 1: Total Revenue (col-span-2) & Average Rating (col-span-1) */}
        <RevenueStatCard
          label="Tổng doanh thu"
          value={formatCurrency(data?.tongDoanhThu)}
          icon={Wallet}
          color="text-emerald-600 dark:text-emerald-400"
          bg="bg-emerald-50 dark:bg-emerald-950/20"
          className="md:col-span-2"
        />
        
        <RatingStatCard
          label="Đánh giá trung bình"
          value={data?.danhGiaTrungBinh != null ? `${data.danhGiaTrungBinh}` : 'Chưa có'}
          rawRating={data?.danhGiaTrungBinh}
          icon={Star}
          color="text-amber-600 dark:text-amber-400"
          bg="bg-amber-50 dark:bg-amber-950/20"
        />

        {/* Row 2: Total Students (col-span-1), Total Courses (col-span-1), Public Courses (col-span-1) */}
        <StatCard
          label="Tổng học viên"
          value={formatNumber(data?.tongHocVien)}
          icon={Users}
          color="text-blue-600 dark:text-blue-400"
          bg="bg-blue-50 dark:bg-blue-950/20"
        />
        
        <StatCard
          label="Tổng khóa học"
          value={formatNumber(data?.tongKhoaHoc)}
          icon={BookOpen}
          color="text-purple-600 dark:text-purple-400"
          bg="bg-purple-50 dark:bg-purple-950/20"
        />
        
        <StatCard
          label="Khóa học công khai"
          value={formatNumber(data?.khoaHocCongKhai)}
          icon={RefreshCw}
          color="text-sky-600 dark:text-sky-400"
          bg="bg-sky-50 dark:bg-sky-950/20"
        />

        {/* Row 3: Best Selling Course (col-span-3) */}
        {data?.khoaHocNhieuHocVienNhat && (
          <BestSellerCard course={data.khoaHocNhieuHocVienNhat} navigate={navigate} />
        )}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Khóa học của bạn list section */}
        <section className="rounded-[2.25rem] p-1.5 bg-slate-100/50 dark:bg-slate-900/40 border border-slate-100/80 dark:border-slate-800/80">
          <div className="bg-white dark:bg-slate-950 border border-slate-50/50 dark:border-slate-900/50 rounded-[calc(2.25rem-0.375rem)] overflow-hidden">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-900 p-6">
              <div>
                <h2 className="font-bold text-slate-850 dark:text-slate-200 text-lg tracking-tight">Khóa học của bạn</h2>
                <p className="text-xs text-slate-400 dark:text-slate-550 mt-1">Các khóa học được tải lên gần đây nhất</p>
              </div>
              <button
                onClick={() => navigate('/instructor/courses')}
                className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 hover:bg-slate-100 dark:bg-slate-900 dark:hover:bg-slate-800 px-4 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 transition-all duration-300 active:scale-[0.98] cursor-pointer"
              >
                Quản lý
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </div>
            {courses.length > 0 ? (
              <div className="divide-y divide-slate-100 dark:divide-slate-900">
                {courses.slice(0, 5).map((course, index) => (
                  <CourseRow
                    key={course.id}
                    course={course}
                    index={index}
                    onClick={() => navigate(`/instructor/courses/${course.id}/edit`)}
                  />
                ))}
              </div>
            ) : (
              <div className="p-10 text-center text-sm text-slate-400 dark:text-slate-500 bg-slate-50/50 dark:bg-slate-950/20">
                Chưa có khóa học nào.
              </div>
            )}
          </div>
        </section>

        {/* Học viên mới đăng ký list section */}
        <section className="rounded-[2.25rem] p-1.5 bg-slate-100/50 dark:bg-slate-900/40 border border-slate-100/80 dark:border-slate-800/80">
          <div className="bg-white dark:bg-slate-950 border border-slate-50/50 dark:border-slate-900/50 rounded-[calc(2.25rem-0.375rem)] overflow-hidden">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-900 p-6">
              <div>
                <h2 className="font-bold text-slate-850 dark:text-slate-200 text-lg tracking-tight">Học viên mới</h2>
                <p className="text-xs text-slate-400 dark:text-slate-555 mt-1">Đăng ký tham gia các khóa học của bạn</p>
              </div>
              <button
                onClick={() => navigate('/instructor/revenue')}
                className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 hover:bg-slate-100 dark:bg-slate-900 dark:hover:bg-slate-800 px-4 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 transition-all duration-300 active:scale-[0.98] cursor-pointer"
              >
                Chi tiết
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </div>
            <div className="p-3">
              {newStudents.length > 0 ? (
                <div className="space-y-1">
                  {newStudents.slice(0, 5).map((student, index) => (
                    <StudentRow
                      key={student.id}
                      student={student}
                      index={index}
                    />
                  ))}
                </div>
              ) : (
                <div className="p-6">
                  <EmptyText>Chưa có học viên mới đăng ký.</EmptyText>
                </div>
              )}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};

export default InstructorDashboard;
