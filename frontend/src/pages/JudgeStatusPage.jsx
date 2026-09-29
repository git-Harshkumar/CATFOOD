import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';
import NeoCard from '../components/neo/NeoCard';
import NeoButton from '../components/neo/NeoButton';
import StatCard from '../components/neo/StatCard';
import { Award, CheckCircle2, Clock, ShieldCheck, ArrowRight, Activity, ToggleLeft } from 'lucide-react';
import { formatDate } from '../utils/formatters';

export const JudgeStatusPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [queue, setQueue] = useState([]);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [judgeStatuses, setJudgeStatuses] = useState({}); // { [eventId]: 'ACTIVE' | 'INACTIVE' | 'BUSY' }
  const [updating, setUpdating] = useState({});
  const { showNotification } = useNotification();
  useEffect(() => {
    loadJudgeData();
  }, []);

  const loadJudgeData = async () => {
    try {
      setLoading(true);
      const [queueRes, eventsRes] = await Promise.all([
        api.getJudgeQueue(),
        api.getEvents(),
      ]);

      if (queueRes?.data) {
        setQueue(queueRes.data);
      }
      if (eventsRes?.data) {
        setEvents(eventsRes.data);
      }
    } catch (err) {
      console.error('Failed to load judge data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (eventId, newStatus) => {
    setUpdating((prev) => ({ ...prev, [eventId]: true }));
    try {
      await api.updateJudgeStatus(eventId, newStatus);
      setJudgeStatuses((prev) => ({ ...prev, [eventId]: newStatus }));
      showNotification('success', `Status updated to ${newStatus} for event #${eventId}!`);
    } catch (err) {
      showNotification('error', err.message || 'Failed to update status.');
    } finally {
      setUpdating((prev) => ({ ...prev, [eventId]: false }));
    }
  };

  const totalAssigned = queue.reduce((acc, ev) => acc + (ev.submissions?.length || 0), 0);
  const totalCompleted = queue.reduce(
    (acc, ev) => acc + (ev.submissions?.filter((s) => s.isEvaluated)?.length || 0),
    0
  );
  const pendingCount = totalAssigned - totalCompleted;

  return (
    <div className="max-w-6xl mx-auto px-4 space-y-10 pb-20 pt-6">
      {/* Header */}
      <div className="border-b-3 border-neo-ink pb-6">
        <h1 className="text-4xl md:text-6xl font-black text-neo-ink tracking-tight mb-2">
          Judge Availability & Profile
        </h1>
        <p className="text-xl font-bold text-neo-ink/70">
          Manage your active evaluation availability, workload distribution, and track assignments.
        </p>
      </div>

      {/* Profile Overview Card */}
      <NeoCard color="bg-white" className="flex flex-col md:flex-row items-center justify-between gap-6 p-6">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-neo-pastel-yellow border-3 border-neo-ink flex items-center justify-center font-black text-2xl neo-shadow">
            {user?.name?.charAt(0) || 'J'}
          </div>
          <div>
            <h2 className="text-2xl font-black text-neo-ink">{user?.name}</h2>
            <p className="font-bold text-neo-ink/60">{user?.email}</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <NeoButton
            onClick={() => navigate('/judge/queue')}
            color="bg-neo-ink"
            textColor="text-white"
          >
            Open Evaluation Queue <ArrowRight className="w-4 h-4 ml-2" />
          </NeoButton>
        </div>
      </NeoCard>

      {/* Aggregate Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard label="Assigned Projects" value={totalAssigned} />
        <StatCard label="Completed Evaluations" value={totalCompleted} />
        <StatCard label="Pending Evaluations" value={pendingCount} />
      </div>

      {/* Assigned Events & Availability Settings */}
      <div className="space-y-6">
        <h3 className="text-2xl font-black text-neo-ink border-b-3 border-neo-ink pb-2 uppercase tracking-tight">
          Assigned Hackathons ({queue.length})
        </h3>

        {loading ? (
          <div className="py-16 text-center font-bold text-xl text-neo-ink/50">
            Loading judging assignments...
          </div>
        ) : queue.length === 0 ? (
          <NeoCard color="bg-neo-pastel-blue" className="text-center py-16 flex flex-col items-center">
            <Award className="w-16 h-16 text-neo-ink mb-4" />
            <h4 className="text-2xl font-black text-neo-ink mb-2">No Active Hackathon Assignments</h4>
            <p className="font-bold text-neo-ink/70 max-w-md">
              When an event organizer assigns you as a judge, your events and availability controls will appear here.
            </p>
          </NeoCard>
        ) : (
          <div className="space-y-6">
            {queue.map((evItem) => {
              const currentStatus = judgeStatuses[evItem.eventId] || 'ACTIVE';
              const isUpdating = !!updating[evItem.eventId];

              return (
                <NeoCard
                  key={evItem.eventId}
                  color="bg-white"
                  className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 p-6"
                >
                  <div className="space-y-2 flex-1">
                    <div className="flex items-center gap-3">
                      <h4 className="text-2xl font-black text-neo-ink">
                        {evItem.eventTitle}
                      </h4>
                      <span className="text-xs font-black uppercase px-2.5 py-1 bg-neo-pastel-yellow border-2 border-neo-ink rounded-full">
                        {evItem.submissions?.filter((s) => s.isEvaluated).length} / {evItem.submissions?.length} Done
                      </span>
                    </div>
                    <p className="text-sm font-bold text-neo-ink/60">
                      Judging Deadline: {formatDate(evItem.deadline)}
                    </p>
                  </div>

                  {/* Availability Controls */}
                  <div className="flex items-center gap-4">
                    <div className="flex flex-col gap-1 text-right">
                      <span className="text-[10px] font-black uppercase tracking-wider text-neo-ink/70">
                        Availability Status
                      </span>
                      <div className="flex items-center gap-2">
                        {['ACTIVE', 'BUSY', 'INACTIVE'].map((st) => (
                          <button
                            key={st}
                            disabled={isUpdating}
                            onClick={() => handleStatusChange(evItem.eventId, st)}
                            className={`px-3 py-1.5 rounded-full border-2 border-neo-ink font-black text-xs uppercase transition-all ${
                              currentStatus === st
                                ? st === 'ACTIVE'
                                  ? 'bg-neo-pastel-green text-neo-ink neo-shadow-sm'
                                  : st === 'BUSY'
                                  ? 'bg-neo-pastel-orange text-neo-ink neo-shadow-sm'
                                  : 'bg-neo-pastel-pink text-neo-ink neo-shadow-sm'
                                : 'bg-white text-neo-ink/60 hover:text-neo-ink'
                            }`}
                          >
                            {st}
                          </button>
                        ))}
                      </div>
                    </div>

                    <NeoButton
                      onClick={() => navigate(`/judge/${evItem.eventId}/pairwise`)}
                      color="bg-neo-pastel-purple"
                      textColor="text-neo-ink"
                    >
                      Pairwise
                    </NeoButton>
                  </div>
                </NeoCard>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
