import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { PanelLeftClose, PanelLeftOpen, Zap } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useDashboardView } from '../context/DashboardViewContext';
import { getMenuByRole } from '../config/sidebar.config';
import { resolveMediaUrl } from '../utils/mediaUrl';

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
  const { user } = useAuth();
  const { activeView, realRole, isImpersonating } = useDashboardView();
  const [collapsed, setCollapsed] = useState(() => localStorage.getItem('skillio_sidebar_collapsed') === 'true');

  const menuItems = getMenuByRole(activeView);

  const roleBadge = isImpersonating ? null : ROLE_BADGES[realRole];
  const toggleSidebar = () => {
    setCollapsed((current) => {
      const next = !current;
      localStorage.setItem('skillio_sidebar_collapsed', String(next));
      return next;
    });
  };

  return (
    <aside className={`relative hidden shrink-0 border-r border-slate-100 transition-[width,padding] duration-300 lg:block ${
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

      {/* Navigation */}
      <nav className="space-y-1">
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
            item.path === '/'
              ? location.pathname === '/'
              : item.path === '/instructor'
                ? location.pathname === '/instructor'
                : location.pathname === item.path || location.pathname.startsWith(`${item.path}/`);
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

      {/* User Card */}
      <div className="mt-8 pt-6 border-t border-slate-100">
        <Link
          to="/settings"
          title="Mở cài đặt tài khoản"
          className={`group flex items-center rounded-xl p-2 transition hover:bg-purple-50 ${collapsed ? 'justify-center' : 'gap-3'}`}
        >
          <div className="relative">
            {user?.avatar ? (
              <img
                src={resolveMediaUrl(user.avatar)}
                alt={user.name}
                className="w-10 h-10 rounded-full object-cover ring-2 ring-purple-100"
              />
            ) : (
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-pink-300 to-orange-300 ring-2 ring-purple-100" />
            )}
            <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 rounded-full border-2 border-white" />
          </div>
          {!collapsed && <div className="flex-1 min-w-0">
            <p className="truncate text-sm font-medium text-slate-800 transition group-hover:text-purple-700">
              {user?.name || 'Thành viên'}
            </p>
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-slate-400">
                {TIER_LABELS[user?.memberTier] || 'Đồng'}
              </span>
              {roleBadge && (
                <span
                  className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${roleBadge.color}`}
                >
                  {roleBadge.label}
                </span>
              )}
            </div>
          </div>}
        </Link>
      </div>
    </aside>
  );
};

export default Sidebar;
