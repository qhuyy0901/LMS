import { Link } from 'react-router-dom';
import { XCircle, ArrowLeft, RefreshCw } from 'lucide-react';

const PaymentCancel = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 via-rose-50 to-pink-50 flex items-center justify-center p-6">
      <div className="bg-white rounded-3xl shadow-2xl p-10 max-w-md w-full text-center relative overflow-hidden">
        {/* Decorative background */}
        <div className="absolute -top-20 -right-20 w-40 h-40 bg-red-100 rounded-full opacity-50" />
        <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-rose-100 rounded-full opacity-50" />
        
        <div className="relative z-10">
          {/* Cancel icon */}
          <div className="w-20 h-20 bg-gradient-to-br from-red-400 to-rose-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg shadow-red-200">
            <XCircle className="w-10 h-10 text-white" />
          </div>

          <h1 className="text-2xl font-bold text-slate-800 mb-3">
            Thanh toán đã bị hủy
          </h1>
          <p className="text-slate-500 mb-8 leading-relaxed">
            Đơn hàng của bạn chưa được thanh toán. Bạn không bị trừ tiền. Hãy thử lại nếu muốn.
          </p>

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              to="/"
              className="inline-flex items-center justify-center gap-2 bg-white border border-slate-200 text-slate-700 px-6 py-3 rounded-xl font-medium hover:bg-slate-50 transition-all duration-300"
            >
              <ArrowLeft className="w-4 h-4" />
              Trang chủ
            </Link>
            <Link
              to="/explore"
              className="inline-flex items-center justify-center gap-2 bg-gradient-to-r from-purple-500 to-purple-700 text-white px-6 py-3 rounded-xl font-medium hover:shadow-lg hover:shadow-purple-200 transition-all duration-300 hover:-translate-y-0.5"
            >
              <RefreshCw className="w-4 h-4" />
              Thử lại
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PaymentCancel;
