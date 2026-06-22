import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import {
  BookOpen,
  ChevronDown,
  Eye,
  EyeOff,
  FileX,
  FilePenLine,
  Layers,
  Plus,
  Search,
  Trash2,
  UploadCloud,
  LayoutGrid,
  List,
  MoreVertical,
  Users,
  DollarSign,
  GraduationCap,
  BookOpenCheck
} from 'lucide-react';

const apiRoot = (import.meta.env.VITE_API_URL || 'http://localhost:5000/api').replace(/\/api\/?$/, '');
const money = new Intl.NumberFormat('vi-VN');

const STATUS_OPTIONS = [
  { value: 'ALL', label: 'Tất cả' },
  { value: 'DRAFT', label: 'Bản nháp' },
  { value: 'PUBLIC', label: 'Đã xuất bản' },
  { value: 'HIDDEN', label: 'Đã ẩn' },
];

const normalizeStatus = (course) => {
  if (course.trangThai === 'HIDDEN' || course.status === 'HIDDEN') return 'HIDDEN';
  if (course.isPublished || course.daXuatBan || course.trangThai === 'PUBLIC') return 'PUBLIC';
  return 'DRAFT';
};

const isDraftOrUnpublished = (course) => {
  const currentStatus = normalizeStatus(course);
  if (currentStatus === 'DRAFT') return true;
  if (currentStatus === 'HIDDEN' && !course.ngayXuatBan) return true;
  return false;
};

const statusLabel = {
  DRAFT: 'Bản nháp',
  PUBLIC: 'Đã xuất bản',
  HIDDEN: 'Đã ẩn',
};

const statusClass = {
  DRAFT: 'bg-slate-100 text-slate-700 ring-1 ring-slate-600/10',
  PUBLIC: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-600/10',
  HIDDEN: 'bg-amber-50 text-amber-700 ring-1 ring-amber-600/10',
};

const getImageUrl = (thumbnail) => {
  if (!thumbnail) return '';
  if (/^https?:\/\//i.test(thumbnail)) return thumbnail;
  return `${apiRoot}${thumbnail.startsWith('/') ? thumbnail : `/${thumbnail}`}`;
};

const getPurchaseCount = (course) => Number(course.purchaseCount ?? course.purchases ?? course.totalPurchases ?? 0);
const getStudentCount = (course) => Number(course.studentCount ?? course.enrollments ?? 0);
const canDeleteCourse = (course) => course.canDelete ?? (getPurchaseCount(course) === 0 && getStudentCount(course) === 0);

export default function InstructorCourses() {
  const navigate = useNavigate();
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [apiError, setApiError] = useState('');
  const [keyword, setKeyword] = useState('');
  const [status, setStatus] = useState('ALL');
  const [notice, setNotice] = useState('');
  const [viewMode, setViewMode] = useState('grid'); // 'grid' | 'list'
  const [activeDropdownId, setActiveDropdownId] = useState(null);

  const loadCourses = useCallback(async () => {
    setLoading(true);
    setApiError('');
    try {
      const response = await axios.get('/api/instructor/courses');
      setCourses(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      console.error('Không thể tải danh sách khóa học.', error);
      setApiError('Không thể tải danh sách khóa học.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCourses();
  }, [loadCourses]);

  // Click outside to close dropdowns
  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (!e.target.closest('.dropdown-trigger') && !e.target.closest('.dropdown-menu')) {
        setActiveDropdownId(null);
      }
    };
    document.addEventListener('click', handleOutsideClick);
    return () => document.removeEventListener('click', handleOutsideClick);
  }, []);

  const filteredCourses = useMemo(() => {
    const searchText = keyword.trim().toLowerCase();
    return courses.filter((course) => {
      const matchesSearch = !searchText || course.title?.toLowerCase().includes(searchText);
      const matchesStatus = status === 'ALL' || normalizeStatus(course) === status;
      return matchesSearch && matchesStatus;
    });
  }, [courses, keyword, status]);

  // Calculate statistics
  const stats = useMemo(() => {
    const total = courses.length;
    const published = courses.filter((c) => normalizeStatus(c) === 'PUBLIC').length;
    const draft = courses.filter((c) => normalizeStatus(c) === 'DRAFT').length;
    const students = courses.reduce((sum, c) => sum + getStudentCount(c), 0);
    return { total, published, draft, students };
  }, [courses]);

  const publishCourse = async (course) => {
    setNotice('');
    setActiveDropdownId(null);
    try {
      await axios.patch(`/api/instructor/courses/${course.id}/publish`, { isPublished: true });
      setNotice('Đã xuất bản khóa học.');
      await loadCourses();
    } catch (error) {
      const fallback = 'Khóa học cần có ít nhất 1 chương và 1 bài học trước khi xuất bản.';
      setNotice(error.response?.status === 400 ? fallback : error.response?.data?.message || fallback);
    }
  };

  const hideCourse = async (course) => {
    setNotice('');
    setActiveDropdownId(null);
    try {
      await axios.patch(`/api/instructor/courses/${course.id}/hide`, {});
      setNotice('Đã ẩn khóa học.');
      await loadCourses();
    } catch (error) {
      setNotice(error.response?.data?.message || 'Không thể ẩn khóa học.');
    }
  };

  const deleteCourse = async (course) => {
    setActiveDropdownId(null);
    if (!window.confirm('Bạn có chắc muốn xóa khóa học này không?')) return;

    if (getPurchaseCount(course) > 0) {
      setNotice('Khóa học đã có sinh viên mua nên không thể xóa. Bạn chỉ có thể ẩn khóa học.');
      return;
    }

    if (getStudentCount(course) > 0) {
      setNotice('Khóa học đã có học viên nên không thể xóa. Bạn chỉ có thể ẩn khóa học.');
      return;
    }

    setNotice('');
    try {
      await axios.delete(`/api/instructor/courses/${course.id}`);
      setNotice('Đã xóa khóa học.');
      await loadCourses();
    } catch (error) {
      setNotice(error.response?.data?.message || 'Không thể xóa khóa học.');
    }
  };

  return (
    <div className="space-y-6">
      <style>{`
        @keyframes slideUpFade {
          from {
            opacity: 0;
            transform: translateY(16px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-slide-up-fade {
          opacity: 0;
          animation: slideUpFade 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
      `}</style>
      {/* Header */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 md:text-3xl">
            Quản lý Khóa học
          </h1>
          <p className="text-sm text-slate-500">
            Tạo, quản lý và tối ưu hóa các khóa học của bạn trên hệ thống.
          </p>
        </div>
        <button
          type="button"
          onClick={() => navigate('/instructor/courses/new')}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-purple-600 px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-purple-600/10 transition hover:bg-purple-700 hover:shadow-lg hover:shadow-purple-600/20 active:scale-[0.98]"
        >
          <Plus className="h-4.5 w-4.5" />
          Tạo khóa học mới
        </button>
      </div>

      {/* Stats Board */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatsCard
          title="Tổng khóa học"
          value={stats.total}
          icon={BookOpen}
          colorClass="bg-purple-500/10 text-purple-600"
        />
        <StatsCard
          title="Đã xuất bản"
          value={stats.published}
          icon={BookOpenCheck}
          colorClass="bg-emerald-500/10 text-emerald-600"
        />
        <StatsCard
          title="Bản nháp"
          value={stats.draft}
          icon={FileX}
          colorClass="bg-slate-500/10 text-slate-600"
        />
        <StatsCard
          title="Học viên của bạn"
          value={stats.students}
          icon={Users}
          colorClass="bg-blue-500/10 text-blue-600"
        />
      </div>

      {/* Filters Bar */}
      <div className="flex flex-col gap-3 rounded-2xl border border-slate-100 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            value={keyword}
            onChange={(event) => setKeyword(event.target.value)}
            placeholder="Tìm kiếm khóa học theo tên..."
            className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-4 text-sm text-slate-800 outline-none transition focus:border-purple-300 focus:bg-white focus:ring-2 focus:ring-purple-100"
          />
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex bg-slate-100 p-1 rounded-xl">
            {STATUS_OPTIONS.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => setStatus(option.value)}
                className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                  status === option.value
                    ? 'bg-white text-purple-700 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>

          <div className="h-6 w-px bg-slate-200 hidden sm:block"></div>

          {/* Grid/List View Toggle */}
          <div className="flex bg-slate-100 p-1 rounded-xl">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded-lg transition ${
                viewMode === 'grid' ? 'bg-white text-purple-700 shadow-sm' : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              <LayoutGrid className="h-4 w-4" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-1.5 rounded-lg transition ${
                viewMode === 'list' ? 'bg-white text-purple-700 shadow-sm' : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              <List className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {notice && (
        <div className="rounded-xl border border-purple-100 bg-purple-50 px-4 py-3 text-sm font-medium text-purple-700 animate-fade-in">
          {notice}
        </div>
      )}

      {/* Courses Presentation */}
      {loading ? (
        <div className="flex h-60 items-center justify-center rounded-2xl border border-slate-100 bg-white">
          <div className="flex flex-col items-center gap-2">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-purple-200 border-t-purple-600"></div>
            <p className="text-sm font-medium text-slate-500">Đang tải danh sách khóa học...</p>
          </div>
        </div>
      ) : apiError ? (
        <div className="flex h-60 items-center justify-center rounded-2xl border border-red-100 bg-red-50 text-sm font-medium text-red-600">
          {apiError}
        </div>
      ) : courses.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-slate-100 bg-white py-16 text-center">
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-purple-50 text-purple-600">
            <BookOpen className="h-7 w-7" />
          </div>
          <h3 className="mb-1 text-lg font-semibold text-slate-800">Bạn chưa có khóa học nào</h3>
          <p className="mb-6 max-w-sm text-sm text-slate-500">
            Hãy bắt đầu hành trình chia sẻ tri thức của bạn bằng cách tạo bài giảng đầu tiên ngay hôm nay!
          </p>
          <button
            type="button"
            onClick={() => navigate('/instructor/courses/new')}
            className="inline-flex items-center gap-2 rounded-xl bg-purple-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-purple-700 shadow-md shadow-purple-600/10"
          >
            <Plus className="h-4.5 w-4.5" />
            Tạo khóa học mới
          </button>
        </div>
      ) : filteredCourses.length === 0 ? (
        <div className="flex h-48 items-center justify-center rounded-2xl border border-slate-100 bg-white text-sm font-medium text-slate-500">
          Không tìm thấy khóa học phù hợp với bộ lọc hiện tại.
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {filteredCourses.map((course, index) => (
            <CourseCard
              key={course.id}
              course={course}
              index={index}
              onEdit={() => navigate(`/instructor/courses/${course.id}/edit`)}
              onPublish={() => publishCourse(course)}
              onHide={() => hideCourse(course)}
              onDelete={() => deleteCourse(course)}
              onCurriculum={() => navigate(`/instructor/courses/${course.id}`)}
              dropdownOpen={activeDropdownId === course.id}
              setDropdownOpen={(open) => setActiveDropdownId(open ? course.id : null)}
            />
          ))}
        </div>
      ) : (
        <div className="divide-y divide-slate-100 overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
          {filteredCourses.map((course, index) => (
            <CourseRowItem
              key={course.id}
              course={course}
              index={index}
              onEdit={() => navigate(`/instructor/courses/${course.id}/edit`)}
              onPublish={() => publishCourse(course)}
              onHide={() => hideCourse(course)}
              onDelete={() => deleteCourse(course)}
              onCurriculum={() => navigate(`/instructor/courses/${course.id}`)}
              dropdownOpen={activeDropdownId === course.id}
              setDropdownOpen={(open) => setActiveDropdownId(open ? course.id : null)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function StatsCard({ title, value, icon: Icon, colorClass }) {
  return (
    <div className="flex items-center gap-4 rounded-2xl border border-slate-100 bg-white p-4.5 shadow-sm transition hover:shadow-md">
      <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${colorClass}`}>
        <Icon className="h-6 w-6" />
      </div>
      <div>
        <p className="text-xs font-medium text-slate-500">{title}</p>
        <p className="text-xl font-bold text-slate-900">{money.format(value)}</p>
      </div>
    </div>
  );
}

function CourseCard({
  course,
  index = 0,
  onEdit,
  onPublish,
  onHide,
  onDelete,
  onCurriculum,
  dropdownOpen,
  setDropdownOpen,
}) {
  const navigate = useNavigate();
  const currentStatus = normalizeStatus(course);
  const sectionCount = course.sectionCount ?? course.sections?.length ?? 0;
  const lessonCount = course.lessonCount ?? course.totalLessons ?? 0;
  const studentCount = getStudentCount(course);
  const purchaseCount = getPurchaseCount(course);
  const canDelete = canDeleteCourse(course);
  const isDraftOrUnpub = isDraftOrUnpublished(course);

  const description = course.moTaNgan || course.shortDescription || course.description || 'Chưa có mô tả ngắn.';
  const thumbnail = getImageUrl(course.thumbnail || course.anhBia);

  return (
    <div 
      style={{ animationDelay: `${index * 60}ms` }}
      className="animate-slide-up-fade group relative flex flex-col rounded-2xl border border-slate-200/80 bg-white shadow-sm transition-all duration-300 hover:-translate-y-1.5 hover:border-purple-300/60 hover:shadow-md hover:shadow-purple-500/5"
    >
      {/* Thumbnail */}
      <div className="relative aspect-[16/10] w-full overflow-hidden bg-slate-100 rounded-t-2xl">
        {thumbnail ? (
          <img
            src={thumbnail}
            alt={course.title}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-purple-50 text-purple-500">
            <BookOpen className="h-10 w-10" />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-slate-900/40 via-transparent to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
        
        {/* Badges */}
        <div className="absolute left-3 top-3 flex gap-2">
          <span className={`rounded-lg px-2.5 py-1 text-xs font-semibold backdrop-blur-md shadow-sm ${statusClass[currentStatus]}`}>
            {statusLabel[currentStatus]}
          </span>
        </div>
      </div>

      {/* Dropdown Action Trigger */}
      <div className="absolute right-3 top-3 z-20">
        <div className="relative">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setDropdownOpen(!dropdownOpen);
            }}
            className="dropdown-trigger flex h-8 w-8 items-center justify-center rounded-lg bg-white/90 text-slate-600 shadow-sm backdrop-blur-md transition hover:bg-white hover:text-purple-600 active:scale-95"
          >
            <MoreVertical className="h-4.5 w-4.5" />
          </button>

          {dropdownOpen && (
            <DropdownMenu
              course={course}
              currentStatus={currentStatus}
              isDraftOrUnpub={isDraftOrUnpub}
              canDelete={canDelete}
              onEdit={onEdit}
              onPublish={onPublish}
              onHide={onHide}
              onDelete={onDelete}
              onCurriculum={onCurriculum}
              navigate={navigate}
            />
          )}
        </div>
      </div>

      {/* Content */}
      <div className="flex flex-1 flex-col p-4.5">
        <h3 className="line-clamp-1 text-base font-bold text-slate-800 transition-colors group-hover:text-purple-700" title={course.title}>
          {course.title || 'Khóa học chưa có tiêu đề'}
        </h3>
        <p className="mt-1.5 line-clamp-2 text-xs leading-relaxed text-slate-500 flex-1">
          {description}
        </p>

        {/* Metrics Grid */}
        <div className="mt-4 grid grid-cols-2 gap-2 border-t border-slate-100 pt-3 text-xs text-slate-600">
          <div className="flex items-center gap-1">
            <span className="text-slate-400 font-medium">Giá:</span>
            <span className="font-semibold text-slate-800">
              {Number(course.price || 0) === 0 ? 'Miễn phí' : `${money.format(course.price)} đ`}
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <Users className="h-3.5 w-3.5 text-slate-400" />
            <span>{money.format(studentCount)} học viên</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Layers className="h-3.5 w-3.5 text-slate-400" />
            <span>{sectionCount} chương</span>
          </div>
          <div className="flex items-center gap-1.5">
            <BookOpen className="h-3.5 w-3.5 text-slate-400" />
            <span>{lessonCount} bài học</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function CourseRowItem({
  course,
  index = 0,
  onEdit,
  onPublish,
  onHide,
  onDelete,
  onCurriculum,
  dropdownOpen,
  setDropdownOpen,
}) {
  const navigate = useNavigate();
  const currentStatus = normalizeStatus(course);
  const sectionCount = course.sectionCount ?? course.sections?.length ?? 0;
  const lessonCount = course.lessonCount ?? course.totalLessons ?? 0;
  const studentCount = getStudentCount(course);
  const purchaseCount = getPurchaseCount(course);
  const canDelete = canDeleteCourse(course);
  const isDraftOrUnpub = isDraftOrUnpublished(course);

  const description = course.moTaNgan || course.shortDescription || course.description || 'Chưa có mô tả ngắn.';
  const thumbnail = getImageUrl(course.thumbnail || course.anhBia);

  return (
    <article 
      style={{ animationDelay: `${index * 50}ms` }}
      className="animate-slide-up-fade flex flex-col gap-4 p-4 transition hover:bg-slate-50/50 sm:flex-row sm:items-center sm:gap-6"
    >
      {/* Thumbnail */}
      <div className="h-24 w-full shrink-0 overflow-hidden rounded-xl bg-slate-100 sm:h-20 sm:w-32">
        {thumbnail ? (
          <img src={thumbnail} alt={course.title} className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-purple-50 text-purple-500">
            <BookOpen className="h-7 w-7" />
          </div>
        )}
      </div>

      {/* Info & Metrics */}
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="text-base font-bold text-slate-900 line-clamp-1">{course.title || 'Khóa học chưa có tiêu đề'}</h3>
          <span className={`rounded-full px-2 py-0.5 text-3xs font-semibold ${statusClass[currentStatus]}`}>
            {statusLabel[currentStatus]}
          </span>
        </div>
        <p className="mt-1 text-xs text-slate-500 line-clamp-1 max-w-2xl">{description}</p>
        
        <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1.5 text-xs text-slate-600">
          <div className="flex items-center gap-1">
            <span className="text-slate-400">Giá:</span>
            <span className="font-semibold text-slate-800">
              {Number(course.price || 0) === 0 ? 'Miễn phí' : `${money.format(course.price)} đ`}
            </span>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-slate-400">Chương:</span>
            <span className="font-semibold text-slate-800">{sectionCount}</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-slate-400">Bài học:</span>
            <span className="font-semibold text-slate-800">{lessonCount}</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-slate-400">Học viên:</span>
            <span className="font-semibold text-slate-800">{money.format(studentCount)}</span>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="relative self-end sm:self-center">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setDropdownOpen(!dropdownOpen);
          }}
          className="dropdown-trigger flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 shadow-sm transition hover:bg-slate-50 hover:text-purple-600 active:scale-95"
        >
          <MoreVertical className="h-4.5 w-4.5" />
        </button>

        {dropdownOpen && (
          <DropdownMenu
            course={course}
            currentStatus={currentStatus}
            isDraftOrUnpub={isDraftOrUnpub}
            canDelete={canDelete}
            onEdit={onEdit}
            onPublish={onPublish}
            onHide={onHide}
            onDelete={onDelete}
            onCurriculum={onCurriculum}
            navigate={navigate}
            rightAlign
          />
        )}
      </div>
    </article>
  );
}

function DropdownMenu({
  course,
  currentStatus,
  isDraftOrUnpub,
  canDelete,
  onEdit,
  onPublish,
  onHide,
  onDelete,
  onCurriculum,
  navigate,
  rightAlign = false,
}) {
  return (
    <div className={`dropdown-menu absolute z-30 mt-2 w-52 rounded-xl border border-slate-100 bg-white p-1.5 shadow-xl ${
      rightAlign ? 'right-0' : 'left-0 sm:left-auto sm:right-0'
    }`}>
      <button
        onClick={() => navigate(`/course/${course.id}`)}
        className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs font-semibold text-slate-700 transition hover:bg-slate-50 hover:text-purple-600"
      >
        <Eye className="h-4 w-4 text-slate-400" />
        Xem chi tiết
      </button>

      <button
        onClick={onCurriculum}
        className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs font-semibold text-slate-700 transition hover:bg-slate-50 hover:text-purple-600"
      >
        <Layers className="h-4 w-4 text-slate-400" />
        Quản lý giáo trình
      </button>

      <button
        onClick={onEdit}
        className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs font-semibold text-slate-700 transition hover:bg-slate-50 hover:text-purple-600"
      >
        <FilePenLine className="h-4 w-4 text-slate-400" />
        Sửa thông tin
      </button>

      <div className="my-1 border-t border-slate-100" />

      {currentStatus !== 'PUBLIC' && (
        <button
          onClick={onPublish}
          className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs font-semibold text-emerald-600 transition hover:bg-emerald-50"
        >
          <UploadCloud className="h-4 w-4" />
          Xuất bản
        </button>
      )}

      {currentStatus !== 'HIDDEN' && (
        <button
          onClick={onHide}
          className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs font-semibold text-amber-600 transition hover:bg-amber-50"
        >
          <EyeOff className="h-4 w-4" />
          Ẩn khóa học
        </button>
      )}

      {currentStatus === 'HIDDEN' && (
        <button
          onClick={onPublish}
          className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs font-semibold text-emerald-600 transition hover:bg-emerald-50"
        >
          <Eye className="h-4 w-4" />
          Hiện khóa học
        </button>
      )}

      <button
        onClick={onDelete}
        disabled={!isDraftOrUnpub || !canDelete}
        className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs font-semibold text-red-600 transition hover:bg-red-50 disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-red-600"
      >
        <Trash2 className="h-4 w-4" />
        Xóa khóa học
      </button>
    </div>
  );
}

