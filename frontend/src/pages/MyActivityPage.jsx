import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';
import { ConfirmationModal } from '../components/ConfirmationModal';
import { CountdownTimer } from '../components/CountdownTimer';
import { CreateTeamModal } from './CreateTeamModal';
import { JoinTeamModal } from './JoinTeamModal';
import NeoCard from '../components/neo/NeoCard';
import NeoButton from '../components/neo/NeoButton';
import AvatarStack from '../components/neo/AvatarStack';
import { Users, PlusCircle, UserPlus, Copy, Check, FileText, LogOut, CheckCircle2 } from 'lucide-react';

export const MyActivityPage = ({
  onOpenSubmit,
  onSelectEvent,
  initialEventId,
  autoOpenCreate,
  autoOpenJoin,
  onClearContext,
}) => {
  const { user } = useAuth();
  const { showNotification } = useNotification();
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [copiedCode, setCopiedCode] = useState(null);

  // Modals state
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isJoinOpen, setIsJoinOpen] = useState(false);
  const [events, setEvents] = useState([]);

  // Confirmation / Alert Modal state
  const [confirmModal, setConfirmModal] = useState({
    isOpen: false,
    title: '',
    message: '',
    type: 'confirm',
    variant: 'default',
    confirmText: 'Confirm',
    actionText: 'OK',
    confirmColor: undefined,
    onConfirm: null,
  });

  // Form states
  const [selectedEventId, setSelectedEventId] = useState('');
  
  // Link generation
  const [generatingLinkFor, setGeneratingLinkFor] = useState(null);

  useEffect(() => {
    fetchMyTeams();
    fetchAvailableEvents();
  }, []);

  useEffect(() => {
    if (initialEventId) {
      setSelectedEventId(String(initialEventId));
    }
    if (autoOpenCreate) {
      setIsCreateOpen(true);
    } else if (autoOpenJoin) {
      setIsJoinOpen(true);
    }
  }, [initialEventId, autoOpenCreate, autoOpenJoin]);

  const fetchMyTeams = async () => {
    try {
      setLoading(true);
      const res = await api.getMyTeams();
      if (res?.data) {
        setTeams(res.data);
      }
    } catch (err) {
      console.error('Failed to load teams:', err);
      showNotification('error', 'Failed to load your activities.');
    } finally {
      setLoading(false);
    }
  };

  const fetchAvailableEvents = async () => {
    try {
      const res = await api.getEvents();
      if (res?.data) {
        const activeEvents = res.data.filter((e) => e.status === 'ACTIVE');
        setEvents(activeEvents);
        if (initialEventId) {
          setSelectedEventId(String(initialEventId));
        } else if (activeEvents.length > 0) {
          setSelectedEventId(String(activeEvents[0].id));
        }
      }
    } catch (err) {
      console.error('Failed to load events:', err);
    }
  };

  const copyToClipboard = (text, type = 'code') => {
    navigator.clipboard.writeText(text);
    setCopiedCode(type);
    showNotification('success', 'Copied to clipboard!');
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const handleGenerateLink = async (teamId) => {
    setGeneratingLinkFor(teamId);
    try {
      const res = await api.getInviteLink(teamId);
      if (res?.data?.token) {
        const link = `${window.location.origin}/join?token=${res.data.token}`;
        copyToClipboard(link, `link-${teamId}`);
      }
    } catch (e) {
      console.error(e);
      showNotification('error', e.message || 'Failed to generate invite link.');
    } finally {
      setGeneratingLinkFor(null);
    }
  };


  const handleLeaveTeam = (teamId) => {
    setConfirmModal({
      isOpen: true,
      title: 'Leave Team',
      message: 'Are you sure you want to leave this team? This action cannot easily be undone.',
      type: 'confirm',
      variant: 'danger',
      confirmText: 'Leave Team',
      confirmColor: 'bg-red-600',
      onConfirm: async () => {
        try {
          await api.leaveTeam(teamId);
          setConfirmModal((m) => ({ ...m, isOpen: false }));
          showNotification('success', 'You have left the team.');
          await fetchMyTeams();
        } catch (err) {
          setConfirmModal((m) => ({ ...m, isOpen: false }));
          showNotification('error', err.message || 'Could not leave team. Please try again.');
        }
      },
    });
  };

  const handleCompleteRegistration = async (teamId) => {
    setConfirmModal({
      isOpen: true,
      title: 'Complete Registration?',
      message: 'Are you sure your team roster is complete? This locks the team from joining members.',
      type: 'confirm',
      variant: 'default',
      confirmText: 'Complete Registration',
      onConfirm: async () => {
        try {
          await api.completeTeamRegistration(teamId);
          setConfirmModal((m) => ({ ...m, isOpen: false }));
          showNotification('success', 'Team registration complete! You are fully registered.');
          await fetchMyTeams();
        } catch (err) {
          setConfirmModal((m) => ({ ...m, isOpen: false }));
          showNotification('error', err.message || 'Failed to complete registration.');
        }
      },
    });
  };

  const inputClass = "w-full px-4 py-3 font-bold bg-white border-3 border-neo-ink rounded-xl placeholder-neo-ink/40 neo-shadow focus:outline-none focus:neo-active transition-all";

  // Categories
  const draftTeams = [];
  const upcomingTeams = [];
  const pastTeams = [];

  teams.forEach(tm => {
    const isDeadlinePassed = new Date(tm.event.deadline) < new Date();
    if (isDeadlinePassed) {
      pastTeams.push(tm);
    } else if (!tm.isRegistered) {
      draftTeams.push(tm);
    } else {
      upcomingTeams.push(tm);
    }
  });

  const renderTeamCard = (tm, i, type) => {
    const isDeadlinePassed = new Date(tm.event.deadline) < new Date();
    const isLeader = tm.leaderId === user?.id;
    const bgClass = ['bg-neo-pastel-yellow', 'bg-neo-pastel-green', 'bg-neo-pastel-blue'][i % 3];

    return (
      <NeoCard key={tm.id} color={bgClass} className="flex flex-col justify-between">
        <div className="space-y-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <span className="text-xs font-black uppercase tracking-wider px-3 py-1 bg-white border-3 border-neo-ink rounded-full neo-shadow cursor-pointer hover:bg-black/5" onClick={() => onSelectEvent(tm.event.id)}>
                {tm.event.title}
              </span>
              <h3 className="text-4xl font-black text-neo-ink tracking-tight mt-4">{tm.name}</h3>
            </div>
            <div className="bg-white px-3 py-1 rounded-full border-3 border-neo-ink font-bold text-sm text-center">
               {isDeadlinePassed ? 'Ended' : <CountdownTimer deadline={tm.event.deadline} compact />}
            </div>
          </div>

          {/* Draft Teams get the Invite tools */}
          {type === 'draft' && (
            <div className="p-4 rounded-xl bg-white border-3 border-neo-ink flex flex-col gap-3 neo-shadow">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-black uppercase tracking-wider text-neo-ink/60 block">
                    Static Invite Code
                  </span>
                  <span className="font-mono text-xl font-black text-neo-ink tracking-wider">
                    {tm.inviteCode}
                  </span>
                </div>
                <button
                  onClick={() => copyToClipboard(tm.inviteCode, 'code')}
                  className="w-10 h-10 rounded-full bg-neo-pastel-orange border-3 border-neo-ink flex items-center justify-center hover:neo-active neo-shadow text-neo-ink"
                  title="Copy invite code"
                >
                  {copiedCode === 'code' ? <Check className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
                </button>
              </div>

              <div className="border-t-3 border-neo-ink pt-3 flex items-center justify-between">
                 <div>
                  <span className="text-[10px] font-black uppercase tracking-wider text-neo-ink/60 block">
                    1-Hour Expiring Link
                  </span>
                  <span className="text-xs font-bold text-neo-ink block">
                    Send a secure, auto-expiring link
                  </span>
                 </div>
                 <NeoButton 
                    variant="pill" 
                    onClick={() => handleGenerateLink(tm.id)}
                    color="bg-neo-ink" 
                    textColor="text-white"
                    className="!py-1.5 !px-3 !text-xs"
                    disabled={generatingLinkFor === tm.id}
                  >
                    {copiedCode === `link-${tm.id}` ? 'Copied Link!' : (generatingLinkFor === tm.id ? 'Generating...' : 'Copy Link')}
                  </NeoButton>
              </div>
            </div>
          )}

          {/* Team Members List */}
          <div>
            <div className="flex justify-between items-center mb-2">
               <span className="text-[10px] font-black uppercase tracking-wider text-neo-ink/60">
                 Roster ({tm.members.length}/{tm.event.maxTeamSize})
               </span>
            </div>
            <AvatarStack members={tm.members.map(m => ({
                ...m, 
                name: m.user.id === tm.leaderId ? `${m.user.name} (L)` : m.user.name
            }))} max={5} />
          </div>
        </div>

        {/* Submission Status & Action */}
        <div className="pt-6 mt-6 border-t-3 border-neo-ink flex flex-col gap-4">
          <div className="flex items-center justify-between w-full">
            <div>
              {type === 'draft' ? (
                <span className="text-sm text-neo-ink/70 font-bold bg-white px-3 py-1 rounded-full border-3 border-neo-ink neo-shadow">Draft Setup</span>
              ) : tm.submission ? (
                <span className="inline-flex items-center gap-2 text-sm text-neo-ink font-black bg-white px-3 py-1 rounded-full border-3 border-neo-ink neo-shadow">
                  <Check className="w-4 h-4 text-green-600" />
                  Submitted
                </span>
              ) : (
                <span className="text-sm text-neo-ink/70 font-bold bg-white px-3 py-1 rounded-full border-3 border-neo-ink neo-shadow">Not Submitted</span>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button onClick={() => handleLeaveTeam(tm.id)} className="w-12 h-12 bg-neo-pastel-pink border-3 border-neo-ink rounded-full flex items-center justify-center hover:neo-active neo-shadow text-neo-ink" title="Leave Team">
                <LogOut className="w-5 h-5" />
              </button>

              {type !== 'draft' && (
                <NeoButton
                  onClick={() => onOpenSubmit(tm.id, tm.submission)}
                  disabled={isDeadlinePassed && !tm.submission}
                  color="bg-neo-ink" 
                  textColor="text-white"
                >
                  <FileText className="w-5 h-5 mr-2" />
                  {tm.submission ? (isDeadlinePassed ? 'View (Locked)' : 'Edit Submission') : 'Submit'}
                </NeoButton>
              )}
            </div>
          </div>
          
          {type === 'draft' && isLeader && (
            <NeoButton 
              onClick={() => handleCompleteRegistration(tm.id)}
              color="bg-neo-ink" 
              textColor="text-white"
              className="w-full justify-center"
            >
              <CheckCircle2 className="w-5 h-5 mr-2" />
              Complete Registration
            </NeoButton>
          )}
        </div>
      </NeoCard>
    );
  };

  return (
    <div className="max-w-7xl mx-auto px-4 space-y-10 pb-16 pt-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 mb-12">
        <div>
          <h1 className="text-4xl md:text-5xl font-black text-neo-ink tracking-tight">
            My Activity
          </h1>
          <p className="text-lg font-bold text-neo-ink/70 mt-2">
            Track your hackathon registrations, teams, and deliverables.
          </p>
        </div>

      </div>

      {loading ? (
        <div className="text-center py-20 font-bold text-2xl text-neo-ink/50">Loading your activity...</div>
      ) : teams.length === 0 ? (
        <NeoCard color="bg-white" className="text-center py-20 flex flex-col items-center justify-center">
          <Users className="w-16 h-16 text-neo-ink mb-6" />
          <h3 className="text-3xl font-black text-neo-ink mb-2">No activity yet</h3>
          <p className="font-bold text-neo-ink/60 max-w-sm mb-6">
            Register for a hackathon, create a team, or join one to get started.
          </p>
        </NeoCard>
      ) : (
        <div className="space-y-12">
          
          {draftTeams.length > 0 && (
            <div>
              <h2 className="text-2xl font-black text-neo-ink mb-6 flex items-center gap-2">
                Drafts (Pending Registration)
                <span className="text-sm px-2 py-0.5 bg-neo-pastel-pink border-2 border-neo-ink rounded-full neo-shadow">{draftTeams.length}</span>
              </h2>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {draftTeams.map((tm, i) => renderTeamCard(tm, i, 'draft'))}
              </div>
            </div>
          )}

          {upcomingTeams.length > 0 && (
            <div>
              <h2 className="text-2xl font-black text-neo-ink mb-6 flex items-center gap-2">
                Registered & Upcoming
                <span className="text-sm px-2 py-0.5 bg-neo-pastel-green border-2 border-neo-ink rounded-full neo-shadow">{upcomingTeams.length}</span>
              </h2>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {upcomingTeams.map((tm, i) => renderTeamCard(tm, i, 'upcoming'))}
              </div>
            </div>
          )}

          {pastTeams.length > 0 && (
            <div>
              <h2 className="text-2xl font-black text-neo-ink mb-6 flex items-center gap-2">
                Past Events
                <span className="text-sm px-2 py-0.5 bg-neo-ink text-white border-2 border-neo-ink rounded-full neo-shadow">{pastTeams.length}</span>
              </h2>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {pastTeams.map((tm, i) => renderTeamCard(tm, i, 'past'))}
              </div>
            </div>
          )}

        </div>
      )}

      {/* Modal: Create Team */}
      <CreateTeamModal 
        isOpen={isCreateOpen}
        onClose={() => {
          setIsCreateOpen(false);
          if (onClearContext) onClearContext();
        }}
        initialEventId={selectedEventId || initialEventId}
        onSuccess={() => fetchMyTeams()}
      />

      {/* Modal: Join Team */}
      <JoinTeamModal 
        isOpen={isJoinOpen}
        onClose={() => {
          setIsJoinOpen(false);
          if (onClearContext) onClearContext();
        }}
        onSuccess={() => fetchMyTeams()}
      />

      {/* Confirmation & Alert Modal */}
      <ConfirmationModal
        isOpen={confirmModal.isOpen}
        onClose={() => setConfirmModal((m) => ({ ...m, isOpen: false }))}
        title={confirmModal.title}
        message={confirmModal.message}
        type={confirmModal.type}
        variant={confirmModal.variant}
        confirmText={confirmModal.confirmText}
        actionText={confirmModal.actionText}
        confirmColor={confirmModal.confirmColor}
        onConfirm={confirmModal.onConfirm}
      />
    </div>
);
};
