import React from 'react';

export const RubricScoreSlider = ({ criterion, value, onChange, feedback, onFeedbackChange }) => {
  const currentVal = value !== undefined ? value : 0;
  const max = criterion.maxScore || 10;
  const weight = criterion.weight || 1.0;
  const weightedScore = Math.round(currentVal * weight * 10) / 10;

  return (
    <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800/80 hover:border-slate-700/80 transition-all space-y-3">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <div className="flex items-center gap-2">
            <h4 className="font-semibold text-slate-100">{criterion.name}</h4>
            <span className="text-xs px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-400 font-mono">
              Weight: {weight}x
            </span>
          </div>
          {criterion.description && (
            <p className="text-xs text-slate-400 mt-0.5">{criterion.description}</p>
          )}
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right">
            <span className="text-2xl font-bold font-mono text-indigo-400">{currentVal}</span>
            <span className="text-xs text-slate-500 font-mono"> / {max}</span>
          </div>
          <div className="text-xs font-mono px-2 py-1 rounded bg-slate-800 text-slate-300">
            Weighted: <span className="font-bold text-white">{weightedScore}</span>
          </div>
        </div>
      </div>

      <div className="space-y-1">
        <input
          type="range"
          min="0"
          max={max}
          step="0.5"
          value={currentVal}
          onChange={(e) => onChange(parseFloat(e.target.value))}
          className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-500 hover:accent-indigo-400"
        />
        <div className="flex justify-between text-[10px] text-slate-500 font-mono">
          <span>0 (Poor)</span>
          <span>{Math.round(max / 2)} (Average)</span>
          <span>{max} (Exceptional)</span>
        </div>
      </div>

      <div>
        <textarea
          rows="2"
          placeholder={`Optional qualitative feedback on ${criterion.name.toLowerCase()}...`}
          value={feedback || ''}
          onChange={(e) => onFeedbackChange(e.target.value)}
          className="w-full px-3 py-1.5 text-xs bg-slate-950/70 border border-slate-800 rounded-lg text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
        />
      </div>
    </div>
  );
};
