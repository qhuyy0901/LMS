import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import {
  BookOpen,
  CheckCircle2,
  Clock,
  Compass,
  Play,
  Plus,
  Trophy,
  Users,
  Info,
  Award,
} from 'lucide-react';
import { getFileUrl } from '../utils/fileUtils';
import { useAuth } from '../context/AuthContext';

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
            className="inline-flex items-center justify-center gap-2 rounded-full bg-violet-600 px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-violet-200 transition hover:bg-violet-700"
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
                  ? 'border-b-2 border-violet-600 text-violet-700'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              {tab.label}
              <span className={`rounded-full px-1.5 py-0.5 text-[11px] font-semibold ${
                isActive ? 'bg-violet-100 text-violet-700' : 'bg-slate-100 text-slate-500'
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
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {[0, 1, 2, 3].map(i => (
                <div key={i} className="h-72 animate-pulse rounded-2xl bg-slate-100" />
              ))}
            </div>
          ) : filtered.length > 0 ? (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {filtered.map(enrollment => {
                const course = getCourse(enrollment);
                const certificate = certificates.find(c => c.course?.id === course.id);
                return (
                  <CourseCard
                    key={enrollment.id}
                    enrollment={enrollment}
                    certificate={certificate}
                    onViewCertificate={() => setSelectedCertificate({
                      ...certificate,
                      studentName: user?.name || user?.email,
                      courseTitle: course.title,
                    })}
                    onContinue={() => navigate(`/learn/${course.id}`)}
                    onDetail={() => navigate(`/course/${course.id}`)}
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


// ─── CourseCard ───────────────────────────────────────────────────────────────

const CourseCard = ({ enrollment, certificate, onContinue, onDetail, onViewCertificate }) => {
  const course = getCourse(enrollment);
  const progress = clamp(enrollment.progress);
  const status = STATUS_META[enrollment.status] || STATUS_META.active;

  const lessonsDone = Math.round((progress / 100) * (course.lessonCount || 0));
  const lastStudied = enrollment.updatedAt ? dateFmt.format(new Date(enrollment.updatedAt)) : null;

  const progressColor = progress >= 100 ? 'from-emerald-400 to-teal-500'
    : progress >= 60 ? 'from-violet-500 to-indigo-500'
    : progress >= 30 ? 'from-violet-400 to-pink-400'
    : 'from-slate-300 to-slate-400';

  return (
    <article className="group flex flex-col rounded-2xl border border-slate-100 bg-white shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-violet-100 hover:shadow-xl">
      {/* Thumbnail */}
      <div className="relative aspect-video overflow-hidden rounded-t-2xl bg-gradient-to-br from-violet-100 to-pink-100">
        {course.thumbnail ? (
          <img
            src={getFileUrl(course.thumbnail)}
            alt={course.title}
            className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <BookOpen className="h-12 w-12 text-violet-300" />
          </div>
        )}
        {/* Category badge */}
        <span className="absolute left-2 top-2 rounded-full bg-white/90 px-2.5 py-1 text-[10px] font-semibold text-slate-700 shadow-sm backdrop-blur-sm">
          {course.category || 'Chung'}
        </span>
        {/* Status badge */}
        <span className={`absolute right-2 top-2 rounded-full px-2.5 py-1 text-[10px] font-bold shadow-sm ${status.color}`}>
          {status.label}
        </span>
        {/* Progress overlay */}
        <div className="absolute bottom-0 left-0 right-0 h-1">
          <div
            className={`h-full rounded-br-none bg-gradient-to-r ${progressColor} transition-all duration-700`}
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Body */}
      <div className="flex flex-1 flex-col p-4">
        <p className="mb-0.5 text-[11px] font-medium text-violet-600">{course.instructorName || 'Giảng viên'}</p>
        <h4 className="mb-3 line-clamp-2 text-sm font-semibold text-slate-900 leading-snug" title={course.title}>
          {course.title}
        </h4>

        {/* Meta */}
        <div className="mb-3 flex items-center gap-3 text-[11px] text-slate-500">
          <span className="flex items-center gap-1">
            <Users className="h-3 w-3" />
            {numberFmt.format(course.studentCount || course._count?.enrollments || 0)}
          </span>
          <span className="flex items-center gap-1">
            <BookOpen className="h-3 w-3" />
            {lessonsDone}/{course.lessonCount || 0} bài
          </span>
          <span className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {formatDuration(course.totalDurationSeconds)}
          </span>
        </div>

        {/* Progress bar */}
        <div className="mb-1 flex items-center justify-between text-[11px] text-slate-500">
          <span>Tiến độ</span>
          <span className="font-semibold text-slate-700">{progress}%</span>
        </div>
        <div className="mb-3 h-1.5 overflow-hidden rounded-full bg-slate-100">
          <div
            className={`h-full rounded-full bg-gradient-to-r ${progressColor} transition-all duration-700`}
            style={{ width: `${progress}%` }}
          />
        </div>

        {lastStudied && (
          <p className="mb-3 text-[11px] text-slate-400">Học gần nhất: {lastStudied}</p>
        )}

        {/* Actions */}
        <div className="mt-auto flex flex-col gap-2">
          {certificate ? (
            <button
              onClick={e => { e.stopPropagation(); onViewCertificate(); }}
              className="flex w-full items-center justify-center gap-1.5 rounded-xl bg-emerald-600 px-3 py-2 text-xs font-semibold text-white shadow-md shadow-emerald-200 transition hover:bg-emerald-700"
            >
              <Award className="h-3.5 w-3.5" />
              Xem chứng chỉ
            </button>
          ) : (
            <div className="text-center text-[11px] font-medium text-slate-400 bg-slate-50 py-1.5 rounded-lg border border-slate-100/70">
              Chưa đủ điều kiện nhận chứng chỉ
            </div>
          )}

          <div className="flex items-center gap-2">
            <button
              onClick={e => { e.stopPropagation(); onContinue(); }}
              className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-violet-600 px-3 py-2 text-xs font-semibold text-white shadow-md shadow-violet-200 transition hover:bg-violet-700"
            >
              {progress >= 100 ? <Trophy className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
              {progress >= 100 ? 'Ôn tập' : 'Tiếp tục học'}
            </button>
            <button
              onClick={e => { e.stopPropagation(); onDetail(); }}
              className="flex items-center justify-center gap-1 rounded-xl border border-slate-200 px-3 py-2 text-xs font-medium text-slate-600 transition hover:border-violet-200 hover:bg-violet-50 hover:text-violet-700"
            >
              <Info className="h-3.5 w-3.5" />
              Chi tiết
            </button>
          </div>
        </div>
      </div>
    </article>
  );
};


// ─── EmptyState ───────────────────────────────────────────────────────────────

const EMPTY_META = {
  active:    { icon: '▶️', title: 'Chưa có khóa học đang học', desc: 'Đăng ký một khóa học và bắt đầu học ngay hôm nay!' },
  upcoming:  { icon: '🗓️', title: 'Không có khóa học sắp tới',  desc: 'Các khóa học bạn đã đăng ký nhưng chưa khai giảng sẽ xuất hiện tại đây.' },
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
          className="inline-flex items-center gap-2 rounded-full bg-violet-600 px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-violet-200 transition hover:bg-violet-700"
        >
          <Compass className="h-4 w-4" />
          Khám phá khóa học
        </button>
      )}
    </div>
  );
};


const CertificateModal = ({ certificate, onClose }) => {
  const issuedDate = certificate.ngayCap || certificate.issuedAt;
  const certNo = certificate.soChungChi || certificate.certificateNo;
  const verifyCode = certificate.maXacThuc || certificate.verifyCode;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-900/70 p-4 backdrop-blur-sm">
      <style>{`
        @media print {
          body * {
            visibility: hidden !important;
          }
          #certificate-print-area, #certificate-print-area * {
            visibility: visible !important;
          }
          #certificate-print-area {
            position: fixed !important;
            left: 0 !important;
            top: 0 !important;
            width: 100vw !important;
            height: 100vh !important;
            margin: 0 !important;
            padding: 2rem !important;
            background: white !important;
            z-index: 99999 !important;
          }
        }
      `}</style>
      <div className="relative w-full max-w-3xl overflow-hidden rounded-2xl bg-white shadow-2xl transition-all">
        {/* Header Actions */}
        <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50 px-6 py-4 print:hidden">
          <h3 className="text-sm font-bold text-slate-950">Chứng chỉ hoàn thành</h3>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 rounded-xl bg-violet-600 px-4 py-2 text-xs font-bold text-white hover:bg-violet-750 shadow transition duration-200"
            >
              In / Tải về
            </button>
            <button
              onClick={onClose}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-slate-500 hover:bg-slate-50 hover:text-slate-700 transition text-xs font-semibold"
            >
              Đóng
            </button>
          </div>
        </div>

        {/* Certificate Display Area */}
        <div id="certificate-print-area" className="relative bg-white p-8 md:p-12 text-center select-none">
          {/* Certificate Frame/Border */}
          <div className="relative border-[12px] border-double border-amber-800 p-8 md:p-12 bg-amber-50/5 overflow-hidden">
            {/* Watermark/Background ornament */}
            <div className="absolute inset-0 flex items-center justify-center opacity-5 pointer-events-none">
              <Trophy className="w-[300px] h-[300px] text-amber-800" />
            </div>

            {/* Content */}
            <header className="mb-6 flex flex-col items-center">
              <div className="mb-2 h-1 w-20 bg-amber-800" />
              <p className="text-[10px] font-black uppercase tracking-[0.25em] text-amber-800">Skillio E-Learning Platform</p>
              <h2 className="mt-4 font-serif text-3xl font-bold tracking-wide text-slate-900 md:text-4xl">
                CHỨNG CHỈ HOÀN THÀNH
              </h2>
              <div className="mt-2 h-0.5 w-40 bg-amber-800/40" />
            </header>

            <main className="my-8">
              <p className="font-serif italic text-sm text-slate-500">Hệ thống đào tạo trực tuyến Skillio trân trọng chứng nhận:</p>
              <h3 className="my-5 font-serif text-2xl font-black text-amber-900 md:text-3xl tracking-wide uppercase">
                {certificate.studentName || 'Học viên'}
              </h3>
              <p className="font-serif italic text-sm text-slate-500">Đã hoàn thành xuất sắc khóa học:</p>
              <h4 className="my-4 text-base font-bold text-slate-900 md:text-lg max-w-xl mx-auto leading-relaxed">
                {certificate.courseTitle}
              </h4>
              <p className="text-xs text-slate-500 mt-8 font-medium">
                Cấp ngày: <span className="font-semibold text-slate-700">{dateFmt.format(new Date(issuedDate))}</span>
              </p>
            </main>

            <footer className="mt-12 flex flex-col justify-between gap-6 border-t border-slate-100 pt-6 text-[10px] text-slate-400 font-medium md:flex-row md:items-end">
              <div className="text-left space-y-1">
                <p>Mã chứng chỉ: <span className="font-semibold text-slate-600 uppercase">{certNo}</span></p>
                <p>Mã xác thực: <span className="font-semibold text-slate-500">{verifyCode || 'N/A'}</span></p>
              </div>
              <div className="text-right space-y-2 flex flex-col items-end print:hidden">
                <p className="text-amber-800 font-bold uppercase tracking-widest text-[9px]">Hệ thống Skillio</p>
                <div className="w-24 h-1 border-t border-slate-200"></div>
                <p className="text-slate-400 text-[8px]">Ban điều hành đào tạo</p>
              </div>
            </footer>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MyLearning;
