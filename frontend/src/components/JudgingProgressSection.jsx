import React, { useState, useEffect } from 'react';
import api from '../services/api';
import NeoCard from './neo/NeoCard';
import NeoButton from './neo/NeoButton';
import { Modal } from './Modal';
import { 
  Award, 
  BarChart2, 
  Download, 
  RefreshCw, 
  CheckCircle2, 
  Clock, 
  Users, 
  Sliders, 
  UserPlus, 
  FileSpreadsheet,
  AlertCircle
} from 'lucide-react';

export const JudgingProgressSection = ({ eventId }) => {
  const [progress, setProgress] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState(null);
  const [activeView, setActiveView] = useState('judges'); // 'judges' | 'projects' | 'normalization'
  const [normalizationResult, setNormalizationResult] = useState(null);
  const [autoAssignModalOpen, setAutoAssignModalOpen] = useState(false);
  const [judgesPerProject, setJudgesPerProject] = useState(2);

  useEffect(() => {
    if (eventId) {
      fetchProgress();
    }
  }, [eventId]);

  const fetchProgress = async () => {
    try {
      setLoading(true);
      const res = await api.getJudgingProgress(eventId);
      if (res?.data) {
        setProgress(res.data);
      }
    } catch (err) {
      console.error('Failed to load judging progress:', err);
      setStatusMessage({ type: 'error', text: err.message || 'Failed to load progress' });
    } finally {
      setLoading(false);
    }
  };

  const handleRunNormalization = async () => {
    try {
      setActionLoading(true);
      setStatusMessage(null);
      const res = await api.runNormalization(eventId);
      if (res?.data) {
        setNormalizationResult(res.data);
        setStatusMessage({ 
          type: 'success', 
          text: `Normalization complete! ${res.data.evaluationsNormalized} evaluations calculated.` 
        });
        fetchProgress();
      }
    } catch (err) {
      console.error('Normalization error:', err);
      setStatusMessage({ type: 'error', text: err.message || 'Failed to execute score normalization' });
    } finally {
      setActionLoading(false);
    }
  };

  const handleExportCsv = async (type) => {
    try {
      setActionLoading(true);
      await api.downloadJudgingCsv(eventId, type);
      setStatusMessage({ type: 'success', text: `Downloaded ${type} CSV export successfully.` });
    } catch (err) {
      console.error('CSV export error:', err);
      setStatusMessage({ type: 'error', text: err.message || 'Failed to export CSV' });
    } finally {
      setActionLoading(false);
    }
  };

  const handleAutoAssign = async () => {
    try {
      setActionLoading(true);
      const res = await api.autoAssignJudges(eventId, { judgesPerProject: Number(judgesPerProject) });
      setAutoAssignModalOpen(false);
      setStatusMessage({ 
        type: 'success', 
        text: `Algorithmic assignment complete! Created ${res.data?.assignedCount || 0} assignments.` 
      });
      fetchProgress();
    } catch (err) {
      console.error('Auto assign error:', err);
      setStatusMessage({ type: 'error', text: err.message || 'Failed to run auto-assignment' });
    } finally {
      setActionLoading(false);
    }
  };

  if (loading && !progress) {
    return (
      <div className="py-20 text-center font-bold text-2xl text-neo-ink/50 flex flex-col items-center justify-center gap-4">
        <RefreshCw className="w-8 h-8 animate-spin" />
        <span>Loading judging dashboard...</span>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {statusMessage && (
        <div className={`p-4 rounded-xl border-3 border-neo-ink font-bold text-center neo-shadow flex items-center justify-center gap-2 ${
          statusMessage.type === 'success' ? 'bg-neo-pastel-green text-neo-ink' : 'bg-neo-pastel-pink text-neo-ink'
        }`}>
          {statusMessage.type === 'success' ? <CheckCircle2 className="w-5 h-5 shrink-0" /> : <AlertCircle className="w-5 h-5 shrink-0" />}
          <span>{statusMessage.text}</span>
        </div>
      )}

      {/* Organizer Action Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-white p-5 rounded-2xl border-3 border-neo-ink neo-shadow">
        <div className="flex flex-wrap items-center gap-3">
          <NeoButton
            onClick={() => setAutoAssignModalOpen(true)}
            color="bg-neo-pastel-yellow"
            textColor="text-neo-ink"
            className="text-sm font-black"
          >
            <UserPlus className="w-4 h-4 mr-2" /> Algorithmic Assign
          </NeoButton>

          <NeoButton
            onClick={handleRunNormalization}
            disabled={actionLoading}
            color="bg-neo-pastel-purple"
            textColor="text-neo-ink"
            className="text-sm font-black"
          >
            <Sliders className="w-4 h-4 mr-2" />
            {actionLoading ? 'Calculating...' : 'Run Normalization'}
          </NeoButton>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-black uppercase text-neo-ink/70 mr-1 flex items-center gap-1">
            <Download className="w-4 h-4" /> Export CSV:
          </span>
          <button
            onClick={() => handleExportCsv('results')}
            className="px-3 py-1.5 bg-neo-bg border-2 border-neo-ink rounded-lg font-black text-xs uppercase hover:neo-active neo-shadow-sm transition-all"
          >
            Results
          </button>
          <button
            onClick={() => handleExportCsv('scores')}
            className="px-3 py-1.5 bg-neo-bg border-2 border-neo-ink rounded-lg font-black text-xs uppercase hover:neo-active neo-shadow-sm transition-all"
          >
            Scores
          </button>
          <button
            onClick={() => handleExportCsv('assignments')}
            className="px-3 py-1.5 bg-neo-bg border-2 border-neo-ink rounded-lg font-black text-xs uppercase hover:neo-active neo-shadow-sm transition-all"
          >
            Assignments
          </button>
          <button
            onClick={() => handleExportCsv('progress')}
            className="px-3 py-1.5 bg-neo-bg border-2 border-neo-ink rounded-lg font-black text-xs uppercase hover:neo-active neo-shadow-sm transition-all"
          >
            Progress
          </button>
          <button
            onClick={fetchProgress}
            className="p-1.5 bg-white border-2 border-neo-ink rounded-lg hover:neo-active neo-shadow-sm transition-all ml-2"
            title="Refresh"
          >
            <RefreshCw className="w-4 h-4 text-neo-ink" />
          </button>
        </div>
      </div>

      {/* Overall Progress Summary Card */}
      <NeoCard color="bg-neo-pastel-blue" className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b-3 border-neo-ink pb-4">
          <div>
            <h3 className="text-3xl font-black text-neo-ink">Judging Progress</h3>
            <p className="font-bold text-neo-ink/70">
              Overview of judge completion, submission reviews, and track distribution.
            </p>
          </div>
          <div className="bg-white px-5 py-3 border-3 border-neo-ink rounded-2xl neo-shadow flex items-center gap-4">
            <div className="text-right">
              <span className="text-[10px] font-black uppercase text-neo-ink/60 block">Overall Completion</span>
              <span className="text-3xl font-black text-neo-ink">{progress?.overallPercentage || 0}%</span>
            </div>
            <div className="w-12 h-12 bg-neo-pastel-green border-2 border-neo-ink rounded-xl flex items-center justify-center font-black">
              {progress?.totalCompletedReviews || 0}
            </div>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="space-y-2">
          <div className="w-full bg-white border-3 border-neo-ink rounded-full h-6 overflow-hidden neo-shadow-sm">
            <div
              className="bg-neo-pastel-green h-full border-r-3 border-neo-ink transition-all duration-500"
              style={{ width: `${progress?.overallPercentage || 0}%` }}
            />
          </div>
          <div className="flex justify-between text-xs font-black uppercase text-neo-ink/70 px-1">
            <span>{progress?.totalCompletedReviews || 0} Reviews Completed</span>
            <span>{progress?.totalAssignedReviews || 0} Total Assigned</span>
          </div>
        </div>

        {/* Statistics Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-2">
          <div className="bg-white p-4 rounded-xl border-3 border-neo-ink neo-shadow">
            <span className="text-xs font-black uppercase text-neo-ink/60 block">Judges</span>
            <span className="text-2xl font-black text-neo-ink">{progress?.totalJudges || 0}</span>
          </div>
          <div className="bg-white p-4 rounded-xl border-3 border-neo-ink neo-shadow">
            <span className="text-xs font-black uppercase text-neo-ink/60 block">Submissions</span>
            <span className="text-2xl font-black text-neo-ink">{progress?.totalSubmissions || 0}</span>
          </div>
          <div className="bg-white p-4 rounded-xl border-3 border-neo-ink neo-shadow">
            <span className="text-xs font-black uppercase text-neo-ink/60 block">Criteria</span>
            <span className="text-2xl font-black text-neo-ink">{progress?.criteriaCount || 0}</span>
          </div>
          <div className="bg-white p-4 rounded-xl border-3 border-neo-ink neo-shadow">
            <span className="text-xs font-black uppercase text-neo-ink/60 block">Pending Reviews</span>
            <span className="text-2xl font-black text-neo-ink">
              {Math.max(0, (progress?.totalAssignedReviews || 0) - (progress?.totalCompletedReviews || 0))}
            </span>
          </div>
        </div>
      </NeoCard>

      {/* Sub-View Tabs */}
      <div className="flex items-center gap-3 border-b-3 border-neo-ink pb-4">
        <button
          onClick={() => setActiveView('judges')}
          className={`px-5 py-2.5 rounded-xl border-3 border-neo-ink font-black text-sm uppercase transition-all neo-shadow ${
            activeView === 'judges' ? 'bg-neo-ink text-white' : 'bg-white text-neo-ink hover:bg-neo-bg'
          }`}
        >
          Judges ({progress?.judgeProgress?.length || 0})
        </button>
        <button
          onClick={() => setActiveView('projects')}
          className={`px-5 py-2.5 rounded-xl border-3 border-neo-ink font-black text-sm uppercase transition-all neo-shadow ${
            activeView === 'projects' ? 'bg-neo-ink text-white' : 'bg-white text-neo-ink hover:bg-neo-bg'
          }`}
        >
          Projects ({progress?.projectProgress?.length || 0})
        </button>
        {normalizationResult && (
          <button
            onClick={() => setActiveView('normalization')}
            className={`px-5 py-2.5 rounded-xl border-3 border-neo-ink font-black text-sm uppercase transition-all neo-shadow ${
              activeView === 'normalization' ? 'bg-neo-ink text-white' : 'bg-white text-neo-ink hover:bg-neo-bg'
            }`}
          >
            Normalization Results
          </button>
        )}
      </div>

      {/* View: Judges */}
      {activeView === 'judges' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {progress?.judgeProgress?.map((judge) => (
            <NeoCard key={judge.judgeId} color="bg-white" className="space-y-4">
              <div className="flex items-start justify-between gap-3 border-b-3 border-neo-ink pb-3">
                <div>
                  <h4 className="font-black text-xl text-neo-ink">{judge.name}</h4>
                  <span className="text-xs font-bold text-neo-ink/60">{judge.email}</span>
                </div>
                <span className={`px-2.5 py-1 rounded-full text-xs font-black uppercase border-2 border-neo-ink ${
                  judge.percentage === 100 ? 'bg-neo-pastel-green' : judge.percentage > 0 ? 'bg-neo-pastel-yellow' : 'bg-neo-pastel-orange'
                }`}>
                  {judge.percentage}% Complete
                </span>
              </div>

              <div className="space-y-2">
                <div className="w-full bg-neo-bg border-2 border-neo-ink rounded-full h-3 overflow-hidden">
                  <div
                    className="bg-neo-pastel-green h-full"
                    style={{ width: `${judge.percentage}%` }}
                  />
                </div>
                <div className="flex justify-between text-xs font-bold text-neo-ink/70">
                  <span>Assigned: {judge.assignedCount}</span>
                  <span>Completed: {judge.completedCount}</span>
                  <span>Pending: {judge.pendingCount}</span>
                </div>
              </div>

              {judge.tracks && judge.tracks.length > 0 && (
                <div className="flex flex-wrap items-center gap-1.5 pt-2">
                  <span className="text-[10px] font-black uppercase text-neo-ink/50 mr-1">Tracks:</span>
                  {judge.tracks.map((t, idx) => (
                    <span key={idx} className="text-[10px] font-black px-2 py-0.5 bg-neo-pastel-purple/50 border border-neo-ink rounded-md">
                      {t}
                    </span>
                  ))}
                </div>
              )}
            </NeoCard>
          ))}
        </div>
      )}

      {/* View: Projects */}
      {activeView === 'projects' && (
        <div className="space-y-4">
          {progress?.projectProgress?.map((proj) => (
            <div
              key={proj.submissionId}
              className="bg-white p-5 rounded-2xl border-3 border-neo-ink neo-shadow flex flex-col md:flex-row md:items-center justify-between gap-4"
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-black uppercase px-2 py-0.5 bg-neo-pastel-yellow border-2 border-neo-ink rounded-lg neo-shadow-sm">
                    {proj.trackName}
                  </span>
                  <span className="text-xs font-bold text-neo-ink/60">Team: {proj.teamName}</span>
                </div>
                <h4 className="font-black text-2xl text-neo-ink">{proj.title}</h4>
              </div>

              <div className="flex items-center gap-6">
                <div className="text-right">
                  <span className="text-[10px] font-black uppercase text-neo-ink/50 block">Reviews</span>
                  <span className="font-black text-lg text-neo-ink">
                    {proj.completedReviews} / {proj.assignedJudges}
                  </span>
                </div>

                <div className="text-right">
                  <span className="text-[10px] font-black uppercase text-neo-ink/50 block">Raw Avg</span>
                  <span className="font-black text-lg text-neo-ink">{proj.rawAverage}</span>
                </div>

                <span className={`px-3 py-1.5 rounded-full text-xs font-black uppercase border-2 border-neo-ink ${
                  proj.status === 'COMPLETED' ? 'bg-neo-pastel-green' : 'bg-neo-pastel-orange'
                }`}>
                  {proj.status}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* View: Normalization Results */}
      {activeView === 'normalization' && normalizationResult && (
        <NeoCard color="bg-white" className="space-y-6">
          <div className="border-b-3 border-neo-ink pb-4">
            <h4 className="text-2xl font-black text-neo-ink">Score Normalization Results</h4>
            <p className="text-sm font-bold text-neo-ink/70">
              Evaluations normalized using z-score standardization centered around global mean ({normalizationResult.globalStats?.mean}) with target std dev ({normalizationResult.globalStats?.stdDev}).
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b-3 border-neo-ink text-xs font-black uppercase text-neo-ink/70">
                  <th className="py-3 px-4">Rank</th>
                  <th className="py-3 px-4">Project</th>
                  <th className="py-3 px-4">Track</th>
                  <th className="py-3 px-4 text-center">Reviews</th>
                  <th className="py-3 px-4 text-right">Raw Avg</th>
                  <th className="py-3 px-4 text-right">Normalized Score</th>
                </tr>
              </thead>
              <tbody>
                {normalizationResult.standings?.map((st) => (
                  <tr key={st.submissionId} className="border-b-2 border-neo-ink/20 font-bold hover:bg-neo-bg/50">
                    <td className="py-3 px-4 font-black">#{st.rank}</td>
                    <td className="py-3 px-4 text-neo-ink">{st.title}</td>
                    <td className="py-3 px-4 text-xs font-black uppercase">{st.trackName}</td>
                    <td className="py-3 px-4 text-center">{st.reviewCount}</td>
                    <td className="py-3 px-4 text-right">{st.rawAverage}</td>
                    <td className="py-3 px-4 text-right font-black text-lg text-neo-ink">
                      {st.finalNormalizedScore}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </NeoCard>
      )}

      {/* Auto-Assign Modal */}
      <Modal
        isOpen={autoAssignModalOpen}
        onClose={() => setAutoAssignModalOpen(false)}
        title="Algorithmic Judge Assignment"
      >
        <div className="space-y-6">
          <p className="font-bold text-neo-ink/80">
            Automatically distribute submitted projects among event judges fairly while strictly respecting track constraints.
          </p>

          <div className="space-y-2">
            <label className="block text-sm font-black uppercase text-neo-ink">
              Judges Per Project:
            </label>
            <input
              type="number"
              min="1"
              max="5"
              value={judgesPerProject}
              onChange={(e) => setJudgesPerProject(e.target.value)}
              className="w-full px-4 py-3 bg-white border-3 border-neo-ink rounded-xl font-bold neo-shadow focus:outline-none"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t-3 border-neo-ink">
            <button
              onClick={() => setAutoAssignModalOpen(false)}
              className="px-5 py-2.5 rounded-xl border-3 border-neo-ink font-black text-sm uppercase bg-white hover:bg-neo-bg transition-all"
            >
              Cancel
            </button>
            <NeoButton
              onClick={handleAutoAssign}
              disabled={actionLoading}
              color="bg-neo-pastel-green"
              textColor="text-neo-ink"
            >
              {actionLoading ? 'Assigning...' : 'Run Assignment Algorithm'}
            </NeoButton>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default JudgingProgressSection;
