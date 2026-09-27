import React from 'react';

const PillButton = ({ active = false, label, onClick, className = '' }) => {
  const activeStyle = active ? 'bg-neo-green text-neo-ink' : 'bg-white text-neo-ink';
  
  return (
    <button
      onClick={onClick}
      className={`px-5 py-2 font-bold text-sm md:text-base border-3 border-neo-ink rounded-full whitespace-nowrap neo-shadow hover:neo-active transition-all ${activeStyle} ${className}`}
    >
      {label}
    </button>
  );
};

export default PillButton;
