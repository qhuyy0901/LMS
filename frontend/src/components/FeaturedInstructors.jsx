import { useEffect, useMemo, useState } from 'react';
import { BadgeCheck, BookOpen, Star, Users, X } from 'lucide-react';
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
];

const InstructorAvatar = ({ instructor, index = 0 }) => {
  const avatar = getFileUrl(instructor?.avatar);

  if (avatar) {
    return (
      <img
        src={avatar}
        alt={instructor?.name || 'Giảng viên'}
        className="h-11 w-11 shrink-0 rounded-xl bg-slate-100 object-cover"
      />
    );
  }

  return (
    <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${palette[index % palette.length]} text-sm font-semibold text-white`}>
      {getInitial(instructor?.name)}
    </div>
  );
};

const InstructorDetailModal = ({ instructor, index, onClose }) => {
  if (!instructor) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm" onClick={onClose}>
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl" onClick={(event) => event.stopPropagation()}>
        <div className="mb-5 flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <InstructorAvatar instructor={instructor} index={index} />
            <div>
              <div className="flex items-center gap-1.5">
                <h3 className="text-lg font-semibold tracking-tight text-slate-900">{instructor.name}</h3>
                {instructor.verified && <BadgeCheck className="h-4 w-4 text-purple-600" />}
              </div>
              <p className="text-sm text-slate-500">{instructor.specialty || instructor.headline || 'Giảng viên Skillio'}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-500 transition hover:bg-slate-200 hover:text-slate-700"
            aria-label="Đóng"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mb-5 grid grid-cols-3 gap-3 rounded-xl bg-slate-50 p-4">
          <Metric label="Đánh giá" value={instructor.averageRating > 0 ? instructor.averageRating.toFixed(1) : '-'} />
          <Metric label="Học viên" value={formatNumber(instructor.studentCount)} />
          <Metric label="Khóa học" value={numberFormat.format(instructor.courseCount || 0)} />
        </div>

        <p className="line-clamp-4 text-sm leading-6 text-slate-600">
          {instructor.bio || instructor.headline || 'Giảng viên đang cập nhật thông tin giới thiệu.'}
        </p>
      </div>
    </div>
  );
};

const Metric = ({ label, value }) => (
  <div className="text-center">
    <p className="text-base font-semibold text-slate-900">{value}</p>
    <p className="mt-1 text-[11px] text-slate-500">{label}</p>
  </div>
);

const InstructorCard = ({ instructor, index, onOpen }) => (
  <div className="rounded-xl border border-slate-100 p-3 transition hover:border-purple-200 hover:bg-purple-50/40">
    <div className="mb-3 flex items-start gap-3">
      <InstructorAvatar instructor={instructor} index={index} />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <p className="truncate text-sm font-semibold text-slate-900">{instructor.name}</p>
          {instructor.verified && <BadgeCheck className="h-3.5 w-3.5 shrink-0 text-purple-600" />}
        </div>
        <p className="truncate text-xs text-slate-500">{instructor.specialty || instructor.headline || 'Giảng viên Skillio'}</p>
      </div>
    </div>

    <div className="mb-3 grid grid-cols-3 gap-2 text-[11px] text-slate-500">
      <span className="inline-flex items-center gap-1">
        <Star className="h-3 w-3 text-amber-500" />
        {instructor.averageRating > 0 ? instructor.averageRating.toFixed(1) : '-'}
      </span>
      <span className="inline-flex items-center gap-1">
        <Users className="h-3 w-3 text-slate-400" />
        {formatNumber(instructor.studentCount)}
      </span>
      <span className="inline-flex items-center gap-1">
        <BookOpen className="h-3 w-3 text-slate-400" />
        {numberFormat.format(instructor.courseCount || 0)}
      </span>
    </div>

    <button
      type="button"
      onClick={onOpen}
      className="w-full rounded-lg bg-slate-900 px-3 py-2 text-xs font-semibold text-white transition hover:bg-purple-700"
    >
      Xem chi tiết
    </button>
  </div>
);

export default function FeaturedInstructors() {
  const [instructors, setInstructors] = useState([]);
  const [selectedInstructor, setSelectedInstructor] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;

    const loadInstructors = async () => {
      try {
        setLoading(true);
        setError('');
        const response = await api.get('/api/instructors');
        if (active) {
          setInstructors(response?.instructors || []);
        }
      } catch (err) {
        if (active) {
          setError(err.message || 'Không thể tải giảng viên nổi bật.');
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    loadInstructors();

    return () => {
      active = false;
    };
  }, []);

  const featured = useMemo(() => instructors.slice(0, 4), [instructors]);

  return (
    <section className="rounded-2xl border border-slate-100 bg-white p-6">
      <div className="mb-5 flex items-center justify-between gap-3">
        <h3 className="text-xl font-semibold tracking-tight text-slate-900">Giảng viên nổi bật</h3>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-1">
          {[0, 1, 2].map((item) => (
            <div key={item} className="h-32 animate-pulse rounded-xl bg-slate-100" />
          ))}
        </div>
      ) : error ? (
        <div className="rounded-xl border border-rose-100 bg-rose-50 p-4 text-sm text-rose-600">{error}</div>
      ) : featured.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-200 p-5 text-center text-sm text-slate-500">
          Chưa có giảng viên nổi bật.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-1">
          {featured.map((instructor, index) => (
            <InstructorCard
              key={instructor.id}
              instructor={instructor}
              index={index}
              onOpen={() => setSelectedInstructor(instructor)}
            />
          ))}
        </div>
      )}

      {selectedInstructor && (
        <InstructorDetailModal
          instructor={selectedInstructor}
          index={featured.findIndex((item) => item.id === selectedInstructor.id)}
          onClose={() => setSelectedInstructor(null)}
        />
      )}
    </section>
  );
}
