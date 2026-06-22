import { useCallback, useEffect, useState } from 'react';
import axios from 'axios';
import { Ban, CheckCircle2, RefreshCw, Search, UserX } from 'lucide-react';

const formatCurrency = (amount = 0) =>
  new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(amount);

export default function AdminGiangVien() {
  const [instructors, setInstructors] = useState([]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchInstructors = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await axios.get('/api/admin/instructors', { params: { q: query || undefined } });
      setInstructors(response.data || []);
    } catch (err) {
      setError(err.response?.data?.message || err.message);
    } finally {
      setLoading(false);
    }
  }, [query]);

  useEffect(() => {
    fetchInstructors();
  }, [fetchInstructors]);

  const toggleTeaching = async (item) => {
    const next = !item.teachingDisabled;
    const reason = next ? window.prompt('Lý do khóa quyền giảng dạy:', item.teachingDisabledReason || '') : '';
    if (next && reason === null) return;
    try {
      await axios.patch(`/api/admin/instructors/${item.id}/teaching`, {
        teachingDisabled: next,
        reason,
      });
      fetchInstructors();
    } catch (err) {
      window.alert(err.response?.data?.message || err.message);
    }
  };

  const toggleLock = async (item) => {
    const locked = !item.accountLocked;
    const reason = locked ? window.prompt('Lý do khóa tài khoản giảng viên:', '') : '';
    if (locked && reason === null) return;

    try {
      await axios.patch(`/api/admin/users/${item.id}/lock`, { locked, reason });
      fetchInstructors();
    } catch (err) {
      window.alert(err.response?.data?.message || err.message);
    }
  };

  return (
    <div className="animate-fade-in-up space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Quản lý giảng viên</h1>
        </div>
        <button onClick={fetchInstructors} className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-medium text-white">
          <RefreshCw className="h-4 w-4" />
          Tải lại
        </button>
      </div>

      <div className="relative rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
        <Search className="pointer-events-none absolute left-8 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Tìm theo tên, email hoặc chuyên môn"
          className="w-full rounded-xl border border-slate-200 py-2.5 pl-10 pr-4 text-sm outline-none transition focus:border-purple-400 focus:ring-2 focus:ring-purple-100"
        />
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
        {error ? <div className="p-6 text-sm text-rose-600">{error}</div> : null}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-100 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-5 py-4">Giảng viên</th>
                <th className="px-5 py-4">Khóa học</th>
                <th className="px-5 py-4">Học viên</th>
                <th className="px-5 py-4">Doanh thu</th>
                <th className="px-5 py-4">Trạng thái</th>
                <th className="px-5 py-4 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {loading ? (
                <tr>
                  <td colSpan="6" className="px-5 py-10 text-center text-slate-500">Đang tải giảng viên...</td>
                </tr>
              ) : instructors.length === 0 ? (
                <tr>
                  <td colSpan="6" className="px-5 py-10 text-center text-slate-500">Chưa có giảng viên phù hợp.</td>
                </tr>
              ) : (
                instructors.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/70">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-50 font-semibold text-purple-700">
                          {item.name?.charAt(0)?.toUpperCase() || 'G'}
                        </div>
                        <div>
                          <p className="font-medium text-slate-900">{item.name}</p>
                          <p className="text-xs text-slate-500">{item.email}</p>
                          {item.expertise && item.expertise !== '-' && (
                            <p className="mt-1 text-xs font-semibold text-purple-600 bg-purple-50 rounded px-1.5 py-0.5 inline-block">Chuyên môn: {item.expertise}</p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4 text-slate-700">{item.courseCount || 0}</td>
                    <td className="px-5 py-4 text-slate-700">{item.studentCount || 0}</td>
                    <td className="px-5 py-4 font-medium text-slate-900">{formatCurrency(item.revenue || 0)}</td>
                    <td className="px-5 py-4 space-y-1">
                      <div>
                        <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${item.teachingDisabled ? 'bg-rose-50 text-rose-700' : 'bg-emerald-50 text-emerald-700'}`}>
                          Dạy học: {item.teachingDisabled ? 'Bị khóa' : 'Hoạt động'}
                        </span>
                        {item.teachingDisabledReason ? <p className="mt-0.5 max-w-xs text-xs text-slate-400">Lý do khóa dạy: {item.teachingDisabledReason}</p> : null}
                      </div>
                      <div>
                        <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${item.accountLocked ? 'bg-rose-50 text-rose-700' : 'bg-emerald-50 text-emerald-700'}`}>
                          Tài khoản: {item.accountLocked ? 'Bị khóa' : 'Hoạt động'}
                        </span>
                      </div>
                    </td>
                    <td className="px-5 py-4 text-right">
                      <div className="flex flex-col gap-2 items-end justify-center">
                        <button
                          onClick={() => toggleTeaching(item)}
                          className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold ${item.teachingDisabled ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100' : 'bg-rose-50 text-rose-700 hover:bg-rose-100'}`}
                        >
                          {item.teachingDisabled ? <CheckCircle2 className="h-3.5 w-3.5" /> : <Ban className="h-3.5 w-3.5" />}
                          {item.teachingDisabled ? 'Mở quyền dạy' : 'Khóa quyền dạy'}
                        </button>
                        <button
                          onClick={() => toggleLock(item)}
                          className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold ${item.accountLocked ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100' : 'bg-amber-50 text-amber-700 hover:bg-amber-100'}`}
                        >
                          {item.accountLocked ? <CheckCircle2 className="h-3.5 w-3.5" /> : <UserX className="h-3.5 w-3.5" />}
                          {item.accountLocked ? 'Mở tài khoản' : 'Khóa tài khoản'}
                        </button>
                      </div>
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
