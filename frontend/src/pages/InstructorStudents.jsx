import { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { BookOpen, CalendarDays, CheckCircle2, Filter, GraduationCap, Mail, Search, Users } from 'lucide-react';

const numberFormatter = new Intl.NumberFormat('vi-VN');
const dateFormatter = new Intl.DateTimeFormat('vi-VN', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
});

const emptyData = {
  students: [],
  totalStudents: 0,
  totalEnrollments: 0,
  completedEnrollments: 0,
  averageProgress: 0,
  courses: [],
};

const InstructorStudents = () => {
  const [data, setData] = useState(emptyData);
  const [query, setQuery] = useState('');
  const [selectedCourseId, setSelectedCourseId] = useState('ALL');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchStudents = async () => {
      try {
        const response = await axios.get('/api/instructor/students');
        const result = response.data;
        setData(Array.isArray(result) ? normalizeLegacyData(result) : { ...emptyData, ...result });
      } catch (fetchError) {
        console.error('Instructor students fetch error:', fetchError);
        setError(fetchError.response?.data?.message || 'Không thể tải danh sách học viên.');
      } finally {
        setLoading(false);
      }
    };

    fetchStudents();
  }, []);

  const students = useMemo(() => {
    const keyword = query.trim().toLowerCase();
    return (data.students || [])
      .map((student) => {
        const courses = selectedCourseId === 'ALL'
          ? student.courses || []
          : (student.courses || []).filter((course) => course.id === selectedCourseId);

        if (selectedCourseId !== 'ALL' && courses.length === 0) return null;

        return {
          ...student,
          courses,
          enrollmentCount: courses.length,
          completedCourses: courses.filter((course) => course.status === 'COMPLETED').length,
          averageProgress: courses.length ? courses.reduce((sum, course) => sum + (course.progress || 0), 0) / courses.length : 0,
        };
      })
      .filter(Boolean)
      .filter((student) =>
        !keyword
        || student.name?.toLowerCase().includes(keyword)
        || student.email?.toLowerCase().includes(keyword)
        || student.phone?.toLowerCase().includes(keyword)
        || student.courses?.some((course) => course.title?.toLowerCase().includes(keyword))
      );
  }, [data.students, query, selectedCourseId]);

  const filteredStats = useMemo(() => {
    if (selectedCourseId === 'ALL') return data;
    const courses = students.flatMap((student) => student.courses || []);
    return {
      totalStudents: students.length,
      totalEnrollments: courses.length,
      completedEnrollments: courses.filter((course) => course.status === 'COMPLETED').length,
      averageProgress: courses.length ? courses.reduce((sum, course) => sum + (course.progress || 0), 0) / courses.length : 0,
    };
  }, [data, selectedCourseId, students]);

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
          <p className="mt-1 text-sm text-slate-500">Theo dõi thông tin và tiến độ học tập trong các khóa học của bạn.</p>
        </div>
        <div className="flex w-full flex-col gap-3 sm:flex-row xl:w-auto">
          <div className="relative min-w-0 sm:w-72">
            <Filter className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-purple-500" />
            <select
              value={selectedCourseId}
              onChange={(event) => setSelectedCourseId(event.target.value)}
              className="w-full appearance-none rounded-2xl border border-slate-200 bg-white py-3 pl-11 pr-9 text-sm font-medium text-slate-700 outline-none transition focus:border-purple-400 focus:ring-4 focus:ring-purple-100"
            >
              <option value="ALL">Tất cả khóa học</option>
              {(data.courses || []).map((course) => <option key={course.id} value={course.id}>{course.title}</option>)}
            </select>
          </div>
          <div className="relative min-w-0 sm:w-80">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Tìm học viên hoặc khóa học..."
              className="w-full rounded-2xl border border-slate-200 bg-white py-3 pl-11 pr-4 text-sm outline-none transition focus:border-purple-400 focus:ring-4 focus:ring-purple-100"
            />
          </div>
        </div>
      </div>

      {error && <div className="mb-5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard icon={Users} label="Tổng học viên" value={numberFormatter.format(filteredStats.totalStudents || 0)} color="bg-sky-50 text-sky-600" />
        <MetricCard icon={BookOpen} label="Lượt ghi danh" value={numberFormatter.format(filteredStats.totalEnrollments || 0)} color="bg-purple-50 text-purple-600" />
        <MetricCard icon={GraduationCap} label="Tiến độ trung bình" value={`${formatProgress(filteredStats.averageProgress)}%`} color="bg-emerald-50 text-emerald-600" />
        <MetricCard icon={CheckCircle2} label="Lượt hoàn thành" value={numberFormatter.format(filteredStats.completedEnrollments || 0)} color="bg-amber-50 text-amber-600" />
      </div>

      <section className="overflow-hidden rounded-3xl border border-slate-100 bg-white shadow-sm">
        <div className="border-b border-slate-100 px-5 py-4">
          <h2 className="font-semibold text-slate-900">Thông tin học viên</h2>
          <p className="mt-1 text-xs text-slate-500">
            Hiển thị {students.length} học viên {selectedCourseId === 'ALL' ? 'trong tất cả khóa học' : 'thuộc khóa học đã chọn'}
          </p>
        </div>

        {students.length === 0 ? (
          <div className="p-12 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-50 text-slate-400">
              <Users className="h-6 w-6" />
            </div>
            <p className="mt-4 font-medium text-slate-700">{query ? 'Không tìm thấy học viên phù hợp.' : 'Chưa có học viên nào.'}</p>
            <p className="mt-1 text-sm text-slate-500">Học viên sẽ xuất hiện sau khi ghi danh vào khóa học của bạn.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {students.map((student) => <StudentRow key={student.id} student={student} />)}
          </div>
        )}
      </section>
    </div>
  );
};

const StudentRow = ({ student }) => (
  <article className="grid gap-5 px-5 py-5 transition hover:bg-slate-50/70 lg:grid-cols-[1fr_1.4fr_0.7fr] lg:items-center">
    <div className="flex min-w-0 items-center gap-3">
      <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-purple-400 to-fuchsia-400 text-sm font-semibold text-white">
        {student.avatar ? <img src={student.avatar} alt={student.name} className="h-full w-full object-cover" /> : initials(student.name || student.email)}
      </div>
      <div className="min-w-0">
        <p className="truncate font-semibold text-slate-900">{student.name || 'Học viên'}</p>
        <p className="mt-1 flex items-center gap-1.5 truncate text-sm text-slate-500">
          <Mail className="h-3.5 w-3.5 shrink-0" />
          {student.email}
        </p>
        {student.phone && <p className="mt-1 text-xs text-slate-400">{student.phone}</p>}
      </div>
    </div>

    <div className="min-w-0">
      <div className="mb-2 flex items-center justify-between gap-3">
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">
          {student.enrollmentCount || student.courses?.length || 0} khóa học
        </p>
        <p className="flex items-center gap-1.5 text-xs text-slate-400">
          <CalendarDays className="h-3.5 w-3.5" />
          Ghi danh gần nhất: {formatDate(student.lastEnrollmentAt)}
        </p>
      </div>
      <div className="space-y-2">
        {(student.courses || []).map((course) => (
          <div key={course.id} className="flex items-center gap-3 rounded-2xl bg-slate-50 px-3 py-2.5">
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-slate-800">{course.title || 'Khóa học'}</p>
              <div className="mt-1.5 h-1.5 rounded-full bg-slate-200">
                <div className="h-full rounded-full bg-purple-500" style={{ width: `${clampProgress(course.progress)}%` }} />
              </div>
            </div>
            <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium ${course.status === 'COMPLETED' ? 'bg-emerald-100 text-emerald-700' : 'bg-purple-100 text-purple-700'}`}>
              {course.status === 'COMPLETED' ? 'Đã hoàn thành' : `${formatProgress(course.progress)}%`}
            </span>
          </div>
        ))}
      </div>
    </div>

    <div className="lg:text-right">
      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">Tiến độ trung bình</p>
      <p className="mt-1 text-2xl font-semibold text-slate-900">{formatProgress(student.averageProgress)}%</p>
      <p className="mt-1 text-xs text-slate-500">{student.completedCourses || 0} khóa đã hoàn thành</p>
      <span className={`mt-3 inline-flex rounded-full px-3 py-1 text-xs font-medium ${(student.averageProgress || 0) >= 100 ? 'bg-emerald-100 text-emerald-700' : 'bg-sky-100 text-sky-700'}`}>
        {(student.averageProgress || 0) >= 100 ? 'Đã hoàn thành' : 'Đang học'}
      </span>
    </div>
  </article>
);

const MetricCard = ({ icon: Icon, label, value, color }) => (
  <div className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm">
    <div className={`mb-4 flex h-11 w-11 items-center justify-center rounded-2xl ${color}`}>
      <Icon className="h-5 w-5" />
    </div>
    <p className="text-sm font-medium text-slate-500">{label}</p>
    <p className="mt-1 text-2xl font-semibold text-slate-900">{value}</p>
  </div>
);

const normalizeLegacyData = (enrollments) => {
  const grouped = new Map();
  enrollments.forEach((enrollment) => {
    if (!enrollment.user) return;
    const current = grouped.get(enrollment.user.id) || {
      ...enrollment.user,
      courses: [],
      averageProgress: 0,
      completedCourses: 0,
    };
    current.courses.push({
      ...enrollment.course,
      progress: enrollment.progress || 0,
      enrolledAt: enrollment.createdAt,
      completedAt: enrollment.completedAt,
      status: enrollment.completedAt ? 'COMPLETED' : 'LEARNING',
    });
    grouped.set(enrollment.user.id, current);
  });

  const students = [...grouped.values()].map((student) => ({
    ...student,
    enrollmentCount: student.courses.length,
    completedCourses: student.courses.filter((course) => course.status === 'COMPLETED').length,
    averageProgress: student.courses.reduce((sum, course) => sum + course.progress, 0) / student.courses.length,
    lastEnrollmentAt: student.courses.map((course) => course.enrolledAt).sort().at(-1),
  }));

  return {
    ...emptyData,
    students,
    totalStudents: students.length,
    totalEnrollments: enrollments.length,
    completedEnrollments: enrollments.filter((enrollment) => enrollment.completedAt).length,
    averageProgress: students.length ? students.reduce((sum, student) => sum + student.averageProgress, 0) / students.length : 0,
  };
};

const initials = (value = '') => value.split(' ').map((part) => part[0]).join('').slice(0, 2).toUpperCase();
const clampProgress = (value) => Math.min(100, Math.max(0, Number(value) || 0));
const formatProgress = (value) => numberFormatter.format(Math.round(Number(value) || 0));
const formatDate = (value) => (value ? dateFormatter.format(new Date(value)) : 'Chưa có');

export default InstructorStudents;
