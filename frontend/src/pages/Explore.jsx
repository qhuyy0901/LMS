import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useSearchParams } from 'react-router-dom';
import { Bookmark, Flame, Hash, MoreHorizontal, Play, Route, SlidersHorizontal, Sparkles, Star, Users } from 'lucide-react';
import CourseCard, { CourseSkeleton } from '../components/CourseCard';

const Explore = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const q = searchParams.get('q') || '';
  const category = searchParams.get('category') || '';
  const page = parseInt(searchParams.get('page'), 10) || 1;
  const sort = searchParams.get('sort') || 'newest';
  const price = searchParams.get('price') || 'all';
  const tier = searchParams.get('tier') || 'all';

  const [courses, setCourses] = useState([]);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  useEffect(() => {
    const fetchCourses = async () => {
      setIsLoading(true);
      try {
        const params = new URLSearchParams();
        if (q) params.set('q', q);
        if (category) params.set('category', category);
        if (sort && sort !== 'newest') params.set('sort', sort);
        if (price && price !== 'all') params.set('price', price);
        if (tier && tier !== 'all') params.set('tier', tier);
        params.set('page', page.toString());
        params.set('pageSize', '6');
        params.set('paginate', 'true');

        const response = await axios.get(`/api/courses?${params.toString()}`);
        const data = response.data;
        if (data && typeof data === 'object' && Array.isArray(data.items)) {
          setCourses(data.items);
          setTotalPages(data.pages || 1);
          setTotalItems(data.total || 0);
        } else if (Array.isArray(data)) {
          setCourses(data);
          setTotalPages(1);
          setTotalItems(data.length);
        }
      } catch (error) {
        console.error('Error fetching courses:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchCourses();
  }, [q, category, page, sort, price, tier]);

  const handleCategoryChange = (catValue) => {
    const newParams = new URLSearchParams(searchParams);
    if (catValue) {
      newParams.set('category', catValue);
    } else {
      newParams.delete('category');
    }
    newParams.set('page', '1'); // reset page
    setSearchParams(newParams);
  };

  const handleFilterParamChange = (key, value) => {
    const newParams = new URLSearchParams(searchParams);
    if (value && value !== 'all') {
      newParams.set(key, value);
    } else {
      newParams.delete(key);
    }
    newParams.set('page', '1'); // reset page
    setSearchParams(newParams);
  };

  const handleResetFilters = () => {
    const newParams = new URLSearchParams();
    if (q) newParams.set('q', q);
    if (category) newParams.set('category', category);
    setSearchParams(newParams);
  };

  const handleResetFiltersAll = () => {
    setSearchParams(new URLSearchParams());
  };

  const handlePageChange = (pageNum) => {
    const newParams = new URLSearchParams(searchParams);
    newParams.set('page', pageNum.toString());
    setSearchParams(newParams);
  };

  const categories = [
    { label: 'Tất cả', value: '' },
    { label: 'Thiết kế', value: 'Thiết kế' },
    { label: 'Lập trình', value: 'Lập trình' },
    { label: 'Marketing', value: 'Marketing' },
    { label: 'Kinh doanh', value: 'Kinh doanh' },
    { label: 'Dữ liệu', value: 'Dữ liệu' },
    { label: 'Ngôn ngữ', value: 'Ngôn ngữ' },
    { label: 'Nhiếp ảnh', value: 'Nhiếp ảnh' },
  ];

  const hasActiveFilters = sort !== 'newest' || (price && price !== 'all') || (tier && tier !== 'all') || q || category;

  return (
    <div className="animate-fade-in-up">
      {/* Page header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-semibold tracking-tight text-slate-900 mb-1">
            Khám phá
          </h1>
          <p className="text-sm text-slate-500">
            Tìm kiếm khóa học mới, chủ đề thịnh hành và giảng viên truyền cảm hứng.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsFilterOpen(true)}
            className={`px-4 py-2.5 rounded-full text-sm font-medium inline-flex items-center gap-2 border transition-all duration-300 ${
              isFilterOpen || hasActiveFilters
                ? 'bg-purple-50 border-purple-200 text-purple-700'
                : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            <SlidersHorizontal className="w-4 h-4" />
            Bộ lọc
            {hasActiveFilters && (
              <span className="flex h-2 w-2 rounded-full bg-purple-600 animate-pulse" />
            )}
          </button>
          <button className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2.5 rounded-full text-sm font-medium inline-flex items-center gap-2 shadow-md shadow-purple-200 transition-all hover:scale-105 active:scale-95">
            <Sparkles className="w-4 h-4" />
            Đề xuất cho bạn
          </button>
        </div>
      </div>

      {/* Categories */}
      <div className="flex items-center gap-2 mb-6 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-slate-200">
        {categories.map((cat) => {
          const isActive = category === cat.value;
          return (
            <button
              key={cat.label}
              onClick={() => handleCategoryChange(cat.value)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-300 whitespace-nowrap ${
                isActive
                  ? 'bg-purple-600 text-white shadow-md shadow-purple-200'
                  : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              {cat.label}
            </button>
          );
        })}
      </div>

      {/* Active Filter Chips */}
      {hasActiveFilters && (
        <div className="flex flex-wrap items-center gap-2 mb-6 animate-fade-in">
          <span className="text-xs text-slate-400 font-medium">Bộ lọc đang áp dụng:</span>
          
          {q && (
            <div className="inline-flex items-center gap-1 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs px-3 py-1.5 rounded-full transition-colors font-medium">
              <span>Từ khóa: "{q}"</span>
              <button onClick={() => handleFilterParamChange('q', '')} className="text-slate-400 hover:text-slate-600 text-[10px] ml-1">✕</button>
            </div>
          )}

          {category && (
            <div className="inline-flex items-center gap-1 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs px-3 py-1.5 rounded-full transition-colors font-medium">
              <span>Danh mục: {category}</span>
              <button onClick={() => handleCategoryChange('')} className="text-slate-400 hover:text-slate-600 text-[10px] ml-1">✕</button>
            </div>
          )}

          {sort !== 'newest' && (
            <div className="inline-flex items-center gap-1 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs px-3 py-1.5 rounded-full transition-colors font-medium">
              <span>Sắp xếp: {
                sort === 'price_asc' ? 'Giá tăng dần' : 
                sort === 'price_desc' ? 'Giá giảm dần' : 
                sort === 'rating_desc' ? 'Đánh giá tốt nhất' : 
                sort === 'students_desc' ? 'Đông học viên nhất' : ''
              }</span>
              <button onClick={() => handleFilterParamChange('sort', 'newest')} className="text-slate-400 hover:text-slate-600 text-[10px] ml-1">✕</button>
            </div>
          )}

          {price !== 'all' && (
            <div className="inline-flex items-center gap-1 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs px-3 py-1.5 rounded-full transition-colors font-medium">
              <span>Giá: {price === 'free' ? 'Miễn phí' : 'Trả phí'}</span>
              <button onClick={() => handleFilterParamChange('price', 'all')} className="text-slate-400 hover:text-slate-600 text-[10px] ml-1">✕</button>
            </div>
          )}

          {tier !== 'all' && (
            <div className="inline-flex items-center gap-1 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs px-3 py-1.5 rounded-full transition-colors font-medium">
              <span>Thành viên: {
                tier === 'BRONZE' ? 'Đồng' :
                tier === 'SILVER' ? 'Bạc' :
                tier === 'GOLD' ? 'Vàng' :
                tier === 'PLATINUM' ? 'Bạch kim' :
                tier === 'DIAMOND' ? 'Kim cương' : ''
              }</span>
              <button onClick={() => handleFilterParamChange('tier', 'all')} className="text-slate-400 hover:text-slate-600 text-[10px] ml-1">✕</button>
            </div>
          )}

          <button
            onClick={handleResetFiltersAll}
            className="text-xs font-semibold text-purple-600 hover:text-purple-700 hover:underline ml-1"
          >
            Xóa tất cả bộ lọc
          </button>
        </div>
      )}

      {/* Filters Drawer Overlay */}
      {isFilterOpen && (
        <div className="fixed inset-0 z-50 overflow-hidden animate-fade-in">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity duration-300"
            onClick={() => setIsFilterOpen(false)}
          />

          <div className="absolute inset-y-0 right-0 max-w-full flex pl-10">
            <div className="w-screen max-w-md transform transition-all duration-300 ease-in-out bg-white shadow-2xl flex flex-col h-full rounded-l-2xl border-l border-slate-100">
              {/* Header */}
              <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
                <h2 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
                  <SlidersHorizontal className="w-5 h-5 text-purple-600" />
                  Bộ lọc nâng cao
                </h2>
                <button
                  onClick={() => setIsFilterOpen(false)}
                  className="rounded-lg p-1 text-slate-400 hover:bg-slate-50 hover:text-slate-500 transition-colors"
                >
                  <span className="sr-only">Đóng bộ lọc</span>
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Content */}
              <div className="flex-1 overflow-y-auto px-6 py-6 space-y-8">
                {/* Sort Section */}
                <div>
                  <h3 className="text-sm font-semibold text-slate-800 uppercase tracking-wider mb-3">Sắp xếp theo</h3>
                  <div className="grid grid-cols-1 gap-2">
                    {[
                      { label: 'Mới nhất', value: 'newest' },
                      { label: 'Giá tăng dần', value: 'price_asc' },
                      { label: 'Giá giảm dần', value: 'price_desc' },
                      { label: 'Đánh giá cao nhất', value: 'rating_desc' },
                      { label: 'Học viên đông nhất', value: 'students_desc' },
                    ].map((opt) => (
                      <button
                        key={opt.value}
                        onClick={() => handleFilterParamChange('sort', opt.value)}
                        className={`flex items-center justify-between px-4 py-3 rounded-xl border text-sm font-medium transition-all ${
                          sort === opt.value
                            ? 'border-purple-600 bg-purple-50/50 text-purple-700'
                            : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        {opt.label}
                        {sort === opt.value && <div className="w-2 h-2 rounded-full bg-purple-600" />}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Price Section */}
                <div>
                  <h3 className="text-sm font-semibold text-slate-800 uppercase tracking-wider mb-3">Học phí</h3>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { label: 'Tất cả', value: 'all' },
                      { label: 'Miễn phí', value: 'free' },
                      { label: 'Có phí', value: 'paid' },
                    ].map((opt) => (
                      <button
                        key={opt.value}
                        onClick={() => handleFilterParamChange('price', opt.value)}
                        className={`px-3 py-2.5 rounded-xl border text-xs font-semibold text-center transition-all ${
                          price === opt.value
                            ? 'border-purple-600 bg-purple-50/50 text-purple-700'
                            : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Member Tier Section */}
                <div>
                  <h3 className="text-sm font-semibold text-slate-800 uppercase tracking-wider mb-3">Cấp bậc tối thiểu</h3>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { label: 'Tất cả', value: 'all' },
                      { label: 'Đồng (Bronze)', value: 'BRONZE' },
                      { label: 'Bạc (Silver)', value: 'SILVER' },
                      { label: 'Vàng (Gold)', value: 'GOLD' },
                      { label: 'Bạch kim (Platinum)', value: 'PLATINUM' },
                      { label: 'Kim cương (Diamond)', value: 'DIAMOND' },
                    ].map((opt) => (
                      <button
                        key={opt.value}
                        onClick={() => handleFilterParamChange('tier', opt.value)}
                        className={`px-3 py-2.5 rounded-xl border text-xs font-semibold text-center transition-all ${
                          tier === opt.value
                            ? 'border-purple-600 bg-purple-50/50 text-purple-700'
                            : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="px-6 py-5 border-t border-slate-100 bg-slate-50/50 flex gap-3">
                <button
                  onClick={handleResetFilters}
                  className="flex-1 px-4 py-3 rounded-xl border border-slate-200 text-sm font-semibold text-slate-600 bg-white hover:bg-slate-50 active:scale-95 transition-all text-center"
                >
                  Xóa bộ lọc
                </button>
                <button
                  onClick={() => setIsFilterOpen(false)}
                  className="flex-1 px-4 py-3 rounded-xl bg-purple-600 text-sm font-semibold text-white shadow-md shadow-purple-200 hover:bg-purple-700 active:scale-95 transition-all text-center"
                >
                  Áp dụng
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

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
                  className="bg-white text-slate-700 px-5 py-2.5 rounded-full text-sm font-medium inline-flex items-center gap-2 border border-slate-200 transition-all hover:bg-slate-50">
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
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <CourseSkeleton />
              <CourseSkeleton />
              <CourseSkeleton />
              <CourseSkeleton />
            </div>
          ) : courses.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 px-4 bg-white rounded-2xl border border-slate-100 text-center animate-fade-in">
              <span className="text-5xl mb-4">🔍</span>
              <h3 className="text-lg font-semibold text-slate-900 mb-1">
                Không tìm thấy khóa học nào phù hợp
              </h3>
              <p className="text-sm text-slate-500 max-w-sm mb-6">
                Hãy thử thay đổi từ khóa tìm kiếm hoặc điều chỉnh bộ lọc để xem nhiều kết quả hơn.
              </p>
              <button
                onClick={handleResetFiltersAll}
                className="bg-purple-600 hover:bg-purple-700 text-white px-5 py-2.5 rounded-full text-sm font-semibold shadow-md shadow-purple-200 transition-all hover:scale-105 active:scale-95"
              >
                Đặt lại bộ lọc
              </button>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {courses.map((course) => (
                  <CourseCard key={course.id} course={course} />
                ))}
              </div>

              {/* Pagination Controls */}
              {totalPages > 1 && (
                <div className="flex flex-wrap items-center justify-between gap-4 pt-6 pb-2 border-t border-slate-100 mt-8">
                  <p className="text-xs font-medium text-slate-500">
                    Đang hiển thị trang <span className="font-semibold text-slate-800">{page}</span> trong tổng số{' '}
                    <span className="font-semibold text-slate-800">{totalPages}</span> trang ({totalItems} khóa học)
                  </p>
                  
                  <div className="flex items-center gap-1">
                    <button
                      disabled={page <= 1}
                      onClick={() => handlePageChange(page - 1)}
                      className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 active:scale-95 transition-all disabled:opacity-50 disabled:pointer-events-none"
                      title="Trang trước"
                    >
                      &lt;
                    </button>

                    {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => {
                      const isActive = page === p;
                      return (
                        <button
                          key={p}
                          onClick={() => handlePageChange(p)}
                          className={`h-9 w-9 rounded-lg text-sm font-semibold transition-all active:scale-95 ${
                            isActive
                              ? 'bg-purple-600 text-white shadow-md shadow-purple-200'
                              : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                          }`}
                        >
                          {p}
                        </button>
                      );
                    })}

                    <button
                      disabled={page >= totalPages}
                      onClick={() => handlePageChange(page + 1)}
                      className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 active:scale-95 transition-all disabled:opacity-50 disabled:pointer-events-none"
                      title="Trang sau"
                    >
                      &gt;
                    </button>
                  </div>
                </div>
              )}
            </>
          )}

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
