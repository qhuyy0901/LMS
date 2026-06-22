import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Topbar from './Topbar';
import AiChatbox from './AiChatbox';
import { useDashboardView } from '../context/DashboardViewContext';

const Layout = () => {
  const { activeView } = useDashboardView();

  return (
    <div className="bg-[#fcfcff] dark:bg-slate-950 min-h-screen font-sans">
      <div className="max-w-[1400px] mx-auto bg-white dark:bg-slate-900 overflow-hidden min-h-screen shadow-xl shadow-slate-200/30 dark:shadow-none">
        <div className="flex flex-col lg:flex-row min-h-screen">
          <Sidebar />

          <main className="flex-1 p-6 bg-purple-50/[0.15] dark:bg-slate-950/20 border-l border-purple-50/30 dark:border-slate-800/30">
            <Topbar />
            <Outlet />
          </main>
        </div>
      </div>
      {activeView === 'STUDENT' && <AiChatbox />}
    </div>
  );
};

export default Layout;
