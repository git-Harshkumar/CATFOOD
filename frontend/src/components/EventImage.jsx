import React, { useState, useEffect } from 'react';
import { Trophy, Sparkles, Image as ImageIcon } from 'lucide-react';

export const EventImage = ({
  src,
  alt = 'Event banner',
  className = 'w-full h-48',
  imgClassName = '',
  placeholderClassName = '',
  title,
  icon,
  badgeText = 'Hackathon',
}) => {
  const [imgFailed, setImgFailed] = useState(false);

  // Reset failure state if the src URL changes
  useEffect(() => {
    setImgFailed(false);
  }, [src]);

  // Check if string is a non-empty, potentially valid image URL/data URI
  const isValidUrl = (url) => {
    if (!url || typeof url !== 'string') return false;
    const trimmed = url.trim();
    if (trimmed.length === 0) return false;
    return (
      trimmed.startsWith('http://') ||
      trimmed.startsWith('https://') ||
      trimmed.startsWith('data:image/') ||
      trimmed.startsWith('/') ||
      trimmed.startsWith('./')
    );
  };

  const shouldShowFallback = !isValidUrl(src) || imgFailed;

  if (shouldShowFallback) {
    const FallbackIcon = icon || Trophy;

    return (
      <div
        className={`w-full border-3 border-neo-ink rounded-2xl flex flex-col items-center justify-center bg-white/70 neo-shadow relative overflow-hidden select-none p-4 ${className} ${placeholderClassName}`}
        aria-label={alt}
      >
        <div className="w-14 h-14 rounded-full border-3 border-neo-ink bg-neo-pastel-yellow flex items-center justify-center neo-shadow mb-2">
          {React.isValidElement(FallbackIcon) ? (
            FallbackIcon
          ) : (
            <FallbackIcon className="w-7 h-7 text-neo-ink" />
          )}
        </div>
        {title ? (
          <span className="text-xs font-black uppercase tracking-wider text-neo-ink/70 px-3 py-1 bg-white border-2 border-neo-ink rounded-full neo-shadow max-w-[90%] truncate">
            {title}
          </span>
        ) : badgeText ? (
          <span className="text-xs font-black uppercase tracking-wider text-neo-ink/60 px-2.5 py-0.5 bg-white border-2 border-neo-ink rounded-full">
            {badgeText}
          </span>
        ) : null}
      </div>
    );
  }

  return (
    <div
      className={`border-3 border-neo-ink rounded-2xl overflow-hidden neo-shadow bg-white relative ${className}`}
    >
      <img
        src={src.trim()}
        alt={alt}
        onError={() => setImgFailed(true)}
        className={`w-full h-full object-cover transition-transform duration-200 ${imgClassName}`}
        loading="lazy"
      />
    </div>
  );
};

export default EventImage;
