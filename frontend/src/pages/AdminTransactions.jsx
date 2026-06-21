import { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import axios from 'axios';
import { CreditCard, RefreshCw, Landmark, Check, X, Search } from 'lucide-react';
import DataTable from '../components/DataTable';
import DataTableToolbar from '../components/DataTableToolbar';

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

const transactionStatusClasses = {
  COMPLETED: 'bg-emerald-50 text-emerald-700 border border-emerald-100',
  SUCCESS: 'bg-emerald-50 text-emerald-700 border border-emerald-100',
  PENDING: 'bg-amber-50 text-amber-700 border border-amber-100',
  FAILED: 'bg-rose-50 text-rose-700 border border-rose-100',
  CANCELLED: 'bg-rose-50 text-rose-750 border border-rose-100',
};

const transactionStatusLabel = {
  COMPLETED: 'Thành công',
  SUCCESS: 'Thành công',
  PENDING: 'Chờ xử lý',
  FAILED: 'Thất bại',
  CANCELLED: 'Đã hủy',
};

const withdrawStatusClasses = {
  PENDING: 'bg-amber-50 text-amber-700 border border-amber-100',
  COMPLETED: 'bg-emerald-50 text-emerald-700 border border-emerald-100',
  SUCCESS: 'bg-emerald-50 text-emerald-700 border border-emerald-100',
  PAID: 'bg-emerald-50 text-emerald-700 border border-emerald-100',
  REJECTED: 'bg-rose-50 text-rose-700 border border-rose-100',
};

const withdrawStatusLabel = {
  PENDING: 'Chờ duyệt',
  COMPLETED: 'Đã thanh toán',
  SUCCESS: 'Đã thanh toán',
  PAID: 'Đã thanh toán',
  REJECTED: 'Đã từ chối',
};

export default function AdminTransactions({ initialTab = 'all' }) {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') || initialTab || 'all';

  const [transactions, setTransactions] = useState([]);
  const [withdrawals, setWithdrawals] = useState([]);
  const [statusFilter, setStatusFilter] = useState('');
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [pageSize, setPageSize] = useState(5);

  const fetchTransactions = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      let typeParam = '';
      if (activeTab === 'deposit') typeParam = 'NAP_TIEN';
      else if (activeTab === 'purchase') typeParam = 'MUA_KHOA_HOC';

      const response = await axios.get('/api/admin/transactions', {
        params: {
          type: typeParam || undefined,
          status: statusFilter || undefined,
          q: query || undefined,
          pageSize: 50,
        },
      });
      setTransactions(response.data.items || []);
    } catch (err) {
      setError(err.response?.data?.message || err.message);
    } finally {
      setLoading(false);
    }
  }, [activeTab, statusFilter, query]);

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

  const handleTabChange = (tabId) => {
    setSearchParams({ tab: tabId });
    setQuery('');
    setStatusFilter('');
  };

  const handleRefresh = () => {
    if (activeTab !== 'withdrawals') {
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
    if (activeTab !== 'withdrawals') {
      fetchTransactions();
    } else {
      fetchWithdrawals();
    }
  }, [activeTab, fetchTransactions, fetchWithdrawals]);

  const filteredWithdrawals = withdrawals.filter((item) => {
    if (statusFilter && item.status !== statusFilter) return false;
    if (!query) return true;
    const lowerQuery = query.toLowerCase();
    return (
      item.instructorName?.toLowerCase().includes(lowerQuery) ||
      item.instructorEmail?.toLowerCase().includes(lowerQuery) ||
      item.bankName?.toLowerCase().includes(lowerQuery) ||
      item.accountNumber?.toLowerCase().includes(lowerQuery) ||
      item.accountHolder?.toLowerCase().includes(lowerQuery)
    );
  });

  const columnsTransactions = [
    { title: 'Giao dịch', data: 'type', className: 'px-5 py-4' },
    { title: 'Người dùng', data: 'user.name', className: 'px-5 py-4' },
    { title: 'Khóa học', data: 'course.title', className: 'px-5 py-4' },
    { title: 'Thanh toán ngoài', data: 'id', className: 'px-5 py-4' },
    { title: 'Trạng thái', data: 'status', className: 'px-5 py-4' },
    { title: 'Số tiền', data: 'amount', className: 'px-5 py-4 text-right' }
  ];

  const slotsTransactions = {
    0: (data, row) => (
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-amber-700">
          <CreditCard className="h-5 w-5" />
        </div>
        <div>
          <p className="font-medium text-slate-900">{transactionLabel[row.type] || row.type}</p>
          <p className="text-xs text-slate-500">{new Date(row.createdAt).toLocaleString('vi-VN')}</p>
          {row.note ? <p className="mt-0.5 text-xs text-slate-400 max-w-xs truncate">{row.note}</p> : null}
        </div>
      </div>
    ),
    1: (data, row) => (
      <div>
        <p className="text-slate-900">{row.user?.name || '-'}</p>
        <p className="text-xs text-slate-500">{row.user?.email || ''}</p>
      </div>
    ),
    2: (data, row) => (
      <span className="text-slate-600">
        {row.course?.title || '-'}
      </span>
    ),
    3: (data, row) => (
      row.externalPayment ? (
        <div>
          <p>
            {row.externalPayment.provider} - {row.externalPayment.status}
          </p>
          <p className="text-xs text-slate-400">{formatCurrency(row.externalPayment.amount)}</p>
        </div>
      ) : (
        '-'
      )
    ),
    4: (data, row) => (
      <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${transactionStatusClasses[row.status] || 'bg-slate-50 text-slate-700 border border-slate-100'}`}>
        {transactionStatusLabel[row.status] || row.status}
      </span>
    ),
    5: (data, row) => (
      <div className="text-right">
        <p className={row.amount >= 0 ? 'font-semibold text-emerald-600' : 'font-semibold text-rose-600'}>
          {row.amount >= 0 ? '+' : ''}{formatCurrency(row.amount)}
        </p>
        <p className="text-xs text-slate-400">Sau GD {formatCurrency(row.balanceAfter)}</p>
      </div>
    )
  };

  const columnsWithdrawals = [
    { title: 'Giảng viên', data: 'instructorName', className: 'px-5 py-4' },
    { title: 'Số tiền', data: 'amount', className: 'px-5 py-4 font-semibold text-slate-950' },
    { title: 'Ngân hàng', data: 'bankName', className: 'px-5 py-4' },
    { title: 'Ghi chú', data: 'note', className: 'px-5 py-4 max-w-[200px] truncate' },
    { title: 'Thời gian', data: 'createdAt', className: 'px-5 py-4 text-slate-500' },
    { title: 'Trạng thái', data: 'status', className: 'px-5 py-4 text-center' },
    { title: 'Thao tác', data: 'id', className: 'px-5 py-4 text-right', orderable: false }
  ];

  const slotsWithdrawals = {
    0: (data, row) => (
      <div>
        <p className="font-medium text-slate-900">{row.instructorName}</p>
        <p className="text-xs text-slate-500">{row.instructorEmail}</p>
      </div>
    ),
    1: (data, row) => (
      <span>
        {formatCurrency(row.amount)}
      </span>
    ),
    2: (data, row) => (
      <div className="flex items-center gap-2">
        <Landmark className="h-4 w-4 text-slate-400 shrink-0" />
        <div>
          <p className="font-medium text-slate-900">{row.bankName}</p>
          <p className="text-xs text-slate-600">{row.accountNumber}</p>
          <p className="text-[11px] text-slate-500 uppercase">{row.accountHolder}</p>
        </div>
      </div>
    ),
    3: (data, row) => (
      <span title={row.note}>
        {row.note || '-'}
      </span>
    ),
    4: (data, row) => (
      <span>
        {new Date(row.createdAt).toLocaleString('vi-VN')}
      </span>
    ),
    5: (data, row) => {
      const statusClass = withdrawStatusClasses[row.status] || 'bg-slate-50 text-slate-700';
      const statusText = withdrawStatusLabel[row.status] || row.status;
      return (
        <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium border ${statusClass}`}>
          {statusText}
        </span>
      );
    },
    6: (data, row) => (
      row.status === 'PENDING' ? (
        <div className="flex justify-end gap-2">
          <button
            onClick={() => handleApprove(row.id)}
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition"
            title="Phê duyệt"
          >
            <Check className="h-4 w-4" />
          </button>
          <button
            onClick={() => handleReject(row.id)}
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-rose-50 text-rose-700 hover:bg-rose-100 transition"
            title="Từ chối"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ) : (
        <span className="text-xs text-slate-400">-</span>
      )
    )
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Quản lý giao dịch</h1>
        </div>
      </div>

      {/* Tab Switcher */}
      <div className="flex flex-wrap gap-2 border-b border-slate-200">
        {[
          { id: 'all', label: 'Tất cả giao dịch' },
          { id: 'deposit', label: 'Nạp ví' },
          { id: 'purchase', label: 'Mua khóa học' },
          { id: 'withdrawals', label: 'Yêu cầu rút tiền' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => handleTabChange(tab.id)}
            className={`border-b-2 px-6 py-3 text-sm font-semibold transition ${
              activeTab === tab.id
                ? 'border-purple-600 text-purple-600'
                : 'border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-700'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
        <DataTableToolbar
          searchValue={query}
          onSearchChange={setQuery}
          placeholder={
            activeTab === 'withdrawals'
              ? "Tìm theo tên giảng viên, email hoặc ngân hàng"
              : "Tìm theo email, mã GD hoặc nội dung"
          }
          pageSize={pageSize}
          onPageSizeChange={setPageSize}
          filters={
            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
              className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold outline-none transition focus:border-purple-400 focus:ring-2 focus:ring-purple-100"
            >
              <option value="">Tất cả trạng thái</option>
              {activeTab === 'withdrawals' ? (
                <>
                  <option value="PENDING">Chờ duyệt (PENDING)</option>
                  <option value="COMPLETED">Đã thanh toán (COMPLETED)</option>
                  <option value="REJECTED">Đã từ chối (REJECTED)</option>
                </>
              ) : (
                <>
                  <option value="COMPLETED">Thành công (COMPLETED)</option>
                  <option value="PENDING">Chờ xử lý (PENDING)</option>
                  <option value="FAILED">Thất bại (FAILED)</option>
                </>
              )}
            </select>
          }
          actions={
            <button
              onClick={handleRefresh}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-800 transition"
            >
              <RefreshCw className="h-4 w-4" />
              Tải lại
            </button>
          }
        />
        {activeTab !== 'withdrawals' ? (
          <DataTable
            data={transactions}
            columns={columnsTransactions}
            slots={slotsTransactions}
            loading={loading}
            error={error}
            pageSize={pageSize}
          />
        ) : (
          <DataTable
            data={filteredWithdrawals}
            columns={columnsWithdrawals}
            slots={slotsWithdrawals}
            loading={loading}
            error={error}
            pageSize={pageSize}
          />
        )}
      </div>
    </div>
  );
}
