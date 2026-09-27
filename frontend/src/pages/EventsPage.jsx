import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { CountdownTimer } from '../components/CountdownTimer';
import { Badge } from '../components/Badge';
import { getStatusBadge, formatDate } from '../utils/formatters';
import { Trophy, Calendar, Users, FileText, PlusCircle, ArrowRight, Search, Sparkles } from 'lucide-react';

export const EventsPage = ({ onSelectEvent, onOpenCreateEvent }) => {
  const { isOrganizer } = useAuth();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('ALL');

  useEffect(() => {
    fetchEvents();
  }, []);

  const fetchEvents = async () => {
    try {
      setLoading(false);
      const res = await api.getEvents();
      if (res?.data) {
        setEvents(res.data);
      }
    } catch (err) {
      console.error('Failed to load events:', err);
    } finally {
      setLoading(false);
    }
  };

  const filteredEvents = events.filter((ev) => {
    const matchesSearch =
      ev.title.toLowerCase().includes(search.toLowerCase()) ||
      (ev.tagline && ev.tagline.toLowerCase().includes(search.toLowerCase()));

    if (filter === 'ACTIVE') return matchesSearch && ev.status === 'ACTIVE';
    if (filter === 'COMPLETED') return matchesSearch && ev.status === 'COMPLETED';
    return matchesSearch;
  });

  return (
    <div className="space-y-8 pb-12">
      {/* Hero Section */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-950/60 via-slate-900 to-slate-950 border border-indigo-500/20 p-8 sm:p-12 backdrop-blur-xl shadow-2xl">
        <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 max-w-2xl space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/30 text-indigo-300 text-xs font-semibold">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Hackathon Operations & Judgment Suite</span>
          </div>
          <h1 className="text-3xl sm:text-5xl font-extrabold text-white tracking-tight leading-tight">
            Build, Submit, and Evaluate with Precision.
          </h1>
          <p className="text-slate-400 text-sm sm:text-base leading-relaxed">
            A battle-tested hackathon platform featuring strict deadline enforcement, multi-criteria
            weighted rubrics, and automated mathematical leaderboard synthesis.
          </p>
          {isOrganizer && (
            <div className="pt-2">
              <button
                onClick={onOpenCreateEvent}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/30 transition-all hover:scale-105"
              >
                <PlusCircle className="w-4 h-4" />
                <span>Host New Hackathon</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
          <input
            type="text"
            placeholder="Search hackathons..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-sm bg-slate-900/80 border border-slate-800 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
          />
        </div>

        <div className="flex items-center gap-1.5 p-1 bg-slate-900/80 border border-slate-800 rounded-xl">
          {['ALL', 'ACTIVE', 'COMPLETED'].map((opt) => (
            <button
              key={opt}
              onClick={() => setFilter(opt)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                filter === opt
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {opt === 'ALL' ? 'All Events' : opt === 'ACTIVE' ? 'Active' : 'Concluded'}
            </button>
          ))}
        </div>
      </div>

      {/* Hackathons Grid */}
      {loading ? (
        <div className="text-center py-16 text-slate-500 text-sm">Loading hackathons...</div>
      ) : filteredEvents.length === 0 ? (
        <div className="text-center py-16 bg-slate-900/40 border border-slate-800 rounded-2xl p-8">
          <Trophy className="w-12 h-12 text-slate-600 mx-auto mb-3" />
          <h3 className="text-base font-semibold text-slate-300">No hackathons found</h3>
          <p className="text-xs text-slate-500 mt-1">Try adjusting your search or filters.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {filteredEvents.map((ev) => {
            const statusBadge = getStatusBadge(ev.status);
            const isDeadlinePassed = new Date(ev.deadline) < new Date();

            return (
              <div
                key={ev.id}
                className="glass-card rounded-2xl p-6 flex flex-col justify-between space-y-5"
              >
                <div>
                  <div className="flex items-start justify-between gap-4 mb-3">
                    <span
                      className={`text-xs font-mono font-medium px-2.5 py-1 rounded-full border ${statusBadge.bg} ${statusBadge.text} ${statusBadge.border}`}
                    >
                      {statusBadge.label}
                    </span>
                    <CountdownTimer deadline={ev.deadline} />
                  </div>

                  <h3 className="text-xl font-bold text-white tracking-tight hover:text-indigo-400 transition-colors">
                    {ev.title}
                  </h3>
                  {ev.tagline && (
                    <p className="text-xs font-medium text-indigo-300 mt-1">{ev.tagline}</p>
                  )}
                  <p className="text-xs text-slate-400 mt-2 line-clamp-2">{ev.description}</p>
                </div>

                {/* Rubric Criteria Chips */}
                {ev.criteria && ev.criteria.length > 0 && (
                  <div className="space-y-1.5">
                    <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500">
                      Judging Criteria ({ev.criteria.length})
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {ev.criteria.map((c) => (
                        <span
                          key={c.id}
                          className="text-[11px] px-2 py-0.5 rounded-md bg-slate-800/80 text-slate-300 border border-slate-700/50"
                        >
                          {c.name} ({c.weight}x)
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Stats Bar & Action */}
                <div className="pt-4 border-t border-slate-800/80 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-4 text-slate-400">
                    <span className="flex items-center gap-1">
                      <Users className="w-3.5 h-3.5 text-indigo-400" />
                      <span>{ev._count?.teams || 0} Teams</span>
                    </span>
                    <span className="flex items-center gap-1">
                      <FileText className="w-3.5 h-3.5 text-emerald-400" />
                      <span>{ev._count?.submissions || 0} Submissions</span>
                    </span>
                  </div>

                  <button
                    onClick={() => onSelectEvent(ev.id)}
                    className="flex items-center gap-1 text-xs font-semibold text-indigo-400 hover:text-indigo-300 transition-colors"
                  >
                    <span>View Event</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
