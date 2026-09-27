import React from 'react';
import { useAuth } from '../context/AuthContext';
import { Badge } from './Badge';
import { getRoleBadge } from '../utils/formatters';
import { Trophy, Award, Users, PlusCircle, LogOut, CheckCircle, ShieldAlert } from 'lucide-react';

export const Navbar = ({ currentView, setView }) => {
  const { user, logout, isOrganizer, isJudge, isParticipant } = useAuth();
  const roleBadge = user ? getRoleBadge(user.role) : null;

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-800/80 bg-slate-950/80 backdrop-blur-xl">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Logo */}
        <div className="flex items-center gap-8">
          <button
            onClick={() => setView('events')}
            className="flex items-center gap-2.5 text-left group"
          >
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-purple-500 flex items-center justify-center shadow-lg shadow-indigo-500/25 group-hover:scale-105 transition-transform">
              <Trophy className="w-5 h-5 text-white" />
            </div>
            <div>
              <span className="font-extrabold text-lg tracking-tight bg-gradient-to-r from-white via-slate-100 to-indigo-200 bg-clip-text text-transparent">
                JuryFlow
              </span>
              <span className="block text-[10px] uppercase tracking-wider font-semibold text-indigo-400 -mt-1">
                Judgment Platform
              </span>
            </div>
          </button>

          {/* Nav Items */}
          {user && (
            <nav className="hidden md:flex items-center gap-1 text-sm font-medium">
              <button
                onClick={() => setView('events')}
                className={`px-3 py-1.5 rounded-lg transition-colors ${
                  currentView === 'events'
                    ? 'bg-slate-800 text-white font-semibold'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
                }`}
              >
                Hackathons
              </button>

              <button
                onClick={() => setView('teams')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-colors ${
                  currentView === 'teams'
                    ? 'bg-slate-800 text-white font-semibold'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
                }`}
              >
                <Users className="w-4 h-4 text-indigo-400" />
                <span>My Teams</span>
              </button>

              {(isJudge || isOrganizer) && (
                <button
                  onClick={() => setView('judging')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-colors ${
                    currentView === 'judging'
                      ? 'bg-slate-800 text-white font-semibold'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
                  }`}
                >
                  <Award className="w-4 h-4 text-emerald-400" />
                  <span>Judging Queue</span>
                </button>
              )}
            </nav>
          )}
        </div>

        {/* User Profile & Actions */}
        <div className="flex items-center gap-3">
          {user ? (
            <div className="flex items-center gap-3">
              <div className="hidden sm:flex flex-col items-end">
                <span className="text-xs font-semibold text-slate-200">{user.name}</span>
                <span
                  className={`text-[10px] font-mono px-1.5 py-0.2 rounded border ${roleBadge.bg} ${roleBadge.text} ${roleBadge.border}`}
                >
                  {roleBadge.label}
                </span>
              </div>

              {isOrganizer && (
                <button
                  onClick={() => setView('create-event')}
                  className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white shadow-md shadow-purple-500/20 transition-all"
                >
                  <PlusCircle className="w-4 h-4" />
                  <span>New Event</span>
                </button>
              )}

              <button
                onClick={logout}
                title="Sign out"
                className="p-2 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 border border-transparent hover:border-rose-500/20 transition-colors"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <button
              onClick={() => setView('auth')}
              className="px-4 py-1.5 rounded-lg text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white shadow-md shadow-indigo-600/30 transition-all"
            >
              Sign In
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
