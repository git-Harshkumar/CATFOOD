import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import NeoCard from '../components/neo/NeoCard';
import NeoButton from '../components/neo/NeoButton';
import { Trophy, Medal, Award, ArrowLeft, Lock } from 'lucide-react';

export const LeaderboardPage = ({ eventId, onBack }) => {
  const { user, isOrganizer } = useAuth();
  const [leaderboard, setLeaderboard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [publishing, setPublishing] = useState(false);

  useEffect(() => {
    fetchLeaderboard();
  }, [eventId]);

  const fetchLeaderboard = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.getLeaderboard(eventId);
      if (res?.data) {
        setLeaderboard(res.data);
      }
    } catch (err) {
      setError(err.message || 'Failed to load leaderboard');
    } finally {
      setLoading(false);
    }
  };

  const handleTogglePublish = async () => {
    if (!leaderboard) return;
    setPublishing(true);
    try {
      const nextState = !leaderboard.isLeaderboardPublished;
      await api.publishLeaderboard(eventId, nextState);
      await fetchLeaderboard();
    } catch (err) {
      alert(err.message);
    } finally {
      setPublishing(false);
    }
  };

  if (loading) {
    return <div className="py-20 text-center font-bold text-2xl text-neo-ink/50">Synthesizing leaderboard rankings...</div>;
  }

  if (error) {
    return (
      <div className="py-32 text-center space-y-6 flex flex-col items-center">
        <div className="w-20 h-20 rounded-full bg-neo-pastel-orange border-4 border-neo-ink flex items-center justify-center neo-shadow">
          <Lock className="w-10 h-10 text-neo-ink" />
        </div>
        <h3 className="text-4xl font-black text-neo-ink">Leaderboard Hidden</h3>
        <p className="text-xl font-bold text-neo-ink/60 max-w-md mx-auto">{error}</p>
        <NeoButton onClick={onBack} color="bg-white" textColor="text-neo-ink">
          <ArrowLeft className="w-5 h-5 mr-2" /> Back to Hackathon
        </NeoButton>
      </div>
    );
  }

  const rankings = leaderboard.rankings || [];

  return (
    <div className="max-w-7xl mx-auto px-4 space-y-12 pb-24 pt-8">
      {/* Header Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div>
          <button
            onClick={onBack}
            className="flex items-center gap-2 font-bold text-neo-ink hover:underline decoration-3 underline-offset-4 mb-4 w-max"
          >
            <ArrowLeft className="w-5 h-5" /> Back to Hackathon
          </button>
          
          <div className="flex items-center gap-4">
            <h1 className="text-4xl md:text-6xl font-black text-neo-ink tracking-tight leading-tight">
              {leaderboard.eventTitle} <br/> <span className="text-neo-pastel-purple drop-shadow-[2px_2px_0_rgba(26,26,26,1)]">Rankings</span>
            </h1>
          </div>
        </div>

        {isOrganizer && (
          <div className="flex flex-col gap-3">
             <div className="text-sm font-black text-neo-ink uppercase tracking-widest px-2">Organizer Controls</div>
             <NeoButton
              onClick={handleTogglePublish}
              disabled={publishing}
              color={leaderboard.isLeaderboardPublished ? 'bg-neo-pastel-pink' : 'bg-neo-pastel-green'}
              textColor="text-neo-ink"
            >
              {leaderboard.isLeaderboardPublished ? 'Unpublish Leaderboard' : 'Publish Leaderboard'}
            </NeoButton>
          </div>
        )}
      </div>

      {/* Podium for Top 3 */}
      {rankings.length >= 2 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-12">
          {/* 2nd Place */}
          {rankings[1] && (
            <NeoCard color="bg-neo-pastel-blue" className="md:order-1 flex flex-col items-center text-center mt-12 hover:-translate-y-2 transition-transform">
              <div className="w-16 h-16 rounded-full bg-white border-3 border-neo-ink flex items-center justify-center neo-shadow mb-4">
                <Medal className="w-8 h-8 text-neo-ink" />
              </div>
              <span className="text-xs font-black px-3 py-1 bg-white border-2 border-neo-ink rounded-full uppercase mb-4 neo-shadow-sm">
                2nd Place
              </span>
              <h3 className="font-black text-2xl text-neo-ink mb-1">{rankings[1].title}</h3>
              <p className="text-sm font-bold text-neo-ink/70 mb-6">{rankings[1].teamName}</p>
              
              <div className="bg-white border-3 border-neo-ink rounded-xl px-6 py-4 w-full neo-shadow">
                <div className="text-4xl font-black text-neo-ink">
                  {rankings[1].totalWeightedScore} <span className="text-lg text-neo-ink/50">pts</span>
                </div>
              </div>
            </NeoCard>
          )}

          {/* 1st Place (Champion) */}
          {rankings[0] && (
            <NeoCard color="bg-neo-pastel-yellow" className="md:order-2 flex flex-col items-center text-center -mt-6 hover:-translate-y-2 transition-transform relative z-10">
              <div className="absolute -top-10">
                 <div className="w-20 h-20 rounded-full bg-white border-4 border-neo-ink flex items-center justify-center neo-shadow">
                    <Trophy className="w-10 h-10 text-neo-ink" />
                 </div>
              </div>
              
              <span className="text-sm font-black px-4 py-1.5 bg-white border-3 border-neo-ink rounded-full uppercase mb-4 mt-8 neo-shadow">
                Grand Champion
              </span>
              
              <h3 className="font-black text-4xl text-neo-ink mb-2 leading-tight">{rankings[0].title}</h3>
              <p className="text-base font-bold text-neo-ink/70 mb-8">{rankings[0].teamName}</p>
              
              <div className="bg-white border-4 border-neo-ink rounded-2xl px-6 py-6 w-full neo-shadow">
                <div className="text-5xl font-black text-neo-ink mb-2">
                  {rankings[0].totalWeightedScore} <span className="text-2xl text-neo-ink/50">pts</span>
                </div>
                <div className="text-sm font-black uppercase text-neo-pastel-green drop-shadow-[1px_1px_0_rgba(26,26,26,1)]">
                   {rankings[0].percentage}% Overall Score
                </div>
              </div>
            </NeoCard>
          )}

          {/* 3rd Place */}
          {rankings[2] && (
            <NeoCard color="bg-neo-pastel-orange" className="md:order-3 flex flex-col items-center text-center mt-20 hover:-translate-y-2 transition-transform">
              <div className="w-16 h-16 rounded-full bg-white border-3 border-neo-ink flex items-center justify-center neo-shadow mb-4">
                <Medal className="w-8 h-8 text-neo-ink" />
              </div>
              <span className="text-xs font-black px-3 py-1 bg-white border-2 border-neo-ink rounded-full uppercase mb-4 neo-shadow-sm">
                3rd Place
              </span>
              <h3 className="font-black text-2xl text-neo-ink mb-1">{rankings[2].title}</h3>
              <p className="text-sm font-bold text-neo-ink/70 mb-6">{rankings[2].teamName}</p>
              
              <div className="bg-white border-3 border-neo-ink rounded-xl px-6 py-4 w-full neo-shadow">
                <div className="text-4xl font-black text-neo-ink">
                  {rankings[2].totalWeightedScore} <span className="text-lg text-neo-ink/50">pts</span>
                </div>
              </div>
            </NeoCard>
          )}
        </div>
      )}

      {/* Rankings Table */}
      <div className="mt-16 bg-white border-3 border-neo-ink rounded-2xl overflow-hidden neo-shadow-lg">
        <div className="px-6 py-5 border-b-3 border-neo-ink bg-neo-pastel-purple flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <h3 className="font-black text-2xl text-neo-ink">Full Hackathon Leaderboard</h3>
          <span className="text-sm font-black bg-white px-3 py-1 border-3 border-neo-ink rounded-full neo-shadow-sm uppercase">
            {rankings.length} Submissions Ranked
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-neo-bg text-neo-ink font-black uppercase text-sm border-b-3 border-neo-ink">
              <tr>
                <th className="py-4 px-6 border-r-3 border-neo-ink w-24 text-center">Rank</th>
                <th className="py-4 px-6 border-r-3 border-neo-ink">Project & Team</th>
                <th className="py-4 px-6 border-r-3 border-neo-ink text-center">Evaluations</th>
                <th className="py-4 px-6 text-right">Weighted Score</th>
              </tr>
            </thead>
            <tbody className="divide-y-3 divide-neo-ink">
              {rankings.map((r, i) => (
                <tr key={r.submissionId} className="hover:bg-neo-bg transition-colors">
                  <td className="py-4 px-6 border-r-3 border-neo-ink text-center">
                    <span
                      className={`inline-flex items-center justify-center w-10 h-10 rounded-full border-3 border-neo-ink font-black text-lg ${
                        r.rank === 1
                          ? 'bg-neo-pastel-yellow text-neo-ink shadow-[2px_2px_0px_0px_#1A1A1A]'
                          : r.rank === 2
                          ? 'bg-neo-pastel-blue text-neo-ink shadow-[2px_2px_0px_0px_#1A1A1A]'
                          : r.rank === 3
                          ? 'bg-neo-pastel-orange text-neo-ink shadow-[2px_2px_0px_0px_#1A1A1A]'
                          : 'bg-white text-neo-ink'
                      }`}
                    >
                      {r.rank}
                    </span>
                  </td>
                  <td className="py-4 px-6 border-r-3 border-neo-ink">
                    <div className="font-black text-xl text-neo-ink mb-1">{r.title}</div>
                    <div className="text-sm font-bold text-neo-ink/60 uppercase">Team: {r.teamName}</div>
                  </td>
                  <td className="py-4 px-6 border-r-3 border-neo-ink text-center">
                    <span className="font-bold bg-white border-2 border-neo-ink px-2 py-1 rounded-lg">
                       {r.judgeCount} {r.judgeCount === 1 ? 'Judge' : 'Judges'}
                    </span>
                  </td>
                  <td className="py-4 px-6 text-right">
                    <div className="font-black text-2xl text-neo-ink">
                       {r.totalWeightedScore} <span className="text-sm text-neo-ink/50">/ {r.totalMaxPossible}</span>
                    </div>
                    <div className="font-bold text-sm text-neo-pastel-green drop-shadow-[1px_1px_0_rgba(26,26,26,1)] uppercase mt-1">
                      {r.percentage}%
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
