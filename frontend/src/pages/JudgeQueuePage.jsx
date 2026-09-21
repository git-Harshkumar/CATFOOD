import React, { useState, useEffect } from 'react';
import api from '../services/api';
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
    <div className="space-y-8 pb-16">
      <div>
        <div className="flex items-center gap-2 mb-1">
          <Award className="w-5 h-5 text-emerald-400" />
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Judge Evaluation Queue
          </h1>
        </div>
        <p className="text-xs sm:text-sm text-slate-400">
          Review hackathon submissions against weighted rubrics and assign scores and feedback.
        </p>
      </div>

      {loading ? (
        <div className="text-center py-16 text-slate-500 text-sm">Loading assigned projects...</div>
      ) : queue.length === 0 ? (
        <div className="text-center py-16 bg-slate-900/40 border border-slate-800 rounded-2xl p-8 space-y-2">
          <Trophy className="w-12 h-12 text-slate-600 mx-auto" />
          <h3 className="text-base font-semibold text-slate-300">No projects currently in queue</h3>
          <p className="text-xs text-slate-500">
            You will see submissions here once assigned as a judge or when projects are submitted.
          </p>
        </div>
      ) : (
        <div className="space-y-8">
          {queue.map((eventItem) => (
            <div
              key={eventItem.eventId}
              className="glass-panel rounded-2xl p-6 border border-slate-800 space-y-5"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-bold text-white tracking-tight">
                    {eventItem.eventTitle}
                  </h3>
                  <span className="text-xs text-slate-400">
                    Deadline: {formatDate(eventItem.deadline)}
                  </span>
                </div>
                <span className="text-xs font-mono px-2.5 py-1 rounded bg-slate-800 text-slate-300">
                  {eventItem.submissions.filter((s) => s.isEvaluated).length} / {eventItem.submissions.length} Evaluated
                </span>
              </div>

              {eventItem.submissions.length === 0 ? (
                <div className="text-center py-6 text-xs text-slate-500">
                  No submissions yet for this hackathon.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {eventItem.submissions.map((sub) => (
                    <div
                      key={sub.submissionId}
                      className="p-4 rounded-xl bg-slate-900/80 border border-slate-800/80 flex items-center justify-between gap-4"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <h4 className="font-semibold text-sm text-slate-100">{sub.title}</h4>
                        </div>
                        <div className="text-xs text-slate-400">Team: {sub.teamName}</div>
                        <div className="flex items-center gap-2 pt-1">
                          {sub.isEvaluated ? (
                            <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-400">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>Evaluated ({sub.scoresCount}/{sub.totalCriteriaCount})</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[11px] font-medium text-amber-400">
                              <Clock className="w-3.5 h-3.5" />
                              <span>Pending Review</span>
                            </span>
                          )}
                        </div>
                      </div>

                      <button
                        onClick={() => onOpenScore(eventItem.eventId, sub.submissionId)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1 transition-all ${
                          sub.isEvaluated
                            ? 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                            : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-md shadow-emerald-600/20'
                        }`}
                      >
                        <span>{sub.isEvaluated ? 'Edit Score' : 'Score'}</span>
                        <ArrowRight className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
