import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { RubricScoreSlider } from '../components/RubricScoreSlider';
import { Github, Globe, Video, Award, CheckCircle2, ArrowLeft, AlertCircle } from 'lucide-react';

export const ScoringPage = ({ eventId, submissionId, onBack, onSuccess }) => {
  const [submission, setSubmission] = useState(null);
  const [scores, setScores] = useState({}); // { [criterionId]: { score, feedback } }
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [statusMessage, setStatusMessage] = useState(null);

  useEffect(() => {
    fetchSubmissionAndScores();
  }, [submissionId]);

  const fetchSubmissionAndScores = async () => {
    try {
      setLoading(true);
      const subRes = await api.getSubmissionById(submissionId);
      if (subRes?.data) {
        setSubmission(subRes.data);
      }

      // Fetch existing scores by this judge if any
      const scoreRes = await api.getSubmissionScores(submissionId);
      if (scoreRes?.data && scoreRes.data.length > 0) {
        const scoreMap = {};
        scoreRes.data.forEach((s) => {
          scoreMap[s.criterionId] = {
            score: s.score,
            feedback: s.feedback || '',
          };
        });
        setScores(scoreMap);
      }
    } catch (err) {
      console.error('Failed to load submission:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleScoreChange = (criterionId, newScore) => {
    setScores((prev) => ({
      ...prev,
      [criterionId]: {
        ...(prev[criterionId] || {}),
        score: newScore,
      },
    }));
  };

  const handleFeedbackChange = (criterionId, newFeedback) => {
    setScores((prev) => ({
      ...prev,
      [criterionId]: {
        ...(prev[criterionId] || { score: 0 }),
        feedback: newFeedback,
      },
    }));
  };

  const handleSubmitScores = async () => {
    setSubmitting(true);
    setStatusMessage(null);

    const payload = submission.event.criteria.map((c) => ({
      criterionId: c.id,
      score: scores[c.id]?.score !== undefined ? scores[c.id].score : 0,
      feedback: scores[c.id]?.feedback || '',
    }));

    try {
      await api.submitScores(submission.id, payload);
      setStatusMessage({ type: 'success', text: 'Scores and qualitative feedback saved successfully!' });
      if (onSuccess) onSuccess();
    } catch (err) {
      setStatusMessage({ type: 'error', text: err.message || 'Failed to submit scores' });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading || !submission) {
    return <div className="py-20 text-center text-slate-400">Loading project evaluation...</div>;
  }

  // Calculate total weighted score preview
  let totalWeighted = 0;
  let maxPossible = 0;
  submission.event.criteria?.forEach((c) => {
    const val = scores[c.id]?.score || 0;
    totalWeighted += val * c.weight;
    maxPossible += c.maxScore * c.weight;
  });
  const percent = maxPossible > 0 ? Math.round((totalWeighted / maxPossible) * 100) : 0;

  return (
    <div className="space-y-8 pb-16">
      <div className="flex items-center justify-between">
        <button
          onClick={onBack}
          className="text-xs font-semibold text-slate-400 hover:text-white flex items-center gap-1 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Submissions</span>
        </button>

        <div className="flex items-center gap-3">
          <div className="text-right">
            <span className="text-xs text-slate-400 block">Overall Score</span>
            <span className="text-xl font-bold font-mono text-emerald-400">
              {Math.round(totalWeighted * 10) / 10} / {maxPossible} ({percent}%)
            </span>
          </div>
        </div>
      </div>

      {statusMessage && (
        <div
          className={`p-4 rounded-xl text-xs font-medium border ${
            statusMessage.type === 'success'
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
              : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
          }`}
        >
          {statusMessage.text}
        </div>
      )}

      {/* Project Overview Card */}
      <div className="glass-panel rounded-2xl p-6 border border-slate-800 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <span className="text-[10px] uppercase font-bold text-indigo-400">
              Team: {submission.team?.name}
            </span>
            <h2 className="text-2xl font-bold text-white tracking-tight">{submission.title}</h2>
            {submission.tagline && (
              <p className="text-xs font-medium text-indigo-300 mt-0.5">{submission.tagline}</p>
            )}
          </div>

          <div className="flex items-center gap-3">
            {submission.repoUrl && (
              <a
                href={submission.repoUrl}
                target="_blank"
                rel="noreferrer"
                className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs flex items-center gap-1.5 transition-colors"
              >
                <Github className="w-3.5 h-3.5" />
                <span>Source Code</span>
              </a>
            )}
            {submission.demoUrl && (
              <a
                href={submission.demoUrl}
                target="_blank"
                rel="noreferrer"
                className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs flex items-center gap-1.5 transition-colors"
              >
                <Globe className="w-3.5 h-3.5" />
                <span>Live Demo</span>
              </a>
            )}
            {submission.videoUrl && (
              <a
                href={submission.videoUrl}
                target="_blank"
                rel="noreferrer"
                className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs flex items-center gap-1.5 transition-colors"
              >
                <Video className="w-3.5 h-3.5" />
                <span>Video Pitch</span>
              </a>
            )}
          </div>
        </div>

        <p className="text-xs text-slate-300 leading-relaxed whitespace-pre-line bg-slate-950/60 p-4 rounded-xl border border-slate-800/80">
          {submission.description}
        </p>

        {submission.techStack && (
          <div className="text-xs text-slate-400">
            <span className="font-semibold text-slate-300">Tech Stack:</span> {submission.techStack}
          </div>
        )}
      </div>

      {/* Rubric Evaluation Sliders */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
            <Award className="w-5 h-5 text-emerald-400" />
            <span>Rubric Criteria Evaluation</span>
          </h3>
          <span className="text-xs text-slate-500 font-mono">
            {submission.event.criteria?.length} Rubrics Defined
          </span>
        </div>

        <div className="space-y-4">
          {submission.event.criteria?.map((c) => (
            <RubricScoreSlider
              key={c.id}
              criterion={c}
              value={scores[c.id]?.score}
              onChange={(val) => handleScoreChange(c.id, val)}
              feedback={scores[c.id]?.feedback}
              onFeedbackChange={(fb) => handleFeedbackChange(c.id, fb)}
            />
          ))}
        </div>

        {/* Submit Bottom Bar */}
        <div className="pt-6 flex items-center justify-between">
          <div className="text-xs text-slate-400">
            Judges can update their evaluation at any time before results are finalized.
          </div>
          <button
            onClick={handleSubmitScores}
            disabled={submitting}
            className="px-6 py-2.5 rounded-xl text-sm font-semibold bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white shadow-lg shadow-emerald-600/30 transition-all flex items-center gap-2"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>{submitting ? 'Saving Scores...' : 'Commit Scores & Feedback'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
