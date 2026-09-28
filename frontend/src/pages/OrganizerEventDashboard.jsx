import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import api from '../services/api';
import NeoCard from '../components/neo/NeoCard';
import NeoButton from '../components/neo/NeoButton';
import StatCard from '../components/neo/StatCard';
import { getStatusBadge, formatDate } from '../utils/formatters';
import { ArrowLeft, Users, Trophy, Settings, ShieldCheck, Download, TrendingUp, BarChart2 } from 'lucide-react';
import JudgingProgressSection from '../components/JudgingProgressSection';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  BarChart, Bar
} from 'recharts';

export const OrganizerEventDashboard = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  
  // Determine active tab from URL, default to 'edit'
  const activeTab = location.pathname.includes('/judges') ? 'judges' 
                  : location.pathname.includes('/leaderboard') ? 'leaderboard'
                  : location.pathname.includes('/dashboard') ? 'dashboard'
                  : 'edit';

  useEffect(() => {
    fetchEventDetails();
  }, [id]);

  const fetchEventDetails = async () => {
    try {
      setLoading(true);
      const res = await api.getEventById(id);
      if (res?.data) {
        setEvent(res.data);
      }
    } catch (err) {
      console.error('Failed to load event details:', err);
    } finally {
      setLoading(false);
    }
  };


  if (loading || !event) {
    return <div className="py-20 text-center font-bold text-2xl text-neo-ink/50">Loading event dashboard...</div>;
  }

  const statusBadge = getStatusBadge(event.status);

  // Mock Graph Data for the specific event
  const registrationTrends = [
    { name: 'Week 1', teams: Math.floor((event._count?.teams || 0) * 0.1), submissions: 0 },
    { name: 'Week 2', teams: Math.floor((event._count?.teams || 0) * 0.3), submissions: Math.floor((event._count?.submissions || 0) * 0.1) },
    { name: 'Week 3', teams: Math.floor((event._count?.teams || 0) * 0.6), submissions: Math.floor((event._count?.submissions || 0) * 0.4) },
    { name: 'Week 4', teams: Math.floor((event._count?.teams || 0) * 0.9), submissions: Math.floor((event._count?.submissions || 0) * 0.8) },
    { name: 'Week 5', teams: event._count?.teams || 0, submissions: event._count?.submissions || 0 },
  ];

  const eventEngagement = [
    {
      name: 'Current Event',
      teams: event._count?.teams || 0,
      submissions: event._count?.submissions || 0,
    }
  ];

  return (
    <div className="space-y-8 pb-16">
      {/* Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 pb-6 border-b-3 border-neo-ink">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <h1 className="text-4xl md:text-5xl font-black text-neo-ink tracking-tight uppercase">
              {event.title}
            </h1>
            <span className={`px-3 py-1 rounded-full border-3 border-neo-ink font-black text-[10px] uppercase ${event.status === 'ACTIVE' ? 'bg-neo-pastel-green' : 'bg-white'}`}>
              {statusBadge.label}
            </span>
          </div>
          <p className="text-xl font-bold text-neo-ink/70">Event Control Panel</p>
        </div>

        <NeoButton onClick={() => navigate(`/events/${event.id}`)} color="bg-neo-ink" textColor="text-white">
          View Public Page <ArrowLeft className="w-4 h-4 ml-2 rotate-135" />
        </NeoButton>
      </div>

      {activeTab === 'dashboard' && (
        <div className="space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <StatCard label="Registered Teams" value={event._count?.teams || 0} />
            <StatCard label="Projects Submitted" value={event._count?.submissions || 0} />
            <StatCard label="Assigned Judges" value={event.judges?.length || 0} />
            <NeoCard color="bg-neo-pastel-yellow" className="flex flex-col justify-center items-center">
              <span className="text-sm font-black uppercase text-neo-ink/70 mb-2">Leaderboard</span>
              <span className="text-2xl font-black text-neo-ink text-center">
                {event.isLeaderboardPublished ? 'PUBLISHED' : 'HIDDEN'}
              </span>
            </NeoCard>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <NeoCard color="bg-white" className="space-y-6">
              <div className="flex items-center gap-3 border-b-3 border-neo-ink pb-4">
                <TrendingUp className="w-8 h-8 text-neo-pastel-orange" />
                <h3 className="text-2xl font-black text-neo-ink">Registration Trends</h3>
              </div>
              <div className="h-80 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={registrationTrends} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#cbd5e1" />
                    <XAxis dataKey="name" stroke="#000000" tick={{ fill: '#000000', fontWeight: 'bold' }} />
                    <YAxis stroke="#000000" tick={{ fill: '#000000', fontWeight: 'bold' }} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#fff', border: '3px solid #000', borderRadius: '12px', fontWeight: 'bold' }} 
                    />
                    <Legend wrapperStyle={{ fontWeight: 'bold' }} />
                    <Line type="monotone" dataKey="teams" stroke="#ff7e67" strokeWidth={4} activeDot={{ r: 8 }} name="Teams" />
                    <Line type="monotone" dataKey="submissions" stroke="#87c38f" strokeWidth={4} name="Submissions" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </NeoCard>

            <NeoCard color="bg-neo-bg" className="space-y-6">
              <div className="flex items-center gap-3 border-b-3 border-neo-ink pb-4">
                <BarChart2 className="w-8 h-8 text-neo-pastel-purple" />
                <h3 className="text-2xl font-black text-neo-ink">Event Engagement</h3>
              </div>
              <div className="h-80 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={eventEngagement} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#cbd5e1" />
                    <XAxis dataKey="name" stroke="#000000" tick={{ fill: '#000000', fontWeight: 'bold' }} />
                    <YAxis stroke="#000000" tick={{ fill: '#000000', fontWeight: 'bold' }} />
                    <Tooltip 
                      cursor={{ fill: 'rgba(0,0,0,0.1)' }}
                      contentStyle={{ backgroundColor: '#fff', border: '3px solid #000', borderRadius: '12px', fontWeight: 'bold' }} 
                    />
                    <Legend wrapperStyle={{ fontWeight: 'bold' }} />
                    <Bar dataKey="teams" fill="#87c38f" name="Teams" stroke="#000" strokeWidth={2} radius={[4, 4, 0, 0]} />
                    <Bar dataKey="submissions" fill="#a78bfa" name="Submissions" stroke="#000" strokeWidth={2} radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </NeoCard>
          </div>
        </div>
      )}

      {/* Tab Content */}
      <div className="pt-4">
        {activeTab === 'edit' && (
          <div className="space-y-6 max-w-4xl">
            <NeoCard color="bg-white">
              <h3 className="text-2xl font-black text-neo-ink mb-4 border-b-3 border-neo-ink pb-2">Event Details</h3>
              <div className="space-y-4">
                <div>
                  <label className="block font-black text-neo-ink text-sm uppercase">Title</label>
                  <p className="font-bold text-lg">{event.title}</p>
                </div>
                <div>
                  <label className="block font-black text-neo-ink text-sm uppercase">Description</label>
                  <p className="font-medium text-neo-ink/80">{event.description}</p>
                </div>
                <div className="grid grid-cols-2 gap-4 pt-4">
                  <div>
                    <label className="block font-black text-neo-ink text-sm uppercase">Deadline</label>
                    <p className="font-bold text-lg">{formatDate(event.deadline)}</p>
                  </div>
                  <div>
                    <label className="block font-black text-neo-ink text-sm uppercase">Team Size</label>
                    <p className="font-bold text-lg">{event.minTeamSize} - {event.maxTeamSize} members</p>
                  </div>
                </div>
              </div>
            </NeoCard>
            
            <NeoCard color="bg-neo-pastel-purple" className="flex items-center justify-between">
              <div>
                <h4 className="font-black text-xl text-neo-ink">Export Event Data</h4>
                <p className="font-bold text-neo-ink/80 text-sm">Download all teams and submissions as CSV.</p>
              </div>
              <NeoButton color="bg-white" textColor="text-neo-ink">
                <Download className="w-5 h-5 mr-2" /> Export CSV
              </NeoButton>
            </NeoCard>
          </div>
        )}

        {activeTab === 'judges' && (
          <div className="space-y-8">
            <NeoCard color="bg-neo-bg">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-2xl font-black text-neo-ink">Judging Progress</h3>
              </div>
              <JudgingProgressSection eventId={event.id} />
            </NeoCard>

            <NeoCard color="bg-neo-pastel-orange">
              <h3 className="text-2xl font-black text-neo-ink mb-4">Assigned Judges ({event.judges?.length || 0})</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {event.judges?.map(j => (
                  <div key={j.id} className="p-4 bg-white border-3 border-neo-ink rounded-xl flex items-center justify-between neo-shadow">
                    <div>
                      <p className="font-black text-neo-ink text-lg">{j.user?.name}</p>
                      <p className="font-bold text-neo-ink/70 text-sm">{j.user?.email}</p>
                    </div>
                    <ShieldCheck className="w-6 h-6 text-neo-pastel-green" />
                  </div>
                ))}
                {(!event.judges || event.judges.length === 0) && (
                  <p className="font-bold text-neo-ink/70">No judges assigned yet.</p>
                )}
              </div>
            </NeoCard>
          </div>
        )}

        {activeTab === 'leaderboard' && (
          <div className="space-y-6">
            <NeoCard color="bg-neo-pastel-yellow" className="text-center py-12">
              <Trophy className="w-16 h-16 text-neo-ink mx-auto mb-4" />
              <h3 className="text-2xl font-black text-neo-ink mb-2">Leaderboard Management</h3>
              <p className="font-bold text-neo-ink/70 mb-6 max-w-xl mx-auto">
                The leaderboard is currently {event.isLeaderboardPublished ? 'PUBLISHED' : 'HIDDEN'}. 
                View the real-time rankings and normalize judge scores.
              </p>
              <NeoButton onClick={() => navigate(`/organizer/events/${event.id}/leaderboard-view`)} color="bg-neo-ink" textColor="text-white">
                Open Detailed Leaderboard
              </NeoButton>
            </NeoCard>
          </div>
        )}
      </div>
    </div>
  );
};
