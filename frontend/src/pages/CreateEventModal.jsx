import React, { useState } from 'react';
import api from '../services/api';
import { Modal } from '../components/Modal';
import NeoButton from '../components/neo/NeoButton';
import { Plus, Trash2 } from 'lucide-react';

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

  const inputClass = "w-full px-4 py-3 font-bold bg-white border-3 border-neo-ink rounded-xl placeholder-neo-ink/40 neo-shadow focus:outline-none focus:neo-active transition-all";
  const labelClass = "block font-black text-neo-ink mb-2";

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Host a New Hackathon Event"
      maxWidth="max-w-3xl"
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        {error && (
          <div className="p-4 rounded-xl bg-neo-pastel-pink border-3 border-neo-ink text-neo-ink font-bold text-center">
            {error}
          </div>
        )}

        <div>
          <label className={labelClass}>
            Hackathon Title <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            required
            placeholder="e.g. Global Web3 & AI Innovate 2026"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className={inputClass}
          />
        </div>

        <div>
          <label className={labelClass}>Short Tagline</label>
          <input
            type="text"
            placeholder="Building the next frontier of decentralized apps"
            value={tagline}
            onChange={(e) => setTagline(e.target.value)}
            className={inputClass}
          />
        </div>

        <div>
          <label className={labelClass}>
            Description <span className="text-red-500">*</span>
          </label>
          <textarea
            required
            rows="3"
            placeholder="Overview of the hackathon theme, goals, prizes, and criteria..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className={inputClass}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <div>
            <label className={labelClass}>Start Date & Time</label>
            <input
              type="datetime-local"
              required
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>Submission Deadline</label>
            <input
              type="datetime-local"
              required
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
              className={inputClass}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-6">
          <div>
            <label className={labelClass}>Min Team Size</label>
            <input
              type="number"
              min="1"
              max="10"
              value={minTeamSize}
              onChange={(e) => setMinTeamSize(e.target.value)}
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>Max Team Size</label>
            <input
              type="number"
              min="1"
              max="10"
              value={maxTeamSize}
              onChange={(e) => setMaxTeamSize(e.target.value)}
              className={inputClass}
            />
          </div>
        </div>

        <div className="pt-6 border-t-3 border-neo-ink space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="font-black text-xl text-neo-ink">Judging Rubrics</h4>
            <NeoButton type="button" onClick={addCriterion} color="bg-neo-pastel-green" textColor="text-neo-ink" variant="rounded" className="py-2 px-4">
              <Plus className="w-4 h-4 mr-1" /> Add Criterion
            </NeoButton>
          </div>

          <div className="space-y-4">
            {criteria.map((c, idx) => (
              <div key={idx} className="flex flex-col sm:flex-row items-center gap-3 p-4 rounded-xl bg-neo-bg border-3 border-neo-ink neo-shadow">
                <input
                  type="text"
                  required
                  placeholder="Criterion Name"
                  value={c.name}
                  onChange={(e) => updateCriterion(idx, 'name', e.target.value)}
                  className="w-full sm:flex-1 px-3 py-2 font-bold bg-white border-3 border-neo-ink rounded-lg focus:outline-none focus:neo-active transition-all"
                />
                <div className="flex gap-3 w-full sm:w-auto">
                  <div className="w-full sm:w-24">
                    <span className="text-[10px] font-black uppercase text-neo-ink/60 block mb-1">Max Pts</span>
                    <input
                      type="number"
                      min="1"
                      max="100"
                      value={c.maxScore}
                      onChange={(e) => updateCriterion(idx, 'maxScore', e.target.value)}
                      className="w-full px-3 py-2 font-bold bg-white border-3 border-neo-ink rounded-lg focus:outline-none"
                    />
                  </div>
                  <div className="w-full sm:w-24">
                    <span className="text-[10px] font-black uppercase text-neo-ink/60 block mb-1">Weight</span>
                    <input
                      type="number"
                      step="0.1"
                      min="0.1"
                      max="10"
                      value={c.weight}
                      onChange={(e) => updateCriterion(idx, 'weight', e.target.value)}
                      className="w-full px-3 py-2 font-bold bg-white border-3 border-neo-ink rounded-lg focus:outline-none"
                    />
                  </div>
                </div>
                {criteria.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeCriterion(idx)}
                    className="w-10 h-10 mt-5 shrink-0 rounded-full border-3 border-neo-ink bg-neo-pastel-pink flex items-center justify-center hover:neo-active neo-shadow text-neo-ink"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="pt-8 flex justify-end gap-4">
          <NeoButton type="button" onClick={onClose} color="bg-white" textColor="text-neo-ink">
            Cancel
          </NeoButton>
          <NeoButton type="submit" disabled={loading} color="bg-neo-ink" textColor="text-white">
            {loading ? 'Creating...' : 'Publish Hackathon'}
          </NeoButton>
        </div>
      </form>
    </Modal>
  );
};
