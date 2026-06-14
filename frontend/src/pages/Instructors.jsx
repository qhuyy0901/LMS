import { useEffect, useMemo, useState } from 'react';
import {
  ArrowUpDown,
  BadgeCheck,
  BookOpen,
  CalendarPlus,
  Filter,
  GraduationCap,
  Mail,
  MessageCircle,
  Search,
  Star,
  UserRound,
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
  'from-purple-300 to-fuchsia-300',
  'from-sky-300 to-cyan-300',
  'from-emerald-300 to-teal-300',
  'from-amber-300 to-orange-300',
  'from-rose-300 to-pink-300',
];

const StatCard = ({ icon: Icon, label, value, tone }) => (
  <div className="bg-white rounded-2xl p-5 border border-slate-100 transition-all duration-300 hover:shadow-lg hover:-translate-y-1">
    <div className="flex items-center justify-between mb-3">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${tone.bg}`}>
        <Icon className={`w-5 h-5 ${tone.text}`} />
      </div>
    </div>
    <p className="text-xs text-slate-400 mb-1">{label}</p>
    <p className="text-2xl font-semibold tracking-tight text-slate-900">{value}</p>
  </div>
);

const InstructorAvatar = ({ instructor, index = 0, size = 'large' }) => {
  const dimensions = size === 'small' ? 'w-10 h-10 rounded-lg text-sm' : 'w-20 h-20 rounded-2xl text-2xl';
  const avatar = getFileUrl(instructor?.avatar);

  if (avatar) {
    return (
      <img
        src={avatar}
        alt={instructor.name}
        className={`${dimensions} object-cover shrink-0 bg-slate-100`}
      />
    );
  }

  return (
    <div
      className={`${dimensions} bg-gradient-to-br ${palette[index % palette.length]} shrink-0 flex items-center justify-center font-semibold text-white`}
    >
      {getInitial(instructor?.name)}
    </div>
  );
};

const InstructorCard = ({ instructor, index, onClick }) => (
  <div className="p-4 rounded-xl border border-slate-100 hover:border-purple-200 hover:bg-purple-50/30 transition">
    <div className="flex items-start gap-3 mb-3">
      <button 
        onClick={onClick}
        className="rounded-xl outline-none ring-purple-400 focus-visible:ring-2 hover:opacity-80 transition cursor-pointer"
        title="Xem chi tiết giảng viên"
      >
        <InstructorAvatar instructor={instructor} index={index} size="small" />
      </button>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <p className="text-sm font-semibold text-slate-900 truncate">{instructor.name}</p>
          {instructor.verified && <BadgeCheck className="w-3.5 h-3.5 text-purple-600 shrink-0" />}
        </div>
        <p className="text-xs text-slate-400 truncate">{instructor.headline}</p>
      </div>
      {instructor.email && (
        <a className="text-xs font-medium text-purple-600" href={`mailto:${instructor.email}`}>
          Liên hệ
        </a>
      )}
    </div>

    <div className="flex flex-wrap gap-1.5 mb-3">
      {instructor.categories?.slice(0, 2).map((category) => (
        <span key={category.name} className="text-xs px-2 py-0.5 rounded-full bg-purple-50 text-purple-700">
          {category.name}
        </span>
      ))}
      {(instructor.categories?.length || 0) > 2 && (
        <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
          +{instructor.categories.length - 2}
        </span>
      )}
    </div>

    <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
      <span className="inline-flex items-center gap-1">
        <Star className="w-3 h-3 text-amber-500" />
        {instructor.averageRating > 0 ? instructor.averageRating.toFixed(1) : 'Chưa có'}
      </span>
      <span>{formatNumber(instructor.studentCount)} học viên</span>
      <span>{numberFormat.format(instructor.courseCount)} khóa</span>
    </div>
  </div>
);

const InstructorModal = ({ instructor, onClose, index }) => {
  if (!instructor) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-fade-in" onClick={onClose}>
      <div 
        className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden relative animate-fade-in-up"
        onClick={e => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 hover:text-slate-700 transition"
        >
          <X className="w-5 h-5" />
        </button>
        
        <div className="p-6">
          <div className="flex flex-col items-center text-center mb-6 mt-2">
            <InstructorAvatar instructor={instructor} index={index} size="large" />
            <div className="mt-4 flex items-center gap-1.5 justify-center">
              <h3 className="text-xl font-bold text-slate-900">{instructor.name}</h3>
              {instructor.verified && <BadgeCheck className="w-5 h-5 text-purple-600" />}
            </div>
            <p className="text-sm text-slate-500 mt-1">{instructor.headline || 'Giảng viên tại Skillio'}</p>
          </div>

          <div className="grid grid-cols-3 gap-3 mb-6 p-4 bg-slate-50 rounded-xl">
            <div className="text-center">
              <p className="text-xl font-semibold text-slate-900">{instructor.averageRating > 0 ? instructor.averageRating.toFixed(1) : '-'}</p>
              <p className="text-xs text-slate-500 mt-1">Đánh giá</p>
            </div>
            <div className="text-center border-x border-slate-200">
              <p className="text-xl font-semibold text-slate-900">{formatNumber(instructor.studentCount)}</p>
              <p className="text-xs text-slate-500 mt-1">Học viên</p>
            </div>
            <div className="text-center">
              <p className="text-xl font-semibold text-slate-900">{numberFormat.format(instructor.courseCount)}</p>
              <p className="text-xs text-slate-500 mt-1">Khóa học</p>
            </div>
          </div>

          <div className="space-y-4">
            {instructor.categories && instructor.categories.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-slate-900 uppercase tracking-wider mb-2">Lĩnh vực giảng dạy</p>
                <div className="flex flex-wrap gap-2">
                  {instructor.categories.map((cat) => (
                    <span key={cat.name} className="text-xs px-2.5 py-1 rounded-md bg-purple-50 text-purple-700 font-medium">
                      {cat.name}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {instructor.specialty && (
              <div>
                <p className="text-xs font-semibold text-slate-900 uppercase tracking-wider mb-2">Chuyên môn</p>
                <p className="text-sm text-slate-600">{instructor.specialty}</p>
              </div>
            )}
          </div>

          {instructor.email && (
            <div className="mt-6 pt-6 border-t border-slate-100">
              <a
                href={`mailto:${instructor.email}`}
                className="w-full flex items-center justify-center gap-2 bg-purple-600 hover:bg-purple-700 text-white py-2.5 rounded-xl text-sm font-medium transition"
              >
                <Mail className="w-4 h-4" />
                Liên hệ với giảng viên
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
    <div className="animate-fade-in-up">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between mb-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-semibold tracking-tight text-slate-900 mb-1">
            Giảng viên
          </h1>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
          <label className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Tìm giảng viên, lĩnh vực..."
              className="w-full sm:w-64 h-11 rounded-full border border-slate-200 bg-white pl-9 pr-4 text-sm outline-none transition focus:border-purple-400 focus:ring-4 focus:ring-purple-100"
            />
          </label>
          <select
            value={sortBy}
            onChange={(event) => setSortBy(event.target.value)}
            className="h-11 rounded-full border border-slate-200 bg-white px-4 text-sm text-slate-600 outline-none transition focus:border-purple-400 focus:ring-4 focus:ring-purple-100"
          >
            <option value="students">Nhiều học viên</option>
            <option value="rating">Đánh giá cao</option>
            <option value="courses">Nhiều khóa học</option>
            <option value="name">Tên A-Z</option>
          </select>
        </div>
      </div>

      {error && (
        <div className="mb-6 rounded-2xl border border-rose-100 bg-rose-50 px-5 py-4 text-sm text-rose-600">
          {error}
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <StatCard
          icon={Users}
          label="Tổng giảng viên"
          value={loading ? '...' : numberFormat.format(stats.totalInstructors || 0)}
          tone={{ bg: 'bg-purple-100', text: 'text-purple-600' }}
        />
        <StatCard
          icon={BadgeCheck}
          label="Giảng viên có khóa học"
          value={loading ? '...' : numberFormat.format(stats.verifiedInstructors || 0)}
          tone={{ bg: 'bg-amber-100', text: 'text-amber-600' }}
        />
        <StatCard
          icon={Star}
          label="Đánh giá trung bình"
          value={loading ? '...' : `${(stats.averageRating || 0).toFixed(1)}/5`}
          tone={{ bg: 'bg-emerald-100', text: 'text-emerald-600' }}
        />
        <StatCard
          icon={GraduationCap}
          label="Học viên đang học"
          value={loading ? '...' : formatNumber(stats.totalStudents || 0)}
          tone={{ bg: 'bg-pink-100', text: 'text-pink-600' }}
        />
      </div>

      <div className="flex flex-col gap-6">
        <div className="space-y-6">
          <div className="bg-white rounded-2xl p-6 border border-slate-100">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h3 className="text-xl font-semibold tracking-tight text-slate-900">Giảng viên nổi bật</h3>
              </div>
              <Filter className="w-5 h-5 text-slate-300" />
            </div>

            {loading && <div className="h-36 rounded-2xl bg-slate-100 animate-pulse" />}

            {!loading && !featured && (
              <div className="rounded-2xl border border-dashed border-slate-200 p-8 text-center text-sm text-slate-500">
                Chưa có giảng viên nào có khóa học công khai.
              </div>
            )}

            {!loading && featured && (
              <div className="flex flex-col md:flex-row items-start gap-5 p-5 rounded-2xl bg-gradient-to-br from-purple-50 to-pink-50 border border-purple-100">
                <InstructorAvatar instructor={featured} index={0} />
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <h4 className="text-lg font-semibold tracking-tight text-slate-900">{featured.name}</h4>
                    {featured.verified && (
                      <span className="text-xs font-medium text-purple-700 bg-white px-2 py-0.5 rounded-full inline-flex items-center gap-1">
                        <BadgeCheck className="w-3 h-3" />
                        Có khóa học
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-slate-600 mb-3">{featured.headline}</p>
                  <div className="flex flex-wrap items-center gap-4 text-sm">
                    <span className="inline-flex items-center gap-1.5 text-slate-700">
                      <Star className="w-4 h-4 text-amber-500" />
                      <span className="font-semibold">
                        {featured.averageRating > 0 ? featured.averageRating.toFixed(1) : 'Chưa có'}
                      </span>
                      <span className="text-slate-400">({formatNumber(featured.reviewCount)} đánh giá)</span>
                    </span>
                    <span className="inline-flex items-center gap-1.5 text-slate-700">
                      <Users className="w-4 h-4 text-slate-400" />
                      {formatNumber(featured.studentCount)} học viên
                    </span>
                    <span className="inline-flex items-center gap-1.5 text-slate-700">
                      <BookOpen className="w-4 h-4 text-slate-400" />
                      {numberFormat.format(featured.courseCount)} khóa học
                    </span>
                  </div>
                </div>
                {featured.email && (
                  <a
                    href={`mailto:${featured.email}`}
                    className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2.5 rounded-full text-sm font-medium inline-flex items-center gap-2"
                  >
                    <Mail className="w-4 h-4" />
                    Liên hệ
                  </a>
                )}
              </div>
            )}
          </div>

          <div className="bg-white rounded-2xl p-6 border border-slate-100">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between mb-5">
              <h3 className="text-xl font-semibold tracking-tight text-slate-900">Tất cả giảng viên</h3>
              <div className="flex items-center gap-1 bg-slate-100 rounded-full p-1 overflow-x-auto">
                {['Tất cả', ...categories.slice(0, 4).map((category) => category.name)].map((category) => (
                  <button
                    key={category}
                    onClick={() => setSelectedCategory(category)}
                    className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap ${
                      selectedCategory === category
                        ? 'bg-white text-slate-700 shadow-sm'
                        : 'text-slate-500 hover:text-slate-700'
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
                  <div key={item} className="h-36 rounded-xl bg-slate-100 animate-pulse" />
                ))}
              </div>
            )}

            {!loading && filteredInstructors.length === 0 && (
              <div className="rounded-2xl border border-dashed border-slate-200 p-8 text-center text-sm text-slate-500">
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

          <div className="bg-white rounded-2xl p-6 border border-slate-100">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h3 className="text-xl font-semibold tracking-tight text-slate-900">Lĩnh vực giảng dạy</h3>
              </div>
              <ArrowUpDown className="w-5 h-5 text-slate-300" />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {categories.length === 0 && !loading && (
                <div className="sm:col-span-2 lg:col-span-3 xl:col-span-4 rounded-2xl border border-dashed border-slate-200 p-8 text-center text-sm text-slate-500">
                  Chưa có lĩnh vực giảng dạy nào.
                </div>
              )}
              {categories.map((category, index) => (
                <div key={category.name} className="p-4 rounded-xl border border-slate-100">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-slate-900">{category.name}</span>
                    <span className="text-xs font-medium text-purple-700 bg-purple-50 px-2 py-0.5 rounded-full">
                      {numberFormat.format(category.instructorCount)} GV
                    </span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-1.5 mb-1">
                    <div
                      className={`h-1.5 rounded-full ${
                        ['bg-purple-600', 'bg-emerald-500', 'bg-blue-500', 'bg-amber-500'][index % 4]
                      }`}
                      style={{ width: `${Math.min(100, Math.max(8, category.percentage || 0))}%` }}
                    />
                  </div>
                  <p className="text-xs text-slate-400">
                    {category.percentage}% tổng số · {numberFormat.format(category.courseCount)} khóa
                  </p>
                </div>
              ))}
            </div>
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
