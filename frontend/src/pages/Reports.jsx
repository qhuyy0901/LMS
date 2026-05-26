import { useEffect, useMemo, useState } from 'react';
import { BookOpen, Calendar, Clock, Target, Trophy } from 'lucide-react';
import axios from 'axios';

const cardStyles = [
  {
    icon: Clock,
    label: 'Thoi gian hoc',
    valueKey: 'learningHours',
    suffix: 'h',
    color: 'bg-purple-100 text-purple-600',
  },
  {
    icon: BookOpen,
    label: 'Bai hoc hoan thanh',
    valueKey: 'completedLessons',
    suffix: '',
    color: 'bg-amber-100 text-amber-600',
  },
  {
    icon: Target,
    label: 'Diem quiz trung binh',
    valueKey: 'averageQuizScore',
    suffix: '/10',
    color: 'bg-emerald-100 text-emerald-600',
  },
  {
    icon: Trophy,
    label: 'Chung chi dat duoc',
    valueKey: 'certificates',
    suffix: '',
    color: 'bg-pink-100 text-pink-600',
  },
];

const achievementAccent = {
  certificate: 'bg-pink-100 text-pink-600',
  course: 'bg-amber-100 text-amber-600',
  quiz: 'bg-emerald-100 text-emerald-600',
};

const progressColors = ['bg-purple-600', 'bg-emerald-500', 'bg-blue-500', 'bg-pink-500'];

const formatDate = (date) => {
  if (!date) {
    return '';
  }

  return new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit',
    month: '2-digit',
  }).format(new Date(date));
};

const EmptyState = ({ title, description }) => (
  <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/70 p-6 text-center">
    <p className="text-sm font-medium text-slate-700">{title}</p>
    <p className="mt-1 text-xs text-slate-500">{description}</p>
  </div>
);

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
          setReport(response.data);
        }
      } catch (fetchError) {
        if (mounted) {
          setError(fetchError.response?.data?.message || 'Khong the tai bao cao hoc tap');
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
    const values = report?.weeklyActivity?.map((item) => item.minutes) || [];
    return Math.max(30, ...values);
  }, [report]);

  if (isLoading) {
    return (
      <div className="animate-fade-in-up space-y-6">
        <div className="h-20 rounded-2xl bg-slate-100 animate-pulse" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {cardStyles.map((card) => (
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

  return (
    <div className="animate-fade-in-up">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between mb-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-semibold tracking-tight text-slate-900 mb-1">
            Bao cao hoc tap
          </h1>
          <p className="text-sm text-slate-500">
            Theo doi tien do, ket qua quiz va thanh tich cua ban dua tren du lieu hoc tap thuc te.
          </p>
        </div>
        <div className="inline-flex w-fit items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-600">
          <Calendar className="w-4 h-4" />
          7 ngay gan day
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {cardStyles.map((card) => {
          const Icon = card.icon;
          const value = summary[card.valueKey] ?? 0;

          return (
            <div
              key={card.label}
              className="bg-white rounded-2xl p-5 border border-slate-100 transition-all duration-300 hover:shadow-lg hover:-translate-y-1"
            >
              <div className="flex items-center justify-between mb-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${card.color}`}>
                  <Icon className="w-5 h-5" />
                </div>
              </div>
              <p className="text-xs text-slate-400 mb-1">{card.label}</p>
              <p className="text-2xl font-semibold tracking-tight text-slate-900">
                {value}
                {card.suffix}
              </p>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2 space-y-6">
          <div className="bg-white rounded-2xl p-6 border border-slate-100 transition-all duration-300 hover:shadow-lg hover:-translate-y-1">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h3 className="text-xl font-semibold tracking-tight text-slate-900">
                  Hoat dong hoc tap
                </h3>
                <p className="text-xs text-slate-400 mt-1">So phut hoc va bai hoan thanh theo ngay</p>
              </div>
            </div>
            {weeklyActivity.length > 0 ? (
              <div className="flex items-end justify-between gap-3 h-52">
                {weeklyActivity.map((item) => {
                  const height = Math.max(8, Math.round((item.minutes / maxActivityMinutes) * 100));

                  return (
                    <div key={item.date} className="flex-1 flex flex-col items-center gap-2">
                      <div
                        className="w-full bg-purple-600 rounded-t-lg relative min-h-2"
                        style={{ height: `${height}%` }}
                        title={`${item.minutes} phut, ${item.completedLessons} bai`}
                      >
                        {item.minutes > 0 && (
                          <span className="absolute -top-6 left-1/2 -translate-x-1/2 text-[10px] font-medium text-purple-700 bg-purple-50 px-1.5 py-0.5 rounded">
                            {item.hours}h
                          </span>
                        )}
                      </div>
                      <span className="text-xs text-slate-400">{item.label}</span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <EmptyState title="Chua co hoat dong" description="Hoan thanh mot bai hoc de tao bieu do tuan nay." />
            )}
          </div>

          <div className="bg-white rounded-2xl p-6 border border-slate-100 transition-all duration-300 hover:shadow-lg hover:-translate-y-1">
            <h3 className="text-xl font-semibold tracking-tight text-slate-900 mb-5">
              Tien do khoa hoc
            </h3>
            {courseProgress.length > 0 ? (
              <div className="space-y-4">
                {courseProgress.slice(0, 5).map((course, index) => (
                  <div key={course.id}>
                    <div className="flex items-center justify-between gap-3 mb-2">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-slate-900">{course.title}</p>
                        <p className="text-xs text-slate-400">
                          {course.completedLessons}/{course.totalLessons} bai - {course.instructorName}
                        </p>
                      </div>
                      <span className="text-sm font-semibold text-slate-900">{course.progress}%</span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-2">
                      <div
                        className={`${progressColors[index % progressColors.length]} h-2 rounded-full`}
                        style={{ width: `${course.progress}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState title="Chua ghi danh khoa hoc" description="Cac khoa da ghi danh se xuat hien tai day." />
            )}
          </div>

          <div className="bg-white rounded-2xl p-6 border border-slate-100 transition-all duration-300 hover:shadow-lg hover:-translate-y-1">
            <h3 className="text-xl font-semibold tracking-tight text-slate-900 mb-5">
              Ket qua quiz gan day
            </h3>
            {report.recentQuizSubmissions?.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {report.recentQuizSubmissions.map((quiz) => (
                  <div key={quiz.id} className="rounded-xl border border-slate-100 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-slate-900">{quiz.title}</p>
                        <p className="truncate text-xs text-slate-400">{quiz.courseTitle || 'Khoa hoc'}</p>
                      </div>
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                          quiz.passed ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'
                        }`}
                      >
                        {quiz.score}
                      </span>
                    </div>
                    <p className="mt-3 text-xs text-slate-400">{formatDate(quiz.createdAt)}</p>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState title="Chua co ket qua quiz" description="Lam quiz de theo doi diem trung binh." />
            )}
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-white rounded-2xl p-6 border border-slate-100 transition-all duration-300 hover:shadow-lg hover:-translate-y-1">
            <h3 className="text-xl font-semibold tracking-tight text-slate-900 mb-5">
              Thanh tich gan day
            </h3>
            {recentAchievements.length > 0 ? (
              <div className="space-y-3">
                {recentAchievements.map((achievement) => (
                  <div key={achievement.id} className="flex items-center gap-3 rounded-xl p-3 hover:bg-slate-50">
                    <div
                      className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                        achievementAccent[achievement.type] || 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      <Trophy className="w-5 h-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-slate-900">{achievement.title}</p>
                      <p className="truncate text-xs text-slate-400">{achievement.description}</p>
                    </div>
                    <span className="text-xs text-slate-400">{formatDate(achievement.date)}</span>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState title="Chua co thanh tich" description="Chung chi, khoa hoan thanh va quiz dat se hien o day." />
            )}
          </div>

          <div className="bg-white rounded-2xl p-6 border border-slate-100 transition-all duration-300 hover:shadow-lg hover:-translate-y-1">
            <h3 className="text-xl font-semibold tracking-tight text-slate-900 mb-5">
              Muc tieu tuan
            </h3>
            <div className="space-y-4">
              {weeklyGoals.map((goal, index) => (
                <div key={goal.id}>
                  <div className="flex items-center justify-between gap-3 mb-2">
                    <p className="text-sm font-medium text-slate-900">{goal.title}</p>
                    <span className="shrink-0 text-xs text-slate-500">
                      {goal.current} / {goal.target} {goal.unit}
                    </span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-2">
                    <div
                      className={`${progressColors[index % progressColors.length]} h-2 rounded-full`}
                      style={{ width: `${goal.progress}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Reports;
