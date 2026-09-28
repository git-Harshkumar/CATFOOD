import React, { useState } from 'react';
import { Routes, Route, Navigate, useLocation, useNavigate, useParams, Outlet } from 'react-router-dom';
import { ProtectedRoute } from './components/ProtectedRoute';
import { MainLayout } from './layouts/MainLayout';
import { ParticipantLayout } from './layouts/ParticipantLayout';
import { JudgeLayout } from './layouts/JudgeLayout';
import { OrganizerLayout } from './layouts/OrganizerLayout';

// Layout wrapper for public pages to retain light theme and navbar
const PublicLayout = () => (
  <MainLayout>
    <Outlet />
  </MainLayout>
);

// Import Pages
import { AuthPage } from './pages/AuthPage';
import { EventsPage } from './pages/EventsPage';
import { EventDetailPage } from './pages/EventDetailPage';
import { MyActivityPage } from './pages/MyActivityPage';
import { JudgeQueuePage } from './pages/JudgeQueuePage';
import { ScoringPage } from './pages/ScoringPage';
import { LeaderboardPage } from './pages/LeaderboardPage';
import { PublicGalleryPage } from './pages/PublicGalleryPage';
import { CreateEventPage } from './pages/CreateEventPage';
import { OrganizerDashboard } from './pages/OrganizerDashboard';
import { OrganizerEventDashboard } from './pages/OrganizerEventDashboard';
import { SubmitProjectModal } from './pages/SubmitProjectModal';

// Simple placeholder component for missing views to prevent crashing
const Placeholder = ({ name }) => (
  <div className="flex flex-col items-center justify-center p-12 bg-neo-pastel-blue rounded-neo border-3 border-neo-ink neo-shadow text-neo-ink m-8">
    <h2 className="text-3xl font-black mb-2 uppercase tracking-tight">{name}</h2>
    <p className="text-neo-ink/70 font-bold">This view is currently under construction.</p>
  </div>
);

const NotFound = () => (
  <div className="flex flex-col items-center justify-center min-h-screen bg-neo-bg text-neo-ink">
    <div className="bg-neo-pastel-pink border-3 border-neo-ink rounded-neo p-16 flex flex-col items-center text-center neo-shadow">
      <h1 className="text-8xl font-black mb-4 tracking-tighter">404</h1>
      <h2 className="text-3xl font-bold mb-4 uppercase">Page Not Found</h2>
      <p className="text-neo-ink/80 font-semibold mb-8 text-lg">The route you are looking for doesn't exist.</p>
      <a href="/" className="px-8 py-4 bg-neo-pastel-green border-3 border-neo-ink rounded-full font-black text-xl hover:neo-active neo-shadow transition-transform">Go Home</a>
    </div>
  </div>
);

// Wrappers
function EventsWrapper() {
  const navigate = useNavigate();
  return <EventsPage 
    onSelectEvent={(id) => navigate(`/events/${id}`)}
    onOpenCreateEvent={() => navigate('/organizer/events/new')}
  />;
}

function EventDetailWrapper({ handleOpenSubmit }) {
  const { id } = useParams();
  const navigate = useNavigate();
  return <EventDetailPage
    eventId={id}
    onBack={() => navigate('/events')}
    onOpenSubmit={handleOpenSubmit}
    onOpenScore={(evId, subId) => {
      if (subId) navigate(`/judge/submissions/${subId}/score`);
      else navigate('/judge/queue');
    }}
    onViewLeaderboard={(evId) => navigate(`/organizer/events/${evId}/leaderboard`)}
    onOpenCreateTeam={(fromEventId) => navigate(`/teams/my?create=${fromEventId || ''}`)}
    onOpenJoinTeam={(fromEventId) => navigate(`/teams/my?join=${fromEventId || ''}`)}
    onViewGallery={(evId) => navigate(`/events/${evId}/gallery`)}
  />;
}

function PublicGalleryWrapper() {
  const { eventId } = useParams();
  const navigate = useNavigate();
  return <PublicGalleryPage
    eventId={eventId}
    onBack={() => navigate(`/events/${eventId}`)}
  />;
}

function LeaderboardWrapper() {
  const { id } = useParams();
  const navigate = useNavigate();
  return <LeaderboardPage
    eventId={id}
    onBack={() => navigate(`/events/${id}`)}
  />;
}

function MyActivityWrapper({ handleOpenSubmit }) {
  const navigate = useNavigate();
  const location = useLocation();
  const params = new URLSearchParams(location.search);
  const createId = params.get('create');
  const joinId = params.get('join');
  
  return <MyActivityPage
    onOpenSubmit={handleOpenSubmit}
    onSelectEvent={(id) => navigate(`/events/${id}`)}
    initialEventId={createId || joinId || null}
    autoOpenCreate={!!createId}
    autoOpenJoin={!!joinId}
    onClearContext={() => navigate('/teams/my', { replace: true })}
  />;
}

function JudgeQueueWrapper() {
  const navigate = useNavigate();
  return <JudgeQueuePage
    onOpenScore={(evId, subId) => navigate(`/judge/submissions/${subId}/score`)}
  />;
}

function ScoringWrapper() {
  const { submissionId } = useParams();
  const navigate = useNavigate();
  
  const handleBack = () => {
    navigate('/judge/queue');
  };

  return <ScoringPage
    eventId={null}
    submissionId={submissionId}
    onBack={handleBack}
    onSuccess={handleBack}
  />;
}

export const AppRoutes = () => {
  const [submitModalState, setSubmitModalState] = useState({
    isOpen: false,
    teamId: null,
    existingSubmission: null,
  });

  const handleOpenSubmit = (teamId, existingSubmission) => {
    setSubmitModalState({
      isOpen: true,
      teamId,
      existingSubmission,
    });
  };

  return (
    <>
      <Routes>
        {/* Public & Auth Routes wrapped in Light Theme Layout */}
        <Route element={<PublicLayout />}>
          {/* 1. Auth Flow (Public) */}
          <Route path="/login" element={<AuthPage onSuccess={() => window.location.href = '/events'} />} />
          <Route path="/register" element={<AuthPage onSuccess={() => window.location.href = '/events'} />} />
          <Route path="/auth" element={<Navigate to="/login" replace />} />
          
          {/* 2. Public / Guest Flow */}
          <Route path="/" element={<Navigate to="/events" replace />} />
          <Route path="/events" element={<EventsWrapper />} />
          <Route path="/events/:id" element={<EventDetailWrapper handleOpenSubmit={handleOpenSubmit} />} />
          <Route path="/gallery" element={<Placeholder name="Global Gallery" />} />
          <Route path="/events/:eventId/gallery" element={<PublicGalleryWrapper />} />
          <Route path="/submissions/:id" element={<Placeholder name="Submission Detail (Public)" />} />
          <Route path="/certificates/verify/:id" element={<Placeholder name="Verify Certificate" />} />
        </Route>

        {/* Protected Standalone Pages (with Navbar) */}
        <Route element={<ProtectedRoute allowedRoles={[]} />}>
          <Route element={<PublicLayout />}>
            <Route path="/organizer/events/new" element={<CreateEventPage />} />
          </Route>
        </Route>
        {/* 3. Participant Flow */}
        <Route element={<ProtectedRoute allowedRoles={[]} />}>
          <Route element={<ParticipantLayout />}>
            <Route path="/teams/new" element={<Placeholder name="Create Team" />} />
            <Route path="/teams/join" element={<Placeholder name="Join Team (Code)" />} />
            <Route path="/teams/join/:token" element={<Placeholder name="Join Team (Invite Link)" />} />
            <Route path="/teams/my" element={<MyActivityWrapper handleOpenSubmit={handleOpenSubmit} />} />
            <Route path="/teams/:id" element={<Placeholder name="Team Detail" />} />
            <Route path="/teams/:id/submit" element={<Placeholder name="Submit Project" />} />
            <Route path="/certificates/mine" element={<Placeholder name="My Certificates" />} />
          </Route>
        </Route>

        {/* 4. Judge Flow */}
        <Route element={<ProtectedRoute allowedRoles={[]} />}>
          <Route element={<JudgeLayout />}>
            <Route path="/judge/queue" element={<JudgeQueueWrapper />} />
            <Route path="/judge/:eventId/queue" element={<Placeholder name="Judge Event Queue" />} />
            <Route path="/judge/submissions/:submissionId/score" element={<ScoringWrapper />} />
            <Route path="/judge/:eventId/pairwise" element={<Placeholder name="Pairwise Comparison" />} />
            <Route path="/judge/status" element={<Placeholder name="Judge Availability Status" />} />
          </Route>
        </Route>

        {/* 5. Organizer Event Management Flow */}
        <Route element={<ProtectedRoute allowedRoles={[]} />}>
          <Route element={<OrganizerLayout />}>
            <Route path="/organizer/dashboard" element={<Navigate to="/organizer/events" replace />} />
            <Route path="/organizer/events" element={<OrganizerDashboard />} />
            <Route path="/organizer/events/:id/dashboard" element={<OrganizerEventDashboard />} />
            <Route path="/organizer/events/:id/edit" element={<OrganizerEventDashboard />} />
            <Route path="/organizer/events/:id/judges" element={<OrganizerEventDashboard />} />
            <Route path="/organizer/events/:id/leaderboard" element={<OrganizerEventDashboard />} />
            <Route path="/organizer/events/:id/leaderboard-view" element={<LeaderboardWrapper />} />
          </Route>
        </Route>

        {/* Catch-all 404 */}
        <Route path="*" element={<NotFound />} />
      </Routes>

      {/* Global Modals */}

      <SubmitProjectModal
        isOpen={submitModalState.isOpen}
        onClose={() => setSubmitModalState({ isOpen: false, teamId: null, existingSubmission: null })}
        teamId={submitModalState.teamId}
        existingSubmission={submitModalState.existingSubmission}
        onSuccess={() => {
          // could reload or trigger refresh event
        }}
      />
    </>
  );
};
