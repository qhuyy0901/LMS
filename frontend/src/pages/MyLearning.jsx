import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import {
  Play,
  Clock,
  CheckCircle2,
  Plus,
  Compass,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import CourseProgressCard from '../components/CourseProgressCard';
import CertificateModal from '../components/CertificateModal';


// ─── Helpers ──────────────────────────────────────────────────────────────────

const numberFmt = new Intl.NumberFormat('vi-VN');
const dateFmt = new Intl.DateTimeFormat('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });

const clamp = (v) => Math.min(100, Math.max(0, Number(v || 0)));

const getCourse = (e) => e?.course || {};
const getCourseId = (course) => course?.id || course?.Id;
const getCertificateCourseId = (certificate) => certificate?.course?.id || certificate?.course?.Id;

const getStatus = (enrollment) => {
  const course = getCourse(enrollment);
  const progress = clamp(enrollment.progress);
  const now = new Date();
  const startDate = course.startDate ? new Date(course.startDate) : null;
  if (enrollment.completedAt || progress >= 100) return 'completed';
  if (startDate && startDate > now) return 'upcoming';
  return 'active';
};

// ─── Tab Config ───────────────────────────────────────────────────────────────

const TABS = [
  { key: 'active',    label: 'Đang học',       icon: Play },
  { key: 'upcoming',  label: 'Sắp bắt đầu',   icon: Clock },
  { key: 'completed', label: 'Đã hoàn thành',  icon: CheckCircle2 },
];


// ─── Main Component ───────────────────────────────────────────────────────────

const MyLearning = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [enrollments, setEnrollments] = useState([]);
  const [certificates, setCertificates] = useState([]);
  const [selectedCertificate, setSelectedCertificate] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('active');
  const [query] = useState('');

  // Load enrollments and certificates
  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        setLoading(true);
        const [enrollRes, certRes] = await Promise.all([
          axios.get('/api/courses/enrolled'),
          axios.get('/api/user/certificates').catch(() => ({ data: [] }))
        ]);
        if (mounted) {
          setEnrollments(Array.isArray(enrollRes.data) ? enrollRes.data : []);
          setCertificates(Array.isArray(certRes.data) ? certRes.data : []);
        }
      } catch (err) {
        if (mounted) setError(err.response?.data?.message || err.message || 'Không thể tải dữ liệu học tập');
      } finally {
        if (mounted) setLoading(false);
      }
    };
    load();
    return () => { mounted = false; };
  }, []);

  // Enrich enrollments with status
  const enriched = useMemo(() =>
    enrollments
      .filter(e => e.course)
      .map(e => ({
        ...e,
        status: getStatus(e),
      })),
    [enrollments]
  );

  // Tab counts
  const counts = useMemo(() => {
    const result = { active: 0, upcoming: 0, completed: 0 };
    enriched.forEach(e => {
      result[e.status] = (result[e.status] || 0) + 1;
    });
    return result;
  }, [enriched]);


  // Filtered list for current tab
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return enriched.filter(e => {
      const course = getCourse(e);
      const matchTab = e.status === activeTab;
      if (!matchTab) return false;
      if (!q) return true;
      return [course.title, course.category, course.instructorName].filter(Boolean).some(v => v.toLowerCase().includes(q));
    });
  }, [enriched, activeTab, query]);

  return (
    <div className="animate-fade-in-up pb-24 space-y-6">
      {/* ─── Header ─── */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between mb-2">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white md:text-3xl">
            Học tập của tôi
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 font-normal mt-1.5 leading-relaxed">
            Quản lý tiến trình học, xem chứng chỉ và tiếp tục bài học của bạn.
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <button
            onClick={() => navigate('/explore')}
            className="inline-flex items-center justify-center gap-2 rounded-full bg-purple-600 hover:bg-purple-755 text-white transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] hover:scale-[1.02] active:scale-[0.98] px-5 py-2.5 text-xs font-medium group/btn shadow-sm shadow-purple-100 dark:shadow-none cursor-pointer"
          >
            <Plus className="h-3.5 w-3.5 transition-transform duration-500 group-hover/btn:rotate-90" strokeWidth={1.5} />
            <span>Khám phá thêm</span>
          </button>
        </div>
      </div>


      {/* ─── Tabs ─── */}
      <div className="mb-6 flex items-center gap-1 overflow-x-auto border-b border-slate-100 dark:border-slate-800 pb-px">
        {TABS.map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex shrink-0 items-center gap-2 whitespace-nowrap px-4 py-3 text-xs font-medium uppercase tracking-[0.08em] transition-all duration-300 relative ${
                isActive
                  ? 'text-purple-650 dark:text-purple-400'
                  : 'text-slate-405 hover:text-slate-655 dark:text-slate-500'
              }`}
            >
              <Icon className="h-3.5 w-3.5" strokeWidth={1.5} />
              <span>{tab.label}</span>
              <span className={`rounded-full px-1.5 py-0.5 text-[9px] font-medium font-mono transition-colors ${
                isActive 
                  ? 'bg-purple-50 text-purple-750 dark:bg-purple-950/40 dark:text-purple-400' 
                  : 'bg-slate-50 text-slate-400 dark:bg-slate-900 dark:text-slate-600'
              }`}>
                {counts[tab.key] || 0}
              </span>
              {isActive && (
                <div className="absolute bottom-0 left-2 right-2 h-[2px] bg-purple-650 dark:bg-purple-400 rounded-full" />
              )}
            </button>
          );
        })}
      </div>

      {/* ─── Main Layout ─── */}
      <div>
        <div>
          {error && (
            <div className="mb-4 p-[1.5px] rounded-[1.5rem] bg-rose-50/50 dark:bg-rose-955/20 border border-rose-100 dark:border-rose-900/30">
              <div className="bg-white dark:bg-slate-900 rounded-[calc(1.5rem-1.5px)] p-4 text-xs font-semibold text-rose-600 dark:text-rose-455">
                {error}
              </div>
            </div>
          )}

          {loading ? (
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {[0, 1, 2, 3].map(i => (
                <div key={i} className="p-2 rounded-[2rem] bg-slate-50/50 dark:bg-slate-900/50 border border-slate-100/60 dark:border-slate-800/40 animate-pulse h-[390px]">
                  <div className="bg-white dark:bg-slate-950 rounded-[calc(2rem-8px)] h-full p-5 flex flex-col border border-slate-100/50 dark:border-slate-850/50">
                    <div className="aspect-[16/10] bg-slate-100 dark:bg-slate-900 rounded-[calc(2rem-12px)] mb-4" />
                    <div className="h-3 w-16 bg-slate-100 dark:bg-slate-900 rounded mb-2.5" />
                    <div className="h-4 w-3/4 bg-slate-100 dark:bg-slate-900 rounded mb-6" />
                    <div className="grid grid-cols-3 gap-2 py-2 border-t border-b border-slate-100/50 dark:border-slate-900/40 mb-6">
                      <div className="h-3 bg-slate-100 dark:bg-slate-900 rounded" />
                      <div className="h-3 bg-slate-100 dark:bg-slate-900 rounded" />
                      <div className="h-3 bg-slate-100 dark:bg-slate-900 rounded" />
                    </div>
                    <div className="h-3 w-1/4 bg-slate-100 dark:bg-slate-900 rounded mb-2" />
                    <div className="h-1 bg-slate-100 dark:bg-slate-900 rounded-full mb-6" />
                    <div className="mt-auto grid grid-cols-4 gap-2">
                      <div className="h-8 bg-slate-100 dark:bg-slate-900 rounded-full col-span-3" />
                      <div className="h-8 bg-slate-100 dark:bg-slate-900 rounded-full col-span-1" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : filtered.length > 0 ? (
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {filtered.map(enrollment => {
                const course = getCourse(enrollment);
                const progress = clamp(enrollment.progress);
                const certificate = enrollment.status === 'completed'
                  ? certificates.find(c => getCertificateCourseId(c) === getCourseId(course))
                  : null;
                return (
                  <CourseProgressCard
                    key={enrollment.id}
                    title={course.title}
                    thumbnail={course.thumbnail}
                    category={course.category}
                    instructorName={course.instructorName}
                    progress={progress}
                    totalLessons={course.lessonCount || 0}
                    startedAt={enrollment.ngayTao || enrollment.createdAt || course.startDate}
                    endDate={course.endDate}
                    onContinue={() => navigate(`/learn/${course.id}`)}
                    onDetail={() => navigate(`/course/${course.id}`)}
                    onViewCertificate={() => {
                      setSelectedCertificate({
                        ...certificate,
                        studentName: certificate?.studentName || user?.name || user?.email,
                        courseTitle: certificate?.courseTitle || course.title,
                        instructorName: certificate?.instructorName || course.instructorName,
                      });
                    }}
                  />
                );
              })}
            </div>
          ) : (
            <EmptyState tab={activeTab} onExplore={() => navigate('/explore')} />
          )}
        </div>
      </div>
      {selectedCertificate && (
        <CertificateModal
          certificate={selectedCertificate}
          onClose={() => setSelectedCertificate(null)}
        />
      )}
    </div>
  );
};

// ─── EmptyState ───────────────────────────────────────────────────────────────

const EMPTY_META = {
  active: {
    icon: (
      <svg className="w-12 h-12 text-purple-400 dark:text-purple-500/60 mb-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <polygon points="10 8 16 12 10 16 10 8" />
      </svg>
    ),
    title: 'Chưa có khóa học đang học',
    desc: 'Đăng ký một khóa học và bắt đầu học ngay hôm nay!',
  },
  upcoming: {
    icon: (
      <svg className="w-12 h-12 text-purple-400 dark:text-purple-500/60 mb-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
        <line x1="16" y1="2" x2="16" y2="6" />
        <line x1="8" y1="2" x2="8" y2="6" />
        <line x1="3" y1="10" x2="21" y2="10" />
      </svg>
    ),
    title: 'Không có khóa học sắp tới',
    desc: 'Các khóa học bạn đã đăng ký nhưng chưa khai giảng sẽ xuất hiện tại đây.',
  },
  completed: {
    icon: (
      <svg className="w-12 h-12 text-purple-400 dark:text-purple-500/60 mb-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
      </svg>
    ),
    title: 'Chưa hoàn thành khóa học nào',
    desc: 'Tiếp tục học để đạt 100% và nhận chứng chỉ!',
  },
};

const EmptyState = ({ tab, onExplore }) => {
  const meta = EMPTY_META[tab] || EMPTY_META.active;
  return (
    <div className="p-2 rounded-[2rem] bg-slate-50/50 dark:bg-slate-900/50 border border-slate-100/60 dark:border-slate-800/40 max-w-lg mx-auto mt-8 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.01)]">
      <div className="bg-white dark:bg-slate-950 rounded-[calc(2rem-8px)] px-6 py-12 text-center border border-slate-100/50 dark:border-slate-850/50 flex flex-col items-center justify-center">
        {meta.icon}
        <h3 className="mb-2 text-base font-semibold text-slate-800 dark:text-slate-200">{meta.title}</h3>
        <p className="mb-6 max-w-xs text-xs text-slate-500 dark:text-slate-550 font-normal leading-relaxed">{meta.desc}</p>
        {(tab === 'active' || tab === 'upcoming') && (
          <button
            onClick={onExplore}
            className="inline-flex items-center gap-2 rounded-full bg-purple-600 hover:bg-purple-755 text-white transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] hover:scale-[1.02] active:scale-[0.98] px-5 py-2.5 text-xs font-medium shadow-sm shadow-purple-100 dark:shadow-none cursor-pointer"
          >
            <Compass className="h-3.5 w-3.5" strokeWidth={1.5} />
            <span>Khám phá khóa học</span>
          </button>
        )}
      </div>
    </div>
  );
};

export default MyLearning;
