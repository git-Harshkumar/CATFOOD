import React, { useState, useEffect } from 'react';
import { getTimeRemaining } from '../utils/formatters';
import { Clock, AlertTriangle } from 'lucide-react';

export const CountdownTimer = ({ deadline, onExpire }) => {
  const [timeLeft, setTimeLeft] = useState(getTimeRemaining(deadline));

  useEffect(() => {
    const timer = setInterval(() => {
      const remaining = getTimeRemaining(deadline);
      setTimeLeft(remaining);
      if (remaining.isExpired) {
        clearInterval(timer);
        if (onExpire) onExpire();
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [deadline, onExpire]);

  if (timeLeft.isExpired) {
    return (
      <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-semibold">
        <AlertTriangle className="w-4 h-4 text-rose-400 animate-pulse" />
        <span>Submissions Closed</span>
      </div>
    );
  }

  const isUrgent = timeLeft.total < 24 * 60 * 60 * 1000; // Less than 24h

  return (
    <div
      className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl border backdrop-blur-md ${
        isUrgent
          ? 'bg-amber-500/10 border-amber-500/40 text-amber-300'
          : 'bg-indigo-950/40 border-indigo-500/30 text-indigo-300'
      }`}
    >
      <Clock className={`w-4 h-4 ${isUrgent ? 'animate-bounce text-amber-400' : 'text-indigo-400'}`} />
      <span className="text-xs font-medium uppercase tracking-wider text-slate-400">Deadline:</span>
      <div className="flex items-center gap-1.5 font-mono text-xs font-bold text-white">
        {timeLeft.days > 0 && (
          <>
            <span className="bg-slate-800/80 px-1.5 py-0.5 rounded text-indigo-300">{timeLeft.days}d</span>
            <span>:</span>
          </>
        )}
        <span className="bg-slate-800/80 px-1.5 py-0.5 rounded text-indigo-300">
          {String(timeLeft.hours).padStart(2, '0')}h
        </span>
        <span>:</span>
        <span className="bg-slate-800/80 px-1.5 py-0.5 rounded text-indigo-300">
          {String(timeLeft.minutes).padStart(2, '0')}m
        </span>
        <span>:</span>
        <span className="bg-slate-800/80 px-1.5 py-0.5 rounded text-indigo-300">
          {String(timeLeft.seconds).padStart(2, '0')}s
        </span>
      </div>
    </div>
  );
};
