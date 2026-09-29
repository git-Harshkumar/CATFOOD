import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';
import NeoCard from '../components/neo/NeoCard';
import NeoButton from '../components/neo/NeoButton';
import AvatarStack from '../components/neo/AvatarStack';
import { CountdownTimer } from '../components/CountdownTimer';
import { ConfirmationModal } from '../components/ConfirmationModal';
import {
  Users,
  ArrowLeft,
  Crown,
  FileText,
  Copy,
  Check,
  LogOut,
  CheckCircle2,
  Clock,
  AlertCircle,
  ExternalLink,
  UserMinus,
} from 'lucide-react';
import { formatDate } from '../utils/formatters';

export const TeamDetailPage = ({ onOpenSubmit }) => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { showNotification } = useNotification();

  const [team, setTeam] = useState(null);
  const [loading, setLoading] = useState(true);
  const [copiedCode, setCopiedCode] = useState(null);
  const [generatingLink, setGeneratingLink] = useState(false);

  // Confirmation Modal
  const [confirmModal, setConfirmModal] = useState({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: null,
  });

  useEffect(() => {
    fetchTeam();
  }, [id]);

  const fetchTeam = async () => {
    try {
      setLoading(true);
      const res = await api.getTeamById(id);
      if (res?.data) {
        setTeam(res.data);
      }
    } catch (err) {
      console.error('Failed to load team:', err);
      showNotification('error', err.message || 'Failed to load team details.');
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text, type = 'code') => {
    navigator.clipboard.writeText(text);
    setCopiedCode(type);
    showNotification('success', 'Copied to clipboard!');
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const handleGenerateLink = async () => {
    if (!team) return;
    setGeneratingLink(true);
    try {
      const res = await api.getInviteLink(team.id);
      if (res?.data?.token) {
        const link = `${window.location.origin}/join?token=${res.data.token}`;
        copyToClipboard(link, 'link');
      }
    } catch (e) {
      showNotification('error', e.message || 'Failed to generate invite link.');
    } finally {
      setGeneratingLink(false);
    }
  };

  const handleLeaveTeam = () => {
    setConfirmModal({
      isOpen: true,
      title: 'Leave Team',
      message: 'Are you sure you want to leave this team? This action cannot easily be undone.',
      onConfirm: async () => {
        try {
          await api.leaveTeam(team.id);
          setConfirmModal((m) => ({ ...m, isOpen: false }));
          showNotification('success', 'You have left the team.');
          navigate('/teams/my');
        } catch (err) {
          setConfirmModal((m) => ({ ...m, isOpen: false }));
          showNotification('error', err.message || 'Failed to leave team.');
        }
      },
    });
  };

  const handleCompleteRegistration = async () => {
    setConfirmModal({
      isOpen: true,
      title: 'Lock & Complete Registration',
      message: 'Are you sure your team roster is final? This will complete your registration.',
      onConfirm: async () => {
        try {
          await api.completeTeamRegistration(team.id);
          setConfirmModal((m) => ({ ...m, isOpen: false }));
          showNotification('success', 'Registration completed!');
          await fetchTeam();
        } catch (err) {
          setConfirmModal((m) => ({ ...m, isOpen: false }));
          showNotification('error', err.message || 'Failed to complete registration.');
        }
      },
    });
  };

  const handleRemoveMember = async (memberId, memberName) => {
    setConfirmModal({
      isOpen: true,
      title: 'Remove Member',
      message: `Are you sure you want to remove ${memberName} from the team?`,
      onConfirm: async () => {
        try {
          await api.removeTeamMember(team.id, memberId);
          setConfirmModal((m) => ({ ...m, isOpen: false }));
          showNotification('success', `${memberName} removed from team.`);
          await fetchTeam();
        } catch (err) {
          setConfirmModal((m) => ({ ...m, isOpen: false }));
          showNotification('error', err.message || 'Failed to remove member.');
        }
      },
    });
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-20 text-center font-bold text-2xl text-neo-ink/50">
        Loading team details...
      </div>
    );
  }

  if (!team) {
    return (
      <div className="max-w-xl mx-auto px-4 py-20 text-center space-y-6">
        <NeoCard color="bg-neo-pastel-pink" className="py-12 flex flex-col items-center">
          <AlertCircle className="w-16 h-16 text-neo-ink mb-4" />
          <h2 className="text-3xl font-black text-neo-ink uppercase">Team Not Found</h2>
          <p className="font-bold text-neo-ink/70 mt-2 mb-6">
            The requested team does not exist or has been removed.
          </p>
          <NeoButton onClick={() => navigate('/teams/my')} color="bg-white" textColor="text-neo-ink">
            <ArrowLeft className="w-4 h-4 mr-2" /> Back to Teams
          </NeoButton>
        </NeoCard>
      </div>
    );
  }

  const isLeader = team.leaderId === user?.id;
  const isMember = team.members?.some((m) => m.userId === user?.id) || isLeader;
  const isDeadlinePassed = team.event?.deadline ? new Date(team.event.deadline) < new Date() : false;

  return (
    <div className="max-w-5xl mx-auto px-4 space-y-8 pb-20 pt-6">
      {/* Top Contextual Navigation */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate('/teams/my')}
          className="flex items-center gap-2 font-black text-neo-ink hover:underline decoration-3 underline-offset-4"
        >
          <ArrowLeft className="w-5 h-5" /> Back to Teams
        </button>

        {team.event && (
          <button
            onClick={() => navigate(`/events/${team.eventId}`)}
            className="font-black text-xs uppercase px-3.5 py-1.5 bg-white border-3 border-neo-ink rounded-full neo-shadow hover:neo-active"
          >
            Hackathon: {team.event.title}
          </button>
        )}
      </div>

      {/* Hero Header */}
      <NeoCard color="bg-neo-pastel-yellow" className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
          <div className="space-y-3">
            <div className="flex items-center gap-3 flex-wrap">
              <span
                className={`text-xs font-black uppercase px-3 py-1 border-2 border-neo-ink rounded-full neo-shadow-sm ${
                  team.isRegistered ? 'bg-neo-pastel-green' : 'bg-white'
                }`}
              >
                {team.isRegistered ? 'Registered' : 'Draft / Forming'}
              </span>
              <span className="font-black text-xs uppercase px-3 py-1 bg-white border-2 border-neo-ink rounded-full neo-shadow-sm">
                {team.members?.length || 1} / {team.event?.maxTeamSize || 4} Members
              </span>
            </div>

            <h1 className="text-4xl md:text-6xl font-black text-neo-ink tracking-tight">
              {team.name}
            </h1>

            <p className="font-bold text-neo-ink/70 text-lg">
              Leader: <strong className="text-neo-ink">{team.leader?.name || 'Leader'}</strong>
            </p>
          </div>

          {team.event?.deadline && (
            <div className="bg-white p-4 rounded-2xl border-3 border-neo-ink neo-shadow text-center min-w-[200px]">
              <span className="text-[10px] font-black uppercase tracking-wider text-neo-ink/60 block mb-1">
                Event Deadline
              </span>
              {isDeadlinePassed ? (
                <span className="font-black text-red-600 text-lg">Ended</span>
              ) : (
                <CountdownTimer deadline={team.event.deadline} />
              )}
            </div>
          )}
        </div>

        {/* Member Action Controls */}
        {isMember && (
          <div className="pt-4 border-t-3 border-neo-ink flex flex-wrap items-center gap-4">
            {team.submission ? (
              <NeoButton
                onClick={() => navigate(`/events/${team.eventId}/projects/${team.submission.id}`)}
                color="bg-neo-ink"
                textColor="text-white"
              >
                <FileText className="w-4 h-4 mr-2" /> View Submitted Project
              </NeoButton>
            ) : onOpenSubmit && !isDeadlinePassed ? (
              <NeoButton
                onClick={() => onOpenSubmit(team.id, null)}
                color="bg-neo-ink"
                textColor="text-white"
              >
                <FileText className="w-4 h-4 mr-2" /> Submit Project Deliverable
              </NeoButton>
            ) : null}

            {isLeader && !team.isRegistered && (
              <NeoButton
                onClick={handleCompleteRegistration}
                color="bg-neo-pastel-green"
                textColor="text-neo-ink"
              >
                <CheckCircle2 className="w-4 h-4 mr-2" /> Complete Registration
              </NeoButton>
            )}

            {!isLeader && (
              <NeoButton
                onClick={handleLeaveTeam}
                color="bg-white"
                textColor="text-red-600"
              >
                <LogOut className="w-4 h-4 mr-2" /> Leave Team
              </NeoButton>
            )}
          </div>
        )}
      </NeoCard>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Team Members List */}
        <NeoCard color="bg-white" className="space-y-4">
          <h2 className="text-2xl font-black text-neo-ink border-b-3 border-neo-ink pb-3 uppercase flex items-center gap-2">
            <Users className="w-5 h-5" /> Team Members ({team.members?.length || 0})
          </h2>

          <div className="space-y-3">
            {team.members?.map((m) => {
              const isMemLeader = m.userId === team.leaderId;
              return (
                <div
                  key={m.id || m.userId}
                  className="p-3.5 bg-neo-bg border-2 border-neo-ink rounded-xl flex items-center justify-between neo-shadow-sm"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-neo-pastel-yellow border-2 border-neo-ink flex items-center justify-center font-black text-sm">
                      {m.user?.name?.charAt(0) || 'U'}
                    </div>
                    <div>
                      <span className="font-black text-neo-ink block text-sm">
                        {m.user?.name || 'Member'}
                      </span>
                      <span className="text-xs text-neo-ink/60 font-semibold">{m.user?.email}</span>
                    </div>
                  </div>

                  {isMemLeader ? (
                    <span className="px-2.5 py-1 bg-neo-pastel-orange border-2 border-neo-ink rounded-full font-black text-[10px] uppercase flex items-center gap-1">
                      <Crown className="w-3 h-3" /> Leader
                    </span>
                  ) : isLeader && !team.isRegistered ? (
                    <button 
                      onClick={() => handleRemoveMember(m.userId, m.user?.name || 'Member')}
                      className="p-1.5 text-neo-ink hover:text-red-600 transition-colors bg-white border-2 border-neo-ink rounded-full neo-shadow-sm hover:neo-active"
                      title="Remove Member"
                    >
                      <UserMinus className="w-4 h-4" />
                    </button>
                  ) : null}
                </div>
              );
            })}
          </div>
        </NeoCard>

        {/* Invite & Roster Management */}
        <NeoCard color="bg-neo-pastel-blue" className="space-y-6">
          <h2 className="text-2xl font-black text-neo-ink border-b-3 border-neo-ink pb-3 uppercase">
            Recruitment & Invites
          </h2>

          {isMember ? (
            <div className="space-y-4">
              <div className="p-4 bg-white border-3 border-neo-ink rounded-xl space-y-2 neo-shadow">
                <span className="text-[10px] font-black uppercase text-neo-ink/60 block">
                  Static Invite Code
                </span>
                <div className="flex items-center justify-between">
                  <span className="font-mono text-2xl font-black text-neo-ink tracking-wider">
                    {team.inviteCode}
                  </span>
                  <button
                    onClick={() => copyToClipboard(team.inviteCode, 'code')}
                    className="p-2.5 rounded-lg bg-neo-pastel-yellow border-2 border-neo-ink hover:neo-active neo-shadow text-neo-ink"
                    title="Copy code"
                  >
                    {copiedCode === 'code' ? <Check className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              <div className="p-4 bg-white border-3 border-neo-ink rounded-xl space-y-3 neo-shadow">
                <span className="text-[10px] font-black uppercase text-neo-ink/60 block">
                  Direct Invite Link
                </span>
                <p className="text-xs font-bold text-neo-ink/70">
                  Generate an instant 1-hour secure link to send directly to your teammates.
                </p>
                <NeoButton
                  onClick={handleGenerateLink}
                  disabled={generatingLink}
                  color="bg-neo-ink"
                  textColor="text-white"
                  className="w-full justify-center"
                >
                  {copiedCode === 'link' ? 'Copied Link!' : generatingLink ? 'Generating...' : 'Generate & Copy Link'}
                </NeoButton>
              </div>
            </div>
          ) : (
            <p className="font-bold text-neo-ink/70">
              Only team members can view invitation codes and recruit teammates.
            </p>
          )}
        </NeoCard>
      </div>

      <ConfirmationModal
        isOpen={confirmModal.isOpen}
        title={confirmModal.title}
        message={confirmModal.message}
        onConfirm={confirmModal.onConfirm}
        onCancel={() => setConfirmModal((m) => ({ ...m, isOpen: false }))}
      />
    </div>
  );
};

export default TeamDetailPage;
