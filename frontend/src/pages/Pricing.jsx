import { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';

// Pixel-perfect minimalist SVG Icons
const WalletIcon = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" fill="none" stroke="currentColor" strokeWidth="16" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <rect x="32" y="48" width="192" height="160" rx="8" />
    <path d="M168,128a16,16,0,1,1-16-16H224v32H168A16,16,0,0,1,168,128Z" />
  </svg>
);

const LandmarkIcon = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" fill="none" stroke="currentColor" strokeWidth="16" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <line x1="16" y1="216" x2="240" y2="216" />
    <line x1="32" y1="216" x2="32" y2="104" />
    <line x1="224" y1="216" x2="224" y2="104" />
    <polygon points="16 104 128 40 240 104 16 104" />
    <line x1="80" y1="216" x2="80" y2="104" />
    <line x1="128" y1="216" x2="128" y2="104" />
    <line x1="176" y1="216" x2="176" y2="104" />
  </svg>
);

const InfoIcon = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" fill="none" stroke="currentColor" strokeWidth="16" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <circle cx="128" cy="128" r="96" />
    <line x1="128" y1="120" x2="128" y2="180" />
    <circle cx="128" cy="80" r="8" fill="currentColor" />
  </svg>
);

const ClockIcon = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" fill="none" stroke="currentColor" strokeWidth="16" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <circle cx="128" cy="128" r="96" />
    <polyline points="128 72 128 128 184 128" />
  </svg>
);

const CheckIcon = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" fill="none" stroke="currentColor" strokeWidth="20" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <polyline points="216 72 104 184 48 128" />
  </svg>
);

const CheckCircleIcon = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" fill="none" stroke="currentColor" strokeWidth="16" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <circle cx="128" cy="128" r="96" />
    <polyline points="92 128 116 152 164 104" />
  </svg>
);

const PRESET_AMOUNTS = [100000, 200000, 500000, 1000000, 2000000];

const TIER_WEIGHTS = {
  BRONZE: 0,
  SILVER: 1,
  GOLD: 2,
  PLATINUM: 3,
  DIAMOND: 4,
};

const TIERS_LIST = [
  { id: 'BRONZE', name: 'Đồng', desc: 'Thành viên mới. Quyền truy cập các khóa học cơ bản.', milestone: 0, badgeColor: 'bg-amber-50 text-amber-800 border border-amber-100' },
  { id: 'SILVER', name: 'Bạc', desc: 'Ưu đãi giảm 5% học phí cho thành viên.', milestone: 1000000, badgeColor: 'bg-slate-50 text-slate-700 border border-slate-100' },
  { id: 'GOLD', name: 'Vàng', desc: 'Ưu đãi giảm 10% học phí. Mở khóa học cấp độ Vàng.', milestone: 3000000, badgeColor: 'bg-yellow-50 text-yellow-800 border border-yellow-100' },
  { id: 'PLATINUM', name: 'Bạch kim', desc: 'Ưu đãi giảm 15% học phí. Mở khóa học cấp độ Bạch kim.', milestone: 7000000, badgeColor: 'bg-sky-50 text-sky-800 border border-sky-100' },
  { id: 'DIAMOND', name: 'Kim cương', desc: 'Ưu đãi giảm 20% học phí. Mở khóa toàn bộ khóa học hệ thống.', milestone: 15000000, badgeColor: 'bg-purple-50 text-purple-800 border border-purple-100' },
];

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

  const tierInfo = useMemo(() => {
    const balance = walletBalance;
    if (balance >= 15000000) {
      return {
        current: 'DIAMOND',
        label: 'Kim cương',
        next: null,
        nextLabel: '',
        needed: 0,
        percent: 100,
      };
    }
    if (balance >= 7000000) {
      return {
        current: 'PLATINUM',
        label: 'Bạch kim',
        next: 'DIAMOND',
        nextLabel: 'Kim cương',
        needed: 15000000 - balance,
        percent: Math.min(100, Math.round((balance / 15000000) * 100)),
      };
    }
    if (balance >= 3000000) {
      return {
        current: 'GOLD',
        label: 'Vàng',
        next: 'PLATINUM',
        nextLabel: 'Bạch kim',
        needed: 7000000 - balance,
        percent: Math.min(100, Math.round((balance / 7000000) * 100)),
      };
    }
    if (balance >= 1000000) {
      return {
        current: 'SILVER',
        label: 'Bạc',
        next: 'GOLD',
        nextLabel: 'Vàng',
        needed: 3000000 - balance,
        percent: Math.min(100, Math.round((balance / 3000000) * 100)),
      };
    }
    return {
      current: 'BRONZE',
      label: 'Đồng',
      next: 'SILVER',
      nextLabel: 'Bạc',
      needed: 1000000 - balance,
      percent: Math.min(100, Math.round((balance / 1000000) * 100)),
    };
  }, [walletBalance]);

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
    <div className="animate-fade-in-up min-h-screen w-full max-w-full overflow-x-hidden bg-transparent px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl space-y-6">
        


        {/* Membership Progress & Tier Milestones */}
        <section className="min-w-0 rounded-lg border border-[#EAEAEA] bg-white p-6 lg:p-8 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-sm font-bold uppercase tracking-wider text-[#111111]">Hạng thành viên & Tiến trình tích lũy</h2>

            </div>
            {tierInfo.next && (
              <div className="text-right text-xs">
                <span className="text-[#787774]">Cần thêm </span>
                <span className="font-bold text-purple-700">{formatCurrency(tierInfo.needed)}</span>
                <span className="text-[#787774]"> để lên hạng </span>
                <span className="font-bold text-[#111111]">{tierInfo.nextLabel}</span>
              </div>
            )}
          </div>

          {tierInfo.next && (
            <div className="space-y-2">
              <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden border border-[#EAEAEA]/30">
                <div 
                  className="bg-purple-700 h-full rounded-full transition-all duration-500"
                  style={{ width: `${tierInfo.percent}%` }}
                />
              </div>
              <div className="flex justify-between text-[10px] text-slate-400 font-semibold uppercase tracking-wider">
                <span>{tierInfo.label} ({tierInfo.percent}%)</span>
                <span>{tierInfo.nextLabel}</span>
              </div>
            </div>
          )}

          {/* Tiers Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            {TIERS_LIST.map((tier) => {
              const isCurrent = tierInfo.current === tier.id;
              const isUnlocked = isCurrent || TIER_WEIGHTS[tierInfo.current] > TIER_WEIGHTS[tier.id];
              return (
                <div 
                  key={tier.id}
                  className={`rounded-lg border p-4.5 flex flex-col justify-between min-h-[100px] transition duration-150 ${
                    isCurrent 
                      ? 'border-purple-600 bg-purple-50/20 ring-1 ring-purple-600' 
                      : isUnlocked 
                        ? 'border-[#EAEAEA] bg-white opacity-80' 
                        : 'border-[#EAEAEA] bg-[#FBFBFA]/60 opacity-60'
                  }`}
                >
                  <div>
                    <div className="flex justify-between items-start gap-2">
                      <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${tier.badgeColor}`}>
                        {tier.name}
                      </span>
                      {isCurrent ? (
                        <span className="text-[9px] font-bold uppercase tracking-wider text-purple-700 bg-purple-100/60 px-1.5 py-0.5 rounded border border-purple-200/20">Hiện tại</span>
                      ) : isUnlocked ? (
                        <span className="text-[9px] font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-100">Đã đạt</span>
                      ) : null}
                    </div>
                  </div>
                  
                  <div className="mt-4 pt-3 border-t border-dashed border-[#EAEAEA] flex justify-between items-center text-[10px]">
                    <span className="text-slate-400 uppercase font-semibold">Mốc số dư</span>
                    <span className="font-bold text-[#111111]">{formatCurrency(tier.milestone)}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {(message || error) && (
          <div
            className={`rounded-lg border px-5 py-4 text-xs font-semibold ${
              error 
                ? 'border-rose-100 bg-[#FDEBEC] text-[#9F2F2D]' 
                : 'border-[#EAEAEA] bg-[#EDF3EC] text-[#346538]'
            }`}
          >
            {error || message}
          </div>
        )}

        {/* Action & Invoice Section */}
        <section className="grid min-w-0 gap-5 xl:grid-cols-[minmax(0,420px)_minmax(0,1fr)]">
          
          {/* Preset Topup Grid */}
          <div className="min-w-0 rounded-lg border border-[#EAEAEA] bg-white p-6 lg:p-8">
            <h2 className="text-sm font-bold uppercase tracking-wider text-[#111111]">Tạo yêu cầu nạp ví</h2>

            <div className="mt-6">

              <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                {PRESET_AMOUNTS.map((value) => {
                  const isActive = !customAmount && selectedAmount === value;
                  return (
                    <button
                      key={value}
                      type="button"
                      onClick={() => handlePresetClick(value)}
                      className={`relative min-w-0 rounded-lg border px-4 py-3.5 text-left transition duration-150 active:scale-[0.98] ${
                        isActive
                          ? 'border-purple-600 bg-purple-50/50 text-[#111111]'
                          : 'border-[#EAEAEA] bg-white text-[#2F3437] hover:border-purple-300 hover:text-purple-700'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold">{formatCurrency(value)}</span>
                        {isActive && (
                          <div className="flex h-4.5 w-4.5 items-center justify-center rounded bg-purple-700 text-white">
                            <CheckIcon className="h-3.5 w-3.5" />
                          </div>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="mt-6">
              <label className="mb-2.5 block text-xs font-semibold text-[#787774]" htmlFor="custom-amount">
                Hoặc nhập số tiền tùy chọn (VND)
              </label>
              <div className="relative">
                <WalletIcon className="absolute left-3.5 top-1/2 h-4.5 w-4.5 -translate-y-1/2 text-slate-400" />
                <input
                  id="custom-amount"
                  value={customAmount}
                  onChange={(event) => setCustomAmount(event.target.value)}
                  placeholder="Ví dụ: 100.000"
                  inputMode="numeric"
                  className="w-full rounded-lg border border-[#EAEAEA] bg-white pl-10 pr-12 py-3 text-xs font-bold text-[#111111] outline-none transition focus:border-purple-600 focus:ring-1 focus:ring-purple-600"
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-400">VND</span>
              </div>
              <p className="mt-2 text-[10px] text-slate-400">Yêu cầu tối thiểu 100.000đ và tối đa 2.000.000đ.</p>
            </div>
          </div>

          {/* Payment Invoice Card */}
          <div className="min-w-0 rounded-lg border border-[#EAEAEA] bg-white p-6 lg:p-8">
            <div className="mb-5 flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-purple-50 border border-purple-100 text-purple-700">
                <LandmarkIcon className="h-4.5 w-4.5" />
              </div>
              <h2 className="text-sm font-bold uppercase tracking-wider text-[#111111]">Thông tin chuyển khoản giả lập</h2>
            </div>

            <div className="min-w-0 rounded-lg border border-[#EAEAEA] bg-[#FBFBFA] p-5 lg:p-6">
              <div className="grid min-w-0 gap-6 lg:grid-cols-[minmax(0,1fr)_180px]">
                <dl className="min-w-0 text-xs space-y-1">
                  <InfoRow label="Ngân hàng" value="MB Bank" />
                  <InfoRow label="Chủ tài khoản" value="LMS SKILLIO DEMO" />
                  <InfoRow label="Số tài khoản" value="0901000000" />
                  <InfoRow label="Số tiền cần nạp" value={formatCurrency(amount)} highlight />
                  <InfoRow label="Nội dung chuyển khoản" value={transferCode} isCode />
                </dl>

                {/* QR DEMO Wrapper with positioning corners and technical glow */}
                <div className="relative flex min-h-[160px] w-full items-center justify-center rounded-lg border border-[#EAEAEA] bg-white p-3 shadow-[0_2px_6px_rgba(0,0,0,0.01)]">
                  {/* Scanner corners design */}
                  <div className="absolute top-2 left-2 h-3 w-3 border-t-2 border-l-2 border-purple-700 rounded-tl-sm" />
                  <div className="absolute top-2 right-2 h-3 w-3 border-t-2 border-r-2 border-purple-700 rounded-tr-sm" />
                  <div className="absolute bottom-2 left-2 h-3 w-3 border-b-2 border-l-2 border-purple-700 rounded-bl-sm" />
                  <div className="absolute bottom-2 right-2 h-3 w-3 border-b-2 border-r-2 border-purple-700 rounded-br-sm" />
                  
                  {/* Subtle technical scanner line effect */}
                  <div className="absolute top-2 left-2 right-2 h-0.5 bg-gradient-to-r from-transparent via-purple-500 to-transparent opacity-30 animate-pulse" style={{ animationDuration: '2.5s' }} />

                  <div className="flex flex-col items-center justify-center">
                    <span className="text-center text-[10px] font-bold tracking-[0.2em] text-purple-700">QR DEMO</span>
                    <span className="mt-1 text-[8px] text-slate-400 uppercase tracking-wider font-semibold">Scan to mock pay</span>
                  </div>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={confirmDemoPayment}
              disabled={loading}
              className="mt-5 flex w-full items-center justify-center gap-2 rounded-lg bg-purple-700 px-5 py-3.5 text-sm font-semibold text-white transition duration-150 hover:bg-purple-800 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? (
                <>
                  <ClockIcon className="h-4.5 w-4.5 animate-spin text-white" />
                  Đang xử lý nạp ví...
                </>
              ) : (
                <>
                  <CheckCircleIcon className="h-4.5 w-4.5" />
                  Xác nhận thanh toán demo (Cộng tiền ngay)
                </>
              )}
            </button>
          </div>
        </section>

        {/* Ledger Transaction History */}
        <section className="min-w-0 rounded-lg border border-[#EAEAEA] bg-white p-6 lg:p-8">
          <div className="mb-5 flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#FDEBEC] border border-rose-100 text-[#9F2F2D]">
              <WalletIcon className="h-4.5 w-4.5" />
            </div>
            <div>
              <h2 className="text-sm font-bold uppercase tracking-wider text-[#111111]">Lịch sử giao dịch ví</h2>

            </div>
          </div>

          {historyLoading ? (
            <div className="space-y-2.5">
              {[1, 2, 3].map((item) => (
                <div key={item} className="h-14 animate-pulse rounded-lg bg-[#F7F6F3]" />
              ))}
            </div>
          ) : history.length === 0 ? (
            <div className="rounded-lg border border-dashed border-[#EAEAEA] bg-[#FBFBFA] px-5 py-10 text-center text-xs text-[#787774]">
              Chưa ghi nhận giao dịch phát sinh.
            </div>
          ) : (
            <div className="divide-y divide-[#EAEAEA]/60">
              {history.slice(0, 8).map((item) => {
                const isCredit = item.amount >= 0;
                return (
                  <div key={item.id} className="flex min-w-0 flex-col gap-3 py-3.5 sm:flex-row sm:items-center sm:justify-between text-xs">
                    <div className="flex min-w-0 items-center gap-3.5">
                      <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${
                        isCredit 
                          ? 'bg-[#EDF3EC] text-[#346538] border border-emerald-100' 
                          : 'bg-[#FDEBEC] text-[#9F2F2D] border border-rose-100'
                      }`}>
                        <InfoIcon className="h-4.5 w-4.5" />
                      </div>
                      <div className="min-w-0">
                        <p className="break-words font-semibold text-[#111111]">{item.note || item.type}</p>
                        <p className="mt-0.5 text-[10px] text-[#787774] font-medium tracking-wide">
                          {formatDateTime(item.createdAt)}
                          {item.course?.title ? ` · ${item.course.title}` : ''}
                        </p>
                      </div>
                    </div>
                    <div className="sm:text-right">
                      <p className={`font-bold ${isCredit ? 'text-[#346538]' : 'text-[#111111]'}`}>
                        {item.amountText}
                      </p>
                      <p className="mt-0.5 text-[10px] text-[#787774]">Số dư: {item.balanceAfterText}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </div>
  );
};

const InfoRow = ({ label, value, highlight, isCode }) => (
  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between py-3 border-b border-dashed border-[#EAEAEA] last:border-0 text-xs gap-2">
    <dt className="font-semibold text-[#787774]">{label}</dt>
    <dd className={`mt-0.5 sm:mt-0 font-bold break-all sm:text-right ${
      highlight ? 'text-purple-700 text-sm' : 'text-[#111111]'
    } ${
      isCode ? 'font-mono bg-purple-50 text-purple-700 border border-purple-100/50 px-2 py-0.5 rounded text-[10px] select-all' : ''
    }`}>
      {value}
    </dd>
  </div>
);

export default WalletTopup;
