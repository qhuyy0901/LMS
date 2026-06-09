import { useCallback, useEffect, useState } from 'react';
import axios from 'axios';
import { RefreshCw, ShieldCheck, Trash2, UserCog } from 'lucide-react';

const ROLES = ['STUDENT', 'INSTRUCTOR', 'ADMIN'];

const roleLabel = {
  STUDENT: 'Học viên',
  INSTRUCTOR: 'Giảng viên',
  ADMIN: 'Admin',
};

const formatCurrency = (amount = 0) =>
  new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(amount);

export default function AdminUsers() {
  const [users, setUsers] = useState([]);
  const [query, setQuery] = useState('');
  const [role, setRole] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await axios.get('/api/admin/users', {
        params: { q: query || undefined, role: role || undefined, pageSize: 50 },
      });
      setUsers(response.data.items || []);
    } catch (err) {
      setError(err.response?.data?.message || err.message);
    } finally {
      setLoading(false);
    }
  }, [query, role]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const updateRole = async (userId, nextRole) => {
    try {
      const response = await axios.patch(`/api/admin/users/${userId}/role`, { role: nextRole });
      setUsers((prev) => prev.map((user) => (user.id === userId ? response.data : user)));
    } catch (err) {
      window.alert(err.response?.data?.message || err.message);
    }
  };

  const deleteUser = async (userId) => {
    if (!window.confirm('Xóa người dùng này? Hành động này sẽ xóa các dữ liệu liên quan.')) return;

    try {
      await axios.delete(`/api/admin/users/${userId}`);
      setUsers((prev) => prev.filter((user) => user.id !== userId));
    } catch (err) {
      window.alert(err.response?.data?.message || err.message);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Quản lý người dùng</h1>
          <p className="mt-1 text-sm text-slate-500">Cấp quyền, kiểm tra ví và xử lý tài khoản trong hệ thống.</p>
        </div>
        <button
          onClick={fetchUsers}
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
            if (event.key === 'Enter') fetchUsers();
          }}
          placeholder="Tìm theo tên hoặc email"
          className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none transition focus:border-purple-400 focus:ring-2 focus:ring-purple-100"
        />
        <select
          value={role}
          onChange={(event) => setRole(event.target.value)}
          className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none transition focus:border-purple-400 focus:ring-2 focus:ring-purple-100"
        >
          <option value="">Tất cả vai trò</option>
          {ROLES.map((item) => (
            <option key={item} value={item}>
              {roleLabel[item]}
            </option>
          ))}
        </select>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
        {error ? <div className="p-6 text-sm text-rose-600">{error}</div> : null}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-100 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-5 py-4">Người dùng</th>
                <th className="px-5 py-4">Vai trò</th>
                <th className="px-5 py-4">Ví</th>
                <th className="px-5 py-4">Hoạt động</th>
                <th className="px-5 py-4 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {loading ? (
                <tr>
                  <td colSpan="5" className="px-5 py-10 text-center text-slate-500">
                    Đang tải người dùng...
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan="5" className="px-5 py-10 text-center text-slate-500">
                    Không có người dùng phù hợp.
                  </td>
                </tr>
              ) : (
                users.map((user) => (
                  <tr key={user.id} className="hover:bg-slate-50/70">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-50 font-semibold text-purple-700">
                          {user.name?.charAt(0)?.toUpperCase() || 'U'}
                        </div>
                        <div>
                          <p className="font-medium text-slate-900">{user.name}</p>
                          <p className="text-xs text-slate-500">{user.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <select
                        value={user.role}
                        onChange={(event) => updateRole(user.id, event.target.value)}
                        className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium outline-none"
                      >
                        {ROLES.map((item) => (
                          <option key={item} value={item}>
                            {roleLabel[item]}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="px-5 py-4 text-slate-600">
                      <p>{formatCurrency(user.walletBalance)}</p>
                      <p className="text-xs text-slate-400">Đã chi {formatCurrency(user.totalSpent)}</p>
                    </td>
                    <td className="px-5 py-4 text-slate-600">
                      <p>{user._count?.enrollments || 0} ghi danh</p>
                      <p className="text-xs text-slate-400">{user._count?.courses || 0} khóa học sở hữu</p>
                    </td>
                    <td className="px-5 py-4 text-right">
                      <div className="inline-flex items-center gap-2">
                        {user.role === 'ADMIN' ? <ShieldCheck className="h-4 w-4 text-emerald-600" /> : <UserCog className="h-4 w-4 text-slate-400" />}
                        <button
                          onClick={() => deleteUser(user.id)}
                          className="rounded-lg p-2 text-slate-400 transition hover:bg-rose-50 hover:text-rose-600"
                          title="Xóa người dùng"
                        >
                          <Trash2 className="h-4 w-4" />
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
