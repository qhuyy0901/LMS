import { useEffect, useState } from 'react';
import axios from 'axios';
import { ShieldCheck } from 'lucide-react';

export default function AdminSecurity() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchLogs = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await axios.get('/api/admin/audit-logs', { params: { pageSize: 50 } });
      setLogs(response.data.items || []);
    } catch (err) {
      setError(err.response?.data?.message || err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Bảo mật và audit log</h1>
        <p className="mt-1 text-sm text-slate-500">Theo dõi các hành động quản trị tác động đến người dùng, khóa học và giao dịch.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-5">
          <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-white text-emerald-700">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <p className="text-sm font-semibold text-slate-900">Audit logging</p>
          <p className="mt-1 text-sm text-slate-600">Đang ghi lại các thao tác admin quan trọng.</p>
        </div>
        <div className="rounded-2xl border border-amber-100 bg-amber-50 p-5">
          <p className="text-sm font-semibold text-slate-900">Cần làm tiếp</p>
          <p className="mt-1 text-sm text-slate-600">Đổi mật khẩu, 2FA, quản lý phiên đăng nhập và kiểm tra secret.</p>
        </div>
        <div className="rounded-2xl border border-slate-100 bg-white p-5">
          <p className="text-sm font-semibold text-slate-900">Bản ghi hiển thị</p>
          <p className="mt-1 text-2xl font-bold text-slate-900">{logs.length}</p>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
        {error ? <div className="p-6 text-sm text-rose-600">{error}</div> : null}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-100 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-5 py-4">Thời gian</th>
                <th className="px-5 py-4">Admin</th>
                <th className="px-5 py-4">Hành động</th>
                <th className="px-5 py-4">Đối tượng</th>
                <th className="px-5 py-4">Metadata</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {loading ? (
                <tr>
                  <td colSpan="5" className="px-5 py-10 text-center text-slate-500">
                    Đang tải audit log...
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan="5" className="px-5 py-10 text-center text-slate-500">
                    Chưa có audit log.
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/70">
                    <td className="px-5 py-4 text-slate-600">{new Date(log.createdAt).toLocaleString('vi-VN')}</td>
                    <td className="px-5 py-4">
                      <p className="text-slate-900">{log.actorEmail || 'System'}</p>
                      <p className="text-xs text-slate-400">{log.ipAddress || '-'}</p>
                    </td>
                    <td className="px-5 py-4 font-medium text-slate-900">{log.action}</td>
                    <td className="px-5 py-4 text-slate-600">
                      {log.entityType}
                      {log.entityId ? <span className="block text-xs text-slate-400">{log.entityId}</span> : null}
                    </td>
                    <td className="max-w-md px-5 py-4">
                      <pre className="max-h-24 overflow-auto rounded-lg bg-slate-50 p-2 text-xs text-slate-600">
                        {log.metadata ? JSON.stringify(log.metadata, null, 2) : '-'}
                      </pre>
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
