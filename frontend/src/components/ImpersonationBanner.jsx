import { ArrowLeft, Eye } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useDashboardView } from '../context/DashboardViewContext';

const ImpersonationBanner = () => {
  const { isImpersonating, realRole, exitImpersonation } = useDashboardView();
  const navigate = useNavigate();

  if (!isImpersonating) {
    return null;
  }

  const roleLabel = realRole === 'ADMIN' ? 'Admin' : 'Giảng viên';

  const handleExit = () => {
    exitImpersonation();
    navigate(realRole === 'ADMIN' ? '/' : '/instructor/dashboard');
  };

  return (
    <div className="sticky top-0 z-50 w-full border-b border-purple-200/60 bg-gradient-to-r from-purple-100 via-violet-100 to-purple-100 backdrop-blur-md">
      <div className="flex items-center justify-between px-6 py-2.5">
        <div className="flex items-center gap-3">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-purple-200/70">
            <Eye className="h-4 w-4 text-purple-700" />
          </div>
          <span className="text-sm font-medium text-purple-800">
            Bạn đang ở chế độ xem thử với tư cách <span className="font-semibold">Học viên</span>
          </span>
          <span className="hidden text-xs text-purple-500/80 sm:inline">- Tài khoản thực: {roleLabel}</span>
        </div>

        <button
          onClick={handleExit}
          className="inline-flex items-center gap-2 rounded-full bg-purple-600 px-4 py-1.5 text-xs font-semibold text-white shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:bg-purple-700 hover:shadow-md"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Quay lại Dashboard chính
        </button>
      </div>
    </div>
  );
};

export default ImpersonationBanner;
