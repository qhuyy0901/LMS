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

const formatDuration = (seconds = 0) => {
  const total = Number(seconds || 0);
  if (total <= 0) return '—';
  const h = Math.floor(total / 3600);
  const m = Math.round((total % 3600) / 60);
  if (h <= 0) return `${m} phút`;
  return m > 0 ? `${h}g ${m}p` : `${h} giờ`;
};

const getCourse = (e) => e?.course || {};
const getCourseId = (course) => course?.id || course?.Id;
const getCourseTitle = (course) => course?.title || course?.tieuDe || course?.TieuDe;
const getCertificateCourseId = (certificate) => certificate?.course?.id || certificate?.course?.Id;

const getCertificateNo = (certificate) => certificate?.soChungChi || certificate?.certificateNo || certificate?.SoChungChi;
const getCertificateIssuedAt = (certificate) => certificate?.ngayCap || certificate?.issuedAt || certificate?.NgayCap;
const getCertificatePdfUrl = (certificate) => certificate?.pdfUrl || certificate?.PdfUrl;

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

const STATUS_META = {
  active:    { label: 'Đang học',      color: 'bg-violet-600 text-white' },
  upcoming:  { label: 'Sắp bắt đầu',  color: 'bg-amber-500 text-white' },
  completed: { label: 'Hoàn thành',   color: 'bg-emerald-500 text-white' },
};


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
    <div className="animate-fade-in-up pb-24">
      {/* ─── Header ─── */}
      <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="mb-1 text-2xl font-bold tracking-tight text-slate-900 md:text-3xl">
            🎓 Học tập của tôi
          </h1>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <button
            onClick={() => navigate('/explore')}
            className="inline-flex items-center justify-center gap-2 rounded-full bg-purple-600 px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-purple-100 transition hover:bg-purple-700"
          >
            <Plus className="h-4 w-4" />
            Khám phá thêm
          </button>
        </div>
      </div>


      {/* ─── Tabs ─── */}
      <div className="mb-6 flex items-center gap-1 overflow-x-auto border-b border-slate-200 pb-px">
        {TABS.map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex shrink-0 items-center gap-1.5 whitespace-nowrap px-4 py-2.5 text-sm font-medium transition-colors ${
                isActive
                  ? 'border-b-2 border-purple-600 text-purple-700'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              {tab.label}
              <span className={`rounded-full px-1.5 py-0.5 text-[11px] font-semibold ${
                isActive ? 'bg-purple-100 text-purple-700' : 'bg-slate-100 text-slate-500'
              }`}>
                {counts[tab.key] || 0}
              </span>
            </button>
          );
        })}
      </div>

      {/* ─── Main Layout ─── */}
      <div>
        <div>
          {error && (
            <div className="mb-4 rounded-2xl border border-rose-100 bg-rose-50 px-5 py-4 text-sm text-rose-600">
              {error}
            </div>
          )}

          {loading ? (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {[0, 1, 2, 3].map(i => (
                <div key={i} className="h-72 animate-pulse rounded-2xl bg-slate-100" />
              ))}
            </div>
          ) : filtered.length > 0 ? (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {filtered.map(enrollment => {
                const course = getCourse(enrollment);
                const progress = clamp(enrollment.progress);
                const certificate = progress >= 100
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
  active:    { icon: '▶️', title: 'Chưa có khóa học đang học', desc: '' },
  upcoming:  { icon: '🗓️', title: 'Không có khóa học sắp tới',  desc: '' },
  completed: { icon: '🏆', title: 'Chưa hoàn thành khóa học nào', desc: 'Tiếp tục học để đạt 100% và nhận chứng chỉ!' },
};

const EmptyState = ({ tab, onExplore }) => {
  const meta = EMPTY_META[tab] || EMPTY_META.active;
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50/60 px-6 py-16 text-center">
      <div className="mb-3 text-5xl">{meta.icon}</div>
      <h3 className="mb-2 text-base font-bold text-slate-800">{meta.title}</h3>
      <p className="mb-5 max-w-xs text-sm text-slate-500">{meta.desc}</p>
      {(tab === 'active' || tab === 'upcoming') && (
        <button
          onClick={onExplore}
          className="inline-flex items-center gap-2 rounded-full bg-purple-600 px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-purple-100 transition hover:bg-purple-700"
        >
          <Compass className="h-4 w-4" />
          Khám phá khóa học
        </button>
      )}
    </div>
  );
};

export default MyLearning;
