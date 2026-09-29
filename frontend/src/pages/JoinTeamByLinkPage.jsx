import React, { useState, useEffect } from 'react';
import { useParams, useSearchParams, useNavigate, useLocation } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';
import NeoCard from '../components/neo/NeoCard';
import NeoButton from '../components/neo/NeoButton';
import { Users, CheckCircle2, AlertCircle, ArrowRight, Lock } from 'lucide-react';

export const JoinTeamByLinkPage = () => {
  const { token: paramToken } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { user, isAuthenticated } = useAuth();

  const token = paramToken || searchParams.get('token');

  const [joining, setJoining] = useState(false);
  const [hasJoined, setHasJoined] = useState(false);
  const { showNotification } = useNotification();

  const handleJoin = async () => {
    if (!token) return;
    setJoining(true);
    try {
      await api.joinTeamByLink(token.trim());
      setHasJoined(true);
      showNotification('success', 'Successfully joined team! Redirecting to your workspace...');
      setTimeout(() => {
        navigate('/teams/my');
      }, 1500);
    } catch (err) {
      showNotification('error', err.message || 'Failed to join team. The link may have expired or the team may be full.');
    } finally {
      setJoining(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-20">
      <NeoCard color="bg-white" className="p-8 md:p-12 text-center space-y-6">
        <div className="w-20 h-20 rounded-full bg-neo-pastel-green border-4 border-neo-ink flex items-center justify-center neo-shadow mx-auto">
          <Users className="w-10 h-10 text-neo-ink" />
        </div>

        <div>
          <h1 className="text-3xl md:text-5xl font-black text-neo-ink tracking-tight uppercase">
            Team Invitation
          </h1>
          <p className="text-lg font-bold text-neo-ink/70 mt-2">
            You have received a secure invite link to join a hackathon team roster.
          </p>
        </div>

        {!token ? (
          <div className="py-6 space-y-4">
            <p className="font-bold text-neo-ink/70">
              No invitation token was provided in the URL.
            </p>
            <NeoButton onClick={() => navigate('/events')} color="bg-neo-ink" textColor="text-white">
              Browse Hackathons
            </NeoButton>
          </div>
        ) : !isAuthenticated ? (
          <div className="py-6 space-y-6 bg-neo-pastel-purple/20 p-6 rounded-2xl border-3 border-neo-ink">
            <Lock className="w-8 h-8 text-neo-ink mx-auto" />
            <div>
              <h3 className="text-xl font-black text-neo-ink">Authentication Required</h3>
              <p className="font-bold text-sm text-neo-ink/70 mt-1">
                Please log in or create an account to accept this team invitation.
              </p>
            </div>
            <div className="flex justify-center gap-4">
              <NeoButton
                onClick={() => navigate('/login', { state: { from: location } })}
                color="bg-neo-ink"
                textColor="text-white"
              >
                Sign In
              </NeoButton>
              <NeoButton
                onClick={() => navigate('/register', { state: { from: location } })}
                color="bg-white"
                textColor="text-neo-ink"
              >
                Create Account
              </NeoButton>
            </div>
          </div>
        ) : (
          <div className="py-6 space-y-6">
            <div className="p-4 bg-neo-bg rounded-xl border-2 border-neo-ink text-left">
              <span className="text-[10px] font-black uppercase tracking-wider text-neo-ink/60 block">
                Signed in as
              </span>
              <p className="font-black text-lg text-neo-ink">{user?.name}</p>
              <p className="text-xs font-bold text-neo-ink/60">{user?.email}</p>
            </div>

            <NeoButton
              onClick={handleJoin}
              disabled={joining || hasJoined}
              color="bg-neo-pastel-green"
              textColor="text-neo-ink"
              className="w-full justify-center !py-4 !text-lg"
            >
              {joining ? 'Joining Team...' : 'Accept Invitation & Join Team'}
              <ArrowRight className="w-5 h-5 ml-2" />
            </NeoButton>
          </div>
        )}
      </NeoCard>
    </div>
  );
};
