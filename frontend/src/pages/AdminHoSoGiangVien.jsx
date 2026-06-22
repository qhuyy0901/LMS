import { useCallback, useEffect, useState } from 'react';
import axios from 'axios';
import { Check, ExternalLink, FileText, RefreshCw, X } from 'lucide-react';
import DataTable from '../components/DataTable';
import DataTableToolbar from '../components/DataTableToolbar';

const statusLabel = {
  PENDING: 'Chờ duyệt',
  APPROVED: 'Đã duyệt',
  REJECTED: 'Từ chối',
};

const statusClass = {
  PENDING: 'bg-amber-50 text-amber-700 border-amber-100',
  APPROVED: 'bg-emerald-50 text-emerald-700 border-emerald-100',
  REJECTED: 'bg-rose-50 text-rose-700 border-rose-100',
};

export default function AdminHoSoGiangVien() {
  const [applications, setApplications] = useState([]);
  const [status, setStatus] = useState('PENDING');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [pageSize, setPageSize] = useState(5);

  const fetchApplications = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await axios.get('/api/admin/instructor-applications', {
        params: { status, pageSize: 50 },
      });
      setApplications(response.data.items || []);
    } catch (err) {
      setError(err.response?.data?.message || err.message);
    } finally {
      setLoading(false);
    }
  }, [status]);

  useEffect(() => {
    fetchApplications();
  }, [fetchApplications]);

  const approve = async (id) => {
    if (!window.confirm('Duyệt hồ sơ này và cấp quyền giảng viên?')) return;
    try {
      await axios.post(`/api/admin/instructor-applications/${id}/approve`);
      fetchApplications();
    } catch (err) {
      window.alert(err.response?.data?.message || err.message);
    }
  };

  const reject = async (id) => {
    const reason = window.prompt('Nhập lý do từ chối:');
    if (reason === null) return;
    try {
      await axios.post(`/api/admin/instructor-applications/${id}/reject`, { ghiChu: reason });
      fetchApplications();
    } catch (err) {
      window.alert(err.response?.data?.message || err.message);
    }
  };

  const columns = [
    { title: 'Ứng viên', data: 'fullName', className: 'px-5 py-4' },
    { title: 'Chuyên môn', data: 'expertise', className: 'px-5 py-4' },
    { title: 'Hồ sơ', data: 'certificateFilePath', className: 'px-5 py-4' },
    { title: 'Lý do / Động lực', data: 'motivation', className: 'px-5 py-4' },
    { title: 'Trạng thái', data: 'status', className: 'px-5 py-4' },
    { title: 'Thao tác', data: 'id', className: 'px-5 py-4 text-right', orderable: false }
  ];

  const slots = {
    0: (data, row) => (
      <div>
        <p className="font-medium text-slate-900">{row.fullName}</p>
        <p className="text-xs text-slate-500">{row.email}</p>
        {row.phone ? <p className="text-xs text-slate-400">{row.phone}</p> : null}
      </div>
    ),
    1: (data, row) => (
      <div>
        <p className="font-medium text-slate-800">{row.expertise}</p>
        <p className="mt-1 max-w-xs text-xs text-slate-500">{row.experience || '-'}</p>
      </div>
    ),
    2: (data, row) => (
      <div className="text-slate-600">
        {row.certificateFilePath ? (
          <p className="flex items-center gap-2"><FileText className="h-4 w-4 text-purple-500" />{row.certificateFilePath}</p>
        ) : '-'}
        {row.portfolioUrl ? (
          <a className="mt-1 flex items-center gap-1 text-xs text-purple-600 hover:underline" href={row.portfolioUrl} target="_blank" rel="noreferrer">
            Portfolio <ExternalLink className="h-3 w-3" />
          </a>
        ) : null}
        {row.linkedinUrl ? (
          <a className="mt-1 flex items-center gap-1 text-xs text-purple-600 hover:underline" href={row.linkedinUrl} target="_blank" rel="noreferrer">
            LinkedIn <ExternalLink className="h-3 w-3" />
          </a>
        ) : null}
      </div>
    ),
    3: (data, row) => (
      <div>
        <p className="max-w-sm text-xs leading-relaxed text-slate-600">{row.motivation}</p>
        {row.rejectReason ? (
          <p className="mt-2 text-xs font-semibold text-rose-600">Lý do từ chối: {row.rejectReason}</p>
        ) : null}
      </div>
    ),
    4: (data, row) => (
      <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-medium ${statusClass[row.status] || 'bg-slate-50 text-slate-600 border-slate-100'}`}>
        {statusLabel[row.status] || row.status}
      </span>
    ),
    5: (data, row) => (
      row.status === 'PENDING' ? (
        <div className="inline-flex items-center gap-2">
          <button onClick={() => approve(row.id)} className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100" title="Duyệt">
            <Check className="h-4 w-4" />
          </button>
          <button onClick={() => reject(row.id)} className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-rose-50 text-rose-700 hover:bg-rose-100" title="Từ chối">
            <X className="h-4 w-4" />
          </button>
        </div>
      ) : (
        <span className="text-xs text-slate-400">Đã xử lý</span>
      )
    )
  };

  return (
    <div className="animate-fade-in-up space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Hồ sơ đăng ký giảng viên</h1>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
        <DataTableToolbar
          pageSize={pageSize}
          onPageSizeChange={setPageSize}
          filters={
            <select
              value={status}
              onChange={(event) => setStatus(event.target.value)}
              className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold outline-none transition focus:border-purple-400 focus:ring-2 focus:ring-purple-100"
            >
              <option value="PENDING">Chờ duyệt</option>
              <option value="APPROVED">Đã duyệt</option>
              <option value="REJECTED">Từ chối</option>
              <option value="ALL">Tất cả</option>
            </select>
          }
          actions={
            <button onClick={fetchApplications} className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-800 transition">
              <RefreshCw className="h-4 w-4" />
              Tải lại
            </button>
          }
        />
        <DataTable
          data={applications}
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
