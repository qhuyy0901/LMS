import React from 'react';
import { BookOpen, Calendar, Clock, Download, Plus, Share2, Target, Trophy } from 'lucide-react';

const Reports = () => {
  return (
    <div className="animate-fade-in-up">
      {/* Page header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl md:text-3xl font-semibold tracking-tight text-slate-900 mb-1">
              Báo cáo học tập
            </h1>
            <p className="text-sm text-slate-500">
              Theo dõi tiến độ, hiệu suất và thành tích của bạn trong 30 ngày
              qua.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              className="bg-white border border-slate-200 text-slate-600 px-4 py-2.5 rounded-full text-sm font-medium inline-flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              30 ngày qua
            </button>
            <button
              className="bg-white border border-slate-200 text-slate-600 px-4 py-2.5 rounded-full text-sm font-medium inline-flex items-center gap-2">
              <Download className="w-4 h-4" />
              Xuất báo cáo
            </button>
            <button
              className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2.5 rounded-full text-sm font-medium inline-flex items-center gap-2">
              <Share2 className="w-4 h-4" />
              Chia sẻ
            </button>
          </div>
        </div>

        {/* Categories */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-2xl p-5 border border-slate-100 transition-all duration-300 hover:shadow-lg hover:-translate-y-1">
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center">
                <Clock className="w-5 h-5 text-purple-600" />
              </div>
              <span className="text-xs font-medium text-green-600 bg-green-50 px-2 py-0.5 rounded-full">
                +12%
              </span>
            </div>
            <p className="text-xs text-slate-400 mb-1">Thời gian học</p>
            <p className="text-2xl font-semibold tracking-tight text-slate-900">
              42.5h
            </p>
          </div>
          <div className="bg-white rounded-2xl p-5 border border-slate-100 transition-all duration-300 hover:shadow-lg hover:-translate-y-1">
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center">
                <BookOpen className="w-5 h-5 text-amber-600" />
              </div>
              <span className="text-xs font-medium text-green-600 bg-green-50 px-2 py-0.5 rounded-full">
                +5
              </span>
            </div>
            <p className="text-xs text-slate-400 mb-1">Bài học hoàn thành</p>
            <p className="text-2xl font-semibold tracking-tight text-slate-900">
              128
            </p>
          </div>
          <div className="bg-white rounded-2xl p-5 border border-slate-100 transition-all duration-300 hover:shadow-lg hover:-translate-y-1">
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center">
                <Target className="w-5 h-5 text-emerald-600" />
              </div>
              <span className="text-xs font-medium text-green-600 bg-green-50 px-2 py-0.5 rounded-full">
                +8%
              </span>
            </div>
            <p className="text-xs text-slate-400 mb-1">Điểm trung bình</p>
            <p className="text-2xl font-semibold tracking-tight text-slate-900">
              8.6/10
            </p>
          </div>
          <div className="bg-white rounded-2xl p-5 border border-slate-100 transition-all duration-300 hover:shadow-lg hover:-translate-y-1">
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 rounded-xl bg-pink-100 flex items-center justify-center">
                <Trophy className="w-5 h-5 text-pink-600" />
              </div>
              <span className="text-xs font-medium text-green-600 bg-green-50 px-2 py-0.5 rounded-full">
                +3
              </span>
            </div>
            <p className="text-xs text-slate-400 mb-1">Chứng chỉ đạt được</p>
            <p className="text-2xl font-semibold tracking-tight text-slate-900">
              12
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          <div className="xl:col-span-2 space-y-6 animate-fade-in-up">
            {/* Learning activity chart */}
            <div className="bg-white rounded-2xl p-6 border border-slate-100 transition-all duration-300 hover:shadow-lg hover:-translate-y-1">
              <div className="flex items-center justify-between mb-5">
                <div>
                  <h3 className="text-xl font-semibold tracking-tight text-slate-900">
                    Hoạt động học tập
                  </h3>
                  <p className="text-xs text-slate-400 mt-1">
                    Số giờ học mỗi ngày trong tuần
                  </p>
                </div>
                <div className="flex items-center gap-1 bg-slate-100 rounded-full p-1">
                  <button className="px-3 py-1 rounded-full text-xs font-medium bg-white text-slate-700 shadow-sm">
                    Tuần
                  </button>
                  <button className="px-3 py-1 rounded-full text-xs text-slate-500">
                    Tháng
                  </button>
                  <button className="px-3 py-1 rounded-full text-xs text-slate-500">
                    Năm
                  </button>
                </div>
              </div>
              <div className="flex items-end justify-between gap-3 h-48">
                <div className="flex-1 flex flex-col items-center gap-2">
                  <div className="w-full bg-purple-100 rounded-t-lg" style={{ height: '45%' }}></div>
                  <span className="text-xs text-slate-400">T2</span>
                </div>
                <div className="flex-1 flex flex-col items-center gap-2">
                  <div className="w-full bg-purple-200 rounded-t-lg" style={{ height: '65%' }}></div>
                  <span className="text-xs text-slate-400">T3</span>
                </div>
                <div className="flex-1 flex flex-col items-center gap-2">
                  <div className="w-full bg-purple-300 rounded-t-lg" style={{ height: '55%' }}></div>
                  <span className="text-xs text-slate-400">T4</span>
                </div>
                <div className="flex-1 flex flex-col items-center gap-2">
                  <div className="w-full bg-purple-600 rounded-t-lg relative" style={{ height: '90%' }}>
                    <span
                      className="absolute -top-6 left-1/2 -translate-x-1/2 text-[10px] font-medium text-purple-700 bg-purple-50 px-1.5 py-0.5 rounded">
                      7.2h
                    </span>
                  </div>
                  <span className="text-xs font-medium text-slate-700">T5</span>
                </div>
                <div className="flex-1 flex flex-col items-center gap-2">
                  <div className="w-full bg-purple-400 rounded-t-lg" style={{ height: '70%' }}></div>
                  <span className="text-xs text-slate-400">T6</span>
                </div>
                <div className="flex-1 flex flex-col items-center gap-2">
                  <div className="w-full bg-purple-200 rounded-t-lg" style={{ height: '35%' }}></div>
                  <span className="text-xs text-slate-400">T7</span>
                </div>
                <div className="flex-1 flex flex-col items-center gap-2">
                  <div className="w-full bg-purple-300 rounded-t-lg" style={{ height: '50%' }}></div>
                  <span className="text-xs text-slate-400">CN</span>
                </div>
              </div>
            </div>

            {/* Course progress */}
            <div className="bg-white rounded-2xl p-6 border border-slate-100 transition-all duration-300 hover:shadow-lg hover:-translate-y-1">
              <div className="flex items-center justify-between mb-5">
                <h3 className="text-xl font-semibold tracking-tight text-slate-900">
                  Tiến độ khóa học
                </h3>
                <button className="text-sm text-purple-600 font-medium">
                  Xem tất cả
                </button>
              </div>
              <div className="space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-lg bg-amber-100 flex items-center justify-center text-lg">
                        🎨
                      </div>
                      <div>
                        <p className="text-sm font-medium text-slate-900">
                          Design System cho SaaS
                        </p>
                        <p className="text-xs text-slate-400">
                          18/24 bài · Sophia Nguyễn
                        </p>
                      </div>
                    </div>
                    <span className="text-sm font-semibold text-slate-900">
                      75%
                    </span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-2">
                    <div className="bg-purple-600 h-2 rounded-full" style={{ width: '75%' }}></div>
                  </div>
                </div>
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-lg bg-green-100 flex items-center justify-center text-lg">
                        💻
                      </div>
                      <div>
                        <p className="text-sm font-medium text-slate-900">
                          Next.js 15 Full-stack
                        </p>
                        <p className="text-xs text-slate-400">
                          21/42 bài · Liam Trần
                        </p>
                      </div>
                    </div>
                    <span className="text-sm font-semibold text-slate-900">
                      50%
                    </span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-2">
                    <div className="bg-emerald-500 h-2 rounded-full" style={{ width: '50%' }}></div>
                  </div>
                </div>
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-lg bg-blue-100 flex items-center justify-center text-lg">
                        📈
                      </div>
                      <div>
                        <p className="text-sm font-medium text-slate-900">
                          Growth Marketing
                        </p>
                        <p className="text-xs text-slate-400">
                          5/18 bài · Maya Patel
                        </p>
                      </div>
                    </div>
                    <span className="text-sm font-semibold text-slate-900">
                      28%
                    </span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-2">
                    <div className="bg-blue-500 h-2 rounded-full" style={{ width: '28%' }}></div>
                  </div>
                </div>
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-lg bg-pink-100 flex items-center justify-center text-lg">
                        📊
                      </div>
                      <div>
                        <p className="text-sm font-medium text-slate-900">
                          Python &amp; Pandas
                        </p>
                        <p className="text-xs text-slate-400">
                          28/30 bài · Ethan Cruz
                        </p>
                      </div>
                    </div>
                    <span className="text-sm font-semibold text-slate-900">
                      93%
                    </span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-2">
                    <div className="bg-pink-500 h-2 rounded-full" style={{ width: '93%' }}></div>
                  </div>
                </div>
              </div>
            </div>

            {/* Skills breakdown */}
            <div className="bg-white rounded-2xl p-6 border border-slate-100 transition-all duration-300 hover:shadow-lg hover:-translate-y-1">
              <div className="flex items-center justify-between mb-5">
                <div>
                  <h3 className="text-xl font-semibold tracking-tight text-slate-900">
                    Phân tích kỹ năng
                  </h3>
                  <p className="text-xs text-slate-400 mt-1">
                    Mức độ thành thạo theo từng lĩnh vực
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 rounded-xl border border-slate-100">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-slate-900">
                      UI/UX Design
                    </span>
                    <span className="text-xs font-medium text-purple-700 bg-purple-50 px-2 py-0.5 rounded-full">
                      Nâng cao
                    </span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-1.5 mb-1">
                    <div className="bg-purple-600 h-1.5 rounded-full" style={{ width: '88%' }}></div>
                  </div>
                  <p className="text-xs text-slate-400">88 / 100 điểm</p>
                </div>
                <div className="p-4 rounded-xl border border-slate-100">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-slate-900">
                      Frontend Dev
                    </span>
                    <span className="text-xs font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
                      Trung cấp
                    </span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-1.5 mb-1">
                    <div className="bg-emerald-500 h-1.5 rounded-full" style={{ width: '65%' }}></div>
                  </div>
                  <p className="text-xs text-slate-400">65 / 100 điểm</p>
                </div>
                <div className="p-4 rounded-xl border border-slate-100">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-slate-900">
                      Data Analysis
                    </span>
                    <span className="text-xs font-medium text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full">
                      Trung cấp
                    </span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-1.5 mb-1">
                    <div className="bg-blue-500 h-1.5 rounded-full" style={{ width: '72%' }}></div>
                  </div>
                  <p className="text-xs text-slate-400">72 / 100 điểm</p>
                </div>
                <div className="p-4 rounded-xl border border-slate-100">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-slate-900">
                      Marketing
                    </span>
                    <span className="text-xs font-medium text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full">
                      Cơ bản
                    </span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-1.5 mb-1">
                    <div className="bg-amber-500 h-1.5 rounded-full" style={{ width: '42%' }}></div>
                  </div>
                  <p className="text-xs text-slate-400">42 / 100 điểm</p>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            {/* Streak */}
            <div
              className="bg-gradient-to-br from-purple-600 to-purple-800 rounded-2xl p-6 text-white relative overflow-hidden">
              <div className="absolute top-0 right-0 text-7xl opacity-20">🔥</div>
              <div className="relative">
                <p className="text-xs text-purple-200 mb-1">Chuỗi học liên tục</p>
                <p className="text-4xl font-semibold tracking-tight mb-2">
                  24 ngày
                </p>
                <p className="text-sm text-purple-100 mb-4">
                  Tiếp tục giữ phong độ! Bạn sắp đạt kỷ lục cá nhân.
                </p>
                <div className="flex items-center gap-1.5">
                  <div className="w-7 h-7 rounded-md bg-white/20 flex items-center justify-center text-xs">
                    ✓
                  </div>
                  <div className="w-7 h-7 rounded-md bg-white/20 flex items-center justify-center text-xs">
                    ✓
                  </div>
                  <div className="w-7 h-7 rounded-md bg-white/20 flex items-center justify-center text-xs">
                    ✓
                  </div>
                  <div className="w-7 h-7 rounded-md bg-white/20 flex items-center justify-center text-xs">
                    ✓
                  </div>
                  <div className="w-7 h-7 rounded-md bg-white/20 flex items-center justify-center text-xs">
                    ✓
                  </div>
                  <div
                    className="w-7 h-7 rounded-md bg-amber-400 text-purple-900 flex items-center justify-center text-xs font-semibold">
                    🔥
                  </div>
                  <div
                    className="w-7 h-7 rounded-md border border-white/30 flex items-center justify-center text-xs text-white/50">
                    ·
                  </div>
                </div>
              </div>
            </div>

            {/* Achievements */}
            <div className="bg-white rounded-2xl p-6 border border-slate-100 transition-all duration-300 hover:shadow-lg hover:-translate-y-1">
              <div className="flex items-center justify-between mb-5">
                <h3 className="text-xl font-semibold tracking-tight text-slate-900">
                  Thành tích gần đây
                </h3>
                <button className="text-sm text-purple-600 font-medium">
                  Tất cả
                </button>
              </div>
              <div className="space-y-3">
                <div className="flex items-center gap-3 p-3 rounded-xl hover:bg-slate-50">
                  <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center text-xl">
                    🏆
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-slate-900">
                      Bậc thầy Design System
                    </p>
                    <p className="text-xs text-slate-400">
                      Hoàn thành 75% khóa học
                    </p>
                  </div>
                  <span className="text-xs text-slate-400">2 ngày</span>
                </div>
                <div className="flex items-center gap-3 p-3 rounded-xl hover:bg-slate-50">
                  <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center text-xl">
                    ⭐
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-slate-900">
                      Học liên tục 20 ngày
                    </p>
                    <p className="text-xs text-slate-400">Streak 20 ngày</p>
                  </div>
                  <span className="text-xs text-slate-400">4 ngày</span>
                </div>
                <div className="flex items-center gap-3 p-3 rounded-xl hover:bg-slate-50">
                  <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center text-xl">
                    🎯
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-slate-900">
                      Điểm tuyệt đối
                    </p>
                    <p className="text-xs text-slate-400">
                      10/10 bài kiểm tra Python
                    </p>
                  </div>
                  <span className="text-xs text-slate-400">1 tuần</span>
                </div>
                <div className="flex items-center gap-3 p-3 rounded-xl hover:bg-slate-50">
                  <div className="w-10 h-10 rounded-lg bg-pink-100 flex items-center justify-center text-xl">
                    🎓
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-slate-900">
                      Chứng chỉ thứ 12
                    </p>
                    <p className="text-xs text-slate-400">UX Writing cơ bản</p>
                  </div>
                  <span className="text-xs text-slate-400">2 tuần</span>
                </div>
              </div>
            </div>

            {/* Goals */}
            <div className="bg-white rounded-2xl p-6 border border-slate-100 transition-all duration-300 hover:shadow-lg hover:-translate-y-1">
              <div className="flex items-center justify-between mb-5">
                <h3 className="text-xl font-semibold tracking-tight text-slate-900">
                  Mục tiêu tuần
                </h3>
                <button className="text-slate-400">
                  <Plus className="w-5 h-5" />
                </button>
              </div>
              <div className="space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-medium text-slate-900">
                      Học 10 giờ
                    </p>
                    <span className="text-xs text-slate-500">7.2 / 10h</span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-2">
                    <div className="bg-purple-600 h-2 rounded-full" style={{ width: '72%' }}></div>
                  </div>
                </div>
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-medium text-slate-900">
                      Hoàn thành 5 bài
                    </p>
                    <span className="text-xs text-slate-500">4 / 5 bài</span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-2">
                    <div className="bg-emerald-500 h-2 rounded-full" style={{ width: '80%' }}></div>
                  </div>
                </div>
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-medium text-slate-900">
                      Đạt 1 chứng chỉ
                    </p>
                    <span className="text-xs text-slate-500">0 / 1</span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-2">
                    <div className="bg-amber-500 h-2 rounded-full" style={{ width: '0%' }}></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      
    </div>
  );
};

export default Reports;
