import React from 'react';

const StatCard = ({ label, value, subtext }) => {
  return (
    <div className="flex flex-col">
      <span className="text-sm md:text-base font-semibold text-neo-ink/70 mb-1">{label}</span>
      <div className="text-4xl md:text-6xl font-black text-neo-ink tracking-tight">{value}</div>
      {subtext && <span className="text-xs font-bold text-neo-ink/60 mt-1">{subtext}</span>}
    </div>
  );
};

export default StatCard;
