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
  Eye,
  EyeOff,
  FileCheck,
  Flame,
  GraduationCap,
  Play,
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
        totalRevenue: adminStats.totalRevenue ?? 0,
        totalRevenueFormatted: adminStats.totalRevenueFormatted ?? formatCurrency(adminStats.totalRevenue ?? 0),
        pendingPayments: adminStats.pendingPayments ?? 0,
      },
      recentUsers: payload.recentUsers ?? [],
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
};

const StudentDashboard = ({ data, loading }) => {
  const stats = data?.stats;
  const recentCourses = data?.recentCourses || [];
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
      color: 'bg-orange-50 text-orange-500',
    },
    {
      icon: BookOpen,
      title: 'Hoàn thành 1 bài học mỗi ngày',
      subtitle: '',
      reward: '+5 điểm',
      done: Boolean(stats?.dailyLessonCompleted),
      color: 'bg-green-50 text-green-600',
    },
    {
      icon: FileCheck,
      title: 'Làm quiz đạt yêu cầu',
      subtitle: '',
      reward: '+10 điểm',
      done: Boolean(stats?.dailyQuizPassed),
      color: 'bg-blue-50 text-blue-600',
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
      <div className="space-y-6 xl:col-span-2">
        <section className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-purple-100 via-purple-50 to-pink-50 p-8">
          <div className="relative z-10 max-w-xl">
            <h2 className="mb-3 text-2xl font-semibold tracking-tight text-purple-950 md:text-3xl">
              Mở khóa hơn 1.000 khóa học cao cấp ngay hôm nay
            </h2>

            <Link
              to="/upgrade"
              className="inline-flex items-center gap-2 rounded-full bg-purple-600 px-6 py-3 text-sm font-medium text-white transition hover:bg-purple-700"
            >
              Nâng cấp Premium
              <ArrowUpRight className="h-4 w-4" />
            </Link>
          </div>
          <div className="absolute right-10 top-1/2 hidden -translate-y-1/2 gap-3 md:grid">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white/70 text-purple-600 shadow-sm">
              <GraduationCap className="h-8 w-8" />
            </div>
            <div className="ml-16 flex h-14 w-14 items-center justify-center rounded-2xl bg-white/70 text-pink-500 shadow-sm">
              <BookOpen className="h-7 w-7" />
            </div>
          </div>
        </section>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <StatCard
            icon={Check}
            label="Khóa học"
            value={loading ? '...' : `${stats?.completedCourses ?? 0} / ${stats?.totalEnrolled ?? 0}`}
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

        <section className="rounded-2xl border border-slate-100 bg-white p-6">
          <div className="mb-5 flex items-center justify-between">
            <h3 className="text-xl font-semibold tracking-tight text-slate-900">Tiếp tục học</h3>
            <Link to="/my-courses" className="text-sm font-medium text-purple-600 hover:underline">
              Xem tất cả
            </Link>
          </div>
          {loading ? (
            <CourseSkeleton />
          ) : recentCourses.length > 0 ? (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {recentCourses.map((course) => (
                <Link
                  key={course.courseId}
                  to={`/learn/${course.courseId}`}
                  className="group rounded-xl border border-slate-100 p-3 transition hover:-translate-y-1 hover:shadow-md"
                >
                  <div className="relative mb-3 aspect-video overflow-hidden rounded-xl bg-gradient-to-br from-purple-200 to-violet-300">
                    {course.thumbnail ? (
                      <img src={getFileUrl(course.thumbnail)} alt={course.title} className="h-full w-full object-cover" />
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <BookOpen className="h-10 w-10 text-purple-500" />
                      </div>
                    )}
                    <div className="absolute bottom-2 left-2 right-2 flex items-center gap-2 text-xs text-white">
                      <Play className="h-3 w-3 fill-white" />
                      <div className="h-1 flex-1 overflow-hidden rounded-full bg-white/30">
                        <div className="h-full rounded-full bg-white" style={{ width: `${course.progress}%` }} />
                      </div>
                      <span>{course.progress}%</span>
                    </div>
                  </div>
                  <p className="mb-1 text-xs text-slate-400">
                    {course.category || 'Khóa học'} · {course.totalLessons || 0} bài học
                  </p>
                  <p className="line-clamp-2 text-sm font-medium text-slate-900 group-hover:text-purple-600">{course.title}</p>
                  <p className="mt-1 truncate text-xs text-slate-400">{course.instructorName}</p>
                  <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-slate-100">
                    <div className="h-full rounded-full bg-purple-600" style={{ width: `${course.progress}%` }} />
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-2 text-[11px] text-slate-500">
                    <CourseDate label="Bắt đầu" value={course.startedAt} />
                    <CourseDate label="Kết thúc" value={course.courseEndDate} />
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="py-8 text-center text-slate-400">
              <BookOpen className="mx-auto mb-2 h-8 w-8 text-slate-300" />
              <p className="text-sm">Bạn chưa đăng ký khóa học nào.</p>
              <Link to="/explore" className="mt-1 inline-block text-sm font-medium text-purple-600 hover:underline">
                Khám phá ngay
              </Link>
            </div>
          )}
        </section>
      </div>

      <aside className="space-y-6">
        <section className="rounded-2xl border border-slate-100 bg-white p-6">
          <div className="mb-4 flex items-center justify-between gap-3">
            <h3 className="text-xl font-semibold tracking-tight text-slate-900">Ví của tôi</h3>
            {!loading && (
              <button
                type="button"
                onClick={() => setShowWalletAmounts((current) => !current)}
                className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-slate-200 text-slate-500 transition hover:border-purple-200 hover:bg-purple-50 hover:text-purple-600 focus:outline-none focus:ring-2 focus:ring-purple-200"
                title={showWalletAmounts ? 'Ẩn số tiền' : 'Hiện số tiền'}
                aria-label={showWalletAmounts ? 'Ẩn số tiền trong ví' : 'Hiện số tiền trong ví'}
                aria-pressed={!showWalletAmounts}
              >
                {showWalletAmounts ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            )}
          </div>
          {loading ? (
            <div className="space-y-3">
              <div className="h-8 w-32 animate-pulse rounded bg-slate-100" />
              <div className="h-4 w-24 animate-pulse rounded bg-slate-100" />
            </div>
          ) : (
            <>
              <p className="mb-1 text-3xl font-bold text-slate-900">
                {showWalletAmounts ? formatCurrency(stats?.walletBalance ?? 0) : '••••••'}
              </p>
              <p className="mb-4 text-xs text-slate-400">
                Đã chi: {showWalletAmounts ? formatCurrency(stats?.totalSpent ?? 0) : '••••••'}
              </p>
              <Link
                to="/upgrade"
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-purple-600 py-3 text-sm font-medium text-white transition hover:bg-purple-700"
              >
                <Wallet className="h-4 w-4" />
                Nạp ví
              </Link>
            </>
          )}
        </section>

        <section className="rounded-2xl border border-slate-100 bg-white p-6">
          <div className="mb-5 flex items-center justify-between">
            <h3 className="text-xl font-semibold tracking-tight text-slate-900">Nhiệm vụ hằng ngày</h3>
            <Link to="/events" className="text-sm font-medium text-purple-600 hover:text-purple-700">
              Đổi điểm
            </Link>
          </div>
          <div className="space-y-5">
            <QuestRow
              icon={Award}
              title="Điểm học tập hiện có"
              subtitle=""
              color="bg-purple-50 text-purple-600"
              right={`${learningPoints} điểm`}
            />
            {dailyTasks.map((task) => (
              <QuestRow key={task.title} {...task} />
            ))}
          </div>
        </section>
      </aside>
    </div>
  );
};

const InstructorDashboard = ({ data, loading }) => {
  const stats = data?.stats;
  const courses = data?.courses || [];
  const recentEnrollments = data?.recentEnrollments || [];

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-purple-100 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-purple-600">Khu vực giảng viên</p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-900">Quản lý và tạo khóa học</h2>
            <p className="mt-1 text-sm text-slate-500">Theo dõi doanh thu, học viên mới và trạng thái khóa học của bạn.</p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Link to="/instructor/courses" className="rounded-xl border border-slate-200 bg-white px-5 py-3 text-center text-sm font-semibold text-slate-700 hover:bg-slate-50">
              Quản lý khóa học
            </Link>
            <Link to="/instructor/courses/new" className="rounded-xl bg-purple-600 px-5 py-3 text-center text-sm font-semibold text-white hover:bg-purple-700">
              Tạo khóa học mới
            </Link>
          </div>
        </div>
      </section>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={DollarSign} label="Tổng doanh thu" value={stats?.totalRevenueFormatted || formatCurrency(0)} subtitle="Từ khóa học đã bán" color="bg-emerald-50 text-emerald-600" loading={loading} />
        <StatCard icon={Users} label="Tổng học viên" value={stats?.totalStudents ?? 0} subtitle="Đã ghi danh" color="bg-blue-50 text-blue-600" loading={loading} />
        <StatCard icon={BookOpen} label="Khóa học công khai" value={stats?.publishedCourses ?? 0} subtitle={`${stats?.draftCourses ?? 0} bản nháp`} color="bg-purple-50 text-purple-600" loading={loading} />
        <StatCard icon={TrendingUp} label="Đánh giá TB" value={stats?.averageRating ? `${Number(stats.averageRating).toFixed(1)}/5` : 'Chưa có'} subtitle="Từ học viên" color="bg-amber-50 text-amber-600" loading={loading} />
      </div>

      <section className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
        <h3 className="mb-4 font-semibold text-slate-900">Học viên mới đăng ký</h3>
        {loading ? (
          <ListSkeleton />
        ) : recentEnrollments.length > 0 ? (
          <div className="space-y-4">
            {recentEnrollments.map((enrollment, index) => (
              <div key={enrollment.id || index} className="flex items-center gap-3 rounded-xl p-3 transition hover:bg-slate-50">
                <Avatar name={enrollment.studentName} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-slate-900">{enrollment.studentName}</p>
                  <p className="truncate text-xs text-slate-400">{enrollment.courseTitle}</p>
                </div>
                <span className="shrink-0 text-xs text-slate-400">{formatDate(enrollment.enrolledAt)}</span>
              </div>
            ))}
          </div>
        ) : (
          <p className="py-4 text-center text-sm text-slate-400">Chưa có học viên mới.</p>
        )}
      </section>

      <section className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-100 p-5">
          <h3 className="font-semibold text-slate-900">Khóa học của bạn</h3>
          <Link to="/instructor/courses" className="text-sm font-medium text-purple-600 hover:underline">
            Quản lý
          </Link>
        </div>
        {loading ? (
          <div className="p-4">
            <ListSkeleton />
          </div>
        ) : courses.length > 0 ? (
          <div className="divide-y divide-slate-50">
            {courses.slice(0, 5).map((course) => (
              <Link key={course.id} to={`/instructor/courses/${course.id}`} className="flex items-center gap-3 p-4 transition hover:bg-slate-50">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-purple-100 to-pink-100">
                  <BookOpen className="h-5 w-5 text-purple-600" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-slate-900">{course.title}</p>
                  <p className="text-xs text-slate-400">{course.enrollments} học viên · {course.lessons} bài</p>
                </div>
                <StatusPill active={course.isPublished} />
              </Link>
            ))}
          </div>
        ) : (
          <div className="p-6 text-center text-sm text-slate-400">Chưa có khóa học nào.</div>
        )}
      </section>
    </div>
  );
};

const AdminDashboard = ({ data, loading }) => {
  const stats = data?.stats;
  const recentUsers = data?.recentUsers || [];
  const roleLabels = {
    STUDENT: 'Học viên',
    INSTRUCTOR: 'Giảng viên',
    ADMIN: 'Admin',
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="mb-1 text-2xl font-semibold tracking-tight text-slate-900 md:text-3xl">Dashboard Quản trị</h1>
        <p className="text-sm text-slate-500">Tổng quan hoạt động toàn hệ thống Skillio.</p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={Users} label="Tổng người dùng" value={stats?.totalUsers ?? 0} subtitle="Toàn hệ thống" color="bg-blue-50 text-blue-600" loading={loading} />
        <StatCard icon={BookOpen} label="Tổng khóa học" value={stats?.totalCourses ?? 0} subtitle="Tất cả trạng thái" color="bg-purple-50 text-purple-600" loading={loading} />
        <StatCard icon={DollarSign} label="Doanh thu" value={stats?.totalRevenueFormatted || formatCurrency(0)} subtitle="Giao dịch hoàn tất" color="bg-emerald-50 text-emerald-600" loading={loading} />
        <StatCard icon={Webhook} label="GD chờ xử lý" value={stats?.pendingPayments ?? 0} subtitle="Webhook PENDING" color="bg-orange-50 text-orange-600" loading={loading} />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <section className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="font-semibold text-slate-900">Người dùng mới nhất</h3>
            <Link to="/admin/users" className="text-sm font-medium text-purple-600 hover:underline">
              Tất cả
            </Link>
          </div>
          {loading ? (
            <ListSkeleton />
          ) : recentUsers.length > 0 ? (
            <div className="space-y-3">
              {recentUsers.map((user) => (
                <div key={user.id} className="flex items-center gap-3 rounded-xl p-3 transition hover:bg-slate-50">
                  <Avatar name={user.name} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-slate-900">{user.name}</p>
                    <p className="truncate text-xs text-slate-400">{user.email}</p>
                  </div>
                  <span className="rounded-full bg-slate-100 px-2 py-1 text-[10px] font-semibold text-slate-600">
                    {roleLabels[user.role] || user.role}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="py-6 text-center text-sm text-slate-400">Chưa có người dùng mới.</p>
          )}
        </section>

        <section className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
          <h3 className="mb-4 font-semibold text-slate-900">Tổng quan nền tảng</h3>
          <div className="space-y-4">
            <OverviewRow icon={GraduationCap} label="Tổng lượt ghi danh" value={stats?.totalEnrollments ?? 0} color="purple" />
            <OverviewRow icon={BarChart2} label="Người dùng hoạt động" value={stats?.totalUsers ?? 0} color="blue" />
            <OverviewRow icon={FileCheck} label="Khóa học trên hệ thống" value={stats?.totalCourses ?? 0} color="amber" />
          </div>
        </section>
      </div>
    </div>
  );
};

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

  if (activeView === 'ADMIN') {
    return <AdminDashboard data={data} loading={loading} />;
  }

  if (activeView === 'INSTRUCTOR') {
    return <InstructorDashboard data={data} loading={loading} />;
  }

  return <StudentDashboard data={data} loading={loading} />;
};

const CourseSkeleton = () => (
  <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
    {[1, 2, 3].map((item) => (
      <div key={item} className="animate-pulse">
        <div className="mb-3 aspect-video rounded-xl bg-slate-100" />
        <div className="mb-2 h-3 w-24 rounded bg-slate-100" />
        <div className="h-4 w-36 rounded bg-slate-100" />
      </div>
    ))}
  </div>
);

const ListSkeleton = () => (
  <div className="space-y-3">
    {[1, 2, 3].map((item) => (
      <div key={item} className="flex animate-pulse items-center gap-3">
        <div className="h-10 w-10 rounded-full bg-slate-100" />
        <div className="flex-1 space-y-2">
          <div className="h-3 w-28 rounded bg-slate-100" />
          <div className="h-3 w-40 rounded bg-slate-100" />
        </div>
      </div>
    ))}
  </div>
);

const CourseDate = ({ label, value }) => (
  <div>
    <span className="flex items-center gap-1 text-slate-400">
      <CalendarDays className="h-3 w-3" />
      {label}
    </span>
    <span className="mt-0.5 block font-medium text-slate-700">{formatDate(value)}</span>
  </div>
);

const QuestRow = ({ icon: Icon, title, subtitle, color, right, done, reward }) => (
  <div className="flex items-center gap-3">
    <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${color}`}>
      <Icon className="h-5 w-5" />
    </div>
    <div className="min-w-0 flex-1">
      <p className="text-sm font-medium text-slate-900">{title}</p>
      {subtitle && <p className="text-xs text-slate-500">{subtitle}</p>}
    </div>
    {right ? (
      <span className="text-lg font-bold text-purple-700">{right}</span>
    ) : (
      <div className="shrink-0 text-right">
        <p className="text-xs font-semibold text-purple-600">{reward}</p>
        <p className={`text-sm font-bold ${done ? 'text-emerald-600' : 'text-slate-500'}`}>{done ? '1/1' : '0/1'}</p>
      </div>
    )}
  </div>
);

const Avatar = ({ name = '' }) => (
  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-purple-300 to-pink-300 font-bold text-white">
    {name?.charAt(0)?.toUpperCase() || '?'}
  </div>
);

const StatusPill = ({ active }) => (
  <span className={`rounded-full px-2 py-1 text-[10px] font-semibold ${active ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
    {active ? 'Công khai' : 'Nháp'}
  </span>
);

const OverviewRow = ({ icon: Icon, label, value, color }) => {
  const classes = {
    purple: 'border-purple-100 from-purple-50 to-pink-50 text-purple-700',
    blue: 'border-blue-100 from-blue-50 to-cyan-50 text-blue-700',
    amber: 'border-amber-100 from-amber-50 to-orange-50 text-amber-700',
  };

  return (
    <div className={`flex items-center justify-between rounded-xl border bg-gradient-to-r p-4 ${classes[color]}`}>
      <div className="flex items-center gap-3">
        <Icon className="h-5 w-5" />
        <span className="text-sm font-medium text-slate-900">{label}</span>
      </div>
      <span className="text-lg font-bold">{value}</span>
    </div>
  );
};

export default Dashboard;
