import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { useNotification } from '../context/NotificationContext';
import { Modal } from '../components/Modal';
import NeoButton from '../components/neo/NeoButton';

export const CreateTeamModal = ({ isOpen, onClose, initialEventId, onSuccess }) => {
  const { showNotification } = useNotification();
  const [events, setEvents] = useState([]);
  const [selectedEventId, setSelectedEventId] = useState('');
  const [teamName, setTeamName] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchAvailableEvents();
      setTeamName('');
    }
  }, [isOpen]);

  useEffect(() => {
    if (initialEventId && events.length > 0) {
      setSelectedEventId(String(initialEventId));
    }
  }, [initialEventId, events]);

  const fetchAvailableEvents = async () => {
    try {
      const res = await api.getEvents();
      if (res?.data) {
        const activeEvents = res.data.filter((e) => e.status === 'ACTIVE');
        setEvents(activeEvents);
        if (initialEventId) {
          setSelectedEventId(String(initialEventId));
        } else if (activeEvents.length > 0) {
          setSelectedEventId(String(activeEvents[0].id));
        }
      }
    } catch (err) {
      console.error('Failed to load events:', err);
    }
  };

  const handleCreateTeam = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.createTeam({ eventId: parseInt(selectedEventId, 10), name: teamName });
      showNotification('success', 'Team created successfully! Now invite your friends.');
      onSuccess(); // Trigger callback
      onClose();
    } catch (err) {
      showNotification('error', err.message || 'Failed to create team');
    } finally {
      setSubmitting(false);
    }
  };

  const inputClass = "w-full px-4 py-3 font-bold bg-white border-3 border-neo-ink rounded-xl placeholder-neo-ink/40 neo-shadow focus:outline-none focus:neo-active transition-all";

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Form a New Team" maxWidth="max-w-xl">
      <form onSubmit={handleCreateTeam} className="space-y-6">
        <div>
          <label className="block font-black text-neo-ink mb-2">Select Hackathon</label>
          <select
            value={selectedEventId}
            onChange={(e) => setSelectedEventId(e.target.value)}
            className={inputClass}
            required
          >
            <option value="" disabled>Select an event</option>
            {events.map((ev) => (
              <option key={ev.id} value={ev.id}>
                {ev.title} (Max {ev.maxTeamSize} members)
              </option>
            ))}
          </select>
          {initialEventId && events.some(e => String(e.id) === String(initialEventId)) && (
            <p className="text-xs font-bold text-neo-ink/70 mt-2">
              ✓ Pre-selected from the hackathon you were viewing.
            </p>
          )}
        </div>

        <div>
          <label className="block font-black text-neo-ink mb-2">Team Name</label>
          <input
            type="text"
            required
            placeholder="e.g. CyberVanguard"
            value={teamName}
            onChange={(e) => setTeamName(e.target.value)}
            className={inputClass}
          />
        </div>

        <div className="pt-6 flex justify-end gap-4">
          <NeoButton type="button" onClick={onClose} color="bg-white" textColor="text-neo-ink">
            Cancel
          </NeoButton>
          <NeoButton type="submit" disabled={submitting} color="bg-neo-ink" textColor="text-white">
            {submitting ? 'Creating...' : 'Create Team'}
          </NeoButton>
        </div>
      </form>
    </Modal>
  );
};
