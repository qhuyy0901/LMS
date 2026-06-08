import { useEffect, useState } from 'react';
import axios from 'axios';
import { Link, Navigate, useSearchParams } from 'react-router-dom';
import {
  Bookmark,
  BookOpen,
  Flame,
  Hash,
  MoreHorizontal,
  Play,
  Route,
  Search,
  SlidersHorizontal,
  Sparkles,
  Star,
} from 'lucide-react';
import CourseCard, { CourseSkeleton } from '../components/CourseCard';
import { useAuth } from '../context/AuthContext';

const numberFormatter = new Intl.NumberFormat('vi-VN');

const emptyInsights = {
  featuredCourse: null,
  recommendedCourses: [],
  topInstructors: [],
  trendingTopics: [],
  learningPaths: [],
};

const formatCompact = (value = 0) => numberFormatter.format(Number(value || 0));

const Explore = () => {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const q = searchParams.get('q') || '';
  const category = searchParams.get('category') || '';
  const page = parseInt(searchParams.get('page'), 10) || 1;
  const sort = searchParams.get('sort') || 'newest';
  const price = searchParams.get('price') || 'all';
  const tier = searchParams.get('tier') || 'all';

  const [courses, setCourses] = useState([]);
  const [insights, setInsights] = useState(emptyInsights);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  useEffect(() => {
    const fetchCourses = async () => {
      setIsLoading(true);
      try {
        const params = new URLSearchParams();
        if (q) params.set('q', q);
        if (category) params.set('category', category);
        if (sort && sort !== 'newest') params.set('sort', sort);
        if (price && price !== 'all') params.set('price', price);
        if (tier && tier !== 'all') params.set('tier', tier);
        params.set('page', page.toString());
        params.set('pageSize', '6');
        params.set('paginate', 'true');

        const response = await axios.get(`/api/courses?${params.toString()}`);
        const data = response.data;
        if (data && typeof data === 'object' && Array.isArray(data.items)) {
          setCourses(data.items);
          setTotalPages(data.pages || 1);
          setTotalItems(data.total || 0);
        } else if (Array.isArray(data)) {
          setCourses(data);
          setTotalPages(1);
          setTotalItems(data.length);
        }
      } catch (error) {
        console.error('Error fetching courses:', error);
        setCourses([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchCourses();
  }, [q, category, page, sort, price, tier]);

  useEffect(() => {
    const fetchInsights = async () => {
      try {
        const response = await axios.get('/api/explore/insights');
        setInsights({ ...emptyInsights, ...(response.data || {}) });
      } catch (error) {
        console.error('Error fetching explore insights:', error);
      }
    };

    fetchInsights();
  }, []);

  if (user?.role === 'INSTRUCTOR') {
    return <Navigate to="/instructor/dashboard" replace />;
  }

  const updateParam = (key, value) => {
    const next = new URLSearchParams(searchParams);
    if (value && value !== 'all') next.set(key, value);
    else next.delete(key);
    next.set('page', '1');
    setSearchParams(next);
  };

  const resetFilters = () => setSearchParams(new URLSearchParams());
  const changePage = (pageNum) => {
    const next = new URLSearchParams(searchParams);
    next.set('page', pageNum.toString());
    setSearchParams(next);
  };

  const categories = [
    { label: 'Tất cả', value: '' },
    ...insights.trendingTopics.map((topic) => ({ label: topic.name, value: topic.name })),
  ];
  const hasActiveFilters = sort !== 'newest' || price !== 'all' || tier !== 'all' || q || category;
  const featuredCourse = insights.featuredCourse || courses[0];
  const recommendedCourses = insights.recommendedCourses.length ? insights.recommendedCourses : courses.slice(0, 3);

  return (
    <div className="animate-fade-in-up">
      <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="mb-1 text-2xl font-semibold tracking-tight text-slate-900 md:text-3xl">Khám phá</h1>
          <p className="text-sm text-slate-500">
            Tìm khóa học mới, chủ đề thịnh hành và giảng viên nổi bật từ dữ liệu hệ thống.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setIsFilterOpen(true)}
            className={`inline-flex items-center gap-2 rounded-full border px-4 py-2.5 text-sm font-medium transition ${
              isFilterOpen || hasActiveFilters
                ? 'border-purple-200 bg-purple-50 text-purple-700'
                : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
            }`}
          >
            <SlidersHorizontal className="h-4 w-4" />
            Bộ lọc
            {hasActiveFilters && <span className="h-2 w-2 rounded-full bg-purple-600" />}
          </button>
          <button className="inline-flex items-center gap-2 rounded-full bg-purple-600 px-4 py-2.5 text-sm font-medium text-white shadow-md shadow-purple-200 transition hover:bg-purple-700">
            <Sparkles className="h-4 w-4" />
            Đề xuất cho bạn
          </button>
        </div>
      </div>

      <div className="mb-6 flex items-center gap-2 overflow-x-auto pb-2">
        {categories.map((item) => (
          <button
            key={item.value || 'all'}
            onClick={() => updateParam('category', item.value)}
            className={`whitespace-nowrap rounded-full px-4 py-2 text-sm font-medium transition ${
              category === item.value
                ? 'bg-purple-600 text-white shadow-md shadow-purple-200'
                : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      {hasActiveFilters && (
        <div className="mb-6 flex flex-wrap items-center gap-2">
          <span className="text-xs font-medium text-slate-400">Bộ lọc đang áp dụng:</span>
          {q && <FilterChip label={`Từ khóa: "${q}"`} onClear={() => updateParam('q', '')} />}
          {category && <FilterChip label={`Danh mục: ${category}`} onClear={() => updateParam('category', '')} />}
          {sort !== 'newest' && <FilterChip label={`Sắp xếp: ${sortLabel(sort)}`} onClear={() => updateParam('sort', 'newest')} />}
          {price !== 'all' && <FilterChip label={`Giá: ${price === 'free' ? 'Miễn phí' : 'Trả phí'}`} onClear={() => updateParam('price', 'all')} />}
          {tier !== 'all' && <FilterChip label={`Hội viên: ${tier}`} onClear={() => updateParam('tier', 'all')} />}
          <button onClick={resetFilters} className="ml-1 text-xs font-semibold text-purple-600 hover:underline">
            Xóa tất cả
          </button>
        </div>
      )}

      {isFilterOpen && (
        <FilterDrawer
          sort={sort}
          price={price}
          tier={tier}
          onClose={() => setIsFilterOpen(false)}
          onChange={updateParam}
          onReset={resetFilters}
        />
      )}

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <main className="space-y-6 xl:col-span-2">
          {featuredCourse && <FeaturedCourse course={featuredCourse} />}

          {isLoading ? (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <CourseSkeleton />
              <CourseSkeleton />
              <CourseSkeleton />
              <CourseSkeleton />
            </div>
          ) : courses.length === 0 ? (
            <EmptyCourses onReset={resetFilters} />
          ) : (
            <>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                {courses.map((course) => (
                  <CourseCard key={course.id} course={course} />
                ))}
              </div>
              {totalPages > 1 && (
                <Pagination page={page} totalPages={totalPages} totalItems={totalItems} onChange={changePage} />
              )}
            </>
          )}

          <TrendingTopics topics={insights.trendingTopics} onSelect={(value) => updateParam('category', value)} />
        </main>

        <aside className="space-y-6">
          <RecommendedCourses courses={recommendedCourses} />
          <TopInstructors instructors={insights.topInstructors} />
          <LearningPaths paths={insights.learningPaths} onSelect={(value) => updateParam('category', value)} />
        </aside>
      </div>
    </div>
  );
};

const FilterChip = ({ label, onClear }) => (
  <span className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-700">
    {label}
    <button onClick={onClear} className="text-slate-400 hover:text-slate-700">x</button>
  </span>
);

const FeaturedCourse = ({ course }) => (
  <section className="overflow-hidden rounded-2xl border border-purple-100 bg-gradient-to-r from-purple-100 via-purple-50 to-pink-50 p-6">
    <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
      <div className="max-w-xl">
        <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-purple-600 px-3 py-1 text-xs font-semibold text-white">
          <Flame className="h-3 w-3" />
          NỔI BẬT TỪ DỮ LIỆU
        </div>
        <h2 className="mb-2 text-xl font-semibold tracking-tight text-purple-950 md:text-2xl">{course.title}</h2>
        <p className="mb-4 line-clamp-2 text-sm text-slate-600">{course.description || 'Khóa học đang được nhiều học viên quan tâm.'}</p>
        <p className="mb-4 text-sm text-slate-600">
          {formatCompact(course.lessons || course.totalLessons)} bài học · {Number(course.rating || 0).toFixed(1)} sao · {formatCompact(course.students || course.studentCount)} học viên
        </p>
        <div className="flex flex-wrap items-center gap-3">
          <Link to={`/course/${course.id}`} className="inline-flex items-center gap-2 rounded-full bg-purple-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-purple-700">
            <Play className="h-4 w-4" />
            Xem khóa học
          </Link>
          <button className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-5 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50">
            <Bookmark className="h-4 w-4" />
            Lưu
          </button>
        </div>
      </div>
      <CourseThumb course={course} className="h-40 w-full md:w-64" />
    </div>
  </section>
);

const CourseThumb = ({ course, className = 'h-14 w-14' }) => (
  <div className={`${className} shrink-0 overflow-hidden rounded-xl bg-gradient-to-br from-purple-100 to-pink-100`}>
    {course.thumbnail ? (
      <img src={course.thumbnail} alt={course.title} className="h-full w-full object-cover" />
    ) : (
      <div className="flex h-full w-full items-center justify-center">
        <BookOpen className="h-6 w-6 text-purple-500" />
      </div>
    )}
  </div>
);

const EmptyCourses = ({ onReset }) => (
  <div className="rounded-2xl border border-slate-100 bg-white px-4 py-16 text-center">
    <Search className="mx-auto mb-3 h-8 w-8 text-slate-300" />
    <h3 className="mb-1 text-lg font-semibold text-slate-900">Không tìm thấy khóa học phù hợp</h3>
    <p className="mx-auto mb-6 max-w-sm text-sm text-slate-500">Hãy thử đổi từ khóa hoặc bỏ bớt bộ lọc để xem nhiều kết quả hơn.</p>
    <button onClick={onReset} className="rounded-full bg-purple-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-purple-700">
      Đặt lại bộ lọc
    </button>
  </div>
);

const Pagination = ({ page, totalPages, totalItems, onChange }) => (
  <div className="mt-8 flex flex-wrap items-center justify-between gap-4 border-t border-slate-100 pt-6">
    <p className="text-xs font-medium text-slate-500">
      Trang <span className="font-semibold text-slate-800">{page}</span> / {totalPages} ({formatCompact(totalItems)} khóa học)
    </p>
    <div className="flex items-center gap-1">
      <button disabled={page <= 1} onClick={() => onChange(page - 1)} className="h-9 w-9 rounded-lg border border-slate-200 bg-white text-slate-600 disabled:opacity-50">
        &lt;
      </button>
      {Array.from({ length: totalPages }, (_, index) => index + 1).map((item) => (
        <button
          key={item}
          onClick={() => onChange(item)}
          className={`h-9 w-9 rounded-lg text-sm font-semibold ${page === item ? 'bg-purple-600 text-white' : 'border border-slate-200 bg-white text-slate-600'}`}
        >
          {item}
        </button>
      ))}
      <button disabled={page >= totalPages} onClick={() => onChange(page + 1)} className="h-9 w-9 rounded-lg border border-slate-200 bg-white text-slate-600 disabled:opacity-50">
        &gt;
      </button>
    </div>
  </div>
);

const TrendingTopics = ({ topics, onSelect }) => (
  <Panel title="Chủ đề thịnh hành">
    <div className="space-y-3">
      {topics.length === 0 ? (
        <EmptyText>Chưa có đủ dữ liệu chủ đề.</EmptyText>
      ) : (
        topics.map((topic, index) => (
          <button key={topic.name} onClick={() => onSelect(topic.name)} className="flex w-full items-center gap-4 rounded-xl p-3 text-left hover:bg-slate-50">
            <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${topicColor(index)}`}>
              <Hash className="h-5 w-5" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-slate-900">#{topic.name}</p>
              <p className="text-xs text-slate-400">{formatCompact(topic.courseCount)} khóa học · {formatCompact(topic.studentCount)} học viên</p>
            </div>
            <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-600">+{topic.growth}%</span>
          </button>
        ))
      )}
    </div>
  </Panel>
);

const RecommendedCourses = ({ courses }) => (
  <Panel title="Đề xuất cho bạn" action="Làm mới">
    <div className="space-y-4">
      {courses.length === 0 ? (
        <EmptyText>Chưa có khóa học đề xuất.</EmptyText>
      ) : (
        courses.map((course) => (
          <Link key={course.id} to={`/course/${course.id}`} className="flex gap-3 rounded-xl p-2 hover:bg-slate-50">
            <CourseThumb course={course} />
            <div className="min-w-0 flex-1">
              <p className="line-clamp-2 text-sm font-medium text-slate-900">{course.title}</p>
              <p className="mt-0.5 text-xs text-slate-400">{course.instructorName || 'Giảng viên'} · {formatCompact(course.lessons)} bài</p>
              <div className="mt-1 flex items-center gap-2 text-[10px] text-slate-500">
                <Star className="h-3 w-3 text-amber-500" />
                {Number(course.rating || 0).toFixed(1)} · {formatCompact(course.students)} học viên
              </div>
            </div>
          </Link>
        ))
      )}
    </div>
  </Panel>
);

const TopInstructors = ({ instructors }) => (
  <Panel title="Giảng viên hàng đầu">
    <div className="space-y-4">
      {instructors.length === 0 ? (
        <EmptyText>Chưa có dữ liệu giảng viên.</EmptyText>
      ) : (
        instructors.map((instructor, index) => (
          <div key={instructor.id} className="flex items-center gap-3">
            <Avatar name={instructor.name} src={instructor.avatar} index={index} />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-slate-900">{instructor.name}</p>
              <p className="text-xs text-slate-400">{formatCompact(instructor.courseCount)} khóa · {formatCompact(instructor.studentCount)} học viên</p>
            </div>
            <span className="rounded-full bg-purple-50 px-3 py-1.5 text-xs font-medium text-purple-700">
              {Number(instructor.averageRating || 0).toFixed(1)} sao
            </span>
          </div>
        ))
      )}
    </div>
  </Panel>
);

const LearningPaths = ({ paths, onSelect }) => (
  <Panel title="Lộ trình học" iconButton>
    <div className="space-y-3">
      {paths.length === 0 ? (
        <EmptyText>Chưa có đủ dữ liệu lộ trình.</EmptyText>
      ) : (
        paths.map((path, index) => (
          <button key={path.id} onClick={() => onSelect(path.category)} className={`w-full rounded-xl border p-4 text-left ${pathBg(index)}`}>
            <div className="mb-2 flex items-center gap-2">
              <Route className="h-4 w-4" />
              <p className="text-sm font-medium text-slate-900">{path.title}</p>
            </div>
            <p className="mb-2 text-xs text-slate-500">
              {formatCompact(path.courseCount)} khóa · {formatCompact(path.lessonCount)} bài · khoảng {path.estimatedMonths} tháng
            </p>
            <div className="h-1.5 rounded-full bg-white/70">
              <div className="h-1.5 rounded-full bg-purple-600" style={{ width: `${path.progress || 0}%` }} />
            </div>
          </button>
        ))
      )}
    </div>
  </Panel>
);

const FilterDrawer = ({ sort, price, tier, onClose, onChange, onReset }) => (
  <div className="fixed inset-0 z-50 overflow-hidden">
    <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onClose} />
    <div className="absolute inset-y-0 right-0 flex max-w-full pl-10">
      <div className="flex h-full w-screen max-w-md flex-col rounded-l-2xl border-l border-slate-100 bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-5">
          <h2 className="flex items-center gap-2 text-lg font-semibold text-slate-900">
            <SlidersHorizontal className="h-5 w-5 text-purple-600" />
            Bộ lọc nâng cao
          </h2>
          <button onClick={onClose} className="rounded-lg p-2 text-slate-400 hover:bg-slate-50 hover:text-slate-600">x</button>
        </div>
        <div className="flex-1 space-y-8 overflow-y-auto px-6 py-6">
          <FilterGroup
            title="Sắp xếp theo"
            value={sort}
            options={[
              ['newest', 'Mới nhất'],
              ['price_asc', 'Giá tăng dần'],
              ['price_desc', 'Giá giảm dần'],
              ['rating_desc', 'Đánh giá cao nhất'],
              ['students_desc', 'Học viên đông nhất'],
            ]}
            onChange={(value) => onChange('sort', value)}
          />
          <FilterGroup title="Học phí" value={price} options={[['all', 'Tất cả'], ['free', 'Miễn phí'], ['paid', 'Có phí']]} onChange={(value) => onChange('price', value)} compact />
          <FilterGroup
            title="Cấp bậc tối thiểu"
            value={tier}
            options={[
              ['all', 'Tất cả'],
              ['BRONZE', 'Đồng'],
              ['SILVER', 'Bạc'],
              ['GOLD', 'Vàng'],
              ['PLATINUM', 'Bạch kim'],
              ['DIAMOND', 'Kim cương'],
            ]}
            onChange={(value) => onChange('tier', value)}
            compact
          />
        </div>
        <div className="flex gap-3 border-t border-slate-100 bg-slate-50/50 px-6 py-5">
          <button onClick={onReset} className="flex-1 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-600 hover:bg-slate-50">
            Xóa bộ lọc
          </button>
          <button onClick={onClose} className="flex-1 rounded-xl bg-purple-600 px-4 py-3 text-sm font-semibold text-white hover:bg-purple-700">
            Áp dụng
          </button>
        </div>
      </div>
    </div>
  </div>
);

const FilterGroup = ({ title, value, options, onChange, compact = false }) => (
  <div>
    <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-slate-800">{title}</h3>
    <div className={`grid gap-2 ${compact ? 'grid-cols-2' : 'grid-cols-1'}`}>
      {options.map(([optionValue, label]) => (
        <button
          key={optionValue}
          onClick={() => onChange(optionValue)}
          className={`rounded-xl border px-4 py-3 text-sm font-medium transition ${
            value === optionValue ? 'border-purple-600 bg-purple-50 text-purple-700' : 'border-slate-200 text-slate-600 hover:bg-slate-50'
          }`}
        >
          {label}
        </button>
      ))}
    </div>
  </div>
);

const Panel = ({ title, action, iconButton = false, children }) => (
  <section className="rounded-2xl border border-slate-100 bg-white p-6 transition hover:-translate-y-1 hover:shadow-lg">
    <div className="mb-5 flex items-center justify-between">
      <h3 className="text-xl font-semibold tracking-tight text-slate-900">{title}</h3>
      {iconButton ? <MoreHorizontal className="h-5 w-5 text-slate-400" /> : action && <button className="text-sm font-medium text-purple-600">{action}</button>}
    </div>
    {children}
  </section>
);

const Avatar = ({ name, src, index }) => (
  <div className={`flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full text-sm font-bold text-white ${avatarBg(index)}`}>
    {src ? <img src={src} alt={name} className="h-full w-full object-cover" /> : name?.charAt(0)?.toUpperCase() || 'G'}
  </div>
);

const EmptyText = ({ children }) => <p className="rounded-xl bg-slate-50 p-4 text-center text-sm text-slate-500">{children}</p>;

const sortLabel = (value) =>
  ({
    price_asc: 'Giá tăng dần',
    price_desc: 'Giá giảm dần',
    rating_desc: 'Đánh giá tốt nhất',
    students_desc: 'Đông học viên nhất',
  })[value] || 'Mới nhất';

const topicColor = (index) =>
  ['bg-orange-100 text-orange-600', 'bg-blue-100 text-blue-600', 'bg-purple-100 text-purple-600', 'bg-emerald-100 text-emerald-600', 'bg-rose-100 text-rose-600'][index % 5];

const avatarBg = (index) =>
  ['bg-gradient-to-br from-pink-300 to-orange-300', 'bg-gradient-to-br from-blue-300 to-cyan-300', 'bg-gradient-to-br from-purple-300 to-pink-300', 'bg-gradient-to-br from-amber-300 to-red-300'][index % 4];

const pathBg = (index) =>
  ['bg-gradient-to-r from-purple-50 to-pink-50 border-purple-100 text-purple-600', 'bg-gradient-to-r from-blue-50 to-cyan-50 border-blue-100 text-blue-600', 'bg-gradient-to-r from-emerald-50 to-teal-50 border-emerald-100 text-emerald-600'][index % 3];

export default Explore;
