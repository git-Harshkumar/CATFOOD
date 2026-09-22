import React from 'react';

const NeoToggle = ({ checked, onChange, label }) => {
  return (
    <label className="flex items-center cursor-pointer gap-3">
      {label && <span className="font-bold text-sm text-neo-ink">{label}</span>}
      <div className="relative">
        <input 
          type="checkbox" 
          className="sr-only" 
          checked={checked} 
          onChange={onChange}
        />
        <div className="block bg-neo-ink w-14 h-8 rounded-full border-3 border-neo-ink"></div>
        <div className={`dot absolute left-1 top-1 bg-neo-bg border-2 border-neo-ink w-6 h-6 rounded-full transition-transform ${checked ? 'transform translate-x-6 bg-neo-pastel-orange' : ''}`}></div>
      </div>
    </label>
  );
};

export default NeoToggle;
