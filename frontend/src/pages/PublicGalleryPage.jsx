import React, { useState, useEffect } from 'react';
import api from '../services/api';
import NeoCard from '../components/neo/NeoCard';
import FilterChipRow from '../components/neo/FilterChipRow';
import { EventImage } from '../components/EventImage';
import { Search, Github, Globe, Video, ArrowLeft, Image as ImageIcon } from 'lucide-react';

const PASTELS = ['bg-neo-pastel-purple', 'bg-neo-pastel-orange', 'bg-neo-pastel-yellow', 'bg-neo-pastel-green', 'bg-neo-pastel-blue', 'bg-neo-pastel-pink'];

export const PublicGalleryPage = ({ eventId, onBack }) => {
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [search, setSearch] = useState('');
  const [activeTrack, setActiveTrack] = useState('ALL');
  
  // Hardcoded generic tracks for demo since we don't have track fetching yet
  // In a real app, we would fetch tracks from the event
  const tracks = [
    { label: 'All Tracks', value: 'ALL' },
    { label: 'Web3 & Blockchain', value: 'Web3 & Blockchain' },
    { label: 'AI & Machine Learning', value: 'AI & Machine Learning' },
    { label: 'Fintech', value: 'Fintech' },
  ];

  useEffect(() => {
    fetchGallery();
  }, [eventId]);

  const fetchGallery = async () => {
    try {
      setLoading(true);
      const res = await api.getGallery(eventId);
      if (res?.data) {
        setSubmissions(res.data);
      }
    } catch (err) {
      console.error('Failed to load gallery:', err);
    } finally {
      setLoading(false);
    }
  };

  const filtered = submissions.filter((sub) => {
    const matchesSearch = 
      sub.title.toLowerCase().includes(search.toLowerCase()) || 
      (sub.tagline && sub.tagline.toLowerCase().includes(search.toLowerCase()));
    
    // In our simplified mock, track matching is text based on tech stack or hardcoded
    const matchesTrack = activeTrack === 'ALL' || (sub.track && sub.track.name === activeTrack);
    
    return matchesSearch && matchesTrack;
  });

  if (loading) {
    return <div className="py-20 text-center font-bold text-2xl text-neo-ink/50">Loading Gallery...</div>;
  }

  return (
    <div className="max-w-7xl mx-auto px-4 space-y-10 pb-16 pt-6">
      {/* Header */}
      <div className="flex flex-col gap-6">
        <button
          onClick={onBack}
          className="flex items-center w-max gap-2 font-bold text-neo-ink hover:underline decoration-3 underline-offset-4"
        >
          <ArrowLeft className="w-5 h-5" /> Back to Hackathon
        </button>

        <div>
          <h1 className="text-5xl md:text-7xl font-black text-neo-ink tracking-tight mb-4">
            Project Gallery
          </h1>
          <p className="text-xl font-bold text-neo-ink/70 max-w-2xl">
            Explore all submitted projects, filter by tracks, and discover the amazing technology built during this hackathon.
          </p>
        </div>
      </div>

      {/* Filters */}
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
            placeholder="Search projects..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-12 pr-4 py-3 font-bold text-neo-ink bg-white border-3 border-neo-ink rounded-full placeholder-neo-ink/50 focus:outline-none neo-shadow focus:neo-active transition-all"
          />
        </div>
      </div>

      {/* Gallery Grid */}
      {filtered.length === 0 ? (
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
              <NeoCard key={sub.id} color={bg} className="flex flex-col justify-between group">
                <div>
                  <EventImage
                    src={sub.thumbnailUrl}
                    alt={sub.title}
                    title={sub.title}
                    className="w-full h-48 mb-6"
                    imgClassName="group-hover:scale-105 transition-transform"
                    icon={ImageIcon}
                  />

                  <div className="flex items-center justify-between gap-2 mb-3">
                    <span className="font-black text-sm bg-white px-3 py-1 border-3 border-neo-ink rounded-full neo-shadow">
                      {sub.team?.name || 'Unknown Team'}
                    </span>
                    {sub.track && (
                      <span className="font-black text-xs text-neo-ink/60 uppercase">
                        {sub.track.name}
                      </span>
                    )}
                  </div>
                  
                  <h4 className="font-black text-3xl text-neo-ink mb-2 leading-tight">{sub.title}</h4>
                  
                  {sub.tagline && (
                    <p className="font-bold text-lg text-neo-ink/80 mb-4">{sub.tagline}</p>
                  )}
                  
                  {sub.techStack && (
                    <div className="flex flex-wrap gap-2 mb-4">
                      {sub.techStack.split(',').map((tech, idx) => (
                        <span key={idx} className="text-[10px] font-black uppercase px-2 py-1 bg-white border-2 border-neo-ink rounded-lg text-neo-ink">
                          {tech.trim()}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                <div className="pt-6 mt-6 border-t-3 border-neo-ink flex justify-end gap-3">
                  {sub.repoUrl && (
                    <a href={sub.repoUrl} target="_blank" rel="noreferrer" className="w-12 h-12 bg-white border-3 border-neo-ink rounded-full flex items-center justify-center hover:neo-active neo-shadow text-neo-ink" title="Code Repository">
                      <Github className="w-6 h-6" />
                    </a>
                  )}
                  {sub.demoUrl && (
                    <a href={sub.demoUrl} target="_blank" rel="noreferrer" className="w-12 h-12 bg-white border-3 border-neo-ink rounded-full flex items-center justify-center hover:neo-active neo-shadow text-neo-ink" title="Live Demo">
                      <Globe className="w-6 h-6" />
                    </a>
                  )}
                  {sub.videoUrl && (
                    <a href={sub.videoUrl} target="_blank" rel="noreferrer" className="w-12 h-12 bg-white border-3 border-neo-ink rounded-full flex items-center justify-center hover:neo-active neo-shadow text-neo-ink" title="Video Pitch">
                      <Video className="w-6 h-6" />
                    </a>
                  )}
                </div>
              </NeoCard>
            );
          })}
        </div>
      )}
    </div>
  );
};
