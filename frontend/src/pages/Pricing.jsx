import { useMemo, useState } from 'react';
import { ArrowRight, BadgeCheck, Coins, Crown, Sparkles, Wallet } from 'lucide-react';
import axios from 'axios';

const TOP_UP_PACKAGES = [
  { amount: 100000, label: 'Nạp nhanh', bonus: 'Hợp để mua các khóa học free + giá mềm' },
  { amount: 200000, label: 'Học đều', bonus: 'Phù hợp cho 1-2 khóa học ngắn hạn' },
  { amount: 500000, label: 'Tăng tốc', bonus: 'Mức được chọn nhiều nhất cho học viên' },
  { amount: 1000000, label: 'Cam kết dài hạn', bonus: 'Giữ số dư lớn để vào khóa học bất kỳ lúc nào' },
];

const MEMBER_TIERS = [
  { key: 'BRONZE', label: 'Đồng', threshold: '0đ', perks: 'Bắt đầu hành trình học tập và mở khóa học bằng ví nội bộ.' },
  { key: 'SILVER', label: 'Bạc', threshold: '1.000.000đ', perks: 'Hiển thị danh hiệu Bạc trên hồ sơ và trong khu vực học tập.' },
  { key: 'GOLD', label: 'Vàng', threshold: '3.000.000đ', perks: 'Tăng độ ưu tiên hồ sơ và tạo dấu ấn cho thành viên tích cực.' },
  { key: 'PLATINUM', label: 'Bạch kim', threshold: '7.000.000đ', perks: 'Danh hiệu cao cấp cho học viên mua nhiều khóa học chuyên sâu.' },
  { key: 'DIAMOND', label: 'Kim cương', threshold: '15.000.000đ', perks: 'Cấp hội viên cao nhất, phù hợp cho người học đường dài.' },
];

const formatCurrency = (amount) =>
  new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(amount);

const Pricing = () => {
  const [loadingAmount, setLoadingAmount] = useState(null);
  const featuredPack = useMemo(() => TOP_UP_PACKAGES[2], []);

  const handleTopUp = async (amount) => {
    try {
      setLoadingAmount(amount);
      const response = await axios.post('/api/payments/create-checkout-session', {
        type: 'topup',
        amount,
      });

      if (response.data.url) {
        window.location.href = response.data.url;
      }
    } catch (error) {
      console.error('Wallet top-up error:', error);
      alert(error.response?.data?.message || 'Không thể khởi tạo giao dịch lúc này');
    } finally {
      setLoadingAmount(null);
    }
  };

  return (
    <div className="min-h-screen bg-transparent py-8 px-4 sm:px-6 lg:px-8">
      {import.meta.env.DEV && (
        <div className="max-w-7xl mx-auto mb-8 bg-amber-500/10 border border-amber-500/20 rounded-3xl p-6 backdrop-blur-sm shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-4 text-left">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/20 flex items-center justify-center flex-shrink-0 animate-pulse">
              <Sparkles className="w-6 h-6 text-amber-600" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-amber-900">Chế độ Thử nghiệm (Mock Payment) đang BẬT</h3>
              <p className="text-sm text-amber-700 mt-0.5 leading-relaxed">
                Hệ thống đang chạy trong môi trường cục bộ. Bạn không cần thẻ Visa hay tài khoản ngân hàng thật. Hãy click chọn bất kỳ mệnh giá nào dưới đây để được **nạp tiền ảo tức thì hoàn toàn miễn phí**!
              </p>
            </div>
          </div>
          <div className="flex-shrink-0 bg-amber-600 text-white text-xs font-semibold px-3 py-1.5 rounded-full uppercase tracking-wider shadow-sm shadow-amber-600/10">
            Developer Tool
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto mb-10">
        <div className="text-center max-w-3xl mx-auto mb-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-100 text-amber-700 text-sm font-semibold mb-6">
            <Wallet className="w-4 h-4" />
            <span>Ví nội bộ và danh hiệu hội viên</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-extrabold text-slate-900 tracking-tight mb-6">
            Nạp ví một lần, mở khóa học linh hoạt
          </h1>
          <p className="text-lg text-slate-600 leading-relaxed">
            Hệ thống đã bỏ mô hình mua gói. Bạn nạp tiền vào ví nội bộ, dùng số dư để mua từng khóa học
            và tích lũy tổng chi tiêu để mở danh hiệu hội viên.
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8">
        <div className="lg:col-span-7 bg-gradient-to-br from-slate-900 via-slate-800 to-amber-900 rounded-3xl p-8 md:p-10 relative overflow-hidden shadow-xl shadow-slate-900/20">
          <div className="absolute -top-24 -right-20 w-80 h-80 bg-amber-400/20 blur-[100px] rounded-full pointer-events-none" />
          <div className="absolute -bottom-20 -left-20 w-72 h-72 bg-cyan-400/10 blur-[100px] rounded-full pointer-events-none" />

          <div className="relative z-10 flex flex-col h-full justify-between gap-8">
            <div>
              <div className="flex items-center gap-3 mb-5">
                <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center">
                  <Coins className="w-6 h-6 text-amber-300" />
                </div>
                <div>
                  <h2 className="text-2xl md:text-3xl font-bold text-white tracking-tight">Nạp ví thông minh</h2>
                  <p className="text-sm text-slate-300">Không còn gói Premium hay gói Instructor nữa</p>
                </div>
              </div>

              <p className="text-slate-200 leading-relaxed max-w-2xl mb-8">
                Số dư ví được dùng để mua khóa học trả phí. Mọi giao dịch thành công sẽ cộng vào tổng chi tiêu
                và tự động nâng hạng danh hiệu hội viên cho tài khoản.
              </p>
            </div>

            <div className="rounded-3xl bg-white/10 border border-white/10 p-6 backdrop-blur-sm">
              <div className="flex items-start justify-between gap-4 mb-5">
                <div>
                  <p className="text-xs uppercase tracking-[0.24em] text-amber-200 font-semibold mb-2">
                    Gói đề xuất
                  </p>
                  <h3 className="text-3xl font-bold text-white">{formatCurrency(featuredPack.amount)}</h3>
                  <p className="text-sm text-slate-300 mt-2">{featuredPack.bonus}</p>
                </div>
                <span className="inline-flex items-center gap-2 rounded-full bg-amber-300/15 px-3 py-1 text-xs font-semibold text-amber-200">
                  <Sparkles className="w-3.5 h-3.5" />
                  Phổ biến
                </span>
              </div>

              <button
                onClick={() => handleTopUp(featuredPack.amount)}
                disabled={loadingAmount === featuredPack.amount}
                className="w-full sm:w-auto bg-white text-slate-900 font-semibold text-lg px-8 py-3.5 rounded-full hover:bg-amber-50 transition-all flex items-center justify-center gap-2 disabled:opacity-70"
              >
                {loadingAmount === featuredPack.amount ? 'Đang xử lý...' : 'Nạp ví ngay'}
                <ArrowRight className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>

        <div className="lg:col-span-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
          {TOP_UP_PACKAGES.map((pack) => (
            <div key={pack.amount} className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm hover:shadow-lg transition-all">
              <div className="flex items-center justify-between mb-5">
                <span className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">{pack.label}</span>
                <Wallet className="w-4 h-4 text-slate-400" />
              </div>

              <h3 className="text-3xl font-bold text-slate-900 mb-3">{formatCurrency(pack.amount)}</h3>
              <p className="text-sm text-slate-500 leading-relaxed min-h-16">{pack.bonus}</p>

              <button
                onClick={() => handleTopUp(pack.amount)}
                disabled={loadingAmount === pack.amount}
                className="mt-6 w-full bg-slate-900 text-white py-3 rounded-full text-sm font-semibold hover:bg-slate-800 transition-colors disabled:opacity-70"
              >
                {loadingAmount === pack.amount ? 'Đang xử lý...' : 'Nạp mệnh giá này'}
              </button>
            </div>
          ))}
        </div>
      </div>

      <div className="max-w-7xl mx-auto mt-10">
        <div className="bg-white rounded-3xl p-8 border border-slate-100 shadow-sm">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 rounded-2xl bg-amber-100 flex items-center justify-center">
              <Crown className="w-6 h-6 text-amber-600" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-slate-900">Danh hiệu hội viên</h2>
              <p className="text-sm text-slate-500">Tự động nâng cấp theo tổng chi tiêu tích lũy trong ví</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-4">
            {MEMBER_TIERS.map((tier) => (
              <div key={tier.key} className="rounded-2xl border border-slate-100 p-5 bg-slate-50/70">
                <div className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-700 mb-4">
                  <BadgeCheck className="w-3.5 h-3.5 text-amber-500" />
                  {tier.label}
                </div>
                <p className="text-2xl font-bold text-slate-900 mb-2">{tier.threshold}</p>
                <p className="text-sm text-slate-500 leading-relaxed">{tier.perks}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Pricing;
