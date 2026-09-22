import React from 'react';

export const RubricScoreSlider = ({ criterion, value, onChange, feedback, onFeedbackChange }) => {
  const currentVal = value !== undefined ? value : 0;
  const max = criterion.maxScore || 10;
  const weight = criterion.weight || 1.0;
  const weightedScore = Math.round(currentVal * weight * 10) / 10;

  return (
    <div className="p-6 rounded-2xl bg-white border-3 border-neo-ink neo-shadow space-y-6 transition-all hover:-translate-y-1">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b-3 border-neo-ink pb-4">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <h4 className="font-black text-2xl text-neo-ink">{criterion.name}</h4>
            <span className="text-xs px-3 py-1 rounded-full bg-neo-pastel-yellow border-3 border-neo-ink font-black uppercase neo-shadow-sm">
              {weight}x
            </span>
          </div>
          {criterion.description && (
            <p className="text-sm font-bold text-neo-ink/70">{criterion.description}</p>
          )}
        </div>
        <div className="flex items-center gap-4 bg-neo-bg px-4 py-3 rounded-xl border-3 border-neo-ink">
          <div className="text-right border-r-3 border-neo-ink pr-4">
            <span className="text-3xl font-black text-neo-ink">{currentVal}</span>
            <span className="text-sm font-bold text-neo-ink/60"> / {max}</span>
          </div>
          <div className="text-xs font-black uppercase text-neo-ink">
            Total: <span className="text-lg bg-neo-pastel-green px-2 py-1 rounded-md border-2 border-neo-ink ml-1">{weightedScore}</span>
          </div>
        </div>
      </div>

      <div className="space-y-3">
        <input
          type="range"
          min="0"
          max={max}
          step="0.5"
          value={currentVal}
          onChange={(e) => onChange(parseFloat(e.target.value))}
          className="w-full h-4 bg-neo-bg rounded-full border-3 border-neo-ink appearance-none cursor-pointer accent-neo-ink focus:outline-none focus:ring-4 focus:ring-neo-pastel-purple/50"
          style={{
            backgroundImage: `linear-gradient(to right, #1A1A1A ${(currentVal / max) * 100}%, transparent ${(currentVal / max) * 100}%)`,
            backgroundRepeat: 'no-repeat'
          }}
        />
        <div className="flex justify-between text-xs font-black text-neo-ink/50 uppercase px-1">
          <span>0 (Poor)</span>
          <span>{Math.round(max / 2)} (Average)</span>
          <span>{max} (Great)</span>
        </div>
      </div>

      <div>
        <textarea
          rows="3"
          placeholder={`Optional qualitative feedback on ${criterion.name.toLowerCase()}...`}
          value={feedback || ''}
          onChange={(e) => onFeedbackChange(e.target.value)}
          className="w-full px-4 py-3 text-sm font-bold bg-neo-bg border-3 border-neo-ink rounded-xl text-neo-ink placeholder-neo-ink/40 focus:outline-none focus:bg-white transition-colors"
        />
      </div>
    </div>
  );
};
