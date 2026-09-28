import React from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, Settings, Users, ShieldCheck, LogOut } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const OrganizerLayout = () => {
  const location = useLocation();
  const { logout, user } = useAuth();
  
  const eventMatch = location.pathname.match(/\/organizer\/events\/([a-zA-Z0-9-]+)\/(dashboard|edit|judges|leaderboard)/);
  const eventId = eventMatch ? eventMatch[1] : null;

  const navItems = eventId ? [
    { name: 'Dashboard', path: `/organizer/events/${eventId}/dashboard`, icon: LayoutDashboard },
    { name: 'Manage Event', path: `/organizer/events/${eventId}/edit`, icon: Settings },
    { name: 'Users', path: `/organizer/events/${eventId}/judges`, icon: Users },
    { name: 'Leaderboard', path: `/organizer/events/${eventId}/leaderboard`, icon: ShieldCheck },
  ] : [
    { name: 'Dashboard', path: '/organizer/events', icon: LayoutDashboard }
  ];

  return (
    <div className="flex h-screen bg-neo-bg text-neo-ink font-sans selection:bg-neo-pastel-pink selection:text-neo-ink">
      {/* Sidebar */}
      <aside className="w-72 bg-white border-r-3 border-neo-ink flex flex-col relative z-20">
        <Link to="/organizer/events" className="p-8 flex items-center gap-3 border-b-3 border-neo-ink bg-neo-pastel-purple hover:bg-neo-pastel-blue transition-colors cursor-pointer block w-full">
          <div className="w-10 h-10 rounded-full border-3 border-neo-ink bg-white flex items-center justify-center text-neo-ink font-black text-xl neo-active">
            O
          </div>
          <h1 className="text-2xl font-black text-neo-ink tracking-tight">
            JuryFlow
          </h1>
        </Link>
        
        <nav className="flex-1 py-6 px-6 space-y-3 overflow-y-auto">
          <div className="mb-6 flex items-center gap-2 text-xs font-black text-neo-ink/70 uppercase tracking-widest border-b-3 border-neo-ink/20 pb-2">
            <ShieldCheck className="w-4 h-4 text-neo-ink/70" />
            Organizer Admin
          </div>
          {navItems.map((item) => {
            const isActive = location.pathname === item.path || (location.pathname.startsWith(item.path) && item.path !== '/organizer');
            const Icon = item.icon;
            return (
              <Link
                key={item.name}
                to={item.path}
                className={`flex items-center gap-4 px-4 py-3 rounded-full transition-transform font-bold text-sm border-3 ${
                  isActive 
                    ? 'bg-neo-pastel-purple border-neo-ink neo-shadow text-neo-ink translate-x-1 -translate-y-1' 
                    : 'bg-white border-transparent text-neo-ink hover:border-neo-ink hover:bg-neo-pastel-blue hover:neo-shadow hover:translate-x-1 hover:-translate-y-1'
                }`}
              >
                <Icon className="w-5 h-5" />
                <span className="uppercase tracking-wider">{item.name}</span>
              </Link>
            );
          })}
        </nav>
        
        <div className="p-6 border-t-3 border-neo-ink bg-neo-pastel-purple/20">
          <div className="flex items-center gap-3 mb-6 bg-white border-3 border-neo-ink p-3 rounded-xl neo-shadow">
            <div className="w-10 h-10 rounded-full bg-neo-pastel-purple border-3 border-neo-ink flex items-center justify-center text-neo-ink font-black">
              {user?.name?.charAt(0) || 'O'}
            </div>
            <div className="overflow-hidden flex-1">
              <p className="text-sm font-black text-neo-ink truncate">{user?.name || 'Organizer User'}</p>
              <p className="text-[10px] font-bold text-neo-ink/70 truncate uppercase">{user?.email}</p>
            </div>
          </div>
          <button 
            onClick={logout}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-full bg-white border-3 border-neo-ink hover:bg-neo-pastel-pink text-neo-ink font-black text-sm transition-transform hover:neo-shadow hover:-translate-y-1"
          >
            <LogOut className="w-4 h-4" />
            <span className="uppercase">Log out</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto bg-neo-bg">
        <div className="p-8 max-w-7xl mx-auto min-h-full">
          <Outlet />
        </div>
      </main>
    </div>
  );
};
