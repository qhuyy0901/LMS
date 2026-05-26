import { CheckCircle2, Clock, Code2, FileText, Filter, MessageCircle, MoreHorizontal, Plus, Users, Video } from 'lucide-react';

const MyClasses = () => {
  return (
    <div className="animate-fade-in-up">
      {/* Page header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl md:text-3xl font-semibold tracking-tight text-slate-900 mb-1">
              Lớp của tôi
            </h1>
            <p className="text-sm text-slate-500">
              Quản lý các lớp học bạn đang tham gia và lịch học sắp tới.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              className="bg-white border border-slate-200 text-slate-600 px-4 py-2.5 rounded-full text-sm font-medium inline-flex items-center gap-2">
              <Filter className="w-4 h-4" />
              Bộ lọc
            </button>
            <button
              className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2.5 rounded-full text-sm font-medium inline-flex items-center gap-2">
              <Plus className="w-4 h-4" />
              Tham gia lớp
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-2 mb-6 border-b border-slate-200">
          <button className="px-4 py-2.5 text-sm font-medium text-purple-700 border-b-2 border-purple-600">
            Đang học
            <span className="ml-1 text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full">
              6
            </span>
          </button>
          <button className="px-4 py-2.5 text-sm text-slate-500 hover:text-slate-700">
            Sắp tới
            <span className="ml-1 text-xs bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full">
              3
            </span>
          </button>
          <button className="px-4 py-2.5 text-sm text-slate-500 hover:text-slate-700">
            Đã hoàn thành
            <span className="ml-1 text-xs bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full">
              12
            </span>
          </button>
          <button className="px-4 py-2.5 text-sm text-slate-500 hover:text-slate-700">
            Đã lưu trữ
          </button>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          {/* Main column */}
          <div className="xl:col-span-2 space-y-6">
            {/* Live Now banner */}
            <div
              className="bg-gradient-to-r from-purple-100 via-purple-50 to-pink-50 rounded-2xl p-6 flex items-center justify-between overflow-hidden relative">
              <div className="relative z-10 max-w-md">
                <div
                  className="inline-flex items-center gap-2 bg-red-500 text-white text-xs font-medium px-3 py-1 rounded-full mb-3">
                  <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse"></span>
                  ĐANG TRỰC TIẾP
                </div>
                <h2 className="text-xl md:text-2xl font-semibold tracking-tight text-purple-900 mb-2">
                  Hệ thống thiết kế nâng cao với Figma
                </h2>
                <p className="text-sm text-slate-600 mb-4">
                  Giảng viên: Sophia Nguyễn · Bắt đầu lúc 10:00 AM
                </p>
                <div className="flex items-center gap-3">
                  <button
                    className="bg-purple-600 hover:bg-purple-700 text-white px-5 py-2.5 rounded-full text-sm font-medium inline-flex items-center gap-2">
                    <Video className="w-4 h-4" />
                    Tham gia ngay
                  </button>
                  <div className="flex items-center -space-x-2">
                    <div
                      className="w-8 h-8 rounded-full bg-gradient-to-br from-pink-300 to-orange-300 border-2 border-white">
                    </div>
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-300 to-cyan-300 border-2 border-white">
                    </div>
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-amber-300 to-red-300 border-2 border-white">
                    </div>
                    <div
                      className="w-8 h-8 rounded-full bg-white border-2 border-white text-[10px] font-medium text-slate-600 flex items-center justify-center">
                      +24
                    </div>
                  </div>
                </div>
              </div>
              <div className="hidden md:flex items-center justify-center w-56 h-40 relative">
                <div className="text-7xl">👩‍🏫</div>
                <div className="absolute top-2 right-6 text-3xl">🎨</div>
                <div className="absolute bottom-2 left-2 text-2xl">💡</div>
              </div>
            </div>

            {/* Class cards grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-white rounded-2xl p-5 border border-slate-100 transition-all duration-300 hover:shadow-lg hover:-translate-y-1">
                <div
                  className="relative aspect-video rounded-xl overflow-hidden bg-gradient-to-br from-amber-200 to-orange-300 mb-4 flex items-center justify-center">
                  <div className="text-6xl">🎨</div>
                  <span
                    className="absolute top-2 left-2 bg-white/90 text-slate-700 text-[10px] font-medium px-2 py-1 rounded-full">
                    UI/UX
                  </span>
                  <span
                    className="absolute top-2 right-2 bg-purple-600 text-white text-[10px] font-medium px-2 py-1 rounded-full">
                    Đang học
                  </span>
                </div>
                <p className="text-xs text-slate-400 mb-1">Sophia Nguyễn</p>
                <h4 className="text-sm font-medium text-slate-900 mb-3">
                  Làm chủ UI &amp; UX: Thiết kế ứng dụng đầu tiên
                </h4>
                <div className="flex items-center justify-between text-xs text-slate-500 mb-3">
                  <span className="inline-flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" />
                    12 buổi
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <Users className="w-3.5 h-3.5" />
                    48 học viên
                  </span>
                </div>
                <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden mb-2">
                  <div className="h-full w-3/4 bg-purple-500 rounded-full"></div>
                </div>
                <p className="text-xs text-slate-500">Tiến độ 75%</p>
              </div>

              <div className="bg-white rounded-2xl p-5 border border-slate-100 transition-all duration-300 hover:shadow-lg hover:-translate-y-1">
                <div
                  className="relative aspect-video rounded-xl overflow-hidden bg-gradient-to-br from-green-200 to-teal-300 mb-4 flex items-center justify-center">
                  <div className="text-6xl">💻</div>
                  <span
                    className="absolute top-2 left-2 bg-white/90 text-slate-700 text-[10px] font-medium px-2 py-1 rounded-full">
                    Web Dev
                  </span>
                  <span
                    className="absolute top-2 right-2 bg-purple-600 text-white text-[10px] font-medium px-2 py-1 rounded-full">
                    Đang học
                  </span>
                </div>
                <p className="text-xs text-slate-400 mb-1">Liam Trần</p>
                <h4 className="text-sm font-medium text-slate-900 mb-3">
                  Thiết kế web đáp ứng từ A đến Z
                </h4>
                <div className="flex items-center justify-between text-xs text-slate-500 mb-3">
                  <span className="inline-flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" />
                    18 buổi
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <Users className="w-3.5 h-3.5" />
                    72 học viên
                  </span>
                </div>
                <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden mb-2">
                  <div className="h-full w-1/2 bg-purple-500 rounded-full"></div>
                </div>
                <p className="text-xs text-slate-500">Tiến độ 50%</p>
              </div>

              <div className="bg-white rounded-2xl p-5 border border-slate-100 transition-all duration-300 hover:shadow-lg hover:-translate-y-1">
                <div
                  className="relative aspect-video rounded-xl overflow-hidden bg-gradient-to-br from-blue-200 to-purple-300 mb-4 flex items-center justify-center">
                  <div className="text-6xl">🧩</div>
                  <span
                    className="absolute top-2 left-2 bg-white/90 text-slate-700 text-[10px] font-medium px-2 py-1 rounded-full">
                    Framer
                  </span>
                  <span
                    className="absolute top-2 right-2 bg-amber-500 text-white text-[10px] font-medium px-2 py-1 rounded-full">
                    Sắp tới
                  </span>
                </div>
                <p className="text-xs text-slate-400 mb-1">Maya Patel</p>
                <h4 className="text-sm font-medium text-slate-900 mb-3">
                  Xây dựng nguyên mẫu tương tác chuyên nghiệp
                </h4>
                <div className="flex items-center justify-between text-xs text-slate-500 mb-3">
                  <span className="inline-flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" />
                    8 buổi
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <Users className="w-3.5 h-3.5" />
                    36 học viên
                  </span>
                </div>
                <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden mb-2">
                  <div className="h-full w-1/4 bg-purple-500 rounded-full"></div>
                </div>
                <p className="text-xs text-slate-500">Tiến độ 25%</p>
              </div>

              <div className="bg-white rounded-2xl p-5 border border-slate-100 transition-all duration-300 hover:shadow-lg hover:-translate-y-1">
                <div
                  className="relative aspect-video rounded-xl overflow-hidden bg-gradient-to-br from-pink-200 to-rose-300 mb-4 flex items-center justify-center">
                  <div className="text-6xl">📊</div>
                  <span
                    className="absolute top-2 left-2 bg-white/90 text-slate-700 text-[10px] font-medium px-2 py-1 rounded-full">
                    Data
                  </span>
                  <span
                    className="absolute top-2 right-2 bg-green-500 text-white text-[10px] font-medium px-2 py-1 rounded-full">
                    Mới
                  </span>
                </div>
                <p className="text-xs text-slate-400 mb-1">Ethan Cruz</p>
                <h4 className="text-sm font-medium text-slate-900 mb-3">
                  Phân tích dữ liệu với Python cơ bản
                </h4>
                <div className="flex items-center justify-between text-xs text-slate-500 mb-3">
                  <span className="inline-flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" />
                    16 buổi
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <Users className="w-3.5 h-3.5" />
                    54 học viên
                  </span>
                </div>
                <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden mb-2">
                  <div className="h-full w-[10%] bg-purple-500 rounded-full"></div>
                </div>
                <p className="text-xs text-slate-500">Tiến độ 10%</p>
              </div>
            </div>

            {/* Assignments table */}
            <div className="bg-white rounded-2xl p-6 border border-slate-100 transition-all duration-300 hover:shadow-lg hover:-translate-y-1">
              <div className="flex items-center justify-between mb-5">
                <h3 className="text-xl font-semibold tracking-tight text-slate-900">
                  Bài tập sắp đến hạn
                </h3>
                <button className="text-sm text-purple-600 font-medium">
                  Xem tất cả
                </button>
              </div>
              <div className="space-y-3">
                <div className="flex items-center gap-4 p-3 rounded-xl hover:bg-slate-50">
                  <div className="w-10 h-10 rounded-lg bg-orange-100 flex items-center justify-center shrink-0">
                    <FileText className="w-5 h-5 text-orange-600" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-slate-900">
                      Bài tập Wireframe — Ứng dụng Mobile
                    </p>
                    <p className="text-xs text-slate-400">
                      UI/UX Cơ bản · Còn 2 ngày
                    </p>
                  </div>
                  <span className="text-xs font-medium text-orange-600 bg-orange-50 px-3 py-1 rounded-full">
                    Sắp hết hạn
                  </span>
                </div>
                <div className="flex items-center gap-4 p-3 rounded-xl hover:bg-slate-50">
                  <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center shrink-0">
                    <Code2 className="w-5 h-5 text-blue-600" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-slate-900">
                      Dự án Landing Page CSS Grid
                    </p>
                    <p className="text-xs text-slate-400">Web Dev · Còn 5 ngày</p>
                  </div>
                  <span className="text-xs font-medium text-slate-600 bg-slate-100 px-3 py-1 rounded-full">
                    Đang làm
                  </span>
                </div>
                <div className="flex items-center gap-4 p-3 rounded-xl hover:bg-slate-50">
                  <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center shrink-0">
                    <CheckCircle2 className="w-5 h-5 text-green-600" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-slate-900">
                      Trắc nghiệm UX Sprint
                    </p>
                    <p className="text-xs text-slate-400">UX Research · Đã nộp</p>
                  </div>
                  <span className="text-xs font-medium text-green-600 bg-green-50 px-3 py-1 rounded-full">
                    Hoàn thành
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Right column */}
          <div className="space-y-6">
            {/* Schedule */}
            <div className="bg-white rounded-2xl p-6 border border-slate-100 transition-all duration-300 hover:shadow-lg hover:-translate-y-1">
              <div className="flex items-center justify-between mb-5">
                <h3 className="text-xl font-semibold tracking-tight text-slate-900">
                  Lịch học hôm nay
                </h3>
                <button className="text-slate-400">
                  <MoreHorizontal className="w-5 h-5" />
                </button>
              </div>
              <div className="space-y-4">
                <div className="flex gap-3">
                  <div className="flex flex-col items-center">
                    <span className="text-xs font-medium text-slate-500">
                      10:00
                    </span>
                    <span className="text-[10px] text-slate-400">AM</span>
                  </div>
                  <div className="flex-1 bg-purple-50 border-l-4 border-purple-500 rounded-lg p-3">
                    <p className="text-sm font-medium text-slate-900">
                      Hệ thống thiết kế Figma
                    </p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Sophia Nguyễn · 90 phút
                    </p>
                    <span className="inline-flex items-center gap-1 text-[10px] font-medium text-red-600 mt-2">
                      <span className="w-1.5 h-1.5 bg-red-500 rounded-full"></span>
                      Đang trực tiếp
                    </span>
                  </div>
                </div>
                <div className="flex gap-3">
                  <div className="flex flex-col items-center">
                    <span className="text-xs font-medium text-slate-500">
                      01:30
                    </span>
                    <span className="text-[10px] text-slate-400">PM</span>
                  </div>
                  <div className="flex-1 bg-slate-50 border-l-4 border-slate-300 rounded-lg p-3">
                    <p className="text-sm font-medium text-slate-900">
                      CSS Grid &amp; Flexbox
                    </p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Liam Trần · 60 phút
                    </p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <div className="flex flex-col items-center">
                    <span className="text-xs font-medium text-slate-500">
                      04:00
                    </span>
                    <span className="text-[10px] text-slate-400">PM</span>
                  </div>
                  <div className="flex-1 bg-slate-50 border-l-4 border-slate-300 rounded-lg p-3">
                    <p className="text-sm font-medium text-slate-900">
                      Workshop Framer
                    </p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Maya Patel · 45 phút
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Instructors */}
            <div className="bg-white rounded-2xl p-6 border border-slate-100 transition-all duration-300 hover:shadow-lg hover:-translate-y-1">
              <div className="flex items-center justify-between mb-5">
                <h3 className="text-xl font-semibold tracking-tight text-slate-900">
                  Giảng viên của bạn
                </h3>
                <button className="text-sm text-purple-600 font-medium">
                  Xem tất cả
                </button>
              </div>
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-pink-300 to-orange-300"></div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-slate-900">
                      Sophia Nguyễn
                    </p>
                    <p className="text-xs text-slate-400">UI/UX Designer</p>
                  </div>
                  <button className="w-8 h-8 rounded-full bg-slate-50 hover:bg-slate-100 flex items-center justify-center">
                    <MessageCircle className="w-4 h-4 text-slate-500" />
                  </button>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-300 to-cyan-300"></div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-slate-900">
                      Liam Trần
                    </p>
                    <p className="text-xs text-slate-400">Frontend Engineer</p>
                  </div>
                  <button className="w-8 h-8 rounded-full bg-slate-50 hover:bg-slate-100 flex items-center justify-center">
                    <MessageCircle className="w-4 h-4 text-slate-500" />
                  </button>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-300 to-pink-300"></div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-slate-900">
                      Maya Patel
                    </p>
                    <p className="text-xs text-slate-400">Product Designer</p>
                  </div>
                  <button className="w-8 h-8 rounded-full bg-slate-50 hover:bg-slate-100 flex items-center justify-center">
                    <MessageCircle className="w-4 h-4 text-slate-500" />
                  </button>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-300 to-red-300"></div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-slate-900">
                      Ethan Cruz
                    </p>
                    <p className="text-xs text-slate-400">Data Scientist</p>
                  </div>
                  <button className="w-8 h-8 rounded-full bg-slate-50 hover:bg-slate-100 flex items-center justify-center">
                    <MessageCircle className="w-4 h-4 text-slate-500" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      
    </div>
  );
};

export default MyClasses;
