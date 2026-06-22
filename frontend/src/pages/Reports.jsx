import { useEffect, useMemo, useState } from 'react';
import { Award, BarChart3, BookOpen, Calendar, CheckCircle2, Clock, Target, Trophy } from 'lucide-react';
import axios from 'axios';

const summaryCards = [
  {
    icon: Clock,
    label: 'Thời gian học',
    valueKey: 'learningHours',
    suffix: ' giờ',
    color: 'bg-purple-50 text-purple-600 dark:bg-purple-950/30 dark:text-purple-400 border border-purple-100/20 dark:border-purple-800/20',
  },
  {
    icon: BookOpen,
    label: 'Bài học hoàn thành',
    valueKey: 'completedLessons',
    suffix: '',
    color: 'bg-amber-50 text-amber-600 dark:bg-amber-950/30 dark:text-amber-400 border border-amber-100/20 dark:border-amber-800/20',
  },
  {
    icon: Target,
    label: 'Điểm quiz trung bình',
    valueKey: 'averageQuizScore',
    suffix: '%',
    color: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/30 dark:text-emerald-400 border border-emerald-100/20 dark:border-emerald-800/20',
  },
  {
    icon: Award,
    label: 'Chứng chỉ đạt được',
    valueKey: 'certificates',
    suffix: '',
    color: 'bg-rose-50 text-rose-600 dark:bg-rose-950/30 dark:text-rose-400 border border-rose-100/20 dark:border-rose-800/20',
  },
];

const achievementAccent = {
  certificate: 'bg-rose-50 text-rose-600 dark:bg-rose-950/25 dark:text-rose-400 border border-rose-100/30 dark:border-rose-900/20',
  course: 'bg-amber-50 text-amber-600 dark:bg-amber-950/25 dark:text-amber-400 border border-amber-100/30 dark:border-amber-900/20',
  completion: 'bg-amber-50 text-amber-600 dark:bg-amber-950/25 dark:text-amber-400 border border-amber-100/30 dark:border-amber-900/20',
  quiz: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/25 dark:text-emerald-400 border border-emerald-100/30 dark:border-emerald-900/20',
  milestone: 'bg-purple-50 text-purple-600 dark:bg-purple-950/25 dark:text-purple-400 border border-purple-100/30 dark:border-purple-900/20',
};

const progressColors = [
  'bg-purple-600 dark:bg-purple-500',
  'bg-emerald-500 dark:bg-emerald-450',
  'bg-blue-500 dark:bg-blue-450',
  'bg-pink-500 dark:bg-pink-450',
];

const formatDate = (date) => {
  if (!date) return '';

  return new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit',
    month: '2-digit',
  }).format(new Date(date));
};

const EmptyState = ({ title, description }) => (
  <div className="rounded-2xl border border-dashed border-purple-100 dark:border-slate-800 bg-purple-50/5 dark:bg-slate-900/10 p-8 text-center">
    <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">{title}</p>
    {description && <p className="mt-1 text-xs text-slate-450 dark:text-slate-500 font-medium">{description}</p>}
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
        <div className="h-10 w-48 bg-slate-100 dark:bg-slate-800 rounded-lg animate-pulse mb-4" />
        <div className="grid grid-cols-2 gap-6 md:grid-cols-4">
          {[1, 2, 3, 4].map((item) => (
            <div key={item} className="p-[1.5px] rounded-[1.5rem] bg-slate-100 dark:bg-slate-800 border border-slate-200/50 dark:border-slate-700/50 animate-pulse h-32">
              <div className="bg-white dark:bg-slate-900 rounded-[calc(1.5rem-1.5px)] h-full p-5" />
            </div>
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 p-[1.5px] rounded-[1.5rem] bg-slate-100 dark:bg-slate-800 border border-slate-200/50 dark:border-slate-700/50 animate-pulse h-96">
            <div className="bg-white dark:bg-slate-900 rounded-[calc(1.5rem-1.5px)] h-full" />
          </div>
          <div className="lg:col-span-1 p-[1.5px] rounded-[1.5rem] bg-slate-100 dark:bg-slate-800 border border-slate-200/50 dark:border-slate-700/50 animate-pulse h-96">
            <div className="bg-white dark:bg-slate-900 rounded-[calc(1.5rem-1.5px)] h-full" />
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="animate-fade-in-up p-[1.5px] rounded-[1.5rem] bg-rose-50/50 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900/30">
        <div className="bg-white dark:bg-slate-900 rounded-[calc(1.5rem-1.5px)] p-6">
          <p className="text-sm font-semibold text-rose-600 dark:text-rose-450">{error}</p>
        </div>
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
    <div className="animate-fade-in-up space-y-6">
      {/* Header section */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between mb-2">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100 md:text-3xl">
            Tiến trình học tập
          </h1>
          <p className="text-xs text-slate-405 dark:text-slate-500 font-medium mt-1">
            Theo dõi chi tiết số giờ học, chứng chỉ và kết quả kiểm tra của bạn.
          </p>
        </div>
        <div className="inline-flex w-fit items-center gap-2 rounded-full border border-purple-100/50 dark:border-slate-850 bg-white dark:bg-slate-900 px-4 py-2.5 text-xs font-semibold text-slate-600 dark:text-slate-300 shadow-sm">
          <Calendar className="h-3.5 w-3.5 text-purple-600 dark:text-purple-400" strokeWidth={1.5} />
          7 ngày gần đây
        </div>
      </div>

      {/* Summary Row */}
      <div className="grid grid-cols-2 gap-6 md:grid-cols-4">
        {summaryCards.map((card) => {
          const Icon = card.icon;
          const value = summary[card.valueKey] ?? 0;

          return (
            <div
              key={card.label}
              className="p-[1.5px] rounded-[1.5rem] bg-purple-50/40 dark:bg-slate-800/60 border border-purple-100/40 dark:border-slate-800/40 shadow-[0_2px_8px_rgba(147,51,234,0.01)] transition-all duration-500 hover:-translate-y-0.5 hover:shadow-[0_4px_16px_rgba(147,51,234,0.04)] group"
            >
              <div className="bg-white dark:bg-slate-900 rounded-[calc(1.5rem-1.5px)] p-5 h-full flex flex-col justify-between">
                <div>
                  <div className={`mb-3 flex h-10 w-10 items-center justify-center rounded-xl transition-transform duration-300 group-hover:scale-105 ${card.color}`}>
                    <Icon className="h-5 w-5" strokeWidth={1.5} />
                  </div>
                  <p className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">{card.label}</p>
                </div>
                <p className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white font-mono mt-1">
                  {value}
                  <span className="text-xs font-medium text-slate-450 dark:text-slate-500 font-sans ml-0.5">{card.suffix}</span>
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Bento Grid Layout */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        {/* Left Column (2/3 width) */}
        <div className="space-y-6 xl:col-span-2">
          
          {/* Chart Section */}
          <div className="p-[1.5px] rounded-[1.5rem] bg-purple-50/40 dark:bg-slate-800/60 border border-purple-100/40 dark:border-slate-800/40 shadow-[0_2px_8px_rgba(147,51,234,0.01)]">
            <section className="bg-white dark:bg-slate-900 rounded-[calc(1.5rem-1.5px)] p-6">
              <div className="mb-6 flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-bold tracking-tight text-slate-900 dark:text-slate-100">Hoạt động học tập</h3>
                  <p className="mt-0.5 text-xs text-slate-400 dark:text-slate-500 font-medium">Số phút học và bài học hoàn thành theo từng ngày</p>
                </div>
                <div className="p-2 bg-purple-50/50 dark:bg-purple-950/20 rounded-xl border border-purple-100/20 dark:border-purple-900/10">
                  <BarChart3 className="h-4.5 w-4.5 text-purple-600 dark:text-purple-400" strokeWidth={1.5} />
                </div>
              </div>

              {weeklyActivity.length > 0 ? (
                <div className="flex h-56 items-stretch justify-between gap-3 pt-6 border-b border-purple-50/30 dark:border-slate-800/40 pb-2">
                  {weeklyActivity.map((item) => {
                    const minutes = item.minutes || 0;
                    const height = minutes > 0 ? Math.max(8, Math.round((minutes / maxActivityMinutes) * 100)) : 0;

                    return (
                      <div key={item.key || item.date} className="flex flex-1 flex-col items-center gap-2">
                        <div className="flex h-44 w-full items-end justify-center relative group/bar">
                          {/* Floating stats badge on hover */}
                          <div className="absolute -top-11 scale-0 group-hover/bar:scale-100 transition-all duration-300 z-10 bg-slate-955/95 dark:bg-slate-800/95 text-white text-[10px] px-2.5 py-1.5 rounded-lg shadow-lg pointer-events-none whitespace-nowrap border border-slate-800 dark:border-slate-700 font-mono">
                            {minutes}m • {item.completedLessons} bài
                          </div>
                          
                          <div
                            className="relative w-full max-w-[28px] rounded-t-lg bg-gradient-to-t from-purple-600 to-indigo-500 dark:from-purple-950 dark:to-indigo-600 transition-all duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)] group-hover/bar:brightness-105"
                            style={{ height: `${height}%` }}
                          >
                            {minutes > 0 && (
                              <span className="absolute -top-5.5 left-1/2 -translate-x-1/2 text-[9px] font-semibold text-purple-600 dark:text-purple-400 font-mono">
                                {item.hours}h
                              </span>
                            )}
                          </div>
                        </div>
                        <span className="text-[11px] text-slate-400 dark:text-slate-500 font-medium">{item.label}</span>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <EmptyState title="Chưa có hoạt động" description="Hoàn thành một bài học để tạo biểu đồ tuần này." />
              )}
            </section>
          </div>

          {/* Course Progress Section */}
          <div className="p-[1.5px] rounded-[1.5rem] bg-purple-50/40 dark:bg-slate-800/60 border border-purple-100/40 dark:border-slate-800/40 shadow-[0_2px_8px_rgba(147,51,234,0.01)]">
            <section className="bg-white dark:bg-slate-900 rounded-[calc(1.5rem-1.5px)] p-6">
              <h3 className="mb-5 text-lg font-bold tracking-tight text-slate-900 dark:text-slate-100">Tiến độ khóa học</h3>
              {courseProgress.length > 0 ? (
                <div className="space-y-4">
                  {courseProgress.slice(0, 5).map((course, index) => (
                    <div key={course.id} className="group/item">
                      <div className="mb-2 flex items-end justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-slate-850 dark:text-slate-200 group-hover/item:text-purple-650 transition-colors">{course.title}</p>
                          <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5 font-normal">
                            {course.completedLessons}/{course.totalLessons} bài học · {course.instructorName}
                          </p>
                        </div>
                        <span className="text-xs font-semibold text-slate-855 dark:text-slate-200 font-mono bg-purple-50/70 dark:bg-purple-950/20 px-2 py-0.5 rounded-md border border-purple-100/10">{Math.round(course.progress || 0)}%</span>
                      </div>
                      <div className="h-2 w-full rounded-full bg-purple-50/60 dark:bg-slate-800/60 overflow-hidden">
                        <div
                          className={`${progressColors[index % progressColors.length]} h-2 rounded-full transition-all duration-500`}
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
          </div>
        </div>

        {/* Right Column (1/3 width) */}
        <div className="space-y-6">
          
          {/* Achievements Section */}
          <div className="p-[1.5px] rounded-[1.5rem] bg-purple-50/40 dark:bg-slate-800/60 border border-purple-100/40 dark:border-slate-800/40 shadow-[0_2px_8px_rgba(147,51,234,0.01)]">
            <section className="bg-white dark:bg-slate-900 rounded-[calc(1.5rem-1.5px)] p-6">
              <h3 className="mb-5 text-lg font-bold tracking-tight text-slate-900 dark:text-slate-100">Thành tích gần đây</h3>
              {recentAchievements.length > 0 ? (
                <div className="space-y-3">
                  {recentAchievements.map((achievement) => (
                    <div key={achievement.id} className="flex items-center gap-3 rounded-xl border border-purple-50/10 dark:border-slate-800/20 bg-purple-50/5 dark:bg-slate-900/10 p-3 hover:bg-purple-50/10 dark:hover:bg-slate-900/20 hover:border-purple-100/20 transition-all duration-300">
                      <div
                        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
                          achievementAccent[achievement.type] || 'bg-slate-100 text-slate-655'
                        }`}
                      >
                        <Trophy className="h-5 w-5" strokeWidth={1.5} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-xs font-semibold text-slate-855 dark:text-slate-200">{achievement.title}</p>
                        <p className="truncate text-[10px] text-slate-455 dark:text-slate-500 font-normal mt-0.5">{achievement.description}</p>
                      </div>
                      <span className="shrink-0 font-mono text-[9px] text-slate-400 dark:text-slate-505 font-medium">{formatDate(achievement.date)}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <EmptyState title="Chưa có thành tích" description="Chứng chỉ, khóa học hoàn thành và quiz đạt sẽ hiện ở đây." />
              )}
            </section>
          </div>

          {/* Weekly Goals Section */}
          <div className="p-[1.5px] rounded-[1.5rem] bg-purple-50/40 dark:bg-slate-800/60 border border-purple-100/40 dark:border-slate-800/40 shadow-[0_2px_8px_rgba(147,51,234,0.01)]">
            <section className="bg-white dark:bg-slate-900 rounded-[calc(1.5rem-1.5px)] p-6">
              <h3 className="mb-5 text-lg font-bold tracking-tight text-slate-900 dark:text-slate-100">Mục tiêu tuần</h3>
              {weeklyGoals.length > 0 ? (
                <div className="space-y-4">
                  {weeklyGoals.map((goal, index) => (
                    <div key={goal.id}>
                      <div className="mb-2 flex items-center justify-between gap-3">
                        <p className="flex items-center gap-2 text-xs font-semibold text-slate-850 dark:text-slate-200">
                          {goal.progress >= 100 ? (
                            <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" strokeWidth={2.0} />
                          ) : (
                            <Target className="h-4 w-4 text-purple-500 shrink-0" strokeWidth={1.5} />
                          )}
                          <span className="truncate font-medium">{goal.title}</span>
                        </p>
                        <span className="shrink-0 text-[10px] text-slate-450 dark:text-slate-500 font-semibold font-mono">
                          {goal.current}/{goal.target} {goal.unit}
                        </span>
                      </div>
                      <div className="h-1.5 w-full rounded-full bg-purple-50/60 dark:bg-slate-800/60 overflow-hidden">
                        <div
                          className={`${progressColors[index % progressColors.length]} h-1.5 rounded-full transition-all duration-500`}
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

      {/* Quizzes Section (Full Width) */}
      <div className="p-[1.5px] rounded-[1.5rem] bg-purple-50/40 dark:bg-slate-800/60 border border-purple-100/40 dark:border-slate-800/40 shadow-[0_2px_8px_rgba(147,51,234,0.01)] mt-6">
        <section className="bg-white dark:bg-slate-900 rounded-[calc(1.5rem-1.5px)] p-6">
          <h3 className="mb-5 text-lg font-bold tracking-tight text-slate-900 dark:text-slate-100">Kết quả quiz gần đây</h3>
          {recentQuizSubmissions.length > 0 ? (
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
              {recentQuizSubmissions.map((quiz) => (
                <div key={quiz.id} className="rounded-2xl border border-purple-50/40 dark:border-slate-800 bg-purple-50/5 dark:bg-slate-900/10 p-4 transition hover:-translate-y-0.5 hover:border-purple-100 hover:shadow-[0_4px_16px_rgba(147,51,234,0.02)] duration-300">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-xs font-semibold text-slate-855 dark:text-slate-200">{quiz.title}</p>
                      <p className="truncate text-[10px] text-slate-455 dark:text-slate-500 font-normal mt-0.5">{quiz.courseTitle || 'Khóa học'}</p>
                    </div>
                    <span
                      className={`shrink-0 rounded-full px-2.5 py-0.5 text-[10px] font-semibold tracking-wide border ${
                        quiz.passed
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-100 dark:bg-emerald-950/20 dark:text-emerald-400 dark:border-emerald-900/20'
                          : 'bg-rose-50 text-rose-700 border-rose-100 dark:bg-rose-950/20 dark:text-rose-455 dark:border-rose-900/20'
                      }`}
                    >
                      {quiz.score}%
                    </span>
                  </div>
                  <p className="mt-3.5 text-[10px] text-slate-400 dark:text-slate-550 font-mono font-medium">{formatDate(quiz.createdAt)}</p>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState title="Chưa có kết quả quiz" description="Làm quiz trong bài học để theo dõi điểm trung bình." />
          )}
        </section>
      </div>
    </div>
  );
};

export default Reports;
