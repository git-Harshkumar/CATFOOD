import React, { useState } from 'react';
import api from '../services/api';
import { Modal } from '../components/Modal';
import { Plus, Trash2, Calendar, Award } from 'lucide-react';

export const CreateEventModal = ({ isOpen, onClose, onSuccess }) => {
  const [title, setTitle] = useState('');
  const [tagline, setTagline] = useState('');
  const [description, setDescription] = useState('');
  const [rules, setRules] = useState('');
  const [startDate, setStartDate] = useState(new Date().toISOString().slice(0, 16));
  const [deadline, setDeadline] = useState(
    new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 16)
  );
  const [minTeamSize, setMinTeamSize] = useState(1);
  const [maxTeamSize, setMaxTeamSize] = useState(4);
  const [criteria, setCriteria] = useState([
    { name: 'Innovation & Originality', maxScore: 10, weight: 1.2 },
    { name: 'Technical Depth & Architecture', maxScore: 10, weight: 1.0 },
    { name: 'UI / UX Design', maxScore: 10, weight: 0.8 },
  ]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const addCriterion = () => {
    setCriteria([...criteria, { name: '', maxScore: 10, weight: 1.0 }]);
  };

  const removeCriterion = (idx) => {
    setCriteria(criteria.filter((_, i) => i !== idx));
  };

  const updateCriterion = (idx, field, value) => {
    const updated = [...criteria];
    updated[idx][field] = value;
    setCriteria(updated);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      await api.createEvent({
        title,
        tagline,
        description,
        rules,
        startDate: new Date(startDate).toISOString(),
        deadline: new Date(deadline).toISOString(),
        minTeamSize: parseInt(minTeamSize, 10),
        maxTeamSize: parseInt(maxTeamSize, 10),
        criteria: criteria.map((c) => ({
          name: c.name,
          maxScore: parseInt(c.maxScore, 10),
          weight: parseFloat(c.weight),
        })),
      });

      if (onSuccess) onSuccess();
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to create hackathon');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Host a New Hackathon Event"
      maxWidth="max-w-2xl"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs">
            {error}
          </div>
        )}

        <div>
          <label className="block text-xs font-medium text-slate-300 mb-1">
            Hackathon Title <span className="text-rose-400">*</span>
          </label>
          <input
            type="text"
            required
            placeholder="e.g. Global Web3 & AI Innovate 2026"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full px-3 py-2 text-sm bg-slate-950 border border-slate-800 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-300 mb-1">Short Tagline</label>
          <input
            type="text"
            placeholder="Building the next frontier of decentralized apps"
            value={tagline}
            onChange={(e) => setTagline(e.target.value)}
            className="w-full px-3 py-2 text-sm bg-slate-950 border border-slate-800 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-300 mb-1">
            Description <span className="text-rose-400">*</span>
          </label>
          <textarea
            required
            rows="3"
            placeholder="Overview of the hackathon theme, goals, prizes, and criteria..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full px-3 py-2 text-sm bg-slate-950 border border-slate-800 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">Start Date & Time</label>
            <input
              type="datetime-local"
              required
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">
              Submission Deadline (Strict Cutoff)
            </label>
            <input
              type="datetime-local"
              required
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-indigo-500"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">Min Team Size</label>
            <input
              type="number"
              min="1"
              max="10"
              value={minTeamSize}
              onChange={(e) => setMinTeamSize(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-indigo-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">Max Team Size</label>
            <input
              type="number"
              min="1"
              max="10"
              value={maxTeamSize}
              onChange={(e) => setMaxTeamSize(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-indigo-500"
            />
          </div>
        </div>

        {/* Judging Rubrics Configuration */}
        <div className="pt-2 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Judging Rubrics & Weighting
            </span>
            <button
              type="button"
              onClick={addCriterion}
              className="text-xs font-semibold text-indigo-400 hover:text-indigo-300 flex items-center gap-1"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Criterion</span>
            </button>
          </div>

          <div className="space-y-2">
            {criteria.map((c, idx) => (
              <div
                key={idx}
                className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-950/60 border border-slate-800 text-xs"
              >
                <input
                  type="text"
                  required
                  placeholder="Criterion Name"
                  value={c.name}
                  onChange={(e) => updateCriterion(idx, 'name', e.target.value)}
                  className="flex-1 px-2.5 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-white"
                />
                <div className="w-20">
                  <span className="text-[10px] text-slate-500 block">Max Score</span>
                  <input
                    type="number"
                    min="1"
                    max="100"
                    value={c.maxScore}
                    onChange={(e) => updateCriterion(idx, 'maxScore', e.target.value)}
                    className="w-full px-2 py-1 bg-slate-900 border border-slate-800 rounded-lg text-white"
                  />
                </div>
                <div className="w-20">
                  <span className="text-[10px] text-slate-500 block">Weight</span>
                  <input
                    type="number"
                    step="0.1"
                    min="0.1"
                    max="10"
                    value={c.weight}
                    onChange={(e) => updateCriterion(idx, 'weight', e.target.value)}
                    className="w-full px-2 py-1 bg-slate-900 border border-slate-800 rounded-lg text-white"
                  />
                </div>
                {criteria.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeCriterion(idx)}
                    className="p-1 text-slate-500 hover:text-rose-400 mt-3"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="pt-4 border-t border-slate-800 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-800 text-slate-300 hover:bg-slate-700"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="px-5 py-2 rounded-xl text-xs font-semibold bg-indigo-600 text-white hover:bg-indigo-500 disabled:opacity-50 shadow-md shadow-indigo-600/30"
          >
            {loading ? 'Creating Hackathon...' : 'Publish Hackathon Event'}
          </button>
        </div>
      </form>
    </Modal>
  );
};
