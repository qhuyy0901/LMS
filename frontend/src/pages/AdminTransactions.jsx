import { useCallback, useEffect, useState } from 'react';
import axios from 'axios';
import { CreditCard, RefreshCw, Landmark, Check, X } from 'lucide-react';

const formatCurrency = (amount = 0) =>
  new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(amount);

const transactionLabel = {
  NAP_TIEN: 'Nạp ví',
  TOP_UP: 'Nạp ví',
  MUA_KHOA_HOC: 'Mua khóa học',
  COURSE_PURCHASE: 'Mua khóa học',
  HOAN_TIEN: 'Hoàn tiền',
  REFUND: 'Hoàn tiền',
  ADJUSTMENT: 'Điều chỉnh',
};

const typeOptions = [
  ['NAP_TIEN', 'Nạp ví'],
  ['MUA_KHOA_HOC', 'Mua khóa học'],
  ['HOAN_TIEN', 'Hoàn tiền'],
  ['ADJUSTMENT', 'Điều chỉnh'],
];

const withdrawStatusClasses = {
  PENDING: 'bg-amber-50 text-amber-700 border border-amber-100',
  COMPLETED: 'bg-emerald-50 text-emerald-700 border border-emerald-100',
  SUCCESS: 'bg-emerald-50 text-emerald-700 border border-emerald-100',
  PAID: 'bg-emerald-50 text-emerald-700 border border-emerald-100',
  REJECTED: 'bg-rose-50 text-rose-700 border border-rose-100',
};

const withdrawStatusLabel = {
  PENDING: 'Chờ duyệt',
  COMPLETED: 'Đã hoàn tất',
  SUCCESS: 'Đã hoàn tất',
  PAID: 'Đã hoàn tất',
  REJECTED: 'Đã từ chối',
};

export default function AdminTransactions() {
  const [activeTab, setActiveTab] = useState('transactions');
  const [transactions, setTransactions] = useState([]);
  const [withdrawals, setWithdrawals] = useState([]);
  const [type, setType] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchTransactions = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await axios.get('/api/admin/transactions', {
        params: { type: type || undefined, pageSize: 50 },
      });
      setTransactions(response.data.items || []);
    } catch (err) {
      setError(err.response?.data?.message || err.message);
    } finally {
      setLoading(false);
    }
  }, [type]);

  const fetchWithdrawals = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await axios.get('/api/admin/withdrawals');
      setWithdrawals(response.data || []);
    } catch (err) {
      setError(err.response?.data?.message || err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    if (tab === 'transactions') {
      fetchTransactions();
    } else {
      fetchWithdrawals();
    }
  };

  const handleRefresh = () => {
    if (activeTab === 'transactions') {
      fetchTransactions();
    } else {
      fetchWithdrawals();
    }
  };

  const handleApprove = async (id) => {
    if (!window.confirm('Bạn có chắc chắn muốn phê duyệt yêu cầu rút tiền này?')) return;
    try {
      await axios.post(`/api/admin/withdrawals/${id}/approve`);
      alert('Đã phê duyệt thành công.');
      fetchWithdrawals();
    } catch (err) {
      alert(err.response?.data?.message || err.message || 'Lỗi khi phê duyệt.');
    }
  };

  const handleReject = async (id) => {
    const reason = window.prompt('Nhập lý do từ chối (không bắt buộc):');
    if (reason === null) return;
    try {
      await axios.post(`/api/admin/withdrawals/${id}/reject`, { ghiChu: reason });
      alert('Đã từ chối yêu cầu.');
      fetchWithdrawals();
    } catch (err) {
      alert(err.response?.data?.message || err.message || 'Lỗi khi từ chối.');
    }
  };

  useEffect(() => {
    if (activeTab === 'transactions') {
      fetchTransactions();
    } else {
      fetchWithdrawals();
    }
  }, [activeTab, fetchTransactions, fetchWithdrawals]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Quản lý giao dịch & ví</h1>
          <p className="mt-1 text-sm text-slate-500">Đối soát giao dịch nạp/mua của học viên và duyệt rút tiền cho giảng viên.</p>
        </div>
        <button
          onClick={handleRefresh}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-slate-800"
        >
          <RefreshCw className="h-4 w-4" />
          Tải lại
        </button>
      </div>

      {/* Tab Switcher */}
      <div className="flex gap-2 border-b border-slate-200">
        <button
          onClick={() => handleTabChange('transactions')}
          className={`border-b-2 px-6 py-3 text-sm font-medium transition ${
            activeTab === 'transactions'
              ? 'border-purple-600 text-purple-600'
              : 'border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-700'
          }`}
        >
          Đối soát giao dịch
        </button>
        <button
          onClick={() => handleTabChange('withdrawals')}
          className={`border-b-2 px-6 py-3 text-sm font-medium transition ${
            activeTab === 'withdrawals'
              ? 'border-purple-600 text-purple-600'
              : 'border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-700'
          }`}
        >
          Yêu cầu rút tiền
        </button>
      </div>

      {activeTab === 'transactions' ? (
        <>
          <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
            <select
              value={type}
              onChange={(event) => setType(event.target.value)}
              className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none transition focus:border-purple-400 focus:ring-2 focus:ring-purple-100 md:w-64"
            >
              <option value="">Tất cả loại giao dịch</option>
              {typeOptions.map(([key, label]) => (
                <option key={key} value={key}>
                  {label}
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
                    <th className="px-5 py-4">Giao dịch</th>
                    <th className="px-5 py-4">Người dùng</th>
                    <th className="px-5 py-4">Khóa học</th>
                    <th className="px-5 py-4">Thanh toán ngoài</th>
                    <th className="px-5 py-4 text-right">Số tiền</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {loading ? (
                    <tr>
                      <td colSpan="5" className="px-5 py-10 text-center text-slate-500">
                        Đang tải giao dịch...
                      </td>
                    </tr>
                  ) : transactions.length === 0 ? (
                    <tr>
                      <td colSpan="5" className="px-5 py-10 text-center text-slate-500">
                        Chưa có giao dịch.
                      </td>
                    </tr>
                  ) : (
                    transactions.map((item) => (
                      <tr key={item.id} className="hover:bg-slate-50/70">
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-amber-700">
                              <CreditCard className="h-5 w-5" />
                            </div>
                            <div>
                              <p className="font-medium text-slate-900">{transactionLabel[item.type] || item.type}</p>
                              <p className="text-xs text-slate-500">{new Date(item.createdAt).toLocaleString('vi-VN')}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-5 py-4">
                          <p className="text-slate-900">{item.user?.name || '-'}</p>
                          <p className="text-xs text-slate-500">{item.user?.email || ''}</p>
                        </td>
                        <td className="px-5 py-4 text-slate-600">{item.course?.title || '-'}</td>
                        <td className="px-5 py-4 text-slate-600">
                          {item.externalPayment ? (
                            <>
                              <p>
                                {item.externalPayment.provider} - {item.externalPayment.status}
                              </p>
                              <p className="text-xs text-slate-400">{formatCurrency(item.externalPayment.amount)}</p>
                            </>
                          ) : (
                            '-'
                          )}
                        </td>
                        <td className="px-5 py-4 text-right">
                          <p className={item.amount >= 0 ? 'font-semibold text-emerald-600' : 'font-semibold text-slate-900'}>{formatCurrency(item.amount)}</p>
                          <p className="text-xs text-slate-400">Sau GD {formatCurrency(item.balanceAfter)}</p>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
          {error ? <div className="p-6 text-sm text-rose-600">{error}</div> : null}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-100 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-5 py-4">Giảng viên</th>
                  <th className="px-5 py-4">Số tiền</th>
                  <th className="px-5 py-4">Ngân hàng</th>
                  <th className="px-5 py-4">Ghi chú</th>
                  <th className="px-5 py-4">Thời gian</th>
                  <th className="px-5 py-4 text-center">Trạng thái</th>
                  <th className="px-5 py-4 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {loading ? (
                  <tr>
                    <td colSpan="7" className="px-5 py-10 text-center text-slate-500">
                      Đang tải danh sách rút tiền...
                    </td>
                  </tr>
                ) : withdrawals.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="px-5 py-10 text-center text-slate-500">
                      Không có yêu cầu rút tiền nào.
                    </td>
                  </tr>
                ) : (
                  withdrawals.map((item) => {
                    const statusClass = withdrawStatusClasses[item.status] || 'bg-slate-50 text-slate-700';
                    const statusText = withdrawStatusLabel[item.status] || item.status;

                    return (
                      <tr key={item.id} className="hover:bg-slate-50/70">
                        <td className="px-5 py-4">
                          <p className="font-medium text-slate-900">{item.instructorName}</p>
                          <p className="text-xs text-slate-500">{item.instructorEmail}</p>
                        </td>
                        <td className="px-5 py-4 font-semibold text-slate-950">
                          {formatCurrency(item.amount)}
                        </td>
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-2">
                            <Landmark className="h-4 w-4 text-slate-400 shrink-0" />
                            <div>
                              <p className="font-medium text-slate-900">{item.bankName}</p>
                              <p className="text-xs text-slate-600">{item.accountNumber}</p>
                              <p className="text-[11px] text-slate-500 uppercase">{item.accountHolder}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-5 py-4 text-slate-600 max-w-[200px] truncate" title={item.note}>
                          {item.note || '-'}
                        </td>
                        <td className="px-5 py-4 text-slate-500">
                          {new Date(item.createdAt).toLocaleString('vi-VN')}
                        </td>
                        <td className="px-5 py-4 text-center">
                          <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${statusClass}`}>
                            {statusText}
                          </span>
                        </td>
                        <td className="px-5 py-4 text-right">
                          {item.status === 'PENDING' ? (
                            <div className="flex justify-end gap-2">
                              <button
                                onClick={() => handleApprove(item.id)}
                                className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition"
                                title="Phê duyệt"
                              >
                                <Check className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => handleReject(item.id)}
                                className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-rose-50 text-rose-700 hover:bg-rose-100 transition"
                                title="Từ chối"
                              >
                                <X className="h-4 w-4" />
                              </button>
                            </div>
                          ) : (
                            <span className="text-xs text-slate-400">-</span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
