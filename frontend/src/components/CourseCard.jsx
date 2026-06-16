import { Bookmark, BookmarkCheck, Star, Users } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { getFileUrl } from '../utils/fileUtils';
import { useAuth } from '../context/AuthContext';
import { useSavedCourses } from '../context/SavedCoursesContext';

export default function CourseCard({ course, showSaveButton = false }) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isSaved, saveCourse, removeCourse } = useSavedCourses();

  let meta = {};
  if (course.description) {
    try {
      meta = JSON.parse(course.description);
    } catch {
      meta = {};
    }
  }

  const instructorName = course.instructor?.name || course.instructorName || 'Giảng viên';
  const lessonsCount = course._count?.lessons ?? course.lessonCount ?? course.totalLessons ?? 0;
  const enrollmentsCount = course._count?.enrollments ?? course.studentCount ?? course.enrollments ?? course.students ?? 0;
  const averageRating = Number(course.averageRating || course.rating || 0);
  const reviewCount = Number(course.reviewCount || course.reviews || 0);
  const category = course.category || meta.category || 'Chung';
  const saved = isSaved(course.id);

  const formatNumber = (num) => {
    if (!num) return 0;
    return num >= 1000 ? `${(num / 1000).toFixed(1)}k` : num;
  };

  const handleSaveToggle = async (e) => {
    e.stopPropagation();
    if (!user) {
      navigate('/login');
      return;
    }
    if (saved) {
      await removeCourse(course.id);
    } else {
      await saveCourse(course.id);
    }
  };

  return (
    <div
      onClick={() => navigate(`/course/${course.id}`)}
      className="cursor-pointer rounded-2xl border border-slate-100 bg-white p-5 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg"
    >
      <div
        className={`relative mb-4 flex aspect-video items-center justify-center overflow-hidden rounded-xl bg-gradient-to-br ${
          meta.gradient || 'from-slate-200 to-slate-300'
        }`}
      >
        {course.thumbnail ? (
          <img src={getFileUrl(course.thumbnail)} alt={course.title} className="h-full w-full object-cover" />
        ) : (
          <div className="text-6xl">{meta.icon || '📚'}</div>
        )}
        <span className="absolute left-2 top-2 rounded-full bg-white/90 px-2 py-1 text-[10px] font-medium text-slate-700">
          {category}
        </span>
        {meta.badge ? (
          <span
            className={`absolute right-2 top-2 rounded-full px-2 py-1 text-[10px] font-medium text-white ${
              meta.badgeColor || 'bg-purple-600'
            }`}
          >
            {meta.badge}
          </span>
        ) : null}

        {/* Nút Lưu — chỉ hiện khi showSaveButton=true */}
        {showSaveButton && (
          <button
            onClick={handleSaveToggle}
            title={saved ? 'Bỏ lưu' : 'Lưu khóa học'}
            className={`absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-full shadow-md transition-all duration-200 ${
              saved
                ? 'bg-purple-600 text-white hover:bg-purple-700'
                : 'bg-white/90 text-slate-500 hover:bg-white hover:text-purple-600'
            } ${meta.badge ? 'top-10' : ''}`}
          >
            {saved ? (
              <BookmarkCheck className="h-4 w-4" />
            ) : (
              <Bookmark className="h-4 w-4" />
            )}
          </button>
        )}
      </div>

      <p className="mb-1 text-xs text-slate-400">
        {instructorName} · {lessonsCount} bài học
      </p>
      <h4 className="mb-3 truncate text-sm font-medium text-slate-900" title={course.title}>
        {course.title}
      </h4>

      <div className="mb-3 flex items-center justify-between text-xs text-slate-500">
        <span className="inline-flex items-center gap-1">
          <Star className="h-3.5 w-3.5 text-amber-500" />
          {reviewCount > 0 ? `${averageRating.toFixed(1)} (${reviewCount})` : 'Chưa có đánh giá'}
        </span>
        <span className="inline-flex items-center gap-1">
          <Users className="h-3.5 w-3.5" />
          {formatNumber(enrollmentsCount)} học viên
        </span>
      </div>

      <button className="pointer-events-none w-full rounded-lg bg-purple-50 py-2 text-xs font-medium text-purple-700 transition-colors hover:bg-purple-100">
        Xem khóa học
      </button>
    </div>
  );
}

export function CourseSkeleton() {
  return (
    <div className="animate-pulse rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
      <div className="relative mb-4 aspect-video overflow-hidden rounded-xl bg-slate-200"></div>
      <div className="mb-2 h-3 w-1/2 rounded bg-slate-200"></div>
      <div className="mb-4 h-4 w-3/4 rounded bg-slate-200"></div>
      <div className="mb-4 flex justify-between">
        <div className="h-3 w-1/4 rounded bg-slate-200"></div>
        <div className="h-3 w-1/4 rounded bg-slate-200"></div>
      </div>
      <div className="h-8 w-full rounded-lg bg-slate-200"></div>
    </div>
  );
}
