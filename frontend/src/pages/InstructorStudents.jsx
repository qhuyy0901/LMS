import { useEffect, useMemo, useRef, useState } from 'react';
import axios from 'axios';
import {
  BookOpen,
  CheckCircle2,
  Clock3,
  DollarSign,
  Eye,
  GraduationCap,
  Search,
  Users,
} from 'lucide-react';
import { Link } from 'react-router-dom';

const numberFormatter = new Intl.NumberFormat('vi-VN');
const currencyFormatter = new Intl.NumberFormat('vi-VN', {
  style: 'currency',
  currency: 'VND',
  maximumFractionDigits: 0,
});

const emptyData = {
  summary: {
    tongHocVien: 0,
    tongGhiDanh: 0,
    tienDoTrungBinh: 0,
    hocVienHoanThanh: 0,
    hocVienDangHoc: 0,
    doanhThu: 0,
  },
  students: [],
};

const logApiError = (url, error) => {
  console.error('Instructor students API error:', {
    url,
    status: error.response?.status ?? null,
    response: error.response?.data ?? error.message,
  });
};

export default function InstructorStudents() {
  const [data, setData] = useState(emptyData);
  const [courses, setCourses] = useState([]);
  const [courseId, setCourseId] = useState('all');
  const [progressFilter, setProgressFilter] = useState('all');
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [coursesError, setCoursesError] = useState('');
  const studentsRequestId = useRef(0);

  useEffect(() => {
    const loadCourses = async () => {
      const selectListUrl = '/api/instructor/courses/select-list';
      try {
        const response = await axios.get(selectListUrl);
        setCourses(Array.isArray(response.data) ? response.data : []);
        setCoursesError('');
      } catch (selectListError) {
        logApiError(selectListUrl, selectListError);
        const fallbackUrl = '/api/instructor/courses';
        try {
          const response = await axios.get(fallbackUrl);
          const items = Array.isArray(response.data) ? response.data : response.data?.courses || [];
          setCourses(items.map((course) => ({
            id: course.id,
            tenKhoaHoc: course.tenKhoaHoc || course.title || course.name || 'Khóa học',
          })));
          setCoursesError('');
        } catch (fallbackError) {
          logApiError(fallbackUrl, fallbackError);
          setCourses([]);
          setCoursesError('Không thể tải danh sách khóa học.');
        }
      }
    };
    loadCourses();
  }, []);

  useEffect(() => {
    const loadStudents = async () => {
      const requestId = ++studentsRequestId.current;
      const url = `/api/instructor/students?courseId=${encodeURIComponent(courseId)}`;
      setLoading(true);
      setError('');
      setData(emptyData);
      try {
        const response = await axios.get('/api/instructor/students', { params: { courseId } });
        if (requestId !== studentsRequestId.current) return;
        setData({
          summary: { ...emptyData.summary, ...(response.data?.summary || {}) },
          students: Array.isArray(response.data?.students) ? response.data.students : [],
        });
      } catch (requestError) {
        if (requestId !== studentsRequestId.current) return;
        logApiError(url, requestError);
        setData(emptyData);
        setError('Không thể tải danh sách học viên.');
      } finally {
        if (requestId === studentsRequestId.current) {
          setLoading(false);
        }
      }
    };
    loadStudents();
  }, [courseId]);

  const students = useMemo(() => {
    const keyword = query.trim().toLowerCase();
    return data.students.filter((student) => {
      const matchesSearch =
        !keyword ||
        student.hoTen?.toLowerCase().includes(keyword) ||
        student.email?.toLowerCase().includes(keyword) ||
        student.tenKhoaHoc?.toLowerCase().includes(keyword);
      const matchesProgress =
        progressFilter === 'all' ||
        (progressFilter === 'learning' && student.trangThai === 'DANG_HOC') ||
        (progressFilter === 'completed' && student.trangThai === 'HOAN_THANH') ||
        (progressFilter === 'low' && Number(student.tienDo || 0) < 50);
      return matchesSearch && matchesProgress;
    });
  }, [data.students, progressFilter, query]);

  const summary = data.summary;

  return (
    <div className="animate-fade-in-up pb-20">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900 md:text-3xl">Danh sách học viên</h1>
      </div>

      <section className="mb-6 rounded-3xl border border-slate-100 bg-white p-5 shadow-sm">
        <div className="grid gap-4 lg:grid-cols-[1fr_1fr_1.4fr]">
          <label className="block">
            <span className="mb-2 block text-xs font-semibold uppercase tracking-wider text-slate-500">Khóa học</span>
            <select
              value={courseId}
              onChange={(event) => setCourseId(event.target.value)}
              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-purple-400 focus:ring-4 focus:ring-purple-100"
            >
              <option value="all">Tất cả khóa học</option>
              {courses.map((course) => (
                <option key={course.id} value={course.id}>{course.tenKhoaHoc}</option>
              ))}
            </select>
            {coursesError && <span className="mt-2 block text-xs text-rose-600">{coursesError}</span>}
          </label>

          <label className="block">
            <span className="mb-2 block text-xs font-semibold uppercase tracking-wider text-slate-500">Tiến độ</span>
            <select
              value={progressFilter}
              onChange={(event) => setProgressFilter(event.target.value)}
              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-purple-400 focus:ring-4 focus:ring-purple-100"
            >
              <option value="all">Tất cả</option>
              <option value="learning">Đang học</option>
              <option value="completed">Hoàn thành</option>
              <option value="low">Tiến độ thấp dưới 50%</option>
            </select>
          </label>

          <label className="block">
            <span className="mb-2 block text-xs font-semibold uppercase tracking-wider text-slate-500">Tìm kiếm</span>
            <span className="relative block">
              <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Tên, email hoặc tên khóa học..."
                className="w-full rounded-2xl border border-slate-200 bg-white py-3 pl-11 pr-4 text-sm outline-none transition focus:border-purple-400 focus:ring-4 focus:ring-purple-100"
              />
            </span>
          </label>
        </div>
      </section>

      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <MetricCard icon={Users} label="Tổng học viên" value={numberFormatter.format(summary.tongHocVien)} color="bg-sky-50 text-sky-600" />
        <MetricCard icon={BookOpen} label="Lượt ghi danh" value={numberFormatter.format(summary.tongGhiDanh)} color="bg-purple-50 text-purple-600" />
        <MetricCard icon={GraduationCap} label="Tiến độ trung bình" value={`${summary.tienDoTrungBinh}%`} color="bg-emerald-50 text-emerald-600" />
        <MetricCard icon={CheckCircle2} label="Học viên hoàn thành" value={numberFormatter.format(summary.hocVienHoanThanh)} color="bg-teal-50 text-teal-600" />
        <MetricCard icon={Clock3} label="Học viên đang học" value={numberFormatter.format(summary.hocVienDangHoc)} color="bg-amber-50 text-amber-600" />
        <MetricCard icon={DollarSign} label="Doanh thu" value={currencyFormatter.format(summary.doanhThu)} color="bg-fuchsia-50 text-fuchsia-600" />
      </div>

      <section className="overflow-hidden rounded-3xl border border-slate-100 bg-white shadow-sm">
        {loading ? (
          <StateMessage text="Đang tải danh sách học viên..." />
        ) : error ? (
          <StateMessage text={error} error />
        ) : students.length === 0 ? (
          <StateMessage text="Chưa có học viên nào trong lựa chọn này." />
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-[1050px] w-full text-left">
              <thead className="border-b border-slate-100 bg-slate-50 text-xs font-semibold uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-5 py-4">Học viên</th>
                  <th className="px-5 py-4">Khóa học</th>
                  <th className="px-5 py-4">Ngày ghi danh</th>
                  <th className="px-5 py-4">Tiến độ học</th>
                  <th className="px-5 py-4">Trạng thái</th>
                  <th className="px-5 py-4 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {students.map((student) => (
                  <tr key={student.id} className="border-b border-slate-100 last:border-b-0 hover:bg-slate-50/70">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-purple-400 to-fuchsia-400 text-sm font-semibold text-white">
                          {student.avatar ? <img src={student.avatar} alt={student.hoTen} className="h-full w-full object-cover" /> : initials(student.hoTen)}
                        </div>
                        <div>
                          <p className="font-semibold text-slate-900">{student.hoTen}</p>
                          <p className="text-sm text-slate-500">{student.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4 text-sm font-medium text-slate-700">{student.tenKhoaHoc}</td>
                    <td className="px-5 py-4 text-sm text-slate-500">{new Date(student.ngayGhiDanh).toLocaleDateString('vi-VN')}</td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="h-2 w-24 rounded-full bg-slate-100">
                          <div className="h-full rounded-full bg-purple-500" style={{ width: `${Math.min(100, student.tienDo || 0)}%` }} />
                        </div>
                        <span className="text-sm font-semibold text-slate-700">{student.tienDo || 0}%</span>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
                        student.trangThai === 'HOAN_THANH'
                          ? 'bg-emerald-50 text-emerald-700'
                          : 'bg-amber-50 text-amber-700'
                      }`}>
                        {student.trangThaiText}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-right">
                      <Link
                        to={`/course/${student.courseId}`}
                        className="inline-flex items-center gap-2 rounded-full border border-purple-200 px-3 py-2 text-xs font-semibold text-purple-700 hover:bg-purple-50"
                      >
                        <Eye className="h-4 w-4" />
                        Xem chi tiết
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

const MetricCard = ({ icon: Icon, label, value, color }) => (
  <div className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm">
    <div className={`mb-4 flex h-11 w-11 items-center justify-center rounded-2xl ${color}`}>
      <Icon className="h-5 w-5" />
    </div>
    <p className="text-sm font-medium text-slate-500">{label}</p>
    <p className="mt-1 text-2xl font-semibold text-slate-900">{value}</p>
  </div>
);

const StateMessage = ({ text, error = false }) => (
  <div className={`p-12 text-center text-sm ${error ? 'text-rose-600' : 'text-slate-500'}`}>{text}</div>
);

const initials = (value = '') =>
  value
    .split(' ')
    .filter(Boolean)
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
