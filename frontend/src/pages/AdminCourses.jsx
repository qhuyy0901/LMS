import { useCallback, useEffect, useState } from 'react';
import axios from 'axios';
import { BookOpen, RefreshCw, Trash2 } from 'lucide-react';

const formatCurrency = (amount = 0) =>
  new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(amount);

export default function AdminCourses() {
  const [courses, setCourses] = useState([]);
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchCourses = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await axios.get('/api/admin/courses', {
        params: { q: query || undefined, status: status || undefined, pageSize: 50 },
      });
      setCourses(response.data.items || []);
    } catch (err) {
      setError(err.response?.data?.message || err.message);
    } finally {
      setLoading(false);
    }
  }, [query, status]);

  useEffect(() => {
    fetchCourses();
  }, [fetchCourses]);

  const updatePublication = async (courseId, isPublished) => {
    try {
      const response = await axios.patch(`/api/admin/courses/${courseId}/publication`, { isPublished });
      setCourses((prev) => prev.map((course) => (course.id === courseId ? response.data : course)));
    } catch (err) {
      window.alert(err.response?.data?.message || err.message);
    }
  };

  const deleteCourse = async (courseId) => {
    if (!window.confirm('Xóa khóa học này và toàn bộ dữ liệu liên quan?')) return;

    try {
      await axios.delete(`/api/admin/courses/${courseId}`);
      setCourses((prev) => prev.filter((course) => course.id !== courseId));
    } catch (err) {
      window.alert(err.response?.data?.message || err.message);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Duyệt khóa học</h1>
          <p className="mt-1 text-sm text-slate-500">Kiểm soát trạng thái xuất bản và nội dung khóa học trên hệ thống.</p>
        </div>
        <button
          onClick={fetchCourses}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-medium text-white"
        >
          <RefreshCw className="h-4 w-4" />
          Tải lại
        </button>
      </div>

      <div className="grid gap-3 rounded-2xl border border-slate-100 bg-white p-4 shadow-sm md:grid-cols-[1fr_220px]">
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') fetchCourses();
          }}
          placeholder="Tìm theo khóa học, giảng viên hoặc email"
          className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none transition focus:border-purple-400 focus:ring-2 focus:ring-purple-100"
        />
        <select
          value={status}
          onChange={(event) => setStatus(event.target.value)}
          className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none transition focus:border-purple-400 focus:ring-2 focus:ring-purple-100"
        >
          <option value="">Tất cả trạng thái</option>
          <option value="published">Đã xuất bản</option>
          <option value="draft">Bản nháp</option>
        </select>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
        {error ? <div className="p-6 text-sm text-rose-600">{error}</div> : null}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-100 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-5 py-4">Khóa học</th>
                <th className="px-5 py-4">Giảng viên</th>
                <th className="px-5 py-4">Giá</th>
                <th className="px-5 py-4">Chỉ số</th>
                <th className="px-5 py-4">Trạng thái</th>
                <th className="px-5 py-4 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {loading ? (
                <tr>
                  <td colSpan="6" className="px-5 py-10 text-center text-slate-500">
                    Đang tải khóa học...
                  </td>
                </tr>
              ) : courses.length === 0 ? (
                <tr>
                  <td colSpan="6" className="px-5 py-10 text-center text-slate-500">
                    Không có khóa học phù hợp.
                  </td>
                </tr>
              ) : (
                courses.map((course) => (
                  <tr key={course.id} className="hover:bg-slate-50/70">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-50 text-purple-700">
                          <BookOpen className="h-5 w-5" />
                        </div>
                        <div>
                          <p className="font-medium text-slate-900">{course.title}</p>
                          <p className="text-xs text-slate-500">{course.slug}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <p className="text-slate-900">{course.instructor?.name || '-'}</p>
                      <p className="text-xs text-slate-500">{course.instructor?.email || ''}</p>
                    </td>
                    <td className="px-5 py-4 text-slate-600">{course.price > 0 ? formatCurrency(course.price) : 'Miễn phí'}</td>
                    <td className="px-5 py-4 text-slate-600">
                      <p>
                        {course._count?.lessons || 0} bài, {course._count?.enrollments || 0} học viên
                      </p>
                      <p className="text-xs text-slate-400">
                        {course.averageRating?.toFixed?.(1) || '0.0'} sao, {course.reviewCount || 0} đánh giá
                      </p>
                    </td>
                    <td className="px-5 py-4">
                      <button
                        onClick={() => updatePublication(course.id, !course.isPublished)}
                        className={`rounded-full px-3 py-1.5 text-xs font-semibold ${
                          course.isPublished ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {course.isPublished ? 'Đã xuất bản' : 'Bản nháp'}
                      </button>
                    </td>
                    <td className="px-5 py-4 text-right">
                      <button
                        onClick={() => deleteCourse(course.id)}
                        className="rounded-lg p-2 text-slate-400 transition hover:bg-rose-50 hover:text-rose-600"
                        title="Xóa khóa học"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
