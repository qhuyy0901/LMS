import React from 'react';
import { ArrowUpDown, BadgeCheck, BookOpen, CalendarPlus, Filter, GraduationCap, MessageCircle, Star, UserPlus, Users } from 'lucide-react';

const Instructors = () => {
  return (
    <div className="animate-fade-in-up">
      {/* Page header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl md:text-3xl font-semibold tracking-tight text-slate-900 mb-1">
              Giảng viên
            </h1>
            <p className="text-sm text-slate-500">
              Khám phá đội ngũ giảng viên hàng đầu và kết nối với chuyên gia
              phù hợp với bạn.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              className="bg-white border border-slate-200 text-slate-600 px-4 py-2.5 rounded-full text-sm font-medium inline-flex items-center gap-2">
              <Filter className="w-4 h-4" />
              Bộ lọc
            </button>
            <button
              className="bg-white border border-slate-200 text-slate-600 px-4 py-2.5 rounded-full text-sm font-medium inline-flex items-center gap-2">
              <ArrowUpDown className="w-4 h-4" />
              Sắp xếp
            </button>
            <button
              className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2.5 rounded-full text-sm font-medium inline-flex items-center gap-2">
              <UserPlus className="w-4 h-4" />
              Mời giảng viên
            </button>
          </div>
        </div>

        {/* Categories */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-2xl p-5 border border-slate-100 transition-all duration-300 hover:shadow-lg hover:-translate-y-1">
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center">
                <Users className="w-5 h-5 text-purple-600" />
              </div>
              <span className="text-xs font-medium text-green-600 bg-green-50 px-2 py-0.5 rounded-full">
                +8
              </span>
            </div>
            <p className="text-xs text-slate-400 mb-1">Tổng giảng viên</p>
            <p className="text-2xl font-semibold tracking-tight text-slate-900">
              142
            </p>
          </div>
          <div className="bg-white rounded-2xl p-5 border border-slate-100 transition-all duration-300 hover:shadow-lg hover:-translate-y-1">
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center">
                <BadgeCheck className="w-5 h-5 text-amber-600" />
              </div>
              <span className="text-xs font-medium text-green-600 bg-green-50 px-2 py-0.5 rounded-full">
                +3
              </span>
            </div>
            <p className="text-xs text-slate-400 mb-1">Chuyên gia xác thực</p>
            <p className="text-2xl font-semibold tracking-tight text-slate-900">
              38
            </p>
          </div>
          <div className="bg-white rounded-2xl p-5 border border-slate-100 transition-all duration-300 hover:shadow-lg hover:-translate-y-1">
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center">
                <Star className="w-5 h-5 text-emerald-600" />
              </div>
              <span className="text-xs font-medium text-green-600 bg-green-50 px-2 py-0.5 rounded-full">
                +0.2
              </span>
            </div>
            <p className="text-xs text-slate-400 mb-1">Đánh giá trung bình</p>
            <p className="text-2xl font-semibold tracking-tight text-slate-900">
              4.8/5
            </p>
          </div>
          <div className="bg-white rounded-2xl p-5 border border-slate-100 transition-all duration-300 hover:shadow-lg hover:-translate-y-1">
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 rounded-xl bg-pink-100 flex items-center justify-center">
                <GraduationCap className="w-5 h-5 text-pink-600" />
              </div>
              <span className="text-xs font-medium text-green-600 bg-green-50 px-2 py-0.5 rounded-full">
                +12%
              </span>
            </div>
            <p className="text-xs text-slate-400 mb-1">Học viên đang dạy</p>
            <p className="text-2xl font-semibold tracking-tight text-slate-900">
              8.4K
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          <div className="xl:col-span-2 space-y-6 animate-fade-in-up">
            {/* Featured instructor */}
            <div className="bg-white rounded-2xl p-6 border border-slate-100 transition-all duration-300 hover:shadow-lg hover:-translate-y-1">
              <div className="flex items-center justify-between mb-5">
                <div>
                  <h3 className="text-xl font-semibold tracking-tight text-slate-900">
                    Giảng viên nổi bật
                  </h3>
                  <p className="text-xs text-slate-400 mt-1">
                    Top giảng viên được học viên yêu thích nhất tháng này
                  </p>
                </div>
                <button className="text-sm text-purple-600 font-medium">
                  Xem tất cả
                </button>
              </div>
              <div
                className="flex flex-col md:flex-row items-start gap-5 p-5 rounded-2xl bg-gradient-to-br from-purple-50 to-pink-50 border border-purple-100">
                <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-pink-300 to-purple-400 shrink-0"></div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="text-lg font-semibold tracking-tight text-slate-900">
                      Sophia Nguyễn
                    </h4>
                    <span
                      className="text-xs font-medium text-purple-700 bg-white px-2 py-0.5 rounded-full inline-flex items-center gap-1">
                      <BadgeCheck className="w-3 h-3" />
                      Pro
                    </span>
                  </div>
                  <p className="text-sm text-slate-600 mb-3">
                    Lead Designer @ Figma · 12 năm kinh nghiệm thiết kế Design
                    System cho các SaaS quy mô lớn.
                  </p>
                  <div className="flex flex-wrap items-center gap-4 text-sm">
                    <span className="inline-flex items-center gap-1.5 text-slate-700">
                      <Star className="w-4 h-4 text-amber-500" />
                      <span className="font-semibold">4.9</span>
                      <span className="text-slate-400">(2.4k)</span>
                    </span>
                    <span className="inline-flex items-center gap-1.5 text-slate-700">
                      <Users className="w-4 h-4 text-slate-400" />
                      18.2K học viên
                    </span>
                    <span className="inline-flex items-center gap-1.5 text-slate-700">
                      <BookOpen className="w-4 h-4 text-slate-400" />
                      14 khóa học
                    </span>
                  </div>
                </div>
                <button
                  className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2.5 rounded-full text-sm font-medium inline-flex items-center gap-2">
                  <UserPlus className="w-4 h-4" />
                  Theo dõi
                </button>
              </div>
            </div>

            {/* Instructor list */}
            <div className="bg-white rounded-2xl p-6 border border-slate-100 transition-all duration-300 hover:shadow-lg hover:-translate-y-1">
              <div className="flex items-center justify-between mb-5">
                <h3 className="text-xl font-semibold tracking-tight text-slate-900">
                  Tất cả giảng viên
                </h3>
                <div className="flex items-center gap-1 bg-slate-100 rounded-full p-1">
                  <button className="px-3 py-1 rounded-full text-xs font-medium bg-white text-slate-700 shadow-sm">
                    Tất cả
                  </button>
                  <button className="px-3 py-1 rounded-full text-xs text-slate-500">
                    Design
                  </button>
                  <button className="px-3 py-1 rounded-full text-xs text-slate-500">
                    Code
                  </button>
                  <button className="px-3 py-1 rounded-full text-xs text-slate-500">
                    Data
                  </button>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div
                  className="p-4 rounded-xl border border-slate-100 hover:border-purple-200 hover:bg-purple-50/30 transition">
                  <div className="flex items-start gap-3 mb-3">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-300 to-cyan-300 shrink-0"></div>
                    <div className="flex-1">
                      <div className="flex items-center gap-1.5">
                        <p className="text-sm font-semibold text-slate-900">
                          Liam Trần
                        </p>
                        <BadgeCheck className="w-3.5 h-3.5 text-purple-600" />
                      </div>
                      <p className="text-xs text-slate-400">
                        Senior Engineer @ Vercel
                      </p>
                    </div>
                    <button className="text-xs font-medium text-purple-600">
                      Xem
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-1.5 mb-3">
                    <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700">
                      Next.js
                    </span>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-blue-50 text-blue-700">
                      TypeScript
                    </span>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                      +3
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-slate-500">
                    <span className="inline-flex items-center gap-1">
                      <Star className="w-3 h-3 text-amber-500" />
                      4.8
                    </span>
                    <span>·</span>
                    <span>12.5K học viên</span>
                    <span>·</span>
                    <span>9 khóa</span>
                  </div>
                </div>
                <div
                  className="p-4 rounded-xl border border-slate-100 hover:border-purple-200 hover:bg-purple-50/30 transition">
                  <div className="flex items-start gap-3 mb-3">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-300 to-pink-300 shrink-0"></div>
                    <div className="flex-1">
                      <div className="flex items-center gap-1.5">
                        <p className="text-sm font-semibold text-slate-900">
                          Maya Patel
                        </p>
                        <BadgeCheck className="w-3.5 h-3.5 text-purple-600" />
                      </div>
                      <p className="text-xs text-slate-400">
                        Head of Growth @ Notion
                      </p>
                    </div>
                    <button className="text-xs font-medium text-purple-600">
                      Xem
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-1.5 mb-3">
                    <span className="text-xs px-2 py-0.5 rounded-full bg-blue-50 text-blue-700">
                      Marketing
                    </span>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-pink-50 text-pink-700">
                      SEO
                    </span>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                      +2
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-slate-500">
                    <span className="inline-flex items-center gap-1">
                      <Star className="w-3 h-3 text-amber-500" />
                      4.7
                    </span>
                    <span>·</span>
                    <span>9.1K học viên</span>
                    <span>·</span>
                    <span>7 khóa</span>
                  </div>
                </div>
                <div
                  className="p-4 rounded-xl border border-slate-100 hover:border-purple-200 hover:bg-purple-50/30 transition">
                  <div className="flex items-start gap-3 mb-3">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-300 to-red-300 shrink-0"></div>
                    <div className="flex-1">
                      <div className="flex items-center gap-1.5">
                        <p className="text-sm font-semibold text-slate-900">
                          Ethan Cruz
                        </p>
                      </div>
                      <p className="text-xs text-slate-400">
                        Data Scientist @ Stripe
                      </p>
                    </div>
                    <button className="text-xs font-medium text-purple-600">
                      Xem
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-1.5 mb-3">
                    <span className="text-xs px-2 py-0.5 rounded-full bg-pink-50 text-pink-700">
                      Python
                    </span>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-amber-50 text-amber-700">
                      Pandas
                    </span>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                      +4
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-slate-500">
                    <span className="inline-flex items-center gap-1">
                      <Star className="w-3 h-3 text-amber-500" />
                      4.9
                    </span>
                    <span>·</span>
                    <span>15.3K học viên</span>
                    <span>·</span>
                    <span>11 khóa</span>
                  </div>
                </div>
                <div
                  className="p-4 rounded-xl border border-slate-100 hover:border-purple-200 hover:bg-purple-50/30 transition">
                  <div className="flex items-start gap-3 mb-3">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-pink-300 to-orange-300 shrink-0"></div>
                    <div className="flex-1">
                      <div className="flex items-center gap-1.5">
                        <p className="text-sm font-semibold text-slate-900">
                          Ava Lee
                        </p>
                        <BadgeCheck className="w-3.5 h-3.5 text-purple-600" />
                      </div>
                      <p className="text-xs text-slate-400">
                        Product Designer @ Linear
                      </p>
                    </div>
                    <button className="text-xs font-medium text-purple-600">
                      Xem
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-1.5 mb-3">
                    <span className="text-xs px-2 py-0.5 rounded-full bg-purple-50 text-purple-700">
                      UI/UX
                    </span>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700">
                      Figma
                    </span>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                      +2
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-slate-500">
                    <span className="inline-flex items-center gap-1">
                      <Star className="w-3 h-3 text-amber-500" />
                      4.8
                    </span>
                    <span>·</span>
                    <span>7.6K học viên</span>
                    <span>·</span>
                    <span>6 khóa</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Top categories */}
            <div className="bg-white rounded-2xl p-6 border border-slate-100 transition-all duration-300 hover:shadow-lg hover:-translate-y-1">
              <div className="flex items-center justify-between mb-5">
                <div>
                  <h3 className="text-xl font-semibold tracking-tight text-slate-900">
                    Lĩnh vực giảng dạy
                  </h3>
                  <p className="text-xs text-slate-400 mt-1">
                    Số lượng giảng viên theo từng lĩnh vực
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 rounded-xl border border-slate-100">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-slate-900">
                      Design &amp; Sáng tạo
                    </span>
                    <span className="text-xs font-medium text-purple-700 bg-purple-50 px-2 py-0.5 rounded-full">
                      42 GV
                    </span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-1.5 mb-1">
                    <div className="bg-purple-600 h-1.5 rounded-full" style={{ width: '88%' }}></div>
                  </div>
                  <p className="text-xs text-slate-400">29.6% tổng số</p>
                </div>
                <div className="p-4 rounded-xl border border-slate-100">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-slate-900">
                      Lập trình
                    </span>
                    <span className="text-xs font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
                      38 GV
                    </span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-1.5 mb-1">
                    <div className="bg-emerald-500 h-1.5 rounded-full" style={{ width: '78%' }}></div>
                  </div>
                  <p className="text-xs text-slate-400">26.8% tổng số</p>
                </div>
                <div className="p-4 rounded-xl border border-slate-100">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-slate-900">
                      Dữ liệu &amp; AI
                    </span>
                    <span className="text-xs font-medium text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full">
                      28 GV
                    </span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-1.5 mb-1">
                    <div className="bg-blue-500 h-1.5 rounded-full" style={{ width: '58%' }}></div>
                  </div>
                  <p className="text-xs text-slate-400">19.7% tổng số</p>
                </div>
                <div className="p-4 rounded-xl border border-slate-100">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-slate-900">
                      Marketing
                    </span>
                    <span className="text-xs font-medium text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full">
                      22 GV
                    </span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-1.5 mb-1">
                    <div className="bg-amber-500 h-1.5 rounded-full" style={{ width: '45%' }}></div>
                  </div>
                  <p className="text-xs text-slate-400">15.5% tổng số</p>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            {/* Top of the month */}
            <div
              className="bg-gradient-to-br from-purple-600 to-purple-800 rounded-2xl p-6 text-white relative overflow-hidden">
              <div className="absolute top-0 right-0 text-7xl opacity-20">🏅</div>
              <div className="relative">
                <p className="text-xs text-purple-200 mb-1">
                  Giảng viên của tháng
                </p>
                <p className="text-3xl font-semibold tracking-tight mb-2">
                  Sophia Nguyễn
                </p>
                <p className="text-sm text-purple-100 mb-4">
                  Đạt điểm đánh giá 4.9 với hơn 2.400 lượt nhận xét trong
                  tháng này.
                </p>
                <div className="flex items-center gap-2">
                  <button className="bg-white text-purple-700 px-4 py-2 rounded-full text-sm font-medium">
                    Xem hồ sơ
                  </button>
                  <button
                    className="bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-full text-sm font-medium inline-flex items-center gap-1.5">
                    <MessageCircle className="w-4 h-4" />
                    Nhắn tin
                  </button>
                </div>
              </div>
            </div>

            {/* Suggestions */}
            <div className="bg-white rounded-2xl p-6 border border-slate-100 transition-all duration-300 hover:shadow-lg hover:-translate-y-1">
              <div className="flex items-center justify-between mb-5">
                <h3 className="text-xl font-semibold tracking-tight text-slate-900">
                  Đề xuất cho bạn
                </h3>
                <button className="text-sm text-purple-600 font-medium">
                  Tất cả
                </button>
              </div>
              <div className="space-y-3">
                <div className="flex items-center gap-3 p-3 rounded-xl hover:bg-slate-50">
                  <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-300 to-cyan-300 shrink-0"></div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-slate-900">Noah Kim</p>
                    <p className="text-xs text-slate-400">
                      Backend · Go &amp; Rust
                    </p>
                  </div>
                  <button className="text-xs font-medium text-purple-600 bg-purple-50 px-3 py-1 rounded-full">
                    + Theo dõi
                  </button>
                </div>
                <div className="flex items-center gap-3 p-3 rounded-xl hover:bg-slate-50">
                  <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-emerald-300 to-teal-300 shrink-0"></div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-slate-900">
                      Olivia Hà
                    </p>
                    <p className="text-xs text-slate-400">Product Manager</p>
                  </div>
                  <button className="text-xs font-medium text-purple-600 bg-purple-50 px-3 py-1 rounded-full">
                    + Theo dõi
                  </button>
                </div>
                <div className="flex items-center gap-3 p-3 rounded-xl hover:bg-slate-50">
                  <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-amber-300 to-yellow-300 shrink-0"></div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-slate-900">
                      Daniel Vũ
                    </p>
                    <p className="text-xs text-slate-400">Mobile · Flutter</p>
                  </div>
                  <button className="text-xs font-medium text-purple-600 bg-purple-50 px-3 py-1 rounded-full">
                    + Theo dõi
                  </button>
                </div>
                <div className="flex items-center gap-3 p-3 rounded-xl hover:bg-slate-50">
                  <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-pink-300 to-rose-300 shrink-0"></div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-slate-900">
                      Chloe Đặng
                    </p>
                    <p className="text-xs text-slate-400">UX Research</p>
                  </div>
                  <button className="text-xs font-medium text-purple-600 bg-purple-50 px-3 py-1 rounded-full">
                    + Theo dõi
                  </button>
                </div>
              </div>
            </div>

            {/* Office hours */}
            <div className="bg-white rounded-2xl p-6 border border-slate-100 transition-all duration-300 hover:shadow-lg hover:-translate-y-1">
              <div className="flex items-center justify-between mb-5">
                <h3 className="text-xl font-semibold tracking-tight text-slate-900">
                  Giờ tư vấn sắp tới
                </h3>
                <button className="text-slate-400">
                  <CalendarPlus className="w-5 h-5" />
                </button>
              </div>
              <div className="space-y-3">
                <div className="flex items-center gap-3 p-3 rounded-xl border border-slate-100">
                  <div className="w-12 text-center shrink-0">
                    <p className="text-xs text-slate-400">T5</p>
                    <p className="text-lg font-semibold tracking-tight text-slate-900">
                      14
                    </p>
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-slate-900">
                      Q&amp;A Design System
                    </p>
                    <p className="text-xs text-slate-400">
                      Sophia Nguyễn · 19:00
                    </p>
                  </div>
                  <span className="text-xs font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
                    Live
                  </span>
                </div>
                <div className="flex items-center gap-3 p-3 rounded-xl border border-slate-100">
                  <div className="w-12 text-center shrink-0">
                    <p className="text-xs text-slate-400">T7</p>
                    <p className="text-lg font-semibold tracking-tight text-slate-900">
                      16
                    </p>
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-slate-900">
                      Code review Next.js
                    </p>
                    <p className="text-xs text-slate-400">Liam Trần · 20:30</p>
                  </div>
                  <span className="text-xs font-medium text-purple-700 bg-purple-50 px-2 py-0.5 rounded-full">
                    Đặt
                  </span>
                </div>
                <div className="flex items-center gap-3 p-3 rounded-xl border border-slate-100">
                  <div className="w-12 text-center shrink-0">
                    <p className="text-xs text-slate-400">T2</p>
                    <p className="text-lg font-semibold tracking-tight text-slate-900">
                      18
                    </p>
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-slate-900">
                      Pandas thực chiến
                    </p>
                    <p className="text-xs text-slate-400">Ethan Cruz · 21:00</p>
                  </div>
                  <span className="text-xs font-medium text-purple-700 bg-purple-50 px-2 py-0.5 rounded-full">
                    Đặt
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      
    </div>
  );
};

export default Instructors;
