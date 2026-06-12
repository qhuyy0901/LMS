import axios from 'axios';
import { Search, Bell, LogOut, Wallet, BadgeCheck, Eye, Loader2, ArrowLeft } from 'lucide-react';
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
  const settingsPath = activeView === 'INSTRUCTOR' ? '/instructor/settings' : '/settings';

  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const qParam = searchParams.get('q') || '';

  const [searchQuery, setSearchQuery] = useState('');
  const [notifications, setNotifications] = useState([]);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [notificationsLoading, setNotificationsLoading] = useState(false);
  const [notificationsError, setNotificationsError] = useState(null);
  const notificationPanelRef = useRef(null);
  const hideCourseSearch =
    location.pathname === '/certificates' || 
    location.pathname === '/student/certificates' || 
    location.pathname === '/my-learning' || 
    location.pathname === '/reports' ||
    location.pathname === '/settings' ||
    location.pathname === '/instructor/settings' ||
    location.pathname === '/upgrade';

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
        fetchNotifications();
      }
      return nextOpen;
    });
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

      {activeView !== 'INSTRUCTOR' && (
        <div className="hidden items-center gap-3 rounded-full border border-slate-200 bg-white px-4 py-2 shadow-sm xl:flex">
          <div className="flex items-center gap-2 text-amber-700">
            <BadgeCheck className="h-4 w-4" />
            <span className="text-xs font-semibold uppercase tracking-wide">{tierLabel}</span>
          </div>
          <div className="h-5 w-px bg-slate-200" />
          <div className="flex items-center gap-2 text-slate-700">
            <Wallet className="h-4 w-4" />
            <span className="text-sm font-semibold">{formatCurrency(isImpersonating ? 0 : user?.walletBalance || 0)}</span>
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

      <div className="flex items-center gap-2 rounded-full border border-slate-200 bg-white p-1 shadow-sm">
        <button
          type="button"
          onClick={() => navigate(settingsPath)}
          title="Mở cài đặt tài khoản"
          className="flex h-8 w-8 items-center justify-center rounded-full transition-transform duration-300 hover:scale-105"
        >
          <UserAvatar src={user?.avatar} name={user?.name || user?.email} className="h-8 w-8 rounded-full" />
        </button>
        <button
          type="button"
          onClick={logout}
          title={'\u0110\u0103ng xu\u1ea5t'}
          className="flex h-8 w-8 items-center justify-center rounded-full text-slate-500 transition hover:bg-red-50 hover:text-red-500"
        >
          <LogOut className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
};

export default Topbar;
