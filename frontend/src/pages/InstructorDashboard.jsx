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
        <div className="mt-6 p-[1.5px] rounded-[1.25rem] bg-purple-50/40 dark:bg-slate-800/60 border border-purple-100/40 dark:border-slate-800/40 shadow-[0_2px_8px_rgba(147,51,234,0.01)]">
          <div className="bg-white dark:bg-slate-900 rounded-[calc(1.25rem-1.5px)] p-10 text-center shadow-sm">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-purple-50">
              <BookOpen className="h-7 w-7 text-purple-600" />
            </div>
            <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">Bạn chưa có khóa học nào.</h1>
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">Hãy tạo khóa học đầu tiên để bắt đầu theo dõi doanh thu và học viên.</p>
            <button
              onClick={() => navigate('/instructor/courses/new')}
              className="mt-6 inline-flex items-center gap-2 rounded-full bg-purple-600 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-purple-700"
            >
              <Plus className="h-4 w-4" />
              Tạo khóa học mới
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="animate-fade-in-up space-y-6">
      <HeaderActions />

      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
        {stats.map((item) => (
          <StatCard key={item.label} {...item} />
        ))}
      </div>

      <div className="p-[1.5px] rounded-[1.25rem] bg-purple-50/40 dark:bg-slate-800/60 border border-purple-100/40 dark:border-slate-800/40 shadow-[0_2px_8px_rgba(147,51,234,0.01)]">
        <section className="bg-white dark:bg-slate-900 rounded-[calc(1.25rem-1.5px)] overflow-hidden">
          <div className="flex items-center justify-between border-b border-purple-50/50 dark:border-slate-800/50 p-5">
            <div>
              <h2 className="font-semibold text-slate-900 dark:text-slate-100">Khóa học của bạn</h2>
            </div>
            <button
              onClick={() => navigate('/instructor/courses')}
              className="inline-flex items-center gap-2 rounded-full border border-purple-100 dark:border-slate-800 px-4 py-2 text-xs font-semibold text-purple-700 dark:text-purple-400 transition-colors hover:bg-purple-50/50 dark:hover:bg-purple-950/20"
            >
              Quản lý
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>
          <div className="divide-y divide-purple-50/40 dark:divide-slate-800/60">
            {courses.map((course) => (
              <CourseRow key={course.id} course={course} onClick={() => navigate(`/instructor/courses/${course.id}/edit`)} />
            ))}
          </div>
        </section>
      </div>

      <div className="p-[1.5px] rounded-[1.25rem] bg-purple-50/40 dark:bg-slate-800/60 border border-purple-100/40 dark:border-slate-800/40 shadow-[0_2px_8px_rgba(147,51,234,0.01)]">
        <section className="bg-white dark:bg-slate-900 rounded-[calc(1.25rem-1.5px)] overflow-hidden">
          <div className="border-b border-purple-50/50 dark:border-slate-800/50 p-5">
            <h2 className="font-semibold text-slate-900 dark:text-slate-100">Học viên mới đăng ký</h2>
          </div>
          {newStudents.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-purple-50/[0.15] dark:bg-slate-800 text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  <tr>
                    <th className="px-5 py-3 font-semibold">Học viên</th>
                    <th className="px-5 py-3 font-semibold">Khóa học</th>
                    <th className="px-5 py-3 font-semibold">Ngày bắt đầu</th>
                    <th className="px-5 py-3 font-semibold">Ngày kết thúc</th>
                    <th className="px-5 py-3 font-semibold">Tiến độ</th>
                    <th className="px-5 py-3 font-semibold">Ngày đăng ký</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-purple-50/30 dark:divide-slate-800">
                  {newStudents.map((student) => (
                    <tr key={student.id} className="text-sm hover:bg-purple-50/[0.04]">
                      <td className="px-5 py-4">
                        <p className="font-semibold text-slate-900 dark:text-slate-200">{student.tenHocVien}</p>
                        <p className="text-xs text-slate-400 dark:text-slate-550">{student.emailHocVien || 'Chưa có email'}</p>
                      </td>
                      <td className="px-5 py-4 text-slate-700 dark:text-slate-300">{student.tenKhoaHoc}</td>
                      <td className="whitespace-nowrap px-5 py-4 text-slate-500 dark:text-slate-455">{formatDate(student.ngayBatDau)}</td>
                      <td className="whitespace-nowrap px-5 py-4 text-slate-500 dark:text-slate-455">{formatDate(student.ngayKetThuc)}</td>
                      <td className="px-5 py-4 text-slate-750 dark:text-slate-300 font-mono">{formatNumber(student.tienDo)}%</td>
                      <td className="px-5 py-4 text-slate-505 dark:text-slate-455">{formatDate(student.ngayDangKy)}</td>
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
    </div>
  );
};

const HeaderActions = () => {
  const navigate = useNavigate();
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Dashboard giáo viên</h1>
      <div className="flex flex-wrap gap-3 sm:justify-end">
        <Link
          to="/instructor/courses"
          className="inline-flex items-center justify-center rounded-full border border-purple-100 dark:border-slate-800 bg-white dark:bg-slate-900 px-5 py-2.5 text-xs font-semibold text-purple-700 dark:text-purple-400 hover:bg-purple-50/50 dark:hover:bg-purple-950/20 transition"
        >
          Quản lý khóa học
        </Link>
        <Link
          to="/instructor/courses/new"
          className="inline-flex items-center justify-center gap-2 rounded-full bg-purple-600 hover:bg-purple-700 text-white transition px-5 py-2.5 text-xs font-semibold group/btn shadow-md shadow-purple-200/50 dark:shadow-none"
        >
          <Plus className="h-3.5 w-3.5" />
          Tạo khóa học mới
        </Link>
      </div>
    </div>
  );
};

const StatCard = ({ label, value, icon: Icon, color, bg, isText }) => (
  <div className="p-[1.5px] rounded-[1.25rem] bg-purple-50/40 dark:bg-slate-800/60 border border-purple-100/40 dark:border-slate-800/40 shadow-[0_2px_8px_rgba(147,51,234,0.01)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_4px_16px_rgba(147,51,234,0.04)] group h-full">
    <div className="bg-white dark:bg-slate-900 rounded-[calc(1.25rem-1.5px)] p-5 flex flex-col justify-between h-full">
      <div className="flex items-center gap-3.5">
        <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${bg}`}>
          <Icon className={`h-5.5 w-5.5 ${color}`} strokeWidth={1.5} />
        </div>
        <div className="min-w-0">
          <p className="text-[11px] tracking-wider uppercase font-semibold text-slate-400 dark:text-slate-500">{label}</p>
          <p className={`mt-0.5 font-bold text-slate-900 dark:text-slate-100 ${isText ? 'line-clamp-1 text-sm' : 'text-xl'}`}>{value}</p>
        </div>
      </div>
    </div>
  </div>
);

const CourseRow = ({ course, onClick }) => {
  const isFree = Number(course.gia ?? course.price ?? 0) === 0;
  const isPublished = Boolean(course.daXuatBan || course.isPublished);
  const courseTitle = course.tenKhoaHoc || course.title;

  return (
    <button onClick={onClick} className="grid w-full gap-4 p-5 text-left transition-colors hover:bg-purple-50/10 dark:hover:bg-slate-900/10 md:grid-cols-[1.4fr_0.8fr_0.8fr] md:items-center">
      <div className="flex items-center gap-4">
        <div className="h-16 w-24 shrink-0 overflow-hidden rounded-xl bg-slate-100 dark:bg-slate-800 border border-purple-50/30">
          {course.anhBia || course.thumbnail ? (
            <img src={course.anhBia || course.thumbnail} alt={courseTitle} className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center">
              <BookOpen className="h-6 w-6 text-slate-400" />
            </div>
          )}
        </div>
        <div className="min-w-0">
          <p className="line-clamp-1 font-semibold text-slate-900 dark:text-slate-100">{courseTitle}</p>
          <p className="mt-1 line-clamp-2 text-xs text-slate-400 dark:text-slate-500">{course.moTaNgan || course.description || 'Chưa có mô tả ngắn.'}</p>
        </div>
      </div>
      <div className="text-xs text-slate-600 dark:text-slate-400">
        <p className="font-semibold text-slate-900 dark:text-slate-200">{isFree ? 'Miễn phí' : formatCurrency(course.gia ?? course.price)}</p>
        <p className="mt-1 font-medium">{isPublished ? 'Đã xuất bản' : statusLabel(course.trangThai || course.status)}</p>
      </div>
      <div className="grid grid-cols-3 gap-2 text-xs text-slate-650 dark:text-slate-400">
        <Metric label="Chương" value={course.chuong ?? course.sectionCount} />
        <Metric label="Bài học" value={course.baiHoc ?? course.lessonCount} />
        <Metric label="Học viên" value={course.hocVien ?? course.studentCount} />
      </div>
    </button>
  );
};

const Metric = ({ label, value }) => (
  <div>
    <p className="font-semibold text-slate-900 dark:text-slate-200 font-mono">{formatNumber(value)}</p>
    <p className="text-[10px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wide">{label}</p>
  </div>
);

const EmptyText = ({ children }) => <p className="rounded-xl bg-purple-50/20 border border-purple-100/30 px-4 py-8 text-center text-xs text-slate-400 dark:text-slate-500 font-medium">{children}</p>;

const statusLabel = (status) => {
  const normalized = String(status || '').toUpperCase();
  if (normalized === 'HIDDEN') return 'Đã ẩn';
  if (normalized === 'PUBLIC' || normalized === 'PUBLISHED') return 'Đã xuất bản';
  return 'Bản nháp';
};

export default InstructorDashboard;
