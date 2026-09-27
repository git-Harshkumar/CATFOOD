import React, { useState, useEffect } from 'react';
import api from '../services/api';
import NeoCard from '../components/neo/NeoCard';
import NeoButton from '../components/neo/NeoButton';
import { Award, CheckCircle2, Clock, ArrowRight, Trophy } from 'lucide-react';
import { formatDate } from '../utils/formatters';

export const JudgeQueuePage = ({ onOpenScore }) => {
  const [queue, setQueue] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchQueue();
  }, []);

  const fetchQueue = async () => {
    try {
      setLoading(true);
      const res = await api.getJudgeQueue();
      if (res?.data) {
        setQueue(res.data);
      }
    } catch (err) {
      console.error('Failed to load judge queue:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 space-y-10 pb-16 pt-6">
      <div>
        <h1 className="text-4xl md:text-6xl font-black text-neo-ink tracking-tight mb-4">
          Judge Queue
        </h1>
        <p className="text-xl font-bold text-neo-ink/70 max-w-2xl">
          Review hackathon submissions against weighted rubrics and assign scores and feedback.
        </p>
      </div>

      {loading ? (
        <div className="text-center py-20 font-bold text-2xl text-neo-ink/50">Loading assigned projects...</div>
      ) : queue.length === 0 ? (
        <NeoCard color="bg-white" className="text-center py-20 flex flex-col items-center justify-center">
          <Trophy className="w-16 h-16 text-neo-ink mb-6" />
          <h3 className="text-3xl font-black text-neo-ink mb-2">No projects in queue</h3>
          <p className="font-bold text-neo-ink/60">
            You will see submissions here once assigned as a judge or when projects are submitted.
          </p>
        </NeoCard>
      ) : (
        <div className="space-y-12">
          {queue.map((eventItem, eventIdx) => (
            <NeoCard key={eventItem.eventId} color={['bg-neo-pastel-yellow', 'bg-neo-pastel-blue'][eventIdx % 2]} className="space-y-8">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b-3 border-neo-ink pb-4">
                <div>
                  <h3 className="text-3xl font-black text-neo-ink">
                    {eventItem.eventTitle}
                  </h3>
                  <span className="font-bold text-neo-ink/70">
                    Deadline: {formatDate(eventItem.deadline)}
                  </span>
                </div>
                <div className="bg-white px-4 py-2 border-3 border-neo-ink rounded-full neo-shadow text-sm font-black uppercase">
                  {eventItem.submissions.filter((s) => s.isEvaluated).length} / {eventItem.submissions.length} Evaluated
                </div>
              </div>

              {eventItem.submissions.length === 0 ? (
                <div className="text-center py-10 font-bold text-lg text-neo-ink/50">
                  No submissions yet for this hackathon.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {eventItem.submissions.map((sub, i) => (
                    <NeoCard key={sub.submissionId} color="bg-white" className="flex flex-col justify-between p-5 hover:-translate-y-1 transition-transform">
                      <div className="space-y-4">
                        <div className="flex justify-between items-start gap-2">
                          <h4 className="font-black text-xl text-neo-ink leading-tight">{sub.title}</h4>
                          {sub.isEvaluated ? (
                            <span className="shrink-0 px-2 py-1 bg-neo-pastel-green border-2 border-neo-ink rounded-full text-[10px] font-black uppercase flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3" /> Done
                            </span>
                          ) : (
                            <span className="shrink-0 px-2 py-1 bg-neo-pastel-orange border-2 border-neo-ink rounded-full text-[10px] font-black uppercase flex items-center gap-1">
                              <Clock className="w-3 h-3" /> Pending
                            </span>
                          )}
                        </div>
                        <div className="text-sm font-bold text-neo-ink/60 uppercase">Team: <span className="text-neo-ink">{sub.teamName}</span></div>
                        <div className="flex flex-wrap items-center gap-2 pt-1">
                          <span className="text-[11px] font-black px-2 py-0.5 bg-neo-pastel-yellow border-2 border-neo-ink rounded-lg neo-shadow-sm uppercase">
                            {sub.trackName || 'General'}
                          </span>
                          {sub.batch && (
                            <span className="text-[10px] font-black px-2 py-0.5 bg-white border-2 border-neo-ink rounded-lg neo-shadow-sm uppercase text-neo-ink/70">
                              {sub.batch}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="pt-6 mt-6 border-t-3 border-neo-ink">
                        <NeoButton
                          onClick={() => onOpenScore(eventItem.eventId, sub.submissionId)}
                          color={sub.isEvaluated ? 'bg-neo-bg' : 'bg-neo-ink'}
                          textColor={sub.isEvaluated ? 'text-neo-ink' : 'text-white'}
                          className="w-full flex justify-center"
                        >
                          <span>{sub.isEvaluated ? 'Edit Score' : 'Score Project'}</span>
                          <ArrowRight className="w-4 h-4 ml-2" />
                        </NeoButton>
                      </div>
                    </NeoCard>
                  ))}
                </div>
              )}
            </NeoCard>
          ))}
        </div>
      )}
    </div>
  );
};
