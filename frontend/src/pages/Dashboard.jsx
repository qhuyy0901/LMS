import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import {
  ArrowUpRight,
  Award,
  BarChart2,
  BookOpen,
  CalendarDays,
  Check,
  DollarSign,
  FileCheck,
  Flame,
  GraduationCap,
  Play,
  ShoppingCart,
  TrendingUp,
  Users,
  Wallet,
  Webhook,
} from 'lucide-react';
import { useDashboardView } from '../context/DashboardViewContext';
import { StatCard } from '../components/StatCard';
import { getFileUrl } from '../utils/fileUtils';

const formatCurrency = (amount = 0) =>
  new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(amount);

const envApiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
const MVC_BASE_URL = envApiUrl.endsWith('/api') ? envApiUrl.slice(0, -4) : envApiUrl.replace(/\/$/, '');

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

const normalizeDashboardData = (view, payload) => {
  if (view === 'ADMIN') {
    return {
      stats: {
        totalUsers: payload.totalUsers ?? 0,
        totalCourses: payload.totalCourses ?? 0,
        totalEnrollments: payload.totalEnrollments ?? 0,
        totalRevenue: payload.totalRevenue ?? 0,
        totalRevenueFormatted: formatCurrency(payload.totalRevenue ?? 0),
        pendingPayments: payload.pendingPayments ?? 0,
      },
      recentUsers: payload.recentUsers ?? [],
    };
  }

  if (view === 'INSTRUCTOR') {
    return {
      stats: {
        totalRevenue: payload.tongDoanhThu ?? payload.totalRevenue ?? 0,
        totalRevenueFormatted: formatCurrency(payload.tongDoanhThu ?? payload.totalRevenue ?? 0),
        totalStudents: payload.tongHocVien ?? payload.totalStudents ?? 0,
        publishedCourses: payload.khoaHocCongKhai ?? payload.publishedCourses ?? 0,
        draftCourses: payload.khoaHocBanNhap ?? payload.draftCourses ?? 0,
      },
      courses: (payload.khoaHocCuaToi ?? payload.courses ?? []).map((course) => ({
        id: course.id,
        title: course.title ?? course.tieuDe ?? course.tenKhoaHoc,
        enrollments: course.enrollments ?? course.soHocVien ?? course.studentCount ?? 0,
        lessons: course.lessons ?? course.soBaiHoc ?? course.lessonCount ?? 0,
        isPublished: course.isPublished ?? course.congKhai ?? course.status === 'PUBLISHED',
      })),
      recentEnrollments: (payload.hocVienMoi ?? payload.recentEnrollments ?? []).map((enrollment) => ({
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
      weeklyPurchaseCompleted: payload.weeklyPurchaseCompleted ?? false,
    },
    recentCourses: (payload.recentCourses ?? []).map((course) => ({
      ...course,
      progress: Math.min(100, Math.max(0, Math.round(course.progress ?? 0))),
      startedAt: course.purchasedAt ?? course.enrolledAt ?? course.courseStartDate,
    })),
  };
};

// ─── Student Dashboard ──────────────────────────────────────────────────────

const StudentDashboard = ({ data, loading }) => {
  const stats = data?.stats;
  const recentCourses = data?.recentCourses || [];

  return (
    <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
      {/* Main column */}
      <div className="xl:col-span-2 space-y-6 animate-fade-in-up">
        {/* Premium Banner */}
        <div className="bg-gradient-to-r from-purple-100 via-purple-50 to-pink-50 rounded-2xl p-8 flex items-center justify-between overflow-hidden relative transition-all duration-500 hover:shadow-xl hover:shadow-purple-100/50 group">
          <div className="absolute inset-0 bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
          <div className="relative z-10 max-w-md transition-transform duration-500 group-hover:translate-x-2">
            <h2 className="text-2xl md:text-3xl font-semibold tracking-tight text-purple-900 mb-3">
              Mở khóa hơn 1.000 khóa học cao cấp ngay hôm nay
            </h2>
            <p className="text-sm text-slate-600 mb-6 leading-relaxed">
              Học từ các chuyên gia hàng đầu với nội dung độc quyền được thiết kế để nâng cao kỹ năng của bạn.
            </p>
            <Link
              to="/upgrade"
              className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-3 rounded-full text-sm font-medium inline-flex items-center gap-2 transition-all duration-300 hover:scale-105 hover:shadow-lg"
            >
              Nâng cấp Premium
              <ArrowUpRight className="w-4 h-4 transition-transform group-hover:translate-x-1 group-hover:-translate-y-1" />
            </Link>
          </div>
          <div className="hidden md:flex items-center justify-center w-64 h-48 relative">
            <div className="text-7xl animate-float">🧑‍💻</div>
            <div className="absolute top-2 right-8 text-3xl animate-float" style={{ animationDelay: '1s' }}>📚</div>
            <div className="absolute bottom-4 left-4 text-2xl animate-float" style={{ animationDelay: '2s' }}>📖</div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <StatCard
            icon={Check}
            label="Khóa học"
            value={
              loading
                ? '...'
                : `${stats?.completedCourses ?? 0} / ${stats?.totalEnrolled ?? 0}`
            }
            subtitle="Hoàn thành"
            color="bg-green-100 text-green-600"
            loading={loading}
          />
          <StatCard
            icon={Award}
            label="Chứng chỉ"
            value={loading ? '...' : stats?.certificates ?? 0}
            subtitle="Đã đạt được"
            color="bg-amber-100 text-amber-600"
            loading={loading}
          />
          <StatCard
            icon={CalendarDays}
            label="Sự kiện"
            value={loading ? '...' : stats?.participatedEvents ?? 0}
            subtitle="Đã tham gia"
            color="bg-purple-100 text-purple-600"
            loading={loading}
          />
        </div>

        {/* Continue Watching */}
        <div className="bg-white rounded-2xl p-6 border border-slate-100 transition-all duration-300 hover:shadow-lg">
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-xl font-semibold tracking-tight text-slate-900">Tiếp tục học</h3>
            <Link to="/my-courses" className="text-sm text-purple-600 font-medium hover:underline">
              Xem tất cả
            </Link>
          </div>
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="animate-pulse">
                  <div className="aspect-video rounded-xl bg-slate-100 mb-3" />
                  <div className="h-3 w-24 bg-slate-100 rounded mb-2" />
                  <div className="h-4 w-36 bg-slate-100 rounded" />
                </div>
              ))}
            </div>
          ) : recentCourses.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {recentCourses.map((course) => (
                <Link
                  key={course.courseId}
                  to={`/learn/${course.courseId}`}
                  className="group cursor-pointer rounded-xl border border-slate-100 p-3 transition hover:-translate-y-1 hover:shadow-md"
                >
                  <div className="relative aspect-video rounded-xl overflow-hidden bg-gradient-to-br from-purple-200 to-violet-300 mb-3 transition-all duration-300 group-hover:shadow-lg group-hover:-translate-y-1">
                    {course.thumbnail ? (
                      <img src={getFileUrl(course.thumbnail)} alt={course.title} className="w-full h-full object-cover" />
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <BookOpen className="h-10 w-10 text-purple-500" />
                      </div>
                    )}
                    <div className="absolute bottom-2 left-2 right-2 flex items-center gap-2 text-xs text-white opacity-90">
                      <Play className="w-3 h-3 fill-white" />
                      <div className="flex-1 h-1 bg-white/30 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-white rounded-full transition-all duration-500"
                          style={{ width: `${course.progress}%` }}
                        />
                      </div>
                      <span>{course.progress}%</span>
                    </div>
                  </div>
                  <p className="mb-1 text-xs text-slate-400">
                    {course.category} · {course.totalLessons} bài học
                  </p>
                  <p className="text-sm font-medium text-slate-900 line-clamp-2 transition-colors group-hover:text-purple-600">
                    {course.title}
                  </p>
                  <p className="mt-1 truncate text-xs text-slate-400">{course.instructorName}</p>
                  <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-slate-100">
                    <div className="h-full rounded-full bg-purple-600" style={{ width: `${course.progress}%` }} />
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-2 text-[11px] text-slate-500">
                    <div>
                      <span className="flex items-center gap-1 text-slate-400">
                        <CalendarDays className="h-3 w-3" />
                        Bắt đầu
                      </span>
                      <span className="mt-0.5 block font-medium text-slate-700">{formatDate(course.startedAt)}</span>
                    </div>
                    <div>
                      <span className="flex items-center gap-1 text-slate-400">
                        <CalendarDays className="h-3 w-3" />
                        Kết thúc
                      </span>
                      <span className="mt-0.5 block font-medium text-slate-700">{formatDate(course.courseEndDate)}</span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-slate-400">
              <BookOpen className="w-8 h-8 mx-auto mb-2 text-slate-300" />
              <p className="text-sm">Bạn chưa đăng ký khóa học nào.</p>
              <Link to="/explore" className="text-purple-600 text-sm font-medium hover:underline mt-1 inline-block">
                Khám phá ngay →
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* Right column */}
      <div className="space-y-6 animate-fade-in-up delay-100">
        {/* Wallet Quick View */}
        <div className="bg-white rounded-2xl p-6 border border-slate-100 transition-all duration-300 hover:shadow-lg hover:-translate-y-1">
          <h3 className="text-xl font-semibold tracking-tight text-slate-900 mb-4">Ví của tôi</h3>
          {loading ? (
            <div className="animate-pulse space-y-3">
              <div className="h-8 w-32 bg-slate-100 rounded" />
              <div className="h-4 w-24 bg-slate-100 rounded" />
            </div>
          ) : (
            <>
              <p className="text-3xl font-bold text-slate-900 mb-1">
                {formatCurrency(stats?.walletBalance ?? 0)}
              </p>
              <p className="text-xs text-slate-400 mb-4">
                Đã chi: {formatCurrency(stats?.totalSpent ?? 0)}
              </p>
              <a
                href={`${MVC_BASE_URL}/student/wallet`}
                className="w-full bg-purple-600 hover:bg-purple-700 text-white py-3 rounded-xl text-sm font-medium flex items-center justify-center gap-2 transition-all hover:shadow-lg"
              >
                <Wallet className="w-4 h-4" />
                Nạp ví
              </a>
            </>
          )}
        </div>

        {/* Daily Quest */}
        <div className="bg-white rounded-2xl p-6 border border-slate-100 transition-all duration-300 hover:shadow-lg hover:-translate-y-1">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="text-xl font-semibold tracking-tight text-slate-900">Nhiệm vụ hằng ngày</h3>
            </div>
            <Link to="/events" className="text-sm font-medium text-purple-600 hover:text-purple-700">Đổi điểm</Link>
          </div>
          <div className="space-y-5">
            <div>
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-lg bg-orange-50 flex items-center justify-center shrink-0">
                  <Flame className="w-5 h-5 text-orange-500" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-slate-900">Đăng nhập học mỗi ngày</p>
                  <p className="text-xs text-orange-600">
                    Chuỗi {stats?.loginStreak ?? 0} ngày · Ngày kế tiếp +{stats?.nextLoginReward ?? 3} điểm
                  </p>
                </div>
                <span className="text-lg font-bold text-purple-700">{stats?.rewardPoints ?? 0}/100</span>
              </div>
              <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-purple-500 rounded-full transition-all duration-500"
                  style={{
                    width: `${Math.min(100, stats?.rewardPoints ?? 0)}%`,
                  }}
                />
              </div>
              <div className="mt-4 grid grid-cols-8 gap-1.5">
                {[3, 4, 5, 6, 7, 8, 9, 10].map((points, index) => (
                  <div key={points} className="text-center">
                    <div className={`mx-auto flex h-7 w-7 items-center justify-center rounded-full text-[10px] font-semibold ${
                      (stats?.loginStreak ?? 0) > index ? 'bg-purple-600 text-white' : 'bg-slate-100 text-slate-400'
                    }`}>
                      +{points}
                    </div>
                    <span className="mt-1 block text-[9px] text-slate-400">N{index + 1}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="border-t border-slate-100 pt-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-green-50 flex items-center justify-center shrink-0">
                  <BookOpen className="w-5 h-5 text-green-600" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-slate-900">Hoàn thành 1 bài học mỗi ngày</p>
                  <p className="text-xs text-green-600">+5 điểm</p>
                </div>
                <div className={`flex h-7 w-7 items-center justify-center rounded-full ${
                  stats?.dailyLessonCompleted ? 'bg-green-500 text-white' : 'bg-slate-100 text-slate-400'
                }`}>
                  {stats?.dailyLessonCompleted ? <Check className="h-4 w-4" /> : <span className="text-xs">0/1</span>}
                </div>
              </div>
            </div>

            <div className="border-t border-slate-100 pt-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center shrink-0">
                  <ShoppingCart className="w-5 h-5 text-blue-600" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-slate-900">Mua 1 khóa học bất kỳ mỗi tuần</p>
                  <p className="text-xs text-blue-600">+15 điểm</p>
                </div>
                <div className={`flex h-7 w-7 items-center justify-center rounded-full ${
                  stats?.weeklyPurchaseCompleted ? 'bg-blue-500 text-white' : 'bg-slate-100 text-slate-400'
                }`}>
                  {stats?.weeklyPurchaseCompleted ? <Check className="h-4 w-4" /> : <span className="text-xs">0/1</span>}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// ─── Instructor Dashboard ───────────────────────────────────────────────────

const InstructorDashboard = ({ data, loading }) => {
  const stats = data?.stats;
  const courses = data?.courses || [];
  const recentEnrollments = data?.recentEnrollments || [];

  return (
    <div className="space-y-6 animate-fade-in-up">
      <div className="rounded-2xl border border-purple-100 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-purple-600">Khu vực giảng viên</p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-900">Quản lý và tạo khóa học</h2>
            <p className="mt-1 text-sm text-slate-500">
              Vào trang quản lý để chỉnh sửa khóa học hiện có hoặc tạo khóa học mới cho học viên.
            </p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Link
              to="/instructor"
              className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              Quản lý khóa học
            </Link>
            <Link
              to="/instructor/courses/new"
              className="inline-flex items-center justify-center rounded-xl bg-purple-600 px-5 py-3 text-sm font-semibold text-white hover:bg-purple-700"
            >
              Tạo khóa học mới
            </Link>
          </div>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={DollarSign} label="Tổng doanh thu" value={stats?.totalRevenueFormatted || '₫0'} subtitle="+12% so với tháng trước" color="bg-emerald-50 text-emerald-600" loading={loading} />
        <StatCard icon={Users} label="Tổng học viên" value={stats?.totalStudents ?? 0} subtitle="Đã đăng ký" color="bg-blue-50 text-blue-600" loading={loading} />
        <StatCard icon={BookOpen} label="Khóa học" value={`${stats?.publishedCourses ?? 0} công khai`} subtitle={`${stats?.draftCourses ?? 0} bản nháp`} color="bg-purple-50 text-purple-600" loading={loading} />
        <StatCard icon={TrendingUp} label="Đánh giá TB" value="4.8/5" subtitle="Từ học viên" color="bg-amber-50 text-amber-600" loading={loading} />
      </div>

      {/* Recent Enrollments */}
      <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm">
        <h3 className="font-semibold text-slate-900 mb-4">Học viên mới đăng ký</h3>
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center gap-3 animate-pulse">
                <div className="w-10 h-10 rounded-full bg-slate-100" />
                <div className="flex-1 space-y-2">
                  <div className="h-3 w-28 bg-slate-100 rounded" />
                  <div className="h-3 w-40 bg-slate-100 rounded" />
                </div>
              </div>
            ))}
          </div>
        ) : recentEnrollments.length > 0 ? (
          <div className="space-y-4">
            {recentEnrollments.map((e, i) => (
              <div key={i} className="flex items-center gap-3 p-3 rounded-xl hover:bg-slate-50 transition-colors">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-300 to-cyan-300 flex items-center justify-center text-white font-bold shrink-0">
                  {e.studentName?.charAt(0)?.toUpperCase() || '?'}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-900 truncate">{e.studentName}</p>
                  <p className="text-xs text-slate-400 truncate">{e.courseTitle}</p>
                </div>
                <span className="text-xs text-slate-400 shrink-0">
                  {new Date(e.enrolledAt).toLocaleDateString('vi-VN')}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-slate-400 text-center py-4">Chưa có học viên mới.</p>
        )}
      </div>

      {/* Course Quick List */}
      <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden shadow-sm">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <h3 className="font-semibold text-slate-900">Khóa học của bạn</h3>
          <Link to="/instructor" className="text-sm text-purple-600 font-medium hover:underline">
            Quản lý →
          </Link>
        </div>
        <div className="divide-y divide-slate-50">
          {loading ? (
            [1, 2, 3].map((i) => (
              <div key={i} className="p-4 flex items-center gap-3 animate-pulse">
                <div className="w-10 h-10 rounded-lg bg-slate-100" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-40 bg-slate-100 rounded" />
                  <div className="h-3 w-20 bg-slate-100 rounded" />
                </div>
              </div>
            ))
          ) : courses.length > 0 ? (
            courses.slice(0, 5).map((c) => (
              <Link
                key={c.id}
                to={`/instructor/courses/${c.id}`}
                className="p-4 flex items-center gap-3 hover:bg-slate-50 transition-colors"
              >
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-purple-100 to-pink-100 flex items-center justify-center shrink-0">
                  <BookOpen className="w-5 h-5 text-purple-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-900 truncate">{c.title}</p>
                  <p className="text-xs text-slate-400">{c.enrollments} học viên · {c.lessons} bài</p>
                </div>
                {c.isPublished ? (
                  <span className="text-[10px] font-semibold bg-emerald-50 text-emerald-700 px-2 py-1 rounded-full">Công khai</span>
                ) : (
                  <span className="text-[10px] font-semibold bg-slate-100 text-slate-500 px-2 py-1 rounded-full">Nháp</span>
                )}
              </Link>
            ))
          ) : (
            <div className="p-6 text-center text-sm text-slate-400">Chưa có khóa học nào.</div>
          )}
        </div>
      </div>
    </div>
  );
};

// ─── Admin Dashboard ────────────────────────────────────────────────────────

const AdminDashboard = ({ data, loading }) => {
  const stats = data?.stats;
  const recentUsers = data?.recentUsers || [];

  const ROLE_LABELS = {
    STUDENT: 'Học viên',
    INSTRUCTOR: 'Giảng viên',
    ADMIN: 'Admin',
  };

  return (
    <div className="space-y-6 animate-fade-in-up">
      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={Users} label="Tổng người dùng" value={stats?.totalUsers ?? 0} subtitle="Toàn hệ thống" color="bg-blue-50 text-blue-600" loading={loading} />
        <StatCard icon={BookOpen} label="Tổng khóa học" value={stats?.totalCourses ?? 0} subtitle="Tất cả trạng thái" color="bg-purple-50 text-purple-600" loading={loading} />
        <StatCard icon={DollarSign} label="Doanh thu" value={stats?.totalRevenueFormatted || '₫0'} subtitle="Tổng giao dịch hoàn tất" color="bg-emerald-50 text-emerald-600" loading={loading} />
        <StatCard icon={Webhook} label="GD chờ xử lý" value={stats?.pendingPayments ?? 0} subtitle="Webhook PENDING" color="bg-orange-50 text-orange-600" loading={loading} />
      </div>

      {/* Platform Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Users */}
        <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-slate-900">Người dùng mới nhất</h3>
            <Link to="/admin/users" className="text-sm text-purple-600 font-medium hover:underline">
              Tất cả →
            </Link>
          </div>
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center gap-3 animate-pulse">
                  <div className="w-10 h-10 rounded-full bg-slate-100" />
                  <div className="flex-1 space-y-2">
                    <div className="h-3 w-28 bg-slate-100 rounded" />
                    <div className="h-3 w-36 bg-slate-100 rounded" />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-3">
              {recentUsers.map((u) => (
                <div key={u.id} className="flex items-center gap-3 p-3 rounded-xl hover:bg-slate-50 transition-colors">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-300 to-pink-300 flex items-center justify-center text-white font-bold shrink-0">
                    {u.name?.charAt(0)?.toUpperCase() || '?'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-900 truncate">{u.name}</p>
                    <p className="text-xs text-slate-400 truncate">{u.email}</p>
                  </div>
                  <span className="text-[10px] font-semibold bg-slate-100 text-slate-600 px-2 py-1 rounded-full">
                    {ROLE_LABELS[u.role] || u.role}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Quick Stats Card */}
        <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm">
          <h3 className="font-semibold text-slate-900 mb-4">Tổng quan nền tảng</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 rounded-xl bg-gradient-to-r from-purple-50 to-pink-50 border border-purple-100">
              <div className="flex items-center gap-3">
                <GraduationCap className="w-5 h-5 text-purple-600" />
                <span className="text-sm font-medium text-slate-900">Tổng lượt ghi danh</span>
              </div>
              <span className="text-lg font-bold text-purple-700">{stats?.totalEnrollments ?? 0}</span>
            </div>
            <div className="flex items-center justify-between p-4 rounded-xl bg-gradient-to-r from-blue-50 to-cyan-50 border border-blue-100">
              <div className="flex items-center gap-3">
                <BarChart2 className="w-5 h-5 text-blue-600" />
                <span className="text-sm font-medium text-slate-900">Người dùng hoạt động</span>
              </div>
              <span className="text-lg font-bold text-blue-700">{stats?.totalUsers ?? 0}</span>
            </div>
            <div className="flex items-center justify-between p-4 rounded-xl bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-100">
              <div className="flex items-center gap-3">
                <FileCheck className="w-5 h-5 text-amber-600" />
                <span className="text-sm font-medium text-slate-900">Khóa học trên hệ thống</span>
              </div>
              <span className="text-lg font-bold text-amber-700">{stats?.totalCourses ?? 0}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// ─── Main Dashboard Container ───────────────────────────────────────────────

const Dashboard = () => {
  const { activeView } = useDashboardView();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    setData(null);

    const fetchStats = async () => {
      try {
        const response = await axios.get(getDashboardEndpoint(activeView));
        setData(normalizeDashboardData(activeView, response.data));
      } catch (error) {
        console.error('Dashboard fetch error:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, [activeView]);

  // Decide which sub-dashboard to render based on the current view
  const viewToRender = activeView;

  return (
    <div>
      {viewToRender !== 'INSTRUCTOR' && (
        <div className="mb-6">
          <h1 className="mb-1 text-2xl font-semibold tracking-tight text-slate-900 md:text-3xl">
            {viewToRender === 'ADMIN' ? 'Dashboard Quản trị' : 'Bảng điều khiển'}
          </h1>
          <p className="text-sm text-slate-500">
            {viewToRender === 'ADMIN'
              ? 'Tổng quan hoạt động toàn hệ thống Skillio'
              : 'Chào mừng quay trở lại! Tiếp tục hành trình học tập nào.'}
          </p>
        </div>
      )}

      {viewToRender === 'ADMIN' ? (
        <AdminDashboard data={data} loading={loading} />
      ) : viewToRender === 'INSTRUCTOR' ? (
        <InstructorDashboard data={data} loading={loading} />
      ) : (
        <StudentDashboard data={data} loading={loading} />
      )}
    </div>
  );
};

export default Dashboard;
