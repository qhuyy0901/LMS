import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { BookOpen, Edit, Plus, Search } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const numberFormatter = new Intl.NumberFormat('vi-VN');

const text = {
  loadError: 'L\u1ed7i t\u1ea3i d\u1eef li\u1ec7u kh\u00f3a h\u1ecdc:',
  pageTitle: 'Kh\u00f3a h\u1ecdc c\u1ee7a t\u00f4i',
  pageDescription: 'Qu\u1ea3n l\u00fd, ch\u1ec9nh s\u1eeda v\u00e0 theo d\u00f5i c\u00e1c kh\u00f3a h\u1ecdc b\u1ea1n \u0111ang ph\u1ee5 tr\u00e1ch.',
  createCourse: 'T\u1ea1o kh\u00f3a h\u1ecdc m\u1edbi',
  search: 'T\u00ecm ki\u1ebfm kh\u00f3a h\u1ecdc...',
  course: 'Kh\u00f3a h\u1ecdc',
  status: 'Tr\u1ea1ng th\u00e1i',
  price: 'Gi\u00e1',
  students: 'H\u1ecdc vi\u00ean',
  lessons: 'B\u00e0i gi\u1ea3ng',
  actions: 'Thao t\u00e1c',
  empty: 'B\u1ea1n ch\u01b0a c\u00f3 kh\u00f3a h\u1ecdc n\u00e0o. H\u00e3y b\u1ea5m "T\u1ea1o kh\u00f3a h\u1ecdc m\u1edbi" \u0111\u1ec3 b\u1eaft \u0111\u1ea7u.',
  published: 'C\u00f4ng khai',
  draft: 'B\u1ea3n nh\u00e1p',
  free: 'Mi\u1ec5n ph\u00ed',
  edit: 'Ch\u1ec9nh s\u1eeda kh\u00f3a h\u1ecdc',
};

const InstructorDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user || (user.role !== 'INSTRUCTOR' && user.role !== 'ADMIN')) {
      navigate('/explore');
      return;
    }

    const fetchDashboard = async () => {
      try {
        const response = await axios.get('/api/instructor/courses');
        setDashboardData({ courses: response.data });
      } catch (error) {
        console.error(text.loadError, error);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboard();
  }, [user, navigate]);

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-purple-500 border-t-transparent" />
      </div>
    );
  }

  const courses = dashboardData?.courses || [];

  return (
    <div className="animate-fade-in-up">
      <div className="mb-6 flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div>
          <h1 className="mb-1 text-2xl font-semibold tracking-tight text-slate-900 md:text-3xl">
            {text.pageTitle}
          </h1>
          <p className="max-w-2xl text-sm text-slate-500">{text.pageDescription}</p>
        </div>
        <button
          onClick={() => navigate('/instructor/courses/new')}
          className="inline-flex items-center gap-2 rounded-full bg-purple-600 px-5 py-2.5 text-sm font-medium text-white shadow-sm transition-all hover:-translate-y-0.5 hover:bg-purple-700 hover:shadow-md"
        >
          <Plus className="h-4 w-4" />
          {text.createCourse}
        </button>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
        <div className="flex flex-col gap-3 border-b border-slate-100 p-5 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="font-semibold text-slate-900">{text.pageTitle}</h2>
            <p className="mt-1 text-sm text-slate-500">
              {numberFormatter.format(courses.length)} {text.course.toLowerCase()}
            </p>
          </div>
          <div className="relative w-full md:w-80">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder={text.search}
              className="w-full rounded-full border border-slate-200 bg-slate-50 py-2.5 pl-9 pr-4 text-sm transition-colors focus:border-purple-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-purple-100"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/50">
                <TableHead>{text.course}</TableHead>
                <TableHead>{text.status}</TableHead>
                <TableHead>{text.price}</TableHead>
                <TableHead>{text.students}</TableHead>
                <TableHead>{text.lessons}</TableHead>
                <TableHead className="text-right">{text.actions}</TableHead>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {courses.length === 0 ? (
                <tr>
                  <td colSpan="6" className="py-12 text-center text-sm text-slate-500">
                    {text.empty}
                  </td>
                </tr>
              ) : (
                courses.map((course) => (
                  <tr key={course.id} className="group transition-colors hover:bg-slate-50/50">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-purple-50">
                          <BookOpen className="h-5 w-5 text-purple-600" />
                        </div>
                        <p className="line-clamp-1 text-sm font-medium text-slate-900">{course.title}</p>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      {course.isPublished ? (
                        <StatusBadge color="emerald" label={text.published} />
                      ) : (
                        <StatusBadge color="slate" label={text.draft} />
                      )}
                    </td>
                    <td className="px-5 py-4 text-sm font-medium text-slate-600">
                      {Number(course.price || 0) === 0
                        ? text.free
                        : `${numberFormatter.format(course.price)} \u0111`}
                    </td>
                    <td className="px-5 py-4 text-sm text-slate-600">
                      {numberFormatter.format(course.enrollments || 0)}
                    </td>
                    <td className="px-5 py-4 text-sm text-slate-600">
                      {numberFormatter.format(course.lessons || 0)}
                    </td>
                    <td className="px-5 py-4 text-right">
                      <button
                        onClick={() => navigate(`/instructor/courses/${course.id}`)}
                        className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-purple-50 hover:text-purple-600"
                        title={text.edit}
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

const TableHead = ({ children, className = '' }) => (
  <th className={`px-5 py-4 text-xs font-semibold uppercase tracking-wider text-slate-500 ${className}`}>
    {children}
  </th>
);

const StatusBadge = ({ color, label }) => {
  const styles =
    color === 'emerald'
      ? 'bg-emerald-50 text-emerald-700 [&>span]:bg-emerald-500'
      : 'bg-slate-100 text-slate-600 [&>span]:bg-slate-400';

  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${styles}`}>
      <span className="h-1.5 w-1.5 rounded-full" />
      {label}
    </span>
  );
};

export default InstructorDashboard;
