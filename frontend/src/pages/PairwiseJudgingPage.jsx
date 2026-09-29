import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../services/api';
import { useNotification } from '../context/NotificationContext';
import NeoCard from '../components/neo/NeoCard';
import NeoButton from '../components/neo/NeoButton';
import { Award, Trophy, ArrowRight, RefreshCw, CheckCircle2, AlertCircle, ExternalLink, Github, Globe } from 'lucide-react';

export const PairwiseJudgingPage = () => {
  const { eventId: paramEventId } = useParams();
  const navigate = useNavigate();

  const [events, setEvents] = useState([]);
  const [selectedEventId, setSelectedEventId] = useState(paramEventId || '');
  const [submissions, setSubmissions] = useState([]);
  const [standings, setStandings] = useState([]);
  const [currentPair, setCurrentPair] = useState(null); // [subA, subB]
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const { showNotification } = useNotification();
  const [activeTab, setActiveTab] = useState('matchup'); // 'matchup' | 'standings'

  useEffect(() => {
    fetchEvents();
  }, []);

  useEffect(() => {
    if (selectedEventId) {
      loadEventData(selectedEventId);
    }
  }, [selectedEventId]);

  const fetchEvents = async () => {
    try {
      const res = await api.getEvents();
      if (res?.data && res.data.length > 0) {
        setEvents(res.data);
        if (!selectedEventId) {
          setSelectedEventId(String(paramEventId || res.data[0].id));
        }
      }
    } catch (err) {
      console.error('Failed to load events:', err);
    }
  };

  const loadEventData = async (evId) => {
    try {
      setLoading(true);

      // Load submissions for event
      const subsRes = await api.getSubmissionsByEvent(evId);
      const subsList = subsRes?.data || [];
      setSubmissions(subsList);

      // Load standings
      try {
        const standingsRes = await api.getPairwiseStandings(evId);
        const stList = Array.isArray(standingsRes)
          ? standingsRes
          : standingsRes?.data || [];
        setStandings(stList);
      } catch (stErr) {
        console.warn('Pairwise standings fetch:', stErr.message);
      }

      // Pick a pair for comparison if at least 2 submissions
      if (subsList.length >= 2) {
        pickNextPair(subsList);
      } else {
        setCurrentPair(null);
      }
    } catch (err) {
      console.error('Failed to load event data for pairwise:', err);
      showNotification('error', err.message || 'Failed to load submissions for evaluation.');
    } finally {
      setLoading(false);
    }
  };

  const pickNextPair = (list) => {
    if (!list || list.length < 2) {
      setCurrentPair(null);
      return;
    }
    // Random pair selection
    const idxA = Math.floor(Math.random() * list.length);
    let idxB = Math.floor(Math.random() * list.length);
    while (idxB === idxA && list.length > 1) {
      idxB = Math.floor(Math.random() * list.length);
    }
    setCurrentPair([list[idxA], list[idxB]]);
  };

  const handleVote = async (winnerId, loserId) => {
    setSubmitting(true);
    try {
      await api.recordPairwiseComparison(selectedEventId, winnerId, loserId);
      showNotification('success', 'Pairwise comparison successfully recorded!');

      // Refresh standings
      const standingsRes = await api.getPairwiseStandings(selectedEventId);
      const stList = Array.isArray(standingsRes)
        ? standingsRes
        : standingsRes?.data || [];
      setStandings(stList);

      // Advance to next pair
      pickNextPair(submissions);
    } catch (err) {
      showNotification('error', err.message || 'Failed to record comparison.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 space-y-10 pb-20 pt-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b-3 border-neo-ink pb-6">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xs font-black uppercase px-3 py-1 bg-neo-pastel-yellow border-2 border-neo-ink rounded-full neo-shadow-sm">
              Bradley-Terry Model
            </span>
          </div>
          <h1 className="text-4xl md:text-6xl font-black text-neo-ink tracking-tight">
            Pairwise Evaluation
          </h1>
          <p className="text-xl font-bold text-neo-ink/70 max-w-2xl mt-2">
            Compare two submissions directly head-to-head to determine mathematically defensible relative rankings.
          </p>
        </div>

        {/* Event Picker */}
        {events.length > 0 && (
          <div className="flex flex-col gap-2 min-w-[260px]">
            <label className="text-xs font-black uppercase text-neo-ink/70">
              Select Hackathon
            </label>
            <select
              value={selectedEventId}
              onChange={(e) => {
                setSelectedEventId(e.target.value);
                navigate(`/judge/${e.target.value}/pairwise`);
              }}
              className="w-full px-4 py-3 font-bold bg-white border-3 border-neo-ink rounded-full neo-shadow focus:outline-none"
            >
              {events.map((ev) => (
                <option key={ev.id} value={ev.id}>
                  {ev.title}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>


      <div className="flex items-center gap-4">
        <button
          onClick={() => setActiveTab('matchup')}
          className={`px-6 py-2.5 rounded-full border-3 border-neo-ink font-black text-sm uppercase transition-all ${
            activeTab === 'matchup'
              ? 'bg-neo-pastel-purple text-neo-ink neo-shadow'
              : 'bg-white text-neo-ink hover:bg-neo-bg'
          }`}
        >
          Head-to-Head Matchup
        </button>
        <button
          onClick={() => setActiveTab('standings')}
          className={`px-6 py-2.5 rounded-full border-3 border-neo-ink font-black text-sm uppercase transition-all ${
            activeTab === 'standings'
              ? 'bg-neo-pastel-yellow text-neo-ink neo-shadow'
              : 'bg-white text-neo-ink hover:bg-neo-bg'
          }`}
        >
          Pairwise Standings ({standings.length})
        </button>
      </div>

      {loading ? (
        <div className="py-20 text-center font-bold text-2xl text-neo-ink/50">
          Loading comparison data...
        </div>
      ) : activeTab === 'matchup' ? (
        <div>
          {!currentPair || submissions.length < 2 ? (
            <NeoCard color="bg-white" className="text-center py-20 flex flex-col items-center justify-center">
              <Award className="w-16 h-16 text-neo-ink mb-6" />
              <h3 className="text-3xl font-black text-neo-ink mb-2">Insufficient Submissions</h3>
              <p className="font-bold text-neo-ink/60 max-w-md">
                Pairwise evaluation requires at least 2 completed project submissions in this hackathon.
              </p>
            </NeoCard>
          ) : (
            <div className="space-y-8">
              <div className="text-center">
                <span className="text-sm font-black uppercase px-4 py-1.5 bg-white border-3 border-neo-ink rounded-full neo-shadow">
                  Which project is stronger overall?
                </span>
              </div>

              {/* Side-by-Side Matchup Arena */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 relative">
                {/* VS Badge */}
                <div className="hidden lg:flex absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-10 w-16 h-16 rounded-full bg-neo-ink text-white font-black text-2xl items-center justify-center border-4 border-white neo-shadow">
                  VS
                </div>

                {/* Project A */}
                <NeoCard
                  color="bg-neo-pastel-blue"
                  className="flex flex-col justify-between p-8 border-4 hover:-translate-y-1 transition-transform"
                >
                  <div className="space-y-6">
                    <div className="flex justify-between items-start gap-2">
                      <span className="text-xs font-black uppercase px-3 py-1 bg-white border-2 border-neo-ink rounded-full neo-shadow-sm">
                        Option A
                      </span>
                      <span className="text-xs font-bold text-neo-ink/70">
                        Team: {currentPair[0].team?.name || 'Independent'}
                      </span>
                    </div>

                    <div>
                      <h3 className="text-3xl font-black text-neo-ink mb-2 leading-tight">
                        {currentPair[0].title}
                      </h3>
                      {currentPair[0].tagline && (
                        <p className="text-lg font-bold text-neo-ink/80 mb-4">
                          {currentPair[0].tagline}
                        </p>
                      )}
                      <p className="text-sm font-medium text-neo-ink/80 line-clamp-4 leading-relaxed">
                        {currentPair[0].description}
                      </p>
                    </div>

                    {currentPair[0].techStack && (
                      <div className="flex flex-wrap gap-2">
                        {currentPair[0].techStack.split(',').slice(0, 4).map((tech, idx) => (
                          <span
                            key={idx}
                            className="text-[10px] font-black uppercase px-2 py-1 bg-white border-2 border-neo-ink rounded-lg text-neo-ink"
                          >
                            {tech.trim()}
                          </span>
                        ))}
                      </div>
                    )}

                    <div className="flex items-center gap-3 pt-2">
                      {currentPair[0].demoUrl && (
                        <a
                          href={currentPair[0].demoUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="text-xs font-bold flex items-center gap-1 underline"
                        >
                          <Globe className="w-3.5 h-3.5" /> Demo
                        </a>
                      )}
                      {currentPair[0].repoUrl && (
                        <a
                          href={currentPair[0].repoUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="text-xs font-bold flex items-center gap-1 underline"
                        >
                          <Github className="w-3.5 h-3.5" /> Code
                        </a>
                      )}
                    </div>
                  </div>

                  <div className="pt-8 mt-6 border-t-3 border-neo-ink">
                    <NeoButton
                      onClick={() => handleVote(currentPair[0].id, currentPair[1].id)}
                      disabled={submitting}
                      color="bg-neo-ink"
                      textColor="text-white"
                      className="w-full justify-center !py-4 !text-base"
                    >
                      <Trophy className="w-5 h-5 mr-2 text-neo-pastel-yellow" />
                      Select {currentPair[0].title} as Winner
                    </NeoButton>
                  </div>
                </NeoCard>

                {/* Project B */}
                <NeoCard
                  color="bg-neo-pastel-pink"
                  className="flex flex-col justify-between p-8 border-4 hover:-translate-y-1 transition-transform"
                >
                  <div className="space-y-6">
                    <div className="flex justify-between items-start gap-2">
                      <span className="text-xs font-black uppercase px-3 py-1 bg-white border-2 border-neo-ink rounded-full neo-shadow-sm">
                        Option B
                      </span>
                      <span className="text-xs font-bold text-neo-ink/70">
                        Team: {currentPair[1].team?.name || 'Independent'}
                      </span>
                    </div>

                    <div>
                      <h3 className="text-3xl font-black text-neo-ink mb-2 leading-tight">
                        {currentPair[1].title}
                      </h3>
                      {currentPair[1].tagline && (
                        <p className="text-lg font-bold text-neo-ink/80 mb-4">
                          {currentPair[1].tagline}
                        </p>
                      )}
                      <p className="text-sm font-medium text-neo-ink/80 line-clamp-4 leading-relaxed">
                        {currentPair[1].description}
                      </p>
                    </div>

                    {currentPair[1].techStack && (
                      <div className="flex flex-wrap gap-2">
                        {currentPair[1].techStack.split(',').slice(0, 4).map((tech, idx) => (
                          <span
                            key={idx}
                            className="text-[10px] font-black uppercase px-2 py-1 bg-white border-2 border-neo-ink rounded-lg text-neo-ink"
                          >
                            {tech.trim()}
                          </span>
                        ))}
                      </div>
                    )}

                    <div className="flex items-center gap-3 pt-2">
                      {currentPair[1].demoUrl && (
                        <a
                          href={currentPair[1].demoUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="text-xs font-bold flex items-center gap-1 underline"
                        >
                          <Globe className="w-3.5 h-3.5" /> Demo
                        </a>
                      )}
                      {currentPair[1].repoUrl && (
                        <a
                          href={currentPair[1].repoUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="text-xs font-bold flex items-center gap-1 underline"
                        >
                          <Github className="w-3.5 h-3.5" /> Code
                        </a>
                      )}
                    </div>
                  </div>

                  <div className="pt-8 mt-6 border-t-3 border-neo-ink">
                    <NeoButton
                      onClick={() => handleVote(currentPair[1].id, currentPair[0].id)}
                      disabled={submitting}
                      color="bg-neo-ink"
                      textColor="text-white"
                      className="w-full justify-center !py-4 !text-base"
                    >
                      <Trophy className="w-5 h-5 mr-2 text-neo-pastel-yellow" />
                      Select {currentPair[1].title} as Winner
                    </NeoButton>
                  </div>
                </NeoCard>
              </div>

              {/* Skip Matchup */}
              <div className="flex justify-center pt-4">
                <button
                  onClick={() => pickNextPair(submissions)}
                  className="flex items-center gap-2 font-black text-sm text-neo-ink hover:underline"
                >
                  <RefreshCw className="w-4 h-4" /> Skip this pair and view another matchup
                </button>
              </div>
            </div>
          )}
        </div>
      ) : (
        /* Bradley-Terry Standings Table */
        <div className="bg-white border-3 border-neo-ink rounded-2xl overflow-hidden neo-shadow-lg">
          <div className="px-6 py-5 border-b-3 border-neo-ink bg-neo-pastel-yellow flex items-center justify-between">
            <h3 className="font-black text-2xl text-neo-ink">
              Bradley-Terry Pairwise Standings
            </h3>
            <span className="text-xs font-black uppercase bg-white px-3 py-1 border-2 border-neo-ink rounded-full">
              {standings.length} Submissions Ranked
            </span>
          </div>

          {standings.length === 0 ? (
            <div className="py-16 text-center font-bold text-neo-ink/50">
              No pairwise comparisons recorded yet. Start judging to generate standings!
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-neo-bg text-neo-ink font-black uppercase text-sm border-b-3 border-neo-ink">
                  <tr>
                    <th className="py-4 px-6 border-r-3 border-neo-ink text-center w-24">Rank</th>
                    <th className="py-4 px-6 border-r-3 border-neo-ink">Project</th>
                    <th className="py-4 px-6 border-r-3 border-neo-ink text-center">Wins</th>
                    <th className="py-4 px-6 border-r-3 border-neo-ink text-center">Losses</th>
                    <th className="py-4 px-6 text-right">Rating Score</th>
                  </tr>
                </thead>
                <tbody className="divide-y-3 divide-neo-ink">
                  {standings.map((st, i) => (
                    <tr key={st.submissionId || i} className="hover:bg-neo-bg transition-colors">
                      <td className="py-4 px-6 border-r-3 border-neo-ink text-center font-black text-lg">
                        #{i + 1}
                      </td>
                      <td className="py-4 px-6 border-r-3 border-neo-ink">
                        <div className="font-black text-lg text-neo-ink">{st.title}</div>
                        <div className="text-xs font-bold text-neo-ink/60 uppercase">
                          Team: {st.teamName || 'Team'}
                        </div>
                      </td>
                      <td className="py-4 px-6 border-r-3 border-neo-ink text-center font-black text-green-700">
                        {st.wins ?? 0}
                      </td>
                      <td className="py-4 px-6 border-r-3 border-neo-ink text-center font-black text-red-600">
                        {st.losses ?? 0}
                      </td>
                      <td className="py-4 px-6 text-right font-mono font-black text-xl text-neo-ink">
                        {typeof st.score === 'number' ? st.score.toFixed(2) : st.score || '0.00'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
