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
    <div className="p-1.5 rounded-[2rem] bg-slate-50/50 dark:bg-slate-900/50 border border-slate-100/60 dark:border-slate-800/40 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.02)] hover:shadow-[0_8px_30px_-6px_rgba(139,92,246,0.06)] hover:border-purple-200/50 dark:hover:border-purple-900/30 transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] hover:-translate-y-1 group h-full">
      <article className="bg-white dark:bg-slate-950 rounded-[calc(2rem-6px)] h-full flex flex-col overflow-hidden border border-slate-100/50 dark:border-slate-850/50">
        {/* Thumbnail Bezel Nested */}
        <div className="relative aspect-[16/10] overflow-hidden rounded-[calc(2rem-10px)] m-1.5 bg-slate-50 dark:bg-slate-900 border border-slate-100/30 dark:border-slate-800/20">
          {showImage ? (
            <img
              src={getFileUrl(thumbnail)}
              alt={title}
              onError={() => setImageError(true)}
              className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
            />
          ) : (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-tr from-purple-50 to-indigo-50/50 dark:from-purple-950/10 dark:to-slate-950/20">
              <BookOpen className="h-8 w-8 text-purple-500/60 dark:text-purple-400/40 mb-2" strokeWidth={1.2} />
              <span className="text-[8.5px] uppercase tracking-[0.15em] font-mono text-purple-650 dark:text-purple-400 bg-purple-500/5 px-2 py-0.5 rounded border border-purple-500/10">
                {category || 'Khóa học'}
              </span>
            </div>
          )}
          
          {/* Category Tag */}
          <span className="absolute left-3 top-3 rounded-md bg-white/95 dark:bg-slate-900/95 border border-slate-100/40 dark:border-slate-800/40 px-2 py-0.5 text-[8.5px] font-mono tracking-widest uppercase text-slate-650 dark:text-slate-350 shadow-sm backdrop-blur-sm">
            {category || 'Chung'}
          </span>

          {/* Progress bar on thumbnail */}
          <div className="absolute bottom-2 left-2 right-2 flex items-center gap-2 text-[10px] text-white bg-black/45 backdrop-blur-md px-2.5 py-1 rounded-lg">
            <Play className="h-2.5 w-2.5 fill-white" />
            <div className="h-0.5 flex-1 overflow-hidden rounded-full bg-white/30">
              <div className="h-full rounded-full bg-white" style={{ width: `${clampedProgress}%` }} />
            </div>
            <span className="font-mono">{clampedProgress}%</span>
          </div>
        </div>

        {/* Info */}
        <div className="flex flex-1 flex-col px-4.5 py-5 pt-3">
          <p className="mb-1 text-[9px] uppercase tracking-[0.12em] font-medium text-purple-650 dark:text-purple-400">
            {instructorName || 'Giảng viên'}
          </p>
          <h4 className="mb-3 line-clamp-2 text-sm font-semibold text-slate-800 dark:text-slate-200 leading-snug group-hover:text-purple-600 transition-colors" title={title}>
            {title}
          </h4>

          {/* Metadata */}
          <div className="mb-4 grid grid-cols-2 gap-2 border-t border-b border-slate-50/50 dark:border-slate-900/40 py-2.5 my-3 text-[10.5px] text-slate-400 dark:text-slate-500 font-medium">
            <span className="flex items-center gap-1.5">
              <BookOpen className="h-3.5 w-3.5 text-slate-355 dark:text-slate-600" strokeWidth={1.5} />
              {totalLessons} bài học
            </span>
            <span className="flex items-center gap-1.5 justify-end">
              <Award className="h-3.5 w-3.5 text-slate-355 dark:text-slate-600" strokeWidth={1.5} />
              {clampedProgress}% hoàn thành
            </span>
          </div>

          {/* Main Progress Bar */}
          <div className="mb-2 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 font-medium">
            <span>Tiến độ học tập</span>
            <span className="font-semibold text-slate-700 dark:text-slate-300">{clampedProgress}%</span>
          </div>
          <div className="mb-3.5 h-1 bg-slate-100 dark:bg-slate-900 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full ${progressColor} transition-all duration-700`}
              style={{ width: `${clampedProgress}%` }}
            />
          </div>

          {/* Dates */}
          <div className="grid grid-cols-2 gap-2 text-[9.5px] text-slate-400 dark:text-slate-500 font-mono font-medium mt-1 mb-4">
            <div>
              <span className="flex items-center gap-1 text-slate-400 dark:text-slate-600">
                <CalendarDays className="h-3 w-3" strokeWidth={1.5} />
                Bắt đầu:
              </span>
              <span className="mt-0.5 block font-semibold text-slate-600 dark:text-slate-400">{formatDate(startedAt)}</span>
            </div>
            <div>
              <span className="flex items-center gap-1 text-slate-400 dark:text-slate-600">
                <CalendarDays className="h-3 w-3" strokeWidth={1.5} />
                Kết thúc:
              </span>
              <span className="mt-0.5 block font-semibold text-slate-600 dark:text-slate-400">{formatDate(endDate)}</span>
            </div>
          </div>

          {/* Actions */}
          <div className="mt-auto flex flex-col gap-2">
            {isCompleted ? (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onViewCertificate && onViewCertificate();
                }}
                className="flex w-full items-center justify-center gap-1.5 rounded-full bg-emerald-600 hover:bg-emerald-750 text-white px-3 py-2 text-xs font-medium shadow-sm hover:scale-[1.02] active:scale-[0.98] transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] cursor-pointer"
              >
                <Award className="h-3.5 w-3.5" strokeWidth={1.5} />
                <span>Xem chứng chỉ</span>
              </button>
            ) : (
              <div className="text-center text-[8.5px] font-mono tracking-widest text-slate-400 dark:text-slate-550 bg-slate-50/50 dark:bg-slate-900/30 py-2.5 rounded-xl border border-slate-100/50 dark:border-slate-800/35 uppercase">
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
                className="flex flex-1 items-center justify-center gap-1.5 rounded-full bg-purple-600 hover:bg-purple-755 text-white px-3 py-2.5 text-xs font-medium shadow-sm hover:scale-[1.02] active:scale-[0.98] transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] cursor-pointer"
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
                className="flex items-center justify-center gap-1.5 rounded-full border border-slate-200 dark:border-slate-800 px-3 py-2.5 text-xs font-medium text-slate-650 dark:text-slate-400 hover:border-purple-200 hover:bg-purple-50/30 hover:text-purple-750 hover:scale-[1.02] active:scale-[0.98] transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] cursor-pointer"
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
