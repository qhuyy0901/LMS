import { useCallback, useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { BookOpen, Bookmark, BookmarkCheck, RefreshCw, SlidersHorizontal, Star, ShoppingCart, Trash2, X, LayoutGrid, List } from 'lucide-react';
import DataTable from '../components/DataTable';
import { useAuth } from '../context/AuthContext';
import { useSavedCourses } from '../context/SavedCoursesContext';
import { resolveMediaUrl } from '../utils/mediaUrl';

const getCourseImage = (course) =>
  course?.thumbnail ||
  course?.imageUrl ||
  course?.coverImage ||
  course?.courseImage ||
  course?.anhBia ||
  course?.cover ||
  course?.anhDaiDien ||
  '';

const formatCurrency = (value) => {
  const price = Number(value || 0);
  if (price <= 0) return 'Miễn phí';
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(price);
};

const normalizeList = (payload) => {
  if (Array.isArray(payload)) return payload;
  return payload?.items || payload?.data || [];
};

const normalizeCourse = (course) => ({
  id: course.id || course.Id,
  title: course.title || course.Title || course.tieuDe || 'Khóa học',
  category: course.category || course.Category || course.danhMuc || course.chuyenMuc || 'Chưa phân loại',
  instructorName: course.instructorName || course.InstructorName || course.instructor?.name || course.giangVien?.ten || 'Giảng viên',
  lessonCount: Number(course.lessonCount ?? course.LessonCount ?? course._count?.lessons ?? course.lessons?.length ?? 0),
  averageRating: Number(course.averageRating ?? course.AverageRating ?? course.rating ?? 0),
  reviewCount: Number(course.reviewCount ?? course.ReviewCount ?? course._count?.reviews ?? 0),
  price: Number(course.price ?? course.Price ?? course.gia ?? 0),
  studentCount: Number(course.studentCount ?? course.StudentCount ?? course._count?.enrollments ?? 0),
  rawImage: getCourseImage(course),
});

const buildCategoriesFromCourses = (courses) => {
  const map = new Map();
  courses.forEach((course) => {
    if (!course.category) return;
    const key = course.category.trim();
    if (!key) return;
    map.set(key, {
      id: key,
      slug: key,
      name: key,
      courseCount: (map.get(key)?.courseCount || 0) + 1,
    });
  });
  return [...map.values()].sort((a, b) => a.name.localeCompare(b.name, 'vi'));
};

function CartItem({ item, removeCourse, onNavigate }) {
  const c = item.course;
  const navigate = useNavigate();
  const [imageError, setImageError] = useState(false);

  if (!c) return null;
  const rawImage = getCourseImage(c);
  const courseImageUrl = rawImage ? resolveMediaUrl(rawImage) : '';
  const showImage = courseImageUrl && !imageError;

  return (
    <div
      className="flex items-start gap-4 rounded-2xl border border-slate-100/80 dark:border-slate-800/40 bg-white dark:bg-slate-900 p-3 shadow-sm hover:shadow-[0_8px_20px_-6px_rgba(0,0,0,0.04)] transition-all duration-300"
    >
      {/* Thumbnail */}
      <div className="relative h-16 w-24 shrink-0 overflow-hidden rounded-xl bg-gradient-to-br from-purple-100 to-indigo-100 dark:from-purple-950/20 dark:to-indigo-950/20 border border-slate-100/30 dark:border-slate-800/30">
        {showImage ? (
          <img
            src={courseImageUrl}
            alt={c.title}
            onError={() => setImageError(true)}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <BookOpen className="h-5 w-5 text-purple-500/70" />
          </div>
        )}
      </div>

      {/* Info */}
      <div className="min-w-0 flex-1">
        <h3 
          onClick={() => {
            onNavigate();
            navigate(`/course/${c.id}`);
          }}
          className="line-clamp-2 text-xs font-bold text-slate-800 dark:text-slate-200 hover:text-purple-600 dark:hover:text-purple-400 transition-colors leading-snug cursor-pointer"
        >
          {c.title}
        </h3>
        <p className="mt-0.5 truncate text-[10px] text-slate-400 font-medium">
          {c.instructorName}
        </p>
        <p className="mt-1.5 text-xs font-extrabold text-slate-900 dark:text-white">
          {formatCurrency(c.price)}
        </p>

        {/* Actions */}
        <div className="mt-3 flex items-center justify-between border-t border-slate-50 dark:border-slate-800/40 pt-2">
          <button
            type="button"
            onClick={() => removeCourse(c.id)}
            className="inline-flex items-center gap-1 text-[10px] font-bold text-rose-500 hover:text-rose-600 transition"
          >
            <Trash2 className="h-3.5 w-3.5" />
            Hủy lưu
          </button>
          <button
            type="button"
            onClick={() => {
              onNavigate();
              navigate(`/course/${c.id}`);
            }}
            className="inline-flex items-center justify-center gap-1 rounded-full bg-purple-600 hover:bg-purple-700 px-3.5 py-1 text-[10px] font-bold text-white transition active:scale-[0.96] shadow-sm cursor-pointer"
          >
            Xem
          </button>
        </div>
      </div>
    </div>
  );
}

function CourseCard({ course, isSaved, onToggleSave, onDetail, savingId }) {
  const [imageError, setImageError] = useState(false);
  const rawImage = course.rawImage;
  const courseImageUrl = rawImage ? resolveMediaUrl(rawImage) : '';
  const showImage = courseImageUrl && !imageError;
  const saved = isSaved(course.id);

  return (
    <div className="p-1.5 rounded-[2rem] bg-slate-50/50 dark:bg-slate-900/50 border border-slate-100/60 dark:border-slate-800/40 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.02)] hover:shadow-[0_8px_30px_-6px_rgba(139,92,246,0.06)] hover:border-purple-200/50 dark:hover:border-purple-900/30 transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] hover:-translate-y-1 group h-full flex flex-col">
      <article className="bg-white dark:bg-slate-950 rounded-[calc(2rem-6px)] h-full flex flex-col overflow-hidden border border-slate-100/50 dark:border-slate-850/50">
        {/* Thumbnail Bezel Nested */}
        <div className="relative aspect-[16/10] overflow-hidden rounded-[calc(2rem-10px)] m-1.5 bg-slate-50 dark:bg-slate-900 border border-slate-100/30 dark:border-slate-800/20">
          {showImage ? (
            <img
              src={courseImageUrl}
              alt={course.title}
              onError={() => setImageError(true)}
              className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
            />
          ) : (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-tr from-purple-50 to-indigo-50/50 dark:from-purple-950/10 dark:to-slate-950/20">
              <BookOpen className="h-8 w-8 text-purple-500/60 dark:text-purple-400/40 mb-2" strokeWidth={1.2} />
              <span className="text-[8.5px] uppercase tracking-[0.15em] font-mono text-purple-650 dark:text-purple-400 bg-purple-500/5 px-2 py-0.5 rounded border border-purple-500/10">
                {course.category || 'Khóa học'}
              </span>
            </div>
          )}
          
          {/* Category Tag */}
          <span className="absolute left-3 top-3 rounded-md bg-white/95 dark:bg-slate-900/95 border border-slate-100/40 dark:border-slate-800/40 px-2 py-0.5 text-[8.5px] font-mono tracking-widest uppercase text-slate-650 dark:text-slate-350 shadow-sm backdrop-blur-sm">
            {course.category}
          </span>
        </div>

        {/* Info */}
        <div className="flex flex-1 flex-col px-4.5 py-5 pt-3">
          <p className="mb-1 text-[9px] uppercase tracking-[0.12em] font-medium text-purple-600 dark:text-purple-400">
            {course.instructorName}
          </p>
          <h4 className="mb-3 line-clamp-2 text-sm font-semibold text-slate-850 dark:text-slate-200 leading-snug group-hover:text-purple-600 transition-colors h-10" title={course.title}>
            {course.title}
          </h4>

          {/* Ratings & Students */}
          <div className="flex items-center gap-3 mb-4 text-[11px] text-slate-500 dark:text-slate-400">
            <div className="flex items-center gap-1">
              <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
              <span className="font-semibold text-slate-700 dark:text-slate-300">{course.averageRating.toFixed(1)}</span>
              <span className="text-slate-400">({course.reviewCount})</span>
            </div>
            <span className="text-slate-300 dark:text-slate-700">•</span>
            <span>{course.studentCount} học viên</span>
          </div>

          {/* Metadata */}
          <div className="mb-4 flex items-center gap-3 border-t border-b border-slate-50/50 dark:border-slate-900/40 py-2.5 my-3 text-[10.5px] text-slate-400 dark:text-slate-500 font-medium">
            <span className="flex items-center gap-1.5">
              <BookOpen className="h-3.5 w-3.5 text-slate-350 dark:text-slate-600" strokeWidth={1.5} />
              {course.lessonCount} bài học
            </span>
          </div>

          {/* Price & Actions */}
          <div className="mt-auto pt-2">
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs text-slate-400">Học phí</span>
              <span className="text-base font-bold text-slate-900 dark:text-white">{formatCurrency(course.price)}</span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onDetail}
                className="flex flex-1 items-center justify-center gap-1.5 rounded-full bg-purple-600 hover:bg-purple-700 text-white px-3 py-2.5 text-xs font-semibold shadow-sm hover:scale-[1.02] active:scale-[0.98] transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] cursor-pointer"
              >
                Xem chi tiết
              </button>
              <button
                type="button"
                onClick={onToggleSave}
                disabled={savingId === course.id}
                className={`flex items-center justify-center p-2.5 rounded-full border transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] cursor-pointer ${
                  saved
                    ? 'bg-purple-50 text-purple-700 border-purple-200 hover:bg-purple-100'
                    : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-500 hover:border-purple-200 hover:bg-purple-50/30'
                }`}
              >
                {saved ? <BookmarkCheck className="h-4 w-4" /> : <Bookmark className="h-4 w-4" />}
              </button>
            </div>
          </div>
        </div>
      </article>
    </div>
  );
}

export default function Explore() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useAuth();
  const { isSaved, saveCourse, savedCourses, removeCourse } = useSavedCourses();

  const [courses, setCourses] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [savingId, setSavingId] = useState(null);

  const categoryFilter = searchParams.get('category') || '';
  const sortFilter = searchParams.get('sort') || 'newest';
  const initialTableSearch = searchParams.get('q') || '';
  const [pageSize, setPageSize] = useState(5);
  const [enrolledIds, setEnrolledIds] = useState(new Set());
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [viewMode, setViewMode] = useState('grid');

  const filteredSavedCourses = useMemo(() => {
    return savedCourses.filter((item) => item.course && !enrolledIds.has(item.course.id));
  }, [savedCourses, enrolledIds]);

  const displayCount = filteredSavedCourses.length;

  const fetchCategories = useCallback(async (fallbackCourses = []) => {
    try {
      const response = await axios.get('/api/course-categories');
      const dbCategories = normalizeList(response.data).map((item) => ({
        id: item.id || item.Id || item.slug || item.name,
        slug: item.slug || item.Slug || item.id || item.Id || item.name,
        name: item.name || item.Name || item.ten || item.Ten,
        courseCount: Number(item.courseCount ?? item.CourseCount ?? 0),
      })).filter((item) => item.name);
      setCategories(dbCategories.length ? dbCategories : buildCategoriesFromCourses(fallbackCourses));
    } catch {
      setCategories(buildCategoriesFromCourses(fallbackCourses));
    }
  }, []);

  const fetchCourses = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await axios.get('/api/courses', {
        params: {
          paginate: false,
          pageSize: 100,
          category: categoryFilter || undefined,
          sort: sortFilter || undefined,
        },
      });
      const nextCourses = normalizeList(response.data).map(normalizeCourse);
      setCourses(nextCourses);
      fetchCategories(nextCourses);
    } catch (err) {
      setError(err.response?.data?.message || 'Không thể tải danh sách khóa học.');
      fetchCategories([]);
    } finally {
      setLoading(false);
    }
  }, [categoryFilter, fetchCategories, sortFilter]);

  useEffect(() => {
    fetchCourses();
  }, [fetchCourses]);

  const fetchEnrolledCourses = useCallback(async () => {
    if (!user) {
      setEnrolledIds(new Set());
      return;
    }
    try {
      const res = await axios.get('/api/courses/enrolled');
      const list = Array.isArray(res.data) ? res.data : [];
      const ids = new Set(list.map((e) => e.course?.id || e.courseId || e.course?.Id).filter(Boolean));
      setEnrolledIds(ids);
    } catch {
      // silent
    }
  }, [user]);

  useEffect(() => {
    fetchEnrolledCourses();
  }, [fetchEnrolledCourses]);

  const updateFilter = (key, value) => {
    const nextParams = new URLSearchParams(searchParams);
    if (value) nextParams.set(key, value);
    else nextParams.delete(key);
    setSearchParams(nextParams, { replace: true });
  };

  const handleToggleSave = useCallback(async (courseId) => {
    if (!user) {
      navigate('/login');
      return;
    }
    if (!courseId) return;

    setSavingId(courseId);
    try {
      if (isSaved(courseId)) {
        await removeCourse(courseId);
      } else {
        await saveCourse(courseId);
      }
    } finally {
      setSavingId(null);
    }
  }, [isSaved, navigate, saveCourse, removeCourse, user]);

  const columns = useMemo(() => [
    { title: 'Khóa học', data: 'title', className: 'px-5 py-4 min-w-[260px]' },
    { title: 'Danh mục', data: 'category', className: 'px-5 py-4' },
    { title: 'Giảng viên', data: 'instructorName', className: 'px-5 py-4' },
    { title: 'Bài học', data: 'lessonCount', className: 'px-5 py-4 text-center' },
    { title: 'Đánh giá', data: 'averageRating', className: 'px-5 py-4' },
    { title: 'Giá', data: 'price', className: 'px-5 py-4' },
    { title: 'Thao tác', data: 'id', className: 'px-5 py-4 text-right', orderable: false, searchable: false },
  ], []);

  const slots = useMemo(() => ({
    0: (data, row) => (
      <div className="flex items-center gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-purple-50 text-purple-700">
          <BookOpen className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <p className="line-clamp-2 font-semibold text-slate-900">{row.title}</p>
          <p className="mt-1 text-xs text-slate-500">{row.studentCount} học viên</p>
        </div>
      </div>
    ),
    1: (data, row) => (
      <span className="inline-flex rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
        {row.category}
      </span>
    ),
    2: (data, row) => <span className="font-medium text-slate-700">{row.instructorName}</span>,
    3: (data, row) => <span className="font-semibold text-slate-700">{row.lessonCount}</span>,
    4: (data, row) => (
      <div className="flex items-center gap-1.5 text-sm font-semibold text-slate-700">
        <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
        <span>{row.averageRating.toFixed(1)}</span>
        <span className="text-xs font-medium text-slate-400">({row.reviewCount})</span>
      </div>
    ),
    5: (data, row) => (
      <span className="font-semibold text-slate-900">{formatCurrency(row.price)}</span>
    ),
    6: (data, row) => {
      const saved = isSaved(row.id);
      return (
        <div className="flex flex-wrap items-center justify-end gap-2">
          <button
            type="button"
            onClick={() => navigate(`/course/${row.id}`)}
            className="inline-flex items-center justify-center rounded-xl bg-slate-900 px-3 py-2 text-xs font-semibold text-white transition hover:bg-slate-800"
          >
            Xem chi tiết
          </button>
          <button
            type="button"
            onClick={() => handleToggleSave(row.id)}
            disabled={savingId === row.id}
            className={`inline-flex items-center justify-center gap-1.5 rounded-xl px-3 py-2 text-xs font-semibold transition ${
              saved
                ? 'bg-purple-50 text-purple-700 border border-purple-200 hover:bg-purple-100'
                : 'border border-slate-200 bg-white text-slate-700 hover:border-purple-200 hover:bg-purple-50 hover:text-purple-700'
            }`}
          >
            {saved ? <BookmarkCheck className="h-4 w-4" /> : <Bookmark className="h-4 w-4" />}
            {saved ? 'Đã lưu' : savingId === row.id ? 'Đang lưu' : 'Lưu'}
          </button>
        </div>
      );
    },
  }), [handleToggleSave, isSaved, navigate, savingId]);

  const tableOptions = useMemo(() => ({
    searching: true,
    lengthChange: false,
    dom: 'tpi',
    pageLength: pageSize,
    search: { search: initialTableSearch },
    autoWidth: false,
    columnDefs: [{ targets: -1, orderable: false, searchable: false }],
  }), [initialTableSearch, pageSize]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Khám phá khóa học</h1>
          <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">Tìm kiếm và lưu trữ những khóa học phù hợp với định hướng của bạn</p>
        </div>
        <div className="flex items-center gap-2">
          {user && (
            <button
              type="button"
              onClick={() => setIsCartOpen(true)}
              className="relative inline-flex items-center justify-center gap-2 rounded-full border border-purple-200 dark:border-purple-900/30 bg-purple-50 dark:bg-purple-950/20 px-4 py-2.5 text-xs font-bold text-purple-700 dark:text-purple-400 shadow-sm hover:scale-[1.02] active:scale-[0.98] transition-all duration-300 cursor-pointer"
            >
              <ShoppingCart className="h-3.5 w-3.5" />
              Giỏ hàng
              {displayCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-rose-500 text-[10px] font-mono font-bold text-white shadow-sm animate-pulse">
                  {displayCount}
                </span>
              )}
            </button>
          )}
          <button
            type="button"
            onClick={fetchCourses}
            className="inline-flex items-center justify-center gap-1.5 rounded-full border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-4 py-2.5 text-xs font-semibold text-slate-650 dark:text-slate-455 hover:bg-slate-50 dark:hover:bg-slate-900 shadow-sm hover:scale-[1.02] active:scale-[0.98] transition-all duration-300 cursor-pointer"
          >
            <RefreshCw className="h-3.5 w-3.5 text-slate-500" />
            Tải lại
          </button>
        </div>
      </div>

      <div className="rounded-[2rem] border border-slate-100/80 dark:border-slate-850 bg-white dark:bg-slate-950 p-6 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.01)]">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4 border-b border-slate-100/50 dark:border-slate-900 pb-5">
          <div className="flex flex-wrap items-center gap-3">
            {/* View Mode Toggle */}
            <div className="flex items-center rounded-full bg-slate-50 dark:bg-slate-900 p-1 border border-slate-100/80 dark:border-slate-800/40 mr-2">
              <button
                type="button"
                onClick={() => setViewMode('grid')}
                className={`p-1.5 rounded-full transition-all duration-300 cursor-pointer ${
                  viewMode === 'grid'
                    ? 'bg-white dark:bg-slate-800 text-purple-650 dark:text-purple-400 shadow-sm'
                    : 'text-slate-400 hover:text-slate-650 dark:hover:text-slate-300'
                }`}
                title="Xem dạng lưới"
              >
                <LayoutGrid className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => setViewMode('table')}
                className={`p-1.5 rounded-full transition-all duration-300 cursor-pointer ${
                  viewMode === 'table'
                    ? 'bg-white dark:bg-slate-800 text-purple-655 dark:text-purple-400 shadow-sm'
                    : 'text-slate-400 hover:text-slate-650 dark:hover:text-slate-300'
                }`}
                title="Xem dạng bảng"
              >
                <List className="h-4 w-4" />
              </button>
            </div>

            {viewMode === 'table' && (
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                <span>Hiển thị:</span>
                <select
                  value={pageSize}
                  onChange={(e) => setPageSize(Number(e.target.value))}
                  className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-2.5 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300 outline-none transition focus:border-purple-400 focus:ring-2 focus:ring-purple-100 dark:focus:ring-purple-950/20 cursor-pointer"
                >
                  <option value={5}>5 bản ghi</option>
                  <option value={10}>10 bản ghi</option>
                  <option value={20}>20 bản ghi</option>
                </select>
              </div>
            )}

            <select
              value={categoryFilter}
              onChange={(event) => updateFilter('category', event.target.value)}
              className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-3.5 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300 outline-none transition focus:border-purple-400 focus:ring-2 focus:ring-purple-100 dark:focus:ring-purple-950/20 cursor-pointer"
            >
              <option value="">Tất cả danh mục</option>
              {categories.map((category) => (
                <option key={category.id || category.slug || category.name} value={category.slug || category.id || category.name}>
                  {category.name}{category.courseCount ? ` (${category.courseCount})` : ''}
                </option>
              ))}
            </select>

            <select
              value={sortFilter}
              onChange={(event) => updateFilter('sort', event.target.value)}
              className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-3.5 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300 outline-none transition focus:border-purple-400 focus:ring-2 focus:ring-purple-100 dark:focus:ring-purple-950/20 cursor-pointer"
            >
              <option value="newest">Mới nhất</option>
              <option value="rating_desc">Đánh giá cao</option>
              <option value="price_asc">Giá thấp đến cao</option>
              <option value="price_desc">Giá cao đến thấp</option>
              <option value="popular">Nhiều học viên</option>
            </select>
          </div>

          <div className="flex items-center gap-2 text-xs text-slate-400 font-semibold uppercase tracking-wider">
            <SlidersHorizontal className="h-3.5 w-3.5 text-purple-500" />
            <span>Bộ lọc</span>
          </div>
        </div>

        {viewMode === 'grid' ? (
          <div>
            {loading ? (
              // Loading skeleton grid
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="p-1.5 rounded-[2rem] bg-slate-50/50 dark:bg-slate-900/50 border border-slate-100/60 dark:border-slate-800/40 animate-pulse">
                    <div className="bg-white dark:bg-slate-950 rounded-[calc(2rem-6px)] p-4 h-80 flex flex-col">
                      <div className="aspect-[16/10] bg-slate-100 dark:bg-slate-900 rounded-[calc(2rem-10px)] mb-4" />
                      <div className="h-4 bg-slate-100 dark:bg-slate-900 rounded w-1/3 mb-2" />
                      <div className="h-5 bg-slate-100 dark:bg-slate-900 rounded w-3/4 mb-4" />
                      <div className="h-4 bg-slate-100 dark:bg-slate-900 rounded w-1/2 mb-4" />
                      <div className="mt-auto flex items-center justify-between">
                        <div className="h-6 bg-slate-100 dark:bg-slate-900 rounded w-1/3" />
                        <div className="h-8 bg-slate-100 dark:bg-slate-900 rounded w-1/3 rounded-full" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : error ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <p className="text-sm font-semibold text-rose-500">{error}</p>
                <button type="button" onClick={fetchCourses} className="mt-4 rounded-full bg-slate-900 dark:bg-slate-800 text-white px-4 py-2 text-xs font-semibold hover:bg-slate-800 transition active:scale-95 cursor-pointer">Tải lại</button>
              </div>
            ) : courses.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <BookOpen className="h-12 w-12 text-slate-350 dark:text-slate-700 stroke-[1.2] mb-3" />
                <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">Không tìm thấy khóa học nào</p>
                <p className="text-xs text-slate-400 mt-1">Hãy thử thay đổi từ khóa tìm kiếm hoặc bộ lọc danh mục.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 animate-[fadeIn_0.5s_ease-out]">
                {courses.map((course) => (
                  <CourseCard
                    key={course.id}
                    course={course}
                    isSaved={isSaved}
                    onToggleSave={() => handleToggleSave(course.id)}
                    onDetail={() => navigate(`/course/${course.id}`)}
                    savingId={savingId}
                  />
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="skillio-explore-table">
            <DataTable
              key={`${categoryFilter}-${sortFilter}-${initialTableSearch}-${pageSize}`}
              data={courses}
              columns={columns}
              slots={slots}
              loading={loading}
              error={error}
              options={tableOptions}
              pageSize={pageSize}
            />
          </div>
        )}
      </div>

      {/* Drawer Giỏ hàng */}
      {isCartOpen && (
        <div className="fixed inset-0 z-50 overflow-hidden">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-slate-950/40 backdrop-blur-md transition-opacity duration-300"
            onClick={() => setIsCartOpen(false)}
          />

          <div className="pointer-events-none fixed inset-y-0 right-0 flex max-w-full pl-10">
            <div className="pointer-events-auto w-screen max-w-md transform bg-white dark:bg-slate-950 shadow-2xl transition duration-500 ease-in-out border-l border-slate-100/80 dark:border-slate-800/60">
              <div className="flex h-full flex-col bg-white dark:bg-slate-955 shadow-xl">
                {/* Header */}
                <div className="flex items-center justify-between border-b border-slate-100/50 dark:border-slate-900 px-6 py-5">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-xl bg-purple-50 dark:bg-purple-950/20 text-purple-650">
                      <ShoppingCart className="h-4 w-4" />
                    </div>
                    <h2 className="text-base font-bold text-slate-850 dark:text-slate-100">Giỏ hàng của tôi</h2>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsCartOpen(false)}
                    className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-900 hover:text-slate-600 dark:hover:text-slate-350 cursor-pointer"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>

                {/* Body / List */}
                <div className="flex-1 overflow-y-auto px-6 py-6">
                  {filteredSavedCourses.length === 0 ? (
                    <div className="flex h-full flex-col items-center justify-center text-center">
                      <div className="rounded-[2rem] bg-slate-50 dark:bg-slate-900/60 p-6 text-slate-400 border border-slate-100/50 dark:border-slate-850/50 mb-4">
                        <ShoppingCart className="h-10 w-10 stroke-[1.2] text-slate-350" />
                      </div>
                      <p className="text-sm font-semibold text-slate-850 dark:text-slate-200">Giỏ hàng đang trống</p>
                      <p className="mt-1.5 text-xs text-slate-450 max-w-[25ch] mx-auto leading-relaxed">
                        Hãy lưu khóa học bạn quan tâm từ trang khám phá để tiếp tục.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {filteredSavedCourses.map((item) => (
                        <CartItem
                          key={item.id}
                          item={item}
                          removeCourse={removeCourse}
                          onNavigate={() => setIsCartOpen(false)}
                        />
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
