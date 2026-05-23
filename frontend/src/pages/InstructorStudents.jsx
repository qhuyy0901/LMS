import { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { BookOpen, GraduationCap, Search, Users } from 'lucide-react';

const numberFormatter = new Intl.NumberFormat('vi-VN');

const InstructorStudents = () => {
  const [data, setData] = useState({ students: [], totalStudents: 0, totalEnrollments: 0 });
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStudents = async () => {
      try {
        const response = await axios.get('/api/instructor/students');
        setData(response.data || { students: [], totalStudents: 0, totalEnrollments: 0 });
      } catch (error) {
        console.error('Instructor students fetch error:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchStudents();
  }, []);

  const students = useMemo(() => {
    const keyword = query.trim().toLowerCase();
    if (!keyword) {
      return data.students || [];
    }
    return (data.students || []).filter((student) =>
      student.name?.toLowerCase().includes(keyword) ||
      student.email?.toLowerCase().includes(keyword) ||
      student.courses?.some((course) => course.title?.toLowerCase().includes(keyword))
    );
  }, [data.students, query]);

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-purple-500 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="animate-fade-in-up pb-20">
      <div className="mb-6 flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900 md:text-3xl">Danh sách học viên</h1>
          <p className="mt-1 text-sm text-slate-500">Theo dõi học viên đang tham gia các khóa học bạn sở hữu.</p>
        </div>
        <div className="relative w-full xl:w-96">
          <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Tìm học viên hoặc khóa học..."
            className="w-full rounded-2xl border border-slate-200 bg-white py-3 pl-11 pr-4 text-sm outline-none transition focus:border-purple-400 focus:ring-4 focus:ring-purple-100"
          />
        </div>
      </div>

      <div className="mb-6 grid gap-4 md:grid-cols-3">
        <MetricCard icon={Users} label="Tổng học viên" value={numberFormatter.format(data.totalStudents || 0)} color="bg-sky-50 text-sky-600" />
        <MetricCard icon={BookOpen} label="Lượt ghi danh" value={numberFormatter.format(data.totalEnrollments || 0)} color="bg-purple-50 text-purple-600" />
        <MetricCard icon={GraduationCap} label="Tiến độ trung bình" value={`${averageProgress(students)}%`} color="bg-emerald-50 text-emerald-600" />
      </div>

      <section className="overflow-hidden rounded-3xl border border-slate-100 bg-white shadow-sm">
        <div className="grid grid-cols-[1.2fr_1fr_0.6fr] gap-4 border-b border-slate-100 bg-slate-50 px-5 py-4 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
          <span>Học viên</span>
          <span>Khóa học</span>
          <span className="text-right">Tiến độ</span>
        </div>

        {students.length === 0 ? (
          <div className="p-10 text-center text-sm text-slate-500">Chưa có học viên nào trong các khóa học của bạn.</div>
        ) : (
          students.map((student) => (
            <div key={student.id} className="grid grid-cols-[1.2fr_1fr_0.6fr] gap-4 border-b border-slate-100 px-5 py-4 last:border-b-0">
              <div className="flex min-w-0 items-center gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-purple-400 to-fuchsia-400 text-sm font-semibold text-white">
                  {student.avatar ? <img src={student.avatar} alt={student.name} className="h-full w-full object-cover" /> : initials(student.name || student.email)}
                </div>
                <div className="min-w-0">
                  <p className="truncate font-semibold text-slate-900">{student.name || 'Học viên'}</p>
                  <p className="truncate text-sm text-slate-500">{student.email}</p>
                </div>
              </div>

              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-slate-800">{student.courses?.[0]?.title || 'Khóa học'}</p>
                {student.courses?.length > 1 && (
                  <p className="mt-1 text-xs text-slate-400">+{student.courses.length - 1} khóa học khác</p>
                )}
              </div>

              <div className="text-right">
                <p className="font-semibold text-slate-900">{student.averageProgress || 0}%</p>
                <div className="mt-2 h-2 rounded-full bg-slate-100">
                  <div className="h-full rounded-full bg-purple-500" style={{ width: `${Math.min(100, student.averageProgress || 0)}%` }} />
                </div>
              </div>
            </div>
          ))
        )}
      </section>
    </div>
  );
};

const MetricCard = ({ icon: Icon, label, value, color }) => (
  <div className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm">
    <div className={`mb-4 flex h-11 w-11 items-center justify-center rounded-2xl ${color}`}>
      <Icon className="h-5 w-5" />
    </div>
    <p className="text-sm font-medium text-slate-500">{label}</p>
    <p className="mt-1 text-2xl font-semibold text-slate-900">{value}</p>
  </div>
);

const initials = (value = '') =>
  value
    .split(' ')
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

const averageProgress = (students) => {
  if (!students.length) {
    return 0;
  }
  return Math.round(students.reduce((sum, student) => sum + (student.averageProgress || 0), 0) / students.length);
};

export default InstructorStudents;
