import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';
import NeoCard from '../components/neo/NeoCard';
import NeoButton from '../components/neo/NeoButton';
import AvatarStack from '../components/neo/AvatarStack';
import { EventImage } from '../components/EventImage';
import {
  ArrowLeft,
  Github,
  Globe,
  Video,
  Heart,
  MessageSquare,
  Users,
  Award,
  Send,
  AlertCircle,
  CheckCircle2,
  Calendar,
  Layers,
  HelpCircle,
  Lock,
} from 'lucide-react';
import { formatDate } from '../utils/formatters';
import { isEventJudge } from '../utils/permissions';

export const SubmissionDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [submission, setSubmission] = useState(null);
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(true);
  const [commentSubmitting, setCommentSubmitting] = useState(false);
  const [voting, setVoting] = useState(false);
  const { showNotification } = useNotification();

  useEffect(() => {
    fetchSubmissionData();
  }, [id]);

  const fetchSubmissionData = async () => {
    try {
      setLoading(true);
      const subRes = await api.getSubmissionById(id);
      if (subRes?.data) {
        setSubmission(subRes.data);
      }

      // Fetch comments for this project
      try {
        const commRes = await api.getComments(id);
        const list = Array.isArray(commRes)
          ? commRes
          : commRes?.data || [];
        setComments(list);
      } catch (commErr) {
        console.warn('Failed to load comments:', commErr.message);
      }
    } catch (err) {
      console.error('Failed to load submission:', err);
      showNotification('error', err.message || 'Failed to load project details.');
    } finally {
      setLoading(false);
    }
  };

  const handleVote = async () => {
    if (!submission) return;
    setVoting(true);
    try {
      await api.castVote(submission.eventId, submission.id);
      showNotification('success', 'Your community vote has been counted!');
      // Refresh details to reflect any vote count update
      const updated = await api.getSubmissionById(id);
      if (updated?.data) setSubmission(updated.data);
    } catch (err) {
      showNotification('error', err.message || 'Could not record vote. You may have already voted or hit the rate limit.');
    } finally {
      setVoting(false);
    }
  };

  const handleAddComment = async (e) => {
    e.preventDefault();
    if (!newComment.trim()) return;

    setCommentSubmitting(true);
    try {
      await api.addComment(submission.id, newComment.trim());
      setNewComment('');
      // Reload comments list
      const commRes = await api.getComments(id);
      const list = Array.isArray(commRes) ? commRes : commRes?.data || [];
      setComments(list);
      showNotification('success', 'Comment published successfully!');
    } catch (err) {
      showNotification('error', err.message || 'Failed to post comment.');
    } finally {
      setCommentSubmitting(false);
    }
  };

  const targetEventId = params.eventId || submission?.eventId;

  const handleBackToGallery = () => {
    if (targetEventId) {
      navigate(`/events/${targetEventId}/gallery`);
    } else if (window.history.length > 1) {
      navigate(-1);
    } else {
      navigate('/events');
    }
  };

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-20 text-center font-bold text-2xl text-neo-ink/50">
        Loading project details...
      </div>
    );
  }

  if (!submission) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-20 text-center space-y-6">
        <NeoCard color="bg-neo-pastel-pink" className="py-16 flex flex-col items-center">
          <AlertCircle className="w-16 h-16 text-neo-ink mb-4" />
          <h2 className="text-3xl font-black text-neo-ink uppercase">Project Not Found</h2>
          <p className="font-bold text-neo-ink/70 mt-2 mb-6 max-w-md">
            This submission does not exist or may have been deleted.
          </p>
          <NeoButton 
            onClick={() => targetEventId ? navigate(`/events/${targetEventId}/gallery`) : navigate('/events')} 
            color="bg-white" 
            textColor="text-neo-ink"
          >
            <ArrowLeft className="w-4 h-4 mr-2" /> Back to Project Gallery
          </NeoButton>
        </NeoCard>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 space-y-10 pb-20 pt-6">
      {/* Top Breadcrumb */}
      <div className="flex items-center justify-between">
        <button
          onClick={handleBackToGallery}
          className="flex items-center gap-2 font-bold text-neo-ink hover:underline decoration-3 underline-offset-4"
        >
          <ArrowLeft className="w-5 h-5" /> Back to Project Gallery
        </button>

        {submission.event && (
          <button
            onClick={() => navigate(`/events/${submission.eventId}`)}
            className="cursor-pointer font-black text-xs uppercase px-3.5 py-1.5 bg-white border-3 border-neo-ink rounded-full neo-shadow hover:neo-active"
          >
            Hackathon: {submission.event.title}
          </button>
        )}
      </div>


      <NeoCard color="bg-neo-pastel-yellow" className="space-y-6">
        <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-8">
          <div className="space-y-4 max-w-3xl">
            <div className="flex items-center gap-3 flex-wrap">
              <span className="font-black text-xs uppercase px-3 py-1 bg-white border-2 border-neo-ink rounded-full neo-shadow-sm">
                Team: {submission.team?.name || 'Independent'}
              </span>
              {submission.track && (
                <span className="font-black text-xs uppercase px-3 py-1 bg-neo-pastel-purple border-2 border-neo-ink rounded-full neo-shadow-sm">
                  Track: {submission.track.name}
                </span>
              )}
              {submission.status && (
                <span
                  className={`font-black text-xs uppercase px-3 py-1 border-2 border-neo-ink rounded-full neo-shadow-sm ${
                    submission.status === 'SUBMITTED' ? 'bg-neo-pastel-green' : 'bg-white'
                  }`}
                >
                  {submission.status}
                </span>
              )}
            </div>

            <h1 className="text-4xl md:text-6xl font-black text-neo-ink tracking-tight leading-tight">
              {submission.title}
            </h1>

            {submission.tagline && (
              <p className="text-xl md:text-2xl font-bold text-neo-ink/80">
                {submission.tagline}
              </p>
            )}

            {submission.techStack && (
              <div className="flex flex-wrap gap-2 pt-2">
                {submission.techStack.split(',').map((tech, idx) => (
                  <span
                    key={idx}
                    className="text-xs font-black uppercase px-3 py-1 bg-white border-2 border-neo-ink rounded-lg text-neo-ink neo-shadow-sm"
                  >
                    {tech.trim()}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Action Links & Voting Pill */}
          <div className="flex flex-col items-start lg:items-end gap-4 min-w-max">
            {submission.thumbnailUrl && (
              <EventImage
                src={submission.thumbnailUrl}
                alt={submission.title}
                className="w-64 h-40 rounded-xl"
                title={submission.title}
              />
            )}

            <div className="flex items-center gap-3 flex-wrap">
              {submission.demoUrl && (
                <a
                  href={submission.demoUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="px-4 py-2.5 rounded-full border-3 border-neo-ink bg-white font-bold text-sm text-neo-ink flex items-center gap-2 hover:neo-active neo-shadow"
                >
                  <Globe className="w-4 h-4" /> Live Demo
                </a>
              )}
              {submission.repoUrl && (
                <a
                  href={submission.repoUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="px-4 py-2.5 rounded-full border-3 border-neo-ink bg-white font-bold text-sm text-neo-ink flex items-center gap-2 hover:neo-active neo-shadow"
                >
                  <Github className="w-4 h-4" /> Source Code
                </a>
              )}
              {submission.videoUrl && (
                <a
                  href={submission.videoUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="px-4 py-2.5 rounded-full border-3 border-neo-ink bg-white font-bold text-sm text-neo-ink flex items-center gap-2 hover:neo-active neo-shadow"
                >
                  <Video className="w-4 h-4" /> Pitch Video
                </a>
              )}
            </div>

            {/* Community Vote Button */}
            <NeoButton
              onClick={handleVote}
              disabled={voting}
              color="bg-neo-pastel-pink"
              textColor="text-neo-ink"
              className="w-full justify-center !py-3 !text-base"
            >
              <Heart className="w-5 h-5 mr-2 fill-current text-neo-ink" />
              {voting ? 'Recording Vote...' : 'Vote for this Project'}
            </NeoButton>

            {/* Judge Evaluation Shortcut for Authorized Judges */}
            {isEventJudge(user, submission?.eventId) && (
              <NeoButton
                onClick={() => navigate(`/judge/submissions/${submission.id}/score`)}
                color="bg-neo-pastel-green"
                textColor="text-neo-ink"
                className="w-full justify-center !py-3 !text-base border-3 border-neo-ink"
              >
                <Award className="w-5 h-5 mr-2" />
                Score Project (Judge Portal)
              </NeoButton>
            )}
          </div>
        </div>
      </NeoCard>

      {/* Description & Team Details Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Description & Media Gallery */}
        <div className="lg:col-span-2 space-y-8">
          <NeoCard color="bg-white" className="space-y-4">
            <h2 className="text-2xl font-black text-neo-ink border-b-3 border-neo-ink pb-3 uppercase tracking-tight">
              About the Project
            </h2>
            <div className="prose max-w-none text-neo-ink font-medium leading-relaxed whitespace-pre-line text-lg">
              {submission.description}
            </div>
          </NeoCard>

          {/* Image Gallery if available */}
          {Array.isArray(submission.imageGallery) && submission.imageGallery.length > 0 && (
            <NeoCard color="bg-neo-pastel-blue" className="space-y-4">
              <h3 className="text-xl font-black text-neo-ink flex items-center gap-2">
                <Layers className="w-5 h-5" /> Screenshots & Assets
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {submission.imageGallery.map((imgUrl, i) => (
                  <img
                    key={i}
                    src={imgUrl}
                    alt={`Screenshot ${i + 1}`}
                    className="w-full h-48 object-cover rounded-xl border-3 border-neo-ink neo-shadow"
                  />
                ))}
              </div>
            </NeoCard>
          )}

          {/* Submission Answers to Event Questions */}
          {Array.isArray(submission.answers) && submission.answers.length > 0 && (
            <NeoCard color="bg-white" className="space-y-4">
              <h3 className="text-xl font-black text-neo-ink flex items-center gap-2 border-b-3 border-neo-ink pb-3 uppercase tracking-tight">
                <HelpCircle className="w-5 h-5 text-neo-pastel-purple" /> Hackathon Questions
              </h3>
              <div className="space-y-4">
                {submission.answers.map((ans, idx) => (
                  <div key={idx} className="p-4 bg-neo-bg rounded-xl border-2 border-neo-ink">
                    <p className="font-black text-sm text-neo-ink mb-1">
                      {ans.question?.question || `Question #${ans.questionId}`}
                    </p>
                    <p className="font-bold text-neo-ink/80">{ans.answer}</p>
                  </div>
                ))}
              </div>
            </NeoCard>
          )}

          {/* Comments Section */}
          <NeoCard color="bg-white" className="space-y-6">
            <div className="flex items-center justify-between border-b-3 border-neo-ink pb-4">
              <div className="flex items-center gap-2">
                <MessageSquare className="w-6 h-6 text-neo-ink" />
                <h3 className="text-2xl font-black text-neo-ink uppercase">
                  Community Discussion ({comments.length})
                </h3>
              </div>
            </div>

            {/* Post Comment Form */}
            <form onSubmit={handleAddComment} className="space-y-3">
              <textarea
                rows={3}
                placeholder="Share your thoughts, ask questions, or provide feedback on this build..."
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                className="w-full p-4 font-bold bg-neo-bg border-3 border-neo-ink rounded-xl placeholder-neo-ink/40 neo-shadow focus:outline-none focus:neo-active transition-all"
                required
              />
              <div className="flex justify-end">
                <NeoButton
                  type="submit"
                  disabled={commentSubmitting}
                  color="bg-neo-ink"
                  textColor="text-white"
                >
                  <Send className="w-4 h-4 mr-2" />
                  {commentSubmitting ? 'Posting...' : 'Post Comment'}
                </NeoButton>
              </div>
            </form>

            {/* Comments List */}
            <div className="space-y-4 pt-4 border-t-2 border-neo-ink/20">
              {comments.length === 0 ? (
                <div className="text-center py-8 font-bold text-neo-ink/50">
                  No comments yet. Be the first to cheer on this team!
                </div>
              ) : (
                comments.map((c) => (
                  <div
                    key={c.id}
                    className="p-4 rounded-xl border-3 border-neo-ink bg-neo-bg flex flex-col gap-2 neo-shadow"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-black text-sm text-neo-ink">
                        {c.authorName || c.user?.name || 'Community Member'}
                      </span>
                      <span className="text-xs font-bold text-neo-ink/60">
                        {formatDate(c.createdAt)}
                      </span>
                    </div>
                    <p className="font-medium text-neo-ink whitespace-pre-wrap">{c.content}</p>
                  </div>
                ))
              )}
            </div>
          </NeoCard>
        </div>

        {/* Right Column: Team Roster & Scores */}
        <div className="space-y-8">
          {/* Team Roster */}
          <NeoCard color="bg-neo-pastel-green" className="space-y-4">
            <h3 className="text-xl font-black text-neo-ink flex items-center gap-2 border-b-3 border-neo-ink pb-2 uppercase tracking-tight">
              <Users className="w-5 h-5" /> Team Roster
            </h3>
            <p className="font-black text-lg text-neo-ink">{submission.team?.name}</p>

            <div className="space-y-2">
              {submission.team?.members?.map((m) => (
                <div
                  key={m.id}
                  className="p-3 bg-white border-2 border-neo-ink rounded-xl flex items-center justify-between neo-shadow-sm"
                >
                  <div>
                    <p className="font-black text-sm text-neo-ink">{m.user?.name || 'Teammate'}</p>
                    <p className="text-xs font-bold text-neo-ink/60">{m.user?.email}</p>
                  </div>
                  {m.userId === submission.team.leaderId && (
                    <span className="text-[10px] font-black uppercase px-2 py-0.5 bg-neo-pastel-yellow border border-neo-ink rounded-md">
                      Leader
                    </span>
                  )}
                </div>
              ))}
            </div>
          </NeoCard>

          {/* Scores (Visible to Judges, Organizers, or when Published) */}
          {submission.scores && submission.scores.length > 0 && (
            <NeoCard color="bg-white" className="space-y-4">
              <h3 className="text-xl font-black text-neo-ink flex items-center gap-2 border-b-3 border-neo-ink pb-2 uppercase tracking-tight">
                <Award className="w-5 h-5 text-neo-pastel-orange" /> Evaluation Scores
              </h3>
              <div className="space-y-3">
                {submission.scores.map((sc, i) => (
                  <div key={i} className="p-3 bg-neo-bg rounded-xl border-2 border-neo-ink">
                    <div className="flex justify-between items-center mb-1">
                      <span className="font-black text-xs uppercase text-neo-ink">
                        {sc.criterion?.name || `Criterion #${sc.criterionId}`}
                      </span>
                      <span className="font-black text-sm bg-white px-2 py-0.5 border border-neo-ink rounded-md">
                        {sc.score} / {sc.criterion?.maxScore || 10}
                      </span>
                    </div>
                    {sc.feedback && (
                      <p className="text-xs font-bold text-neo-ink/70 italic mt-1">
                        "{sc.feedback}"
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </NeoCard>
          )}
        </div>
      </div>
    </div>
  );
};
