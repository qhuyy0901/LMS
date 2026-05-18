import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Bookmark, Flame, Hash, MoreHorizontal, Play, Route, SlidersHorizontal, Sparkles, Star, Users } from 'lucide-react';
import CourseCard, { CourseSkeleton } from '../components/CourseCard';

const Explore = () => {
  const [courses, setCourses] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchCourses = async () => {
      try {
        const response = await axios.get('/api/courses');
        setCourses(response.data);
      } catch (error) {
        console.error('Error fetching courses:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchCourses();
  }, []);

  return (
    <div className="animate-fade-in-up">
      {/* Page header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl md:text-3xl font-semibold tracking-tight text-slate-900 mb-1">
              Khám phá
            </h1>
            <p className="text-sm text-slate-500">
              Tìm kiếm khóa học mới, chủ đề thịnh hành và giảng viên truyền
              cảm hứng.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              className="bg-white border border-slate-200 text-slate-600 px-4 py-2.5 rounded-full text-sm font-medium inline-flex items-center gap-2">
              <SlidersHorizontal className="w-4 h-4" />
              Bộ lọc
            </button>
            <button
              className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2.5 rounded-full text-sm font-medium inline-flex items-center gap-2">
              <Sparkles className="w-4 h-4" />
              Đề xuất cho bạn
            </button>
          </div>
        </div>

        {/* Categories */}
        <div className="flex items-center gap-2 mb-6 overflow-x-auto">
          <button className="px-4 py-2 rounded-full text-sm font-medium bg-purple-600 text-white whitespace-nowrap">
            Tất cả
          </button>
          <button
            className="px-4 py-2 rounded-full text-sm bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 whitespace-nowrap">
            Thiết kế
          </button>
          <button
            className="px-4 py-2 rounded-full text-sm bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 whitespace-nowrap">
            Lập trình
          </button>
          <button
            className="px-4 py-2 rounded-full text-sm bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 whitespace-nowrap">
            Marketing
          </button>
          <button
            className="px-4 py-2 rounded-full text-sm bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 whitespace-nowrap">
            Kinh doanh
          </button>
          <button
            className="px-4 py-2 rounded-full text-sm bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 whitespace-nowrap">
            Dữ liệu
          </button>
          <button
            className="px-4 py-2 rounded-full text-sm bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 whitespace-nowrap">
            Ngôn ngữ
          </button>
          <button
            className="px-4 py-2 rounded-full text-sm bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 whitespace-nowrap">
            Nhiếp ảnh
          </button>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          <div className="xl:col-span-2 space-y-6 animate-fade-in-up">
            {/* Hero */}
            <div
              className="bg-gradient-to-r from-purple-100 via-purple-50 to-pink-50 rounded-2xl p-6 flex items-center justify-between overflow-hidden relative">
              <div className="relative z-10 max-w-md">
                <div
                  className="inline-flex items-center gap-2 bg-purple-600 text-white text-xs font-medium px-3 py-1 rounded-full mb-3">
                  <Flame className="w-3 h-3" />
                  THỊNH HÀNH TUẦN NÀY
                </div>
                <h2 className="text-xl md:text-2xl font-semibold tracking-tight text-purple-900 mb-2">
                  AI cho Designer: Từ ý tưởng đến sản phẩm
                </h2>
                <p className="text-sm text-slate-600 mb-4">
                  12 chương · 38 bài học · 4.9 ★ · 2.4k học viên
                </p>
                <div className="flex items-center gap-3">
                  <button
                    className="bg-purple-600 hover:bg-purple-700 text-white px-5 py-2.5 rounded-full text-sm font-medium inline-flex items-center gap-2">
                    <Play className="w-4 h-4" />
                    Xem trước
                  </button>
                  <button
                    className="bg-white text-slate-700 px-5 py-2.5 rounded-full text-sm font-medium inline-flex items-center gap-2 border border-slate-200">
                    <Bookmark className="w-4 h-4" />
                    Lưu
                  </button>
                </div>
              </div>
              <div className="hidden md:flex items-center justify-center w-56 h-40 relative">
                <div className="text-7xl">🤖</div>
                <div className="absolute top-2 right-6 text-3xl">✨</div>
                <div className="absolute bottom-2 left-2 text-2xl">🎨</div>
              </div>
            </div>

            {/* Course grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {isLoading ? (
                <>
                  <CourseSkeleton />
                  <CourseSkeleton />
                  <CourseSkeleton />
                  <CourseSkeleton />
                </>
              ) : (
                courses.map((course) => (
                  <CourseCard key={course.id} course={course} />
                ))
              )}
            </div>

            {/* Trending topics */}
            <div className="bg-white rounded-2xl p-6 border border-slate-100 transition-all duration-300 hover:shadow-lg hover:-translate-y-1">
              <div className="flex items-center justify-between mb-5">
                <h3 className="text-xl font-semibold tracking-tight text-slate-900">
                  Chủ đề thịnh hành
                </h3>
                <button className="text-sm text-purple-600 font-medium">
                  Xem tất cả
                </button>
              </div>
              <div className="space-y-3">
                <div className="flex items-center gap-4 p-3 rounded-xl hover:bg-slate-50">
                  <div className="w-10 h-10 rounded-lg bg-orange-100 flex items-center justify-center shrink-0">
                    <Hash className="w-5 h-5 text-orange-600" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-slate-900">
                      #AI &amp; Machine Learning
                    </p>
                    <p className="text-xs text-slate-400">
                      128 khóa học · 24k học viên
                    </p>
                  </div>
                  <span className="text-xs font-medium text-green-600 bg-green-50 px-3 py-1 rounded-full">
                    + 18%
                  </span>
                </div>
                <div className="flex items-center gap-4 p-3 rounded-xl hover:bg-slate-50">
                  <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center shrink-0">
                    <Hash className="w-5 h-5 text-blue-600" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-slate-900">
                      #Product Design
                    </p>
                    <p className="text-xs text-slate-400">
                      96 khóa học · 18k học viên
                    </p>
                  </div>
                  <span className="text-xs font-medium text-green-600 bg-green-50 px-3 py-1 rounded-full">
                    + 12%
                  </span>
                </div>
                <div className="flex items-center gap-4 p-3 rounded-xl hover:bg-slate-50">
                  <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center shrink-0">
                    <Hash className="w-5 h-5 text-purple-600" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-slate-900">
                      #Web3 &amp; Blockchain
                    </p>
                    <p className="text-xs text-slate-400">
                      54 khóa học · 9k học viên
                    </p>
                  </div>
                  <span className="text-xs font-medium text-green-600 bg-green-50 px-3 py-1 rounded-full">
                    + 24%
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            {/* Recommended for you */}
            <div className="bg-white rounded-2xl p-6 border border-slate-100 transition-all duration-300 hover:shadow-lg hover:-translate-y-1">
              <div className="flex items-center justify-between mb-5">
                <h3 className="text-xl font-semibold tracking-tight text-slate-900">
                  Đề xuất cho bạn
                </h3>
                <button className="text-sm text-purple-600 font-medium">
                  Làm mới
                </button>
              </div>
              <div className="space-y-4">
                <div className="flex gap-3">
                  <div
                    className="w-14 h-14 rounded-lg bg-gradient-to-br from-amber-200 to-orange-300 flex items-center justify-center text-2xl shrink-0">
                    🎨
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-slate-900">
                      Figma Variables nâng cao
                    </p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Sophia Nguyễn · 12 bài
                    </p>
                    <div className="flex items-center gap-2 mt-1 text-[10px] text-slate-500">
                      <Star className="w-3 h-3 text-amber-500" />
                      4.9 · 1.2k học viên
                    </div>
                  </div>
                </div>
                <div className="flex gap-3">
                  <div
                    className="w-14 h-14 rounded-lg bg-gradient-to-br from-green-200 to-teal-300 flex items-center justify-center text-2xl shrink-0">
                    ⚛️
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-slate-900">
                      React Server Components
                    </p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Liam Trần · 18 bài
                    </p>
                    <div className="flex items-center gap-2 mt-1 text-[10px] text-slate-500">
                      <Star className="w-3 h-3 text-amber-500" />
                      4.8 · 980 học viên
                    </div>
                  </div>
                </div>
                <div className="flex gap-3">
                  <div
                    className="w-14 h-14 rounded-lg bg-gradient-to-br from-pink-200 to-rose-300 flex items-center justify-center text-2xl shrink-0">
                    ✍️
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-slate-900">
                      UX Writing cơ bản
                    </p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Maya Patel · 8 bài
                    </p>
                    <div className="flex items-center gap-2 mt-1 text-[10px] text-slate-500">
                      <Star className="w-3 h-3 text-amber-500" />
                      4.7 · 540 học viên
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Top instructors */}
            <div className="bg-white rounded-2xl p-6 border border-slate-100 transition-all duration-300 hover:shadow-lg hover:-translate-y-1">
              <div className="flex items-center justify-between mb-5">
                <h3 className="text-xl font-semibold tracking-tight text-slate-900">
                  Giảng viên hàng đầu
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
                    <p className="text-xs text-slate-400">
                      12 khóa · 8.2k học viên
                    </p>
                  </div>
                  <button
                    className="text-xs font-medium text-purple-700 bg-purple-50 hover:bg-purple-100 px-3 py-1.5 rounded-full">
                    Theo dõi
                  </button>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-300 to-cyan-300"></div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-slate-900">
                      Liam Trần
                    </p>
                    <p className="text-xs text-slate-400">
                      9 khóa · 6.4k học viên
                    </p>
                  </div>
                  <button
                    className="text-xs font-medium text-purple-700 bg-purple-50 hover:bg-purple-100 px-3 py-1.5 rounded-full">
                    Theo dõi
                  </button>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-300 to-pink-300"></div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-slate-900">
                      Maya Patel
                    </p>
                    <p className="text-xs text-slate-400">
                      7 khóa · 4.1k học viên
                    </p>
                  </div>
                  <button
                    className="text-xs font-medium text-white bg-purple-600 hover:bg-purple-700 px-3 py-1.5 rounded-full">
                    Đang theo dõi
                  </button>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-300 to-red-300"></div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-slate-900">
                      Ethan Cruz
                    </p>
                    <p className="text-xs text-slate-400">
                      5 khóa · 2.8k học viên
                    </p>
                  </div>
                  <button
                    className="text-xs font-medium text-purple-700 bg-purple-50 hover:bg-purple-100 px-3 py-1.5 rounded-full">
                    Theo dõi
                  </button>
                </div>
              </div>
            </div>

            {/* Learning paths */}
            <div className="bg-white rounded-2xl p-6 border border-slate-100 transition-all duration-300 hover:shadow-lg hover:-translate-y-1">
              <div className="flex items-center justify-between mb-5">
                <h3 className="text-xl font-semibold tracking-tight text-slate-900">
                  Lộ trình học
                </h3>
                <button className="text-slate-400">
                  <MoreHorizontal className="w-5 h-5" />
                </button>
              </div>
              <div className="space-y-3">
                <div className="p-4 rounded-xl bg-gradient-to-r from-purple-50 to-pink-50 border border-purple-100">
                  <div className="flex items-center gap-2 mb-2">
                    <Route className="w-4 h-4 text-purple-600" />
                    <p className="text-sm font-medium text-slate-900">
                      Trở thành Product Designer
                    </p>
                  </div>
                  <p className="text-xs text-slate-500 mb-2">8 khóa · 6 tháng</p>
                  <div className="w-full bg-white/70 rounded-full h-1.5">
                    <div className="bg-purple-600 h-1.5 rounded-full" style={{ width: '35%' }}></div>
                  </div>
                </div>
                <div className="p-4 rounded-xl bg-gradient-to-r from-blue-50 to-cyan-50 border border-blue-100">
                  <div className="flex items-center gap-2 mb-2">
                    <Route className="w-4 h-4 text-blue-600" />
                    <p className="text-sm font-medium text-slate-900">
                      Full-stack Developer
                    </p>
                  </div>
                  <p className="text-xs text-slate-500 mb-2">12 khóa · 9 tháng</p>
                  <div className="w-full bg-white/70 rounded-full h-1.5">
                    <div className="bg-blue-600 h-1.5 rounded-full" style={{ width: '0%' }}></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      
    </div>
  );
};

export default Explore;
