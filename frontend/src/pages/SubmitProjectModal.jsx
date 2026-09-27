import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { Modal } from '../components/Modal';
import NeoButton from '../components/neo/NeoButton';
import NeoCard from '../components/neo/NeoCard';
import { Github, Globe, Video, Code, CheckCircle, AlertTriangle } from 'lucide-react';

export const SubmitProjectModal = ({ isOpen, onClose, teamId, existingSubmission, onSuccess }) => {
  const [title, setTitle] = useState('');
  const [tagline, setTagline] = useState('');
  const [description, setDescription] = useState('');
  const [repoUrl, setRepoUrl] = useState('');
  const [demoUrl, setDemoUrl] = useState('');
  const [videoUrl, setVideoUrl] = useState('');
  const [techStack, setTechStack] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (existingSubmission) {
      setTitle(existingSubmission.title || '');
      setTagline(existingSubmission.tagline || '');
      setDescription(existingSubmission.description || '');
      setRepoUrl(existingSubmission.repoUrl || '');
      setDemoUrl(existingSubmission.demoUrl || '');
      setVideoUrl(existingSubmission.videoUrl || '');
      setTechStack(existingSubmission.techStack || '');
    } else {
      setTitle('');
      setTagline('');
      setDescription('');
      setRepoUrl('');
      setDemoUrl('');
      setVideoUrl('');
      setTechStack('');
    }
    setError(null);
  }, [existingSubmission, isOpen]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      await api.submitProject(teamId, {
        title,
        tagline,
        description,
        repoUrl,
        demoUrl,
        videoUrl,
        techStack,
      });
      if (onSuccess) onSuccess();
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to submit project');
    } finally {
      setLoading(false);
    }
  };

  const inputClass = "w-full px-4 py-3 font-bold bg-white border-3 border-neo-ink rounded-xl placeholder-neo-ink/40 neo-shadow focus:outline-none focus:neo-active transition-all";
  const labelClass = "block font-black text-neo-ink mb-2 text-sm";
  
  const status = existingSubmission?.status || 'DRAFT';
  const statusColor = status === 'DRAFT' ? 'bg-neo-pastel-orange' : 'bg-neo-pastel-green';

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={existingSubmission ? 'Update Project Deliverable' : 'Submit Hackathon Deliverable'}
      maxWidth="max-w-3xl"
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        {error && (
          <div className="p-4 rounded-xl bg-neo-pastel-pink border-3 border-neo-ink text-neo-ink font-bold text-center flex justify-center items-center gap-2">
            <AlertTriangle className="w-5 h-5 shrink-0 text-neo-ink" />
            <span>{error}</span>
          </div>
        )}

        {/* Status Pill */}
        <div className="flex justify-end">
           <span className={`px-4 py-1.5 rounded-full border-3 border-neo-ink font-black text-xs uppercase neo-shadow ${statusColor}`}>
              {status}
           </span>
        </div>

        <div>
          <label className={labelClass}>
            Project Title <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            required
            placeholder="e.g. NeuralPulse Triage AI"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className={inputClass}
          />
        </div>

        <div>
          <label className={labelClass}>One-line Tagline / Pitch</label>
          <input
            type="text"
            placeholder="AI copilot for clinical triage"
            value={tagline}
            onChange={(e) => setTagline(e.target.value)}
            className={inputClass}
          />
        </div>

        <div>
          <label className={labelClass}>
            Project Description & Architecture <span className="text-red-500">*</span>
          </label>
          <textarea
            required
            rows="5"
            placeholder="Explain what your project does, technical innovation, how it works, and how it aligns with the judging rubric..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className={inputClass}
          />
        </div>

        <NeoCard color="bg-neo-pastel-purple" noPadding className="p-6 space-y-4">
          <h4 className="font-black text-xl text-neo-ink mb-4">External Links</h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>GitHub / Code Repository</label>
              <div className="relative">
                <Github className="w-5 h-5 text-neo-ink absolute left-4 top-3.5" />
                <input
                  type="url"
                  placeholder="https://github.com/..."
                  value={repoUrl}
                  onChange={(e) => setRepoUrl(e.target.value)}
                  className={`${inputClass} pl-12`}
                />
              </div>
            </div>

            <div>
              <label className={labelClass}>Live Demo / App URL</label>
              <div className="relative">
                <Globe className="w-5 h-5 text-neo-ink absolute left-4 top-3.5" />
                <input
                  type="url"
                  placeholder="https://myproject.app"
                  value={demoUrl}
                  onChange={(e) => setDemoUrl(e.target.value)}
                  className={`${inputClass} pl-12`}
                />
              </div>
            </div>

            <div>
              <label className={labelClass}>Demo Video Link (YouTube/Loom)</label>
              <div className="relative">
                <Video className="w-5 h-5 text-neo-ink absolute left-4 top-3.5" />
                <input
                  type="url"
                  placeholder="https://youtu.be/..."
                  value={videoUrl}
                  onChange={(e) => setVideoUrl(e.target.value)}
                  className={`${inputClass} pl-12`}
                />
              </div>
            </div>

            <div>
              <label className={labelClass}>Technologies Used</label>
              <div className="relative">
                <Code className="w-5 h-5 text-neo-ink absolute left-4 top-3.5" />
                <input
                  type="text"
                  placeholder="React, Express, Tailwind"
                  value={techStack}
                  onChange={(e) => setTechStack(e.target.value)}
                  className={`${inputClass} pl-12`}
                />
              </div>
            </div>
          </div>
        </NeoCard>

        <div className="pt-6 border-t-3 border-neo-ink flex flex-col md:flex-row items-center justify-between gap-4">
          <span className="font-bold text-sm text-neo-ink/70">
            Ensure you submit prior to deadline.
          </span>

          <div className="flex items-center gap-4">
            <NeoButton type="button" onClick={onClose} color="bg-white" textColor="text-neo-ink">
              Cancel
            </NeoButton>
            <NeoButton type="submit" disabled={loading} color="bg-neo-pastel-green" textColor="text-neo-ink">
              <CheckCircle className="w-5 h-5 mr-2" />
              {loading ? 'Submitting...' : 'Save Deliverable'}
            </NeoButton>
          </div>
        </div>
      </form>
    </Modal>
  );
};
