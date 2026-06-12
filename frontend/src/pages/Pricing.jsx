import { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { BadgeInfo, CheckCircle2, Clock3, Landmark, Wallet } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const PRESET_AMOUNTS = [100000, 200000, 500000, 1000000, 2000000];

const formatCurrency = (value = 0) =>
  new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(value);

const formatDateTime = (value) => {
  if (!value) return '';
  return new Intl.DateTimeFormat('vi-VN', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(new Date(value));
};

const normalizeAmount = (value) => Number(String(value).replace(/[^\d]/g, '')) || 0;

const WalletTopup = () => {
  const { user, refreshUser } = useAuth();
  const [selectedAmount, setSelectedAmount] = useState(1000000);
  const [customAmount, setCustomAmount] = useState('');
  const [walletBalance, setWalletBalance] = useState(user?.walletBalance || 0);
  const [history, setHistory] = useState([]);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(true);

  const amount = useMemo(() => normalizeAmount(customAmount) || selectedAmount, [customAmount, selectedAmount]);
  const transferCode = useMemo(() => {
    const name = user?.name || 'Hoc vien';
    const safeName = name
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/đ/g, 'd')
      .replace(/Đ/g, 'D')
      .replace(/[^a-zA-Z0-9 ]/g, '')
      .trim();
    return `LMS ${user?.id?.slice(0, 8)?.toUpperCase() || 'DEMO'} ${safeName || 'Hoc vien'}`;
  }, [user?.id, user?.name]);

  const loadHistory = async () => {
    setHistoryLoading(true);
    try {
      const response = await axios.get('/api/user/billing-history');
      setHistory(Array.isArray(response.data) ? response.data : []);
      setError('');
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Không thể tải lịch sử giao dịch.');
    } finally {
      setHistoryLoading(false);
    }
  };

  useEffect(() => {
    setWalletBalance(user?.walletBalance || 0);
  }, [user?.walletBalance]);

  useEffect(() => {
    loadHistory();
  }, []);

  const handlePresetClick = (value) => {
    setSelectedAmount(value);
    setCustomAmount('');
    setMessage('');
    setError('');
  };

  const confirmDemoPayment = async () => {
    setMessage('');
    setError('');

    if (amount < 100000 || amount > 2000000 || amount % 10000 !== 0) {
      setError('Số tiền nạp phải từ 100.000đ đến 2.000.000đ và là bội số của 10.000đ.');
      return;
    }

    setLoading(true);
    try {
      await axios.post('/api/payments/create-checkout-session', {
        type: 'topup',
        amount,
      });
      const nextUser = await refreshUser?.();
      if (nextUser) {
        setWalletBalance(nextUser.walletBalance || 0);
      } else {
        setWalletBalance((current) => current + amount);
      }
      await loadHistory();
      setMessage('Đã tạo yêu cầu nạp ví. Giao dịch đang xử lý.');
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Không thể xác nhận thanh toán demo.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full max-w-full overflow-x-hidden bg-transparent px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl space-y-6">
        <section className="grid min-w-0 gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
          <div className="min-w-0 rounded-3xl border border-slate-100 bg-gradient-to-br from-white via-white to-indigo-50 p-7 shadow-sm lg:p-9">
            <p className="mb-5 text-xs font-bold uppercase tracking-[0.28em] text-purple-600">Ví sinh viên</p>
            <h1 className="text-4xl font-extrabold tracking-tight text-slate-900 md:text-5xl">Ví của tôi</h1>
            <p className="mt-5 max-w-3xl text-base leading-8 text-slate-500">
              Nạp ví demo cho đồ án. Hệ thống chỉ tạo thông tin thanh toán mock, không kết nối VNPay, Momo,
              ZaloPay hoặc ngân hàng thật.
            </p>
          </div>

          <div className="min-w-0 overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-indigo-950 to-purple-900 p-7 text-white shadow-xl shadow-purple-900/20 lg:p-9">
            <p className="mb-7 text-sm font-semibold text-indigo-100">Số dư hiện tại</p>
            <p className="break-words text-4xl font-extrabold tracking-tight sm:text-5xl">{formatCurrency(walletBalance)}</p>
            <p className="mt-8 max-w-sm text-sm leading-7 text-indigo-100">
              Số dư sẽ cập nhật ngay sau khi bấm Xác nhận thanh toán demo.
            </p>
          </div>
        </section>

        {(message || error) && (
          <div
            className={`rounded-2xl border px-5 py-4 text-sm font-semibold ${
              error ? 'border-rose-200 bg-rose-50 text-rose-700' : 'border-emerald-200 bg-emerald-50 text-emerald-700'
            }`}
          >
            {error || message}
          </div>
        )}

        <section className="grid min-w-0 gap-5 xl:grid-cols-[minmax(0,420px)_minmax(0,1fr)]">
          <div className="min-w-0 rounded-3xl border border-slate-100 bg-white p-6 shadow-sm lg:p-8">
            <h2 className="text-2xl font-bold tracking-tight text-slate-900">Tạo yêu cầu nạp ví</h2>

            <div className="mt-7">
              <p className="mb-3 text-sm font-bold text-slate-700">Chọn mệnh giá nạp</p>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {PRESET_AMOUNTS.map((value) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => handlePresetClick(value)}
                    className={`min-w-0 rounded-xl border px-4 py-4 text-left text-base font-bold transition ${
                      !customAmount && selectedAmount === value
                        ? 'border-purple-400 bg-purple-50 text-purple-700 ring-4 ring-purple-50'
                        : 'border-slate-200 bg-white text-slate-900 hover:border-purple-200'
                    }`}
                  >
                    {formatCurrency(value)}
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-8">
              <label className="mb-3 block text-sm font-bold text-slate-700" htmlFor="custom-amount">
                Nhập số tiền tùy chọn
              </label>
              <input
                id="custom-amount"
                value={customAmount}
                onChange={(event) => setCustomAmount(event.target.value)}
                placeholder="Ví dụ: 100.000"
                inputMode="numeric"
                className="w-full rounded-xl border border-slate-200 bg-white px-5 py-4 text-base font-semibold text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-purple-400 focus:ring-4 focus:ring-purple-50"
              />
              <p className="mt-2 text-xs text-slate-400">Tối thiểu 100.000đ, tối đa 2.000.000đ.</p>
            </div>
          </div>

          <div className="min-w-0 rounded-3xl border border-slate-100 bg-white p-6 shadow-sm lg:p-8">
            <div className="mb-6 flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-purple-50 text-purple-600">
                <Landmark className="h-5 w-5" />
              </div>
              <h2 className="text-2xl font-bold tracking-tight text-slate-900">Thông tin thanh toán demo</h2>
            </div>

            <div className="min-w-0 rounded-2xl border border-purple-100 bg-purple-50/40 p-5">
              <div className="grid min-w-0 gap-6 lg:grid-cols-[minmax(0,1fr)_180px]">
                <dl className="min-w-0 divide-y divide-purple-100 text-sm">
                  <InfoRow label="Ngân hàng" value="MB Bank" />
                  <InfoRow label="Chủ tài khoản" value="LMS SKILLIO DEMO" />
                  <InfoRow label="Số tài khoản" value="0901000000" />
                  <InfoRow label="Số tiền cần nạp" value={formatCurrency(amount)} />
                  <InfoRow label="Nội dung chuyển khoản" value={transferCode} />
                </dl>

                <div className="flex min-h-44 min-w-0 items-center justify-center rounded-2xl border-2 border-dashed border-purple-400 bg-white/50">
                  <span className="text-center text-lg font-extrabold tracking-[0.18em] text-purple-600">QR DEMO</span>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={confirmDemoPayment}
              disabled={loading}
              className="mt-5 flex w-full items-center justify-center gap-2 rounded-full bg-emerald-600 px-5 py-4 text-base font-bold text-white shadow-lg shadow-emerald-600/20 transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {loading ? (
                <>
                  <Clock3 className="h-5 w-5 animate-spin" />
                  Đang xác nhận...
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-5 w-5" />
                  Xác nhận thanh toán demo
                </>
              )}
            </button>
          </div>
        </section>

        <section className="min-w-0 rounded-3xl border border-slate-100 bg-white p-6 shadow-sm lg:p-8">
          <div className="mb-5 flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
              <Wallet className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-2xl font-bold tracking-tight text-slate-900">Lịch sử giao dịch</h2>
              <p className="mt-1 text-sm text-slate-500">Theo dõi các lần nạp ví và mua khóa học gần đây.</p>
            </div>
          </div>

          {historyLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((item) => (
                <div key={item} className="h-16 animate-pulse rounded-2xl bg-slate-100" />
              ))}
            </div>
          ) : history.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-5 py-10 text-center text-sm text-slate-500">
              Chưa có giao dịch ví nào.
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {history.slice(0, 8).map((item) => (
                <div key={item.id} className="flex min-w-0 flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex min-w-0 items-start gap-3">
                    <div className={`mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${item.amount >= 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-500'}`}>
                      <BadgeInfo className="h-5 w-5" />
                    </div>
                    <div className="min-w-0">
                      <p className="break-words font-semibold text-slate-900">{item.note || item.type}</p>
                      <p className="mt-1 text-xs text-slate-400">
                        {formatDateTime(item.createdAt)}
                        {item.course?.title ? ` - ${item.course.title}` : ''}
                      </p>
                    </div>
                  </div>
                  <div className="sm:text-right">
                    <p className={`font-bold ${item.amount >= 0 ? 'text-emerald-600' : 'text-slate-900'}`}>{item.amountText}</p>
                    <p className="mt-1 text-xs text-slate-400">Số dư sau GD: {item.balanceAfterText}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
};

const InfoRow = ({ label, value }) => (
  <div className="grid min-w-0 gap-2 py-4 sm:grid-cols-[145px_minmax(0,1fr)]">
    <dt className="font-semibold text-slate-500">{label}</dt>
    <dd className="min-w-0 break-words font-extrabold text-slate-900">{value}</dd>
  </div>
);

export default WalletTopup;
