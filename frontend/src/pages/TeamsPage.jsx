import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { Modal } from '../components/Modal';
import { CountdownTimer } from '../components/CountdownTimer';
import { Users, PlusCircle, UserPlus, Copy, Check, FileText, ArrowRight, Shield } from 'lucide-react';

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

  const copyToClipboard = (code) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
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

  return (
    <div className="space-y-8 pb-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Team Workspace & Roster
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Manage your hackathon teams, collaborate with teammates, and submit deliverables.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsJoinOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors"
          >
            <UserPlus className="w-4 h-4 text-slate-400" />
            <span>Join Team</span>
          </button>

          <button
            onClick={() => setIsCreateOpen(true)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/30 transition-all"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Create Team</span>
          </button>
        </div>
      </div>

      {/* Teams Grid */}
      {loading ? (
        <div className="text-center py-16 text-slate-500 text-sm">Loading your teams...</div>
      ) : teams.length === 0 ? (
        <div className="text-center py-16 bg-slate-900/40 border border-slate-800 rounded-2xl p-8 space-y-3">
          <Users className="w-12 h-12 text-slate-600 mx-auto" />
          <h3 className="text-base font-semibold text-slate-300">You are not in any teams yet</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Create a new team for an active hackathon or join an existing team using an invite code.
          </p>
          <div className="pt-2 flex justify-center gap-2">
            <button
              onClick={() => setIsCreateOpen(true)}
              className="px-4 py-1.5 rounded-lg text-xs font-semibold bg-indigo-600 text-white hover:bg-indigo-500"
            >
              Create Team
            </button>
            <button
              onClick={() => setIsJoinOpen(true)}
              className="px-4 py-1.5 rounded-lg text-xs font-semibold bg-slate-800 text-slate-300 hover:bg-slate-700"
            >
              Join with Code
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {teams.map((tm) => {
            const isDeadlinePassed = new Date(tm.event.deadline) < new Date();
            const isLeader = tm.leaderId === user?.id;

            return (
              <div
                key={tm.id}
                className="glass-card rounded-2xl p-6 border border-slate-800 space-y-5 flex flex-col justify-between"
              >
                <div className="space-y-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <span className="text-[10px] uppercase font-bold text-indigo-400">
                        {tm.event.title}
                      </span>
                      <h3 className="text-xl font-bold text-white tracking-tight">{tm.name}</h3>
                    </div>
                    <CountdownTimer deadline={tm.event.deadline} />
                  </div>

                  {/* Invite Code Box */}
                  <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] uppercase tracking-wider text-slate-500 block">
                        Invite Code for Teammates
                      </span>
                      <span className="font-mono text-sm font-bold text-indigo-300 tracking-wider">
                        {tm.inviteCode}
                      </span>
                    </div>
                    <button
                      onClick={() => copyToClipboard(tm.inviteCode)}
                      className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
                      title="Copy invite code"
                    >
                      {copiedCode === tm.inviteCode ? (
                        <Check className="w-4 h-4 text-emerald-400" />
                      ) : (
                        <Copy className="w-4 h-4" />
                      )}
                    </button>
                  </div>

                  {/* Team Members List */}
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-500 block mb-2">
                      Roster ({tm.members.length} members)
                    </span>
                    <div className="space-y-1.5">
                      {tm.members.map((m) => (
                        <div
                          key={m.user.id}
                          className="flex items-center justify-between text-xs px-2.5 py-1.5 rounded-lg bg-slate-900/60 border border-slate-800/80"
                        >
                          <span className="text-slate-200">{m.user.name}</span>
                          <span className="text-[10px] font-mono text-slate-400">
                            {m.user.id === tm.leaderId ? 'Leader' : 'Member'}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Submission Status & Action */}
                <div className="pt-4 border-t border-slate-800/80 flex items-center justify-between">
                  <div>
                    {tm.submission ? (
                      <span className="inline-flex items-center gap-1 text-xs text-emerald-400 font-semibold">
                        <Check className="w-3.5 h-3.5" />
                        <span>Submitted: {tm.submission.title}</span>
                      </span>
                    ) : (
                      <span className="text-xs text-amber-400 font-medium">No project submitted yet</span>
                    )}
                  </div>

                  <button
                    onClick={() => onOpenSubmit(tm.id, tm.submission)}
                    disabled={isDeadlinePassed}
                    className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white transition-all shadow-md shadow-indigo-600/20"
                  >
                    <FileText className="w-3.5 h-3.5" />
                    <span>
                      {tm.submission
                        ? isDeadlinePassed
                          ? 'View (Locked)'
                          : 'Edit Submission'
                        : 'Submit Project'}
                    </span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal: Create Team */}
      <Modal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        title="Form a New Hackathon Team"
      >
        <form onSubmit={handleCreateTeam} className="space-y-4">
          {modalError && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs">
              {modalError}
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">Select Hackathon</label>
            <select
              value={selectedEventId}
              onChange={(e) => setSelectedEventId(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-indigo-500"
            >
              {events.map((ev) => (
                <option key={ev.id} value={ev.id}>
                  {ev.title} (Max {ev.maxTeamSize} members)
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">Team Name</label>
            <input
              type="text"
              required
              placeholder="e.g. CyberVanguard"
              value={teamName}
              onChange={(e) => setTeamName(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-slate-950 border border-slate-800 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div className="pt-2 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setIsCreateOpen(false)}
              className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-800 text-slate-300 hover:bg-slate-700"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 rounded-xl text-xs font-semibold bg-indigo-600 text-white hover:bg-indigo-500 disabled:opacity-50 shadow-md shadow-indigo-600/30"
            >
              {submitting ? 'Creating...' : 'Create Team & Generate Invite Code'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal: Join Team */}
      <Modal
        isOpen={isJoinOpen}
        onClose={() => setIsJoinOpen(false)}
        title="Join an Existing Team"
      >
        <form onSubmit={handleJoinTeam} className="space-y-4">
          {modalError && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs">
              {modalError}
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">Invite Code</label>
            <input
              type="text"
              required
              placeholder="e.g. TEAM-XXXX"
              value={inviteCode}
              onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
              className="w-full px-3 py-2 text-sm font-mono uppercase bg-slate-950 border border-slate-800 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
            />
            <p className="text-[11px] text-slate-500 mt-1">
              Obtain the invite code from your team leader to join their roster.
            </p>
          </div>

          <div className="pt-2 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setIsJoinOpen(false)}
              className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-800 text-slate-300 hover:bg-slate-700"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 rounded-xl text-xs font-semibold bg-indigo-600 text-white hover:bg-indigo-500 disabled:opacity-50 shadow-md shadow-indigo-600/30"
            >
              {submitting ? 'Joining...' : 'Join Team'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
