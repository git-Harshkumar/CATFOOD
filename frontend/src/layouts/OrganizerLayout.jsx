import React from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Settings, Users, ShieldCheck, Database, ArrowLeft } from 'lucide-react';
import { MainLayout } from './MainLayout';

export const OrganizerLayout = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const eventMatch = location.pathname.match(/\/organizer\/events\/([a-zA-Z0-9-]+)\/(dashboard|edit|judges|leaderboard|developer)/);
  const eventId = eventMatch ? eventMatch[1] : null;

  const navItems = eventId ? [
    { name: 'Dashboard', path: `/organizer/events/${eventId}/dashboard`, icon: LayoutDashboard },
    { name: 'Manage Event', path: `/organizer/events/${eventId}/edit`, icon: Settings },
    { name: 'Judges & Staff', path: `/organizer/events/${eventId}/judges`, icon: Users },
    { name: 'Leaderboard & Voting', path: `/organizer/events/${eventId}/leaderboard`, icon: ShieldCheck },
    { name: 'Developer & Tools', path: `/organizer/events/${eventId}/developer`, icon: Database },
  ] : [
    { name: 'Hosted Events', path: '/organizer/events', icon: LayoutDashboard },
  ];

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Contextual Subnav */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b-3 border-neo-ink pb-4">
          <div className="flex items-center gap-3">
            {eventId ? (
              <button
                onClick={() => navigate('/organizer/events')}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-white border-2 border-neo-ink font-black text-xs uppercase tracking-wider rounded-md hover:bg-neo-pastel-pink transition-colors"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                All Events
              </button>
            ) : (
              <span className="px-3 py-1 bg-neo-pastel-purple border-2 border-neo-ink font-black text-xs uppercase tracking-wider rounded-md">
                Organizer Portal
              </span>
            )}
            {eventId && (
              <span className="px-2 py-0.5 bg-neo-pastel-purple/50 border border-neo-ink text-xs font-mono font-bold rounded">
                Event ID: {eventId.slice(0, 8)}...
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {navItems.map((item) => {
              const isActive = location.pathname === item.path || (location.pathname.startsWith(item.path) && item.path !== '/organizer/events');
              const Icon = item.icon;
              return (
                <Link
                  key={item.name}
                  to={item.path}
                  className={`flex items-center gap-2 px-3.5 py-1.5 rounded-full font-black text-xs uppercase tracking-wider border-2 transition-transform ${
                    isActive
                      ? 'bg-neo-pastel-purple border-neo-ink neo-shadow text-neo-ink translate-x-0.5 -translate-y-0.5'
                      : 'bg-white border-neo-ink/30 text-neo-ink hover:border-neo-ink hover:bg-neo-pastel-blue'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{item.name}</span>
                </Link>
              );
            })}
          </div>
        </div>

        {/* Content */}
        <Outlet />
      </div>
    </MainLayout>
  );
};

