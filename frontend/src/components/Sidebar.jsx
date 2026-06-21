import { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { ChevronDown, KeyRound, LogOut, PanelLeftClose, PanelLeftOpen, Settings, User, Zap } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useDashboardView } from '../context/DashboardViewContext';
import { getMenuByRole } from '../config/sidebar.config';
import { useChat } from '../context/ChatContext';
import UserAvatar from './UserAvatar';

const TIER_LABELS = {
  BRONZE: 'Đồng',
  SILVER: 'Bạc',
  GOLD: 'Vàng',
  PLATINUM: 'Bạch kim',
  DIAMOND: 'Kim cương',
};

const ROLE_BADGES = {
  STUDENT: null,
  INSTRUCTOR: { label: 'Giảng viên', color: 'bg-blue-100 text-blue-700' },
  ADMIN: { label: 'Quản trị viên', color: 'bg-red-100 text-red-700' },
};

const Sidebar = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { activeView, realRole, isImpersonating } = useDashboardView();
  const [collapsed, setCollapsed] = useState(() => localStorage.getItem('skillio_sidebar_collapsed') === 'true');
  const { onlineUsers } = useChat();
  const uniqueOnlineUsers = onlineUsers || [];

  const menuItems = getMenuByRole(activeView);
  const exactActivePath = menuItems.find((item) => !item.section && item.path === location.pathname)?.path;

  const isAdminAccount = realRole === 'ADMIN' && !isImpersonating;
  const roleBadge = isImpersonating ? null : ROLE_BADGES[realRole];

  const toggleSidebar = () => {
    setCollapsed((current) => {
      const next = !current;
      localStorage.setItem('skillio_sidebar_collapsed', String(next));
      return next;
    });
  };

  return (
    <aside className={`relative hidden shrink-0 border-r border-slate-100 transition-[width,padding] duration-300 lg:flex lg:flex-col ${
      collapsed ? 'w-20 px-3 py-6' : 'w-64 p-6'
    }`}>
      <button
        type="button"
        onClick={toggleSidebar}
        title={collapsed ? 'Mở rộng menu' : 'Thu gọn menu'}
        aria-label={collapsed ? 'Mở rộng menu' : 'Thu gọn menu'}
        className="absolute -right-4 top-7 z-20 flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 shadow-sm transition hover:border-purple-200 hover:bg-purple-50 hover:text-purple-700"
      >
        {collapsed ? <PanelLeftOpen className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
      </button>

      {/* Logo */}
      <button
        type="button"
        onClick={() => window.location.reload()}
        title="Tải lại trang"
        className={`mb-8 flex items-center rounded-xl text-left transition hover:opacity-80 ${collapsed ? 'justify-center' : 'gap-2'}`}
      >
        <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-purple-700 rounded-xl flex items-center justify-center shadow-lg shadow-purple-200/50">
          <Zap className="w-5 h-5 text-white" />
        </div>
        {!collapsed && (
          <span className="text-2xl font-semibold tracking-tight text-purple-700">
            Skillio
          </span>
        )}
      </button>

      {/* Navigation and Footer Wrapper */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden custom-scrollbar mb-4">
        <nav className="space-y-1 mb-4">
        {menuItems.map((item, index) => {
          // Section headers
          if (item.section) {
            if (collapsed) {
              return <div key={`section-${index}`} className={index === 0 ? 'h-2' : 'mt-5 h-px bg-slate-100'} />;
            }
            return (
              <p
                key={`section-${index}`}
                className={`text-xs font-semibold uppercase tracking-wider text-slate-400 ${
                  index === 0 ? 'mb-3' : 'mt-7 mb-3'
                }`}
              >
                {item.section}
              </p>
            );
          }

          const isActive =
            exactActivePath
              ? item.path === exactActivePath
              : item.path === '/'
                ? location.pathname === '/'
                : item.path === '/instructor'
                  ? location.pathname === '/instructor'
                  : location.pathname.startsWith(`${item.path}/`);
          const Icon = item.icon;

          const itemClassName = `flex items-center rounded-xl py-2.5 transition-all duration-200 group ${
                collapsed ? 'justify-center px-2' : 'gap-3 px-3'
              } ${
                isActive
                  ? 'bg-purple-50 text-purple-700 shadow-sm font-semibold'
                  : 'text-slate-600 hover:bg-purple-50/60 hover:text-purple-700 hover:translate-x-1'
              }`;

          const content = (
            <>
              <Icon
                className={`w-[18px] h-[18px] transition-transform duration-200 ${
                  isActive ? '' : 'group-hover:scale-110'
                }`}
              />
              {!collapsed && <span className="text-sm">{item.name}</span>}

              {!collapsed && item.badge && (
                <span className="ml-auto text-[10px] font-bold bg-red-100 text-red-600 px-1.5 py-0.5 rounded-full">
                  {item.badge}
                </span>
              )}
            </>
          );

          if (item.externalUrl) {
            return (
              <a key={item.path} href={item.externalUrl} className={itemClassName} title={collapsed ? item.name : undefined}>
                {content}
              </a>
            );
          }

          return (
            <Link key={item.path} to={item.path} className={itemClassName} title={collapsed ? item.name : undefined}>
              {content}
            </Link>
          );
        })}
      </nav>

      {/* Footer Section */}
      <div className="pt-4 space-y-4 border-t border-slate-100">
        {/* Online Users */}
        {!collapsed && uniqueOnlineUsers.length > 0 && (
          <div className="space-y-3">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 px-1">
              Đang hoạt động ({uniqueOnlineUsers.length})
            </p>
            <div className="max-h-36 overflow-y-auto overflow-x-hidden space-y-1.5 pr-1 custom-scrollbar">
              {uniqueOnlineUsers.map((u) => (
                <Link
                  key={u.id}
                  to={`/messages?userId=${u.id}`}
                  className="flex items-center gap-3 p-1.5 rounded-xl hover:bg-purple-50/50 transition duration-200 group"
                >
                  <div className="relative shrink-0">
                    <UserAvatar src={u.avatar} name={u.name} className="h-8 w-8 rounded-full" />
                    <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 rounded-full border-2 border-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-slate-700 truncate group-hover:text-purple-700 transition-colors">
                      {u.name}
                    </p>
                    <span className="text-[9px] font-medium text-slate-400 uppercase tracking-wide">
                      {u.role === 'INSTRUCTOR' ? 'Giảng viên' : u.role === 'ADMIN' ? 'Admin' : 'Học viên'}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {collapsed && uniqueOnlineUsers.length > 0 && (
          <div className="flex flex-col items-center gap-2">
            <Link
              to="/messages"
              title={`Có ${uniqueOnlineUsers.length} tài khoản đang hoạt động`}
              className="relative flex h-8 w-8 items-center justify-center rounded-xl bg-green-50 text-green-600 hover:bg-green-100 transition duration-200"
            >
              <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500"></span>
              </span>
              <span className="text-xs font-bold">{uniqueOnlineUsers.length}</span>
            </Link>
          </div>
        )}

        {/* Current User Card */}
        <div className={`${collapsed ? '' : 'pt-2'}`}>
          <div
            title={isAdminAccount ? "Cài đặt tài khoản quản trị" : "Tài khoản đang đăng nhập"}
            role={isAdminAccount ? "button" : undefined}
            onClick={isAdminAccount ? () => navigate('/admin/settings') : undefined}
            className={`flex items-center rounded-xl p-2.5 border transition-all duration-200 ${
              collapsed 
                ? 'justify-center border-transparent' 
                : 'gap-3 border-slate-100/80 bg-slate-50/60'
            } ${
              isAdminAccount 
                ? 'cursor-pointer hover:bg-slate-100/85 hover:border-slate-200 hover:shadow-sm' 
                : ''
            }`}
          >
            <div className="relative shrink-0">
              <UserAvatar src={user?.avatar} name={user?.name} className="h-9 w-9 rounded-full ring-2 ring-purple-100" />
              <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 rounded-full border-2 border-white" />
            </div>
            {!collapsed && (
              <div className="flex-1 min-w-0">
                <p className="truncate text-xs font-semibold text-slate-800">
                  {user?.name || 'Thành viên'}
                </p>
                <div className="flex items-center gap-1.5 flex-wrap mt-0.5">
                  <span className="inline-block w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
                  <span className="text-[10px] text-green-600 font-semibold uppercase tracking-wider">Online</span>
                  {user?.role !== 'ADMIN' && (
                    <>
                      <span className="text-[10px] text-slate-300">•</span>
                      <span className="text-[10px] text-slate-400">
                        {TIER_LABELS[user?.memberTier] || 'Đồng'}
                      </span>
                    </>
                  )}
                  {roleBadge && (
                    <>
                      <span className="text-[10px] text-slate-300">•</span>
                      <span className={`text-[9px] font-semibold px-1 py-0.5 rounded-full ${roleBadge.color}`}>
                        {roleBadge.label}
                      </span>
                    </>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      </div>
    </aside>
  );
};

export default Sidebar;
