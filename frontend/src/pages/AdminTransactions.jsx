import { useCallback, useEffect, useState } from 'react';
import axios from 'axios';
import { CreditCard, RefreshCw } from 'lucide-react';

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

export default function AdminTransactions() {
  const [transactions, setTransactions] = useState([]);
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

  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Đối soát giao dịch</h1>
          <p className="mt-1 text-sm text-slate-500">Theo dõi nạp ví, mua khóa học và số dư sau giao dịch.</p>
        </div>
        <button
          onClick={fetchTransactions}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-medium text-white"
        >
          <RefreshCw className="h-4 w-4" />
          Tải lại
        </button>
      </div>

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
    </div>
  );
}
