import React from 'react';
import PillButton from './PillButton';

const FilterChipRow = ({ options, activeOption, onChange, onAdd, addLabel = '+' }) => {
  return (
    <div className="flex items-center gap-3 overflow-x-auto py-2 pb-4 scrollbar-hide">
      {options.map((opt) => (
        <PillButton
          key={opt.value}
          label={opt.label}
          active={activeOption === opt.value}
          onClick={() => onChange(opt.value)}
        />
      ))}
      
      {onAdd && (
        <button 
          onClick={onAdd}
          className="shrink-0 flex items-center justify-center w-10 h-10 rounded-full border-3 border-neo-ink bg-neo-pastel-orange hover:neo-active neo-shadow font-bold text-xl text-neo-ink transition-transform"
          title="Add Filter"
        >
          {addLabel}
        </button>
      )}
    </div>
  );
};

export default FilterChipRow;
