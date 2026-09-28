import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import NeoCard from '../components/neo/NeoCard';
import NeoButton from '../components/neo/NeoButton';
import StatCard from '../components/neo/StatCard';
import { getStatusBadge, formatDate } from '../utils/formatters';
import { Trophy, FileText, Users, PlusCircle, ArrowRight } from 'lucide-react';

export const OrganizerDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMyEvents();
  }, []);

  const fetchMyEvents = async () => {
    try {
      setLoading(true);
      // Fetch all events, filter by organizerId locally since backend might not have a specific endpoint for just my events
      const res = await api.getEvents();
      if (res?.data) {
        const myEvents = res.data.filter(ev => ev.organizerId === user?.id);
        setEvents(myEvents);
      }
    } catch (err) {
      console.error('Failed to load organizer events:', err);
    } finally {
      setLoading(false);
    }
  };

  // Aggregated Stats
  const totalEvents = events.length;
  const totalTeams = events.reduce((acc, ev) => acc + (ev._count?.teams || 0), 0);
  const totalSubmissions = events.reduce((acc, ev) => acc + (ev._count?.submissions || 0), 0);


  if (loading) {
    return <div className="py-20 text-center font-bold text-2xl text-neo-ink/50">Loading dashboard...</div>;
  }

  return (
    <div className="space-y-12 pb-16">
      {/* Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div>
          <h1 className="text-4xl md:text-5xl font-black text-neo-ink tracking-tight mb-2">
            Organizer Dashboard
          </h1>
          <p className="text-xl font-bold text-neo-ink/70">
            Welcome back, {user?.name}. Here is your command center.
          </p>
        </div>
        <NeoButton onClick={() => navigate('/organizer/events/new')} color="bg-neo-pastel-yellow" textColor="text-neo-ink">
          <PlusCircle className="w-5 h-5 mr-2" />
          Create New Event
        </NeoButton>
      </div>

      {/* Top Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard label="Total Events Hosted" value={totalEvents} />
        <StatCard label="Total Teams Registered" value={totalTeams} />
        <StatCard label="Total Projects Submitted" value={totalSubmissions} />
      </div>



      {/* Events List */}
      <div className="space-y-6">
        <h2 className="text-3xl font-black text-neo-ink border-b-3 border-neo-ink pb-2">Your Hackathons</h2>
        {events.length === 0 ? (
          <NeoCard color="bg-neo-pastel-blue" className="text-center py-16 flex flex-col items-center justify-center">
            <Trophy className="w-16 h-16 text-neo-ink mb-6" />
            <h3 className="text-2xl font-black text-neo-ink mb-2">No hackathons hosted yet</h3>
            <p className="font-bold text-neo-ink/70 mb-6">Create your first event and start managing it here.</p>
            <NeoButton onClick={() => navigate('/organizer/events/new')} color="bg-neo-ink" textColor="text-white">
              Host Hackathon
            </NeoButton>
          </NeoCard>
        ) : (
          <div className="grid grid-cols-1 gap-6">
            {events.map((ev, idx) => {
              const statusBadge = getStatusBadge(ev.status);
              const badgeBg = ev.status === 'ACTIVE' ? 'bg-neo-pastel-green' : 'bg-white';
              const cardBg = ['bg-white', 'bg-neo-pastel-blue', 'bg-neo-pastel-pink'][idx % 3];

              return (
                <NeoCard key={ev.id} color={cardBg} className="flex flex-col md:flex-row items-center justify-between gap-6 hover:-translate-y-1 transition-transform">
                  <div className="flex-1 w-full space-y-4">
                    <div className="flex items-center gap-3 flex-wrap">
                      <span className={`px-3 py-1 rounded-full border-3 border-neo-ink font-black text-[10px] uppercase ${badgeBg}`}>
                        {statusBadge.label}
                      </span>
                      <span className="font-bold text-sm text-neo-ink/70 bg-white px-2 py-0.5 rounded-md border-2 border-neo-ink">
                        Deadline: {formatDate(ev.deadline)}
                      </span>
                    </div>
                    <div>
                      <h3 className="text-2xl font-black text-neo-ink">{ev.title}</h3>
                      {ev.tagline && <p className="font-bold text-neo-ink/80">{ev.tagline}</p>}
                    </div>
                  </div>

                  <div className="flex items-center gap-8 w-full md:w-auto">
                    <div className="flex items-center gap-6">
                      <div className="flex flex-col items-center">
                        <span className="text-[10px] font-black uppercase text-neo-ink/60">Teams</span>
                        <span className="text-xl font-black flex items-center gap-1">
                          <Users className="w-4 h-4" /> {ev._count?.teams || 0}
                        </span>
                      </div>
                      <div className="flex flex-col items-center">
                        <span className="text-[10px] font-black uppercase text-neo-ink/60">Projects</span>
                        <span className="text-xl font-black flex items-center gap-1">
                          <FileText className="w-4 h-4" /> {ev._count?.submissions || 0}
                        </span>
                      </div>
                    </div>

                    <NeoButton 
                      onClick={() => navigate(`/organizer/events/${ev.id}/edit`)} 
                      color="bg-neo-ink" 
                      textColor="text-white"
                      className="shrink-0"
                    >
                      Manage <ArrowRight className="w-4 h-4 ml-2" />
                    </NeoButton>
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
