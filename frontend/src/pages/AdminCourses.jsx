import { useEffect, useState } from 'react';
import axios from 'axios';
import { BookOpen, Search, Trash2 } from 'lucide-react';

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

  const fetchCourses = async () => {
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
  };

  useEffect(() => {
    fetchCourses();
  }, []);

  const updatePublication = async (courseId, isPublished) => {
    try {
      const response = await axios.patch(`/api/admin/courses/${courseId}/publication`, { isPublished });
      setCourses((prev) => prev.map((course) => (course.id === courseId ? response.data : course)));
    } catch (err) {
      window.alert(err.response?.data?.message || err.message);
    }
  };

  const deleteCourse = async (courseId) => {
    if (!window.confirm('Xoa khoa hoc nay va toan bo du lieu lien quan?')) {
      return;
    }

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
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Duyet khoa hoc</h1>
          <p className="mt-1 text-sm text-slate-500">Kiem soat trang thai xuat ban va noi dung khoa hoc tren he thong.</p>
        </div>
        <button
          onClick={fetchCourses}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-medium text-white"
        >
          <Search className="h-4 w-4" />
          Tim kiem
        </button>
      </div>

      <div className="grid gap-3 rounded-2xl border border-slate-100 bg-white p-4 shadow-sm md:grid-cols-[1fr_220px]">
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') fetchCourses();
          }}
          placeholder="Tim theo khoa hoc, giang vien hoac email"
          className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-purple-400"
        />
        <select
          value={status}
          onChange={(event) => setStatus(event.target.value)}
          className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-purple-400"
        >
          <option value="">Tat ca trang thai</option>
          <option value="published">Da xuat ban</option>
          <option value="draft">Ban nhap</option>
        </select>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
        {error ? <div className="p-6 text-sm text-rose-600">{error}</div> : null}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-100 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-5 py-4">Khoa hoc</th>
                <th className="px-5 py-4">Giang vien</th>
                <th className="px-5 py-4">Gia</th>
                <th className="px-5 py-4">Chi so</th>
                <th className="px-5 py-4">Trang thai</th>
                <th className="px-5 py-4 text-right">Thao tac</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {loading ? (
                <tr>
                  <td colSpan="6" className="px-5 py-10 text-center text-slate-500">
                    Dang tai khoa hoc...
                  </td>
                </tr>
              ) : courses.length === 0 ? (
                <tr>
                  <td colSpan="6" className="px-5 py-10 text-center text-slate-500">
                    Khong co khoa hoc phu hop.
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
                      <p className="text-slate-900">{course.instructor?.name}</p>
                      <p className="text-xs text-slate-500">{course.instructor?.email}</p>
                    </td>
                    <td className="px-5 py-4 text-slate-600">{course.price > 0 ? formatCurrency(course.price) : 'Mien phi'}</td>
                    <td className="px-5 py-4 text-slate-600">
                      <p>{course._count?.lessons || 0} bai, {course._count?.enrollments || 0} hoc vien</p>
                      <p className="text-xs text-slate-400">{course.averageRating?.toFixed?.(1) || '0.0'} sao, {course.reviewCount || 0} danh gia</p>
                    </td>
                    <td className="px-5 py-4">
                      <button
                        onClick={() => updatePublication(course.id, !course.isPublished)}
                        className={`rounded-full px-3 py-1.5 text-xs font-semibold ${
                          course.isPublished
                            ? 'bg-emerald-50 text-emerald-700'
                            : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {course.isPublished ? 'Da xuat ban' : 'Ban nhap'}
                      </button>
                    </td>
                    <td className="px-5 py-4 text-right">
                      <button
                        onClick={() => deleteCourse(course.id)}
                        className="rounded-lg p-2 text-slate-400 transition hover:bg-rose-50 hover:text-rose-600"
                        title="Xoa khoa hoc"
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
