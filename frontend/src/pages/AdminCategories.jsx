import { useCallback, useEffect, useState } from 'react';
import axios from 'axios';
import { FolderTree, RefreshCw } from 'lucide-react';
import DataTable from '../components/DataTable';
import DataTableToolbar from '../components/DataTableToolbar';

export default function AdminCategories() {
  const [items, setItems] = useState([]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [pageSize, setPageSize] = useState(5);

  const fetchItems = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await axios.get('/api/admin/categories', { params: { q: query || undefined } });
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
    { title: 'Danh mục', data: 'name', className: 'px-5 py-4 font-semibold text-slate-900' },
    { title: 'Khóa học', data: 'courseCount', className: 'px-5 py-4 text-slate-700' },
    { title: 'Đang xuất bản', data: 'publishedCount', className: 'px-5 py-4 text-slate-700' },
    { title: 'Học viên', data: 'studentCount', className: 'px-5 py-4 text-slate-700' }
  ];

  const slots = {
    0: (data, row) => (
      <div className="flex items-center gap-3">
        <FolderTree className="h-4 w-4 text-purple-600" />
        {row.name}
      </div>
    )
  };

  return (
    <div className="animate-fade-in-up space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Quản lý danh mục</h1>
      </div>

      <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
        <DataTableToolbar
          searchValue={query}
          onSearchChange={setQuery}
          onSearchKeyDown={(event) => {
            if (event.key === 'Enter') fetchItems();
          }}
          placeholder="Tìm danh mục"
          pageSize={pageSize}
          onPageSizeChange={setPageSize}
          actions={
            <button onClick={fetchItems} className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-xs font-semibold text-white transition hover:bg-slate-800">
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
