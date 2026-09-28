import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import api from '../services/api';
import NeoCard from '../components/neo/NeoCard';
import NeoButton from '../components/neo/NeoButton';
import StatCard from '../components/neo/StatCard';
import { getStatusBadge, formatDate } from '../utils/formatters';
import {
  ArrowLeft,
  Users,
  Trophy,
  Settings,
  ShieldCheck,
  Download,
  TrendingUp,
  BarChart2,
  PlusCircle,
  Trash2,
  RefreshCw,
  Send,
  Lock,
  Unlock,
  CheckCircle2,
  AlertCircle,
  FileText,
  Webhook as WebhookIcon,
  Database,
  Award,
  ListFilter,
  Check,
  ExternalLink,
} from 'lucide-react';
import JudgingProgressSection from '../components/JudgingProgressSection';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  BarChart, Bar
} from 'recharts';

export const OrganizerEventDashboard = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState(null);

  // Active Tab
  const activeTab = location.pathname.includes('/developer') ? 'developer'
                  : location.pathname.includes('/judges') ? 'judges' 
                  : location.pathname.includes('/leaderboard') ? 'leaderboard'
                  : location.pathname.includes('/dashboard') ? 'dashboard'
                  : 'edit';

  // Sub-features state
  // 1. Edit Event Form
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editDeadline, setEditDeadline] = useState('');
  const [editMinTeam, setEditMinTeam] = useState(1);
  const [editMaxTeam, setEditMaxTeam] = useState(4);
  const [updatingEvent, setUpdatingEvent] = useState(false);

  // Rubric Criterion Form
  const [newCritName, setNewCritName] = useState('');
  const [newCritDesc, setNewCritDesc] = useState('');
  const [newCritMaxScore, setNewCritMaxScore] = useState(10);
  const [newCritWeight, setNewCritWeight] = useState(1);
  const [addingCriterion, setAddingCriterion] = useState(false);

  // Prize Form
  const [prizeName, setPrizeName] = useState('');
  const [prizeDesc, setPrizeDesc] = useState('');
  const [prizeAmount, setPrizeAmount] = useState('');
  const [addingPrize, setAddingPrize] = useState(false);

  // Question Form
  const [questionText, setQuestionText] = useState('');
  const [questionRequired, setQuestionRequired] = useState(false);
  const [addingQuestion, setAddingQuestion] = useState(false);

  // 2. Judges & Staff
  const [judgeEmail, setJudgeEmail] = useState('');
  const [assigningJudge, setAssigningJudge] = useState(false);
  const [autoJudgesPerSub, setAutoJudgesPerSub] = useState(2);
  const [autoAssigning, setAutoAssigning] = useState(false);
  const [batchEmails, setBatchEmails] = useState('');
  const [batchAssigning, setBatchAssigning] = useState(false);
  const [normalizing, setNormalizing] = useState(false);
  const [assignments, setAssignments] = useState([]);

  // 3. Community Voting & Leaderboard
  const [communityResults, setCommunityResults] = useState(null);
  const [loadingCommunity, setLoadingCommunity] = useState(false);
  const [isVotingActive, setIsVotingActive] = useState(true);
  const [areResultsRevealed, setAreResultsRevealed] = useState(false);

  // 4. Developer Tools
  const [webhooks, setWebhooks] = useState([]);
  const [loadingWebhooks, setLoadingWebhooks] = useState(false);
  const [webhookUrl, setWebhookUrl] = useState('');
  const [webhookEvents, setWebhookEvents] = useState('submission.created,vote.cast,submission.updated');
  const [webhookSecret, setWebhookSecret] = useState('');
  const [registeringHook, setRegisteringHook] = useState(false);
  const [hookTestResults, setHookTestResults] = useState(null);
  const [testingHook, setTestingHook] = useState(false);

  // Bulk Operations
  const [importJson, setImportJson] = useState('');
  const [importing, setImporting] = useState(false);

  // Certificates Issuance
  const [certRecipientName, setCertRecipientName] = useState('');
  const [certRecipientEmail, setCertRecipientEmail] = useState('');
  const [certRole, setCertRole] = useState('JUDGE');
  const [issuedCertId, setIssuedCertId] = useState(null);
  const [issuingCert, setIssuingCert] = useState(false);

  // Audit Logs
  const [auditLogs, setAuditLogs] = useState([]);
  const [loadingLogs, setLoadingLogs] = useState(false);

  useEffect(() => {
    fetchEventDetails();
  }, [id]);

  useEffect(() => {
    if (activeTab === 'judges') {
      fetchJudgeAssignments();
    } else if (activeTab === 'leaderboard') {
      fetchCommunityResults();
    } else if (activeTab === 'developer') {
      fetchWebhooks();
      fetchAuditLogs();
    }
  }, [activeTab, id]);

  const fetchEventDetails = async () => {
    try {
      setLoading(true);
      const res = await api.getEventById(id);
      if (res?.data) {
        const ev = res.data;
        setEvent(ev);
        setEditTitle(ev.title || '');
        setEditDescription(ev.description || '');
        setEditDeadline(ev.deadline ? ev.deadline.substring(0, 16) : '');
        setEditMinTeam(ev.minTeamSize || 1);
        setEditMaxTeam(ev.maxTeamSize || 4);
        setIsVotingActive(ev.isVotingActive ?? true);
        setAreResultsRevealed(ev.areResultsRevealed ?? false);
      }
    } catch (err) {
      console.error('Failed to load event details:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchJudgeAssignments = async () => {
    try {
      const res = await api.getJudgeAssignments(id);
      if (res?.data) setAssignments(res.data);
    } catch (e) {
      console.warn('Assignments fetch error:', e.message);
    }
  };

  const fetchCommunityResults = async () => {
    try {
      setLoadingCommunity(true);
      const res = await api.getCommunityResults(id);
      if (res?.data) setCommunityResults(res.data);
    } catch (e) {
      console.warn('Community results fetch:', e.message);
    } finally {
      setLoadingCommunity(false);
    }
  };

  const fetchWebhooks = async () => {
    try {
      setLoadingWebhooks(true);
      const res = await api.getWebhooks(id);
      if (res?.data) setWebhooks(res.data);
    } catch (e) {
      console.warn('Webhooks fetch:', e.message);
    } finally {
      setLoadingWebhooks(false);
    }
  };

  const fetchAuditLogs = async () => {
    try {
      setLoadingLogs(true);
      const res = await api.getAuditLogs(id);
      const list = Array.isArray(res) ? res : res?.data || [];
      setAuditLogs(list);
    } catch (e) {
      console.warn('Audit logs fetch:', e.message);
    } finally {
      setLoadingLogs(false);
    }
  };

  // Action Handlers
  const handleUpdateEvent = async (e) => {
    e.preventDefault();
    setUpdatingEvent(true);
    setFeedback(null);
    try {
      await api.updateEvent(id, {
        title: editTitle,
        description: editDescription,
        deadline: new Date(editDeadline).toISOString(),
        minTeamSize: parseInt(editMinTeam, 10),
        maxTeamSize: parseInt(editMaxTeam, 10),
      });
      setFeedback({ type: 'success', text: 'Hackathon details successfully updated!' });
      await fetchEventDetails();
    } catch (err) {
      setFeedback({ type: 'error', text: err.message || 'Failed to update event.' });
    } finally {
      setUpdatingEvent(false);
    }
  };

  const handleAddCriterion = async (e) => {
    e.preventDefault();
    if (!newCritName.trim()) return;
    setAddingCriterion(true);
    setFeedback(null);
    try {
      await api.addCriterion(id, {
        name: newCritName.trim(),
        description: newCritDesc.trim() || undefined,
        maxScore: Number(newCritMaxScore),
        weight: Number(newCritWeight),
      });
      setNewCritName('');
      setNewCritDesc('');
      setFeedback({ type: 'success', text: 'Judging rubric criterion added!' });
      await fetchEventDetails();
    } catch (err) {
      setFeedback({ type: 'error', text: err.message || 'Failed to add criterion.' });
    } finally {
      setAddingCriterion(false);
    }
  };

  const handleAddPrize = async (e) => {
    e.preventDefault();
    if (!prizeName.trim()) return;
    setAddingPrize(true);
    setFeedback(null);
    try {
      await api.addPrize(id, {
        name: prizeName.trim(),
        description: prizeDesc.trim() || undefined,
        amount: prizeAmount ? Number(prizeAmount) : undefined,
      });
      setPrizeName('');
      setPrizeDesc('');
      setPrizeAmount('');
      setFeedback({ type: 'success', text: 'Prize track added!' });
      await fetchEventDetails();
    } catch (err) {
      setFeedback({ type: 'error', text: err.message || 'Failed to add prize.' });
    } finally {
      setAddingPrize(false);
    }
  };

  const handleAddQuestion = async (e) => {
    e.preventDefault();
    if (!questionText.trim()) return;
    setAddingQuestion(true);
    setFeedback(null);
    try {
      await api.addEventQuestion(id, {
        question: questionText.trim(),
        isRequired: questionRequired,
      });
      setQuestionText('');
      setQuestionRequired(false);
      setFeedback({ type: 'success', text: 'Registration question added!' });
      await fetchEventDetails();
    } catch (err) {
      setFeedback({ type: 'error', text: err.message || 'Failed to add question.' });
    } finally {
      setAddingQuestion(false);
    }
  };

  const handleAssignJudge = async (e) => {
    e.preventDefault();
    if (!judgeEmail.trim()) return;
    setAssigningJudge(true);
    setFeedback(null);
    try {
      await api.assignJudge(id, judgeEmail.trim());
      setFeedback({ type: 'success', text: `Judge ${judgeEmail} appointed successfully!` });
      setJudgeEmail('');
      await fetchEventDetails();
      await fetchJudgeAssignments();
    } catch (err) {
      setFeedback({ type: 'error', text: err.message || 'Failed to assign judge.' });
    } finally {
      setAssigningJudge(false);
    }
  };

  const handleAutoAssign = async (e) => {
    e.preventDefault();
    setAutoAssigning(true);
    setFeedback(null);
    try {
      await api.autoAssignJudges(id, { judgesPerSubmission: parseInt(autoJudgesPerSub, 10) });
      setFeedback({ type: 'success', text: 'Workload auto-distributed across judges evenly!' });
      await fetchJudgeAssignments();
    } catch (err) {
      setFeedback({ type: 'error', text: err.message || 'Auto-assign failed.' });
    } finally {
      setAutoAssigning(false);
    }
  };

  const handleBatchAssign = async (e) => {
    e.preventDefault();
    if (!batchEmails.trim()) return;
    setBatchAssigning(true);
    setFeedback(null);
    try {
      const emailList = batchEmails.split(/[\n,]+/).map(s => s.trim()).filter(Boolean);
      await api.batchAssignJudges(id, { judgeEmails: emailList });
      setBatchEmails('');
      setFeedback({ type: 'success', text: `Batch assigned ${emailList.length} judges!` });
      await fetchEventDetails();
      await fetchJudgeAssignments();
    } catch (err) {
      setFeedback({ type: 'error', text: err.message || 'Batch assign failed.' });
    } finally {
      setBatchAssigning(false);
    }
  };

  const handleRemoveAssignment = async (assignmentId) => {
    try {
      await api.removeJudgeAssignment(id, assignmentId);
      setFeedback({ type: 'success', text: 'Judge assignment removed.' });
      await fetchJudgeAssignments();
    } catch (err) {
      setFeedback({ type: 'error', text: err.message || 'Failed to remove assignment.' });
    }
  };

  const handleRunNormalization = async () => {
    setNormalizing(true);
    setFeedback(null);
    try {
      const res = await api.runNormalization(id);
      setFeedback({
        type: 'success',
        text: 'Z-score normalization completed across all judges and criteria!',
      });
    } catch (err) {
      setFeedback({ type: 'error', text: err.message || 'Normalization failed.' });
    } finally {
      setNormalizing(false);
    }
  };

  const handleToggleVotingSettings = async (updates) => {
    setFeedback(null);
    try {
      await api.updateVotingSettings(id, updates);
      if (updates.isVotingActive !== undefined) setIsVotingActive(updates.isVotingActive);
      if (updates.areResultsRevealed !== undefined) setAreResultsRevealed(updates.areResultsRevealed);
      setFeedback({ type: 'success', text: 'Voting settings updated successfully.' });
      await fetchCommunityResults();
    } catch (err) {
      setFeedback({ type: 'error', text: err.message || 'Failed to update voting settings.' });
    }
  };

  const handleRegisterWebhook = async (e) => {
    e.preventDefault();
    if (!webhookUrl.trim()) return;
    setRegisteringHook(true);
    setFeedback(null);
    try {
      const eventsArr = webhookEvents.split(',').map(s => s.trim()).filter(Boolean);
      await api.registerWebhook(id, {
        url: webhookUrl.trim(),
        events: eventsArr,
        secret: webhookSecret.trim() || undefined,
      });
      setWebhookUrl('');
      setWebhookSecret('');
      setFeedback({ type: 'success', text: 'Webhook successfully registered!' });
      await fetchWebhooks();
    } catch (err) {
      setFeedback({ type: 'error', text: err.message || 'Failed to register webhook.' });
    } finally {
      setRegisteringHook(false);
    }
  };

  const handleDeleteWebhook = async (whId) => {
    try {
      await api.deleteWebhook(whId);
      setFeedback({ type: 'success', text: 'Webhook deleted.' });
      await fetchWebhooks();
    } catch (err) {
      setFeedback({ type: 'error', text: err.message || 'Failed to delete webhook.' });
    }
  };

  const handleTestWebhook = async () => {
    setTestingHook(true);
    setHookTestResults(null);
    try {
      const res = await api.testWebhook(id);
      const attempts = res?.data || res || [];
      setHookTestResults(attempts);
      setFeedback({ type: 'success', text: `Dispatched test payload to ${attempts.length} endpoint(s).` });
    } catch (err) {
      setFeedback({ type: 'error', text: err.message || 'Test dispatch failed.' });
    } finally {
      setTestingHook(false);
    }
  };

  const handleBulkImportProjects = async (e) => {
    e.preventDefault();
    if (!importJson.trim()) return;
    setImporting(true);
    setFeedback(null);
    try {
      const parsed = JSON.parse(importJson);
      await api.importProjects(id, parsed);
      setImportJson('');
      setFeedback({ type: 'success', text: 'Projects and teams imported successfully!' });
      await fetchEventDetails();
    } catch (err) {
      setFeedback({ type: 'error', text: err.message || 'Invalid JSON format or import error.' });
    } finally {
      setImporting(false);
    }
  };

  const handleIssueCertificate = async (e) => {
    e.preventDefault();
    if (!certRecipientName.trim() || !certRecipientEmail.trim()) return;
    setIssuingCert(true);
    setFeedback(null);
    try {
      const res = await api.issueCertificate(id, {
        recipientName: certRecipientName.trim(),
        recipientEmail: certRecipientEmail.trim(),
        role: certRole,
        metadata: { issuedBy: event?.title, role: certRole },
      });
      const cert = res?.data || res;
      setIssuedCertId(cert.id);
      setFeedback({ type: 'success', text: `Verifiable credential issued: ${cert.id}` });
      setCertRecipientName('');
      setCertRecipientEmail('');
    } catch (err) {
      setFeedback({ type: 'error', text: err.message || 'Failed to issue certificate.' });
    } finally {
      setIssuingCert(false);
    }
  };

  if (loading || !event) {
    return <div className="py-20 text-center font-bold text-2xl text-neo-ink/50">Loading event dashboard...</div>;
  }

  const statusBadge = getStatusBadge(event.status);

  // Mock Graph Data for the specific event
  const registrationTrends = [
    { name: 'Week 1', teams: Math.floor((event._count?.teams || 0) * 0.1), submissions: 0 },
    { name: 'Week 2', teams: Math.floor((event._count?.teams || 0) * 0.3), submissions: Math.floor((event._count?.submissions || 0) * 0.1) },
    { name: 'Week 3', teams: Math.floor((event._count?.teams || 0) * 0.6), submissions: Math.floor((event._count?.submissions || 0) * 0.4) },
    { name: 'Week 4', teams: Math.floor((event._count?.teams || 0) * 0.9), submissions: Math.floor((event._count?.submissions || 0) * 0.8) },
    { name: 'Week 5', teams: event._count?.teams || 0, submissions: event._count?.submissions || 0 },
  ];

  const eventEngagement = [
    {
      name: 'Current Event',
      teams: event._count?.teams || 0,
      submissions: event._count?.submissions || 0,
    }
  ];

  const inputClass = "w-full px-4 py-3 font-bold bg-white border-3 border-neo-ink rounded-xl placeholder-neo-ink/40 neo-shadow focus:outline-none focus:neo-active transition-all";

  return (
    <div className="space-y-8 pb-16">
      {/* Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 pb-6 border-b-3 border-neo-ink">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <h1 className="text-4xl md:text-5xl font-black text-neo-ink tracking-tight uppercase">
              {event.title}
            </h1>
            <span className={`px-3 py-1 rounded-full border-3 border-neo-ink font-black text-[10px] uppercase ${event.status === 'ACTIVE' ? 'bg-neo-pastel-green' : 'bg-white'}`}>
              {statusBadge.label}
            </span>
          </div>
          <p className="text-xl font-bold text-neo-ink/70">Organizer Command Center</p>
        </div>

        <div className="flex items-center gap-3">
          <NeoButton onClick={() => navigate(`/events/${event.id}`)} color="bg-neo-ink" textColor="text-white">
            Public Page <ArrowLeft className="w-4 h-4 ml-2 rotate-135" />
          </NeoButton>
        </div>
      </div>

      {feedback && (
        <div
          className={`p-4 rounded-xl border-3 border-neo-ink font-bold text-center flex items-center justify-center gap-2 neo-shadow ${
            feedback.type === 'success' ? 'bg-neo-pastel-green' : 'bg-neo-pastel-pink'
          }`}
        >
          {feedback.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 text-neo-ink shrink-0" />
          ) : (
            <AlertCircle className="w-5 h-5 text-neo-ink shrink-0" />
          )}
          <span>{feedback.text}</span>
        </div>
      )}

      {/* DASHBOARD OVERVIEW TAB */}
      {activeTab === 'dashboard' && (
        <div className="space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <StatCard label="Registered Teams" value={event._count?.teams || 0} />
            <StatCard label="Projects Submitted" value={event._count?.submissions || 0} />
            <StatCard label="Assigned Judges" value={event.judges?.length || 0} />
            <NeoCard color="bg-neo-pastel-yellow" className="flex flex-col justify-center items-center">
              <span className="text-sm font-black uppercase text-neo-ink/70 mb-2">Leaderboard</span>
              <span className="text-2xl font-black text-neo-ink text-center">
                {event.isLeaderboardPublished ? 'PUBLISHED' : 'HIDDEN'}
              </span>
            </NeoCard>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <NeoCard color="bg-white" className="space-y-6">
              <div className="flex items-center gap-3 border-b-3 border-neo-ink pb-4">
                <TrendingUp className="w-8 h-8 text-neo-pastel-orange" />
                <h3 className="text-2xl font-black text-neo-ink">Registration Trends</h3>
              </div>
              <div className="h-80 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={registrationTrends} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#cbd5e1" />
                    <XAxis dataKey="name" stroke="#000000" tick={{ fill: '#000000', fontWeight: 'bold' }} />
                    <YAxis stroke="#000000" tick={{ fill: '#000000', fontWeight: 'bold' }} />
                    <Tooltip contentStyle={{ backgroundColor: '#fff', border: '3px solid #000', borderRadius: '12px', fontWeight: 'bold' }} />
                    <Legend wrapperStyle={{ fontWeight: 'bold' }} />
                    <Line type="monotone" dataKey="teams" stroke="#ff7e67" strokeWidth={4} activeDot={{ r: 8 }} name="Teams" />
                    <Line type="monotone" dataKey="submissions" stroke="#87c38f" strokeWidth={4} name="Submissions" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </NeoCard>

            <NeoCard color="bg-neo-bg" className="space-y-6">
              <div className="flex items-center gap-3 border-b-3 border-neo-ink pb-4">
                <BarChart2 className="w-8 h-8 text-neo-pastel-purple" />
                <h3 className="text-2xl font-black text-neo-ink">Event Engagement</h3>
              </div>
              <div className="h-80 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={eventEngagement} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#cbd5e1" />
                    <XAxis dataKey="name" stroke="#000000" tick={{ fill: '#000000', fontWeight: 'bold' }} />
                    <YAxis stroke="#000000" tick={{ fill: '#000000', fontWeight: 'bold' }} />
                    <Tooltip cursor={{ fill: 'rgba(0,0,0,0.1)' }} contentStyle={{ backgroundColor: '#fff', border: '3px solid #000', borderRadius: '12px', fontWeight: 'bold' }} />
                    <Legend wrapperStyle={{ fontWeight: 'bold' }} />
                    <Bar dataKey="teams" fill="#87c38f" name="Teams" stroke="#000" strokeWidth={2} radius={[4, 4, 0, 0]} />
                    <Bar dataKey="submissions" fill="#a78bfa" name="Submissions" stroke="#000" strokeWidth={2} radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </NeoCard>
          </div>
        </div>
      )}

      {/* MANAGE EVENT (EDIT) TAB */}
      {activeTab === 'edit' && (
        <div className="space-y-8 max-w-5xl">
          {/* Event Details Form */}
          <NeoCard color="bg-white">
            <h3 className="text-2xl font-black text-neo-ink mb-6 border-b-3 border-neo-ink pb-3 uppercase tracking-tight">
              Edit Hackathon Parameters
            </h3>
            <form onSubmit={handleUpdateEvent} className="space-y-6">
              <div>
                <label className="block font-black text-neo-ink text-sm uppercase mb-2">Title</label>
                <input
                  type="text"
                  required
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className={inputClass}
                />
              </div>

              <div>
                <label className="block font-black text-neo-ink text-sm uppercase mb-2">Description</label>
                <textarea
                  rows={4}
                  required
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  className={inputClass}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <label className="block font-black text-neo-ink text-sm uppercase mb-2">Deadline</label>
                  <input
                    type="datetime-local"
                    required
                    value={editDeadline}
                    onChange={(e) => setEditDeadline(e.target.value)}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className="block font-black text-neo-ink text-sm uppercase mb-2">Min Team Size</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={editMinTeam}
                    onChange={(e) => setEditMinTeam(e.target.value)}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className="block font-black text-neo-ink text-sm uppercase mb-2">Max Team Size</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={editMaxTeam}
                    onChange={(e) => setEditMaxTeam(e.target.value)}
                    className={inputClass}
                  />
                </div>
              </div>

              <div className="flex justify-end pt-4">
                <NeoButton type="submit" disabled={updatingEvent} color="bg-neo-ink" textColor="text-white">
                  {updatingEvent ? 'Saving...' : 'Save Hackathon Updates'}
                </NeoButton>
              </div>
            </form>
          </NeoCard>

          {/* Judging Rubric Criteria Manager */}
          <NeoCard color="bg-neo-pastel-blue">
            <h3 className="text-2xl font-black text-neo-ink mb-4 border-b-3 border-neo-ink pb-2 uppercase tracking-tight">
              Judging Rubric Criteria ({event.criteria?.length || 0})
            </h3>

            <div className="space-y-3 mb-6">
              {event.criteria?.map((c) => (
                <div key={c.id} className="p-4 bg-white rounded-xl border-3 border-neo-ink flex items-center justify-between neo-shadow-sm">
                  <div>
                    <h4 className="font-black text-lg text-neo-ink">{c.name}</h4>
                    {c.description && <p className="text-xs font-bold text-neo-ink/70">{c.description}</p>}
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-black text-xs px-2.5 py-1 bg-neo-pastel-yellow border border-neo-ink rounded-lg">
                      Max: {c.maxScore} pts
                    </span>
                    <span className="font-black text-xs px-2.5 py-1 bg-neo-pastel-green border border-neo-ink rounded-lg">
                      Weight: {c.weight}x
                    </span>
                  </div>
                </div>
              ))}
            </div>

            <form onSubmit={handleAddCriterion} className="p-4 bg-white rounded-2xl border-3 border-neo-ink space-y-4 neo-shadow">
              <h4 className="font-black text-lg text-neo-ink uppercase">Add New Rubric Criterion</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <input
                  type="text"
                  placeholder="Criterion Name (e.g. Technical Execution)"
                  value={newCritName}
                  onChange={(e) => setNewCritName(e.target.value)}
                  className={inputClass}
                  required
                />
                <input
                  type="text"
                  placeholder="Guideline description (optional)"
                  value={newCritDesc}
                  onChange={(e) => setNewCritDesc(e.target.value)}
                  className={inputClass}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-black uppercase text-neo-ink/70 block mb-1">Max Score</label>
                  <input
                    type="number"
                    min="1"
                    value={newCritMaxScore}
                    onChange={(e) => setNewCritMaxScore(e.target.value)}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className="text-xs font-black uppercase text-neo-ink/70 block mb-1">Weight Factor</label>
                  <input
                    type="number"
                    min="0.1"
                    step="0.1"
                    value={newCritWeight}
                    onChange={(e) => setNewCritWeight(e.target.value)}
                    className={inputClass}
                  />
                </div>
              </div>
              <div className="flex justify-end">
                <NeoButton type="submit" disabled={addingCriterion} color="bg-neo-ink" textColor="text-white">
                  <PlusCircle className="w-4 h-4 mr-2" /> Add Criterion
                </NeoButton>
              </div>
            </form>
          </NeoCard>

          {/* Prizes & Tracks Manager */}
          <NeoCard color="bg-neo-pastel-yellow">
            <h3 className="text-2xl font-black text-neo-ink mb-4 border-b-3 border-neo-ink pb-2 uppercase tracking-tight">
              Prizes & Bounties ({event.prizes?.length || 0})
            </h3>
            <div className="space-y-3 mb-6">
              {event.prizes?.map((p) => (
                <div key={p.id} className="p-4 bg-white rounded-xl border-3 border-neo-ink flex items-center justify-between neo-shadow-sm">
                  <div>
                    <h4 className="font-black text-lg text-neo-ink">{p.name}</h4>
                    {p.description && <p className="text-xs font-bold text-neo-ink/70">{p.description}</p>}
                  </div>
                  {p.amount && (
                    <span className="font-black text-sm px-3 py-1 bg-neo-pastel-green border-2 border-neo-ink rounded-full">
                      ${p.amount}
                    </span>
                  )}
                </div>
              ))}
            </div>

            <form onSubmit={handleAddPrize} className="p-4 bg-white rounded-2xl border-3 border-neo-ink space-y-4 neo-shadow">
              <h4 className="font-black text-lg text-neo-ink uppercase">Add Prize / Track</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <input
                  type="text"
                  placeholder="Prize Title (e.g. 1st Overall)"
                  value={prizeName}
                  onChange={(e) => setPrizeName(e.target.value)}
                  className={inputClass}
                  required
                />
                <input
                  type="text"
                  placeholder="Description or criteria"
                  value={prizeDesc}
                  onChange={(e) => setPrizeDesc(e.target.value)}
                  className={inputClass}
                />
                <input
                  type="number"
                  placeholder="Prize amount ($)"
                  value={prizeAmount}
                  onChange={(e) => setPrizeAmount(e.target.value)}
                  className={inputClass}
                />
              </div>
              <div className="flex justify-end">
                <NeoButton type="submit" disabled={addingPrize} color="bg-neo-ink" textColor="text-white">
                  <PlusCircle className="w-4 h-4 mr-2" /> Add Prize
                </NeoButton>
              </div>
            </form>
          </NeoCard>

          {/* Custom Questions Manager */}
          <NeoCard color="bg-neo-pastel-pink">
            <h3 className="text-2xl font-black text-neo-ink mb-4 border-b-3 border-neo-ink pb-2 uppercase tracking-tight">
              Registration Questions ({event.questions?.length || 0})
            </h3>
            <div className="space-y-3 mb-6">
              {event.questions?.map((q) => (
                <div key={q.id} className="p-4 bg-white rounded-xl border-3 border-neo-ink flex items-center justify-between neo-shadow-sm">
                  <span className="font-black text-base text-neo-ink">{q.question}</span>
                  <span className={`text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full border ${q.isRequired ? 'bg-neo-pastel-orange' : 'bg-gray-100'}`}>
                    {q.isRequired ? 'Required' : 'Optional'}
                  </span>
                </div>
              ))}
            </div>

            <form onSubmit={handleAddQuestion} className="p-4 bg-white rounded-2xl border-3 border-neo-ink space-y-4 neo-shadow">
              <h4 className="font-black text-lg text-neo-ink uppercase">Add Custom Question</h4>
              <div className="flex flex-col sm:flex-row items-center gap-4">
                <input
                  type="text"
                  placeholder="e.g. Provide a link to your deployment architecture diagram"
                  value={questionText}
                  onChange={(e) => setQuestionText(e.target.value)}
                  className={inputClass}
                  required
                />
                <label className="flex items-center gap-2 font-black text-sm whitespace-nowrap cursor-pointer">
                  <input
                    type="checkbox"
                    checked={questionRequired}
                    onChange={(e) => setQuestionRequired(e.target.checked)}
                    className="w-5 h-5 rounded border-2 border-neo-ink"
                  />
                  <span>Required</span>
                </label>
                <NeoButton type="submit" disabled={addingQuestion} color="bg-neo-ink" textColor="text-white" className="whitespace-nowrap">
                  Add Question
                </NeoButton>
              </div>
            </form>
          </NeoCard>
        </div>
      )}

      {/* JUDGES & WORKLOAD TAB */}
      {activeTab === 'judges' && (
        <div className="space-y-8 max-w-5xl">
          {/* Real-time Judging Progress Section */}
          <NeoCard color="bg-neo-bg">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
              <h3 className="text-2xl font-black text-neo-ink uppercase tracking-tight">
                Judging Evaluation Progress
              </h3>
              <div className="flex items-center gap-3">
                <NeoButton onClick={handleRunNormalization} disabled={normalizing} color="bg-neo-pastel-purple" textColor="text-neo-ink">
                  <RefreshCw className={`w-4 h-4 mr-2 ${normalizing ? 'animate-spin' : ''}`} />
                  {normalizing ? 'Normalizing...' : 'Calculate Z-Scores'}
                </NeoButton>
                <NeoButton onClick={() => api.downloadJudgingCsv(id, 'results')} color="bg-white" textColor="text-neo-ink">
                  <Download className="w-4 h-4 mr-2" /> Results CSV
                </NeoButton>
                <NeoButton onClick={() => api.downloadJudgingCsv(id, 'detailed')} color="bg-white" textColor="text-neo-ink">
                  <Download className="w-4 h-4 mr-2" /> Scores CSV
                </NeoButton>
              </div>
            </div>
            <JudgingProgressSection eventId={event.id} />
          </NeoCard>

          {/* Assigned Judges List */}
          <NeoCard color="bg-neo-pastel-orange">
            <h3 className="text-2xl font-black text-neo-ink mb-4 uppercase tracking-tight">
              Assigned Judges ({event.judges?.length || 0})
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              {event.judges?.map((j) => (
                <div key={j.id} className="p-4 bg-white border-3 border-neo-ink rounded-xl flex items-center justify-between neo-shadow">
                  <div>
                    <p className="font-black text-neo-ink text-lg">{j.user?.name}</p>
                    <p className="font-bold text-neo-ink/70 text-sm">{j.user?.email}</p>
                  </div>
                  <ShieldCheck className="w-6 h-6 text-neo-pastel-green" />
                </div>
              ))}
            </div>

            {/* Appoint Judge by Email */}
            <form onSubmit={handleAssignJudge} className="p-4 bg-white rounded-2xl border-3 border-neo-ink flex flex-col sm:flex-row gap-4 neo-shadow">
              <input
                type="email"
                required
                placeholder="Judge's registered email address..."
                value={judgeEmail}
                onChange={(e) => setJudgeEmail(e.target.value)}
                className={inputClass}
              />
              <NeoButton type="submit" disabled={assigningJudge} color="bg-neo-ink" textColor="text-white" className="whitespace-nowrap">
                <PlusCircle className="w-4 h-4 mr-2" />
                Appoint Judge
              </NeoButton>
            </form>
          </NeoCard>

          {/* Workload Distribution Tools */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Auto Distribute */}
            <NeoCard color="bg-white" className="space-y-4">
              <h4 className="text-xl font-black text-neo-ink uppercase">Auto-Distribute Workload</h4>
              <p className="text-sm font-bold text-neo-ink/70">
                Algorithmically balance project evaluation assignments across all active judges.
              </p>
              <form onSubmit={handleAutoAssign} className="space-y-4">
                <div>
                  <label className="text-xs font-black uppercase text-neo-ink/70 block mb-1">
                    Judges per Project
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="10"
                    value={autoJudgesPerSub}
                    onChange={(e) => setAutoJudgesPerSub(e.target.value)}
                    className={inputClass}
                  />
                </div>
                <NeoButton type="submit" disabled={autoAssigning} color="bg-neo-pastel-green" textColor="text-neo-ink" className="w-full justify-center">
                  {autoAssigning ? 'Distributing...' : 'Auto-Assign Workload'}
                </NeoButton>
              </form>
            </NeoCard>

            {/* Batch Assign */}
            <NeoCard color="bg-white" className="space-y-4">
              <h4 className="text-xl font-black text-neo-ink uppercase">Batch Assign Judges</h4>
              <p className="text-sm font-bold text-neo-ink/70">
                Enter multiple judge emails separated by comma or new line.
              </p>
              <form onSubmit={handleBatchAssign} className="space-y-4">
                <textarea
                  rows={3}
                  placeholder="judge1@example.com, judge2@example.com..."
                  value={batchEmails}
                  onChange={(e) => setBatchEmails(e.target.value)}
                  className={inputClass}
                  required
                />
                <NeoButton type="submit" disabled={batchAssigning} color="bg-neo-pastel-purple" textColor="text-neo-ink" className="w-full justify-center">
                  {batchAssigning ? 'Adding...' : 'Batch Appoint Judges'}
                </NeoButton>
              </form>
            </NeoCard>
          </div>

          {/* Judge Assignment Roster Table */}
          {assignments.length > 0 && (
            <div className="bg-white border-3 border-neo-ink rounded-2xl overflow-hidden neo-shadow-lg">
              <div className="p-4 bg-neo-bg border-b-3 border-neo-ink flex items-center justify-between font-black uppercase">
                <span>Active Project Assignments ({assignments.length})</span>
              </div>
              <div className="overflow-x-auto max-h-96">
                <table className="w-full text-left">
                  <thead className="bg-neo-bg border-b-2 border-neo-ink text-xs uppercase font-black">
                    <tr>
                      <th className="p-3">Judge</th>
                      <th className="p-3">Project Title</th>
                      <th className="p-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neo-ink/20">
                    {assignments.map((as) => (
                      <tr key={as.id} className="hover:bg-neo-bg">
                        <td className="p-3 font-bold">{as.judge?.user?.name || as.judge?.user?.email}</td>
                        <td className="p-3 font-bold">{as.submission?.title}</td>
                        <td className="p-3 text-right">
                          <button
                            onClick={() => handleRemoveAssignment(as.id)}
                            className="p-1.5 bg-neo-pastel-pink border-2 border-neo-ink rounded-lg hover:neo-active"
                            title="Remove assignment"
                          >
                            <Trash2 className="w-4 h-4 text-neo-ink" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* LEADERBOARD & COMMUNITY VOTING TAB */}
      {activeTab === 'leaderboard' && (
        <div className="space-y-8 max-w-5xl">
          {/* Voting Window Controls */}
          <NeoCard color="bg-white" className="space-y-6">
            <h3 className="text-2xl font-black text-neo-ink border-b-3 border-neo-ink pb-3 uppercase tracking-tight">
              Community Voting & Results Privacy
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="p-4 bg-neo-bg rounded-xl border-2 border-neo-ink flex items-center justify-between">
                <div>
                  <h4 className="font-black text-lg text-neo-ink">Community Voting</h4>
                  <p className="text-xs font-bold text-neo-ink/60">
                    {isVotingActive ? 'Currently accepting public votes.' : 'Voting window closed.'}
                  </p>
                </div>
                <NeoButton
                  onClick={() => handleToggleVotingSettings({ isVotingActive: !isVotingActive })}
                  color={isVotingActive ? 'bg-neo-pastel-pink' : 'bg-neo-pastel-green'}
                  textColor="text-neo-ink"
                  variant="pill"
                >
                  {isVotingActive ? 'Close Voting' : 'Open Voting'}
                </NeoButton>
              </div>

              <div className="p-4 bg-neo-bg rounded-xl border-2 border-neo-ink flex items-center justify-between">
                <div>
                  <h4 className="font-black text-lg text-neo-ink">Results Sealed State</h4>
                  <p className="text-xs font-bold text-neo-ink/60">
                    {areResultsRevealed ? 'Results publicly visible.' : 'Results sealed from non-organizers.'}
                  </p>
                </div>
                <NeoButton
                  onClick={() => handleToggleVotingSettings({ areResultsRevealed: !areResultsRevealed })}
                  color={areResultsRevealed ? 'bg-neo-pastel-yellow' : 'bg-neo-pastel-purple'}
                  textColor="text-neo-ink"
                  variant="pill"
                >
                  {areResultsRevealed ? 'Seal Results' : 'Reveal Results'}
                </NeoButton>
              </div>
            </div>
          </NeoCard>

          {/* Community Vote Rankings */}
          <div className="bg-white border-3 border-neo-ink rounded-2xl overflow-hidden neo-shadow-lg">
            <div className="p-5 bg-neo-pastel-purple border-b-3 border-neo-ink flex items-center justify-between">
              <h3 className="font-black text-2xl text-neo-ink">
                Community Voting Tally & Standings
              </h3>
              <NeoButton
                onClick={() => navigate(`/organizer/events/${event.id}/leaderboard-view`)}
                color="bg-neo-ink"
                textColor="text-white"
              >
                Official Leaderboard <ExternalLink className="w-4 h-4 ml-2" />
              </NeoButton>
            </div>

            {loadingCommunity ? (
              <div className="py-16 text-center font-bold text-neo-ink/50">
                Loading community standings...
              </div>
            ) : !communityResults?.standings || communityResults.standings.length === 0 ? (
              <div className="py-16 text-center font-bold text-neo-ink/50">
                No community votes cast for this event yet.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="bg-neo-bg border-b-3 border-neo-ink font-black uppercase text-sm">
                    <tr>
                      <th className="py-4 px-6 border-r-3 border-neo-ink text-center w-24">Rank</th>
                      <th className="py-4 px-6 border-r-3 border-neo-ink">Project Title</th>
                      <th className="py-4 px-6 border-r-3 border-neo-ink">Team</th>
                      <th className="py-4 px-6 text-right">Vote Count</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y-3 divide-neo-ink">
                    {communityResults.standings.map((st, i) => (
                      <tr key={st.submissionId || i} className="hover:bg-neo-bg">
                        <td className="py-4 px-6 border-r-3 border-neo-ink text-center font-black text-lg">
                          #{i + 1}
                        </td>
                        <td className="py-4 px-6 border-r-3 border-neo-ink font-black text-lg">
                          {st.title}
                        </td>
                        <td className="py-4 px-6 border-r-3 border-neo-ink font-bold text-sm text-neo-ink/70">
                          {st.teamName}
                        </td>
                        <td className="py-4 px-6 text-right font-black text-2xl text-neo-ink">
                          {st.voteCount} <span className="text-xs font-bold text-neo-ink/50">votes</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* DEVELOPER & TOOLS TAB */}
      {activeTab === 'developer' && (
        <div className="space-y-8 max-w-5xl">
          {/* Outbound Webhook Manager */}
          <NeoCard color="bg-white" className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b-3 border-neo-ink pb-4">
              <div className="flex items-center gap-2">
                <WebhookIcon className="w-6 h-6 text-neo-ink" />
                <h3 className="text-2xl font-black text-neo-ink uppercase">
                  Outbound Webhooks ({webhooks.length})
                </h3>
              </div>
              <NeoButton
                onClick={handleTestWebhook}
                disabled={testingHook || webhooks.length === 0}
                color="bg-neo-pastel-yellow"
                textColor="text-neo-ink"
              >
                <Send className="w-4 h-4 mr-2" />
                {testingHook ? 'Dispatching...' : 'Dispatch Test Payload'}
              </NeoButton>
            </div>

            {/* Test Results Banner */}
            {hookTestResults && (
              <div className="p-4 bg-neo-bg rounded-xl border-2 border-neo-ink space-y-2">
                <span className="font-black text-xs uppercase text-neo-ink block">
                  Delivery Dispatch Log:
                </span>
                {hookTestResults.map((r, i) => (
                  <div key={i} className="flex items-center justify-between text-xs font-bold">
                    <span className="truncate max-w-md">{r.url}</span>
                    <span className={`px-2 py-0.5 rounded border ${r.success ? 'bg-green-100 text-green-800 border-green-800' : 'bg-red-100 text-red-800 border-red-800'}`}>
                      HTTP {r.status || 'ERR'} {r.success ? 'SUCCESS' : 'FAILED'}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {/* Webhook List */}
            <div className="space-y-3">
              {loadingWebhooks ? (
                <div className="py-6 text-center font-bold text-neo-ink/50">Loading webhooks...</div>
              ) : webhooks.length === 0 ? (
                <div className="py-6 text-center font-bold text-neo-ink/50">
                  No webhooks registered for this hackathon.
                </div>
              ) : (
                webhooks.map((wh) => (
                  <div key={wh.id} className="p-4 bg-neo-bg rounded-xl border-2 border-neo-ink flex items-center justify-between gap-4">
                    <div className="overflow-hidden">
                      <p className="font-black text-base text-neo-ink font-mono truncate">{wh.url}</p>
                      <p className="text-xs font-bold text-neo-ink/60">Events: {wh.events}</p>
                    </div>
                    <button
                      onClick={() => handleDeleteWebhook(wh.id)}
                      className="p-2 bg-neo-pastel-pink border-2 border-neo-ink rounded-lg hover:neo-active shrink-0"
                      title="Delete webhook"
                    >
                      <Trash2 className="w-4 h-4 text-neo-ink" />
                    </button>
                  </div>
                ))
              )}
            </div>

            {/* Register Webhook Form */}
            <form onSubmit={handleRegisterWebhook} className="p-4 bg-neo-bg rounded-2xl border-3 border-neo-ink space-y-4">
              <h4 className="font-black text-base text-neo-ink uppercase">Register Webhook Endpoint</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <input
                  type="url"
                  placeholder="https://example.com/webhook"
                  value={webhookUrl}
                  onChange={(e) => setWebhookUrl(e.target.value)}
                  className={inputClass}
                  required
                />
                <input
                  type="text"
                  placeholder="Event topics (e.g. submission.created,vote.cast)"
                  value={webhookEvents}
                  onChange={(e) => setWebhookEvents(e.target.value)}
                  className={inputClass}
                  required
                />
              </div>
              <input
                type="text"
                placeholder="Optional HMAC Signing Secret (leave blank to auto-generate)"
                value={webhookSecret}
                onChange={(e) => setWebhookSecret(e.target.value)}
                className={inputClass}
              />
              <div className="flex justify-end">
                <NeoButton type="submit" disabled={registeringHook} color="bg-neo-ink" textColor="text-white">
                  Register Webhook
                </NeoButton>
              </div>
            </form>
          </NeoCard>

          {/* Bulk Import / Export */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <NeoCard color="bg-neo-pastel-green" className="space-y-4 flex flex-col justify-between">
              <div>
                <h4 className="text-xl font-black text-neo-ink uppercase">Export Event Bundle</h4>
                <p className="text-sm font-bold text-neo-ink/80 mt-1">
                  Download complete event schema, teams, submissions, and criteria as a structured JSON bundle.
                </p>
              </div>
              <NeoButton onClick={() => api.exportEvent(id)} color="bg-white" textColor="text-neo-ink" className="w-full justify-center">
                <Download className="w-5 h-5 mr-2" /> Download Event JSON
              </NeoButton>
            </NeoCard>

            <NeoCard color="bg-white" className="space-y-4">
              <h4 className="text-xl font-black text-neo-ink uppercase">Bulk Import Projects</h4>
              <form onSubmit={handleBulkImportProjects} className="space-y-3">
                <textarea
                  rows={3}
                  placeholder='{"projects": [{"name": "Team A", "title": "Project Alpha", ...}]}'
                  value={importJson}
                  onChange={(e) => setImportJson(e.target.value)}
                  className={`${inputClass} font-mono text-xs`}
                  required
                />
                <NeoButton type="submit" disabled={importing} color="bg-neo-ink" textColor="text-white" className="w-full justify-center">
                  {importing ? 'Importing...' : 'Upload & Import Batch'}
                </NeoButton>
              </form>
            </NeoCard>
          </div>

          {/* Verifiable Credentials Issuer */}
          <NeoCard color="bg-neo-pastel-purple" className="space-y-6">
            <div className="flex items-center gap-2 border-b-3 border-neo-ink pb-3">
              <Award className="w-6 h-6 text-neo-ink" />
              <h3 className="text-2xl font-black text-neo-ink uppercase">
                Issue Verifiable Digital Certificate
              </h3>
            </div>
            <form onSubmit={handleIssueCertificate} className="space-y-4 bg-white p-6 rounded-2xl border-3 border-neo-ink neo-shadow">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <input
                  type="text"
                  placeholder="Recipient Name"
                  value={certRecipientName}
                  onChange={(e) => setCertRecipientName(e.target.value)}
                  className={inputClass}
                  required
                />
                <input
                  type="email"
                  placeholder="Recipient Email"
                  value={certRecipientEmail}
                  onChange={(e) => setCertRecipientEmail(e.target.value)}
                  className={inputClass}
                  required
                />
                <select
                  value={certRole}
                  onChange={(e) => setCertRole(e.target.value)}
                  className={inputClass}
                >
                  <option value="JUDGE">Judge Credential</option>
                  <option value="WINNER">Winner Credential</option>
                  <option value="PARTICIPANT">Participant Credential</option>
                </select>
              </div>

              {issuedCertId && (
                <div className="p-3 bg-neo-pastel-green border-2 border-neo-ink rounded-xl flex items-center justify-between text-xs font-black">
                  <span>Issued: {issuedCertId}</span>
                  <a
                    href={`/certificates/verify/${issuedCertId}`}
                    target="_blank"
                    rel="noreferrer"
                    className="underline flex items-center gap-1"
                  >
                    View Verification Sheet <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              )}

              <div className="flex justify-end">
                <NeoButton type="submit" disabled={issuingCert} color="bg-neo-ink" textColor="text-white">
                  Issue Cryptographic Certificate
                </NeoButton>
              </div>
            </form>
          </NeoCard>

          {/* Audit Logs Trail */}
          <div className="bg-white border-3 border-neo-ink rounded-2xl overflow-hidden neo-shadow-lg">
            <div className="p-4 bg-neo-pastel-blue border-b-3 border-neo-ink flex items-center justify-between">
              <h4 className="font-black text-xl text-neo-ink uppercase">
                Immutable Event Audit Trail ({auditLogs.length})
              </h4>
              <NeoButton onClick={fetchAuditLogs} color="bg-white" textColor="text-neo-ink" variant="pill">
                <RefreshCw className="w-3.5 h-3.5 mr-1" /> Refresh
              </NeoButton>
            </div>
            {loadingLogs ? (
              <div className="py-12 text-center font-bold text-neo-ink/50">Loading audit trail...</div>
            ) : auditLogs.length === 0 ? (
              <div className="py-12 text-center font-bold text-neo-ink/50">No audit events recorded yet.</div>
            ) : (
              <div className="overflow-x-auto max-h-96">
                <table className="w-full text-left text-xs">
                  <thead className="bg-neo-bg border-b-2 border-neo-ink uppercase font-black">
                    <tr>
                      <th className="p-3">Timestamp</th>
                      <th className="p-3">Action</th>
                      <th className="p-3">Actor / IP</th>
                      <th className="p-3">Target / Details</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neo-ink/20 font-bold">
                    {auditLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-neo-bg">
                        <td className="p-3 font-mono text-neo-ink/70">{formatDate(log.timestamp || log.createdAt)}</td>
                        <td className="p-3">
                          <span className="px-2 py-0.5 bg-neo-pastel-yellow border border-neo-ink rounded font-black text-[10px]">
                            {log.action}
                          </span>
                        </td>
                        <td className="p-3 font-mono">{log.user?.email || log.ipAddress || 'System'}</td>
                        <td className="p-3 truncate max-w-xs">{log.details || log.entityId || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
