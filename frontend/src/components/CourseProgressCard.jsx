import { useState } from 'react';
import { Award, BookOpen, CalendarDays, Info, Play, Trophy } from 'lucide-react';
import { getFileUrl } from '../utils/fileUtils';

const formatDate = (value) =>
  value
    ? new Intl.DateTimeFormat('vi-VN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      }).format(new Date(value))
    : 'Không giới hạn';

const CourseDate = ({ label, value }) => (
  <div>
    <span className="flex items-center gap-1 text-slate-400">
      <CalendarDays className="h-3 w-3" />
      {label}
    </span>
    <span className="mt-0.5 block font-medium text-slate-700">{formatDate(value)}</span>
  </div>
);

export default function CourseProgressCard({
  title,
  thumbnail,
  category,
  instructorName,
  progress = 0,
  totalLessons = 0,
  startedAt,
  endDate,
  onContinue,
  onDetail,
  onViewCertificate,
}) {
  const [imageError, setImageError] = useState(false);
  const clampedProgress = Math.min(100, Math.max(0, Math.round(progress)));
  const isCompleted = clampedProgress >= 100;

  const showImage = thumbnail && !imageError;

  return (
    <div className="group flex flex-col rounded-xl border border-slate-100 bg-white p-3 transition hover:-translate-y-1 hover:shadow-md">
      {/* Thumbnail */}
      <div className="relative mb-3 aspect-video overflow-hidden rounded-xl bg-gradient-to-br from-purple-200 to-violet-300">
        {showImage ? (
          <img
            src={getFileUrl(thumbnail)}
            alt={title}
            onError={() => setImageError(true)}
            className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <BookOpen className="h-10 w-10 text-purple-500" />
          </div>
        )}
        <div className="absolute bottom-2 left-2 right-2 flex items-center gap-2 text-xs text-white">
          <Play className="h-3 w-3 fill-white" />
          <div className="h-1 flex-1 overflow-hidden rounded-full bg-white/30">
            <div className="h-full rounded-full bg-white" style={{ width: `${clampedProgress}%` }} />
          </div>
          <span>{clampedProgress}%</span>
        </div>
      </div>

      {/* Info */}
      <p className="mb-1 text-xs text-slate-400">
        {category || 'Khóa học'} · {totalLessons} bài học
      </p>
      <p className="line-clamp-2 text-sm font-medium text-slate-900 group-hover:text-purple-600 transition-colors" title={title}>
        {title}
      </p>
      <p className="mt-1 truncate text-xs text-slate-400">{instructorName || 'Giảng viên'}</p>

      {/* Main Progress Bar */}
      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-slate-100">
        <div className="h-full rounded-full bg-purple-600" style={{ width: `${clampedProgress}%` }} />
      </div>

      {/* Dates */}
      <div className="mt-3 grid grid-cols-2 gap-2 text-[11px] text-slate-500">
        <CourseDate label="Bắt đầu" value={startedAt} />
        <CourseDate label="Kết thúc" value={endDate} />
      </div>

      {/* Actions */}
      <div className="mt-4 flex flex-col gap-2 pt-3 border-t border-slate-55">
        {isCompleted ? (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onViewCertificate && onViewCertificate();
            }}
            className="flex w-full items-center justify-center gap-1.5 rounded-xl bg-emerald-600 px-3 py-2 text-xs font-semibold text-white shadow-md shadow-emerald-100 transition hover:bg-emerald-700"
          >
            <Award className="h-3.5 w-3.5" />
            Nhận/Xem chứng chỉ
          </button>
        ) : (
          <div className="text-center text-[11px] font-medium text-slate-400 bg-slate-50 py-1.5 rounded-lg border border-slate-100/70">
            Chưa đủ điều kiện nhận chứng chỉ
          </div>
        )}

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onContinue && onContinue();
            }}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-purple-600 px-3 py-2 text-xs font-semibold text-white shadow-md shadow-purple-100 transition hover:bg-purple-700"
          >
            {isCompleted ? <Trophy className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
            {isCompleted ? 'Ôn tập' : 'Tiếp tục học'}
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onDetail && onDetail();
            }}
            className="flex items-center justify-center gap-1 rounded-xl border border-slate-200 px-3 py-2 text-xs font-medium text-slate-600 transition hover:border-purple-200 hover:bg-purple-50 hover:text-purple-700"
          >
            <Info className="h-3.5 w-3.5" />
            Chi tiết
          </button>
        </div>
      </div>
    </div>
  );
}
