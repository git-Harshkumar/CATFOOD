import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ShieldAlert, ArrowLeft, Home, Trophy, Award, Users } from 'lucide-react';
import NeoButton from '../components/neo/NeoButton';

export const UnauthorizedPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, isOrganizer, isJudge, isParticipant } = useAuth();

  const attemptedPath = location.state?.attemptedPath || '';

  const handleGoHome = () => {
    if (isOrganizer) {
      navigate('/organizer/events');
    } else if (isJudge) {
      navigate('/judge/queue');
    } else if (isParticipant) {
      navigate('/teams/my');
    } else {
      navigate('/events');
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] px-4 py-16">
      <div className="max-w-xl w-full bg-neo-pastel-pink border-4 border-neo-ink rounded-neo p-10 flex flex-col items-center text-center neo-shadow space-y-6">
        <div className="w-20 h-20 rounded-full bg-white border-4 border-neo-ink flex items-center justify-center neo-shadow">
          <ShieldAlert className="w-10 h-10 text-red-600" />
        </div>

        <div>
          <span className="text-xs font-black uppercase tracking-widest px-3 py-1 bg-white border-2 border-neo-ink rounded-full neo-shadow-sm">
            403 Forbidden
          </span>
          <h1 className="text-4xl md:text-5xl font-black text-neo-ink tracking-tight mt-3">
            Access Denied
          </h1>
        </div>

        <p className="text-neo-ink/80 font-bold text-lg leading-relaxed">
          Your current account role{' '}
          <span className="bg-white px-2 py-0.5 rounded-md border-2 border-neo-ink font-black text-neo-ink uppercase">
            {user?.role || 'Guest'}
          </span>{' '}
          is not authorized to access this feature or section
          {attemptedPath ? <code className="block mt-2 font-mono text-sm bg-white/70 p-1.5 border border-neo-ink rounded">({attemptedPath})</code> : '.'}
        </p>

        <p className="text-sm font-semibold text-neo-ink/60">
          Only users with the required authorization permissions can view and interact with this area.
        </p>

        <div className="flex flex-wrap gap-4 justify-center pt-2 w-full">
          <NeoButton
            onClick={() => navigate('/events')}
            color="bg-white"
            textColor="text-neo-ink"
            className="flex-1 justify-center min-w-[160px]"
          >
            <Trophy className="w-4 h-4 mr-2" />
            Hackathons
          </NeoButton>

          <NeoButton
            onClick={handleGoHome}
            color="bg-neo-ink"
            textColor="text-white"
            className="flex-1 justify-center min-w-[160px]"
          >
            <Home className="w-4 h-4 mr-2" />
            Dashboard
          </NeoButton>
        </div>
      </div>
    </div>
  );
};

export default UnauthorizedPage;
