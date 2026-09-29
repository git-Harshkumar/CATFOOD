import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';
import NeoCard from '../components/neo/NeoCard';
import NeoButton from '../components/neo/NeoButton';
import StatCard from '../components/neo/StatCard';
import { getStatusBadge, formatDate, getDerivedEventStatus } from '../utils/formatters';
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
  Copy,
  Code,
  Eye,
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
  const { user } = useAuth();

  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const { showNotification } = useNotification();

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
  const [communityVotingMode, setCommunityVotingMode] = useState('AUTHENTICATED');
  const [communityVoteCreditBudget, setCommunityVoteCreditBudget] = useState(100);

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
  const [bundleJson, setBundleJson] = useState('');
  const [importingBundle, setImportingBundle] = useState(false);

  // Certificates Issuance & Management
  const [certRecipientName, setCertRecipientName] = useState('');
  const [certRecipientEmail, setCertRecipientEmail] = useState('');
  const [certRole, setCertRole] = useState('JUDGE');
  const [issuedCertId, setIssuedCertId] = useState(null);
  const [issuingCert, setIssuingCert] = useState(false);
  const [certificates, setCertificates] = useState([]);
  const [loadingCerts, setLoadingCerts] = useState(false);

  // Webhook Delivery Logs & Secret modal
  const [newlyCreatedSecret, setNewlyCreatedSecret] = useState(null);
  const [activeDeliveryWhId, setActiveDeliveryWhId] = useState(null);
  const [deliveries, setDeliveries] = useState([]);
  const [loadingDeliveries, setLoadingDeliveries] = useState(false);

  // Embed Configuration
  const [embedConfig, setEmbedConfig] = useState({
    theme: 'light',
    primaryColor: '#FFE500',
    allowVoting: true,
    showDescriptions: true,
  });
  const [savingEmbedConfig, setSavingEmbedConfig] = useState(false);

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
      fetchCertificates();
      fetchEmbedConfig();
    }
  }, [activeTab, id]);

  const fetchEventDetails = async () => {
    try {
      setLoading(true);
      const res = await api.getEventById(id);
      if (res?.data) {
        const ev = res.data;
        // Strict Authorization: If user is not the event organizer and not Admin, redirect to unauthorized
        if (user && !user.isGlobalAdmin && user.role !== 'ADMIN' && ev.organizerId && ev.organizerId !== user.id) {
          navigate('/unauthorized', { replace: true, state: { attemptedPath: location.pathname } });
          return;
        }
        setEvent(ev);
        setEditTitle(ev.title || '');
        setEditDescription(ev.description || '');
        setEditDeadline(ev.deadline ? ev.deadline.substring(0, 16) : '');
        setEditMinTeam(ev.minTeamSize || 1);
        setEditMaxTeam(ev.maxTeamSize || 4);
        setIsVotingActive(ev.isCommunityVotingOpen ?? ev.isVotingActive ?? true);
        setAreResultsRevealed(ev.isCommunityResultsRevealed ?? ev.areResultsRevealed ?? false);
        setCommunityVotingMode(ev.communityVotingMode || 'AUTHENTICATED');
        setCommunityVoteCreditBudget(ev.communityVoteCreditBudget ?? 100);
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

  const fetchCertificates = async () => {
    try {
      setLoadingCerts(true);
      const res = await api.getEventCertificates(id);
      const list = res?.data || res || [];
      setCertificates(Array.isArray(list) ? list : []);
    } catch (e) {
      console.warn('Certificates fetch:', e.message);
    } finally {
      setLoadingCerts(false);
    }
  };

  const handleRevokeCert = async (certId) => {
    const reason = window.prompt('Enter reason for revoking this certificate:');
    if (reason === null) return;
    try {
      await api.revokeCertificate(certId, reason);
      showNotification('success', 'Certificate revoked successfully.');
      await fetchCertificates();
    } catch (err) {
      showNotification('error', err.message || 'Failed to revoke certificate.');
    }
  };

  const handleViewDeliveries = async (whId) => {
    if (activeDeliveryWhId === whId) {
      setActiveDeliveryWhId(null);
      return;
    }
    setActiveDeliveryWhId(whId);
    setLoadingDeliveries(true);
    try {
      const res = await api.getWebhookDeliveries(whId);
      setDeliveries(res?.data || res || []);
    } catch (err) {
      showNotification('error', err.message || 'Failed to fetch delivery logs.');
    } finally {
      setLoadingDeliveries(false);
    }
  };

  const fetchEmbedConfig = async () => {
    try {
      const res = await api.getEmbedConfig(id);
      if (res?.data) {
        setEmbedConfig(res.data);
      }
    } catch (e) {
      console.warn('Embed config fetch:', e.message);
    }
  };

  const handleSaveEmbedConfig = async (e) => {
    e.preventDefault();
    setSavingEmbedConfig(true);
    try {
      await api.updateEmbedConfig(id, embedConfig);
      showNotification('success', 'Embed gallery configuration saved.');
    } catch (err) {
      showNotification('error', err.message || 'Failed to save embed config.');
    } finally {
      setSavingEmbedConfig(false);
    }
  };

  const handleImportBundle = async (e) => {
    e.preventDefault();
    if (!bundleJson.trim()) return;
    setImportingBundle(true);
    try {
      const parsed = JSON.parse(bundleJson);
      await api.importEventBundle(parsed);
      setBundleJson('');
      showNotification('success', 'Event bundle imported successfully!');
      await fetchEventDetails();
    } catch (err) {
      showNotification('error', err.message || 'Failed to import event bundle.');
    } finally {
      setImportingBundle(false);
    }
  };

  // Action Handlers
  const handleUpdateEvent = async (e) => {
    e.preventDefault();
    setUpdatingEvent(true);
    try {
      await api.updateEvent(id, {
        title: editTitle,
        description: editDescription,
        deadline: new Date(editDeadline).toISOString(),
        minTeamSize: parseInt(editMinTeam, 10),
        maxTeamSize: parseInt(editMaxTeam, 10),
      });
      showNotification('success', 'Hackathon details successfully updated!');
      await fetchEventDetails();
    } catch (err) {
      showNotification('error', err.message || 'Failed to update event.');
    } finally {
      setUpdatingEvent(false);
    }
  };

  const handleDeleteCriterion = async (criterionId) => {
    try {
      await api.deleteCriterion(id, criterionId);
      showNotification('success', 'Criterion deleted!');
      await fetchEventDetails();
    } catch (err) {
      showNotification('error', err.message || 'Failed to delete criterion.');
    }
  };

  const handleDeletePrize = async (prizeId) => {
    try {
      await api.deletePrize(id, prizeId);
      showNotification('success', 'Prize deleted!');
      await fetchEventDetails();
    } catch (err) {
      showNotification('error', err.message || 'Failed to delete prize.');
    }
  };

  const handleDeleteQuestion = async (questionId) => {
    try {
      await api.deleteEventQuestion(id, questionId);
      showNotification('success', 'Question deleted!');
      await fetchEventDetails();
    } catch (err) {
      showNotification('error', err.message || 'Failed to delete question.');
    }
  };

  const handleAddCriterion = async (e) => {
    e.preventDefault();
    if (!newCritName.trim()) return;
    setAddingCriterion(true);
    try {
      await api.addCriterion(id, {
        name: newCritName.trim(),
        description: newCritDesc.trim() || undefined,
        maxScore: Number(newCritMaxScore),
        weight: Number(newCritWeight),
      });
      setNewCritName('');
      setNewCritDesc('');
      showNotification('success', 'Judging rubric criterion added!');
      await fetchEventDetails();
    } catch (err) {
      showNotification('error', err.message || 'Failed to add criterion.');
    } finally {
      setAddingCriterion(false);
    }
  };

  const handleAddPrize = async (e) => {
    e.preventDefault();
    if (!prizeName.trim()) return;
    setAddingPrize(true);
    try {
      await api.addPrize(id, {
        name: prizeName.trim(),
        description: prizeDesc.trim() || undefined,
        value: prizeAmount ? String(prizeAmount) : undefined,
      });
      setPrizeName('');
      setPrizeDesc('');
      setPrizeAmount('');
      showNotification('success', 'Prize track added!');
      await fetchEventDetails();
    } catch (err) {
      showNotification('error', err.message || 'Failed to add prize.');
    } finally {
      setAddingPrize(false);
    }
  };

  const handleAddQuestion = async (e) => {
    e.preventDefault();
    if (!questionText.trim()) return;
    setAddingQuestion(true);
    try {
      await api.addEventQuestion(id, {
        question: questionText.trim(),
        isRequired: questionRequired,
      });
      setQuestionText('');
      setQuestionRequired(false);
      showNotification('success', 'Registration question added!');
      await fetchEventDetails();
    } catch (err) {
      showNotification('error', err.message || 'Failed to add question.');
    } finally {
      setAddingQuestion(false);
    }
  };

  const handleAssignJudge = async (e) => {
    e.preventDefault();
    if (!judgeEmail.trim()) return;
    setAssigningJudge(true);
    try {
      await api.assignJudge(id, judgeEmail.trim());
      showNotification('success', `Judge ${judgeEmail} appointed successfully!`);
      setJudgeEmail('');
      await fetchEventDetails();
      await fetchJudgeAssignments();
    } catch (err) {
      showNotification('error', err.message || 'Failed to assign judge.');
    } finally {
      setAssigningJudge(false);
    }
  };

  const handleAutoAssign = async (e) => {
    e.preventDefault();
    setAutoAssigning(true);
    try {
      await api.autoAssignJudges(id, { judgesPerSubmission: parseInt(autoJudgesPerSub, 10) });
      showNotification('success', 'Workload auto-distributed across judges evenly!');
      await fetchJudgeAssignments();
    } catch (err) {
      showNotification('error', err.message || 'Auto-assign failed.');
    } finally {
      setAutoAssigning(false);
    }
  };

  const handleBatchAssign = async (e) => {
    e.preventDefault();
    if (!batchEmails.trim()) return;
    setBatchAssigning(true);
    try {
      const emailList = batchEmails.split(/[\n,]+/).map(s => s.trim()).filter(Boolean);
      await api.batchAssignJudges(id, { judgeEmails: emailList });
      setBatchEmails('');
      showNotification('success', `Batch assigned ${emailList.length} judges!`);
      await fetchEventDetails();
      await fetchJudgeAssignments();
    } catch (err) {
      showNotification('error', err.message || 'Batch assign failed.');
    } finally {
      setBatchAssigning(false);
    }
  };

  const handleRemoveAssignment = async (assignmentId) => {
    try {
      await api.removeJudgeAssignment(id, assignmentId);
      showNotification('success', 'Judge assignment removed.');
      await fetchJudgeAssignments();
    } catch (err) {
      showNotification('error', err.message || 'Failed to remove assignment.');
    }
  };

  const handleRunNormalization = async () => {
    setNormalizing(true);
    try {
      const res = await api.runNormalization(id);
      showNotification('success', 'Z-score normalization completed across all judges and criteria!');
    } catch (err) {
      showNotification('error', err.message || 'Normalization failed.');
    } finally {
      setNormalizing(false);
    }
  };

  const handleToggleVotingSettings = async (updates) => {
    try {
      const canonicalUpdates = {
        isCommunityVotingOpen: updates.isCommunityVotingOpen !== undefined ? updates.isCommunityVotingOpen : updates.isVotingActive,
        isCommunityResultsRevealed: updates.isCommunityResultsRevealed !== undefined ? updates.isCommunityResultsRevealed : updates.areResultsRevealed,
        communityVotingMode: updates.communityVotingMode !== undefined ? updates.communityVotingMode : communityVotingMode,
        communityVoteCreditBudget: updates.communityVoteCreditBudget !== undefined ? parseInt(updates.communityVoteCreditBudget, 10) : undefined,
      };
      await api.updateVotingSettings(id, canonicalUpdates);
      if (canonicalUpdates.isCommunityVotingOpen !== undefined) setIsVotingActive(canonicalUpdates.isCommunityVotingOpen);
      if (canonicalUpdates.isCommunityResultsRevealed !== undefined) setAreResultsRevealed(canonicalUpdates.isCommunityResultsRevealed);
      if (canonicalUpdates.communityVotingMode !== undefined) setCommunityVotingMode(canonicalUpdates.communityVotingMode);
      if (canonicalUpdates.communityVoteCreditBudget !== undefined && !isNaN(canonicalUpdates.communityVoteCreditBudget)) {
        setCommunityVoteCreditBudget(canonicalUpdates.communityVoteCreditBudget);
      }
      showNotification('success', 'Voting settings updated successfully.');
      await fetchCommunityResults();
    } catch (err) {
      showNotification('error', err.message || 'Failed to update voting settings.');
    }
  };

  const handleRegisterWebhook = async (e) => {
    e.preventDefault();
    if (!webhookUrl.trim()) return;
    setRegisteringHook(true);
    try {
      const eventsArr = webhookEvents.split(',').map(s => s.trim()).filter(Boolean);
      const res = await api.registerWebhook(id, {
        url: webhookUrl.trim(),
        events: eventsArr,
        secret: webhookSecret.trim() || undefined,
      });
      const created = res?.data || res;
      if (created?.secret) {
        setNewlyCreatedSecret(created.secret);
      }
      setWebhookUrl('');
      setWebhookSecret('');
      showNotification('success', 'Webhook successfully registered!');
      await fetchWebhooks();
    } catch (err) {
      showNotification('error', err.message || 'Failed to register webhook.');
    } finally {
      setRegisteringHook(false);
    }
  };

  const handleDeleteWebhook = async (whId) => {
    try {
      await api.deleteWebhook(whId);
      showNotification('success', 'Webhook deleted.');
      await fetchWebhooks();
    } catch (err) {
      showNotification('error', err.message || 'Failed to delete webhook.');
    }
  };

  const handleTestWebhook = async () => {
    setTestingHook(true);
    setHookTestResults(null);
    try {
      const res = await api.testWebhook(id);
      const attempts = res?.data || res || [];
      setHookTestResults(attempts);
      showNotification('success', `Dispatched test payload to ${attempts.length} endpoint(s).`);
    } catch (err) {
      showNotification('error', err.message || 'Test dispatch failed.');
    } finally {
      setTestingHook(false);
    }
  };

  const handleBulkImportProjects = async (e) => {
    e.preventDefault();
    if (!importJson.trim()) return;
    setImporting(true);
    try {
      const parsed = JSON.parse(importJson);
      await api.importProjects(id, parsed);
      setImportJson('');
      showNotification('success', 'Projects and teams imported successfully!');
      await fetchEventDetails();
    } catch (err) {
      showNotification('error', err.message || 'Invalid JSON format or import error.');
    } finally {
      setImporting(false);
    }
  };

  const handleIssueCertificate = async (e) => {
    e.preventDefault();
    if (!certRecipientName.trim() || !certRecipientEmail.trim()) return;
    setIssuingCert(true);
    try {
      const res = await api.issueCertificate(id, {
        recipientName: certRecipientName.trim(),
        recipientEmail: certRecipientEmail.trim(),
        role: certRole,
        metadata: { issuedBy: event?.title, role: certRole },
      });
      const cert = res?.data || res;
      setIssuedCertId(cert.id);
      showNotification('success', `Verifiable credential issued: ${cert.id}`);
      setCertRecipientName('');
      setCertRecipientEmail('');
      await fetchCertificates();
    } catch (err) {
      showNotification('error', err.message || 'Failed to issue certificate.');
    } finally {
      setIssuingCert(false);
    }
  };

  if (loading || !event) {
    return <div className="py-20 text-center font-bold text-2xl text-neo-ink/50">Loading event dashboard...</div>;
  }

  const derivedStatus = getDerivedEventStatus(event);
  const statusBadge = getStatusBadge(derivedStatus);

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
            <span className={`px-3 py-1 rounded-full border-3 border-neo-ink font-black text-[10px] uppercase ${derivedStatus === 'ACTIVE' ? 'bg-neo-pastel-green' : 'bg-white'}`}>
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
                    <button onClick={() => handleDeleteCriterion(c.id)} className="p-1.5 bg-neo-pastel-pink border-2 border-neo-ink rounded-lg hover:neo-active text-neo-ink" title="Delete Criterion">
                      <Trash2 className="w-4 h-4" />
                    </button>
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
                  <div className="flex items-center gap-3">
                    {p.value && (
                      <span className="font-black text-sm px-3 py-1 bg-neo-pastel-green border-2 border-neo-ink rounded-full">
                        ${p.value}
                      </span>
                    )}
                    <button onClick={() => handleDeletePrize(p.id)} className="p-1.5 bg-neo-pastel-pink border-2 border-neo-ink rounded-lg hover:neo-active text-neo-ink" title="Delete Prize">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
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
                  <div className="flex items-center gap-2">
                    <span className="font-black text-base text-neo-ink">{q.question}</span>
                    <span className={`text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full border ${q.isRequired ? 'bg-neo-pastel-orange' : 'bg-gray-100'}`}>
                      {q.isRequired ? 'Required' : 'Optional'}
                    </span>
                  </div>
                  <button onClick={() => handleDeleteQuestion(q.id)} className="p-1.5 bg-neo-pastel-pink border-2 border-neo-ink rounded-lg hover:neo-active text-neo-ink" title="Delete Question">
                    <Trash2 className="w-4 h-4" />
                  </button>
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
                    {isVotingActive ? 'Currently accepting community votes.' : 'Voting window closed.'}
                  </p>
                </div>
                <NeoButton
                  onClick={() => handleToggleVotingSettings({ isCommunityVotingOpen: !isVotingActive })}
                  color={isVotingActive ? 'bg-neo-pastel-pink' : 'bg-neo-pastel-green'}
                  textColor="text-neo-ink"
                  variant="pill"
                >
                  {isVotingActive ? 'Close Voting' : 'Open Voting'}
                </NeoButton>
              </div>

              <div className="p-4 bg-neo-bg rounded-xl border-2 border-neo-ink flex items-center justify-between">
                <div>
                  <h4 className="font-black text-lg text-neo-ink">Results Visibility</h4>
                  <p className="text-xs font-bold text-neo-ink/60">
                    {areResultsRevealed ? 'Results publicly visible.' : 'Results sealed from non-organizers.'}
                  </p>
                </div>
                <NeoButton
                  onClick={() => handleToggleVotingSettings({ isCommunityResultsRevealed: !areResultsRevealed })}
                  color={areResultsRevealed ? 'bg-neo-pastel-yellow' : 'bg-neo-pastel-purple'}
                  textColor="text-neo-ink"
                  variant="pill"
                >
                  {areResultsRevealed ? 'Seal Results' : 'Reveal Results'}
                </NeoButton>
              </div>
            </div>

            {/* Voting Mode Configuration */}
            <div className="p-5 bg-neo-bg rounded-xl border-2 border-neo-ink space-y-4">
              <div>
                <h4 className="font-black text-lg text-neo-ink">Community Voting Identity Mode</h4>
                <p className="text-xs font-bold text-neo-ink/60">Select identity assurance level required to cast community votes.</p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div
                  onClick={() => handleToggleVotingSettings({ communityVotingMode: 'OPEN' })}
                  className={`p-4 rounded-xl border-3 border-neo-ink cursor-pointer transition-all ${
                    communityVotingMode === 'OPEN' ? 'bg-neo-pastel-yellow shadow-neo' : 'bg-white hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-black text-base text-neo-ink">OPEN</span>
                    {communityVotingMode === 'OPEN' && <span className="text-[10px] font-black px-2 py-0.5 bg-neo-ink text-white rounded">ACTIVE</span>}
                  </div>
                  <p className="text-xs font-bold text-neo-ink/70">
                    Lowest identity assurance. Anonymous voters receive unique server-issued voter tokens with rate limiting.
                  </p>
                </div>

                <div
                  onClick={() => handleToggleVotingSettings({ communityVotingMode: 'EMAIL' })}
                  className={`p-4 rounded-xl border-3 border-neo-ink cursor-pointer transition-all ${
                    communityVotingMode === 'EMAIL' ? 'bg-neo-pastel-yellow shadow-neo' : 'bg-white hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-black text-base text-neo-ink">EMAIL</span>
                    {communityVotingMode === 'EMAIL' && <span className="text-[10px] font-black px-2 py-0.5 bg-neo-ink text-white rounded">ACTIVE</span>}
                  </div>
                  <p className="text-xs font-bold text-neo-ink/70">
                    Requires verified email ownership. Voters must verify a short-lived cryptographically secure token.
                  </p>
                </div>

                <div
                  onClick={() => handleToggleVotingSettings({ communityVotingMode: 'AUTHENTICATED' })}
                  className={`p-4 rounded-xl border-3 border-neo-ink cursor-pointer transition-all ${
                    communityVotingMode === 'AUTHENTICATED' ? 'bg-neo-pastel-yellow shadow-neo' : 'bg-white hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-black text-base text-neo-ink">AUTHENTICATED</span>
                    {communityVotingMode === 'AUTHENTICATED' && <span className="text-[10px] font-black px-2 py-0.5 bg-neo-ink text-white rounded">ACTIVE</span>}
                  </div>
                  <p className="text-xs font-bold text-neo-ink/70">
                    Requires authenticated platform account. Enforces verified user ID and strict self-voting prevention.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-4 pt-2 border-t-2 border-neo-ink/10 flex-wrap">
                <label className="font-black text-sm text-neo-ink">Quadratic Credit Budget per Voter:</label>
                <input
                  type="number"
                  min="1"
                  max="10000"
                  value={communityVoteCreditBudget}
                  onChange={(e) => setCommunityVoteCreditBudget(e.target.value)}
                  className="w-28 px-3 py-1.5 rounded-lg border-2 border-neo-ink bg-white font-bold text-sm text-neo-ink"
                />
                <NeoButton
                  onClick={() => handleToggleVotingSettings({ communityVoteCreditBudget })}
                  color="bg-neo-pastel-green"
                  textColor="text-neo-ink"
                  variant="pill"
                  className="!py-1.5 !px-4 text-xs font-black"
                >
                  Update Credit Budget
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

            {/* Newly Created Secret Banner (shown only once) */}
            {newlyCreatedSecret && (
              <div className="p-4 bg-neo-pastel-yellow border-3 border-neo-ink rounded-2xl space-y-2 neo-shadow">
                <div className="flex items-center justify-between">
                  <span className="font-black text-xs uppercase text-neo-ink flex items-center gap-1.5">
                    <Key className="w-4 h-4" /> Webhook Signing Secret Generated
                  </span>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(newlyCreatedSecret);
                      showNotification('success', 'Secret copied to clipboard!');
                    }}
                    className="px-3 py-1 bg-white border-2 border-neo-ink rounded-lg font-black text-xs hover:neo-active flex items-center gap-1"
                  >
                    <Copy className="w-3.5 h-3.5" /> Copy Secret
                  </button>
                </div>
                <p className="font-mono text-xs font-black bg-white p-2 border-2 border-neo-ink rounded-lg break-all">
                  {newlyCreatedSecret}
                </p>
                <p className="text-[11px] font-bold text-neo-ink/80">
                  CRITICAL: Save this secret now. For security purposes, catfood will never display this secret again.
                </p>
              </div>
            )}

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
                  <div key={wh.id} className="p-4 bg-neo-bg rounded-xl border-2 border-neo-ink space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="overflow-hidden">
                        <div className="flex items-center gap-2">
                          <p className="font-black text-base text-neo-ink font-mono truncate">{wh.url}</p>
                          <span className={`px-2 py-0.5 rounded border font-mono text-[10px] font-black ${wh.isActive ? 'bg-green-100 text-green-800 border-green-800' : 'bg-red-100 text-red-800 border-red-800'}`}>
                            {wh.isActive ? 'ACTIVE' : 'SUSPENDED'}
                          </span>
                          {wh.failureCount > 0 && (
                            <span className="px-2 py-0.5 bg-neo-pastel-pink border border-neo-ink rounded text-[10px] font-black">
                              {wh.failureCount} Failures
                            </span>
                          )}
                        </div>
                        <p className="text-xs font-bold text-neo-ink/60 mt-1">Events: {wh.events}</p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          onClick={() => handleViewDeliveries(wh.id)}
                          className="px-3 py-1.5 bg-white border-2 border-neo-ink rounded-lg font-black text-xs hover:neo-active flex items-center gap-1.5"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          {activeDeliveryWhId === wh.id ? 'Hide Deliveries' : 'Delivery Logs'}
                        </button>
                        <button
                          onClick={() => handleDeleteWebhook(wh.id)}
                          className="p-2 bg-neo-pastel-pink border-2 border-neo-ink rounded-lg hover:neo-active shrink-0"
                          title="Delete webhook"
                        >
                          <Trash2 className="w-4 h-4 text-neo-ink" />
                        </button>
                      </div>
                    </div>

                    {/* Deliveries Drawer */}
                    {activeDeliveryWhId === wh.id && (
                      <div className="mt-3 p-3 bg-white border-2 border-neo-ink rounded-xl space-y-2">
                        <span className="font-black text-xs uppercase text-neo-ink block border-b pb-1">
                          Recent Deliveries for Hook #{wh.id}
                        </span>
                        {loadingDeliveries ? (
                          <p className="text-xs font-bold text-neo-ink/50 py-2">Loading deliveries...</p>
                        ) : deliveries.length === 0 ? (
                          <p className="text-xs font-bold text-neo-ink/50 py-2">No delivery attempts recorded yet.</p>
                        ) : (
                          <div className="overflow-x-auto max-h-48 text-xs">
                            <table className="w-full text-left font-mono">
                              <thead>
                                <tr className="border-b text-[10px] text-neo-ink/60">
                                  <th className="pb-1">Time</th>
                                  <th className="pb-1">Event</th>
                                  <th className="pb-1">Status</th>
                                  <th className="pb-1">Duration</th>
                                  <th className="pb-1">Attempts</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-neo-ink/10">
                                {deliveries.map((d) => (
                                  <tr key={d.id}>
                                    <td className="py-1 text-neo-ink/70">{formatDate(d.createdAt)}</td>
                                    <td className="py-1 font-bold">{d.eventType}</td>
                                    <td className="py-1">
                                      <span className={`px-1.5 py-0.5 rounded text-[10px] ${d.status === 'DELIVERED' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                        {d.status} ({d.responseStatus || 'N/A'})
                                      </span>
                                    </td>
                                    <td className="py-1">{d.durationMs}ms</td>
                                    <td className="py-1">{d.attempts}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>
                    )}
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

          {/* Embeddable Public Gallery Widget */}
          <NeoCard color="bg-white" className="space-y-6">
            <div className="flex items-center gap-2 border-b-3 border-neo-ink pb-3">
              <Code className="w-6 h-6 text-neo-ink" />
              <h3 className="text-2xl font-black text-neo-ink uppercase">
                Embeddable Public Gallery
              </h3>
            </div>

            <form onSubmit={handleSaveEmbedConfig} className="bg-neo-bg p-4 rounded-2xl border-2 border-neo-ink space-y-4">
              <h4 className="font-black text-sm uppercase text-neo-ink">Widget Configuration</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-black uppercase text-neo-ink mb-1">Color Theme</label>
                  <select
                    value={embedConfig.theme || 'light'}
                    onChange={(e) => setEmbedConfig({ ...embedConfig, theme: e.target.value })}
                    className={inputClass}
                  >
                    <option value="light">Light Mode</option>
                    <option value="dark">Dark Mode</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-black uppercase text-neo-ink mb-1">Accent Color (Hex)</label>
                  <input
                    type="text"
                    value={embedConfig.primaryColor || '#FFE500'}
                    onChange={(e) => setEmbedConfig({ ...embedConfig, primaryColor: e.target.value })}
                    className={inputClass}
                  />
                </div>
              </div>

              <div className="flex gap-6 text-sm font-bold">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={embedConfig.allowVoting !== false}
                    onChange={(e) => setEmbedConfig({ ...embedConfig, allowVoting: e.target.checked })}
                    className="w-4 h-4"
                  />
                  <span>Allow Direct Community Voting</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={embedConfig.showDescriptions !== false}
                    onChange={(e) => setEmbedConfig({ ...embedConfig, showDescriptions: e.target.checked })}
                    className="w-4 h-4"
                  />
                  <span>Display Project Descriptions</span>
                </label>
              </div>

              <div className="flex justify-end">
                <NeoButton type="submit" disabled={savingEmbedConfig} color="bg-neo-pastel-green" textColor="text-neo-ink">
                  Save Widget Settings
                </NeoButton>
              </div>
            </form>

            {/* Generated Code Snippets */}
            <div className="space-y-4">
              <div className="p-4 bg-neo-bg rounded-2xl border-2 border-neo-ink space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-black text-xs uppercase text-neo-ink">
                    1. Responsive Iframe Snippet
                  </span>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(`<iframe src="${window.location.origin}/api/embed/gallery/${id}" width="100%" height="800" frameborder="0"></iframe>`);
                      showNotification('success', 'Iframe code copied!');
                    }}
                    className="px-2.5 py-1 bg-white border border-neo-ink rounded text-xs font-bold hover:neo-active flex items-center gap-1"
                  >
                    <Copy className="w-3 h-3" /> Copy
                  </button>
                </div>
                <pre className="p-3 bg-white border border-neo-ink rounded font-mono text-xs overflow-x-auto text-neo-ink">
                  {`<iframe src="${window.location.origin}/api/embed/gallery/${id}" width="100%" height="800" frameborder="0"></iframe>`}
                </pre>
              </div>

              <div className="p-4 bg-neo-bg rounded-2xl border-2 border-neo-ink space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-black text-xs uppercase text-neo-ink">
                    2. Dynamic JavaScript Tag Widget
                  </span>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(`<div id="catfood-gallery"></div>\n<script src="${window.location.origin}/embed/gallery.js" data-event-id="${id}" data-target="#catfood-gallery"></script>`);
                      showNotification('success', 'Script tag copied!');
                    }}
                    className="px-2.5 py-1 bg-white border border-neo-ink rounded text-xs font-bold hover:neo-active flex items-center gap-1"
                  >
                    <Copy className="w-3 h-3" /> Copy
                  </button>
                </div>
                <pre className="p-3 bg-white border border-neo-ink rounded font-mono text-xs overflow-x-auto text-neo-ink">
                  {`<div id="catfood-gallery"></div>\n<script src="${window.location.origin}/embed/gallery.js" data-event-id="${id}" data-target="#catfood-gallery"></script>`}
                </pre>
              </div>
            </div>
          </NeoCard>

          {/* Bulk Import / Export */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <NeoCard color="bg-neo-pastel-green" className="space-y-4 flex flex-col justify-between">
              <div>
                <h4 className="text-xl font-black text-neo-ink uppercase">Export Event Bundle</h4>
                <p className="text-sm font-bold text-neo-ink/80 mt-1">
                  Download complete event schema, teams, submissions, and criteria as a structured JSON bundle, or export judging CSV with formula injection defense.
                </p>
              </div>
              <div className="space-y-2">
                <NeoButton onClick={() => api.exportEvent(id)} color="bg-white" textColor="text-neo-ink" className="w-full justify-center">
                  <Download className="w-5 h-5 mr-2" /> Download Event Bundle JSON
                </NeoButton>
                <NeoButton onClick={() => api.exportJudgingCsv(id, 'submissions')} color="bg-neo-bg" textColor="text-neo-ink" className="w-full justify-center">
                  <Download className="w-5 h-5 mr-2" /> Export Judging CSV
                </NeoButton>
              </div>
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

          {/* Event Bundle Full Restore / Migration */}
          <NeoCard color="bg-neo-pastel-blue" className="space-y-4">
            <h4 className="text-xl font-black text-neo-ink uppercase">Restore Full Event Bundle</h4>
            <p className="text-sm font-bold text-neo-ink/80">
              Import a complete <span className="font-mono">catfood-event-bundle</span> export. All tracks, criteria, teams, and submissions are imported within an atomic database transaction.
            </p>
            <form onSubmit={handleImportBundle} className="space-y-3">
              <textarea
                rows={3}
                placeholder='Paste raw JSON of catfood-event-bundle export here...'
                value={bundleJson}
                onChange={(e) => setBundleJson(e.target.value)}
                className={`${inputClass} font-mono text-xs`}
                required
              />
              <div className="flex justify-end">
                <NeoButton type="submit" disabled={importingBundle} color="bg-neo-ink" textColor="text-white">
                  {importingBundle ? 'Restoring Bundle...' : 'Import Event Bundle'}
                </NeoButton>
              </div>
            </form>
          </NeoCard>

          {/* Verifiable Credentials Issuer & Registry */}
          <NeoCard color="bg-neo-pastel-purple" className="space-y-6">
            <div className="flex items-center gap-2 border-b-3 border-neo-ink pb-3">
              <Award className="w-6 h-6 text-neo-ink" />
              <h3 className="text-2xl font-black text-neo-ink uppercase">
                Verifiable Digital Credentials & Registry
              </h3>
            </div>

            {/* Issuance Form */}
            <form onSubmit={handleIssueCertificate} className="space-y-4 bg-white p-6 rounded-2xl border-3 border-neo-ink neo-shadow">
              <h4 className="font-black text-base uppercase text-neo-ink">Issue New Credential</h4>
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

            {/* Certificates Registry List */}
            <div className="bg-white p-4 rounded-2xl border-3 border-neo-ink space-y-3">
              <div className="flex items-center justify-between border-b-2 border-neo-ink pb-2">
                <h4 className="font-black text-base uppercase text-neo-ink">
                  Issued Event Certificates ({certificates.length})
                </h4>
                <button
                  onClick={fetchCertificates}
                  className="px-2.5 py-1 bg-neo-bg border border-neo-ink rounded text-xs font-bold hover:neo-active flex items-center gap-1"
                >
                  <RefreshCw className="w-3 h-3" /> Refresh
                </button>
              </div>

              {loadingCerts ? (
                <p className="text-center font-bold text-sm text-neo-ink/50 py-4">Loading certificates...</p>
              ) : certificates.length === 0 ? (
                <p className="text-center font-bold text-sm text-neo-ink/50 py-4">No certificates issued yet.</p>
              ) : (
                <div className="overflow-x-auto text-xs">
                  <table className="w-full text-left font-bold">
                    <thead>
                      <tr className="border-b-2 border-neo-ink uppercase text-[10px] text-neo-ink/60">
                        <th className="p-2">ID</th>
                        <th className="p-2">Recipient</th>
                        <th className="p-2">Role</th>
                        <th className="p-2">Status</th>
                        <th className="p-2 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neo-ink/10">
                      {certificates.map((c) => (
                        <tr key={c.id}>
                          <td className="p-2 font-mono text-xs">
                            <a
                              href={`/certificates/verify/${c.id}`}
                              target="_blank"
                              rel="noreferrer"
                              className="underline hover:text-neo-ink"
                            >
                              {c.id}
                            </a>
                          </td>
                          <td className="p-2">{c.recipientName}</td>
                          <td className="p-2">
                            <span className="px-2 py-0.5 bg-neo-pastel-yellow border border-neo-ink rounded text-[10px] uppercase">
                              {c.role}
                            </span>
                          </td>
                          <td className="p-2">
                            <span className={`px-2 py-0.5 rounded border text-[10px] uppercase ${c.status === 'ACTIVE' ? 'bg-green-100 text-green-800 border-green-800' : 'bg-red-100 text-red-800 border-red-800'}`}>
                              {c.status}
                            </span>
                          </td>
                          <td className="p-2 text-right space-x-2">
                            <a
                              href={`/api/certificates/${c.id}/artifact`}
                              target="_blank"
                              rel="noreferrer"
                              className="px-2 py-1 bg-neo-bg border border-neo-ink rounded text-[10px] hover:neo-active inline-block"
                            >
                              SVG Artifact
                            </a>
                            {c.status === 'ACTIVE' && (
                              <button
                                onClick={() => handleRevokeCert(c.id)}
                                className="px-2 py-1 bg-neo-pastel-pink border border-neo-ink rounded text-[10px] hover:neo-active inline-block"
                              >
                                Revoke
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
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
