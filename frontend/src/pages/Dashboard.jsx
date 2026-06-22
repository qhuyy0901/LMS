import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

import axios from 'axios';
import {
  ArrowUpRight,
  Award,
  BarChart2,
  BookOpen,
  CalendarDays,
  Check,
  Eye,
  EyeOff,
  FileCheck,
  Flame,
  GraduationCap,
  Play,
  TrendingUp,
  Users,
  Wallet,
} from 'lucide-react';
import { useDashboardView } from '../context/DashboardViewContext';
import { StatCard } from '../components/StatCard';
import { getFileUrl } from '../utils/fileUtils';
import CourseProgressCard from '../components/CourseProgressCard';
import CertificateModal from '../components/CertificateModal';


const formatCurrency = (amount = 0) =>
  new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(Number(amount || 0));

const STUDENT_WALLET_PRIVACY_KEY = 'student-dashboard-wallet-amounts';

const formatDate = (value) =>
  value
    ? new Intl.DateTimeFormat('vi-VN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      }).format(new Date(value))
    : 'Không giới hạn';

const getDashboardEndpoint = (view) => {
  if (view === 'ADMIN') return '/api/admin/dashboard';
  if (view === 'INSTRUCTOR') return '/api/instructor/dashboard';
  return '/api/dashboard';
};

const normalizeDashboardData = (view, payload = {}) => {
  const adminStats = payload.stats ?? payload;

  if (view === 'ADMIN') {
    return {
      stats: {
        totalUsers: adminStats.totalUsers ?? 0,
        totalCourses: adminStats.totalCourses ?? 0,
        totalEnrollments: adminStats.totalEnrollments ?? 0,
        pendingInstructorApplications: adminStats.pendingInstructorApplications ?? 0,
        pendingCourses: adminStats.pendingCourses ?? 0,
        pendingWithdrawals: adminStats.pendingWithdrawals ?? 0,
        pendingPayments: adminStats.pendingPayments ?? 0,
        activeUsers: adminStats.activeUsers ?? adminStats.totalUsers ?? 0,
        activeEvents: adminStats.activeEvents ?? 0,
        activeCoupons: adminStats.activeCoupons ?? 0,
      },
      recentUsers: payload.recentUsers ?? [],
      recentActivities: payload.recentActivities ?? [],
    };
  }

  if (view === 'INSTRUCTOR') {
    const totalRevenue = payload.tongDoanhThu ?? payload.totalRevenue ?? payload.stats?.totalRevenue ?? 0;
    return {
      stats: {
        totalRevenue,
        totalRevenueFormatted: payload.totalRevenueFormatted ?? formatCurrency(totalRevenue),
        totalStudents: payload.tongHocVien ?? payload.totalStudents ?? payload.stats?.totalStudents ?? 0,
        publishedCourses: payload.khoaHocCongKhai ?? payload.publishedCourses ?? payload.stats?.publishedCourses ?? 0,
        draftCourses: payload.khoaHocBanNhap ?? payload.draftCourses ?? payload.stats?.draftCourses ?? 0,
        totalCourses: payload.tongKhoaHoc ?? payload.totalCourses ?? 0,
        averageRating: payload.danhGiaTrungBinh ?? payload.averageRating ?? null,
      },
      courses: (payload.khoaHocCuaToi ?? payload.courses ?? []).map((course) => ({
        id: course.id,
        title: course.title ?? course.tieuDe ?? course.tenKhoaHoc,
        enrollments: course.enrollments ?? course.soHocVien ?? course.studentCount ?? course.hocVien ?? 0,
        lessons: course.lessons ?? course.soBaiHoc ?? course.lessonCount ?? course.baiHoc ?? 0,
        isPublished: course.isPublished ?? course.congKhai ?? course.daXuatBan ?? ['PUBLIC', 'PUBLISHED'].includes(String(course.status || '').toUpperCase()),
      })),
      recentEnrollments: (payload.hocVienMoi ?? payload.recentEnrollments ?? []).map((enrollment) => ({
        id: enrollment.id,
        studentName: enrollment.studentName ?? enrollment.tenHocVien,
        courseTitle: enrollment.courseTitle ?? enrollment.tenKhoaHoc,
        enrolledAt: enrollment.enrolledAt ?? enrollment.ngayDangKy,
      })),
    };
  }

  return {
    stats: {
      totalEnrolled: payload.totalCourses ?? payload.totalEnrolled ?? 0,
      completedCourses: payload.completedCourses ?? 0,
      completedLessons: payload.completedLessons ?? 0,
      certificates: payload.certificates ?? 0,
      participatedEvents: payload.participatedEvents ?? 0,
      avgProgress: payload.averageProgress ?? payload.avgProgress ?? 0,
      walletBalance: payload.walletBalance ?? 0,
      totalSpent: payload.totalSpent ?? 0,
      rewardPoints: payload.rewardPoints ?? 0,
      loginStreak: payload.loginStreak ?? 0,
      nextLoginReward: payload.nextLoginReward ?? 3,
      dailyLessonCompleted: payload.dailyLessonCompleted ?? false,
      dailyQuizPassed: payload.dailyQuizPassed ?? false,
      weeklyPurchaseCompleted: payload.weeklyPurchaseCompleted ?? false,
    },
    recentCourses: (payload.recentCourses ?? []).map((course) => ({
      ...course,
      progress: Math.min(100, Math.max(0, Math.round(course.progress ?? 0))),
      startedAt: course.purchasedAt ?? course.enrolledAt ?? course.courseStartDate,
    })),
  };
}const StudentDashboard = ({ data, loading, certificates = [] }) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [selectedCertificate, setSelectedCertificate] = useState(null);
  const stats = data?.stats;
  const recentCourses = (data?.recentCourses || [])
    .filter((course) => (course.progress ?? 0) < 100)
    .sort((a, b) => (b.progress ?? 0) - (a.progress ?? 0))
    .slice(0, 2);
  const [showWalletAmounts, setShowWalletAmounts] = useState(() => {
    if (typeof window === 'undefined') {
      return true;
    }

    return window.localStorage.getItem(STUDENT_WALLET_PRIVACY_KEY) !== 'hidden';
  });

  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(STUDENT_WALLET_PRIVACY_KEY, showWalletAmounts ? 'visible' : 'hidden');
    }
  }, [showWalletAmounts]);

  const learningPoints = stats?.rewardPoints ?? 0;
  const dailyTasks = [
    {
      icon: Flame,
      title: 'Đăng nhập học mỗi ngày',
      subtitle: `Chuỗi ${stats?.loginStreak ?? 0} ngày`,
      reward: `+${stats?.nextLoginReward ?? 3} điểm`,
      done: (stats?.loginStreak ?? 0) > 0,
      color: 'bg-orange-50 text-orange-500 dark:bg-orange-950/20 dark:text-orange-400',
    },
    {
      icon: BookOpen,
      title: 'Hoàn thành 1 bài học mỗi ngày',
      subtitle: '',
      reward: '+5 điểm',
      done: Boolean(stats?.dailyLessonCompleted),
      color: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/20 dark:text-emerald-400',
    },
    {
      icon: FileCheck,
      title: 'Làm quiz đạt yêu cầu',
      subtitle: '',
      reward: '+10 điểm',
      done: Boolean(stats?.dailyQuizPassed),
      color: 'bg-blue-50 text-blue-600 dark:bg-blue-950/20 dark:text-blue-400',
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-6 gap-6 items-stretch animate-fade-in-up">
      {/* Row 1: Hero Banner (4 cols) & Wallet (2 cols) */}
      <div className="md:col-span-4 p-[1.5px] rounded-[1.5rem] bg-purple-50/40 dark:bg-slate-800/60 border border-purple-100/40 dark:border-slate-800/40 shadow-[0_2px_8px_rgba(147,51,234,0.01)] h-full">
        <section className="relative overflow-hidden rounded-[calc(1.5rem-1.5px)] bg-gradient-to-br from-purple-50/20 via-white to-purple-100/10 dark:from-slate-900/90 dark:to-purple-950/10 p-8 shadow-[inset_0_1px_1px_rgba(255,255,255,0.6)] dark:shadow-[inset_0_1px_1px_rgba(255,255,255,0.05)] h-full flex flex-col justify-center min-h-[220px] group">
          {/* Ambient Glow */}
          <div className="absolute top-0 right-0 w-80 h-80 bg-purple-500/5 rounded-full blur-[100px] pointer-events-none" />

          <div className="relative z-10 max-w-xl">
            <span className="text-[10px] tracking-[0.2em] font-mono uppercase text-purple-650 dark:text-purple-400 mb-2.5 block font-bold">Premium Membership</span>
            <h2 className="mb-4 text-2xl font-extrabold tracking-tight text-slate-900 dark:text-purple-50 md:text-3xl leading-tight">
              Mở khóa hơn 1.000 khóa học cao cấp ngay hôm nay
            </h2>
            <Link
              to="/upgrade"
              className="inline-flex items-center gap-2.5 rounded-full bg-purple-600 hover:bg-purple-755 text-white transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] hover:scale-[1.02] active:scale-[0.98] px-5 py-2.5 text-xs font-semibold group/btn shadow-md shadow-purple-200/40 dark:shadow-none w-fit"
            >
              <span>Nâng cấp Premium</span>
              <span className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center transition-transform duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] group-hover/btn:translate-x-0.5 group-hover/btn:-translate-y-0.5">
                <ArrowUpRight className="h-3 w-3 text-white" strokeWidth={2.5} />
              </span>
            </Link>
          </div>

          <div className="absolute right-12 top-1/2 -translate-y-1/2 hidden md:flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/85 dark:bg-slate-800/85 border border-purple-100/40 dark:border-slate-700/40 text-purple-600 dark:text-purple-400 shadow-sm animate-float">
              <GraduationCap className="h-6 w-6" strokeWidth={1.5} />
            </div>
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/85 dark:bg-slate-800/85 border border-purple-100/40 dark:border-slate-700/40 text-indigo-500 dark:text-indigo-400 shadow-sm animate-float delay-100">
              <BookOpen className="h-5 w-5" strokeWidth={1.5} />
            </div>
          </div>
        </section>
      </div>

      <div className="md:col-span-2 p-[1.5px] rounded-[1.5rem] bg-purple-50/40 dark:bg-slate-800/60 border border-purple-100/40 dark:border-slate-800/40 shadow-[0_2px_8px_rgba(147,51,234,0.01)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_4px_16px_rgba(147,51,234,0.04)] group h-full">
        <section className="bg-white dark:bg-slate-900 rounded-[calc(1.5rem-1.5px)] p-6 h-full flex flex-col justify-between min-h-[220px]">
          <div className="mb-4 flex items-center justify-between">
            <span className="text-[10px] tracking-[0.2em] font-mono uppercase text-slate-400 dark:text-slate-500 block font-bold">Ví tài khoản</span>
            {!loading && (
              <button
                type="button"
                onClick={() => setShowWalletAmounts((current) => !current)}
                className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-purple-50 dark:border-slate-805 text-slate-400 hover:text-slate-650 dark:hover:text-slate-300 transition cursor-pointer"
                title={showWalletAmounts ? 'Ẩn số tiền' : 'Hiện số tiền'}
                aria-label={showWalletAmounts ? 'Ẩn số tiền trong ví' : 'Hiện số tiền trong ví'}
              >
                {showWalletAmounts ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
              </button>
            )}
          </div>

          {loading ? (
            <div className="space-y-3">
              <div className="h-8 w-32 animate-pulse rounded bg-slate-100 dark:bg-slate-800" />
              <div className="h-3 w-20 animate-pulse rounded bg-slate-100 dark:bg-slate-800" />
            </div>
          ) : (
            <div>
              <p className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white font-mono">
                {showWalletAmounts ? formatCurrency(stats?.walletBalance ?? 0) : '••••••'}
              </p>
              <p className="mt-1 text-xs text-slate-400 dark:text-slate-550 font-medium">
                Đã chi: <span className="font-mono">{showWalletAmounts ? formatCurrency(stats?.totalSpent ?? 0) : '••••••'}</span>
              </p>
            </div>
          )}

          <Link
            to="/upgrade"
            className="mt-6 flex w-full items-center justify-center gap-2.5 rounded-full bg-purple-600 hover:bg-purple-755 text-white py-2.5 text-xs font-semibold transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] hover:scale-[1.02] active:scale-[0.98] group/btn shadow-md shadow-purple-100/50 dark:shadow-none"
          >
            <Wallet className="h-3.5 w-3.5 transition-transform duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] group-hover/btn:scale-110" strokeWidth={1.5} />
            <span>Nạp ví</span>
          </Link>
        </section>
      </div>

      {/* Row 2: Stats Row spanning full width using 3 columns (col-span-2 each) */}
      <div className="md:col-span-2">
        <StatCard
          icon={Check}
          label="Khóa học"
          value={loading ? '...' : `${stats?.completedCourses ?? 0} / ${stats?.totalEnrolled ?? 0}`}
          subtitle="Hoàn thành"
          color="bg-green-100 text-green-650"
          loading={loading}
        />
      </div>
      <div className="md:col-span-2">
        <StatCard
          icon={Award}
          label="Chứng chỉ"
          value={loading ? '...' : stats?.certificates ?? 0}
          subtitle="Đã đạt được"
          color="bg-amber-100 text-amber-650"
          loading={loading}
        />
      </div>
      <div className="md:col-span-2">
        <StatCard
          icon={CalendarDays}
          label="Sự kiện"
          value={loading ? '...' : stats?.participatedEvents ?? 0}
          subtitle="Đã tham gia"
          color="bg-purple-100 text-purple-650"
          loading={loading}
        />
      </div>

      {/* Row 3: Continuing Education (4 cols) & Daily Quests (2 cols) */}
      <div className="md:col-span-4 p-[1.5px] rounded-[1.5rem] bg-purple-50/40 dark:bg-slate-800/60 border border-purple-100/40 dark:border-slate-800/40 shadow-[0_2px_8px_rgba(147,51,234,0.01)]">
        <section className="bg-white dark:bg-slate-900 rounded-[calc(1.5rem-1.5px)] p-6 h-full flex flex-col justify-between">
          <div>
            <div className="mb-6 flex items-center justify-between">
              <h3 className="text-lg font-extrabold tracking-tight text-slate-900 dark:text-slate-100">Tiếp tục học</h3>
              <Link to="/my-learning" className="text-xs font-bold text-purple-600 dark:text-purple-400 hover:text-purple-800 dark:hover:text-purple-305 transition">
                Xem tất cả
              </Link>
            </div>

            {loading ? (
              <CourseSkeleton />
            ) : recentCourses.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {recentCourses.map((course) => {
                  const progress = course.progress ?? 0;
                  return (
                    <CourseProgressCard
                      key={course.courseId}
                      title={course.title}
                      thumbnail={course.thumbnail}
                      category={course.category}
                      instructorName={course.instructorName}
                      progress={progress}
                      totalLessons={course.totalLessons || 0}
                      startedAt={course.startedAt}
                      endDate={course.courseEndDate}
                      onContinue={() => navigate(`/learn/${course.courseId}`)}
                      onDetail={() => navigate(`/course/${course.courseId}`)}
                      onViewCertificate={() => {
                        const cert = certificates.find(c => (c.course?.id || c.course?.Id) === course.courseId);
                        setSelectedCertificate({
                          ...cert,
                          studentName: cert?.studentName || user?.name || user?.email || 'Học viên',
                          courseTitle: cert?.courseTitle || course.title,
                          instructorName: cert?.instructorName || course.instructorName,
                        });
                      }}
                    />
                  );
                })}
              </div>
            ) : (
              <div className="py-12 text-center">
                <BookOpen className="mx-auto mb-3 h-8 w-8 text-slate-350 dark:text-slate-600" strokeWidth={1.5} />
                <p className="text-xs text-slate-400 dark:text-slate-550">Bạn chưa đăng ký khóa học nào.</p>
                <Link to="/explore" className="mt-2 inline-block text-xs font-semibold text-purple-600 dark:text-purple-400 hover:underline">
                  Khám phá ngay
                </Link>
              </div>
            )}
          </div>
        </section>
      </div>

      <div className="md:col-span-2 p-[1.5px] rounded-[1.5rem] bg-purple-50/40 dark:bg-slate-800/60 border border-purple-100/40 dark:border-slate-800/40 shadow-[0_2px_8px_rgba(147,51,234,0.01)]">
        <section className="bg-white dark:bg-slate-900 rounded-[calc(1.5rem-1.5px)] p-6 h-full flex flex-col justify-between">
          <div>
            <div className="mb-5 flex items-center justify-between border-b border-purple-50/50 dark:border-slate-800/50 pb-4">
              <h3 className="text-lg font-extrabold tracking-tight text-slate-900 dark:text-slate-100">Nhiệm vụ hằng ngày</h3>
              <Link to="/events" className="text-xs font-bold text-purple-600 dark:text-purple-400 hover:text-purple-800 transition">
                Đổi điểm
              </Link>
            </div>

            <div className="space-y-4">
              <QuestRow
                icon={Award}
                title="Điểm học tập hiện có"
                subtitle=""
                color="bg-purple-50/80 text-purple-600 dark:bg-purple-950/20 dark:text-purple-400"
                right={`${learningPoints} điểm`}
              />
              <div className="border-t border-purple-50/60 dark:border-slate-800 pt-4 space-y-4">
                {dailyTasks.map((task) => (
                  <QuestRow key={task.title} {...task} />
                ))}
              </div>
            </div>
          </div>
        </section>
      </div>
      {selectedCertificate && (
        <CertificateModal
          certificate={selectedCertificate}
          onClose={() => setSelectedCertificate(null)}
        />
      )}
    </div>
  );
};

const InstructorDashboard = ({ data, loading }) => {
  const stats = data?.stats;
  const courses = data?.courses || [];
  const recentEnrollments = data?.recentEnrollments || [];

  return (
    <div className="space-y-8 animate-fade-in-up">
      {/* Top Banner Bezel */}
      <div className="p-[1.5px] rounded-[1.25rem] bg-purple-50/40 dark:bg-slate-800/60 border border-purple-100/40 dark:border-slate-800/40 shadow-[0_2px_8px_rgba(147,51,234,0.01)]">
        <section className="bg-gradient-to-br from-white via-white to-purple-50/30 dark:from-slate-900 dark:to-slate-900/50 rounded-[calc(1.25rem-1.5px)] p-6">
          <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
            <div>
              <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-purple-600 dark:text-purple-400 block mb-1">
                Khu vực giảng viên
              </span>
              <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
                Quản lý và tạo khóa học
              </h2>
              <p className="mt-1 text-xs text-slate-400 dark:text-slate-500 font-medium max-w-[65ch]">
                Theo dõi doanh thu, học viên mới đăng ký và trạng thái khóa học của bạn trực quan.
              </p>
            </div>
            <div className="flex flex-col gap-2.5 sm:flex-row">
              <Link
                to="/instructor/courses"
                className="rounded-full border border-purple-100 dark:border-purple-800 bg-white dark:bg-slate-800 px-5 py-2.5 text-center text-xs font-semibold text-purple-700 dark:text-purple-400 hover:bg-purple-50/50 dark:hover:bg-purple-950/20 transition"
              >
                Quản lý khóa học
              </Link>
              <Link
                to="/instructor/courses/new"
                className="inline-flex items-center justify-center gap-2 rounded-full bg-purple-600 hover:bg-purple-700 text-white transition px-5 py-2.5 text-center text-xs font-semibold group/btn shadow-md shadow-purple-200/50 dark:shadow-none"
              >
                <span>Tạo khóa học mới</span>
                <span className="w-4 h-4 rounded-full bg-white/20 flex items-center justify-center transition-transform group-hover/btn:translate-x-0.5 group-hover/btn:-translate-y-0.5">
                  <ArrowUpRight className="h-2.5 w-2.5 text-white" strokeWidth={2.5} />
                </span>
              </Link>
            </div>
          </div>
        </section>
      </div>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
        <StatCard icon={Users} label="Tổng học viên" value={stats?.totalStudents ?? 0} subtitle="Đã ghi danh" color="bg-blue-50 text-blue-600" loading={loading} />
        <StatCard icon={BookOpen} label="Khóa học công khai" value={stats?.publishedCourses ?? 0} subtitle={`${stats?.draftCourses ?? 0} bản nháp`} color="bg-purple-50 text-purple-600" loading={loading} />
        <StatCard icon={TrendingUp} label="Đánh giá TB" value={stats?.averageRating ? `${Number(stats.averageRating).toFixed(1)}/5` : 'Chưa có'} subtitle="Từ học viên" color="bg-amber-50 text-amber-600" loading={loading} />
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        {/* Double-bezel Recent Enrollments */}
        <div className="p-[1.5px] rounded-[1.25rem] bg-purple-50/40 dark:bg-slate-800/60 border border-purple-100/40 dark:border-slate-800/40 shadow-[0_2px_8px_rgba(147,51,234,0.01)] lg:col-span-1">
          <section className="bg-white dark:bg-slate-900 rounded-[calc(1.25rem-1.5px)] p-6 h-full flex flex-col justify-between">
            <div>
              <h3 className="mb-5 text-lg font-bold tracking-tight text-slate-900 dark:text-slate-100 font-bold">
                Học viên mới đăng ký
              </h3>
              {loading ? (
                <ListSkeleton />
              ) : recentEnrollments.length > 0 ? (
                <div className="space-y-4">
                  {recentEnrollments.map((enrollment, index) => (
                    <div key={enrollment.id || index} className="flex items-center gap-3 border-b border-purple-50/30 dark:border-slate-800/30 pb-3 last:pb-0 last:border-none">
                      <Avatar name={enrollment.studentName} />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-xs font-semibold text-slate-900 dark:text-slate-200">{enrollment.studentName}</p>
                        <p className="truncate text-[11px] text-slate-450 dark:text-slate-500 font-medium">{enrollment.courseTitle}</p>
                      </div>
                      <span className="shrink-0 font-mono text-[10px] text-slate-400 dark:text-slate-505">{formatDate(enrollment.enrolledAt)}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="py-8 text-center text-xs text-slate-400 dark:text-slate-500">Chưa có học viên mới.</p>
              )}
            </div>
          </section>
        </div>

        {/* Double-bezel My Courses List */}
        <div className="p-[1.5px] rounded-[1.25rem] bg-purple-50/40 dark:bg-slate-800/60 border border-purple-100/40 dark:border-slate-800/40 shadow-[0_2px_8px_rgba(147,51,234,0.01)] lg:col-span-2">
          <section className="bg-white dark:bg-slate-900 rounded-[calc(1.25rem-1.5px)] p-6 h-full flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between border-b border-purple-50/50 dark:border-slate-800/80 pb-4 mb-4">
                <h3 className="text-lg font-bold tracking-tight text-slate-900 dark:text-slate-100 font-bold">Khóa học của bạn</h3>
                <Link to="/instructor/courses" className="text-xs font-semibold text-purple-600 dark:text-purple-400 hover:text-purple-800 dark:hover:text-purple-300 transition">
                  Quản lý
                </Link>
              </div>

              {loading ? (
                <ListSkeleton />
              ) : courses.length > 0 ? (
                <div className="space-y-4">
                  {courses.slice(0, 5).map((course) => (
                    <Link key={course.id} to={`/instructor/courses/${course.id}`} className="group flex items-center gap-3.5 p-2.5 rounded-xl border border-transparent hover:border-purple-50/30 dark:hover:border-slate-800/40 hover:bg-purple-50/10 dark:hover:bg-slate-900/10 transition duration-300">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-indigo-50/50 dark:bg-indigo-950/20 text-indigo-600 dark:text-indigo-400">
                        <BookOpen className="h-4.5 w-4.5" strokeWidth={1.5} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-xs font-semibold text-slate-900 dark:text-slate-200 group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors">{course.title}</p>
                        <p className="text-[11px] text-slate-400 dark:text-slate-500 font-medium font-mono">{course.enrollments} học viên · {course.lessons} bài</p>
                      </div>
                      <StatusPill active={course.isPublished} />
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="py-12 text-center text-xs text-slate-400 dark:text-slate-500">Chưa có khóa học nào.</div>
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};

const AdminDashboard = ({ data, loading }) => {
  const stats = data?.stats || data || {};
  const recentUsers = data?.recentUsers || [];
  const recentActivities = data?.recentActivities || [];
  const roleLabels = {
    STUDENT: 'Học viên',
    INSTRUCTOR: 'Giảng viên',
    ADMIN: 'Admin',
  };
  const taskItems = [
    {
      label: 'Hồ sơ giảng viên chờ duyệt',
      value: stats.pendingInstructorApplications ?? 0,
      to: '/admin/instructor-applications',
      icon: FileCheck,
      color: 'bg-rose-50 text-rose-600 dark:bg-rose-950/20 dark:text-rose-400',
    },
    {
      label: 'Khóa học chờ duyệt',
      value: stats.pendingCourses ?? 0,
      to: '/admin/courses',
      icon: BookOpen,
      color: 'bg-amber-50 text-amber-600 dark:bg-amber-950/20 dark:text-amber-400',
    },
    {
      label: 'Yêu cầu rút tiền chờ xử lý',
      value: stats.pendingWithdrawals ?? 0,
      to: '/admin/transactions',
      icon: Wallet,
      color: 'bg-sky-50 text-sky-600 dark:bg-sky-950/20 dark:text-sky-400',
    },
    {
      label: 'Giao dịch cần kiểm tra',
      value: stats.pendingPayments ?? 0,
      to: '/admin/transactions',
      icon: BarChart2,
      color: 'bg-orange-50 text-orange-600 dark:bg-orange-950/20 dark:text-orange-400',
      hideWhenZero: true,
    },
  ].filter((item) => !item.hideWhenZero || item.value > 0);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100 md:text-3xl">Dashboard Quản trị</h1>
        <p className="mt-1 text-xs text-slate-400 dark:text-slate-500 font-medium">
          Hệ thống theo dõi và phê duyệt dữ liệu LMS Skillio toàn cục.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-4">
        <AdminStatLink to="/admin/users" icon={Users} label="Tổng người dùng" value={stats.totalUsers ?? 0} subtitle="Toàn hệ thống" color="bg-blue-50 text-blue-600" loading={loading} />
        <AdminStatLink to="/admin/courses" icon={BookOpen} label="Tổng khóa học" value={stats.totalCourses ?? 0} subtitle="Tất cả trạng thái" color="bg-purple-50 text-purple-600" loading={loading} />
        <AdminStatLink to="/admin/instructor-applications" icon={FileCheck} label="Hồ sơ GV chờ duyệt" value={stats.pendingInstructorApplications ?? 0} subtitle="Cần Admin xử lý" color="bg-rose-50 text-rose-600" loading={loading} />
        <AdminStatLink to="/admin/courses" icon={CalendarDays} label="Khóa học chờ duyệt" value={stats.pendingCourses ?? 0} subtitle="Chờ kiểm duyệt" color="bg-amber-50 text-amber-600" loading={loading} />
      </div>

      {/* Double-bezel Pending Tasks */}
      <div className="p-[1.5px] rounded-[1.25rem] bg-purple-50/40 dark:bg-slate-800/60 border border-purple-100/40 dark:border-slate-800/40 shadow-[0_2px_8px_rgba(147,51,234,0.01)]">
        <section className="bg-white dark:bg-slate-900 rounded-[calc(1.25rem-1.5px)] p-6">
          <h3 className="mb-5 text-lg font-bold tracking-tight text-slate-900 dark:text-slate-100 font-bold">Việc cần xử lý</h3>
          {loading ? (
            <ListSkeleton />
          ) : taskItems.length > 0 ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {taskItems.map((item) => (
                <AdminTaskItem key={item.label} {...item} />
              ))}
            </div>
          ) : (
            <p className="rounded-xl bg-purple-50/20 dark:bg-slate-900/10 border border-purple-100/30 dark:border-slate-800/40 px-4 py-8 text-center text-xs text-slate-400 dark:text-slate-500 font-medium">
              Không có việc cần xử lý.
            </p>
          )}
        </section>
      </div>

      <div className="grid grid-cols-1 gap-8 xl:grid-cols-3">
        {/* Double-bezel Recent Users */}
        <div className="p-[1.5px] rounded-[1.25rem] bg-purple-50/40 dark:bg-slate-800/60 border border-purple-100/40 dark:border-slate-800/40 shadow-[0_2px_8px_rgba(147,51,234,0.01)] xl:col-span-2">
          <section className="bg-white dark:bg-slate-900 rounded-[calc(1.25rem-1.5px)] p-6 h-full flex flex-col justify-between">
            <div>
              <div className="mb-5 flex items-center justify-between border-b border-purple-50/50 dark:border-slate-800/80 pb-4">
                <h3 className="text-lg font-bold tracking-tight text-slate-900 dark:text-slate-100 font-bold">Người dùng mới nhất</h3>
                <Link to="/admin/users" className="text-xs font-semibold text-slate-500 dark:text-slate-400 hover:text-purple-600 dark:hover:text-purple-400 transition">
                  Tất cả
                </Link>
              </div>
              {loading ? (
                <ListSkeleton />
              ) : recentUsers.length > 0 ? (
                <div className="space-y-4">
                  {recentUsers.map((user) => (
                    <div key={user.id} className="flex items-center gap-3.5 pb-4 border-b border-purple-50/30 dark:border-slate-800/20 last:pb-0 last:border-none">
                      <Avatar name={user.ten || user.name || user.email} />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-xs font-semibold text-slate-900 dark:text-slate-200">{user.ten || user.name || user.email}</p>
                        <p className="truncate text-[11px] text-slate-450 dark:text-slate-500 font-medium">{user.email}</p>
                      </div>
                      <div className="shrink-0 text-right flex flex-col items-end gap-1.5">
                        <span className="rounded-full bg-slate-100 dark:bg-slate-800 px-2.5 py-0.5 text-[9px] font-semibold text-slate-600 dark:text-slate-400 border border-slate-200/30 dark:border-slate-700/20 tracking-wide uppercase">
                          {roleLabels[user.vaiTro || user.role] || user.vaiTro || user.role}
                        </span>
                        {user.createdAt ? <p className="font-mono text-[10px] text-slate-405 dark:text-slate-500 font-medium">{formatDate(user.createdAt)}</p> : null}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="py-8 text-center text-xs text-slate-400 dark:text-slate-500">Chưa có người dùng mới.</p>
              )}
            </div>
          </section>
        </div>

        {/* Double-bezel Platform Overview */}
        <div className="p-[1.5px] rounded-[1.25rem] bg-purple-50/40 dark:bg-slate-800/60 border border-purple-100/40 dark:border-slate-800/40 shadow-[0_2px_8px_rgba(147,51,234,0.01)] lg:col-span-1">
          <section className="bg-white dark:bg-slate-900 rounded-[calc(1.25rem-1.5px)] p-6 h-full flex flex-col justify-between">
            <div>
              <h3 className="mb-5 text-lg font-bold tracking-tight text-slate-900 dark:text-slate-100 font-bold">Tổng quan nền tảng</h3>
              <div className="space-y-4">
                <OverviewRow icon={GraduationCap} label="Tổng lượt ghi danh" value={stats.totalEnrollments ?? 0} color="purple" />
                <OverviewRow icon={Users} label="Người dùng hoạt động" value={stats.activeUsers ?? 0} color="blue" />
                {(stats.activeEvents ?? 0) > 0 ? (
                  <OverviewRow icon={CalendarDays} label="Sự kiện đang mở" value={stats.activeEvents ?? 0} color="amber" />
                ) : (
                  <OverviewRow icon={FileCheck} label="Mã giảm giá đang hoạt động" value={stats.activeCoupons ?? 0} color="amber" />
                )}
              </div>
            </div>
          </section>
        </div>
      </div>

      {!loading && recentActivities.length > 0 ? (
        /* Double-bezel Recent Activities */
        <div className="p-[1.5px] rounded-[1.25rem] bg-purple-50/40 dark:bg-slate-800/60 border border-purple-100/40 dark:border-slate-800/40 shadow-[0_2px_8px_rgba(147,51,234,0.01)]">
          <section className="bg-white dark:bg-slate-900 rounded-[calc(1.25rem-1.5px)] p-6">
            <h3 className="mb-5 text-lg font-bold tracking-tight text-slate-900 dark:text-slate-100 font-bold">Hoạt động gần đây</h3>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {recentActivities.map((item, index) => (
                <Link key={`${item.type || 'activity'}-${item.createdAt || index}`} to={item.link || '/admin'} className="flex items-center gap-3.5 p-3 rounded-xl border border-purple-50/40 dark:border-slate-800/40 bg-purple-50/5 dark:bg-slate-900/10 hover:border-purple-100 hover:bg-purple-50/10 dark:hover:bg-slate-900/20 transition duration-300">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-purple-50/50 dark:bg-slate-800 text-purple-700 dark:text-purple-400">
                    <FileCheck className="h-4.5 w-4.5" strokeWidth={1.5} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-semibold text-slate-900 dark:text-slate-200">{item.title}</p>
                    <p className="truncate text-[11px] text-slate-450 dark:text-slate-500 font-medium">{item.description}</p>
                  </div>
                  <span className="shrink-0 font-mono text-[10px] text-slate-400 dark:text-slate-505">{item.createdAt ? formatDate(item.createdAt) : ''}</span>
                </Link>
              ))}
            </div>
          </section>
        </div>
      ) : null}
    </div>
  );
};

const Dashboard = () => {
  const { activeView } = useDashboardView();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [certificates, setCertificates] = useState([]);

  useEffect(() => {
    setLoading(true);
    setData(null);
    setCertificates([]);

    const fetchStats = async () => {
      try {
        const response = await axios.get(getDashboardEndpoint(activeView));
        setData(normalizeDashboardData(activeView, response.data));

        if (activeView === 'STUDENT') {
          const certRes = await axios.get('/api/user/certificates').catch(() => ({ data: [] }));
          setCertificates(Array.isArray(certRes.data) ? certRes.data : []);
        }
      } catch (error) {
        console.error('Dashboard fetch error:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, [activeView]);

  if (activeView === 'ADMIN') {
    return <AdminDashboard data={data} loading={loading} />;
  }

  if (activeView === 'INSTRUCTOR') {
    return <InstructorDashboard data={data} loading={loading} />;
  }

  return <StudentDashboard data={data} loading={loading} certificates={certificates} />;
};

const CourseSkeleton = () => (
  <div className="flex flex-col gap-4">
    {[1, 2].map((item) => (
      <div key={item} className="p-[1.5px] rounded-[1.5rem] bg-purple-50/20 dark:bg-slate-800/40 border border-purple-100/30 dark:border-slate-800/30 animate-pulse">
        <div className="bg-white dark:bg-slate-900 rounded-[calc(1.5rem-1.5px)] p-4 flex flex-col sm:flex-row gap-4 items-start sm:items-center">
          <div className="w-full sm:w-36 aspect-video shrink-0 rounded-xl bg-slate-105 dark:bg-slate-800" />
          <div className="flex-1 w-full space-y-2">
            <div className="h-3 w-16 bg-slate-105 dark:bg-slate-800 rounded" />
            <div className="h-4.5 w-3/4 bg-slate-105 dark:bg-slate-800 rounded" />
            <div className="h-3 w-28 bg-slate-105 dark:bg-slate-800 rounded" />
            <div className="mt-3.5 h-1 w-full bg-slate-105 dark:bg-slate-800 rounded-full" />
          </div>
        </div>
      </div>
    ))}
  </div>
);

const AdminStatLink = ({ to, icon: Icon, label, value, subtitle, color, loading = false }) => {
  if (loading) return <StatCard icon={Icon} label={label} value={value} subtitle={subtitle} color={color} loading />;

  return (
    <Link to={to} className="block rounded-2xl focus:outline-none focus:ring-2 focus:ring-purple-200 dark:focus:ring-purple-900">
      <StatCard icon={Icon} label={label} value={value} subtitle={subtitle} color={color} />
    </Link>
  );
};

const AdminTaskItem = ({ icon: Icon, label, value, to, color }) => {
  // Map older raw background colors to desaturated ones
  let parsedColor = color;
  if (color.includes('bg-rose-50')) {
    parsedColor = 'bg-rose-50 text-rose-600 dark:bg-rose-950/20 dark:text-rose-450 border border-rose-105/30';
  } else if (color.includes('bg-amber-50')) {
    parsedColor = 'bg-amber-50 text-amber-600 dark:bg-amber-950/20 dark:text-amber-450 border border-amber-105/30';
  } else if (color.includes('bg-sky-50')) {
    parsedColor = 'bg-sky-50 text-sky-600 dark:bg-sky-950/20 dark:text-sky-455 border border-sky-105/30';
  } else if (color.includes('bg-orange-50')) {
    parsedColor = 'bg-orange-50 text-orange-600 dark:bg-orange-950/20 dark:text-orange-450 border border-orange-105/30';
  }

  return (
    <div className="flex items-center gap-3.5 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-900/20 p-3.5 hover:border-slate-205 dark:hover:border-slate-705 transition duration-300">
      <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${parsedColor}`}>
        <Icon className="h-5 w-5" strokeWidth={1.5} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-xs font-semibold text-slate-800 dark:text-slate-350">{label}</p>
        <p className="text-lg font-bold text-slate-955 dark:text-slate-100 font-mono mt-0.5">{value}</p>
      </div>
      <Link to={to} className="rounded-full bg-purple-50 dark:bg-purple-950/30 px-4 py-1.5 text-xs font-semibold text-purple-700 dark:text-purple-400 border border-purple-100/50 dark:border-purple-900/30 hover:bg-purple-100 dark:hover:bg-purple-900/40 shadow-sm transition">
        Xem
      </Link>
    </div>
  );
};

const ListSkeleton = () => (
  <div className="space-y-4">
    {[1, 2, 3].map((item) => (
      <div key={item} className="flex animate-pulse items-center gap-3.5 pb-4 border-b border-slate-50 dark:border-slate-800/20 last:pb-0 last:border-none">
        <div className="h-10 w-10 rounded-xl bg-slate-100 dark:bg-slate-855" />
        <div className="flex-1 space-y-2.5">
          <div className="h-3 w-28 rounded bg-slate-100 dark:bg-slate-855" />
          <div className="h-3 w-40 rounded bg-slate-100 dark:bg-slate-855" />
        </div>
      </div>
    ))}
  </div>
);

const CourseDate = ({ label, value }) => (
  <div className="flex flex-col gap-0.5">
    <span className="text-[10px] text-slate-450 dark:text-slate-500 font-semibold uppercase tracking-wider">
      {label}
    </span>
    <span className="text-xs font-mono text-slate-700 dark:text-slate-300 font-medium">
      {formatDate(value)}
    </span>
  </div>
);

const QuestRow = ({ icon: Icon, title, subtitle, color, right, done, reward }) => {
  // Map older raw backgrounds/texts to desaturated pastels
  let parsedColor = color;
  if (color === 'bg-orange-50 text-orange-505' || color === 'bg-orange-50 text-orange-500') {
    parsedColor = 'bg-orange-50/80 text-orange-600 dark:bg-orange-950/20 dark:text-orange-400 border border-orange-100/30 dark:border-orange-900/20';
  } else if (color === 'bg-green-50 text-green-600' || color === 'bg-emerald-50 text-green-600') {
    parsedColor = 'bg-emerald-50/80 text-emerald-600 dark:bg-emerald-950/20 dark:text-emerald-400 border border-emerald-100/30 dark:border-emerald-900/20';
  } else if (color === 'bg-blue-50 text-blue-600') {
    parsedColor = 'bg-blue-50/80 text-blue-600 dark:bg-blue-950/20 dark:text-blue-400 border border-blue-100/30 dark:border-blue-900/20';
  } else if (color === 'bg-purple-50 text-purple-600') {
    parsedColor = 'bg-indigo-50/80 text-indigo-600 dark:bg-indigo-950/20 dark:text-indigo-400 border border-indigo-100/30 dark:border-indigo-900/20';
  }

  return (
    <div className="flex items-center gap-3.5">
      <div className={`flex h-9.5 w-9.5 shrink-0 items-center justify-center rounded-xl ${parsedColor}`}>
        <Icon className="h-4.5 w-4.5" strokeWidth={1.5} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">{title}</p>
        {subtitle && <p className="text-[10px] text-slate-400 dark:text-slate-500 font-medium mt-0.5">{subtitle}</p>}
      </div>
      {right ? (
        <span className="text-sm font-bold text-slate-900 dark:text-slate-200 font-mono">{right}</span>
      ) : (
        <div className="shrink-0 text-right flex flex-col items-end">
          <p className="text-[10px] font-bold text-slate-900 dark:text-slate-200 font-mono">{reward}</p>
          <span className={`text-[10px] font-semibold mt-0.5 px-2 py-0.5 rounded-full ${
            done 
              ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/20 dark:text-emerald-400 border border-emerald-100/30' 
              : 'bg-slate-50 text-slate-400 dark:bg-slate-900 dark:text-slate-550 border border-slate-100 dark:border-slate-850'
          }`}>
            {done ? 'Đã xong' : 'Chưa xong'}
          </span>
        </div>
      )}
    </div>
  );
};

const Avatar = ({ name = '' }) => (
  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-800 font-semibold text-slate-700 dark:text-slate-200 border border-slate-200/40 dark:border-slate-700/40 shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
    {(name || 'A').trim().charAt(0).toUpperCase()}
  </div>
);

const StatusPill = ({ active }) => (
  <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-semibold tracking-wide ${
    active 
      ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/20 dark:text-emerald-450 border border-emerald-100/30 dark:border-emerald-900/20' 
      : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 border border-slate-200/40 dark:border-slate-700/30'
  }`}>
    {active ? 'Công khai' : 'Nháp'}
  </span>
);

const OverviewRow = ({ icon: Icon, label, value, color }) => {
  const classes = {
    purple: 'bg-indigo-50/40 text-indigo-600 dark:bg-indigo-950/20 dark:text-indigo-400',
    blue: 'bg-blue-50/40 text-blue-600 dark:bg-blue-950/20 dark:text-blue-400',
    amber: 'bg-amber-50/40 text-amber-600 dark:bg-amber-950/20 dark:text-amber-400',
  };

  return (
    <div className="flex items-center justify-between rounded-xl border border-slate-100 dark:border-slate-800/80 bg-slate-50/30 dark:bg-slate-900/10 p-4 transition hover:bg-slate-50/50 dark:hover:bg-slate-900/20 duration-300">
      <div className="flex items-center gap-3.5">
        <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${classes[color]}`}>
          <Icon className="h-4.5 w-4.5" strokeWidth={1.5} />
        </div>
        <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">{label}</span>
      </div>
      <span className="text-sm font-bold tracking-tight text-slate-900 dark:text-slate-100 font-mono">{value}</span>
    </div>
  );
};

export default Dashboard;
