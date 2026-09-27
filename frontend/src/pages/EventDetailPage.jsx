import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { CountdownTimer } from '../components/CountdownTimer';
import NeoCard from '../components/neo/NeoCard';
import NeoButton from '../components/neo/NeoButton';
import PillButton from '../components/neo/PillButton';
import AvatarStack from '../components/neo/AvatarStack';
import NeoToggle from '../components/neo/NeoToggle';
import { EventImage } from '../components/EventImage';
import { CreateTeamModal } from './CreateTeamModal';
import { JoinTeamModal } from './JoinTeamModal';
import { getStatusBadge, formatDate } from '../utils/formatters';
import { Trophy, FileText, Award, Github, Globe, Users, Lock, ArrowLeft, PlusCircle } from 'lucide-react';
import JudgingProgressSection from '../components/JudgingProgressSection';

export const EventDetailPage = ({
  eventId,
  onBack,
  onOpenSubmit,
  onOpenScore,
  onViewLeaderboard,
  onViewGallery,
}) => {
  const { user, isOrganizer, isJudge, isParticipant } = useAuth();
  const [event, setEvent] = useState(null);
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview'); // overview, criteria, submissions, teams
  const [judgeEmail, setJudgeEmail] = useState('');
  const [assigningJudge, setAssigningJudge] = useState(false);
  const [message, setMessage] = useState(null);

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isJoinOpen, setIsJoinOpen] = useState(false);

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
        text: `Leaderboard is now ${nextState ? 'PUBLISHED' : 'HIDDEN'}!`,
      });
    } catch (err) {
      setMessage({ type: 'error', text: err.message });
    }
  };

  if (loading || !event) {
    return <div className="py-20 text-center font-bold text-2xl text-neo-ink/50">Loading hackathon details...</div>;
  }

  const isDeadlinePassed = new Date(event.deadline) < new Date();
  const statusBadge = getStatusBadge(event.status);
  const userTeam = event.teams?.find((t) =>
    t.members?.some((m) => m.userId === user?.id) || t.leaderId === user?.id
  );

  return (
    <div className="max-w-7xl mx-auto px-4 space-y-10 pb-16 pt-6">
      {/* Top Bar Navigation */}
      <div className="flex items-center justify-between">
        <button
          onClick={onBack}
          className="flex items-center gap-2 font-bold text-neo-ink hover:underline decoration-3 underline-offset-4"
        >
          <ArrowLeft className="w-5 h-5" /> Back to Hackathons
        </button>

        <div className="flex items-center gap-4">
          {event.isLeaderboardPublished || isOrganizer || isJudge ? (
            <NeoButton onClick={() => onViewLeaderboard(event.id)} color="bg-neo-pastel-yellow" textColor="text-neo-ink">
              <Trophy className="w-5 h-5 mr-2" />
              {event.isLeaderboardPublished ? 'View Leaderboard' : 'Leaderboard Preview'}
            </NeoButton>
          ) : (
            <div className="flex items-center gap-2 px-5 py-2.5 rounded-full border-3 border-neo-ink bg-white font-bold text-neo-ink">
              <Lock className="w-4 h-4" /> Leaderboard Unpublished
            </div>
          )}
          
          <NeoButton onClick={() => onViewGallery()} color="bg-neo-pastel-purple" textColor="text-neo-ink">
             Public Gallery
          </NeoButton>
        </div>
      </div>

      {message && (
        <NeoCard color={message.type === 'success' ? 'bg-neo-pastel-green' : 'bg-neo-pastel-pink'} className="py-4 font-bold text-center">
          {message.text}
        </NeoCard>
      )}

      {/* Hero Header Card */}
      <NeoCard color="bg-neo-pastel-purple" className="flex flex-col md:flex-row md:items-start justify-between gap-8">
        <div className="space-y-6 max-w-3xl">
          <div className="flex items-center gap-4 flex-wrap">
            <span className={`px-4 py-1.5 rounded-full border-3 border-neo-ink font-black text-xs uppercase bg-white text-neo-ink`}>
              {statusBadge.label}
            </span>
            <span className="font-bold text-neo-ink/70">
              Organized by: <strong className="text-neo-ink">{event.organizer?.name}</strong>
            </span>
          </div>
          
          <h1 className="text-4xl md:text-6xl font-black text-neo-ink tracking-tight leading-tight">
            {event.title}
          </h1>
          
          {event.tagline && (
            <p className="text-xl md:text-2xl font-bold text-neo-ink/80">{event.tagline}</p>
          )}
          
          <p className="text-lg font-medium text-neo-ink/80 leading-relaxed max-w-4xl">
            {event.description}
          </p>
        </div>

        <div className="flex flex-col items-start md:items-end gap-4 min-w-max">
          {event.imageUrl && (
            <EventImage
              src={event.imageUrl}
              alt={event.title}
              className="w-52 h-36"
              title={event.title}
            />
          )}
          <div className="bg-white border-3 border-neo-ink rounded-2xl p-4 text-center neo-shadow">
            <CountdownTimer deadline={event.deadline} />
          </div>
          <div className="text-right font-bold text-sm text-neo-ink/70">
            <div>Deadline: {formatDate(event.deadline)}</div>
            <div>Team Size: {event.minTeamSize} - {event.maxTeamSize} members</div>
          </div>

          {/* Action Buttons inside Hero */}
          {userTeam ? (
            <NeoButton 
              onClick={() => onOpenSubmit(userTeam.id, userTeam.submission)} 
              disabled={isDeadlinePassed}
              color="bg-neo-ink" 
              textColor="text-white"
              className="w-full justify-center mt-2"
            >
              <FileText className="w-5 h-5 mr-2" />
              {userTeam.submission ? (isDeadlinePassed ? 'View Submission (Locked)' : 'Edit Submission') : 'Submit Project'}
            </NeoButton>
          ) : isParticipant ? (
            <div className="flex flex-col gap-3 w-full mt-2">
              <NeoButton onClick={() => setIsCreateOpen(true)} color="bg-neo-ink" textColor="text-white" className="w-full justify-center">
                <PlusCircle className="w-5 h-5 mr-2" /> Register Team
              </NeoButton>
              <NeoButton onClick={() => setIsJoinOpen(true)} color="bg-white" textColor="text-neo-ink" className="w-full justify-center">
                <Users className="w-5 h-5 mr-2" /> Join with Code
              </NeoButton>
            </div>
          ) : null}
        </div>
      </NeoCard>

      {/* Organizer Controls and Evaluator Buttons */}
      <div className="flex flex-wrap items-center justify-between gap-6 border-t-3 border-neo-ink pt-8">
        <div className="flex items-center gap-4">
          {/* Moved submit and register to the hero card above */}

          {isJudge && (
            <NeoButton onClick={() => onOpenScore(eventId)} color="bg-neo-pastel-green" textColor="text-neo-ink">
              <Award className="w-5 h-5 mr-2" /> Evaluate Submissions
            </NeoButton>
          )}
        </div>

        {isOrganizer && event.organizerId === user?.id && (
          <NeoToggle 
            checked={event.isLeaderboardPublished}
            onChange={handleToggleLeaderboard}
            label="Publish Leaderboard"
          />
        )}
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-3 overflow-x-auto py-2 pb-4 scrollbar-hide border-b-3 border-neo-ink">
        {[
          { key: 'overview', label: 'Rules & Guidelines' },
          { key: 'criteria', label: `Judging Rubric (${event.criteria?.length || 0})` },
          { key: 'submissions', label: `Projects (${submissions?.length || 0})` },
          { key: 'teams', label: `Teams (${event.teams?.length || 0})` },
          ...(isOrganizer && event.organizerId === user?.id
            ? [{ key: 'judging', label: '⚖ Judging Progress' }]
            : []),
        ].map((tab) => (
          <PillButton
            key={tab.key}
            label={tab.label}
            active={activeTab === tab.key}
            onClick={() => setActiveTab(tab.key)}
          />
        ))}
      </div>

      {/* Tab: Overview */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <NeoCard className="md:col-span-2 space-y-4">
            <h3 className="text-2xl font-black text-neo-ink">Hackathon Rules</h3>
            <p className="text-lg font-medium text-neo-ink/80 whitespace-pre-line leading-relaxed">
              {event.rules || 'Standard hackathon guidelines apply. All code must be submitted before deadline.'}
            </p>
          </NeoCard>

          <NeoCard color="bg-neo-pastel-orange" className="space-y-6">
            <h3 className="text-2xl font-black text-neo-ink">Event Judges</h3>
            {event.judges && event.judges.length > 0 ? (
              <div className="space-y-3">
                {event.judges.map((j) => (
                  <div key={j.id} className="p-3 rounded-xl bg-white border-3 border-neo-ink flex items-center justify-between neo-shadow">
                    <span className="font-bold text-neo-ink">{j.user?.name || 'Judge'}</span>
                    <span className="text-xs font-black px-2 py-1 bg-neo-pastel-green border-2 border-neo-ink rounded-full uppercase">Assigned</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="font-bold text-neo-ink/70">No judges assigned yet.</p>
            )}

            {isOrganizer && event.organizerId === user?.id && (
              <form onSubmit={handleAssignJudge} className="pt-4 border-t-3 border-neo-ink space-y-3">
                <input
                  type="email"
                  placeholder="judge@hack.com"
                  value={judgeEmail}
                  onChange={(e) => setJudgeEmail(e.target.value)}
                  className="w-full px-4 py-3 font-bold bg-white border-3 border-neo-ink rounded-xl placeholder-neo-ink/40 neo-shadow focus:outline-none focus:neo-active transition-all"
                />
                <NeoButton type="submit" disabled={assigningJudge} color="bg-neo-ink" textColor="text-white" className="w-full">
                  {assigningJudge ? 'Assigning...' : '+ Assign Judge'}
                </NeoButton>
              </form>
            )}
          </NeoCard>
        </div>
      )}

      {/* Tab: Criteria */}
      {activeTab === 'criteria' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {event.criteria?.map((c, i) => (
            <NeoCard key={c.id} color={['bg-white', 'bg-neo-bg'][i%2]} className="space-y-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-black px-3 py-1 rounded-full bg-neo-pastel-yellow border-3 border-neo-ink uppercase">
                  {c.weight}x Weight
                </span>
                <span className="font-black text-neo-ink">Max: {c.maxScore} pts</span>
              </div>
              <h4 className="font-black text-2xl text-neo-ink">{c.name}</h4>
              <p className="font-medium text-neo-ink/80 leading-relaxed">
                {c.description || 'Evaluation based on overall quality and execution.'}
              </p>
            </NeoCard>
          ))}
        </div>
      )}

      {/* Tab: Submissions */}
      {activeTab === 'submissions' && (
        <div className="space-y-6">
          {submissions.length === 0 ? (
            <div className="text-center py-20 font-bold text-xl text-neo-ink/50">
              No submissions recorded yet for this hackathon.
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {submissions.map((sub, i) => (
                <NeoCard key={sub.id} color={['bg-neo-pastel-blue', 'bg-white', 'bg-neo-pastel-purple'][i%3]} className="flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-4 border-b-3 border-neo-ink pb-3">
                      <span className="font-black text-lg bg-white px-3 py-1 border-3 border-neo-ink rounded-full neo-shadow">{sub.team?.name}</span>
                      <span className="font-bold text-sm">{formatDate(sub.submittedAt)}</span>
                    </div>
                    <h4 className="font-black text-3xl text-neo-ink mb-2">{sub.title}</h4>
                    {sub.tagline && (
                      <p className="font-bold text-lg text-neo-ink/80 mb-4">{sub.tagline}</p>
                    )}
                    <p className="font-medium text-neo-ink/80 line-clamp-3">{sub.description}</p>
                  </div>

                  <div className="pt-6 mt-6 border-t-3 border-neo-ink flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {sub.repoUrl && (
                        <a href={sub.repoUrl} target="_blank" rel="noreferrer" className="w-12 h-12 bg-white border-3 border-neo-ink rounded-full flex items-center justify-center hover:neo-active neo-shadow text-neo-ink">
                          <Github className="w-6 h-6" />
                        </a>
                      )}
                      {sub.demoUrl && (
                        <a href={sub.demoUrl} target="_blank" rel="noreferrer" className="w-12 h-12 bg-white border-3 border-neo-ink rounded-full flex items-center justify-center hover:neo-active neo-shadow text-neo-ink">
                          <Globe className="w-6 h-6" />
                        </a>
                      )}
                    </div>

                    {isJudge && (
                      <NeoButton onClick={() => onOpenScore(eventId, sub.id)} color="bg-neo-pastel-green" textColor="text-neo-ink">
                        Score Project
                      </NeoButton>
                    )}
                  </div>
                </NeoCard>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab: Teams */}
      {activeTab === 'teams' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {event.teams?.map((t, i) => (
            <NeoCard key={t.id} color={['bg-white', 'bg-neo-bg'][i%2]} className="space-y-6">
              <div className="flex items-center justify-between">
                <h4 className="font-black text-2xl text-neo-ink">{t.name}</h4>
                <span className="font-black px-3 py-1 bg-white border-3 border-neo-ink rounded-full neo-shadow text-sm">
                  {t.members?.length || 1}/{event.maxTeamSize}
                </span>
              </div>
              
              <div className="space-y-3 pt-4 border-t-3 border-neo-ink">
                <span className="text-xs font-black uppercase tracking-wide text-neo-ink/60">Members</span>
                <AvatarStack members={t.members.map(m => ({ name: m.user.name, ...m }))} max={4} />
              </div>
            </NeoCard>
          ))}
        </div>
      )}

      {/* Tab: Judging Progress (Organizer only) */}
      {activeTab === 'judging' && isOrganizer && event.organizerId === user?.id && (
        <JudgingProgressSection eventId={event.id} />
      )}
      {/* Local Modals */}
      <CreateTeamModal 
        isOpen={isCreateOpen} 
        onClose={() => setIsCreateOpen(false)} 
        initialEventId={event.id}
        onSuccess={() => fetchEventDetails()}
      />
      <JoinTeamModal 
        isOpen={isJoinOpen} 
        onClose={() => setIsJoinOpen(false)} 
        onSuccess={() => fetchEventDetails()}
      />
    </div>
  );
};
