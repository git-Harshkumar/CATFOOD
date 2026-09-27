import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { Modal } from '../components/Modal';
import { CountdownTimer } from '../components/CountdownTimer';
import NeoCard from '../components/neo/NeoCard';
import NeoButton from '../components/neo/NeoButton';
import AvatarStack from '../components/neo/AvatarStack';
import { Users, PlusCircle, UserPlus, Copy, Check, FileText, Link as LinkIcon, LogOut } from 'lucide-react';

export const TeamsPage = ({ onOpenSubmit, onSelectEvent }) => {
  const { user } = useAuth();
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [copiedCode, setCopiedCode] = useState(null);

  // Modals state
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isJoinOpen, setIsJoinOpen] = useState(false);
  const [events, setEvents] = useState([]);

  // Form states
  const [selectedEventId, setSelectedEventId] = useState('');
  const [teamName, setTeamName] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [modalError, setModalError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  
  // Link generation
  const [generatingLinkFor, setGeneratingLinkFor] = useState(null);

  useEffect(() => {
    fetchMyTeams();
    fetchAvailableEvents();
  }, []);

  const fetchMyTeams = async () => {
    try {
      setLoading(true);
      const res = await api.getMyTeams();
      if (res?.data) {
        setTeams(res.data);
      }
    } catch (err) {
      console.error('Failed to load teams:', err);
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
        if (activeEvents.length > 0) setSelectedEventId(String(activeEvents[0].id));
      }
    } catch (err) {
      console.error('Failed to load events:', err);
    }
  };

  const copyToClipboard = (text, type = 'code') => {
    navigator.clipboard.writeText(text);
    setCopiedCode(type);
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
      alert('Failed to generate invite link');
    } finally {
      setGeneratingLinkFor(null);
    }
  };

  const handleCreateTeam = async (e) => {
    e.preventDefault();
    setModalError(null);
    setSubmitting(true);
    try {
      await api.createTeam({ eventId: parseInt(selectedEventId, 10), name: teamName });
      setIsCreateOpen(false);
      setTeamName('');
      await fetchMyTeams();
    } catch (err) {
      setModalError(err.message || 'Failed to create team');
    } finally {
      setSubmitting(false);
    }
  };

  const handleJoinTeam = async (e) => {
    e.preventDefault();
    setModalError(null);
    setSubmitting(true);
    try {
      await api.joinTeam(inviteCode.trim());
      setIsJoinOpen(false);
      setInviteCode('');
      await fetchMyTeams();
    } catch (err) {
      setModalError(err.message || 'Failed to join team');
    } finally {
      setSubmitting(false);
    }
  };

  const handleLeaveTeam = async (teamId) => {
    if (!window.confirm('Are you sure you want to leave this team?')) return;
    try {
      await api.leaveTeam(teamId);
      await fetchMyTeams();
    } catch (err) {
      alert(err.message || 'Failed to leave team');
    }
  };

  const inputClass = "w-full px-4 py-3 font-bold bg-white border-3 border-neo-ink rounded-xl placeholder-neo-ink/40 neo-shadow focus:outline-none focus:neo-active transition-all";

  return (
    <div className="max-w-7xl mx-auto px-4 space-y-10 pb-16 pt-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 mb-12">
        <div>
          <h1 className="text-4xl md:text-5xl font-black text-neo-ink tracking-tight">
            Team Workspace
          </h1>
          <p className="text-lg font-bold text-neo-ink/70 mt-2">
            Manage your hackathon teams, collaborate with teammates, and submit deliverables.
          </p>
        </div>

        <div className="flex items-center gap-4">
          <NeoButton onClick={() => setIsJoinOpen(true)} color="bg-white" textColor="text-neo-ink">
            <UserPlus className="w-5 h-5 mr-2" />
            Join Team
          </NeoButton>

          <NeoButton onClick={() => setIsCreateOpen(true)} color="bg-neo-ink" textColor="text-white">
            <PlusCircle className="w-5 h-5 mr-2" />
            Create Team
          </NeoButton>
        </div>
      </div>

      {/* Teams Grid */}
      {loading ? (
        <div className="text-center py-20 font-bold text-2xl text-neo-ink/50">Loading your teams...</div>
      ) : teams.length === 0 ? (
        <NeoCard color="bg-white" className="text-center py-20 flex flex-col items-center justify-center">
          <Users className="w-16 h-16 text-neo-ink mb-6" />
          <h3 className="text-3xl font-black text-neo-ink mb-2">You are not in any teams yet</h3>
          <p className="font-bold text-neo-ink/60 max-w-sm mb-6">
            Create a new team for an active hackathon or join an existing team using an invite code.
          </p>
          <div className="flex gap-4">
            <NeoButton onClick={() => setIsCreateOpen(true)} color="bg-neo-pastel-purple" textColor="text-neo-ink">
              Create Team
            </NeoButton>
            <NeoButton onClick={() => setIsJoinOpen(true)} color="bg-neo-ink" textColor="text-white">
              Join with Code
            </NeoButton>
          </div>
        </NeoCard>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {teams.map((tm, i) => {
            const isDeadlinePassed = new Date(tm.event.deadline) < new Date();
            const isLeader = tm.leaderId === user?.id;
            const bgClass = ['bg-neo-pastel-yellow', 'bg-neo-pastel-green', 'bg-neo-pastel-blue'][i % 3];

            return (
              <NeoCard key={tm.id} color={bgClass} className="flex flex-col justify-between">
                <div className="space-y-6">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <span className="text-xs font-black uppercase tracking-wider px-3 py-1 bg-white border-3 border-neo-ink rounded-full neo-shadow">
                        {tm.event.title}
                      </span>
                      <h3 className="text-4xl font-black text-neo-ink tracking-tight mt-4">{tm.name}</h3>
                    </div>
                    <div className="bg-white px-3 py-1 rounded-full border-3 border-neo-ink font-bold text-sm text-center">
                       {isDeadlinePassed ? 'Ended' : <CountdownTimer deadline={tm.event.deadline} compact />}
                    </div>
                  </div>

                  {/* Invite Code Box */}
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
                <div className="pt-6 mt-6 border-t-3 border-neo-ink flex items-center justify-between">
                  <div>
                    {tm.submission ? (
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

                    <NeoButton
                      onClick={() => onOpenSubmit(tm.id, tm.submission)}
                      disabled={isDeadlinePassed && !tm.submission}
                      color="bg-neo-ink" 
                      textColor="text-white"
                    >
                      <FileText className="w-5 h-5 mr-2" />
                      {tm.submission ? (isDeadlinePassed ? 'View (Locked)' : 'Edit Submission') : 'Submit'}
                    </NeoButton>
                  </div>
                </div>
              </NeoCard>
            );
          })}
        </div>
      )}

      {/* Modal: Create Team */}
      <Modal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        title="Form a New Team"
        maxWidth="max-w-xl"
      >
        <form onSubmit={handleCreateTeam} className="space-y-6">
          {modalError && (
            <div className="p-4 rounded-xl bg-neo-pastel-pink border-3 border-neo-ink text-neo-ink font-bold text-center">
              {modalError}
            </div>
          )}

          <div>
            <label className="block font-black text-neo-ink mb-2">Select Hackathon</label>
            <select
              value={selectedEventId}
              onChange={(e) => setSelectedEventId(e.target.value)}
              className={inputClass}
            >
              {events.map((ev) => (
                <option key={ev.id} value={ev.id}>
                  {ev.title} (Max {ev.maxTeamSize} members)
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block font-black text-neo-ink mb-2">Team Name</label>
            <input
              type="text"
              required
              placeholder="e.g. CyberVanguard"
              value={teamName}
              onChange={(e) => setTeamName(e.target.value)}
              className={inputClass}
            />
          </div>

          <div className="pt-6 flex justify-end gap-4">
            <NeoButton type="button" onClick={() => setIsCreateOpen(false)} color="bg-white" textColor="text-neo-ink">
              Cancel
            </NeoButton>
            <NeoButton type="submit" disabled={submitting} color="bg-neo-ink" textColor="text-white">
              {submitting ? 'Creating...' : 'Create Team'}
            </NeoButton>
          </div>
        </form>
      </Modal>

      {/* Modal: Join Team */}
      <Modal
        isOpen={isJoinOpen}
        onClose={() => setIsJoinOpen(false)}
        title="Join an Existing Team"
        maxWidth="max-w-xl"
      >
        <form onSubmit={handleJoinTeam} className="space-y-6">
          {modalError && (
            <div className="p-4 rounded-xl bg-neo-pastel-pink border-3 border-neo-ink text-neo-ink font-bold text-center">
              {modalError}
            </div>
          )}

          <div>
            <label className="block font-black text-neo-ink mb-2">Invite Code</label>
            <input
              type="text"
              required
              placeholder="e.g. TEAM-XXXX"
              value={inviteCode}
              onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
              className={`${inputClass} font-mono uppercase`}
            />
            <p className="font-bold text-sm text-neo-ink/60 mt-2">
              Obtain the invite code from your team leader to join their roster.
            </p>
          </div>

          <div className="pt-6 flex justify-end gap-4">
            <NeoButton type="button" onClick={() => setIsJoinOpen(false)} color="bg-white" textColor="text-neo-ink">
              Cancel
            </NeoButton>
            <NeoButton type="submit" disabled={submitting} color="bg-neo-ink" textColor="text-white">
              {submitting ? 'Joining...' : 'Join Team'}
            </NeoButton>
          </div>
        </form>
      </Modal>
    </div>
  );
};
