import { Search, Sun, Moon, Bell, LogOut, Wallet, BadgeCheck, Eye } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useDashboardView } from '../context/DashboardViewContext';
import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, useLocation } from 'react-router-dom';

const TIER_LABELS = {
  BRONZE: 'Đồng',
  SILVER: 'Bạc',
  GOLD: 'Vàng',
  PLATINUM: 'Bạch kim',
  DIAMOND: 'Kim cương',
};

const formatCurrency = (amount = 0) =>
  new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(amount);

const Topbar = () => {
  const { user, logout } = useAuth();
  const { canImpersonate, isImpersonating, enterStudentView } = useDashboardView();
  const tierLabel = TIER_LABELS[user?.memberTier] || 'Đồng';

  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const qParam = searchParams.get('q') || '';

  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (location.pathname === '/explore') {
      setSearchQuery(qParam);
    } else {
      setSearchQuery('');
    }
  }, [qParam, location.pathname]);

  const triggerSearch = (query) => {
    const trimmed = query.trim();
    if (location.pathname === '/explore') {
      const newParams = new URLSearchParams(searchParams);
      if (trimmed) {
        newParams.set('q', trimmed);
      } else {
        newParams.delete('q');
      }
      newParams.set('page', '1'); // reset page on search
      navigate(`/explore?${newParams.toString()}`);
    } else {
      navigate(trimmed ? `/explore?q=${encodeURIComponent(trimmed)}` : '/explore');
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      triggerSearch(searchQuery);
    }
  };

  return (
    <div className="mb-6 flex flex-wrap items-center gap-4 md:flex-nowrap">
      <div className="order-last flex w-full min-w-0 items-center gap-3 rounded-full border border-slate-200 bg-white px-4 py-3 shadow-sm transition-all duration-300 hover:shadow-md focus-within:border-purple-400 focus-within:ring-2 focus-within:ring-purple-200 md:order-none md:flex-1">
        <Search className="h-4 w-4 text-slate-400 cursor-pointer" onClick={() => triggerSearch(searchQuery)} />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={'Tìm kiếm khóa học, chủ đề...'}
          className="flex-1 bg-transparent text-sm outline-none placeholder:text-slate-400"
        />
      </div>

      {canImpersonate && !isImpersonating && (
        <button
          onClick={enterStudentView}
          title={'Xem th\u1eed giao di\u1ec7n h\u1ecdc vi\u00ean'}
          className="hidden items-center gap-2 rounded-full border border-purple-200 bg-white px-4 py-2 text-sm font-medium text-purple-700 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-purple-300 hover:bg-purple-50 hover:shadow-md lg:inline-flex"
        >
          <Eye className="h-4 w-4" />
          {'Xem th\u1eed'}
        </button>
      )}

      <div className="hidden items-center gap-3 rounded-full border border-slate-200 bg-white px-4 py-2 shadow-sm xl:flex">
        <div className="flex items-center gap-2 text-amber-700">
          <BadgeCheck className="h-4 w-4" />
          <span className="text-xs font-semibold uppercase tracking-wide">{tierLabel}</span>
        </div>
        <div className="h-5 w-px bg-slate-200" />
        <div className="flex items-center gap-2 text-slate-700">
          <Wallet className="h-4 w-4" />
          <span className="text-sm font-semibold">{formatCurrency(user?.walletBalance || 0)}</span>
        </div>
      </div>

      <div className="ml-auto flex items-center gap-1 rounded-full border border-slate-200 bg-white p-1 shadow-sm transition-all duration-300 hover:shadow-md md:ml-0">
        <button className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 transition-transform duration-300 hover:scale-110 hover:bg-slate-200">
          <Sun className="h-4 w-4 text-slate-600" />
        </button>
        <button className="flex h-9 w-9 items-center justify-center rounded-full transition-transform duration-300 hover:scale-110 hover:bg-slate-100">
          <Moon className="h-4 w-4 text-slate-400" />
        </button>
      </div>

      <button className="group flex h-11 w-11 items-center justify-center rounded-full border border-slate-200 bg-white shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:bg-slate-50 hover:shadow-md">
        <Bell className="h-4 w-4 text-slate-600 transition-transform group-hover:rotate-12" />
      </button>

      <button
        onClick={logout}
        title={'\u0110\u0103ng xu\u1ea5t'}
        className="group flex items-center gap-2 rounded-full border border-slate-200 bg-white py-1 pl-1 pr-3 shadow-sm transition-all duration-300 hover:border-red-200 hover:bg-red-50 hover:shadow-md"
      >
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-pink-300 to-purple-400 text-xs font-bold text-white transition-transform duration-300 group-hover:scale-105">
          {user?.email?.charAt(0).toUpperCase() || 'U'}
        </div>
        <LogOut className="h-4 w-4 text-slate-500 transition-colors duration-300 group-hover:text-red-500" />
      </button>
    </div>
  );
};

export default Topbar;
