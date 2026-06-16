import axios from 'axios';
import { ArrowLeft, BadgeCheck, Bell, ChevronDown, Eye, EyeOff, KeyRound, Loader2, LogOut, Search, Settings, User, Wallet } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useDashboardView } from '../context/DashboardViewContext';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import UserAvatar from './UserAvatar';

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

const formatNotificationTime = (value) => {
  if (!value) {
    return '';
  }

  return new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
};

const Topbar = () => {
  const { user, logout } = useAuth();
  const { activeView, canImpersonate, isImpersonating, enterStudentView, exitImpersonation, realRole } = useDashboardView();
  const tierLabel = isImpersonating ? 'Đồng' : TIER_LABELS[user?.memberTier] || 'Đồng';

  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const qParam = searchParams.get('q') || '';

  const [searchQuery, setSearchQuery] = useState('');
  const [notifications, setNotifications] = useState([]);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [notificationsLoading, setNotificationsLoading] = useState(false);
  const [notificationsError, setNotificationsError] = useState(null);
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
  const [showBalance, setShowBalance] = useState(false);
  const notificationPanelRef = useRef(null);
  const accountPanelRef = useRef(null);
  const isInstructorArea = location.pathname.startsWith('/instructor');
  const hideCourseSearch =
    location.pathname === '/certificates' || 
    location.pathname === '/student/certificates' || 
    location.pathname === '/my-learning' || 
    location.pathname === '/reports' ||
    location.pathname === '/profile' ||
    location.pathname === '/settings' ||
    location.pathname === '/instructor/settings' ||
    location.pathname === '/upgrade' ||
    isInstructorArea;

  const unreadCount = notifications.filter((notification) => !notification.isRead).length;

  const fetchNotifications = useCallback(async () => {
    if (!user || isImpersonating) {
      setNotifications([]);
      return;
    }

    setNotificationsLoading(true);
    setNotificationsError(null);
    try {
      const response = await axios.get('/api/user/notifications');
      setNotifications(response.data || []);
    } catch (error) {
      setNotificationsError(error.response?.data?.message || 'Không thể tải thông báo');
    } finally {
      setNotificationsLoading(false);
    }
  }, [user, isImpersonating]);

  useEffect(() => {
    if (location.pathname === '/explore') {
      setSearchQuery(qParam);
    } else {
      setSearchQuery('');
    }
  }, [qParam, location.pathname]);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  useEffect(() => {
    if (!notificationsOpen) {
      return undefined;
    }

    const handleOutsideClick = (event) => {
      if (notificationPanelRef.current && !notificationPanelRef.current.contains(event.target)) {
        setNotificationsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [notificationsOpen]);

  useEffect(() => {
    if (!accountMenuOpen) {
      return undefined;
    }

    const handleOutsideClick = (event) => {
      if (accountPanelRef.current && !accountPanelRef.current.contains(event.target)) {
        setAccountMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [accountMenuOpen]);

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

  const handleToggleNotifications = () => {
    setNotificationsOpen((open) => {
      const nextOpen = !open;
      if (nextOpen) {
        setAccountMenuOpen(false);
        fetchNotifications();
      }
      return nextOpen;
    });
  };

  const handleToggleAccountMenu = () => {
    setAccountMenuOpen((open) => {
      const nextOpen = !open;
      if (nextOpen) {
        setNotificationsOpen(false);
      }
      return nextOpen;
    });
  };

  const handleAccountNavigate = (path) => {
    setAccountMenuOpen(false);
    navigate(path);
  };

  const handleAccountLogout = () => {
    setAccountMenuOpen(false);
    logout();
  };

  const handleNotificationClick = async (notification) => {
    if (!notification.isRead) {
      setNotifications((prev) =>
        prev.map((item) => (item.id === notification.id ? { ...item, isRead: true, readAt: new Date().toISOString() } : item))
      );

      try {
        await axios.patch(`/api/user/notifications/${notification.id}/read`);
      } catch {
        fetchNotifications();
      }
    }

    if (notification.link) {
      setNotificationsOpen(false);
      navigate(notification.link);
    }
  };

  const handleEnterStudentPreview = () => {
    enterStudentView();
    navigate('/');
  };

  const handleExitStudentPreview = () => {
    exitImpersonation();
    navigate(realRole === 'ADMIN' ? '/' : '/instructor/dashboard');
  };

  const isCourseEditor = 
    /^\/instructor\/courses\/new\/?$/.test(location.pathname) ||
    /^\/instructor\/courses\/[^/]+\/?$/.test(location.pathname) ||
    /^\/instructor\/courses\/[^/]+\/edit\/?$/.test(location.pathname);

  if (isCourseEditor) {
    return null;
  }

  return (
    <div className={`mb-6 flex flex-wrap items-center gap-4 md:flex-nowrap ${hideCourseSearch || activeView === 'INSTRUCTOR' ? 'justify-end' : ''}`}>
      {activeView !== 'INSTRUCTOR' && !hideCourseSearch && (
        <div className="order-last flex w-full min-w-0 items-center gap-3 rounded-full border border-slate-200 bg-white px-4 py-3 shadow-sm transition-all duration-300 hover:shadow-md focus-within:border-purple-400 focus-within:ring-2 focus-within:ring-purple-200 md:order-none md:flex-1">
          <Search className="h-4 w-4 cursor-pointer text-slate-400" onClick={() => triggerSearch(searchQuery)} />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Tìm kiếm khóa học, chủ đề..."
            className="flex-1 bg-transparent text-sm outline-none placeholder:text-slate-400"
          />
        </div>
      )}

      {canImpersonate && !isImpersonating && (
        <button
          onClick={handleEnterStudentPreview}
          title={'Xem th\u1eed giao di\u1ec7n h\u1ecdc vi\u00ean'}
          className={`hidden items-center gap-2 rounded-full border border-purple-200 bg-white px-4 py-2 text-sm font-medium text-purple-700 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-purple-300 hover:bg-purple-50 hover:shadow-md lg:inline-flex ${
            activeView === 'INSTRUCTOR' ? 'ml-auto' : ''
          }`}
        >
          <Eye className="h-4 w-4" />
          {'Xem th\u1eed'}
        </button>
      )}

      {isImpersonating && (
        <button
          type="button"
          onClick={handleExitStudentPreview}
          className="ml-auto inline-flex items-center gap-2 rounded-full border border-purple-200 bg-white px-4 py-2 text-sm font-semibold text-purple-700 shadow-sm transition hover:border-purple-300 hover:bg-purple-50"
        >
          <ArrowLeft className="h-4 w-4" />
          Trở về Dashboard giáo viên
        </button>
      )}

      {activeView !== 'INSTRUCTOR' && !isInstructorArea && (
        <div className="hidden items-center gap-3 rounded-full border border-slate-200 bg-white px-4 py-2 shadow-sm xl:flex">
          <div className="flex items-center gap-2 text-amber-700">
            <BadgeCheck className="h-4 w-4" />
            <span className="text-xs font-semibold uppercase tracking-wide">{tierLabel}</span>
          </div>
          <div className="h-5 w-px bg-slate-200" />
          <div className="flex items-center gap-2 text-slate-700">
            <Wallet className="h-4 w-4" />
            <span className="text-sm font-semibold">
              {showBalance ? formatCurrency(isImpersonating ? 0 : user?.walletBalance || 0) : '••••••'}
            </span>
            <button
              type="button"
              onClick={() => setShowBalance(!showBalance)}
              className="ml-1 flex items-center justify-center text-slate-400 transition-colors hover:text-slate-600 focus:outline-none"
              title={showBalance ? 'Ẩn số dư' : 'Hiện số dư'}
            >
              {showBalance ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>
      )}

      <div className="relative" ref={notificationPanelRef}>
        <button
          type="button"
          onClick={handleToggleNotifications}
          className="group relative flex h-11 w-11 items-center justify-center rounded-full border border-slate-200 bg-white shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:bg-slate-50 hover:shadow-md"
          aria-label="Thông báo"
          aria-expanded={notificationsOpen}
        >
          <Bell className="h-4 w-4 text-slate-600 transition-transform group-hover:rotate-12" />
          {unreadCount > 0 ? (
            <span className="absolute -right-1 -top-1 flex min-w-5 items-center justify-center rounded-full bg-rose-500 px-1.5 py-0.5 text-[10px] font-bold leading-none text-white">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          ) : null}
        </button>

        {notificationsOpen ? (
          <div className="absolute right-0 top-14 z-50 w-[min(22rem,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl shadow-slate-200/70">
            <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
              <div>
                <p className="text-sm font-semibold text-slate-900">Thông báo</p>
                <p className="text-xs text-slate-500">{unreadCount > 0 ? `${unreadCount} chưa đọc` : 'Tất cả đã đọc'}</p>
              </div>
              <button
                type="button"
                onClick={fetchNotifications}
                className="rounded-lg px-2.5 py-1.5 text-xs font-medium text-purple-700 transition hover:bg-purple-50"
              >
                Tải lại
              </button>
            </div>

            <div className="max-h-96 overflow-y-auto">
              {notificationsLoading ? (
                <div className="flex items-center justify-center gap-2 px-4 py-8 text-sm text-slate-500">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Đang tải thông báo...
                </div>
              ) : notificationsError ? (
                <div className="px-4 py-8 text-center text-sm text-rose-600">{notificationsError}</div>
              ) : notifications.length === 0 ? (
                <div className="px-4 py-8 text-center text-sm text-slate-500">Chưa có thông báo nào.</div>
              ) : (
                notifications.map((notification) => (
                  <button
                    key={notification.id}
                    type="button"
                    onClick={() => handleNotificationClick(notification)}
                    className="flex w-full gap-3 border-b border-slate-50 px-4 py-3 text-left transition last:border-b-0 hover:bg-slate-50"
                  >
                    <span
                      className={`mt-1 h-2.5 w-2.5 flex-shrink-0 rounded-full ${
                        notification.isRead ? 'bg-slate-200' : 'bg-purple-600'
                      }`}
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold text-slate-900">{notification.title}</span>
                      <span className="mt-1 line-clamp-2 block text-xs leading-5 text-slate-500">{notification.body}</span>
                      <span className="mt-2 block text-[11px] font-medium text-slate-400">
                        {formatNotificationTime(notification.createdAt)}
                      </span>
                    </span>
                  </button>
                ))
              )}
            </div>
          </div>
        ) : null}
      </div>

      <div className="relative" ref={accountPanelRef}>
        <button
          type="button"
          onClick={handleToggleAccountMenu}
          title="Mở menu tài khoản"
          aria-label="Mở menu tài khoản"
          aria-haspopup="menu"
          aria-expanded={accountMenuOpen}
          className="flex items-center gap-2 rounded-full border border-slate-200 bg-white p-1 pr-2 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:bg-slate-50 hover:shadow-md"
        >
          <UserAvatar src={user?.avatar} name={user?.name || user?.email} className="h-8 w-8 rounded-full" />
          <span className="hidden max-w-32 truncate text-sm font-semibold text-slate-700 sm:inline">
            {user?.name || 'Tài khoản'}
          </span>
          <ChevronDown className={`h-4 w-4 text-slate-400 transition-transform ${accountMenuOpen ? 'rotate-180' : ''}`} />
        </button>

        {accountMenuOpen ? (
          <div
            role="menu"
            className="absolute right-0 top-14 z-50 w-[min(18rem,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl shadow-slate-200/70"
          >
            <div className="flex items-center gap-3 border-b border-slate-100 px-4 py-3">
              <UserAvatar src={user?.avatar} name={user?.name || user?.email} className="h-10 w-10 rounded-full" />
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-slate-900">{user?.name || 'Thành viên Skillio'}</p>
                <p className="truncate text-xs text-slate-500">{user?.email}</p>
              </div>
            </div>

            <div className="p-2">
              <button
                type="button"
                role="menuitem"
                onClick={() => handleAccountNavigate('/profile?tab=profile')}
                className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-medium text-slate-700 transition hover:bg-purple-50 hover:text-purple-700"
              >
                <User className="h-4 w-4" />
                Hồ sơ cá nhân
              </button>
              <button
                type="button"
                role="menuitem"
                onClick={() => handleAccountNavigate('/profile?tab=notifications')}
                className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-medium text-slate-700 transition hover:bg-purple-50 hover:text-purple-700"
              >
                <Settings className="h-4 w-4" />
                Cài đặt tài khoản
              </button>
              <button
                type="button"
                role="menuitem"
                onClick={() => handleAccountNavigate('/profile?tab=security')}
                className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-medium text-slate-700 transition hover:bg-purple-50 hover:text-purple-700"
              >
                <KeyRound className="h-4 w-4" />
                Đổi mật khẩu
              </button>
              <div className="my-2 h-px bg-slate-100" />
              <button
                type="button"
                role="menuitem"
                onClick={handleAccountLogout}
                className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-semibold text-rose-600 transition hover:bg-rose-50"
              >
                <LogOut className="h-4 w-4" />
                Đăng xuất
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
};

export default Topbar;
