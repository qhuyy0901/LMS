import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  BookOpen,
  DollarSign,
  GraduationCap,
  Plus,
  RefreshCw,
  Star,
  Trophy,
  Users,
} from 'lucide-react';
import { getInstructorDashboard } from '../api/instructorDashboardApi';

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

  const stats = useMemo(() => {
    const rating = data?.danhGiaTrungBinh;
    return [
      {
        label: 'Tổng doanh thu',
        value: formatCurrency(data?.tongDoanhThu),
        icon: DollarSign,
        color: 'text-emerald-600',
        bg: 'bg-emerald-50',
      },
      {
        label: 'Tổng học viên',
        value: `${formatNumber(data?.tongHocVien)} học viên`,
        icon: Users,
        color: 'text-blue-600',
        bg: 'bg-blue-50',
      },
      {
        label: 'Tổng khóa học',
        value: `${formatNumber(data?.tongKhoaHoc)} khóa học`,
        icon: BookOpen,
        color: 'text-purple-600',
        bg: 'bg-purple-50',
      },
      {
        label: 'Đã xuất bản',
        value: `${formatNumber(data?.khoaHocCongKhai)} khóa học`,
        icon: Trophy,
        color: 'text-amber-600',
        bg: 'bg-amber-50',
      },
      {
        label: 'Bản nháp',
        value: `${formatNumber(data?.khoaHocBanNhap)} khóa học`,
        icon: GraduationCap,
        color: 'text-slate-600',
        bg: 'bg-slate-100',
      },
      {
        label: 'Đánh giá trung bình',
        value: rating === null || rating === undefined ? 'Chưa có đánh giá' : `${Number(rating).toFixed(1)}/5`,
        icon: Star,
        color: 'text-orange-500',
        bg: 'bg-orange-50',
      },
    ];
  }, [data]);

  const courses = data?.khoaHocCuaToi || [];
  const newStudents = data?.hocVienMoi || [];
  const recentRevenue = data?.doanhThuGanDay || [];
  const topCourse = data?.khoaHocNhieuHocVienNhat;
  const hasCourses = Number(data?.tongKhoaHoc || 0) > 0;

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center rounded-2xl border border-slate-100 bg-white">
        <div className="text-center">
          <div className="mx-auto mb-4 h-9 w-9 animate-spin rounded-full border-4 border-purple-500 border-t-transparent" />
          <p className="text-sm font-medium text-slate-600">Đang tải dữ liệu dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center rounded-2xl border border-rose-100 bg-white">
        <div className="max-w-md text-center">
          <h1 className="text-xl font-semibold text-slate-900">{error}</h1>
          <button
            onClick={loadDashboard}
            className="mt-5 inline-flex items-center gap-2 rounded-full bg-purple-600 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-purple-700"
          >
            <RefreshCw className="h-4 w-4" />
            Thử lại
          </button>
        </div>
      </div>
    );
  }

  if (!hasCourses) {
    return (
      <div className="animate-fade-in-up">
        <HeaderActions />
        <div className="mt-6 rounded-2xl border border-slate-100 bg-white p-10 text-center shadow-sm">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-purple-50">
            <BookOpen className="h-7 w-7 text-purple-600" />
          </div>
          <h1 className="text-2xl font-semibold text-slate-900">Bạn chưa có khóa học nào.</h1>
          <p className="mt-2 text-sm text-slate-500">Hãy tạo khóa học đầu tiên để bắt đầu theo dõi doanh thu và học viên.</p>
          <button
            onClick={() => navigate('/instructor/courses/new')}
            className="mt-6 inline-flex items-center gap-2 rounded-full bg-purple-600 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-purple-700"
          >
            <Plus className="h-4 w-4" />
            Tạo khóa học mới
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="animate-fade-in-up space-y-6">
      <HeaderActions />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {stats.map((item) => (
          <StatCard key={item.label} {...item} />
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.5fr_1fr]">
        <section className="rounded-2xl border border-slate-100 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-100 p-5">
            <div>
              <h2 className="font-semibold text-slate-900">Khóa học của bạn</h2>
              <p className="mt-1 text-sm text-slate-500">Tối đa 5 khóa học mới nhất của giảng viên.</p>
            </div>
            <button
              onClick={() => navigate('/instructor/courses')}
              className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition-colors hover:border-purple-200 hover:text-purple-700"
            >
              Quản lý
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
          <div className="divide-y divide-slate-100">
            {courses.map((course) => (
              <CourseRow key={course.id} course={course} onClick={() => navigate(`/instructor/courses/${course.id}/edit`)} />
            ))}
          </div>
        </section>

        <div className="space-y-6">
          <InfoPanel title="Khóa học nổi bật">
            {topCourse ? (
              <button
                onClick={() => navigate(`/instructor/courses/${topCourse.id}/edit`)}
                className="w-full rounded-xl bg-purple-50 p-4 text-left transition-colors hover:bg-purple-100"
              >
                <p className="line-clamp-2 font-semibold text-slate-900">{topCourse.tenKhoaHoc || topCourse.title}</p>
                <p className="mt-2 text-sm text-slate-600">
                  {formatNumber(topCourse.hocVien || topCourse.studentCount)} học viên đang theo học
                </p>
              </button>
            ) : (
              <EmptyText>Chưa có khóa học có học viên.</EmptyText>
            )}
          </InfoPanel>

          <InfoPanel title="Doanh thu gần đây">
            {recentRevenue.length > 0 ? (
              <div className="space-y-3">
                {recentRevenue.map((item) => (
                  <div key={item.id} className="rounded-xl border border-slate-100 p-3">
                    <div className="flex items-start justify-between gap-3">
                      <p className="line-clamp-1 text-sm font-semibold text-slate-900">{item.tenKhoaHoc}</p>
                      <span className="shrink-0 text-sm font-bold text-emerald-600">{formatCurrency(item.soTien || item.amount)}</span>
                    </div>
                    <p className="mt-1 text-xs text-slate-500">
                      {item.tenHocVien} · {formatDate(item.ngayThanhToan || item.createdAt)}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyText>Chưa có dữ liệu doanh thu gần đây.</EmptyText>
            )}
          </InfoPanel>
        </div>
      </div>

      <section className="rounded-2xl border border-slate-100 bg-white shadow-sm">
        <div className="border-b border-slate-100 p-5">
          <h2 className="font-semibold text-slate-900">Học viên mới đăng ký</h2>
          <p className="mt-1 text-sm text-slate-500">Các lượt ghi danh mới nhất thuộc khóa học của bạn.</p>
        </div>
        {newStudents.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-slate-50 text-xs uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-5 py-3 font-semibold">Học viên</th>
                  <th className="px-5 py-3 font-semibold">Khóa học</th>
                  <th className="px-5 py-3 font-semibold">Tiến độ</th>
                  <th className="px-5 py-3 font-semibold">Ngày đăng ký</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {newStudents.map((student) => (
                  <tr key={student.id} className="text-sm">
                    <td className="px-5 py-4">
                      <p className="font-semibold text-slate-900">{student.tenHocVien}</p>
                      <p className="text-xs text-slate-500">{student.emailHocVien || 'Chưa có email'}</p>
                    </td>
                    <td className="px-5 py-4 text-slate-700">{student.tenKhoaHoc}</td>
                    <td className="px-5 py-4 text-slate-700">{formatNumber(student.tienDo)}%</td>
                    <td className="px-5 py-4 text-slate-500">{formatDate(student.ngayDangKy)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-6">
            <EmptyText>Chưa có học viên mới đăng ký.</EmptyText>
          </div>
        )}
      </section>
    </div>
  );
};

const HeaderActions = () => (
  <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
    <div>
      <h1 className="text-2xl font-semibold tracking-tight text-slate-900 md:text-3xl">Dashboard Giảng viên</h1>
      <p className="mt-1 text-sm text-slate-500">Theo dõi khóa học, học viên, doanh thu và đánh giá của bạn.</p>
    </div>
    <div className="flex flex-wrap gap-3">
      <Link
        to="/instructor/courses"
        className="inline-flex items-center justify-center rounded-full border border-slate-200 px-5 py-2.5 text-sm font-semibold text-slate-700 transition-colors hover:border-purple-200 hover:text-purple-700"
      >
        Quản lý khóa học
      </Link>
      <Link
        to="/instructor/courses/new"
        className="inline-flex items-center justify-center gap-2 rounded-full bg-purple-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-purple-700"
      >
        <Plus className="h-4 w-4" />
        Tạo khóa học mới
      </Link>
    </div>
  </div>
);

const StatCard = ({ label, value, icon: Icon, color, bg }) => (
  <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
    <div className={`mb-4 flex h-11 w-11 items-center justify-center rounded-xl ${bg}`}>
      <Icon className={`h-5 w-5 ${color}`} />
    </div>
    <p className="text-sm font-medium text-slate-500">{label}</p>
    <p className="mt-1 text-xl font-bold text-slate-900">{value}</p>
  </div>
);

const CourseRow = ({ course, onClick }) => {
  const isFree = Number(course.gia ?? course.price ?? 0) === 0;
  const isPublished = Boolean(course.daXuatBan || course.isPublished);
  const courseTitle = course.tenKhoaHoc || course.title;

  return (
    <button onClick={onClick} className="grid w-full gap-4 p-5 text-left transition-colors hover:bg-slate-50 md:grid-cols-[1.4fr_0.8fr_0.8fr] md:items-center">
      <div className="flex items-center gap-4">
        <div className="h-16 w-24 shrink-0 overflow-hidden rounded-xl bg-slate-100">
          {course.anhBia || course.thumbnail ? (
            <img src={course.anhBia || course.thumbnail} alt={courseTitle} className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center">
              <BookOpen className="h-6 w-6 text-slate-400" />
            </div>
          )}
        </div>
        <div className="min-w-0">
          <p className="line-clamp-1 font-semibold text-slate-900">{courseTitle}</p>
          <p className="mt-1 line-clamp-2 text-sm text-slate-500">{course.moTaNgan || course.description || 'Chưa có mô tả ngắn.'}</p>
        </div>
      </div>
      <div className="text-sm text-slate-600">
        <p className="font-semibold text-slate-900">{isFree ? 'Miễn phí' : formatCurrency(course.gia ?? course.price)}</p>
        <p className="mt-1">{isPublished ? 'Đã xuất bản' : statusLabel(course.trangThai || course.status)}</p>
      </div>
      <div className="grid grid-cols-3 gap-2 text-sm text-slate-600">
        <Metric label="Chương" value={course.chuong ?? course.sectionCount} />
        <Metric label="Bài học" value={course.baiHoc ?? course.lessonCount} />
        <Metric label="Học viên" value={course.hocVien ?? course.studentCount} />
      </div>
    </button>
  );
};

const Metric = ({ label, value }) => (
  <div>
    <p className="font-semibold text-slate-900">{formatNumber(value)}</p>
    <p className="text-xs text-slate-500">{label}</p>
  </div>
);

const InfoPanel = ({ title, children }) => (
  <section className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
    <h2 className="mb-4 font-semibold text-slate-900">{title}</h2>
    {children}
  </section>
);

const EmptyText = ({ children }) => <p className="rounded-xl bg-slate-50 p-4 text-sm text-slate-500">{children}</p>;

const statusLabel = (status) => {
  const normalized = String(status || '').toUpperCase();
  if (normalized === 'HIDDEN') return 'Đã ẩn';
  if (normalized === 'PUBLIC' || normalized === 'PUBLISHED') return 'Đã xuất bản';
  return 'Bản nháp';
};

export default InstructorDashboard;
