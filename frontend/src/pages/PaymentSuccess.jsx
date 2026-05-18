import { useEffect, useMemo, useState } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { CheckCircle, ArrowRight, Sparkles, Wallet } from 'lucide-react';

const formatCurrency = (amount) =>
  new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(amount);

const PaymentSuccess = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [countdown, setCountdown] = useState(5);

  const sessionId = searchParams.get('session_id');
  const kind = searchParams.get('kind');
  const amount = Number(searchParams.get('amount') || 0);

  const redirectPath = kind === 'topup' ? '/settings' : '/my-courses';

  const copy = useMemo(() => {
    if (kind === 'topup') {
      return {
        eyebrow: 'Nạp ví thành công',
        title: 'Số dư của bạn đã được cập nhật',
        description: amount
          ? `Bạn vừa nạp ${formatCurrency(amount)} vào ví nội bộ. Bây giờ bạn có thể dùng ví để mua khóa học.`
          : 'Ví nội bộ của bạn đã được cập nhật thành công.',
        cta: 'Đến cài đặt ví',
        icon: Wallet,
      };
    }

    return {
      eyebrow: 'Giao dịch thành công',
      title: 'Bạn đã mở khóa học thành công',
      description: 'Khóa học đã sẵn sàng trong tài khoản của bạn. Có thể bắt đầu học ngay bây giờ.',
      cta: 'Khóa học của tôi',
      icon: CheckCircle,
    };
  }, [amount, kind]);

  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          navigate(redirectPath);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [navigate, redirectPath]);

  const Icon = copy.icon;

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50 flex items-center justify-center p-6">
      <div className="bg-white rounded-3xl shadow-2xl p-10 max-w-md w-full text-center relative overflow-hidden">
        <div className="absolute -top-20 -right-20 w-40 h-40 bg-green-100 rounded-full opacity-50" />
        <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-emerald-100 rounded-full opacity-50" />

        <div className="relative z-10">
          <div className="w-20 h-20 bg-gradient-to-br from-green-400 to-emerald-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg shadow-green-200">
            <Icon className="w-10 h-10 text-white" />
          </div>

          <div className="flex items-center justify-center gap-1 mb-2">
            <Sparkles className="w-5 h-5 text-yellow-500" />
            <span className="text-sm font-medium text-yellow-600">{copy.eyebrow}</span>
            <Sparkles className="w-5 h-5 text-yellow-500" />
          </div>

          <h1 className="text-2xl font-bold text-slate-800 mb-3">{copy.title}</h1>
          <p className="text-slate-500 mb-8 leading-relaxed">{copy.description}</p>

          <Link
            to={redirectPath}
            className="inline-flex items-center gap-2 bg-gradient-to-r from-green-500 to-emerald-600 text-white px-6 py-3 rounded-xl font-medium hover:shadow-lg hover:shadow-green-200 transition-all duration-300 hover:-translate-y-0.5"
          >
            {copy.cta}
            <ArrowRight className="w-4 h-4" />
          </Link>

          <p className="text-xs text-slate-400 mt-6">Tự động chuyển hướng sau {countdown} giây...</p>

          {sessionId && <p className="text-xs text-slate-300 mt-2">Mã giao dịch: {sessionId.slice(0, 20)}...</p>}
        </div>
      </div>
    </div>
  );
};

export default PaymentSuccess;
