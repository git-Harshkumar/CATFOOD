import React from 'react';
import { useAuth } from '../context/AuthContext';
import { Trophy, Award, Users, PlusCircle, LogOut, Settings } from 'lucide-react';
import { getRoleBadge } from '../utils/formatters';
import { useNavigate, useLocation } from 'react-router-dom';

export const Navbar = () => {
  const { user, logout, isOrganizer, isJudge, isParticipant, isGlobalAdmin } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Custom nav item component
  const NavItem = ({ id, label, icon: Icon, path }) => {
    const isActive = location.pathname === path || (path !== '/events' && location.pathname.startsWith(path));
    return (
      <button
        onClick={() => navigate(path)}
        className={`flex items-center gap-2 px-5 py-2 rounded-full font-bold text-sm transition-colors ${
          isActive 
            ? 'bg-neo-pastel-green text-neo-ink' 
            : 'text-white hover:bg-white/10'
        }`}
      >
        {Icon && <Icon className="w-4 h-4" />}
        <span>{label}</span>
      </button>
    );
  };

  const showTeams = user && (isParticipant || isGlobalAdmin || (user.teamMemberships && user.teamMemberships.length > 0));
  const showJudging = user && (isJudge || isGlobalAdmin);
  const showOrganizer = user && (isOrganizer || isGlobalAdmin);
  const canCreate = user && (isOrganizer || isGlobalAdmin);

  return (
    <header className="w-full pt-6 pb-6 px-4 flex justify-center">
      {/* Pill-shaped Navbar */}
      <div className="w-full max-w-6xl flex items-center justify-between gap-4">
        
        {/* Nav Links Pill Container */}
        <div className="bg-neo-ink rounded-full px-2 py-2 flex items-center gap-1 shadow-lg neo-shadow flex-wrap">
          <button
            onClick={() => navigate('/events')}
            className="flex items-center gap-2 px-4 py-2 text-white font-black text-lg tracking-tight hover:scale-105 transition-transform"
          >
            <Trophy className="w-5 h-5 text-neo-yellow" />
            CATFOOD
          </button>
          
          <div className="w-px h-6 bg-white/20 mx-2"></div>
          
          <NavItem id="events" label="Hackathons" path="/events" />
          
          {showTeams && (
            <NavItem id="teams" label="My Teams" icon={Users} path="/teams/my" />
          )}

          {showJudging && (
            <NavItem id="judging" label="Judging" icon={Award} path="/judge/queue" />
          )}

          {showOrganizer && (
            <NavItem id="organizer" label="Organizer" icon={Settings} path="/organizer/events" />
          )}
        </div>

        {/* User / Actions Area */}
        <div className="flex items-center gap-3">
          {canCreate && (
            <button
              onClick={() => navigate('/organizer/events/new')}
              className="flex items-center gap-2 px-5 py-2.5 rounded-full border-3 border-neo-ink bg-neo-pastel-yellow font-bold text-sm text-neo-ink hover:neo-active neo-shadow"
            >
              <PlusCircle className="w-5 h-5" />
              New Event
            </button>
          )}
          
          {user ? (
            <>
              {/* Avatar Pill */}
              <button 
                onClick={() => navigate('/profile')}
                className="flex items-center gap-3 bg-neo-pastel-orange rounded-full py-1.5 pl-2 pr-5 border-3 border-neo-ink neo-shadow hover:neo-active transition-transform text-left"
              >
                <div className="w-9 h-9 rounded-full bg-white border-2 border-neo-ink flex items-center justify-center font-black text-neo-ink text-sm shrink-0">
                  {user.name.charAt(0).toUpperCase()}
                </div>
                <div className="flex flex-col items-start leading-tight">
                  <span className="font-black text-sm text-neo-ink">{user.name}</span>
                  <span className="text-[10px] font-black uppercase text-neo-ink/70">
                    {user.isGlobalAdmin ? 'ADMIN' : user.role || 'USER'}
                  </span>
                </div>
              </button>

              {/* Sign Out */}
              <button
                onClick={logout}
                className="w-11 h-11 rounded-full border-3 border-neo-ink bg-neo-pastel-pink flex items-center justify-center hover:neo-active neo-shadow"
                title="Sign out"
              >
                <LogOut className="w-4 h-4 text-neo-ink" />
              </button>
            </>
          ) : (
            <button
              onClick={() => navigate('/login')}
              className="px-6 py-2.5 rounded-full border-3 border-neo-ink bg-neo-pastel-purple font-bold text-neo-ink hover:neo-active neo-shadow"
            >
              Sign In
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
