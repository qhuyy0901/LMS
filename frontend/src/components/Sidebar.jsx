import { Link, useLocation } from 'react-router-dom';
import { Zap } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useDashboardView } from '../context/DashboardViewContext';
import { getMenuByRole } from '../config/sidebar.config';

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

  const menuItems = getMenuByRole(activeView);

  const roleBadge = isImpersonating ? null : ROLE_BADGES[realRole];

  return (
    <aside className="w-full lg:w-64 p-6 border-r border-slate-100 shrink-0 hidden lg:block">
      {/* Logo */}
      <div className="flex items-center gap-2 mb-8">
        <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-purple-700 rounded-xl flex items-center justify-center shadow-lg shadow-purple-200/50">
          <Zap className="w-5 h-5 text-white" />
        </div>
        <span className="text-2xl font-semibold tracking-tight text-purple-700">
          Skillio
        </span>
      </div>

      {/* Navigation */}
      <nav className="space-y-1">
        {menuItems.map((item, index) => {
          // Section headers
          if (item.section) {
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

          return (
            <Link
              key={item.path}
              to={item.path}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 group ${
                isActive
                  ? 'bg-purple-50 text-purple-700 shadow-sm font-semibold'
                  : 'text-slate-600 hover:bg-purple-50/60 hover:text-purple-700 hover:translate-x-1'
              }`}
            >
              <Icon
                className={`w-[18px] h-[18px] transition-transform duration-200 ${
                  isActive ? '' : 'group-hover:scale-110'
                }`}
              />
              <span className="text-sm">{item.name}</span>

              {item.badge && (
                <span className="ml-auto text-[10px] font-bold bg-red-100 text-red-600 px-1.5 py-0.5 rounded-full">
                  {item.badge}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* User Card */}
      <div className="mt-8 pt-6 border-t border-slate-100">
        <div className="flex items-center gap-3">
          <div className="relative">
            {user?.avatar ? (
              <img
                src={user.avatar}
                alt={user.name}
                className="w-10 h-10 rounded-full object-cover ring-2 ring-purple-100"
              />
            ) : (
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-pink-300 to-orange-300 ring-2 ring-purple-100" />
            )}
            <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 rounded-full border-2 border-white" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-slate-800 truncate">
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
          </div>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
