import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Topbar from './Topbar';
import ImpersonationBanner from './ImpersonationBanner';

const Layout = () => {
  return (
    <div className="bg-slate-50 min-h-screen font-sans">
      {/* Impersonation warning — renders above everything when active */}
      <ImpersonationBanner />

      <div className="max-w-[1400px] mx-auto bg-white overflow-hidden min-h-screen shadow-xl shadow-slate-200/50">
        <div className="flex flex-col lg:flex-row min-h-screen">
          <Sidebar />

          <main className="flex-1 p-6 bg-slate-50/30">
            <Topbar />
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  );
};

export default Layout;
