import React from 'react';
import { useAuth } from '../context/AuthContext';
import { Trophy, Award, Users, PlusCircle, LogOut, Settings } from 'lucide-react';
import { getRoleBadge } from '../utils/formatters';

export const Navbar = ({ currentView, setView }) => {
  const { user, logout, isOrganizer, isJudge, isGlobalAdmin } = useAuth();
  
  // Custom nav item component
  const NavItem = ({ id, label, icon: Icon }) => {
    const isActive = currentView === id;
    return (
      <button
        onClick={() => setView(id)}
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

  return (
    <header className="w-full pt-6 pb-8 px-4 flex justify-center">
      {/* Pill-shaped Navbar */}
      <div className="w-full max-w-6xl flex items-center justify-between gap-4">
        
        {/* Nav Links Pill Container */}
        <div className="bg-neo-ink rounded-full px-2 py-2 flex items-center gap-1 shadow-lg neo-shadow">
          <button
            onClick={() => setView('events')}
            className="flex items-center gap-2 px-4 py-2 text-white font-black text-lg tracking-tight hover:scale-105 transition-transform"
          >
            <Trophy className="w-5 h-5 text-neo-yellow" />
            JuryFlow
          </button>
          
          <div className="w-px h-6 bg-white/20 mx-2"></div>
          
          <NavItem id="events" label="Hackathons" />
          
          {user && (
            <>
              <NavItem id="teams" label="My Teams" icon={Users} />
              {(isJudge || isOrganizer) && (
                <NavItem id="judging" label="Judging Queue" icon={Award} />
              )}
            </>
          )}
        </div>

        {/* User / Actions Area */}
        <div className="flex items-center gap-4">
          {user ? (
            <>
              {isOrganizer && (
                <button
                  onClick={() => setView('create-event')}
                  className="flex items-center gap-2 px-5 py-3 rounded-full border-3 border-neo-ink bg-neo-pastel-purple font-bold text-sm text-neo-ink hover:neo-active neo-shadow"
                >
                  <PlusCircle className="w-5 h-5" />
                  New Event
                </button>
              )}
              
              {/* Avatar Pill */}
              <div className="flex items-center gap-3 bg-neo-pastel-orange rounded-full py-1.5 pl-2 pr-6 border-3 border-neo-ink neo-shadow">
                <div className="w-10 h-10 rounded-full bg-white border-2 border-neo-ink flex items-center justify-center font-black text-neo-ink text-lg">
                  {user.name.charAt(0).toUpperCase()}
                </div>
                <div className="flex flex-col items-start leading-tight">
                  <span className="font-bold text-sm text-neo-ink">{user.name}</span>
                  <span className="text-[10px] font-bold text-neo-ink/70 uppercase">
                    {isGlobalAdmin ? 'Admin' : (isOrganizer ? 'Organizer' : (isJudge ? 'Judge' : 'Participant'))}
                  </span>
                </div>
              </div>

              {/* Settings / Logout */}
              <button
                onClick={logout}
                className="w-12 h-12 rounded-full border-3 border-neo-ink bg-neo-pastel-pink flex items-center justify-center hover:neo-active neo-shadow"
                title="Sign out"
              >
                <LogOut className="w-5 h-5 text-neo-ink" />
              </button>
            </>
          ) : (
            <button
              onClick={() => setView('auth')}
              className="px-6 py-3 rounded-full border-3 border-neo-ink bg-neo-pastel-purple font-bold text-neo-ink hover:neo-active neo-shadow"
            >
              Sign In
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
