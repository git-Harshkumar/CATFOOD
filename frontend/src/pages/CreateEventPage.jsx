import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useNotification } from '../context/NotificationContext';
import api from '../services/api';
import NeoCard from '../components/neo/NeoCard';
import NeoButton from '../components/neo/NeoButton';
import { Plus, Trash2, ArrowLeft } from 'lucide-react';

export const CreateEventPage = () => {
  const navigate = useNavigate();
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
  const [prizes, setPrizes] = useState([]);
  const [tracks, setTracks] = useState([]);
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const { showNotification } = useNotification();

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

  const addPrize = () => setPrizes([...prizes, { name: '', description: '', value: '' }]);
  const removePrize = (idx) => setPrizes(prizes.filter((_, i) => i !== idx));
  const updatePrize = (idx, field, value) => {
    const updated = [...prizes];
    updated[idx][field] = value;
    setPrizes(updated);
  };

  const addTrack = () => setTracks([...tracks, { name: '', description: '' }]);
  const removeTrack = (idx) => setTracks(tracks.filter((_, i) => i !== idx));
  const updateTrack = (idx, field, value) => {
    const updated = [...tracks];
    updated[idx][field] = value;
    setTracks(updated);
  };

  const addQuestion = () => setQuestions([...questions, { question: '', isRequired: false }]);
  const removeQuestion = (idx) => setQuestions(questions.filter((_, i) => i !== idx));
  const updateQuestion = (idx, field, value) => {
    const updated = [...questions];
    updated[idx][field] = value;
    setQuestions(updated);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await api.createEvent({
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
        prizes,
        tracks,
        questions,
      });

      // Navigate to the newly created event detail page or organizer dashboard
      navigate(`/events/${res.data.id}`);
    } catch (err) {
      showNotification('error', err.message || 'Failed to create hackathon');
    } finally {
      setLoading(false);
    }
  };

  const inputClass = "w-full px-4 py-3 font-bold bg-white border-3 border-neo-ink rounded-xl placeholder-neo-ink/40 neo-shadow focus:outline-none focus:neo-active transition-all";
  const labelClass = "block font-black text-neo-ink mb-2";

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-16 pt-8 px-4">
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate('/organizer/events')}
          className="flex items-center justify-center w-12 h-12 rounded-full border-3 border-neo-ink bg-white hover:bg-neo-pastel-pink transition-colors neo-shadow text-neo-ink"
          title="Back to Organizer Dashboard"
        >
          <ArrowLeft className="w-6 h-6" />
        </button>
        <div>
          <h1 className="text-4xl font-black text-neo-ink tracking-tight uppercase">Host a Hackathon</h1>
          <p className="text-neo-ink/70 font-bold text-lg">Configure your new event details and judging criteria.</p>
        </div>
      </div>

      <NeoCard color="bg-neo-pastel-yellow" className="p-8">
        <form onSubmit={handleSubmit} className="space-y-8">

          <div className="space-y-6">
            <h3 className="text-2xl font-black text-neo-ink border-b-3 border-neo-ink/20 pb-2">Basic Details</h3>
            
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
                rows="4"
                placeholder="Overview of the hackathon theme, goals, prizes, and criteria..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className={inputClass}
              />
            </div>

            <div>
              <label className={labelClass}>Rules & Guidelines</label>
              <textarea
                rows="4"
                placeholder="Specific rules, submission requirements, or codes of conduct..."
                value={rules}
                onChange={(e) => setRules(e.target.value)}
                className={inputClass}
              />
            </div>
          </div>

          <div className="space-y-6 pt-6 border-t-3 border-neo-ink">
            <h3 className="text-2xl font-black text-neo-ink border-b-3 border-neo-ink/20 pb-2">Timeline & Teams</h3>
            
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
          </div>

          <div className="space-y-6 pt-6 border-t-3 border-neo-ink">
            <div className="flex items-center justify-between border-b-3 border-neo-ink/20 pb-2">
              <h3 className="text-2xl font-black text-neo-ink">Judging Rubrics</h3>
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

          {/* Prizes Section */}
          <div className="space-y-6 pt-6 border-t-3 border-neo-ink">
            <div className="flex items-center justify-between border-b-3 border-neo-ink/20 pb-2">
              <h3 className="text-2xl font-black text-neo-ink">Prizes & Awards</h3>
              <button type="button" onClick={addPrize} className="flex items-center text-sm font-bold text-neo-ink hover:text-neo-pink transition-colors">
                <Plus className="w-4 h-4 mr-1" /> Add Prize
              </button>
            </div>
            
            <div className="space-y-4">
              {prizes.length === 0 ? (
                <div className="text-center py-4 bg-white/50 rounded-xl border-2 border-dashed border-neo-ink/20">
                  <p className="text-neo-ink/60 font-bold text-sm">No prizes configured. Click 'Add Prize' to configure awards.</p>
                </div>
              ) : (
                prizes.map((p, idx) => (
                  <div key={idx} className="p-4 bg-white rounded-xl border-3 border-neo-ink flex gap-4 items-start relative neo-shadow-sm">
                    <div className="flex-1 space-y-3">
                      <div>
                        <label className="block text-xs font-black uppercase text-neo-ink mb-1">Prize Name</label>
                        <input
                          type="text"
                          required
                          value={p.name}
                          onChange={(e) => updatePrize(idx, 'name', e.target.value)}
                          className={inputClass}
                          placeholder="e.g. Grand Prize"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-black uppercase text-neo-ink mb-1">Prize Value (Optional)</label>
                          <input
                            type="text"
                            value={p.value}
                            onChange={(e) => updatePrize(idx, 'value', e.target.value)}
                            className={inputClass}
                            placeholder="e.g. $5000"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-black uppercase text-neo-ink mb-1">Description (Optional)</label>
                          <input
                            type="text"
                            value={p.description}
                            onChange={(e) => updatePrize(idx, 'description', e.target.value)}
                            className={inputClass}
                            placeholder="Details"
                          />
                        </div>
                      </div>
                    </div>
                    <button type="button" onClick={() => removePrize(idx)} className="mt-6 p-2 text-neo-ink/50 hover:text-red-500 transition-colors">
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Tracks Section */}
          <div className="space-y-6 pt-6 border-t-3 border-neo-ink">
            <div className="flex items-center justify-between border-b-3 border-neo-ink/20 pb-2">
              <h3 className="text-2xl font-black text-neo-ink">Tracks (Optional)</h3>
              <button type="button" onClick={addTrack} className="flex items-center text-sm font-bold text-neo-ink hover:text-neo-pink transition-colors">
                <Plus className="w-4 h-4 mr-1" /> Add Track
              </button>
            </div>
            
            <div className="space-y-4">
              {tracks.length === 0 ? (
                <div className="text-center py-4 bg-white/50 rounded-xl border-2 border-dashed border-neo-ink/20">
                  <p className="text-neo-ink/60 font-bold text-sm">No tracks configured. All projects will be in one pool.</p>
                </div>
              ) : (
                tracks.map((t, idx) => (
                  <div key={idx} className="p-4 bg-white rounded-xl border-3 border-neo-ink flex gap-4 items-start relative neo-shadow-sm">
                    <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-black uppercase text-neo-ink mb-1">Track Name</label>
                        <input
                          type="text"
                          required
                          value={t.name}
                          onChange={(e) => updateTrack(idx, 'name', e.target.value)}
                          className={inputClass}
                          placeholder="e.g. Best Web3 App"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-black uppercase text-neo-ink mb-1">Description (Optional)</label>
                        <input
                          type="text"
                          value={t.description}
                          onChange={(e) => updateTrack(idx, 'description', e.target.value)}
                          className={inputClass}
                          placeholder="Short details"
                        />
                      </div>
                    </div>
                    <button type="button" onClick={() => removeTrack(idx)} className="mt-6 p-2 text-neo-ink/50 hover:text-red-500 transition-colors">
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Registration Questions Section */}
          <div className="space-y-6 pt-6 border-t-3 border-neo-ink">
            <div className="flex items-center justify-between border-b-3 border-neo-ink/20 pb-2">
              <h3 className="text-2xl font-black text-neo-ink">Custom Registration Questions</h3>
              <button type="button" onClick={addQuestion} className="flex items-center text-sm font-bold text-neo-ink hover:text-neo-pink transition-colors">
                <Plus className="w-4 h-4 mr-1" /> Add Question
              </button>
            </div>
            
            <div className="space-y-4">
              {questions.length === 0 ? (
                <div className="text-center py-4 bg-white/50 rounded-xl border-2 border-dashed border-neo-ink/20">
                  <p className="text-neo-ink/60 font-bold text-sm">No custom questions configured.</p>
                </div>
              ) : (
                questions.map((q, idx) => (
                  <div key={idx} className="p-4 bg-white rounded-xl border-3 border-neo-ink flex gap-4 items-center relative neo-shadow-sm">
                    <div className="flex-1">
                      <input
                        type="text"
                        required
                        value={q.question}
                        onChange={(e) => updateQuestion(idx, 'question', e.target.value)}
                        className={inputClass}
                        placeholder="e.g. What is your t-shirt size?"
                      />
                    </div>
                    <label className="flex items-center gap-2 font-bold text-sm text-neo-ink cursor-pointer shrink-0">
                      <input
                        type="checkbox"
                        checked={q.isRequired}
                        onChange={(e) => updateQuestion(idx, 'isRequired', e.target.checked)}
                        className="w-5 h-5 border-2 border-neo-ink rounded text-neo-ink"
                      />
                      Required
                    </label>
                    <button type="button" onClick={() => removeQuestion(idx)} className="p-2 text-neo-ink/50 hover:text-red-500 transition-colors">
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="pt-8 flex justify-end gap-4 border-t-3 border-neo-ink">
            <NeoButton type="button" onClick={() => navigate(-1)} color="bg-white" textColor="text-neo-ink">
              Cancel
            </NeoButton>
            <NeoButton type="submit" disabled={loading} color="bg-neo-ink" textColor="text-white" className="px-8 text-lg">
              {loading ? 'Creating...' : 'Publish Hackathon'}
            </NeoButton>
          </div>
        </form>
      </NeoCard>
    </div>
  );
};
