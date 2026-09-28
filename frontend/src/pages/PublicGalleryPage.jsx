import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../services/api';
import NeoCard from '../components/neo/NeoCard';
import NeoButton from '../components/neo/NeoButton';
import FilterChipRow from '../components/neo/FilterChipRow';
import { EventImage } from '../components/EventImage';
import { Search, Github, Globe, Video, ArrowLeft, Image as ImageIcon, Heart, ArrowRight, Filter } from 'lucide-react';

const PASTELS = [
  'bg-neo-pastel-purple',
  'bg-neo-pastel-orange',
  'bg-neo-pastel-yellow',
  'bg-neo-pastel-green',
  'bg-neo-pastel-blue',
  'bg-neo-pastel-pink',
];

export const PublicGalleryPage = ({ eventId: propEventId, onBack }) => {
  const params = useParams();
  const navigate = useNavigate();
  const currentEventId = propEventId || params.eventId || null;

  const [submissions, setSubmissions] = useState([]);
  const [events, setEvents] = useState([]);
  const [selectedEventId, setSelectedEventId] = useState(currentEventId || 'ALL');
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [activeTrack, setActiveTrack] = useState('ALL');
  const [voteStatus, setVoteStatus] = useState({}); // { [submissionId]: 'voted' | 'error' | message }

  const tracks = [
    { label: 'All Tracks', value: 'ALL' },
    { label: 'Web3 & Blockchain', value: 'Web3 & Blockchain' },
    { label: 'AI & Machine Learning', value: 'AI & Machine Learning' },
    { label: 'Fintech', value: 'Fintech' },
  ];

  useEffect(() => {
    fetchEvents();
  }, []);

  useEffect(() => {
    fetchGallery();
  }, [selectedEventId]);

  const fetchEvents = async () => {
    try {
      const res = await api.getEvents();
      if (res?.data) {
        setEvents(res.data);
      }
    } catch (e) {
      console.warn('Failed to load events list:', e);
    }
  };

  const fetchGallery = async () => {
    try {
      setLoading(true);
      const targetId = selectedEventId === 'ALL' ? null : selectedEventId;
      const res = await api.getGallery(targetId);
      if (res?.data) {
        setSubmissions(res.data);
      }
    } catch (err) {
      console.error('Failed to load gallery:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleQuickVote = async (e, sub) => {
    e.stopPropagation();
    try {
      await api.castVote(sub.eventId, sub.id);
      setVoteStatus((prev) => ({ ...prev, [sub.id]: 'Voted!' }));
    } catch (err) {
      setVoteStatus((prev) => ({
        ...prev,
        [sub.id]: err.status === 429 ? 'Rate limited' : 'Already voted',
      }));
    }
  };

  const filtered = submissions.filter((sub) => {
    const matchesSearch =
      sub.title.toLowerCase().includes(search.toLowerCase()) ||
      (sub.tagline && sub.tagline.toLowerCase().includes(search.toLowerCase())) ||
      (sub.techStack && sub.techStack.toLowerCase().includes(search.toLowerCase()));

    const matchesTrack =
      activeTrack === 'ALL' ||
      (sub.track && sub.track.name === activeTrack) ||
      (sub.techStack && sub.techStack.toLowerCase().includes(activeTrack.toLowerCase()));

    return matchesSearch && matchesTrack;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 space-y-10 pb-20 pt-6">
      {/* Header */}
      <div className="flex flex-col gap-6">
        {onBack ? (
          <button
            onClick={onBack}
            className="flex items-center w-max gap-2 font-bold text-neo-ink hover:underline decoration-3 underline-offset-4"
          >
            <ArrowLeft className="w-5 h-5" /> Back to Hackathon
          </button>
        ) : (
          <button
            onClick={() => navigate('/events')}
            className="flex items-center w-max gap-2 font-bold text-neo-ink hover:underline decoration-3 underline-offset-4"
          >
            <ArrowLeft className="w-5 h-5" /> Back to Hackathons
          </button>
        )}

        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b-3 border-neo-ink pb-6">
          <div>
            <h1 className="text-5xl md:text-7xl font-black text-neo-ink tracking-tight mb-4">
              Project Gallery
            </h1>
            <p className="text-xl font-bold text-neo-ink/70 max-w-2xl">
              Explore public deliverables, test live demos, and cast your community votes for the best innovations.
            </p>
          </div>

          {/* Hackathon Event Selector (when in global view) */}
          {events.length > 0 && (
            <div className="flex flex-col gap-2 min-w-[260px]">
              <label className="text-xs font-black uppercase text-neo-ink/70">
                Filter by Hackathon
              </label>
              <select
                value={selectedEventId}
                onChange={(e) => setSelectedEventId(e.target.value)}
                className="w-full px-4 py-2.5 font-bold bg-white border-3 border-neo-ink rounded-full neo-shadow focus:outline-none"
              >
                <option value="ALL">All Hackathons</option>
                {events.map((ev) => (
                  <option key={ev.id} value={ev.id}>
                    {ev.title}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      </div>

      {/* Filters and Search */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-6 mb-8">
        <div className="w-full md:w-auto">
          <FilterChipRow
            options={tracks}
            activeOption={activeTrack}
            onChange={setActiveTrack}
          />
        </div>

        <div className="relative w-full md:w-96">
          <Search className="w-5 h-5 text-neo-ink absolute left-4 top-3.5" />
          <input
            type="text"
            placeholder="Search projects, stack, keywords..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-12 pr-4 py-3 font-bold text-neo-ink bg-white border-3 border-neo-ink rounded-full placeholder-neo-ink/50 focus:outline-none neo-shadow focus:neo-active transition-all"
          />
        </div>
      </div>

      {/* Gallery Grid */}
      {loading ? (
        <div className="py-20 text-center font-bold text-2xl text-neo-ink/50">
          Loading Gallery...
        </div>
      ) : filtered.length === 0 ? (
        <NeoCard color="bg-white" className="text-center py-20 flex flex-col items-center justify-center">
          <ImageIcon className="w-16 h-16 text-neo-ink mb-6" />
          <h3 className="text-3xl font-black text-neo-ink mb-2">No projects found</h3>
          <p className="font-bold text-neo-ink/60">Try adjusting your search or track filter.</p>
        </NeoCard>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {filtered.map((sub, i) => {
            const bg = PASTELS[i % PASTELS.length];
            return (
              <NeoCard
                key={sub.id}
                color={bg}
                className="flex flex-col justify-between group cursor-pointer hover:-translate-y-1 transition-transform"
                onClick={() => navigate(`/submissions/${sub.id}`)}
              >
                <div>
                  <EventImage
                    src={sub.thumbnailUrl}
                    alt={sub.title}
                    title={sub.title}
                    className="w-full h-48 mb-6 rounded-xl overflow-hidden"
                    imgClassName="group-hover:scale-105 transition-transform"
                    icon={ImageIcon}
                  />

                  <div className="flex items-center justify-between gap-2 mb-3">
                    <span className="font-black text-sm bg-white px-3 py-1 border-3 border-neo-ink rounded-full neo-shadow-sm">
                      {sub.team?.name || 'Unknown Team'}
                    </span>
                    {sub.track && (
                      <span className="font-black text-xs text-neo-ink/70 uppercase">
                        {sub.track.name}
                      </span>
                    )}
                  </div>

                  <h4 className="font-black text-3xl text-neo-ink mb-2 leading-tight">
                    {sub.title}
                  </h4>

                  {sub.tagline && (
                    <p className="font-bold text-lg text-neo-ink/80 mb-4 line-clamp-2">
                      {sub.tagline}
                    </p>
                  )}

                  {sub.techStack && (
                    <div className="flex flex-wrap gap-2 mb-4">
                      {sub.techStack.split(',').slice(0, 4).map((tech, idx) => (
                        <span
                          key={idx}
                          className="text-[10px] font-black uppercase px-2 py-1 bg-white border-2 border-neo-ink rounded-lg text-neo-ink"
                        >
                          {tech.trim()}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                <div className="pt-6 mt-6 border-t-3 border-neo-ink flex items-center justify-between">
                  <button
                    onClick={(e) => handleQuickVote(e, sub)}
                    className="px-3 py-2 bg-white border-3 border-neo-ink rounded-full flex items-center gap-1.5 font-black text-xs hover:neo-active neo-shadow text-neo-ink"
                  >
                    <Heart className="w-4 h-4 fill-current text-neo-pastel-pink" />
                    <span>{voteStatus[sub.id] || 'Vote'}</span>
                  </button>

                  <div className="flex items-center gap-2">
                    {sub.repoUrl && (
                      <a
                        href={sub.repoUrl}
                        target="_blank"
                        rel="noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="w-10 h-10 bg-white border-3 border-neo-ink rounded-full flex items-center justify-center hover:neo-active neo-shadow text-neo-ink"
                        title="Code Repository"
                      >
                        <Github className="w-4 h-4" />
                      </a>
                    )}
                    {sub.demoUrl && (
                      <a
                        href={sub.demoUrl}
                        target="_blank"
                        rel="noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="w-10 h-10 bg-white border-3 border-neo-ink rounded-full flex items-center justify-center hover:neo-active neo-shadow text-neo-ink"
                        title="Live Demo"
                      >
                        <Globe className="w-4 h-4" />
                      </a>
                    )}
                    <button
                      onClick={() => navigate(`/submissions/${sub.id}`)}
                      className="w-10 h-10 bg-neo-ink text-white border-3 border-neo-ink rounded-full flex items-center justify-center hover:neo-active neo-shadow"
                      title="View Details"
                    >
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </NeoCard>
            );
          })}
        </div>
      )}
    </div>
  );
};
