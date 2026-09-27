import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { Trophy, Medal, Award, ArrowLeft, Globe, Github, Lock, CheckCircle2 } from 'lucide-react';

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
    return <div className="py-20 text-center text-slate-400">Synthesizing leaderboard rankings...</div>;
  }

  if (error) {
    return (
      <div className="py-20 text-center space-y-4">
        <div className="w-12 h-12 mx-auto rounded-full bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
          <Lock className="w-6 h-6" />
        </div>
        <h3 className="text-lg font-bold text-white">Leaderboard Not Available</h3>
        <p className="text-xs text-slate-400 max-w-md mx-auto">{error}</p>
        <button
          onClick={onBack}
          className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-800 text-slate-200 hover:bg-slate-700"
        >
          ← Back to Hackathon
        </button>
      </div>
    );
  }

  const rankings = leaderboard.rankings || [];
  const topThree = rankings.slice(0, 3);

  return (
    <div className="space-y-8 pb-16">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <button
            onClick={onBack}
            className="text-xs font-semibold text-slate-400 hover:text-white flex items-center gap-1 mb-2 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Hackathon</span>
          </button>
          <div className="flex items-center gap-2">
            <Trophy className="w-6 h-6 text-amber-400" />
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              {leaderboard.eventTitle} — Official Standings
            </h1>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Rankings computed via normalized multi-criteria judge weighting algorithms.
          </p>
        </div>

        {isOrganizer && (
          <div className="flex items-center gap-3">
            <button
              onClick={handleTogglePublish}
              disabled={publishing}
              className={`px-4 py-2 rounded-xl text-xs font-semibold border transition-all ${
                leaderboard.isLeaderboardPublished
                  ? 'bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border-rose-500/30'
                  : 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border-emerald-500/30 shadow-lg shadow-emerald-500/20'
              }`}
            >
              {leaderboard.isLeaderboardPublished ? 'Unpublish Results' : 'Publish Leaderboard to Participants'}
            </button>
          </div>
        )}
      </div>

      {/* Podium for Top 3 */}
      {rankings.length >= 2 && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4">
          {/* 2nd Place */}
          {rankings[1] && (
            <div className="order-2 sm:order-1 glass-card rounded-2xl p-5 border border-slate-700/80 flex flex-col items-center text-center space-y-3 mt-4">
              <div className="w-12 h-12 rounded-full bg-slate-300/10 border border-slate-400/40 flex items-center justify-center text-slate-300">
                <Medal className="w-6 h-6 text-slate-300" />
              </div>
              <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                2nd Place
              </span>
              <h3 className="font-bold text-white text-base">{rankings[1].title}</h3>
              <p className="text-xs text-indigo-400 font-semibold">{rankings[1].teamName}</p>
              <div className="text-2xl font-extrabold font-mono text-white">
                {rankings[1].totalWeightedScore} <span className="text-xs text-slate-500">pts</span>
              </div>
            </div>
          )}

          {/* 1st Place (Champion) */}
          {rankings[0] && (
            <div className="order-1 sm:order-2 glass-panel rounded-2xl p-6 border-2 border-amber-500/40 bg-gradient-to-b from-amber-500/10 via-slate-900 to-slate-950 flex flex-col items-center text-center space-y-3 shadow-xl shadow-amber-500/10 scale-105">
              <div className="w-14 h-14 rounded-full bg-amber-500/20 border border-amber-500/50 flex items-center justify-center text-amber-400">
                <Trophy className="w-7 h-7 text-amber-400 animate-pulse" />
              </div>
              <span className="text-xs font-mono font-bold px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                Champion • 1st Place
              </span>
              <h3 className="font-extrabold text-white text-lg tracking-tight">{rankings[0].title}</h3>
              <p className="text-xs text-amber-400 font-semibold">{rankings[0].teamName}</p>
              <div className="text-3xl font-extrabold font-mono text-amber-300">
                {rankings[0].totalWeightedScore} <span className="text-xs text-slate-400">pts</span>
              </div>
              <span className="text-xs text-emerald-400 font-mono font-bold">
                {rankings[0].percentage}% Total Score
              </span>
            </div>
          )}

          {/* 3rd Place */}
          {rankings[2] && (
            <div className="order-3 glass-card rounded-2xl p-5 border border-amber-800/40 flex flex-col items-center text-center space-y-3 mt-8">
              <div className="w-12 h-12 rounded-full bg-amber-800/20 border border-amber-700/40 flex items-center justify-center text-amber-600">
                <Medal className="w-6 h-6 text-amber-500" />
              </div>
              <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-amber-950/40 text-amber-400 border border-amber-800/30">
                3rd Place
              </span>
              <h3 className="font-bold text-white text-base">{rankings[2].title}</h3>
              <p className="text-xs text-indigo-400 font-semibold">{rankings[2].teamName}</p>
              <div className="text-2xl font-extrabold font-mono text-white">
                {rankings[2].totalWeightedScore} <span className="text-xs text-slate-500">pts</span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Rankings Table */}
      <div className="glass-panel rounded-2xl border border-slate-800 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-800 bg-slate-900/50 flex items-center justify-between">
          <h3 className="font-bold text-white text-sm">Full Hackathon Leaderboard</h3>
          <span className="text-xs text-slate-400 font-mono">{rankings.length} Submissions Ranked</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950/60 text-slate-400 font-mono uppercase text-[11px] border-b border-slate-800">
              <tr>
                <th className="py-3 px-4">Rank</th>
                <th className="py-3 px-4">Project & Team</th>
                <th className="py-3 px-4">Evaluations</th>
                <th className="py-3 px-4 text-right">Weighted Score</th>
                <th className="py-3 px-4 text-right">Percentage</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-sans">
              {rankings.map((r) => (
                <tr key={r.submissionId} className="hover:bg-slate-900/40 transition-colors">
                  <td className="py-4 px-4 font-mono font-bold">
                    <span
                      className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs ${
                        r.rank === 1
                          ? 'bg-amber-500/20 text-amber-300 font-extrabold border border-amber-500/40'
                          : r.rank === 2
                          ? 'bg-slate-300/20 text-slate-200 border border-slate-400/40'
                          : r.rank === 3
                          ? 'bg-amber-800/20 text-amber-400 border border-amber-800/40'
                          : 'text-slate-400'
                      }`}
                    >
                      {r.rank}
                    </span>
                  </td>
                  <td className="py-4 px-4">
                    <div className="font-bold text-white text-sm">{r.title}</div>
                    <div className="text-xs text-indigo-400 font-medium">Team: {r.teamName}</div>
                  </td>
                  <td className="py-4 px-4 text-slate-400 font-mono">
                    {r.judgeCount} {r.judgeCount === 1 ? 'Judge' : 'Judges'}
                  </td>
                  <td className="py-4 px-4 text-right font-mono font-extrabold text-sm text-emerald-400">
                    {r.totalWeightedScore} / {r.totalMaxPossible}
                  </td>
                  <td className="py-4 px-4 text-right font-mono font-bold text-xs text-slate-200">
                    {r.percentage}%
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
