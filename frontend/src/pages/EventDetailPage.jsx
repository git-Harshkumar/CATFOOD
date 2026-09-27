import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { CountdownTimer } from '../components/CountdownTimer';
import { Badge } from '../components/Badge';
import { getStatusBadge, formatDate } from '../utils/formatters';
import {
  Trophy,
  Calendar,
  Users,
  FileText,
  Award,
  ExternalLink,
  Github,
  Globe,
  PlusCircle,
  UserCheck,
  CheckCircle,
  Share2,
  Lock,
} from 'lucide-react';

export const EventDetailPage = ({
  eventId,
  onBack,
  onOpenSubmit,
  onOpenScore,
  onViewLeaderboard,
  onOpenCreateTeam,
}) => {
  const { user, isOrganizer, isJudge, isParticipant } = useAuth();
  const [event, setEvent] = useState(null);
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview'); // overview, criteria, submissions, teams
  const [judgeEmail, setJudgeEmail] = useState('');
  const [assigningJudge, setAssigningJudge] = useState(false);
  const [message, setMessage] = useState(null);

  useEffect(() => {
    fetchEventDetails();
  }, [eventId]);

  const fetchEventDetails = async () => {
    try {
      setLoading(true);
      const res = await api.getEventById(eventId);
      if (res?.data) {
        setEvent(res.data);
      }
      // Load submissions if user is authenticated
      if (user) {
        try {
          const subsRes = await api.getSubmissionsByEvent(eventId);
          if (subsRes?.data) setSubmissions(subsRes.data);
        } catch (e) {
          console.warn('Submissions fetch:', e.message);
        }
      }
    } catch (err) {
      console.error('Failed to load event details:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAssignJudge = async (e) => {
    e.preventDefault();
    if (!judgeEmail) return;
    setAssigningJudge(true);
    setMessage(null);
    try {
      await api.assignJudge(eventId, judgeEmail);
      setMessage({ type: 'success', text: `Judge ${judgeEmail} successfully assigned!` });
      setJudgeEmail('');
      await fetchEventDetails();
    } catch (err) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setAssigningJudge(false);
    }
  };

  const handleToggleLeaderboard = async () => {
    if (!event) return;
    try {
      const nextState = !event.isLeaderboardPublished;
      await api.publishLeaderboard(event.id, nextState);
      await fetchEventDetails();
      setMessage({
        type: 'success',
        text: `Leaderboard is now ${nextState ? 'PUBLISHED to all participants' : 'HIDDEN/UNPUBLISHED'}!`,
      });
    } catch (err) {
      setMessage({ type: 'error', text: err.message });
    }
  };

  if (loading || !event) {
    return (
      <div className="py-20 text-center text-slate-400">Loading hackathon details...</div>
    );
  }

  const isDeadlinePassed = new Date(event.deadline) < new Date();
  const statusBadge = getStatusBadge(event.status);

  // Check if current participant has a team in this event
  const userTeam = event.teams?.find((t) =>
    t.members?.some((m) => m.userId === user?.id) || t.leaderId === user?.id
  );

  return (
    <div className="space-y-8 pb-16">
      {/* Top Bar Navigation */}
      <div className="flex items-center justify-between">
        <button
          onClick={onBack}
          className="text-xs font-semibold text-slate-400 hover:text-white flex items-center gap-1 transition-colors"
        >
          ← Back to Hackathons
        </button>

        <div className="flex items-center gap-2">
          {event.isLeaderboardPublished || isOrganizer || isJudge ? (
            <button
              onClick={() => onViewLeaderboard(event.id)}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 transition-all"
            >
              <Trophy className="w-4 h-4 text-amber-400" />
              <span>{event.isLeaderboardPublished ? 'View Leaderboard' : 'Leaderboard Preview'}</span>
            </button>
          ) : (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-mono bg-slate-800 text-slate-400 border border-slate-700">
              <Lock className="w-3.5 h-3.5" />
              <span>Leaderboard Unpublished</span>
            </div>
          )}
        </div>
      </div>

      {message && (
        <div
          className={`p-4 rounded-xl text-xs font-medium border ${
            message.type === 'success'
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
              : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
          }`}
        >
          {message.text}
        </div>
      )}

      {/* Hero Header Card */}
      <div className="glass-panel rounded-3xl p-6 sm:p-10 border border-slate-800 space-y-6 relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
          <div className="space-y-3 max-w-3xl">
            <div className="flex items-center gap-3 flex-wrap">
              <span
                className={`text-xs font-mono font-medium px-2.5 py-1 rounded-full border ${statusBadge.bg} ${statusBadge.text} ${statusBadge.border}`}
              >
                {statusBadge.label}
              </span>
              <span className="text-xs text-slate-400">
                Organized by: <strong className="text-slate-200">{event.organizer?.name}</strong>
              </span>
            </div>
            <h1 className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight">
              {event.title}
            </h1>
            {event.tagline && (
              <p className="text-sm font-medium text-indigo-300">{event.tagline}</p>
            )}
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">{event.description}</p>
          </div>

          <div className="flex flex-col items-start md:items-end gap-3 min-w-max">
            <CountdownTimer deadline={event.deadline} />
            <div className="text-right text-[11px] text-slate-400 space-y-0.5">
              <div>Deadline: {formatDate(event.deadline)}</div>
              <div>Team Size: {event.minTeamSize} - {event.maxTeamSize} members</div>
            </div>
          </div>
        </div>

        {/* Action Buttons Row */}
        <div className="pt-6 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            {userTeam ? (
              <button
                onClick={() => onOpenSubmit(userTeam.id, userTeam.submission)}
                disabled={isDeadlinePassed}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white shadow-lg shadow-indigo-600/25 transition-all"
              >
                <FileText className="w-4 h-4" />
                <span>
                  {userTeam.submission
                    ? isDeadlinePassed
                      ? 'View Submission (Locked)'
                      : 'Edit Team Submission'
                    : 'Submit Project'}
                </span>
              </button>
            ) : isParticipant ? (
              <button
                onClick={onOpenCreateTeam}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/25 transition-all"
              >
                <Users className="w-4 h-4" />
                <span>Create or Join Team</span>
              </button>
            ) : null}

            {isJudge && (
              <button
                onClick={() => onOpenScore(eventId)}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-600/25 transition-all"
              >
                <Award className="w-4 h-4" />
                <span>Evaluate Submissions</span>
              </button>
            )}
          </div>

          {/* Organizer Controls */}
          {isOrganizer && event.organizerId === user?.id && (
            <div className="flex items-center gap-2">
              <button
                onClick={handleToggleLeaderboard}
                className={`px-3.5 py-2 rounded-xl text-xs font-semibold border transition-all ${
                  event.isLeaderboardPublished
                    ? 'bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border-rose-500/30'
                    : 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                }`}
              >
                {event.isLeaderboardPublished ? 'Unpublish Leaderboard' : 'Publish Leaderboard to Public'}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-800 space-x-8 text-sm">
        {[
          { key: 'overview', label: 'Rules & Guidelines' },
          { key: 'criteria', label: `Judging Rubric (${event.criteria?.length || 0})` },
          { key: 'submissions', label: `Projects (${submissions?.length || 0})` },
          { key: 'teams', label: `Teams (${event.teams?.length || 0})` },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`pb-3 font-semibold text-xs uppercase tracking-wider transition-colors border-b-2 ${
              activeTab === tab.key
                ? 'border-indigo-500 text-indigo-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab: Overview */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-2 glass-panel rounded-2xl p-6 border border-slate-800 space-y-4">
            <h3 className="text-base font-bold text-white">Hackathon Rules</h3>
            <p className="text-xs text-slate-300 whitespace-pre-line leading-relaxed">
              {event.rules || 'Standard hackathon guidelines apply. All code must be submitted before deadline.'}
            </p>
          </div>

          <div className="glass-panel rounded-2xl p-6 border border-slate-800 space-y-4">
            <h3 className="text-base font-bold text-white">Event Judges</h3>
            {event.judges && event.judges.length > 0 ? (
              <div className="space-y-2">
                {event.judges.map((j) => (
                  <div
                    key={j.id}
                    className="p-2.5 rounded-xl bg-slate-900/60 border border-slate-800 text-xs flex items-center justify-between"
                  >
                    <span className="font-semibold text-slate-200">{j.judge.name}</span>
                    <span className="text-[10px] font-mono text-emerald-400">Assigned</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-500">No judges assigned yet.</p>
            )}

            {isOrganizer && event.organizerId === user?.id && (
              <form onSubmit={handleAssignJudge} className="pt-2 space-y-2">
                <input
                  type="email"
                  placeholder="judge@hack.com"
                  value={judgeEmail}
                  onChange={(e) => setJudgeEmail(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs bg-slate-950 border border-slate-800 rounded-lg text-white placeholder-slate-500"
                />
                <button
                  type="submit"
                  disabled={assigningJudge}
                  className="w-full py-1.5 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors"
                >
                  {assigningJudge ? 'Assigning...' : '+ Assign Judge Email'}
                </button>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Tab: Criteria */}
      {activeTab === 'criteria' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {event.criteria?.map((c) => (
            <div
              key={c.id}
              className="glass-card rounded-2xl p-5 border border-slate-800 space-y-3"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-400 font-mono font-bold">
                  {c.weight}x Weight
                </span>
                <span className="text-xs font-mono text-slate-400">Max: {c.maxScore} pts</span>
              </div>
              <h4 className="font-bold text-white text-sm">{c.name}</h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                {c.description || 'Evaluation based on overall quality and execution.'}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* Tab: Submissions */}
      {activeTab === 'submissions' && (
        <div className="space-y-4">
          {submissions.length === 0 ? (
            <div className="text-center py-12 text-slate-500 text-xs">
              No submissions recorded yet for this hackathon.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {submissions.map((sub) => (
                <div
                  key={sub.id}
                  className="glass-card rounded-2xl p-5 border border-slate-800 space-y-4 flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <span className="text-xs font-bold text-indigo-400">{sub.team?.name}</span>
                      <span className="text-[10px] text-slate-500">
                        {formatDate(sub.submittedAt)}
                      </span>
                    </div>
                    <h4 className="font-bold text-white text-base">{sub.title}</h4>
                    {sub.tagline && (
                      <p className="text-xs text-indigo-300 mt-0.5 font-medium">{sub.tagline}</p>
                    )}
                    <p className="text-xs text-slate-400 mt-2 line-clamp-3">{sub.description}</p>
                  </div>

                  <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {sub.repoUrl && (
                        <a
                          href={sub.repoUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="text-slate-400 hover:text-white flex items-center gap-1 text-xs"
                        >
                          <Github className="w-3.5 h-3.5" />
                          <span>Code</span>
                        </a>
                      )}
                      {sub.demoUrl && (
                        <a
                          href={sub.demoUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="text-slate-400 hover:text-white flex items-center gap-1 text-xs"
                        >
                          <Globe className="w-3.5 h-3.5" />
                          <span>Demo</span>
                        </a>
                      )}
                    </div>

                    {isJudge && (
                      <button
                        onClick={() => onOpenScore(eventId, sub.id)}
                        className="px-3 py-1 rounded-lg text-xs font-semibold bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 transition-colors"
                      >
                        Score Project
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab: Teams */}
      {activeTab === 'teams' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {event.teams?.map((t) => (
            <div
              key={t.id}
              className="glass-card rounded-2xl p-5 border border-slate-800 space-y-3"
            >
              <div className="flex items-center justify-between">
                <h4 className="font-bold text-white text-sm">{t.name}</h4>
                <span className="text-[10px] font-mono text-slate-400">
                  {t.members?.length || 1} / {event.maxTeamSize} Members
                </span>
              </div>
              <div className="space-y-1">
                <span className="text-[10px] uppercase font-bold text-slate-500">Roster:</span>
                <div className="text-xs text-slate-300 space-y-0.5">
                  {t.members?.map((m) => (
                    <div key={m.user.id} className="flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
                      <span>{m.user.name}</span>
                      {m.user.id === t.leaderId && (
                        <span className="text-[9px] px-1 rounded bg-indigo-500/20 text-indigo-300">
                          Leader
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
