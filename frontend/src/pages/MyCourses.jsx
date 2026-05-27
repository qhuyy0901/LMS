import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import {
  Clock,
  Code2,
  FileText,
  Filter,
  MessageCircle,
  MoreHorizontal,
  Play,
  Plus,
  Sparkles,
  Star,
  Users,
} from 'lucide-react';

const MyCourses = () => {
  const navigate = useNavigate();
  const [enrollments, setEnrollments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchEnrolledCourses = async () => {
      try {
        const response = await axios.get('/api/courses/enrolled');
        setEnrollments(response.data);
      } catch (err) {
        setError(err.response?.data?.message || err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchEnrolledCourses();
  }, []);

  const parseMeta = (description) => {
    try {
      return description ? JSON.parse(description) : {};
    } catch {
      return {};
    }
  };

  return (
    <div className="animate-fade-in-up pb-24">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="mb-1 text-2xl font-semibold tracking-tight text-slate-900 md:text-3xl">
            Khóa học của tôi
          </h1>
          <p className="text-sm text-slate-500">Khám phá và quản lý các khóa học bạn đã đăng ký.</p>
        </div>
        <div className="flex items-center gap-2">
          <button className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50">
            <Filter className="h-4 w-4" />
            Bộ lọc
          </button>
          <button
            onClick={() => navigate('/explore')}
            className="inline-flex items-center gap-2 rounded-full bg-purple-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-purple-700"
          >
            <Plus className="h-4 w-4" />
            Khóa học mới
          </button>
        </div>
      </div>

      <div className="mb-6 flex items-center gap-2 overflow-x-auto whitespace-nowrap border-b border-slate-200">
        <button className="border-b-2 border-purple-600 px-4 py-2.5 text-sm font-medium text-purple-700">
          Tất cả
          <span className="ml-1 rounded-full bg-purple-100 px-2 py-0.5 text-xs text-purple-700">
            {enrollments.length}
          </span>
        </button>
        <button className="px-4 py-2.5 text-sm text-slate-500 transition-colors hover:text-slate-700">
          Đang học
        </button>
        <button className="px-4 py-2.5 text-sm text-slate-500 transition-colors hover:text-slate-700">
          Đã hoàn thành
        </button>
        <button className="px-4 py-2.5 text-sm text-slate-500 transition-colors hover:text-slate-700">
          Yêu thích
        </button>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <div className="space-y-6 animate-fade-in-up xl:col-span-2">
          <div className="relative flex min-h-64 items-center justify-between overflow-hidden rounded-2xl border border-purple-100/50 bg-gradient-to-r from-purple-100 via-purple-50 to-pink-50 p-6 shadow-sm">
            <div className="relative z-10 max-w-md">
              <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-purple-600 px-3 py-1 text-xs font-medium text-white">
                <Sparkles className="h-3 w-3" />
                KHÓA HỌC NỔI BẬT
              </div>
              <h2 className="mb-2 text-xl font-semibold tracking-tight text-purple-900 md:text-2xl">
                Trở thành Product Designer chuyên nghiệp
              </h2>
              <p className="mb-4 text-sm text-slate-600">Lộ trình 6 tháng · 48 bài học · Cấp chứng chỉ</p>
              <button
                onClick={() => navigate('/explore')}
                className="inline-flex items-center gap-2 rounded-full bg-purple-600 px-5 py-2.5 text-sm font-medium text-white transition-all hover:bg-purple-700 hover:shadow-lg hover:shadow-purple-200"
              >
                <Play className="h-4 w-4" />
                Khám phá thêm
              </button>
            </div>
            <div className="relative hidden h-40 w-56 shrink-0 items-center justify-center opacity-90 md:flex">
              <div className="text-7xl">📚</div>
              <div className="absolute right-6 top-2 animate-bounce text-3xl">✨</div>
              <div className="absolute bottom-2 left-2 text-2xl">🎓</div>
            </div>
          </div>

          {loading ? (
            <div className="flex justify-center py-12">
              <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-purple-600"></div>
            </div>
          ) : error ? (
            <div className="rounded-2xl border border-red-100 bg-red-50 py-12 text-center text-red-500">
              {error}
            </div>
          ) : enrollments.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-100 bg-slate-50 py-16 text-center">
              <div className="mb-3 text-4xl">🌱</div>
              <h3 className="mb-1 text-lg font-medium text-slate-900">Chưa có khóa học nào</h3>
              <p className="mb-4 text-sm text-slate-500">
                Bạn chưa đăng ký khóa học nào. Hãy bắt đầu khám phá nhé!
              </p>
              <button
                onClick={() => navigate('/explore')}
                className="inline-flex items-center gap-1 font-medium text-purple-600 hover:underline"
              >
                Đi tới Khám phá
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {enrollments.map(({ id, progress, course }) => {
                const meta = parseMeta(course.description);
                const lessonsCount = course._count?.lessons || 0;
                const enrollmentsCount = course._count?.enrollments || 0;
                const averageRating = Number(course.averageRating || 0);
                const reviewCount = Number(course.reviewCount || 0);

                return (
                  <div
                    key={id}
                    onClick={() => navigate(`/course/${course.id}`)}
                    className="group cursor-pointer rounded-2xl border border-slate-100 bg-white p-5 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg"
                  >
                    <div
                      className={`relative mb-4 flex aspect-video items-center justify-center overflow-hidden rounded-xl bg-gradient-to-br ${
                        meta.gradient || 'from-slate-200 to-slate-300'
                      }`}
                    >
                      {course.thumbnail ? (
                        <img
                          src={course.thumbnail}
                          alt={course.title}
                          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                        />
                      ) : (
                        <div className="text-6xl transition-transform duration-300 group-hover:scale-110">
                          {meta.icon || '📚'}
                        </div>
                      )}
                      <span className="absolute left-2 top-2 rounded-full bg-white/90 px-2 py-1 text-[10px] font-medium text-slate-700 backdrop-blur-sm">
                        {meta.category || 'Chung'}
                      </span>
                      <span className="absolute right-2 top-2 rounded-full bg-purple-600 px-2 py-1 text-[10px] font-medium text-white shadow-sm">
                        Đang học
                      </span>
                    </div>
                    <p className="mb-1 text-xs text-slate-400">{course.instructor?.name || 'Giảng viên'}</p>
                    <h4 className="mb-3 line-clamp-2 text-sm font-medium text-slate-900" title={course.title}>
                      {course.title}
                    </h4>
                    <div className="mb-3 flex items-center justify-between text-xs text-slate-500">
                      <span className="inline-flex items-center gap-1">
                        <Star className="h-3.5 w-3.5 text-amber-500" />
                        {reviewCount > 0 ? `${averageRating.toFixed(1)} (${reviewCount})` : 'Chưa có đánh giá'}
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <Users className="h-3.5 w-3.5" />
                        {enrollmentsCount} học viên
                      </span>
                    </div>
                    <div className="mb-3 flex items-center justify-between text-xs text-slate-500">
                      <span className="inline-flex items-center gap-1">
                        <Clock className="h-3.5 w-3.5" />
                        {lessonsCount} bài học
                      </span>
                      <span className="font-medium text-slate-500">Tiến độ {progress}%</span>
                    </div>
                    <div className="mb-2 h-1.5 overflow-hidden rounded-full bg-slate-100">
                      <div
                        className="h-full rounded-full bg-purple-500 transition-all duration-500"
                        style={{ width: `${progress}%` }}
                      ></div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <div className="rounded-2xl border border-slate-100 bg-white p-6 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg">
            <div className="mb-5 flex items-center justify-between">
              <h3 className="text-xl font-semibold tracking-tight text-slate-900">Bài tập cần hoàn thành</h3>
              <button className="text-sm font-medium text-purple-600 hover:text-purple-700">Xem tất cả</button>
            </div>
            <div className="space-y-3">
              <div className="flex cursor-pointer items-center gap-4 rounded-xl border border-transparent p-3 transition-colors hover:border-slate-100 hover:bg-slate-50">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-orange-100">
                  <FileText className="h-5 w-5 text-orange-600" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-slate-900">Bài tập cuối khóa 1</p>
                  <p className="text-xs text-slate-400">Lập trình · Còn 2 ngày</p>
                </div>
                <span className="rounded-full bg-orange-50 px-3 py-1 text-xs font-medium text-orange-600">
                  Sắp hết hạn
                </span>
              </div>
              <div className="flex cursor-pointer items-center gap-4 rounded-xl border border-transparent p-3 transition-colors hover:border-slate-100 hover:bg-slate-50">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-100">
                  <Code2 className="h-5 w-5 text-blue-600" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-slate-900">Thực hành xây dựng Layout</p>
                  <p className="text-xs text-slate-400">Web Dev · Còn 5 ngày</p>
                </div>
                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
                  Đang làm
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-6 animate-fade-in-up delay-100">
          <div className="rounded-2xl border border-slate-100 bg-white p-6 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg">
            <div className="mb-5 flex items-center justify-between">
              <h3 className="text-xl font-semibold tracking-tight text-slate-900">Lịch học sắp tới</h3>
              <button className="text-slate-400 transition-colors hover:text-slate-600">
                <MoreHorizontal className="h-5 w-5" />
              </button>
            </div>
            <div className="space-y-4">
              <div className="flex gap-3">
                <div className="flex flex-col items-center">
                  <span className="text-xs font-medium text-slate-500">10:00</span>
                  <span className="text-[10px] text-slate-400">AM</span>
                </div>
                <div className="flex-1 cursor-pointer rounded-lg border-l-4 border-purple-500 bg-purple-50 p-3 transition-colors hover:bg-purple-100">
                  <p className="text-sm font-medium text-slate-900">Q&amp;A Khóa học Lập trình</p>
                  <p className="mt-0.5 text-xs text-slate-500">Trực tiếp · 90 phút</p>
                  <span className="mt-2 inline-flex items-center gap-1 text-[10px] font-medium text-red-600">
                    <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-red-500"></span>
                    Đang diễn ra
                  </span>
                </div>
              </div>
              <div className="flex gap-3">
                <div className="flex flex-col items-center">
                  <span className="text-xs font-medium text-slate-500">02:00</span>
                  <span className="text-[10px] text-slate-400">PM</span>
                </div>
                <div className="flex-1 cursor-pointer rounded-lg border-l-4 border-slate-300 bg-slate-50 p-3 transition-colors hover:bg-slate-100">
                  <p className="text-sm font-medium text-slate-900">Thảo luận nhóm bài 3</p>
                  <p className="mt-0.5 text-xs text-slate-500">Cộng đồng · 60 phút</p>
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-100 bg-white p-6 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg">
            <div className="mb-5 flex items-center justify-between">
              <h3 className="text-xl font-semibold tracking-tight text-slate-900">Giảng viên của bạn</h3>
              <button className="text-sm font-medium text-purple-600 hover:text-purple-700">Xem tất cả</button>
            </div>
            <div className="space-y-4">
              {enrollments.length > 0 ? (
                Array.from(
                  new Map(
                    enrollments
                      .filter((enrollment) => enrollment.course.instructor)
                      .map((enrollment) => [
                        enrollment.course.instructor.name,
                        enrollment.course.instructor,
                      ])
                  ).values()
                )
                  .slice(0, 3)
                  .map((instructor, index) => (
                    <div key={instructor.id || instructor.name || index} className="flex items-center gap-3">
                      <div
                        className={`flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br text-white ${
                          index % 3 === 0
                            ? 'from-pink-400 to-orange-400'
                            : index % 3 === 1
                              ? 'from-blue-400 to-cyan-400'
                              : 'from-purple-400 to-indigo-400'
                        }`}
                      >
                        {instructor.name?.charAt(0) || 'G'}
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-slate-900">{instructor.name}</p>
                        <p className="text-xs text-slate-400">Giảng viên</p>
                      </div>
                      <button className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-50 transition-colors hover:bg-slate-100">
                        <MessageCircle className="h-4 w-4 text-slate-500" />
                      </button>
                    </div>
                  ))
              ) : (
                <div className="py-4 text-center text-sm text-slate-500">Chưa có thông tin giảng viên</div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MyCourses;
