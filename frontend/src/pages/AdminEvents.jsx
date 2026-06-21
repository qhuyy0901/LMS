import { useCallback, useEffect, useState } from 'react';
import axios from 'axios';
import { Calendar, RefreshCw } from 'lucide-react';
import DataTable from '../components/DataTable';
import DataTableToolbar from '../components/DataTableToolbar';

export default function AdminEvents() {
  const [items, setItems] = useState([]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [pageSize, setPageSize] = useState(5);

  const fetchItems = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await axios.get('/api/admin/events', { params: { q: query || undefined } });
      setItems(response.data || []);
    } catch (err) {
      setError(err.response?.data?.message || err.message);
    } finally {
      setLoading(false);
    }
  }, [query]);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  const columns = [
    { title: 'Sự kiện', data: 'title', className: 'px-5 py-4' },
    { title: 'Giảng viên', data: 'instructorName', className: 'px-5 py-4 text-slate-700' },
    { title: 'Thời gian', data: 'startsAt', className: 'px-5 py-4 text-slate-700' },
    { title: 'Đăng ký', data: 'registrationCount', className: 'px-5 py-4 text-slate-700' },
    { title: 'Trạng thái', data: 'status', className: 'px-5 py-4 text-slate-700' }
  ];

  const slots = {
    0: (data, row) => (
      <div className="flex items-center gap-3 font-medium text-slate-900">
        <Calendar className="h-4 w-4 text-purple-600" />
        {row.title}
      </div>
    ),
    2: (data, row) => (
      <span>
        {row.startsAt ? new Date(row.startsAt).toLocaleString('vi-VN') : '-'}
      </span>
    ),
    3: (data, row) => (
      <span>
        {row.registrationCount || 0}/{row.capacity || 0}
      </span>
    )
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Sự kiện</h1>
      </div>

      <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
        <DataTableToolbar
          searchValue={query}
          onSearchChange={setQuery}
          onSearchKeyDown={(event) => {
            if (event.key === 'Enter') fetchItems();
          }}
          placeholder="Tìm sự kiện hoặc giảng viên"
          pageSize={pageSize}
          onPageSizeChange={setPageSize}
          actions={
            <button
              onClick={fetchItems}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-800 transition"
            >
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
