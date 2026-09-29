import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';
import api from '../services/api';
import NeoCard from '../components/neo/NeoCard';
import NeoButton from '../components/neo/NeoButton';
import { User, Mail, Shield, LogOut, Award, Users, FileText, ArrowRight, CheckCircle2 } from 'lucide-react';
import { formatDate } from '../utils/formatters';

export const ProfilePage = () => {
  const { user, logout, isParticipant, isJudge, isOrganizer, isGlobalAdmin } = useAuth();
  const navigate = useNavigate();
  const { showNotification } = useNotification();
  
  const [teams, setTeams] = useState([]);
  const [certificates, setCertificates] = useState([]);
  const [judgeQueue, setJudgeQueue] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      navigate('/auth');
      return;
    }
    fetchProfileData();
  }, [user, navigate]);

  const fetchProfileData = async () => {
    setLoading(true);
    try {
      const promises = [];
      
      // Load certificates for everyone
      promises.push(
        api.getMyCertificates().then(res => {
          if (res?.data) setCertificates(res.data);
          else if (Array.isArray(res)) setCertificates(res);
        }).catch(err => console.warn('Failed to load certificates', err))
      );
      
      // Load teams for participants
      if (isParticipant || isGlobalAdmin) {
        promises.push(
          api.getMyTeams().then(res => {
            if (res?.data) setTeams(res.data);
          }).catch(err => console.warn('Failed to load teams', err))
        );
      }
      
      // Load judge queue for judges
      if (isJudge || isGlobalAdmin) {
        promises.push(
          api.getJudgeQueue().then(res => {
            if (res?.data) setJudgeQueue(res.data);
          }).catch(err => console.warn('Failed to load judge queue', err))
        );
      }
      
      await Promise.all(promises);
    } catch (err) {
      showNotification('error', 'Failed to load some profile data.');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/');
    showNotification('success', 'Logged out successfully');
  };

  if (!user) return null;

  return (
    <div className="max-w-6xl mx-auto px-4 space-y-10 pb-20 pt-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 border-b-3 border-neo-ink pb-6">
        <div>
          <h1 className="text-4xl md:text-5xl font-black text-neo-ink tracking-tight uppercase">
            My Profile
          </h1>
          <p className="text-xl font-bold text-neo-ink/70 mt-2">
            Manage your account and view your history
          </p>
        </div>
        <NeoButton onClick={handleLogout} color="bg-neo-pastel-pink" textColor="text-neo-ink">
          <LogOut className="w-5 h-5 mr-2" /> Logout
        </NeoButton>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: User Details */}
        <div className="lg:col-span-1 space-y-6">
          <NeoCard color="bg-white" className="flex flex-col items-center text-center p-8">
            <div className="w-24 h-24 rounded-full bg-neo-pastel-yellow border-4 border-neo-ink flex items-center justify-center font-black text-4xl neo-shadow mb-6">
              {user.name ? user.name.charAt(0).toUpperCase() : 'U'}
            </div>
            <h2 className="text-3xl font-black text-neo-ink mb-2">{user.name}</h2>
            <div className="flex items-center gap-2 text-neo-ink/70 font-bold mb-4">
              <Mail className="w-4 h-4" /> {user.email}
            </div>
          </NeoCard>
          
          {/* Certificates Summary */}
          <NeoCard color="bg-neo-pastel-blue">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-black text-neo-ink uppercase flex items-center gap-2">
                <Award className="w-5 h-5" /> Certificates
              </h3>
              <span className="text-sm font-black bg-white border-2 border-neo-ink px-2 py-0.5 rounded-full">
                {certificates.length}
              </span>
            </div>
            
            {loading ? (
              <p className="text-sm font-bold text-neo-ink/60">Loading...</p>
            ) : certificates.length === 0 ? (
              <p className="text-sm font-bold text-neo-ink/60">You haven't earned any certificates yet.</p>
            ) : (
              <div className="space-y-3">
                {certificates.slice(0, 3).map((cert, idx) => (
                  <div key={cert.id || idx} className="bg-white p-3 border-2 border-neo-ink rounded-xl flex flex-col gap-1">
                    <span className="text-sm font-black text-neo-ink">{cert.metadata?.issuedBy || 'Hackathon Event'}</span>
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-bold text-neo-ink/70">{cert.role}</span>
                      <a href={`/certificates/verify/${cert.id}`} className="font-black text-neo-pastel-purple hover:underline">
                        View
                      </a>
                    </div>
                  </div>
                ))}
                {certificates.length > 3 && (
                  <button onClick={() => navigate('/certificates')} className="w-full text-xs font-black uppercase text-neo-ink hover:underline text-center pt-2">
                    View all {certificates.length} certificates
                  </button>
                )}
              </div>
            )}
          </NeoCard>
        </div>

        {/* Right Column: Role-specific Content */}
        <div className="lg:col-span-2 space-y-8">
          
          {/* For Participants */}
          {(isParticipant || isGlobalAdmin) && (
            <NeoCard color="bg-white">
              <div className="flex items-center justify-between border-b-3 border-neo-ink pb-4 mb-4">
                <h3 className="text-2xl font-black text-neo-ink uppercase flex items-center gap-2">
                  <Users className="w-6 h-6" /> My Teams
                </h3>
                <NeoButton onClick={() => navigate('/events')} color="bg-neo-pastel-green" textColor="text-neo-ink" className="text-xs py-1.5 px-3">
                  Find Events
                </NeoButton>
              </div>
              
              {loading ? (
                <div className="py-8 text-center font-bold text-neo-ink/50">Loading teams...</div>
              ) : teams.length === 0 ? (
                <div className="py-8 text-center font-bold text-neo-ink/60">
                  <p>You aren't in any teams yet.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {teams.map((team) => (
                    <div key={team.id} className="p-4 bg-neo-bg border-3 border-neo-ink rounded-xl flex flex-col justify-between neo-shadow-sm hover:-translate-y-1 transition-transform">
                      <div>
                        <div className="flex justify-between items-start mb-2">
                          <h4 className="font-black text-lg text-neo-ink">{team.name}</h4>
                          <span className="text-[10px] font-black uppercase px-2 py-0.5 bg-white border border-neo-ink rounded-full">
                            {team.members?.length || 1} Members
                          </span>
                        </div>
                        <p className="text-sm font-bold text-neo-ink/70 mb-4 line-clamp-2">
                          {team.event?.title || 'Unknown Event'}
                        </p>
                      </div>
                      <button 
                        onClick={() => navigate(`/teams/${team.id}`)}
                        className="flex items-center text-sm font-black text-neo-ink hover:text-neo-pastel-purple transition-colors w-max"
                      >
                        View Team <ArrowRight className="w-4 h-4 ml-1" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </NeoCard>
          )}

          {/* For Judges */}
          {(isJudge || isGlobalAdmin) && (
            <NeoCard color="bg-neo-pastel-orange">
              <div className="flex items-center justify-between border-b-3 border-neo-ink pb-4 mb-4">
                <h3 className="text-2xl font-black text-neo-ink uppercase flex items-center gap-2">
                  <FileText className="w-6 h-6" /> Judging Assignments
                </h3>
                <NeoButton onClick={() => navigate('/judge/status')} color="bg-neo-ink" textColor="text-white" className="text-xs py-1.5 px-3">
                  Judge Dashboard
                </NeoButton>
              </div>
              
              {loading ? (
                <div className="py-8 text-center font-bold text-neo-ink/50">Loading assignments...</div>
              ) : judgeQueue.length === 0 ? (
                <div className="py-8 text-center font-bold text-neo-ink/60 bg-white border-2 border-neo-ink rounded-xl">
                  <p>No active judging assignments right now.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {judgeQueue.map((queueItem) => {
                    const completed = queueItem.submissions?.filter(s => s.isEvaluated)?.length || 0;
                    const total = queueItem.submissions?.length || 0;
                    const pct = total === 0 ? 0 : Math.round((completed / total) * 100);
                    
                    return (
                      <div key={queueItem.eventId} className="p-4 bg-white border-3 border-neo-ink rounded-xl neo-shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div>
                          <h4 className="font-black text-lg text-neo-ink mb-1">{queueItem.eventTitle}</h4>
                          <p className="text-xs font-bold text-neo-ink/70">
                            Deadline: {formatDate(queueItem.deadline)}
                          </p>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="text-right">
                            <span className="text-[10px] font-black uppercase text-neo-ink/60 block">Progress</span>
                            <span className="text-sm font-black text-neo-ink">{completed} / {total} Done</span>
                          </div>
                          <div className="w-24 h-3 bg-neo-bg border-2 border-neo-ink rounded-full overflow-hidden">
                            <div className="h-full bg-neo-pastel-green" style={{ width: `${pct}%` }}></div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </NeoCard>
          )}

          {/* For Organizers */}
          {(isOrganizer || isGlobalAdmin) && (
            <NeoCard color="bg-neo-pastel-yellow">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <h3 className="text-2xl font-black text-neo-ink uppercase">Organizer Tools</h3>
                  <p className="text-sm font-bold text-neo-ink/70 mt-1">Manage your hackathons and events</p>
                </div>
                <NeoButton onClick={() => navigate('/organizer/events/new')} color="bg-neo-ink" textColor="text-white">
                  Create Event
                </NeoButton>
              </div>
            </NeoCard>
          )}

        </div>
      </div>
    </div>
  );
};

export default ProfilePage;
