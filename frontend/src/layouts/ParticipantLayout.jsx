import React from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { Users, Award } from 'lucide-react';
import { MainLayout } from './MainLayout';

export const ParticipantLayout = () => {
  const location = useLocation();

  const navItems = [
    { name: 'My Teams', path: '/teams/my', icon: Users },
    { name: 'My Certificates', path: '/certificates/mine', icon: Award },
  ];

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Contextual Subnav */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b-3 border-neo-ink pb-4">
          <div className="flex items-center gap-3">
            <span className="px-3 py-1 bg-neo-pastel-orange border-2 border-neo-ink font-black text-xs uppercase tracking-wider rounded-md">
              Participant Hub
            </span>
          </div>
          <div className="flex items-center gap-2">
            {navItems.map((item) => {
              const isActive = location.pathname.startsWith(item.path);
              const Icon = item.icon;
              return (
                <Link
                  key={item.name}
                  to={item.path}
                  className={`flex items-center gap-2 px-4 py-2 rounded-full font-black text-xs uppercase tracking-wider border-2 transition-transform ${
                    isActive
                      ? 'bg-neo-pastel-green border-neo-ink neo-shadow text-neo-ink translate-x-0.5 -translate-y-0.5'
                      : 'bg-white border-neo-ink/30 text-neo-ink hover:border-neo-ink hover:bg-neo-pastel-pink'
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

