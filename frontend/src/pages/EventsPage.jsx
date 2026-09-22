import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { CountdownTimer } from '../components/CountdownTimer';
import NeoCard from '../components/neo/NeoCard';
import StatCard from '../components/neo/StatCard';
import FilterChipRow from '../components/neo/FilterChipRow';
import NeoButton from '../components/neo/NeoButton';
import { Trophy, Calendar, Users, FileText, ArrowRight, Search, Sparkles, PlusCircle } from 'lucide-react';
import { getStatusBadge } from '../utils/formatters';

const PASTELS = ['bg-neo-pastel-purple', 'bg-neo-pastel-orange', 'bg-neo-pastel-yellow', 'bg-neo-pastel-green', 'bg-neo-pastel-pink'];

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
      setLoading(true);
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

  const totalTeams = events.reduce((acc, ev) => acc + (ev._count?.teams || 0), 0);
  const totalSubmissions = events.reduce((acc, ev) => acc + (ev._count?.submissions || 0), 0);

  return (
    <div className="space-y-10 pb-12 max-w-7xl mx-auto px-4">
      {/* Hero / Stats Section */}
      <div className="pt-8">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 mb-12">
          <div>
            <h1 className="text-5xl md:text-7xl font-black text-neo-ink tracking-tight mb-4">
              Dashboard
            </h1>
            <p className="text-xl font-bold text-neo-ink/70">
              Build, Submit, and Evaluate with Precision.
            </p>
          </div>
          
          <div className="flex flex-wrap gap-8 items-end">
            <StatCard label="Active Hackathons" value={events.filter(e => e.status === 'ACTIVE').length} />
            <StatCard label="Total Teams" value={totalTeams} />
            <StatCard label="Total Submissions" value={totalSubmissions} />
          </div>
        </div>

        {/* Filter and Search Bar */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-6 mb-8">
          <FilterChipRow 
            options={[
              { label: 'All Events', value: 'ALL' },
              { label: 'Active', value: 'ACTIVE' },
              { label: 'Concluded', value: 'COMPLETED' },
            ]}
            activeOption={filter}
            onChange={setFilter}
          />
          
          <div className="flex items-center gap-4 w-full md:w-auto">
            <div className="relative w-full sm:w-80">
              <Search className="w-5 h-5 text-neo-ink absolute left-4 top-3.5" />
              <input
                type="text"
                placeholder="Search hackathons..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-12 pr-4 py-3 font-bold text-neo-ink bg-white border-3 border-neo-ink rounded-full placeholder-neo-ink/50 focus:outline-none neo-shadow focus:neo-active transition-all"
              />
            </div>
            
            {isOrganizer && (
              <NeoButton onClick={onOpenCreateEvent} color="bg-neo-ink" textColor="text-white" className="shrink-0 whitespace-nowrap">
                <PlusCircle className="w-5 h-5 mr-2" />
                New Event
              </NeoButton>
            )}
          </div>
        </div>

        {/* Hackathons Grid */}
        {loading ? (
          <div className="text-center py-20 font-bold text-2xl text-neo-ink/50">Loading hackathons...</div>
        ) : filteredEvents.length === 0 ? (
          <NeoCard color="bg-white" className="text-center py-20 flex flex-col items-center justify-center">
            <Trophy className="w-16 h-16 text-neo-ink mb-6" />
            <h3 className="text-3xl font-black text-neo-ink mb-2">No hackathons found</h3>
            <p className="font-bold text-neo-ink/60">Try adjusting your search or filters.</p>
          </NeoCard>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {filteredEvents.map((ev, i) => {
              const bg = PASTELS[i % PASTELS.length];
              const statusBadge = getStatusBadge(ev.status);
              const badgeBg = ev.status === 'ACTIVE' ? 'bg-neo-pastel-green' : 'bg-white';

              return (
                <NeoCard key={ev.id} color={bg} className="flex flex-col justify-between cursor-pointer group hover:-translate-y-1" onClick={() => onSelectEvent(ev.id)}>
                  <div>
                    <div className="flex items-center justify-between mb-6">
                      <div className={`px-4 py-1.5 rounded-full border-3 border-neo-ink font-black text-xs uppercase ${badgeBg}`}>
                        {statusBadge.label}
                      </div>
                      <div className="bg-white px-3 py-1 rounded-full border-3 border-neo-ink font-bold text-sm">
                        {new Date(ev.deadline) < new Date() ? 'Ended' : <CountdownTimer deadline={ev.deadline} compact />}
                      </div>
                    </div>

                    <h3 className="text-3xl font-black text-neo-ink leading-tight mb-2 group-hover:underline decoration-4 underline-offset-4">
                      {ev.title}
                    </h3>
                    {ev.tagline && (
                      <p className="text-lg font-bold text-neo-ink/80 mb-4">{ev.tagline}</p>
                    )}
                  </div>

                  <div className="mt-8 pt-6 border-t-3 border-neo-ink flex items-center justify-between">
                    <div className="flex gap-4">
                      <div className="flex flex-col">
                        <span className="text-xs font-black uppercase text-neo-ink/60">Teams</span>
                        <span className="text-xl font-black flex items-center gap-1">
                          <Users className="w-4 h-4" /> {ev._count?.teams || 0}
                        </span>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-xs font-black uppercase text-neo-ink/60">Projects</span>
                        <span className="text-xl font-black flex items-center gap-1">
                          <FileText className="w-4 h-4" /> {ev._count?.submissions || 0}
                        </span>
                      </div>
                    </div>
                    
                    <div className="w-12 h-12 rounded-full border-3 border-neo-ink bg-white flex items-center justify-center group-hover:bg-neo-ink group-hover:text-white transition-colors">
                      <ArrowRight className="w-6 h-6" />
                    </div>
                  </div>
                </NeoCard>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
