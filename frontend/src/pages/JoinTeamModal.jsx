import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { useNotification } from '../context/NotificationContext';
import { Modal } from '../components/Modal';
import NeoButton from '../components/neo/NeoButton';

export const JoinTeamModal = ({ isOpen, onClose, onSuccess }) => {
  const { showNotification } = useNotification();
  const [inviteCode, setInviteCode] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setInviteCode('');
    }
  }, [isOpen]);

  const handleJoinTeam = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.joinTeam(inviteCode.trim());
      showNotification('success', 'Successfully joined the team!');
      onSuccess();
      onClose();
    } catch (err) {
      showNotification('error', err.message || 'Failed to join team');
    } finally {
      setSubmitting(false);
    }
  };

  const inputClass = "w-full px-4 py-3 font-bold bg-white border-3 border-neo-ink rounded-xl placeholder-neo-ink/40 neo-shadow focus:outline-none focus:neo-active transition-all";

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Join an Existing Team" maxWidth="max-w-xl">
      <form onSubmit={handleJoinTeam} className="space-y-6">
        <div>
          <label className="block font-black text-neo-ink mb-2">Invite Code</label>
          <input
            type="text"
            required
            placeholder="e.g. TEAM-XXXX"
            value={inviteCode}
            onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
            className={`${inputClass} font-mono uppercase`}
          />
          <p className="font-bold text-sm text-neo-ink/60 mt-2">
            Obtain the invite code from your team leader to join their roster.
          </p>
        </div>

        <div className="pt-6 flex justify-end gap-4">
          <NeoButton type="button" onClick={onClose} color="bg-white" textColor="text-neo-ink">
            Cancel
          </NeoButton>
          <NeoButton type="submit" disabled={submitting} color="bg-neo-ink" textColor="text-white">
            {submitting ? 'Joining...' : 'Join Team'}
          </NeoButton>
        </div>
      </form>
    </Modal>
  );
};
