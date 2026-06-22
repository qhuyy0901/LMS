import { useCallback, useEffect, useState } from 'react';
import axios from 'axios';
import { MessageCircle, RefreshCw, Search } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import DataTable from '../components/DataTable';
import DataTableToolbar from '../components/DataTableToolbar';

const filters = [
  ['ALL', 'Tất cả'],
  ['STUDENT', 'Học viên'],
  ['INSTRUCTOR', 'Giảng viên'],
];

export default function AdminSupport() {
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [query, setQuery] = useState('');
  const [role, setRole] = useState('ALL');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [pageSize, setPageSize] = useState(5);

  const fetchItems = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await axios.get('/api/admin/support/contacts', {
        params: { role, q: query || undefined },
      });
      setItems(response.data || []);
    } catch (err) {
      setError(err.response?.data?.message || err.message);
    } finally {
      setLoading(false);
    }
  }, [query, role]);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  const openChat = (item) => {
    navigate(`/messages?userId=${item.id}`);
  };

  const columns = [
    { title: 'Người dùng', data: 'name', className: 'px-5 py-4' },
    { title: 'Thao tác', data: 'id', className: 'px-5 py-4 text-right', orderable: false }
  ];

  const slots = {
    0: (data, row) => (
      <span>
        <span className="block font-medium text-slate-900">{row.name}</span>
        <span className="block text-xs text-slate-500">{row.email}</span>
      </span>
    ),
    1: (data, row) => (
      <button
        onClick={() => openChat(row)}
        className="inline-flex items-center gap-2 rounded-lg bg-purple-50 px-3 py-2 text-xs font-semibold text-purple-700 hover:bg-purple-100 transition"
      >
        <MessageCircle className="h-4 w-4" />
        Mở chat
      </button>
    )
  };

  return (
    <div className="animate-fade-in-up space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Tin nhắn hỗ trợ</h1>
      </div>

      <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
        <DataTableToolbar
          searchValue={query}
          onSearchChange={setQuery}
          onSearchKeyDown={(event) => {
            if (event.key === 'Enter') fetchItems();
          }}
          placeholder="Tìm học viên hoặc giảng viên"
          pageSize={pageSize}
          onPageSizeChange={setPageSize}
          filters={
            <div className="inline-flex rounded-xl border border-slate-200 bg-slate-50 p-1">
              {filters.map(([value, label]) => (
                <button
                  key={value}
                  onClick={() => setRole(value)}
                  className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${role === value ? 'bg-white text-purple-750 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
                >
                  {label}
                </button>
              ))}
            </div>
          }
          actions={
            <button onClick={fetchItems} className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-800 transition">
              <RefreshCw className="h-4 w-4" />
              Tải lại
            </button>
          }
        />
        <DataTable
          data={items}
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
