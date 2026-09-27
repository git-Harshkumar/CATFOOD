import React, { useState } from 'react';
import { useAuth } from './context/AuthContext';
import { MainLayout } from './layouts/MainLayout';
import { AuthPage } from './pages/AuthPage';
import { EventsPage } from './pages/EventsPage';
import { EventDetailPage } from './pages/EventDetailPage';
import { TeamsPage } from './pages/TeamsPage';
import { JudgeQueuePage } from './pages/JudgeQueuePage';
import { ScoringPage } from './pages/ScoringPage';
import { LeaderboardPage } from './pages/LeaderboardPage';
import { CreateEventModal } from './pages/CreateEventModal';
import { SubmitProjectModal } from './pages/SubmitProjectModal';
import { PublicGalleryPage } from './pages/PublicGalleryPage';

export function App() {
  const { user, loading } = useAuth();
  const [view, setView] = useState('events');
  const [selectedEventId, setSelectedEventId] = useState(null);
  const [selectedSubmissionId, setSelectedSubmissionId] = useState(null);

  // Modals
  const [isCreateEventOpen, setIsCreateEventOpen] = useState(false);
  const [submitModalState, setSubmitModalState] = useState({
    isOpen: false,
    teamId: null,
    existingSubmission: null,
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-neo-bg flex items-center justify-center font-black text-2xl text-neo-ink/50">
        Initializing JuryFlow Platform...
      </div>
    );
  }

  // Handlers
  const handleSelectEvent = (eventId) => {
    setSelectedEventId(eventId);
    setView('event-detail');
  };

  const handleOpenScore = (eventId, submissionId) => {
    setSelectedEventId(eventId);
    setSelectedSubmissionId(submissionId);
    setView('scoring');
  };

  const handleViewLeaderboard = (eventId) => {
    setSelectedEventId(eventId);
    setView('leaderboard');
  };

  const handleOpenSubmit = (teamId, existingSubmission) => {
    setSubmitModalState({
      isOpen: true,
      teamId,
      existingSubmission,
    });
  };

  return (
    <MainLayout currentView={view} setView={setView}>
      {view === 'auth' && <AuthPage onSuccess={() => setView('events')} />}

      {view === 'events' && (
        <EventsPage
          onSelectEvent={handleSelectEvent}
          onOpenCreateEvent={() => setIsCreateEventOpen(true)}
        />
      )}

      {view === 'event-detail' && selectedEventId && (
        <EventDetailPage
          eventId={selectedEventId}
          onBack={() => setView('events')}
          onOpenSubmit={handleOpenSubmit}
          onOpenScore={(evId, subId) => {
            if (subId) {
              handleOpenScore(evId, subId);
            } else {
              setView('judging');
            }
          }}
          onViewLeaderboard={handleViewLeaderboard}
          onOpenCreateTeam={() => setView('teams')}
          onViewGallery={() => setView('gallery')}
        />
      )}

      {view === 'gallery' && selectedEventId && (
        <PublicGalleryPage
          eventId={selectedEventId}
          onBack={() => setView('event-detail')}
        />
      )}

      {view === 'teams' && (
        <TeamsPage
          onOpenSubmit={handleOpenSubmit}
          onSelectEvent={handleSelectEvent}
        />
      )}

      {view === 'judging' && (
        <JudgeQueuePage
          onOpenScore={(evId, subId) => handleOpenScore(evId, subId)}
        />
      )}

      {view === 'scoring' && selectedSubmissionId && (
        <ScoringPage
          eventId={selectedEventId}
          submissionId={selectedSubmissionId}
          onBack={() => {
            if (selectedEventId) {
              setView('event-detail');
            } else {
              setView('judging');
            }
          }}
          onSuccess={() => {
            if (selectedEventId) {
              setView('event-detail');
            } else {
              setView('judging');
            }
          }}
        />
      )}

      {view === 'leaderboard' && selectedEventId && (
        <LeaderboardPage
          eventId={selectedEventId}
          onBack={() => setView('event-detail')}
        />
      )}

      {/* Global Modals */}
      <CreateEventModal
        isOpen={isCreateEventOpen}
        onClose={() => setIsCreateEventOpen(false)}
        onSuccess={() => setView('events')}
      />

      <SubmitProjectModal
        isOpen={submitModalState.isOpen}
        onClose={() => setSubmitModalState({ isOpen: false, teamId: null, existingSubmission: null })}
        teamId={submitModalState.teamId}
        existingSubmission={submitModalState.existingSubmission}
        onSuccess={() => {
          if (view === 'event-detail') {
            // trigger refresh by resetting selectedEventId
            setSelectedEventId((id) => id);
          }
        }}
      />
    </MainLayout>
  );
}

export default App;
