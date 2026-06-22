import { useEffect, useMemo, useState } from 'react';
import {
  ArrowUpDown,
  BadgeCheck,
  BookOpen,
  Filter,
  GraduationCap,
  Mail,
  Search,
  Star,
  Users,
  X,
} from 'lucide-react';
import { api } from '../api/client';
import { getFileUrl } from '../utils/fileUtils';

const numberFormat = new Intl.NumberFormat('vi-VN');

const formatNumber = (value = 0) => {
  if (value >= 1000) {
    return `${numberFormat.format(Math.round(value / 100) / 10)}K`;
  }
  return numberFormat.format(value);
};

const getInitial = (name = '') => name.trim().charAt(0).toUpperCase() || 'G';

const palette = [
  'from-purple-100 to-indigo-50/70 dark:from-purple-950/15 dark:to-slate-900/30',
  'from-sky-100 to-blue-50/70 dark:from-sky-950/15 dark:to-slate-900/30',
  'from-emerald-100 to-teal-50/70 dark:from-emerald-950/15 dark:to-slate-900/30',
  'from-amber-100 to-orange-50/70 dark:from-amber-950/15 dark:to-slate-900/30',
  'from-rose-100 to-pink-50/70 dark:from-rose-950/15 dark:to-slate-900/30',
];

const StatCard = ({ icon: Icon, label, value, tone }) => (
  <div className="p-1.5 rounded-[1.8rem] bg-slate-50/50 dark:bg-slate-900/50 border border-slate-100/60 dark:border-slate-800/40 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.02)] transition-all duration-500 hover:-translate-y-0.5">
    <div className="bg-white dark:bg-slate-950 rounded-[calc(1.8rem-6px)] p-5 border border-slate-100/50 dark:border-slate-850/50 h-full flex flex-col justify-between">
      <div className="flex items-center justify-between mb-3.5">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center border ${tone.bg}`}>
          <Icon className={`w-5 h-5 ${tone.text}`} strokeWidth={1.5} />
        </div>
      </div>
      <div>
        <p className="text-xs text-slate-400 dark:text-slate-500 font-normal mb-1">{label}</p>
        <p className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-white font-mono">{value}</p>
      </div>
    </div>
  </div>
);

const InstructorAvatar = ({ instructor, index = 0, size = 'large' }) => {
  const dimensions = size === 'small' ? 'w-11 h-11 rounded-xl text-sm border border-slate-100/65 dark:border-slate-800/40' : 'w-20 h-20 rounded-[1.2rem] text-2xl border border-slate-100/65 dark:border-slate-800/40';
  const avatar = getFileUrl(instructor?.avatar);

  if (avatar) {
    return (
      <img
        src={avatar}
        alt={instructor.name}
        className={`${dimensions} object-cover shrink-0 bg-slate-50`}
      />
    );
  }

  return (
    <div
      className={`${dimensions} bg-gradient-to-tr ${palette[index % palette.length]} shrink-0 flex items-center justify-center font-semibold text-slate-700 dark:text-slate-350`}
    >
      {getInitial(instructor?.name)}
    </div>
  );
};

const InstructorCard = ({ instructor, index, onClick }) => (
  <div className="p-1.5 rounded-[1.8rem] bg-slate-50/50 dark:bg-slate-900/50 border border-slate-100/60 dark:border-slate-800/40 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.02)] hover:shadow-[0_8px_30px_-6px_rgba(139,92,246,0.06)] hover:border-purple-200/50 dark:hover:border-purple-900/30 transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] hover:-translate-y-1 group h-full">
    <div className="bg-white dark:bg-slate-950 rounded-[calc(1.8rem-6px)] p-4 border border-slate-100/50 dark:border-slate-850/50 h-full flex flex-col justify-between">
      <div>
        <div className="flex items-start gap-3.5 mb-3.5">
          <button 
            onClick={onClick}
            className="rounded-xl outline-none ring-purple-400 focus-visible:ring-2 hover:opacity-85 transition-all cursor-pointer"
            title="Xem chi tiết giảng viên"
          >
            <InstructorAvatar instructor={instructor} index={index} size="small" />
          </button>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <p className="text-sm font-semibold text-slate-800 dark:text-slate-200 truncate group-hover:text-purple-650 transition-colors">{instructor.name}</p>
              {instructor.verified && <BadgeCheck className="w-3.5 h-3.5 text-purple-600 shrink-0" strokeWidth={1.5} />}
            </div>
            <p className="text-xs text-slate-400 dark:text-slate-500 font-normal truncate mt-0.5">{instructor.headline || 'Giảng viên tại Skillio'}</p>
          </div>
          {instructor.email && (
            <a className="text-[11px] font-semibold text-purple-650 hover:text-purple-750 transition-colors" href={`mailto:${instructor.email}`}>
              Liên hệ
            </a>
          )}
        </div>

        <div className="flex flex-wrap gap-1.5 mb-3.5">
          {instructor.categories?.slice(0, 2).map((category) => (
            <span key={category.name} className="text-[9.5px] font-mono tracking-wider uppercase px-2 py-0.5 rounded bg-purple-500/5 text-purple-700/80 dark:text-purple-300/80">
              {category.name}
            </span>
          ))}
          {(instructor.categories?.length || 0) > 2 && (
            <span className="text-[9.5px] font-mono tracking-wider uppercase px-2 py-0.5 rounded bg-slate-50 dark:bg-slate-900 text-slate-500">
              +{instructor.categories.length - 2}
            </span>
          )}
        </div>
      </div>

      <div className="flex items-center gap-3.5 text-xs text-slate-400 dark:text-slate-500 font-medium mt-4 pt-3.5 border-t border-slate-50/50 dark:border-slate-900/40">
        <span className="inline-flex items-center gap-1">
          <Star className="w-3.5 h-3.5 text-amber-500" strokeWidth={1.5} />
          <span className="font-semibold text-slate-700 dark:text-slate-300 font-mono">
            {instructor.averageRating > 0 ? instructor.averageRating.toFixed(1) : '—'}
          </span>
        </span>
        <span className="font-mono">{formatNumber(instructor.studentCount)} học viên</span>
        <span className="font-mono">{numberFormat.format(instructor.courseCount)} khóa</span>
      </div>
    </div>
  </div>
);

const InstructorModal = ({ instructor, onClose, index }) => {
  if (!instructor) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-sm animate-fade-in" onClick={onClose}>
      <div 
        className="bg-white dark:bg-slate-905 w-full max-w-md overflow-hidden rounded-[2rem] border border-slate-100 dark:border-slate-800 shadow-2xl relative animate-fade-in-up p-1.5"
        onClick={e => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-5 right-5 w-8 h-8 flex items-center justify-center rounded-full bg-slate-50 dark:bg-slate-900 text-slate-400 hover:text-slate-750 dark:hover:text-slate-200 transition-all duration-300 hover:scale-105 active:scale-95 z-10 border border-slate-100/10"
        >
          <X className="w-4 h-4" strokeWidth={1.5} />
        </button>
        
        <div className="bg-white dark:bg-slate-950 rounded-[calc(2rem-6px)] border border-slate-150/40 dark:border-slate-850/50 p-6">
          <div className="flex flex-col items-center text-center mb-6 mt-2">
            <InstructorAvatar instructor={instructor} index={index} size="large" />
            <div className="mt-4 flex items-center gap-1.5 justify-center">
              <h3 className="text-lg font-semibold tracking-tight text-slate-900 dark:text-white">{instructor.name}</h3>
              {instructor.verified && <BadgeCheck className="w-5 h-5 text-purple-600" strokeWidth={1.5} />}
            </div>
            <p className="text-xs text-slate-450 dark:text-slate-500 mt-1 font-normal max-w-[30ch] leading-relaxed">{instructor.headline || 'Giảng viên tại Skillio'}</p>
          </div>

          <div className="grid grid-cols-3 gap-3 mb-6 p-4 bg-slate-50/50 dark:bg-slate-900/40 border border-slate-100/50 dark:border-slate-800/30 rounded-2xl">
            <div className="text-center">
              <p className="text-xl font-semibold text-slate-800 dark:text-slate-200 font-mono">{instructor.averageRating > 0 ? instructor.averageRating.toFixed(1) : '—'}</p>
              <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1 uppercase tracking-wider font-mono">Đánh giá</p>
            </div>
            <div className="text-center border-x border-slate-100/80 dark:border-slate-800/50">
              <p className="text-xl font-semibold text-slate-800 dark:text-slate-200 font-mono">{formatNumber(instructor.studentCount)}</p>
              <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1 uppercase tracking-wider font-mono">Học viên</p>
            </div>
            <div className="text-center">
              <p className="text-xl font-semibold text-slate-800 dark:text-slate-200 font-mono">{numberFormat.format(instructor.courseCount)}</p>
              <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1 uppercase tracking-wider font-mono">Khóa học</p>
            </div>
          </div>

          <div className="space-y-5">
            {instructor.categories && instructor.categories.length > 0 && (
              <div>
                <p className="text-[10px] font-semibold text-slate-900 dark:text-slate-200 uppercase tracking-widest mb-2.5">Lĩnh vực giảng dạy</p>
                <div className="flex flex-wrap gap-2">
                  {instructor.categories.map((cat) => (
                    <span key={cat.name} className="text-[10px] px-2.5 py-1 rounded bg-purple-500/5 border border-purple-500/10 text-purple-750 dark:text-purple-400 font-mono uppercase tracking-wider">
                      {cat.name}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {instructor.specialty && (
              <div>
                <p className="text-[10px] font-semibold text-slate-900 dark:text-slate-200 uppercase tracking-widest mb-2">Chuyên môn</p>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed font-normal">{instructor.specialty}</p>
              </div>
            )}
          </div>

          {instructor.email && (
            <div className="mt-6 pt-6 border-t border-slate-50/50 dark:border-slate-900/40">
              <a
                href={`mailto:${instructor.email}`}
                className="w-full flex items-center justify-center gap-2 bg-purple-600 hover:bg-purple-700 text-white py-2.5 rounded-full text-xs font-medium transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] hover:scale-[1.02] active:scale-[0.98] shadow-sm shadow-purple-100 dark:shadow-none"
              >
                <Mail className="w-4 h-4" strokeWidth={1.5} />
                <span>Liên hệ với giảng viên</span>
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const Instructors = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Tất cả');
  const [sortBy, setSortBy] = useState('students');
  const [selectedInstructor, setSelectedInstructor] = useState(null);

  useEffect(() => {
    let active = true;

    const loadInstructors = async () => {
      try {
        setLoading(true);
        setError('');
        const response = await api.get('/api/instructors');
        if (active) setData(response);
      } catch (err) {
        if (active) setError(err.message || 'Không thể tải danh sách giảng viên');
      } finally {
        if (active) setLoading(false);
      }
    };

    loadInstructors();
    return () => {
      active = false;
    };
  }, []);

  const instructors = useMemo(() => data?.instructors || [], [data?.instructors]);
  const categories = data?.categories || [];
  const featured = data?.featuredInstructor;

  const filteredInstructors = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return instructors
      .filter((instructor) => {
        const matchesCategory =
          selectedCategory === 'Tất cả' ||
          instructor.categories?.some((category) => category.name === selectedCategory);
        const matchesQuery =
          !normalizedQuery ||
          [instructor.name, instructor.headline, instructor.specialty, instructor.email]
            .filter(Boolean)
            .some((value) => value.toLowerCase().includes(normalizedQuery));
        return matchesCategory && matchesQuery;
      })
      .sort((left, right) => {
        if (sortBy === 'rating') return right.averageRating - left.averageRating;
        if (sortBy === 'courses') return right.courseCount - left.courseCount;
        if (sortBy === 'name') return left.name.localeCompare(right.name, 'vi');
        return right.studentCount - left.studentCount;
      });
  }, [instructors, query, selectedCategory, sortBy]);

  const stats = data?.stats || {};

  return (
    <div className="animate-fade-in-up pb-24 space-y-6">
      {/* ─── Header ─── */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between mb-2">
        <div>
          <h1 className="text-2xl md:text-3xl font-semibold tracking-tight text-slate-900 dark:text-white">
            Giảng viên
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 font-normal mt-1.5 leading-relaxed">
            Học hỏi từ những chuyên gia hàng đầu trong nhiều lĩnh vực công nghệ và thiết kế.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
          <label className="relative shrink-0">
            <Search className="w-4 h-4 text-slate-450 dark:text-slate-550 absolute left-3 top-1/2 -translate-y-1/2" strokeWidth={1.5} />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Tìm giảng viên, lĩnh vực..."
              className="w-full sm:w-60 h-10 rounded-full border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 pl-9 pr-4 text-xs outline-none transition focus:border-purple-400 focus:ring-4 focus:ring-purple-100 dark:focus:ring-purple-950/20 text-slate-700 dark:text-slate-350"
            />
          </label>
          <select
            value={sortBy}
            onChange={(event) => setSortBy(event.target.value)}
            className="h-10 rounded-full border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-4 text-xs text-slate-650 dark:text-slate-400 outline-none transition focus:border-purple-400 focus:ring-4 focus:ring-purple-100 dark:focus:ring-purple-950/20 cursor-pointer"
          >
            <option value="students">Nhiều học viên nhất</option>
            <option value="rating">Đánh giá cao nhất</option>
            <option value="courses">Nhiều khóa học nhất</option>
            <option value="name">Tên giảng viên A-Z</option>
          </select>
        </div>
      </div>

      {error && (
        <div className="p-[1.5px] rounded-[1.5rem] bg-rose-50/50 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900/30">
          <div className="bg-white dark:bg-slate-900 rounded-[calc(1.5rem-1.5px)] p-4 text-xs font-semibold text-rose-650">
            {error}
          </div>
        </div>
      )}

      {/* ─── Stats Bento Row ─── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          icon={Users}
          label="Tổng giảng viên"
          value={loading ? '...' : numberFormat.format(stats.totalInstructors || 0)}
          tone={{ bg: 'bg-purple-500/5 text-purple-700 border-purple-500/10 dark:bg-purple-950/20 dark:text-purple-400 dark:border-purple-900/20', text: 'text-purple-600 dark:text-purple-400' }}
        />
        <StatCard
          icon={BadgeCheck}
          label="Giảng viên hoạt động"
          value={loading ? '...' : numberFormat.format(stats.verifiedInstructors || 0)}
          tone={{ bg: 'bg-amber-500/5 text-amber-700 border-amber-500/10 dark:bg-amber-950/20 dark:text-amber-400 dark:border-amber-900/20', text: 'text-amber-600 dark:text-amber-400' }}
        />
        <StatCard
          icon={Star}
          label="Đánh giá trung bình"
          value={loading ? '...' : `${(stats.averageRating || 0).toFixed(1)}/5`}
          tone={{ bg: 'bg-emerald-500/5 text-emerald-700 border-emerald-500/10 dark:bg-emerald-950/20 dark:text-emerald-400 dark:border-emerald-900/20', text: 'text-emerald-600 dark:text-emerald-400' }}
        />
        <StatCard
          icon={GraduationCap}
          label="Học viên đang học"
          value={loading ? '...' : formatNumber(stats.totalStudents || 0)}
          tone={{ bg: 'bg-purple-500/5 text-purple-750 border-purple-500/10 dark:bg-purple-950/20 dark:text-purple-400 dark:border-purple-900/20', text: 'text-purple-600 dark:text-purple-400' }}
        />
      </div>

      {/* ─── Featured Section ─── */}
      <div className="p-1.5 rounded-[2rem] bg-slate-50/50 dark:bg-slate-900/50 border border-slate-100/60 dark:border-slate-800/40 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.01)]">
        <div className="bg-white dark:bg-slate-950 rounded-[calc(2rem-6px)] p-6 border border-slate-100/50 dark:border-slate-850/50">
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-base font-semibold text-slate-800 dark:text-slate-200">Giảng viên nổi bật</h3>
            <Filter className="w-4 h-4 text-slate-350 dark:text-slate-600" strokeWidth={1.5} />
          </div>

          {loading && <div className="h-36 rounded-2xl bg-slate-50 dark:bg-slate-900 animate-pulse border border-slate-100/60 dark:border-slate-800/40" />}

          {!loading && !featured && (
            <div className="rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 p-8 text-center text-xs text-slate-450 dark:text-slate-500">
              Chưa có giảng viên nổi bật nào.
            </div>
          )}

          {!loading && featured && (
            <div className="flex flex-col md:flex-row items-center gap-5 p-5 rounded-2xl bg-gradient-to-tr from-purple-500/[0.03] to-indigo-500/[0.01] dark:from-purple-950/15 dark:to-slate-950/10 border border-purple-100/40 dark:border-purple-900/20">
              <InstructorAvatar instructor={featured} index={0} />
              <div className="flex-1 min-w-0 text-center md:text-left">
                <div className="flex flex-wrap items-center justify-center md:justify-start gap-2 mb-1.5">
                  <h4 className="text-base font-semibold tracking-tight text-slate-800 dark:text-slate-200">{featured.name}</h4>
                  {featured.verified && (
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-purple-700 dark:text-purple-400 bg-white dark:bg-slate-900 border border-purple-150/40 dark:border-purple-900/30 px-2 py-0.5 rounded-md inline-flex items-center gap-1 shadow-sm">
                      <BadgeCheck className="w-3.5 h-3.5 text-purple-600" strokeWidth={1.5} />
                      <span>Có khóa học</span>
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mb-3.5 max-w-xl font-normal leading-relaxed">{featured.headline}</p>
                <div className="flex flex-wrap items-center justify-center md:justify-start gap-4 text-xs font-medium text-slate-400 dark:text-slate-550 border-t border-slate-50/60 dark:border-slate-900/40 pt-3">
                  <span className="inline-flex items-center gap-1 text-slate-600 dark:text-slate-350">
                    <Star className="w-3.5 h-3.5 text-amber-500" strokeWidth={1.5} />
                    <span className="font-semibold font-mono">
                      {featured.averageRating > 0 ? featured.averageRating.toFixed(1) : '—'}
                    </span>
                    <span className="text-slate-400 font-mono">({formatNumber(featured.reviewCount)} đánh giá)</span>
                  </span>
                  <span className="inline-flex items-center gap-1 text-slate-600 dark:text-slate-350 font-mono">
                    <Users className="w-3.5 h-3.5 text-slate-350 dark:text-slate-600" strokeWidth={1.5} />
                    {formatNumber(featured.studentCount)} học viên
                  </span>
                  <span className="inline-flex items-center gap-1 text-slate-600 dark:text-slate-350 font-mono">
                    <BookOpen className="w-3.5 h-3.5 text-slate-350 dark:text-slate-600" strokeWidth={1.5} />
                    {numberFormat.format(featured.courseCount)} khóa học
                  </span>
                </div>
              </div>
              {featured.email && (
                <a
                  href={`mailto:${featured.email}`}
                  className="bg-purple-600 hover:bg-purple-750 text-white px-5 py-2.5 rounded-full text-xs font-medium inline-flex items-center gap-2 hover:scale-[1.02] active:scale-[0.98] transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] shadow-sm shadow-purple-100 dark:shadow-none shrink-0"
                >
                  <Mail className="w-4 h-4" strokeWidth={1.5} />
                  <span>Liên hệ</span>
                </a>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ─── Grid Directory Section ─── */}
      <div className="p-1.5 rounded-[2rem] bg-slate-50/50 dark:bg-slate-900/50 border border-slate-100/60 dark:border-slate-800/40 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.01)]">
        <div className="bg-white dark:bg-slate-950 rounded-[calc(2rem-6px)] p-6 border border-slate-100/50 dark:border-slate-850/50">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between mb-5">
            <h3 className="text-base font-semibold text-slate-800 dark:text-slate-200">Tất cả giảng viên</h3>
            
            <div className="flex items-center gap-1 bg-slate-50 dark:bg-slate-900 p-1 rounded-full border border-slate-100/50 dark:border-slate-800/30 overflow-x-auto shrink-0 max-w-full">
              {['Tất cả', ...categories.slice(0, 4).map((category) => category.name)].map((category) => (
                <button
                  key={category}
                  onClick={() => setSelectedCategory(category)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all duration-300 ${
                    selectedCategory === category
                      ? 'bg-white dark:bg-slate-800 text-slate-800 dark:text-white shadow-sm'
                      : 'text-slate-400 hover:text-slate-650 dark:text-slate-500'
                  }`}
                >
                  {category}
                </button>
              ))}
            </div>
          </div>

          {loading && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {[0, 1, 2, 3].map((item) => (
                <div key={item} className="p-1.5 rounded-[1.8rem] bg-slate-50/50 dark:bg-slate-900/50 border border-slate-100 animate-pulse h-36">
                  <div className="bg-white dark:bg-slate-950 rounded-[calc(1.8rem-6px)] h-full" />
                </div>
              ))}
            </div>
          )}

          {!loading && filteredInstructors.length === 0 && (
            <div className="rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 p-12 text-center text-xs text-slate-450 dark:text-slate-500">
              Không tìm thấy giảng viên phù hợp.
            </div>
          )}

          {!loading && filteredInstructors.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {filteredInstructors.map((instructor, index) => (
                <InstructorCard key={instructor.id} instructor={instructor} index={index} onClick={() => setSelectedInstructor(instructor)} />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ─── Teaching Fields Section ─── */}
      <div className="p-1.5 rounded-[2rem] bg-slate-50/50 dark:bg-slate-900/50 border border-slate-100/60 dark:border-slate-800/40 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.01)]">
        <div className="bg-white dark:bg-slate-950 rounded-[calc(2rem-6px)] p-6 border border-slate-100/50 dark:border-slate-850/50">
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-base font-semibold text-slate-800 dark:text-slate-200">Lĩnh vực giảng dạy</h3>
            <ArrowUpDown className="w-4 h-4 text-slate-350 dark:text-slate-600" strokeWidth={1.5} />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {categories.length === 0 && !loading && (
              <div className="sm:col-span-2 lg:col-span-3 xl:col-span-4 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 p-8 text-center text-xs text-slate-450 dark:text-slate-550">
                Chưa có lĩnh vực giảng dạy nào.
              </div>
            )}
            {categories.map((category) => (
              <div key={category.name} className="p-1.5 rounded-[1.8rem] bg-slate-50/50 dark:bg-slate-900/50 border border-slate-100/60 dark:border-slate-800/40 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.015)] transition-all duration-500 hover:-translate-y-0.5">
                <div className="bg-white dark:bg-slate-950 rounded-[calc(1.8rem-6px)] p-4 border border-slate-100/50 dark:border-slate-850/50 h-full flex flex-col justify-between">
                  <div className="flex items-center justify-between mb-3.5">
                    <span className="text-sm font-semibold text-slate-800 dark:text-slate-200">{category.name}</span>
                    <span className="text-[9.5px] font-mono tracking-wider text-purple-650 dark:text-purple-400 bg-purple-500/5 border border-purple-500/10 px-2 py-0.5 rounded">
                      {numberFormat.format(category.instructorCount)} GV
                    </span>
                  </div>
                  <div>
                    <div className="w-full bg-slate-100 dark:bg-slate-900 rounded-full h-1 mb-2 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-purple-500 to-indigo-500"
                        style={{ width: `${Math.min(100, Math.max(8, category.percentage || 0))}%` }}
                      />
                    </div>
                    <p className="text-[10px] text-slate-400 dark:text-slate-500 font-normal font-mono flex justify-between">
                      <span>{category.percentage}% tổng số</span>
                      <span>{numberFormat.format(category.courseCount)} khóa học</span>
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Instructor Modal */}
      {selectedInstructor && (
        <InstructorModal 
          instructor={selectedInstructor} 
          onClose={() => setSelectedInstructor(null)} 
          index={filteredInstructors.findIndex(i => i.id === selectedInstructor.id)} 
        />
      )}
    </div>
  );
};

export default Instructors;
