import { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import axios from 'axios';
import { Ban, CheckCircle2, RefreshCw, ShieldCheck, Trash2, UserCog } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import DataTable from '../components/DataTable';
import DataTableToolbar from '../components/DataTableToolbar';

const ROLES = ['STUDENT', 'INSTRUCTOR'];

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

export default function AdminUsers({ fixedRole = '', title = 'Quản lý người dùng', allowRoleFilter = true }) {
  const { user: currentUser } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const roleParam = searchParams.get('role')?.toUpperCase() || 'STUDENT';

  const [users, setUsers] = useState([]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [pageSize, setPageSize] = useState(5);

  const activeRole = fixedRole || roleParam;

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await axios.get('/api/admin/users', {
        params: { q: query || undefined, role: activeRole || undefined, pageSize: 50 },
      });
      const allUsers = response.data.items || [];
      const filtered = allUsers.filter((u) => u.role !== 'ADMIN');
      setUsers(filtered);
    } catch (err) {
      setError(err.response?.data?.message || err.message);
    } finally {
      setLoading(false);
    }
  }, [query, activeRole]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleRoleChange = (newRole) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      if (newRole) {
        next.set('role', newRole.toLowerCase());
      } else {
        next.delete('role');
      }
      return next;
    });
  };

  const updateRole = async (userId, nextRole) => {
    try {
      const response = await axios.patch(`/api/admin/users/${userId}/role`, { role: nextRole });
      setUsers((prev) => prev.map((user) => (user.id === userId ? response.data : user)));
    } catch (err) {
      window.alert(err.response?.data?.message || err.message);
    }
  };

  const toggleLock = async (item) => {
    const locked = !item.accountLocked;
    const reason = locked ? window.prompt('Lý do khóa tài khoản:', item.accountLockReason || '') : '';
    if (locked && reason === null) return;

    try {
      const response = await axios.patch(`/api/admin/users/${item.id}/lock`, { locked, reason });
      setUsers((prev) => prev.map((user) => (user.id === item.id ? response.data : user)));
    } catch (err) {
      window.alert(err.response?.data?.message || err.message);
    }
  };

  const deleteUser = async (userId) => {
    if (!window.confirm('Chỉ xóa tài khoản chưa có dữ liệu học/giao dịch. Tiếp tục?')) return;

    try {
      await axios.delete(`/api/admin/users/${userId}`);
      setUsers((prev) => prev.filter((user) => user.id !== userId));
    } catch (err) {
      window.alert(err.response?.data?.message || err.message);
    }
  };

  const columns = [
    { title: 'Người dùng', data: 'name', className: 'px-5 py-4' },
    { title: 'Vai trò', data: 'role', className: 'px-5 py-4' },
    { title: 'Ví / giao dịch', data: 'walletBalance', className: 'px-5 py-4' },
    { title: 'Dữ liệu', data: 'id', className: 'px-5 py-4' },
    { title: 'Trạng thái', data: 'accountLocked', className: 'px-5 py-4' },
    { title: 'Thao tác', data: 'id', className: 'px-5 py-4 text-right', orderable: false }
  ];

  const slots = {
    0: (data, row) => (
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-50 font-semibold text-purple-700">
          {row.name?.charAt(0)?.toUpperCase() || 'U'}
        </div>
        <div>
          <p className="font-medium text-slate-900">{row.name}</p>
          <p className="text-xs text-slate-500">{row.email}</p>
        </div>
      </div>
    ),
    1: (data, row) => (
      allowRoleFilter ? (
        <select
          value={row.role}
          onChange={(event) => updateRole(row.id, event.target.value)}
          disabled={row.id === currentUser?.id}
          className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium outline-none disabled:bg-slate-50 disabled:text-slate-500"
        >
          {ROLES.map((item) => (
            <option key={item} value={item}>
              {roleLabel[item]}
            </option>
          ))}
        </select>
      ) : (
        <span className="rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-700">
          {roleLabel[row.role] || row.role}
        </span>
      )
    ),
    2: (data, row) => (
      <div className="text-slate-600">
        <p>{formatCurrency(row.walletBalance)}</p>
        <p className="text-xs text-slate-400">Đã chi {formatCurrency(row.totalSpent)}</p>
      </div>
    ),
    3: (data, row) => (
      <div className="text-slate-600">
        <p>{row._count?.enrollments || 0} ghi danh</p>
        <p className="text-xs text-slate-400">{row._count?.courses || 0} khóa học sở hữu</p>
      </div>
    ),
    4: (data, row) => (
      <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${row.accountLocked ? 'bg-rose-50 text-rose-700' : 'bg-emerald-50 text-emerald-700'}`}>
        {row.accountLocked ? 'Đang khóa' : 'Đang mở'}
      </span>
    ),
    5: (data, row) => (
      <div className="inline-flex items-center gap-2">
        {row.role === 'ADMIN' ? <ShieldCheck className="h-4 w-4 text-emerald-600" /> : <UserCog className="h-4 w-4 text-slate-400" />}
        {row.id !== currentUser?.id && (
          <>
            <button
              onClick={() => toggleLock(row)}
              className={`rounded-lg p-2 transition ${row.accountLocked ? 'text-emerald-600 hover:bg-emerald-50' : 'text-slate-400 hover:bg-amber-50 hover:text-amber-600'}`}
              title={row.accountLocked ? 'Mở khóa tài khoản' : 'Khóa tài khoản'}
            >
              {row.accountLocked ? <CheckCircle2 className="h-4 w-4" /> : <Ban className="h-4 w-4" />}
            </button>
            <button
              onClick={() => deleteUser(row.id)}
              className="rounded-lg p-2 text-slate-400 transition hover:bg-rose-50 hover:text-rose-600"
              title="Xóa người dùng"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </>
        )}
      </div>
    )
  };

  return (
    <div className="animate-fade-in-up space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">{title}</h1>
      </div>

      {allowRoleFilter && (
        <div className="flex flex-wrap gap-2 border-b border-slate-200">
          {[
            { id: 'STUDENT', label: 'Học viên' },
            { id: 'INSTRUCTOR', label: 'Giảng viên' },
          ].map((tab) => {
            const isActive = activeRole === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => handleRoleChange(tab.id)}
                className={`border-b-2 px-6 py-3 text-sm font-semibold transition ${
                  isActive
                    ? 'border-purple-600 text-purple-600'
                    : 'border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-700'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      )}

      <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
        <DataTableToolbar
          searchValue={query}
          onSearchChange={setQuery}
          onSearchKeyDown={(event) => {
            if (event.key === 'Enter') fetchUsers();
          }}
          placeholder="Tìm theo tên hoặc email"
          pageSize={pageSize}
          onPageSizeChange={setPageSize}
          actions={
            <button
              onClick={fetchUsers}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-xs font-semibold text-white hover:bg-slate-800 transition"
            >
              <RefreshCw className="h-4 w-4" />
              Tải lại
            </button>
          }
        />
        <DataTable
          data={users}
          columns={columns}
          slots={slots}
          loading={loading}
          error={error}
          pageSize={pageSize}
        />
      </div>
    </div>
  );
}
