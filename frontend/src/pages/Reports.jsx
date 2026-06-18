import { useEffect, useMemo, useState } from 'react';
import { Award, BarChart3, BookOpen, Calendar, CheckCircle2, Clock, Target, Trophy } from 'lucide-react';
import axios from 'axios';

const summaryCards = [
  {
    icon: Clock,
    label: 'Thời gian học',
    valueKey: 'learningHours',
    suffix: ' giờ',
    color: 'bg-purple-100 text-purple-600',
  },
  {
    icon: BookOpen,
    label: 'Bài học hoàn thành',
    valueKey: 'completedLessons',
    suffix: '',
    color: 'bg-amber-100 text-amber-600',
  },
  {
    icon: Target,
    label: 'Điểm quiz trung bình',
    valueKey: 'averageQuizScore',
    suffix: '%',
    color: 'bg-emerald-100 text-emerald-600',
  },
  {
    icon: Award,
    label: 'Chứng chỉ đạt được',
    valueKey: 'certificates',
    suffix: '',
    color: 'bg-pink-100 text-pink-600',
  },
];

const achievementAccent = {
  certificate: 'bg-pink-100 text-pink-600',
  course: 'bg-amber-100 text-amber-600',
  completion: 'bg-amber-100 text-amber-600',
  quiz: 'bg-emerald-100 text-emerald-600',
  milestone: 'bg-purple-100 text-purple-600',
};

const progressColors = ['bg-purple-600', 'bg-emerald-500', 'bg-blue-500', 'bg-pink-500'];

const formatDate = (date) => {
  if (!date) return '';

  return new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit',
    month: '2-digit',
  }).format(new Date(date));
};

const EmptyState = ({ title, description }) => (
  <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/80 p-6 text-center">
    <p className="text-sm font-semibold text-slate-700">{title}</p>
    <p className="mt-1 text-xs text-slate-500">{description}</p>
  </div>
);

const normalizeReport = (payload) => {
  const weeklyActivity = payload?.weeklyActivity || payload?.dailyActivity || [];
  const totalMinutes = payload?.totalMinutes ?? weeklyActivity.reduce((sum, item) => sum + (item.minutes || 0), 0);
  const totalCompletedLessons =
    payload?.totalCompletedLessons ?? weeklyActivity.reduce((sum, item) => sum + (item.completedLessons || 0), 0);

  return {
    summary: {
      learningHours: Math.round(((payload?.summary?.learningHours ?? totalMinutes / 60) || 0) * 10) / 10,
      completedLessons: payload?.summary?.completedLessons ?? totalCompletedLessons,
      averageQuizScore: payload?.summary?.averageQuizScore ?? 0,
      certificates: payload?.summary?.certificates ?? 0,
    },
    weeklyActivity: weeklyActivity.map((item) => ({
      ...item,
      hours: item.hours ?? Math.round(((item.minutes || 0) / 60) * 10) / 10,
      completedLessons: item.completedLessons || 0,
    })),
    courseProgress: payload?.courseProgress || [],
    recentQuizSubmissions: payload?.recentQuizSubmissions || [],
    recentAchievements: payload?.recentAchievements || payload?.achievements || [],
    weeklyGoals: payload?.weeklyGoals || [],
  };
};

const Reports = () => {
  const [report, setReport] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let mounted = true;

    const fetchReport = async () => {
      try {
        setIsLoading(true);
        setError('');
        const response = await axios.get('/api/user/reports');

        if (mounted) {
          setReport(normalizeReport(response.data));
        }
      } catch (fetchError) {
        if (mounted) {
          setError(fetchError.response?.data?.message || 'Không thể tải báo cáo học tập');
        }
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    };

    fetchReport();

    return () => {
      mounted = false;
    };
  }, []);

  const maxActivityMinutes = useMemo(() => {
    const values = report?.weeklyActivity?.map((item) => item.minutes || 0) || [];
    return Math.max(30, ...values);
  }, [report]);

  if (isLoading) {
    return (
      <div className="animate-fade-in-up space-y-6">
        <div className="h-20 rounded-2xl bg-slate-100 animate-pulse" />
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {summaryCards.map((card) => (
            <div key={card.label} className="h-32 rounded-2xl bg-slate-100 animate-pulse" />
          ))}
        </div>
        <div className="h-96 rounded-2xl bg-slate-100 animate-pulse" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="animate-fade-in-up rounded-2xl border border-red-100 bg-red-50 p-6">
        <p className="text-sm font-medium text-red-700">{error}</p>
      </div>
    );
  }

  const summary = report?.summary || {};
  const weeklyActivity = report?.weeklyActivity || [];
  const courseProgress = report?.courseProgress || [];
  const recentAchievements = report?.recentAchievements || [];
  const weeklyGoals = report?.weeklyGoals || [];
  const recentQuizSubmissions = report?.recentQuizSubmissions || [];

  return (
    <div className="animate-fade-in-up">
      <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="mb-1 text-2xl font-semibold tracking-tight text-slate-900 md:text-3xl">
            Tiến trình học tập
          </h1>

        </div>
        <div className="inline-flex w-fit items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-600 shadow-sm">
          <Calendar className="h-4 w-4" />
          7 ngày gần đây
        </div>
      </div>

      <div className="mb-6 grid grid-cols-2 gap-4 md:grid-cols-4">
        {summaryCards.map((card) => {
          const Icon = card.icon;
          const value = summary[card.valueKey] ?? 0;

          return (
            <div
              key={card.label}
              className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-lg"
            >
              <div className={`mb-3 flex h-10 w-10 items-center justify-center rounded-xl ${card.color}`}>
                <Icon className="h-5 w-5" />
              </div>
              <p className="mb-1 text-xs font-medium text-slate-400">{card.label}</p>
              <p className="text-2xl font-semibold tracking-tight text-slate-900">
                {value}
                {card.suffix}
              </p>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <div className="space-y-6 xl:col-span-2">
          <section className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
            <div className="mb-5 flex items-center justify-between">
              <div>
                <h3 className="text-xl font-semibold tracking-tight text-slate-900">Hoạt động học tập</h3>
                <p className="mt-1 text-xs text-slate-400">Số phút học và bài học hoàn thành theo từng ngày</p>
              </div>
              <BarChart3 className="h-5 w-5 text-purple-500" />
            </div>

            {weeklyActivity.length > 0 ? (
              <div className="flex h-52 items-stretch justify-between gap-3">
                {weeklyActivity.map((item) => {
                  const minutes = item.minutes || 0;
                  const height = minutes > 0 ? Math.max(12, Math.round((minutes / maxActivityMinutes) * 100)) : 0;

                  return (
                    <div key={item.key || item.date} className="flex flex-1 flex-col items-center gap-2">
                      <div className="flex h-40 w-full items-end">
                        <div
                          className="relative w-full rounded-t-lg bg-gradient-to-t from-purple-600 to-fuchsia-500 transition-all duration-500"
                          style={{ height: `${height}%` }}
                        title={`${minutes} phút, ${item.completedLessons} bài`}
                      >
                        {minutes > 0 && (
                          <span className="absolute -top-6 left-1/2 -translate-x-1/2 rounded bg-purple-50 px-1.5 py-0.5 text-[10px] font-medium text-purple-700">
                            {item.hours}h
                          </span>
                        )}
                        </div>
                      </div>
                      <span className="text-xs text-slate-400">{item.label}</span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <EmptyState title="Chưa có hoạt động" description="Hoàn thành một bài học để tạo biểu đồ tuần này." />
            )}
          </section>

          <section className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
            <h3 className="mb-5 text-xl font-semibold tracking-tight text-slate-900">Tiến độ khóa học</h3>
            {courseProgress.length > 0 ? (
              <div className="space-y-4">
                {courseProgress.slice(0, 5).map((course, index) => (
                  <div key={course.id}>
                    <div className="mb-2 flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-slate-900">{course.title}</p>
                        <p className="text-xs text-slate-400">
                          {course.completedLessons}/{course.totalLessons} bài học - {course.instructorName}
                        </p>
                      </div>
                      <span className="text-sm font-semibold text-slate-900">{Math.round(course.progress || 0)}%</span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-slate-100">
                      <div
                        className={`${progressColors[index % progressColors.length]} h-2 rounded-full`}
                        style={{ width: `${Math.min(100, Math.max(0, course.progress || 0))}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState title="Chưa ghi danh khóa học" description="Các khóa học đã mua hoặc ghi danh sẽ xuất hiện tại đây." />
            )}
          </section>

          <section className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
            <h3 className="mb-5 text-xl font-semibold tracking-tight text-slate-900">Kết quả quiz gần đây</h3>
            {recentQuizSubmissions.length > 0 ? (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                {recentQuizSubmissions.map((quiz) => (
                  <div key={quiz.id} className="rounded-xl border border-slate-100 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-slate-900">{quiz.title}</p>
                        <p className="truncate text-xs text-slate-400">{quiz.courseTitle || 'Khóa học'}</p>
                      </div>
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                          quiz.passed ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'
                        }`}
                      >
                        {quiz.score}%
                      </span>
                    </div>
                    <p className="mt-3 text-xs text-slate-400">{formatDate(quiz.createdAt)}</p>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState title="Chưa có kết quả quiz" description="Làm quiz trong bài học để theo dõi điểm trung bình." />
            )}
          </section>
        </div>

        <div className="space-y-6">
          <section className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
            <h3 className="mb-5 text-xl font-semibold tracking-tight text-slate-900">Thành tích gần đây</h3>
            {recentAchievements.length > 0 ? (
              <div className="space-y-3">
                {recentAchievements.map((achievement) => (
                  <div key={achievement.id} className="flex items-center gap-3 rounded-xl p-3 hover:bg-slate-50">
                    <div
                      className={`flex h-10 w-10 items-center justify-center rounded-lg ${
                        achievementAccent[achievement.type] || 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      <Trophy className="h-5 w-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-slate-900">{achievement.title}</p>
                      <p className="truncate text-xs text-slate-400">{achievement.description}</p>
                    </div>
                    <span className="text-xs text-slate-400">{formatDate(achievement.date)}</span>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState title="Chưa có thành tích" description="Chứng chỉ, khóa học hoàn thành và quiz đạt sẽ hiện ở đây." />
            )}
          </section>

          <section className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
            <h3 className="mb-5 text-xl font-semibold tracking-tight text-slate-900">Mục tiêu tuần</h3>
            {weeklyGoals.length > 0 ? (
              <div className="space-y-4">
                {weeklyGoals.map((goal, index) => (
                  <div key={goal.id}>
                    <div className="mb-2 flex items-center justify-between gap-3">
                      <p className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                        {goal.progress >= 100 && <CheckCircle2 className="h-4 w-4 text-emerald-500" />}
                        {goal.title}
                      </p>
                      <span className="shrink-0 text-xs text-slate-500">
                        {goal.current} / {goal.target} {goal.unit}
                      </span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-slate-100">
                      <div
                        className={`${progressColors[index % progressColors.length]} h-2 rounded-full`}
                        style={{ width: `${Math.min(100, Math.max(0, goal.progress || 0))}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState title="Chưa có mục tiêu" description="Hệ thống sẽ tạo mục tiêu khi có dữ liệu học tập." />
            )}
          </section>
        </div>
      </div>
    </div>
  );
};

export default Reports;
