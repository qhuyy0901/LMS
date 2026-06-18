import { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import {
  BanknoteArrowDown,
  CheckCircle2,
  Landmark,
  Loader2,
  Search,
  ShieldCheck,
  WalletCards,
  Eye,
  EyeOff,
} from 'lucide-react';
import { getInstructorWallet } from '../api/instructorWalletApi';

const currencyFormatter = new Intl.NumberFormat('vi-VN', {
  style: 'currency',
  currency: 'VND',
  maximumFractionDigits: 0,
});

const dateFormatter = new Intl.DateTimeFormat('vi-VN', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
});

const formatCurrency = (value = 0) => currencyFormatter.format(Number(value || 0));
const formatDate = (value) => (value ? dateFormatter.format(new Date(value)) : '-');
const normalizeMoney = (value) => Number(String(value || '').replace(/[^\d]/g, '')) || 0;

const statusClasses = {
  PENDING: 'bg-amber-50 text-amber-700 border-amber-100',
  APPROVED: 'bg-blue-50 text-blue-700 border-blue-100',
  REJECTED: 'bg-rose-50 text-rose-700 border-rose-100',
  PAID: 'bg-emerald-50 text-emerald-700 border-emerald-100',
};

const InstructorRevenue = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [query, setQuery] = useState('');
  const [message, setMessage] = useState(null);
  const [showBalance, setShowBalance] = useState(() => {
    const saved = localStorage.getItem('lms_show_balance');
    return saved !== null ? JSON.parse(saved) : true;
  });
  const [form, setForm] = useState({
    bankName: '',
    accountHolder: '',
    accountNumber: '',
    amount: '',
    note: '',
  });

  const loadWallet = async () => {
    setLoading(true);
    try {
      const wallet = await getInstructorWallet();
      setData(wallet);
      setForm((current) => ({
        ...current,
        bankName: current.bankName || wallet?.payoutAccount?.bankName || '',
        accountHolder: current.accountHolder || wallet?.payoutAccount?.accountHolder || '',
        accountNumber: current.accountNumber || wallet?.payoutAccount?.accountNumber || '',
      }));
      setMessage(null);
    } catch (error) {
      setMessage({ type: 'error', text: error.response?.data?.message || 'Không thể tải ví doanh thu.' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadWallet();
  }, []);

  const amount = useMemo(() => normalizeMoney(form.amount), [form.amount]);
  const minimumWithdrawal = Number(data?.minimumWithdrawal || 100000);
  const availableBalance = Number(data?.availableBalance || 0);
  const canWithdraw = availableBalance >= minimumWithdrawal;

  const history = useMemo(() => {
    const keyword = query.trim().toLowerCase();
    const source = data?.history || data?.recentTransactions || [];
    if (!keyword) return source;
    return source.filter((item) =>
      [
        item.typeLabel,
        item.status,
        item.statusLabel,
        item.note,
        item.course?.title,
        item.user?.name,
        item.bankName,
        item.accountHolder,
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(keyword))
    );
  }, [data, query]);

  const updateForm = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }));
    setMessage(null);
  };

  const toggleShowBalance = () => {
    setShowBalance((prev) => {
      const next = !prev;
      localStorage.setItem('lms_show_balance', JSON.stringify(next));
      return next;
    });
  };

  const displayValue = (val) => {
    return showBalance ? formatCurrency(val) : '••••••';
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setMessage(null);

    if (!form.bankName.trim() || !form.accountHolder.trim() || !form.accountNumber.trim()) {
      setMessage({ type: 'error', text: 'Vui lòng nhập đầy đủ thông tin nhận tiền.' });
      return;
    }

    if (amount < minimumWithdrawal) {
      setMessage({ type: 'error', text: `Số tiền rút tối thiểu là ${formatCurrency(minimumWithdrawal)}.` });
      return;
    }

    if (amount > availableBalance) {
      setMessage({ type: 'error', text: 'Không được rút vượt quá số dư khả dụng.' });
      return;
    }

    setSubmitting(true);
    try {
      const response = await axios.post('/api/instructor/withdraw-request', {
        soTien: amount,
        bankName: form.bankName.trim(),
        accountHolder: form.accountHolder.trim(),
        accountNumber: form.accountNumber.trim(),
        ghiChu: form.note.trim() || null,
      });
      setData(response.data?.wallet || data);
      setForm((current) => ({ ...current, amount: '', note: '' }));
      setMessage({ type: 'success', text: response.data?.message || 'Đã tạo yêu cầu rút tiền.' });
    } catch (error) {
      setMessage({ type: 'error', text: error.response?.data?.message || 'Không thể tạo yêu cầu rút tiền.' });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-9 w-9 animate-spin text-purple-600" />
      </div>
    );
  }

  return (
    <div className="animate-fade-in-up space-y-6">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-slate-900">Ví doanh thu</h1>
          <button
            type="button"
            onClick={toggleShowBalance}
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 shadow-sm transition hover:bg-slate-50 hover:text-slate-900"
            title={showBalance ? 'Ẩn số dư' : 'Hiện số dư'}
          >
            {showBalance ? <EyeOff className="h-4.5 w-4.5" /> : <Eye className="h-4.5 w-4.5" />}
          </button>
        </div>
      </header>

      {message ? (
        <div
          className={`rounded-2xl border px-4 py-3 text-sm font-medium ${
            message.type === 'error'
              ? 'border-rose-100 bg-rose-50 text-rose-700'
              : 'border-emerald-100 bg-emerald-50 text-emerald-700'
          }`}
        >
          {message.text}
        </div>
      ) : null}

      <section className="grid gap-4 md:grid-cols-3">
        <MetricCard icon={WalletCards} label="Tổng doanh thu" value={displayValue(data?.totalRevenue)} tone="emerald" />
        <MetricCard icon={ShieldCheck} label="Số dư khả dụng để rút" value={displayValue(data?.availableBalance)} tone="purple" />
        <MetricCard icon={CheckCircle2} label="Số tiền đã rút" value={displayValue(data?.totalWithdrawn || data?.paidRevenue)} tone="slate" />
      </section>

      <div className="grid gap-6 xl:grid-cols-[0.9fr_1.4fr]">
        <form onSubmit={handleSubmit} className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
          <div className="mb-5 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-50 text-purple-700">
              <BanknoteArrowDown className="h-5 w-5" />
            </div>
            <div>
              <h2 className="font-semibold text-slate-900">Yêu cầu rút tiền</h2>
              <p className="text-xs text-slate-500">Tối thiểu {formatCurrency(minimumWithdrawal)}</p>
            </div>
          </div>

          <div className="space-y-4">
            <Input label="Ngân hàng" value={form.bankName} onChange={(value) => updateForm('bankName', value)} placeholder="Ví dụ: Vietcombank" />
            <Input label="Chủ tài khoản" value={form.accountHolder} onChange={(value) => updateForm('accountHolder', value)} placeholder="Tên chủ tài khoản" />
            <Input label="Số tài khoản" value={form.accountNumber} onChange={(value) => updateForm('accountNumber', value)} placeholder="Nhập số tài khoản" />
            <Input label="Số tiền rút" value={form.amount} onChange={(value) => updateForm('amount', value)} placeholder="Ví dụ: 500.000" inputMode="numeric" />
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-slate-500">Ghi chú</label>
              <textarea
                rows={3}
                value={form.note}
                onChange={(event) => updateForm('note', event.target.value)}
                placeholder="Thông tin bổ sung nếu cần"
                className="w-full resize-none rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm outline-none transition focus:border-purple-400 focus:ring-4 focus:ring-purple-100"
              />
            </div>
          </div>

          <div className="mt-5 rounded-xl border border-slate-100 bg-slate-50 p-4 text-sm text-slate-600">
            <p>Số dư khả dụng: <span className="font-semibold text-slate-900">{displayValue(availableBalance)}</span></p>
          </div>

          <button
            type="submit"
            disabled={submitting || !canWithdraw}
            className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-purple-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-purple-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <BanknoteArrowDown className="h-4 w-4" />}
            Yêu cầu rút tiền
          </button>
        </form>

        <section className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
          <div className="flex flex-col gap-3 border-b border-slate-100 p-5 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-50 text-slate-600">
                <Landmark className="h-5 w-5" />
              </div>
              <div>
                <h2 className="font-semibold text-slate-900">Lịch sử giao dịch</h2>
                <p className="text-xs text-slate-500">Bán khóa học, hoàn tiền và rút tiền.</p>
              </div>
            </div>
            <div className="relative w-full md:w-72">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Tìm giao dịch..."
                className="w-full rounded-full border border-slate-200 bg-slate-50 py-2.5 pl-9 pr-4 text-sm outline-none transition focus:border-purple-400 focus:bg-white focus:ring-4 focus:ring-purple-100"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left">
              <thead className="bg-slate-50 text-xs uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-5 py-3 font-semibold">Ngày</th>
                  <th className="px-5 py-3 font-semibold">Loại giao dịch</th>
                  <th className="px-5 py-3 font-semibold">Nội dung</th>
                  <th className="px-5 py-3 text-right font-semibold">Số tiền</th>
                  <th className="px-5 py-3 text-right font-semibold">Trạng thái</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {history.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="px-5 py-10 text-center text-sm text-slate-500">Chưa có giao dịch doanh thu.</td>
                  </tr>
                ) : (
                  history.map((item) => (
                    <tr key={`${item.type}-${item.id}`} className="text-sm">
                      <td className="whitespace-nowrap px-5 py-4 text-slate-500">{formatDate(item.createdAt || item.date)}</td>
                      <td className="px-5 py-4 font-semibold text-slate-900">{item.typeLabel || mapType(item.type)}</td>
                      <td className="px-5 py-4 text-slate-600">
                        <p className="line-clamp-1">{item.note || item.course?.title || item.bankName || '-'}</p>
                        {item.user?.name || item.accountHolder ? (
                          <p className="mt-1 text-xs text-slate-400">{item.user?.name || item.accountHolder}</p>
                        ) : null}
                      </td>
                      <td className={`whitespace-nowrap px-5 py-4 text-right font-semibold ${Number(item.amount) < 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                        {showBalance ? formatCurrency(item.amount) : '••••••'}
                      </td>
                      <td className="px-5 py-4 text-right">
                        <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${statusClasses[item.status] || statusClasses.PENDING}`}>
                          {item.statusLabel || item.status || 'Pending'}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  );
};

const MetricCard = ({ icon: Icon, label, value, tone }) => {
  const tones = {
    emerald: 'bg-emerald-50 text-emerald-600',
    sky: 'bg-sky-50 text-sky-600',
    amber: 'bg-amber-50 text-amber-600',
    purple: 'bg-purple-50 text-purple-600',
    slate: 'bg-slate-100 text-slate-600',
    rose: 'bg-rose-50 text-rose-600',
  };

  return (
    <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
      <div className="flex items-start gap-4">
        <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${tones[tone]}`}>
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-medium text-slate-500">{label}</p>
          <p className="mt-1 break-words text-2xl font-bold text-slate-900">{value}</p>
        </div>
      </div>
    </div>
  );
};

const Input = ({ label, value, onChange, placeholder, inputMode = 'text' }) => (
  <div>
    <label className="mb-1.5 block text-xs font-semibold text-slate-500">{label}</label>
    <input
      value={value}
      onChange={(event) => onChange(event.target.value)}
      placeholder={placeholder}
      inputMode={inputMode}
      className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm outline-none transition focus:border-purple-400 focus:ring-4 focus:ring-purple-100"
    />
  </div>
);

const mapType = (type) => {
  if (type === 'WITHDRAWAL') return 'Rút tiền';
  if (type === 'REFUND') return 'Hoàn tiền';
  if (type === 'SYSTEM_COMMISSION') return 'Hoa hồng hệ thống';
  return 'Bán khóa học';
};

export default InstructorRevenue;
