import React from 'react';
import { Bell, CalendarDays, CalendarX, ChevronLeft, ChevronRight, Clock, Info, MapPin, MoreHorizontal, Plus, Presentation, Radio, Ticket, Users, Video } from 'lucide-react';

const Events = () => {
  return (
    <div className="animate-fade-in-up">
      {/* Page header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl md:text-3xl font-semibold tracking-tight text-slate-900 mb-1">
              Sự kiện
            </h1>
            <p className="text-sm text-slate-500">
              Theo dõi các sự kiện, hội thảo và buổi học trực tiếp sắp tới.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
            <button
              className="flex-1 sm:flex-none bg-white border border-slate-200 text-slate-600 px-4 py-2.5 rounded-full text-sm font-medium inline-flex justify-center items-center gap-2">
              <CalendarDays className="w-4 h-4" />
              Tháng này
            </button>
            <button
              className="flex-1 sm:flex-none bg-purple-600 hover:bg-purple-700 text-white px-4 py-2.5 rounded-full text-sm font-medium inline-flex justify-center items-center gap-2">
              <Plus className="w-4 h-4" />
              Tạo sự kiện
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-2 mb-6 border-b border-slate-200 overflow-x-auto whitespace-nowrap [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
          <button className="px-4 py-2.5 text-sm font-medium text-purple-700 border-b-2 border-purple-600">
            Sắp tới
            <span className="ml-1 text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full">
              8
            </span>
          </button>
          <button className="px-4 py-2.5 text-sm text-slate-500 hover:text-slate-700">
            Đang diễn ra
            <span className="ml-1 text-xs bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full">
              2
            </span>
          </button>
          <button className="px-4 py-2.5 text-sm text-slate-500 hover:text-slate-700">
            Đã qua
            <span className="ml-1 text-xs bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full">
              12
            </span>
          </button>
          <button className="px-4 py-2.5 text-sm text-slate-500 hover:text-slate-700">
            Đã đăng ký
            <span className="ml-1 text-xs bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full">
              5
            </span>
          </button>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          <div className="xl:col-span-2 space-y-6 animate-fade-in-up">
            <div
              className="bg-gradient-to-r from-purple-100 via-purple-50 to-pink-50 rounded-2xl p-6 flex items-center justify-between overflow-hidden relative">
              <div className="relative z-10 max-w-md">
                <div
                  className="inline-flex items-center gap-2 bg-purple-600 text-white text-xs font-medium px-3 py-1 rounded-full mb-3">
                  <Radio className="w-3 h-3" />
                  SỰ KIỆN NỔI BẬT
                </div>
                <h2 className="text-xl md:text-2xl font-semibold tracking-tight text-purple-900 mb-2">
                  Design Summit 2025: Tương lai của Product Design
                </h2>
                <p className="text-sm text-slate-600 mb-4">
                  28 Tháng 11 · 09:00 - 17:00 · Hybrid · 12 diễn giả
                </p>
                <div className="flex flex-wrap items-center gap-3">
                  <button
                    className="bg-purple-600 hover:bg-purple-700 text-white px-5 py-2.5 rounded-full text-sm font-medium inline-flex items-center gap-2">
                    <Ticket className="w-4 h-4" />
                    Đăng ký ngay
                  </button>
                  <button
                    className="bg-white text-slate-700 px-5 py-2.5 rounded-full text-sm font-medium inline-flex items-center gap-2 border border-slate-200">
                    <Info className="w-4 h-4" />
                    Chi tiết
                  </button>
                </div>
              </div>
              <div className="hidden md:flex items-center justify-center w-56 h-40 relative">
                <div className="text-7xl">🎤</div>
                <div className="absolute top-2 right-6 text-3xl">✨</div>
                <div className="absolute bottom-2 left-2 text-2xl">🎟️</div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-white rounded-2xl p-5 border border-slate-100 transition-all duration-300 hover:shadow-lg hover:-translate-y-1">
                <div
                  className="relative aspect-video rounded-xl overflow-hidden bg-gradient-to-br from-amber-200 to-orange-300 mb-4 flex items-center justify-center">
                  <div className="text-6xl">🎨</div>
                  <span
                    className="absolute top-2 left-2 bg-white/90 text-slate-700 text-[10px] font-medium px-2 py-1 rounded-full">
                    Workshop
                  </span>
                  <span
                    className="absolute top-2 right-2 bg-purple-600 text-white text-[10px] font-medium px-2 py-1 rounded-full">
                    Trực tuyến
                  </span>
                </div>
                <p className="text-xs text-slate-400 mb-1">
                  Sophia Nguyễn · 22 Tháng 11
                </p>
                <h4 className="text-sm font-medium text-slate-900 mb-3">
                  Workshop: Thiết kế hệ thống Design Token
                </h4>
                <div className="flex items-center justify-between text-xs text-slate-500 mb-3">
                  <span className="inline-flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" />
                    14:00 - 16:30
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <Users className="w-3.5 h-3.5" />
                    120 đăng ký
                  </span>
                </div>
                <button
                  className="w-full text-xs font-medium text-purple-700 bg-purple-50 hover:bg-purple-100 py-2 rounded-lg">
                  Đăng ký tham gia
                </button>
              </div>

              <div className="bg-white rounded-2xl p-5 border border-slate-100 transition-all duration-300 hover:shadow-lg hover:-translate-y-1">
                <div
                  className="relative aspect-video rounded-xl overflow-hidden bg-gradient-to-br from-green-200 to-teal-300 mb-4 flex items-center justify-center">
                  <div className="text-6xl">💻</div>
                  <span
                    className="absolute top-2 left-2 bg-white/90 text-slate-700 text-[10px] font-medium px-2 py-1 rounded-full">
                    Webinar
                  </span>
                  <span
                    className="absolute top-2 right-2 bg-red-500 text-white text-[10px] font-medium px-2 py-1 rounded-full">
                    Live
                  </span>
                </div>
                <p className="text-xs text-slate-400 mb-1">Liam Trần · Hôm nay</p>
                <h4 className="text-sm font-medium text-slate-900 mb-3">
                  Xu hướng Frontend 2025: Frameworks &amp; AI
                </h4>
                <div className="flex items-center justify-between text-xs text-slate-500 mb-3">
                  <span className="inline-flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" />
                    19:00 - 20:30
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <Users className="w-3.5 h-3.5" />
                    340 đăng ký
                  </span>
                </div>
                <button className="w-full text-xs font-medium text-white bg-purple-600 hover:bg-purple-700 py-2 rounded-lg">
                  Tham gia ngay
                </button>
              </div>

              <div className="bg-white rounded-2xl p-5 border border-slate-100 transition-all duration-300 hover:shadow-lg hover:-translate-y-1">
                <div
                  className="relative aspect-video rounded-xl overflow-hidden bg-gradient-to-br from-blue-200 to-purple-300 mb-4 flex items-center justify-center">
                  <div className="text-6xl">🧩</div>
                  <span
                    className="absolute top-2 left-2 bg-white/90 text-slate-700 text-[10px] font-medium px-2 py-1 rounded-full">
                    Meetup
                  </span>
                  <span
                    className="absolute top-2 right-2 bg-amber-500 text-white text-[10px] font-medium px-2 py-1 rounded-full">
                    Offline
                  </span>
                </div>
                <p className="text-xs text-slate-400 mb-1">
                  Maya Patel · 30 Tháng 11
                </p>
                <h4 className="text-sm font-medium text-slate-900 mb-3">
                  Framer Vietnam Meetup #5: Prototyping
                </h4>
                <div className="flex items-center justify-between text-xs text-slate-500 mb-3">
                  <span className="inline-flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5" />
                    Hà Nội
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <Users className="w-3.5 h-3.5" />
                    60 chỗ
                  </span>
                </div>
                <button
                  className="w-full text-xs font-medium text-purple-700 bg-purple-50 hover:bg-purple-100 py-2 rounded-lg">
                  Đăng ký tham gia
                </button>
              </div>

              <div className="bg-white rounded-2xl p-5 border border-slate-100 transition-all duration-300 hover:shadow-lg hover:-translate-y-1">
                <div
                  className="relative aspect-video rounded-xl overflow-hidden bg-gradient-to-br from-pink-200 to-rose-300 mb-4 flex items-center justify-center">
                  <div className="text-6xl">📊</div>
                  <span
                    className="absolute top-2 left-2 bg-white/90 text-slate-700 text-[10px] font-medium px-2 py-1 rounded-full">
                    Hội thảo
                  </span>
                  <span
                    className="absolute top-2 right-2 bg-green-500 text-white text-[10px] font-medium px-2 py-1 rounded-full">
                    Mới
                  </span>
                </div>
                <p className="text-xs text-slate-400 mb-1">
                  Ethan Cruz · 05 Tháng 12
                </p>
                <h4 className="text-sm font-medium text-slate-900 mb-3">
                  Data Storytelling: Trình bày dữ liệu hiệu quả
                </h4>
                <div className="flex items-center justify-between text-xs text-slate-500 mb-3">
                  <span className="inline-flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" />
                    10:00 - 12:00
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <Users className="w-3.5 h-3.5" />
                    85 đăng ký
                  </span>
                </div>
                <button
                  className="w-full text-xs font-medium text-purple-700 bg-purple-50 hover:bg-purple-100 py-2 rounded-lg">
                  Đăng ký tham gia
                </button>
              </div>
            </div>

            <div className="bg-white rounded-2xl p-6 border border-slate-100 transition-all duration-300 hover:shadow-lg hover:-translate-y-1">
              <div className="flex items-center justify-between mb-5">
                <h3 className="text-xl font-semibold tracking-tight text-slate-900">
                  Sự kiện đã tham gia
                </h3>
                <button className="text-sm text-purple-600 font-medium">
                  Xem tất cả
                </button>
              </div>
              <div className="space-y-3">
                <div className="flex items-center gap-4 p-3 rounded-xl hover:bg-slate-50">
                  <div className="w-10 h-10 rounded-lg bg-orange-100 flex items-center justify-center shrink-0">
                    <Presentation className="w-5 h-5 text-orange-600" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-slate-900">
                      Talkshow: Career Path cho Designer
                    </p>
                    <p className="text-xs text-slate-400">
                      15 Tháng 11 · 90 phút
                    </p>
                  </div>
                  <span className="text-xs font-medium text-green-600 bg-green-50 px-3 py-1 rounded-full">
                    Đã tham gia
                  </span>
                </div>
                <div className="flex items-center gap-4 p-3 rounded-xl hover:bg-slate-50">
                  <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center shrink-0">
                    <Video className="w-5 h-5 text-blue-600" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-slate-900">
                      Webinar: Tailwind CSS Best Practices
                    </p>
                    <p className="text-xs text-slate-400">
                      08 Tháng 11 · 60 phút
                    </p>
                  </div>
                  <span className="text-xs font-medium text-green-600 bg-green-50 px-3 py-1 rounded-full">
                    Đã tham gia
                  </span>
                </div>
                <div className="flex items-center gap-4 p-3 rounded-xl hover:bg-slate-50">
                  <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center shrink-0">
                    <CalendarX className="w-5 h-5 text-slate-500" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-slate-900">
                      Workshop: Figma Auto Layout nâng cao
                    </p>
                    <p className="text-xs text-slate-400">
                      02 Tháng 11 · 120 phút
                    </p>
                  </div>
                  <span className="text-xs font-medium text-slate-500 bg-slate-100 px-3 py-1 rounded-full">
                    Bỏ lỡ
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="bg-white rounded-2xl p-6 border border-slate-100 transition-all duration-300 hover:shadow-lg hover:-translate-y-1">
              <div className="flex items-center justify-between mb-5">
                <h3 className="text-xl font-semibold tracking-tight text-slate-900">
                  Tháng 11, 2025
                </h3>
                <div className="flex items-center gap-1">
                  <button className="w-7 h-7 rounded-full hover:bg-slate-100 flex items-center justify-center">
                    <ChevronLeft className="w-4 h-4 text-slate-500" />
                  </button>
                  <button className="w-7 h-7 rounded-full hover:bg-slate-100 flex items-center justify-center">
                    <ChevronRight className="w-4 h-4 text-slate-500" />
                  </button>
                </div>
              </div>
              <div className="grid grid-cols-7 gap-1 text-center text-[10px] text-slate-400 mb-2">
                <span>T2</span>
                <span>T3</span>
                <span>T4</span>
                <span>T5</span>
                <span>T6</span>
                <span>T7</span>
                <span>CN</span>
              </div>
              <div className="grid grid-cols-7 gap-1 text-center text-xs">
                <span className="py-1.5 text-slate-300">27</span>
                <span className="py-1.5 text-slate-300">28</span>
                <span className="py-1.5 text-slate-300">29</span>
                <span className="py-1.5 text-slate-300">30</span>
                <span className="py-1.5 text-slate-300">31</span>
                <span className="py-1.5 text-slate-700">1</span>
                <span className="py-1.5 text-slate-700">2</span>
                <span className="py-1.5 text-slate-700">3</span>
                <span className="py-1.5 text-slate-700">4</span>
                <span className="py-1.5 text-slate-700">5</span>
                <span className="py-1.5 text-slate-700">6</span>
                <span className="py-1.5 text-slate-700">7</span>
                <span className="py-1.5 text-purple-700 font-medium bg-purple-50 rounded-full">
                  8
                </span>
                <span className="py-1.5 text-slate-700">9</span>
                <span className="py-1.5 text-slate-700">10</span>
                <span className="py-1.5 text-slate-700">11</span>
                <span className="py-1.5 text-slate-700">12</span>
                <span className="py-1.5 text-slate-700">13</span>
                <span className="py-1.5 text-slate-700">14</span>
                <span className="py-1.5 text-purple-700 font-medium bg-purple-50 rounded-full">
                  15
                </span>
                <span className="py-1.5 text-slate-700">16</span>
                <span className="py-1.5 text-slate-700">17</span>
                <span className="py-1.5 text-slate-700">18</span>
                <span className="py-1.5 text-white font-medium bg-purple-600 rounded-full">
                  19
                </span>
                <span className="py-1.5 text-slate-700">20</span>
                <span className="py-1.5 text-slate-700">21</span>
                <span className="py-1.5 text-purple-700 font-medium bg-purple-50 rounded-full">
                  22
                </span>
                <span className="py-1.5 text-slate-700">23</span>
                <span className="py-1.5 text-slate-700">24</span>
                <span className="py-1.5 text-slate-700">25</span>
                <span className="py-1.5 text-slate-700">26</span>
                <span className="py-1.5 text-slate-700">27</span>
                <span className="py-1.5 text-purple-700 font-medium bg-purple-50 rounded-full">
                  28
                </span>
                <span className="py-1.5 text-slate-700">29</span>
                <span className="py-1.5 text-purple-700 font-medium bg-purple-50 rounded-full">
                  30
                </span>
              </div>
            </div>

            <div className="bg-white rounded-2xl p-6 border border-slate-100 transition-all duration-300 hover:shadow-lg hover:-translate-y-1">
              <div className="flex items-center justify-between mb-5">
                <h3 className="text-xl font-semibold tracking-tight text-slate-900">
                  Lịch hôm nay
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
                      Họp nhóm thiết kế
                    </p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Sophia Nguyễn · 60 phút
                    </p>
                    <span className="inline-flex items-center gap-1 text-[10px] font-medium text-red-600 mt-2">
                      <span className="w-1.5 h-1.5 bg-red-500 rounded-full"></span>
                      Sắp diễn ra
                    </span>
                  </div>
                </div>
                <div className="flex gap-3">
                  <div className="flex flex-col items-center">
                    <span className="text-xs font-medium text-slate-500">
                      07:00
                    </span>
                    <span className="text-[10px] text-slate-400">PM</span>
                  </div>
                  <div className="flex-1 bg-slate-50 border-l-4 border-slate-300 rounded-lg p-3">
                    <p className="text-sm font-medium text-slate-900">
                      Webinar: Frontend 2025
                    </p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Liam Trần · 90 phút
                    </p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <div className="flex flex-col items-center">
                    <span className="text-xs font-medium text-slate-500">
                      09:00
                    </span>
                    <span className="text-[10px] text-slate-400">PM</span>
                  </div>
                  <div className="flex-1 bg-slate-50 border-l-4 border-slate-300 rounded-lg p-3">
                    <p className="text-sm font-medium text-slate-900">
                      Networking Online
                    </p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Cộng đồng · 45 phút
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl p-6 border border-slate-100 transition-all duration-300 hover:shadow-lg hover:-translate-y-1">
              <div className="flex items-center justify-between mb-5">
                <h3 className="text-xl font-semibold tracking-tight text-slate-900">
                  Diễn giả nổi bật
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
                    <p className="text-xs text-slate-400">3 sự kiện sắp tới</p>
                  </div>
                  <button className="w-8 h-8 rounded-full bg-slate-50 hover:bg-slate-100 flex items-center justify-center">
                    <Bell className="w-4 h-4 text-slate-500" />
                  </button>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-300 to-cyan-300"></div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-slate-900">
                      Liam Trần
                    </p>
                    <p className="text-xs text-slate-400">2 sự kiện sắp tới</p>
                  </div>
                  <button className="w-8 h-8 rounded-full bg-slate-50 hover:bg-slate-100 flex items-center justify-center">
                    <Bell className="w-4 h-4 text-slate-500" />
                  </button>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-300 to-pink-300"></div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-slate-900">
                      Maya Patel
                    </p>
                    <p className="text-xs text-slate-400">1 sự kiện sắp tới</p>
                  </div>
                  <button className="w-8 h-8 rounded-full bg-slate-50 hover:bg-slate-100 flex items-center justify-center">
                    <Bell className="w-4 h-4 text-slate-500" />
                  </button>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-300 to-red-300"></div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-slate-900">
                      Ethan Cruz
                    </p>
                    <p className="text-xs text-slate-400">2 sự kiện sắp tới</p>
                  </div>
                  <button className="w-8 h-8 rounded-full bg-slate-50 hover:bg-slate-100 flex items-center justify-center">
                    <Bell className="w-4 h-4 text-slate-500" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      
    </div>
  );
};

export default Events;
