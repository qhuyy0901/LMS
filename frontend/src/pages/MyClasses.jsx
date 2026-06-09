import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import {
  BookOpen,
  CheckCircle2,
  Clock,
  Filter,
  MessageCircle,
  MoreHorizontal,
  Plus,
  Search,
  Users,
  Video,
} from 'lucide-react';
import { getFileUrl } from '../utils/fileUtils';

const numberFormatter = new Intl.NumberFormat('vi-VN');
const dateFormatter = new Intl.DateTimeFormat('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
const timeFormatter = new Intl.DateTimeFormat('vi-VN', { hour: '2-digit', minute: '2-digit' });

const tabs = [
  { key: 'active', label: 'Đang học' },
  { key: 'upcoming', label: 'Sắp tới' },
  { key: 'completed', label: 'Đã hoàn thành' },
  { key: 'archived', label: 'Đã lưu trữ' },
];

const statusMeta = {
  active: { label: 'Đang học', badge: 'bg-purple-600 text-white', tab: 'Đang học' },
  upcoming: { label: 'Sắp tới', badge: 'bg-amber-500 text-white', tab: 'Sắp tới' },
  completed: { label: 'Đã hoàn thành', badge: 'bg-emerald-500 text-white', tab: 'Đã hoàn thành' },
  archived: { label: 'Đã lưu trữ', badge: 'bg-slate-500 text-white', tab: 'Đã lưu trữ' },
};

const clampProgress = (value) => Math.min(100, Math.max(0, Number(value || 0)));
const getCourse = (enrollment) => enrollment?.course || {};

const getCourseStatus = (enrollment) => {
  const course = getCourse(enrollment);
  const progress = clampProgress(enrollment.progress);
  const now = new Date();
  const startDate = course.startDate ? new Date(course.startDate) : null;
  const endDate = course.endDate ? new Date(course.endDate) : null;

  if (enrollment.completedAt || progress >= 100) return 'completed';
  if (startDate && startDate > now) return 'upcoming';
  if (endDate && endDate < now) return 'archived';
  return 'active';
};

const formatDuration = (seconds = 0) => {
  const total = Number(seconds || 0);
  if (total <= 0) return 'Chưa có thời lượng';

  const hours = Math.floor(total / 3600);
  const minutes = Math.round((total % 3600) / 60);

  if (hours <= 0) return `${minutes} phút`;
  return minutes > 0 ? `${hours} giờ ${minutes} phút` : `${hours} giờ`;
};

const uniqueBy = (items, selector) => {
  const seen = new Set();
  return items.filter((item) => {
    const key = selector(item);
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

const MyClasses = () => {
  const navigate = useNavigate();
  const [enrollments, setEnrollments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('active');
  const [query, setQuery] = useState('');

  useEffect(() => {
    let isMounted = true;

    const loadClasses = async () => {
      try {
        setLoading(true);
        setError('');
        const response = await axios.get('/api/courses/enrolled');
        if (isMounted) setEnrollments(Array.isArray(response.data) ? response.data : []);
      } catch (err) {
        if (isMounted) {
          setError(err.response?.data?.message || err.message || 'Không thể tải lớp đang học');
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    loadClasses();
    return () => {
      isMounted = false;
    };
  }, []);

  const enrichedEnrollments = useMemo(
    () =>
      enrollments
        .filter((item) => item.course)
        .map((item) => ({ ...item, status: getCourseStatus(item) })),
    [enrollments]
  );

  const counts = useMemo(
    () =>
      tabs.reduce((result, tab) => {
        result[tab.key] = enrichedEnrollments.filter((item) => item.status === tab.key).length;
        return result;
      }, {}),
    [enrichedEnrollments]
  );

  const filteredClasses = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return enrichedEnrollments.filter((item) => {
      const course = getCourse(item);
      const matchesTab = item.status === activeTab;
      const matchesQuery =
        !normalizedQuery ||
        [course.title, course.category, course.instructorName]
          .filter(Boolean)
          .some((value) => value.toLowerCase().includes(normalizedQuery));

      return matchesTab && matchesQuery;
    });
  }, [activeTab, enrichedEnrollments, query]);

  const activeClasses = enrichedEnrollments.filter((item) => item.status === 'active');
  const featuredClass = activeClasses[0] || enrichedEnrollments[0];

  const upcomingClasses = enrichedEnrollments
    .filter((item) => {
      const course = getCourse(item);
      return course.startDate || course.endDate;
    })
    .sort((a, b) => {
      const aDate = new Date(getCourse(a).startDate || getCourse(a).endDate);
      const bDate = new Date(getCourse(b).startDate || getCourse(b).endDate);
      return aDate - bDate;
    })
    .slice(0, 4);

  const instructors = uniqueBy(
    enrichedEnrollments.map((item) => ({
      name: getCourse(item).instructorName || 'Giảng viên',
      category: getCourse(item).category || 'Khóa học',
      courseId: getCourse(item).id,
    })),
    (item) => item.name
  ).slice(0, 4);

  return (
    <div className="animate-fade-in-up">
      <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h1 className="mb-1 text-2xl font-semibold tracking-tight text-slate-900 md:text-3xl">Lớp của tôi</h1>
          <p className="text-sm text-slate-500">Quản lý các khóa học bạn đang tham gia và lịch học từ dữ liệu thật.</p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <label className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Tìm lớp, chủ đề..."
              className="h-11 w-full rounded-full border border-slate-200 bg-white pl-9 pr-4 text-sm outline-none transition focus:border-purple-400 focus:ring-4 focus:ring-purple-100 sm:w-64"
            />
          </label>
          <button className="inline-flex items-center justify-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-600">
            <Filter className="h-4 w-4" />
            Bộ lọc
          </button>
          <button
            onClick={() => navigate('/explore')}
            className="inline-flex items-center justify-center gap-2 rounded-full bg-purple-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-purple-700"
          >
            <Plus className="h-4 w-4" />
            Tham gia lớp
          </button>
        </div>
      </div>

      <div className="mb-6 flex items-center gap-2 overflow-x-auto border-b border-slate-200">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`whitespace-nowrap px-4 py-2.5 text-sm font-medium ${
              activeTab === tab.key ? 'border-b-2 border-purple-600 text-purple-700' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            {tab.label}
            <span
              className={`ml-1 rounded-full px-2 py-0.5 text-xs ${
                activeTab === tab.key ? 'bg-purple-100 text-purple-700' : 'bg-slate-100 text-slate-500'
              }`}
            >
              {counts[tab.key] || 0}
            </span>
          </button>
        ))}
      </div>

      {error && <div className="mb-6 rounded-2xl border border-rose-100 bg-rose-50 px-5 py-4 text-sm text-rose-600">{error}</div>}

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <div className="space-y-6 xl:col-span-2">
          {loading ? (
            <div className="h-56 animate-pulse rounded-2xl bg-slate-100" />
          ) : featuredClass ? (
            <FeaturedClass enrollment={featuredClass} onOpen={() => navigate(`/course/${getCourse(featuredClass).id}`)} />
          ) : (
            <EmptyHero onExplore={() => navigate('/explore')} />
          )}

          {loading ? (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {[0, 1, 2, 3].map((item) => (
                <div key={item} className="h-72 animate-pulse rounded-2xl bg-slate-100" />
              ))}
            </div>
          ) : filteredClasses.length > 0 ? (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {filteredClasses.map((enrollment) => (
                <ClassCard key={enrollment.id} enrollment={enrollment} onOpen={() => navigate(`/course/${getCourse(enrollment).id}`)} />
              ))}
            </div>
          ) : (
            <EmptyState
              title="Không có lớp phù hợp"
              description={query ? 'Hãy thử đổi từ khóa tìm kiếm.' : `Bạn chưa có lớp nào ở trạng thái "${statusMeta[activeTab].tab}".`}
              actionLabel="Khám phá khóa học"
              onAction={() => navigate('/explore')}
            />
          )}

          <section className="rounded-2xl border border-slate-100 bg-white p-6">
            <div className="mb-5 flex items-center justify-between">
              <h3 className="text-xl font-semibold tracking-tight text-slate-900">Bài tập cần hoàn thành</h3>
              <BookOpen className="h-5 w-5 text-slate-300" />
            </div>
            <EmptyState
              compact
              title="Chưa có bài tập thật"
              description="Khi giảng viên giao bài tập cho khóa học, danh sách sẽ hiển thị tại đây."
            />
          </section>
        </div>

        <aside className="space-y-6">
          <section className="rounded-2xl border border-slate-100 bg-white p-6">
            <div className="mb-5 flex items-center justify-between">
              <h3 className="text-xl font-semibold tracking-tight text-slate-900">Lịch học sắp tới</h3>
              <MoreHorizontal className="h-5 w-5 text-slate-300" />
            </div>
            <div className="space-y-4">
              {upcomingClasses.length > 0 ? (
                upcomingClasses.map((enrollment) => <ScheduleItem key={enrollment.id} enrollment={enrollment} />)
              ) : (
                <EmptyState compact title="Chưa có lịch học" description="Các khóa học hiện tại chưa đặt ngày bắt đầu hoặc kết thúc." />
              )}
            </div>
          </section>

          <section className="rounded-2xl border border-slate-100 bg-white p-6">
            <div className="mb-5 flex items-center justify-between">
              <h3 className="text-xl font-semibold tracking-tight text-slate-900">Giảng viên của bạn</h3>
              <button onClick={() => navigate('/instructors')} className="text-sm font-medium text-purple-600">
                Xem tất cả
              </button>
            </div>
            <div className="space-y-4">
              {instructors.length > 0 ? (
                instructors.map((instructor, index) => (
                  <div key={`${instructor.name}-${instructor.courseId}`} className="flex items-center gap-3">
                    <div className={`flex h-10 w-10 items-center justify-center rounded-full text-sm font-semibold text-white ${avatarBg(index)}`}>
                      {instructor.name.trim().charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-slate-900">{instructor.name}</p>
                      <p className="truncate text-xs text-slate-400">{instructor.category}</p>
                    </div>
                    <button className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-50">
                      <MessageCircle className="h-4 w-4 text-slate-500" />
                    </button>
                  </div>
                ))
              ) : (
                <EmptyState compact title="Chưa có giảng viên" description="Bạn cần tham gia khóa học để thấy giảng viên của mình." />
              )}
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
};

const FeaturedClass = ({ enrollment, onOpen }) => {
  const course = getCourse(enrollment);
  const progress = clampProgress(enrollment.progress);
  const nextDate = course.startDate || course.endDate;

  return (
    <section className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-purple-100 via-purple-50 to-pink-50 p-6">
      <div className="relative z-10 max-w-2xl">
        <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-purple-600 px-3 py-1 text-xs font-medium text-white">
          <span className="h-1.5 w-1.5 rounded-full bg-white" />
          LỚP ĐANG HỌC
        </div>
        <h2 className="mb-2 text-xl font-semibold tracking-tight text-purple-900 md:text-2xl">{course.title}</h2>
        <p className="mb-4 text-sm text-slate-600">
          Giảng viên: {course.instructorName || 'Giảng viên'} · Tiến độ {progress}%
          {nextDate ? ` · ${dateFormatter.format(new Date(nextDate))}` : ''}
        </p>
        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={onOpen}
            className="inline-flex items-center gap-2 rounded-full bg-purple-600 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-purple-700"
          >
            <Video className="h-4 w-4" />
            Vào học ngay
          </button>
          <span className="inline-flex items-center gap-2 rounded-full bg-white/80 px-3 py-2 text-xs font-medium text-slate-600">
            <Users className="h-4 w-4" />
            {numberFormatter.format(course.studentCount || 0)} học viên
          </span>
        </div>
      </div>
      <div className="absolute right-8 top-1/2 hidden h-28 w-40 -translate-y-1/2 overflow-hidden rounded-2xl bg-white/50 md:block">
        {course.thumbnail ? (
          <img src={getFileUrl(course.thumbnail)} alt={course.title} className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <BookOpen className="h-10 w-10 text-purple-400" />
          </div>
        )}
      </div>
    </section>
  );
};

const ClassCard = ({ enrollment, onOpen }) => {
  const course = getCourse(enrollment);
  const progress = clampProgress(enrollment.progress);
  const status = statusMeta[enrollment.status] || statusMeta.active;

  return (
    <article onClick={onOpen} className="group cursor-pointer rounded-2xl border border-slate-100 bg-white p-5 transition hover:-translate-y-1 hover:shadow-lg">
      <div className="relative mb-4 flex aspect-video items-center justify-center overflow-hidden rounded-xl bg-gradient-to-br from-purple-100 to-pink-100">
        {course.thumbnail ? (
          <img src={getFileUrl(course.thumbnail)} alt={course.title} className="h-full w-full object-cover transition group-hover:scale-105" />
        ) : (
          <BookOpen className="h-12 w-12 text-purple-400" />
        )}
        <span className="absolute left-2 top-2 rounded-full bg-white/90 px-2 py-1 text-[10px] font-medium text-slate-700">
          {course.category || 'Chung'}
        </span>
        <span className={`absolute right-2 top-2 rounded-full px-2 py-1 text-[10px] font-medium ${status.badge}`}>
          {status.label}
        </span>
      </div>
      <p className="mb-1 text-xs text-slate-400">{course.instructorName || 'Giảng viên'}</p>
      <h4 className="mb-3 line-clamp-2 text-sm font-medium text-slate-900">{course.title}</h4>
      <div className="mb-3 flex items-center justify-between text-xs text-slate-500">
        <span className="inline-flex items-center gap-1">
          <Clock className="h-3.5 w-3.5" />
          {numberFormatter.format(course.lessonCount || 0)} bài học
        </span>
        <span className="inline-flex items-center gap-1">
          <Users className="h-3.5 w-3.5" />
          {numberFormatter.format(course.studentCount || 0)} học viên
        </span>
      </div>
      <div className="mb-2 h-1.5 overflow-hidden rounded-full bg-slate-100">
        <div className="h-full rounded-full bg-purple-500" style={{ width: `${progress}%` }} />
      </div>
      <p className="text-xs text-slate-500">Tiến độ {progress}% · {formatDuration(course.totalDurationSeconds)}</p>
    </article>
  );
};

const ScheduleItem = ({ enrollment }) => {
  const course = getCourse(enrollment);
  const date = course.startDate || course.endDate;
  const isStarting = Boolean(course.startDate);

  return (
    <div className="flex gap-3">
      <div className="flex w-14 flex-col items-center">
        <span className="text-xs font-medium text-slate-500">{timeFormatter.format(new Date(date))}</span>
        <span className="text-[10px] text-slate-400">{dateFormatter.format(new Date(date))}</span>
      </div>
      <div className={`flex-1 rounded-lg border-l-4 p-3 ${isStarting ? 'border-purple-500 bg-purple-50' : 'border-slate-300 bg-slate-50'}`}>
        <p className="text-sm font-medium text-slate-900">{course.title}</p>
        <p className="mt-0.5 text-xs text-slate-500">
          {course.instructorName || 'Giảng viên'} · {isStarting ? 'Bắt đầu khóa học' : 'Kết thúc khóa học'}
        </p>
      </div>
    </div>
  );
};

const EmptyHero = ({ onExplore }) => (
  <section className="rounded-2xl border border-dashed border-slate-200 bg-white px-6 py-12 text-center">
    <BookOpen className="mx-auto mb-3 h-10 w-10 text-slate-300" />
    <h2 className="mb-1 text-lg font-semibold text-slate-900">Bạn chưa tham gia lớp nào</h2>
    <p className="mb-5 text-sm text-slate-500">Hãy khám phá khóa học và bắt đầu lớp học đầu tiên.</p>
    <button onClick={onExplore} className="rounded-full bg-purple-600 px-5 py-2.5 text-sm font-medium text-white">
      Khám phá khóa học
    </button>
  </section>
);

const EmptyState = ({ title, description, actionLabel, onAction, compact = false }) => (
  <div className={`rounded-2xl border border-dashed border-slate-200 bg-slate-50 text-center ${compact ? 'px-4 py-6' : 'px-6 py-12'}`}>
    <CheckCircle2 className="mx-auto mb-3 h-7 w-7 text-slate-300" />
    <h3 className="mb-1 text-sm font-semibold text-slate-800">{title}</h3>
    <p className="mx-auto max-w-sm text-sm text-slate-500">{description}</p>
    {actionLabel && (
      <button onClick={onAction} className="mt-4 rounded-full bg-purple-600 px-4 py-2 text-sm font-medium text-white">
        {actionLabel}
      </button>
    )}
  </div>
);

const avatarBg = (index) =>
  [
    'bg-gradient-to-br from-pink-400 to-orange-400',
    'bg-gradient-to-br from-blue-400 to-cyan-400',
    'bg-gradient-to-br from-purple-400 to-indigo-400',
    'bg-gradient-to-br from-emerald-400 to-teal-400',
  ][index % 4];

export default MyClasses;
