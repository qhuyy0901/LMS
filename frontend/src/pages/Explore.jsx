import { useCallback, useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { BookOpen, Bookmark, BookmarkCheck, RefreshCw, SlidersHorizontal, Star, ShoppingCart, Trash2, X } from 'lucide-react';
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
});

const buildCategoriesFromCourses = (courses) => {
  const map = new Map();
  courses.forEach((course) => {
    if (!course.category) return;
    const key = course.category.trim();
    if (!key) return;
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
      className="flex items-start gap-4 rounded-2xl border border-slate-100 bg-white p-3 shadow-sm transition hover:shadow-md"
    >
      {/* Thumbnail */}
      <div className="relative h-16 w-24 shrink-0 overflow-hidden rounded-xl bg-gradient-to-br from-purple-200 to-violet-300">
        {showImage ? (
          <img
            src={courseImageUrl}
            alt={c.title}
            onError={() => setImageError(true)}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <BookOpen className="h-6 w-6 text-purple-500" />
          </div>
        )}
      </div>

      {/* Info */}
      <div className="min-w-0 flex-1">
        <h3 className="line-clamp-2 text-xs font-bold text-slate-900 hover:text-purple-600">
          {c.title}
        </h3>
        <p className="mt-1 truncate text-[10px] text-slate-400">
          {c.instructorName}
        </p>
        <p className="mt-1.5 text-xs font-bold text-slate-900">
          {formatCurrency(c.price)}
        </p>

        {/* Actions */}
        <div className="mt-3 flex items-center justify-between border-t border-slate-50 pt-2.5">
          <button
            type="button"
            onClick={() => removeCourse(c.id)}
            className="inline-flex items-center gap-1 text-[10px] font-bold text-rose-600 hover:text-rose-700 transition"
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
            className="inline-flex items-center justify-center gap-1 rounded-lg bg-purple-600 px-3 py-1 text-[10px] font-bold text-white transition hover:bg-purple-700 shadow-sm shadow-purple-100"
          >
            Xem
          </button>
        </div>
      </div>
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
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Khám phá khóa học</h1>
        </div>
        <div className="flex items-center gap-2">
          {user && (
            <button
              type="button"
              onClick={() => setIsCartOpen(true)}
              className="relative inline-flex items-center justify-center gap-2 rounded-xl border border-purple-200 bg-purple-50 px-3.5 py-2 text-xs font-bold text-purple-700 shadow-sm transition hover:bg-purple-100 active:bg-purple-200"
            >
              <ShoppingCart className="h-3.5 w-3.5" />
              Giỏ hàng
              {displayCount > 0 && (
                <span className="absolute -top-2 -right-2 flex h-5 w-5 items-center justify-center rounded-full bg-rose-500 text-[10px] font-bold text-white shadow-sm animate-pulse">
                  {displayCount}
                </span>
              )}
            </button>
          )}
          <button
            type="button"
            onClick={fetchCourses}
            className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-600 shadow-sm transition hover:bg-slate-50 active:bg-slate-100"
          >
            <RefreshCw className="h-3.5 w-3.5 text-slate-500" />
            Tải lại
          </button>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 pb-5">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">
              <span>Hiển thị:</span>
              <select
                value={pageSize}
                onChange={(e) => setPageSize(Number(e.target.value))}
                className="rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 outline-none transition focus:border-purple-400 focus:ring-2 focus:ring-purple-100 cursor-pointer"
              >
                <option value={5}>5 bản ghi</option>
                <option value={10}>10 bản ghi</option>
                <option value={20}>20 bản ghi</option>
              </select>
            </div>

            <select
              value={categoryFilter}
              onChange={(event) => updateFilter('category', event.target.value)}
              className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 outline-none transition focus:border-purple-400 focus:ring-2 focus:ring-purple-100 cursor-pointer"
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
              className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 outline-none transition focus:border-purple-400 focus:ring-2 focus:ring-purple-100 cursor-pointer"
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
      </div>

      {/* Drawer Giỏ hàng */}
      {isCartOpen && (
        <div className="fixed inset-0 z-50 overflow-hidden">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity duration-300"
            onClick={() => setIsCartOpen(false)}
          />

          <div className="pointer-events-none fixed inset-y-0 right-0 flex max-w-full pl-10">
            <div className="pointer-events-auto w-screen max-w-md transform bg-white shadow-2xl transition duration-500 ease-in-out">
              <div className="flex h-full flex-col overflow-y-scroll bg-white shadow-xl">
                {/* Header */}
                <div className="flex items-center justify-between border-b border-slate-100 px-6 py-5">
                  <div className="flex items-center gap-2">
                    <ShoppingCart className="h-5 w-5 text-purple-600" />
                    <h2 className="text-lg font-bold text-slate-900">Giỏ hàng của tôi</h2>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsCartOpen(false)}
                    className="rounded-lg p-1 text-slate-400 hover:bg-slate-50 hover:text-slate-500"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>

                {/* Body / List */}
                <div className="flex-1 overflow-y-auto px-6 py-6">
                  {filteredSavedCourses.length === 0 ? (
                    <div className="flex h-full flex-col items-center justify-center text-center">
                      <div className="rounded-full bg-slate-50 p-4 text-slate-400">
                        <ShoppingCart className="h-10 w-10 stroke-1" />
                      </div>
                      <p className="mt-4 text-sm font-semibold text-slate-900">Giỏ hàng trống</p>
                      <p className="mt-1 text-xs text-slate-400">Hãy lưu khóa học bạn quan tâm từ trang khám phá.</p>
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
