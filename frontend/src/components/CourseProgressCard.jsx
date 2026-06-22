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

  const progressColor = isCompleted
    ? 'bg-emerald-500'
    : clampedProgress >= 60
    ? 'bg-purple-600 dark:bg-purple-500'
    : clampedProgress >= 30
    ? 'bg-purple-500 dark:bg-purple-400'
    : 'bg-slate-300 dark:bg-slate-700';

  return (
    <div className="group h-full rounded-2xl border border-slate-100 bg-white shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:border-purple-200/70 hover:shadow-md dark:border-slate-800 dark:bg-slate-950 dark:hover:border-purple-900/40">
      <article className="flex h-full flex-col overflow-hidden rounded-2xl">
        {/* Thumbnail Bezel Nested */}
        <div className="relative m-2 aspect-[16/8] overflow-hidden rounded-xl bg-slate-50 dark:bg-slate-900">
          {showImage ? (
            <img
              src={getFileUrl(thumbnail)}
              alt={title}
              onError={() => setImageError(true)}
              className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.03]"
            />
          ) : (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-tr from-purple-50 to-indigo-50/50 dark:from-purple-950/10 dark:to-slate-950/20">
              <BookOpen className="mb-1.5 h-7 w-7 text-purple-500/60 dark:text-purple-400/40" strokeWidth={1.2} />
              <span className="text-[8.5px] uppercase tracking-[0.15em] font-mono text-purple-650 dark:text-purple-400 bg-purple-500/5 px-2 py-0.5 rounded border border-purple-500/10">
                {category || 'Khóa học'}
              </span>
            </div>
          )}
          
          {/* Category Tag */}
          <span className="absolute left-2.5 top-2.5 rounded-md border border-slate-100/40 bg-white/95 px-2 py-0.5 text-[8px] font-mono uppercase tracking-widest text-slate-650 shadow-sm backdrop-blur-sm dark:border-slate-800/40 dark:bg-slate-900/95 dark:text-slate-350">
            {category || 'Chung'}
          </span>

          {/* Progress bar on thumbnail */}
          <div className="absolute bottom-2 left-2 right-2 flex items-center gap-2 rounded-md bg-black/45 px-2 py-0.5 text-[9px] text-white backdrop-blur-md">
            <Play className="h-2.5 w-2.5 fill-white" />
            <div className="h-0.5 flex-1 overflow-hidden rounded-full bg-white/30">
              <div className="h-full rounded-full bg-white" style={{ width: `${clampedProgress}%` }} />
            </div>
            <span className="font-mono">{clampedProgress}%</span>
          </div>
        </div>

        {/* Info */}
        <div className="flex flex-1 flex-col px-3.5 pb-3.5 pt-1">
          <p className="mb-1 text-[9px] uppercase tracking-[0.12em] font-medium text-purple-650 dark:text-purple-400">
            {instructorName || 'Giảng viên'}
          </p>
          <h4 className="mb-2 line-clamp-2 min-h-[2.35rem] text-[13px] font-semibold leading-snug text-slate-800 transition-colors group-hover:text-purple-600 dark:text-slate-200" title={title}>
            {title}
          </h4>

          {/* Metadata */}
          <div className="mb-3 flex items-center justify-between gap-2 border-y border-slate-50/80 py-2 text-[10px] font-medium text-slate-400 dark:border-slate-900/50 dark:text-slate-500">
            <span className="flex items-center gap-1.5">
              <BookOpen className="h-3 w-3 text-slate-355 dark:text-slate-600" strokeWidth={1.5} />
              {totalLessons} bài học
            </span>
            <span className="flex items-center justify-end gap-1.5">
              <Award className="h-3 w-3 text-slate-355 dark:text-slate-600" strokeWidth={1.5} />
              {clampedProgress}% hoàn thành
            </span>
          </div>

          {/* Main Progress Bar */}
          <div className="mb-1.5 flex items-center justify-between text-[10.5px] font-medium text-slate-500 dark:text-slate-400">
            <span>Tiến độ học tập</span>
            <span className="font-semibold text-slate-700 dark:text-slate-300">{clampedProgress}%</span>
          </div>
          <div className="mb-3 h-1 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-900">
            <div
              className={`h-full rounded-full ${progressColor} transition-all duration-700`}
              style={{ width: `${clampedProgress}%` }}
            />
          </div>

          {/* Dates */}
          <div className="mb-3 grid grid-cols-2 gap-2 text-[9px] font-mono font-medium text-slate-400 dark:text-slate-500">
            <div>
              <span className="flex items-center gap-1 text-slate-400 dark:text-slate-600">
                <CalendarDays className="h-2.5 w-2.5" strokeWidth={1.5} />
                Bắt đầu:
              </span>
              <span className="mt-0.5 block font-semibold text-slate-600 dark:text-slate-400">{formatDate(startedAt)}</span>
            </div>
            <div>
              <span className="flex items-center gap-1 text-slate-400 dark:text-slate-600">
                <CalendarDays className="h-2.5 w-2.5" strokeWidth={1.5} />
                Kết thúc:
              </span>
              <span className="mt-0.5 block font-semibold text-slate-600 dark:text-slate-400">{formatDate(endDate)}</span>
            </div>
          </div>

          {/* Actions */}
          <div className="mt-auto">
            {isCompleted ? (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onViewCertificate && onViewCertificate();
                }}
                className="mb-2 flex w-full items-center justify-center gap-1.5 rounded-full bg-emerald-600 px-3 py-2 text-xs font-medium text-white shadow-sm transition-all duration-300 hover:bg-emerald-750 active:scale-[0.98]"
              >
                <Award className="h-3.5 w-3.5" strokeWidth={1.5} />
                <span>Xem chứng chỉ</span>
              </button>
            ) : (
              <div className="mb-2 text-center text-[8px] font-mono uppercase tracking-wider text-slate-400 dark:text-slate-550">
                Chưa đủ ĐK nhận chứng chỉ
              </div>
            )}

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onContinue && onContinue();
                }}
                className="flex flex-1 items-center justify-center gap-1.5 rounded-full bg-purple-600 px-3 py-2 text-xs font-medium text-white shadow-sm transition-all duration-300 hover:bg-purple-755 active:scale-[0.98]"
              >
                {isCompleted ? <Trophy className="h-3.5 w-3.5" strokeWidth={1.5} /> : <Play className="h-3.5 w-3.5" strokeWidth={1.5} />}
                <span>{isCompleted ? 'Ôn tập' : 'Học tiếp'}</span>
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onDetail && onDetail();
                }}
                className="flex items-center justify-center gap-1.5 rounded-full border border-slate-200 px-3 py-2 text-xs font-medium text-slate-650 transition-all duration-300 hover:border-purple-200 hover:bg-purple-50/30 hover:text-purple-750 active:scale-[0.98] dark:border-slate-800 dark:text-slate-400"
              >
                <Info className="h-3.5 w-3.5" strokeWidth={1.5} />
                <span>Chi tiết</span>
              </button>
            </div>
          </div>
        </div>
      </article>
    </div>
  );
}
