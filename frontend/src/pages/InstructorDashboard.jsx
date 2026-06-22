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

  const bestSellerTitle = data?.khoaHocNhieuHocVienNhat?.tenKhoaHoc || data?.khoaHocNhieuHocVienNhat?.title || null;

  const stats = useMemo(() => {
    return [
      {
        label: 'Tổng học viên',
        value: formatNumber(data?.tongHocVien),
        icon: Users,
        color: 'text-blue-600',
        bg: 'bg-blue-50',
      },
      {
        label: 'Tổng khóa học',
        value: formatNumber(data?.tongKhoaHoc),
        icon: BookOpen,
        color: 'text-purple-600',
        bg: 'bg-purple-50',
      },
      {
        label: 'Khóa học công khai',
        value: formatNumber(data?.khoaHocCongKhai),
        icon: RefreshCw,
        color: 'text-sky-600',
        bg: 'bg-sky-50',
      },
      {
        label: 'Đánh giá trung bình',
        value: data?.danhGiaTrungBinh != null ? `${data.danhGiaTrungBinh} ⭐` : 'Chưa có',
        icon: Star,
        color: 'text-amber-600',
        bg: 'bg-amber-50',
      },
      {
        label: 'Khóa học bán chạy nhất',
        value: bestSellerTitle || 'Chưa có',
        icon: Trophy,
        color: 'text-rose-600',
        bg: 'bg-rose-50',
        isText: true,
      },
      {
        label: 'Tổng doanh thu',
        value: formatCurrency(data?.tongDoanhThu),
        icon: Wallet,
        color: 'text-emerald-600',
        bg: 'bg-emerald-50',
      },
    ];
  }, [data, bestSellerTitle]);

  const courses = data?.khoaHocCuaToi || [];
  const newStudents = data?.hocVienMoi || [];
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

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {stats.map((item) => (
          <StatCard key={item.label} {...item} />
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <section className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-100 p-5">
            <div>
              <h2 className="font-semibold text-slate-900">Khóa học của bạn</h2>
            </div>
            <button
              onClick={() => navigate('/instructor/courses')}
              className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition-colors hover:border-purple-200 hover:text-purple-700"
            >
              Quản lý
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
          {courses.length > 0 ? (
            <div className="divide-y divide-slate-100">
              {courses.slice(0, 5).map((course) => (
                <CourseRow key={course.id} course={course} onClick={() => navigate(`/instructor/courses/${course.id}/edit`)} />
              ))}
            </div>
          ) : (
            <div className="p-6 text-center text-sm text-slate-400">Chưa có khóa học nào.</div>
          )}
        </section>

        <section className="rounded-2xl border border-slate-100 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-100 p-5">
            <h2 className="font-semibold text-slate-900">Học viên mới đăng ký</h2>
            <button
              onClick={() => navigate('/instructor/revenue')}
              className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition-colors hover:border-purple-200 hover:text-purple-700"
            >
              Chi tiết
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
          <div className="p-2">
            {newStudents.length > 0 ? (
              <div className="space-y-1">
                {newStudents.slice(0, 5).map((student) => (
                  <div key={student.id} className="flex items-center gap-4 p-3 transition-colors hover:bg-slate-55 rounded-xl">
                    <Avatar name={student.tenHocVien} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <p className="truncate font-semibold text-slate-900">{student.tenHocVien}</p>
                        <span className="shrink-0 text-xs text-slate-400">{formatDate(student.ngayDangKy)}</span>
                      </div>
                      <p className="truncate text-sm text-slate-500">{student.tenKhoaHoc}</p>
                      <div className="mt-1 flex items-center justify-between text-xs text-slate-400">
                        <span className="truncate max-w-[180px]">{student.emailHocVien || 'Chưa có email'}</span>
                        <span className="font-medium text-purple-650 shrink-0">Tiến độ: {student.tienDo}%</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-6">
                <EmptyText>Chưa có học viên mới đăng ký.</EmptyText>
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
};

const HeaderActions = () => (
  <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
    <h1 className="text-2xl font-bold text-slate-900">Dashboard giáo viên</h1>
    <div className="flex flex-wrap gap-3 sm:justify-end">
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

const StatCard = ({ label, value, icon: Icon, color, bg, isText }) => (
  <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
    <div className={`mb-4 flex h-11 w-11 items-center justify-center rounded-xl ${bg}`}>
      <Icon className={`h-5 w-5 ${color}`} />
    </div>
    <p className="text-sm font-medium text-slate-500">{label}</p>
    <p className={`mt-1 font-bold text-slate-900 ${isText ? 'line-clamp-1 text-base' : 'text-xl'}`}>{value}</p>
  </div>
);

const CourseRow = ({ course, onClick }) => {
  const isFree = Number(course.gia ?? course.price ?? 0) === 0;
  const isPublished = Boolean(course.daXuatBan || course.isPublished);
  const courseTitle = course.tenKhoaHoc || course.title;
  const [imageError, setImageError] = useState(false);
  const showImage = (course.anhBia || course.thumbnail) && !imageError;

  return (
    <button onClick={onClick} className="grid w-full gap-4 p-5 text-left transition-colors hover:bg-slate-50 md:grid-cols-[1.4fr_0.8fr_0.8fr] md:items-center">
      <div className="flex items-center gap-4">
        <div className="relative h-16 w-24 shrink-0 overflow-hidden rounded-xl bg-gradient-to-br from-purple-200 to-violet-300">
          {showImage ? (
            <img src={getFileUrl(course.anhBia || course.thumbnail)} alt={courseTitle} onError={() => setImageError(true)} className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center">
              <BookOpen className="h-6 w-6 text-purple-500" />
            </div>
          )}
        </div>
        <div className="min-w-0 flex-1">
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

const EmptyText = ({ children }) => <p className="rounded-xl bg-slate-50 p-4 text-sm text-slate-500">{children}</p>;

const statusLabel = (status) => {
  const normalized = String(status || '').toUpperCase();
  if (normalized === 'HIDDEN') return 'Đã ẩn';
  if (normalized === 'PUBLIC' || normalized === 'PUBLISHED') return 'Đã xuất bản';
  return 'Bản nháp';
};

const Avatar = ({ name = '' }) => (
  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-purple-300 to-pink-300 font-bold text-white">
    {(name || 'A').trim().charAt(0).toUpperCase()}
  </div>
);

export default InstructorDashboard;
