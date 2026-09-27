import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { RubricScoreSlider } from '../components/RubricScoreSlider';
import NeoCard from '../components/neo/NeoCard';
import NeoButton from '../components/neo/NeoButton';
import { Github, Globe, Video, Award, CheckCircle2, ArrowLeft, AlertCircle } from 'lucide-react';

export const ScoringPage = ({ eventId, submissionId, onBack, onSuccess }) => {
  const [submission, setSubmission] = useState(null);
  const [scores, setScores] = useState({});
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
    return <div className="py-20 text-center font-bold text-2xl text-neo-ink/50">Loading project evaluation...</div>;
  }

  let totalWeighted = 0;
  let maxPossible = 0;
  submission.event.criteria?.forEach((c) => {
    const val = scores[c.id]?.score || 0;
    totalWeighted += val * c.weight;
    maxPossible += c.maxScore * c.weight;
  });
  const percent = maxPossible > 0 ? Math.round((totalWeighted / maxPossible) * 100) : 0;

  return (
    <div className="max-w-5xl mx-auto px-4 space-y-10 pb-16 pt-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
        <button
          onClick={onBack}
          className="flex items-center gap-2 font-bold text-neo-ink hover:underline decoration-3 underline-offset-4 w-max"
        >
          <ArrowLeft className="w-5 h-5" /> Back to Queue
        </button>

        <div className="bg-white border-3 border-neo-ink rounded-2xl px-6 py-3 flex items-center gap-6 neo-shadow">
          <div className="text-right border-r-3 border-neo-ink pr-6">
            <span className="text-[10px] font-black uppercase tracking-wider text-neo-ink/60 block">Overall Score</span>
            <span className="text-3xl font-black text-neo-ink">
              {Math.round(totalWeighted * 10) / 10}
            </span>
            <span className="text-sm font-bold text-neo-ink/50"> / {maxPossible}</span>
          </div>
          <div className="text-3xl font-black text-neo-ink">
            {percent}%
          </div>
        </div>
      </div>

      {statusMessage && (
        <div className={`p-4 rounded-xl border-3 border-neo-ink font-bold text-center ${statusMessage.type === 'success' ? 'bg-neo-pastel-green' : 'bg-neo-pastel-pink'}`}>
          {statusMessage.text}
        </div>
      )}

      {/* Project Overview Card */}
      <NeoCard color="bg-neo-pastel-purple" className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 border-b-3 border-neo-ink pb-6">
          <div>
            <span className="text-xs font-black px-3 py-1 bg-white border-3 border-neo-ink rounded-full neo-shadow uppercase">
              Team: {submission.team?.name}
            </span>
            <h2 className="text-4xl md:text-5xl font-black text-neo-ink mt-4 tracking-tight">{submission.title}</h2>
            {submission.tagline && (
              <p className="text-xl font-bold text-neo-ink/80 mt-2">{submission.tagline}</p>
            )}
          </div>

          <div className="flex gap-3">
            {submission.repoUrl && (
              <a href={submission.repoUrl} target="_blank" rel="noreferrer" className="w-12 h-12 bg-white border-3 border-neo-ink rounded-full flex items-center justify-center hover:neo-active neo-shadow text-neo-ink" title="Source Code">
                <Github className="w-6 h-6" />
              </a>
            )}
            {submission.demoUrl && (
              <a href={submission.demoUrl} target="_blank" rel="noreferrer" className="w-12 h-12 bg-white border-3 border-neo-ink rounded-full flex items-center justify-center hover:neo-active neo-shadow text-neo-ink" title="Live Demo">
                <Globe className="w-6 h-6" />
              </a>
            )}
            {submission.videoUrl && (
              <a href={submission.videoUrl} target="_blank" rel="noreferrer" className="w-12 h-12 bg-white border-3 border-neo-ink rounded-full flex items-center justify-center hover:neo-active neo-shadow text-neo-ink" title="Video Pitch">
                <Video className="w-6 h-6" />
              </a>
            )}
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border-3 border-neo-ink neo-shadow">
          <p className="text-lg font-medium text-neo-ink/80 leading-relaxed whitespace-pre-line">
            {submission.description}
          </p>
        </div>

        {submission.techStack && (
          <div className="flex flex-wrap items-center gap-3">
            <span className="font-black text-neo-ink uppercase text-sm">Tech Stack:</span>
            <div className="flex flex-wrap gap-2">
               {submission.techStack.split(',').map((tech, idx) => (
                  <span key={idx} className="text-xs font-black uppercase px-2 py-1 bg-white border-2 border-neo-ink rounded-lg text-neo-ink neo-shadow-sm">
                     {tech.trim()}
                  </span>
               ))}
            </div>
          </div>
        )}
      </NeoCard>

      {/* Rubric Evaluation Sliders */}
      <div className="space-y-6 pt-6">
        <div className="flex items-center justify-between">
          <h3 className="text-3xl font-black text-neo-ink flex items-center gap-3">
            <Award className="w-8 h-8 text-neo-ink" />
            <span>Rubrics</span>
          </h3>
          <span className="text-sm font-black bg-white px-3 py-1 border-3 border-neo-ink rounded-full neo-shadow">
            {submission.event.criteria?.length} Defined
          </span>
        </div>

        <div className="space-y-8">
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
        <div className="pt-10 flex flex-col md:flex-row items-center justify-between gap-6 border-t-3 border-neo-ink">
          <div className="text-sm font-bold text-neo-ink/60">
            Judges can update their evaluation at any time before results are finalized.
          </div>
          <NeoButton
            onClick={handleSubmitScores}
            disabled={submitting}
            color="bg-neo-pastel-green"
            textColor="text-neo-ink"
            className="w-full md:w-auto px-8"
          >
            <CheckCircle2 className="w-5 h-5 mr-2" />
            <span>{submitting ? 'Saving...' : 'Commit Scores & Feedback'}</span>
          </NeoButton>
        </div>
      </div>
    </div>
  );
};
