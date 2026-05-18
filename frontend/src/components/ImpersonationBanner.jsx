import { ArrowLeft, Eye } from 'lucide-react';
import { useDashboardView } from '../context/DashboardViewContext';

/**
 * Sticky banner shown when an Instructor/Admin is viewing the Student interface.
 * Renders at the very top of the layout, above the Topbar.
 */
const ImpersonationBanner = () => {
  const { isImpersonating, realRole, exitImpersonation } = useDashboardView();

  if (!isImpersonating) {
    return null;
  }

  const roleLabel = realRole === 'ADMIN' ? 'Admin' : 'Giảng viên';

  return (
    <div className="sticky top-0 z-50 w-full bg-gradient-to-r from-purple-100 via-violet-100 to-purple-100 border-b border-purple-200/60 backdrop-blur-md">
      <div className="flex items-center justify-between px-6 py-2.5">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-purple-200/70">
            <Eye className="w-4 h-4 text-purple-700" />
          </div>
          <span className="text-sm font-medium text-purple-800">
            Bạn đang ở chế độ xem thử với tư cách{' '}
            <span className="font-semibold">Học viên</span>
          </span>
          <span className="hidden sm:inline text-xs text-purple-500/80 ml-1">
            — Tài khoản thực: {roleLabel}
          </span>
        </div>

        <button
          onClick={exitImpersonation}
          className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-semibold
                     bg-purple-600 text-white hover:bg-purple-700
                     shadow-sm hover:shadow-md transition-all duration-200 hover:-translate-y-0.5"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Quay lại Dashboard chính
        </button>
      </div>
    </div>
  );
};

export default ImpersonationBanner;
