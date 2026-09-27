import React from 'react';

const AvatarStack = ({ members, max = 4, onAdd, size = 'w-10 h-10' }) => {
  const displayMembers = members.slice(0, max);
  const remaining = members.length - max;

  return (
    <div className="flex items-center">
      {displayMembers.map((m, i) => (
        <div 
          key={m.id || i}
          className={`${size} rounded-full border-3 border-neo-ink bg-white flex items-center justify-center font-bold text-sm text-neo-ink -ml-3 first:ml-0 overflow-hidden relative z-[${10-i}]`}
          title={m.name || m.user?.name}
          style={{ zIndex: 10 - i }}
        >
          {m.avatarUrl ? (
             <img src={m.avatarUrl} alt={m.name} className="w-full h-full object-cover" />
          ) : (
            <span>{(m.name || m.user?.name || '?').charAt(0).toUpperCase()}</span>
          )}
        </div>
      ))}
      
      {remaining > 0 && (
        <div className={`${size} rounded-full border-3 border-neo-ink bg-neo-pastel-purple flex items-center justify-center font-bold text-sm text-neo-ink -ml-3 relative z-0`}>
          +{remaining}
        </div>
      )}

      {onAdd && (
        <button 
          onClick={onAdd}
          className={`${size} rounded-full border-3 border-neo-ink bg-neo-pastel-orange hover:neo-active flex items-center justify-center font-bold text-xl text-neo-ink -ml-3 z-0 transition-transform`}
        >
          +
        </button>
      )}
    </div>
  );
};

export default AvatarStack;
