import React, { useState, useEffect } from 'react';
import { getTimeRemaining } from '../utils/formatters';
import { Clock, AlertTriangle } from 'lucide-react';

export const CountdownTimer = ({ deadline, onExpire, compact = false }) => {
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
      <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-neo-pastel-pink text-neo-ink font-black text-sm uppercase">
        <AlertTriangle className="w-4 h-4 text-neo-ink animate-pulse" />
        <span>Submissions Closed</span>
      </div>
    );
  }

  const isUrgent = timeLeft.total < 24 * 60 * 60 * 1000; // Less than 24h

  if (compact) {
     return (
        <span className={`${isUrgent ? 'text-red-600 animate-pulse' : 'text-neo-ink'} font-black font-mono`}>
           {timeLeft.days > 0 ? `${timeLeft.days}d ` : ''}
           {String(timeLeft.hours).padStart(2, '0')}:
           {String(timeLeft.minutes).padStart(2, '0')}:
           {String(timeLeft.seconds).padStart(2, '0')}
        </span>
     );
  }

  return (
    <div
      className={`inline-flex flex-col items-center justify-center p-2`}
    >
      <div className="flex items-center gap-2 mb-2">
         <Clock className={`w-5 h-5 ${isUrgent ? 'animate-bounce text-red-600' : 'text-neo-ink'}`} />
         <span className="text-xs font-black uppercase tracking-wider text-neo-ink">Deadline</span>
      </div>
      <div className="flex items-center gap-2 font-mono text-xl font-black text-neo-ink">
        {timeLeft.days > 0 && (
          <>
            <span className="bg-white border-3 border-neo-ink px-2 py-1 rounded-xl shadow-[2px_2px_0px_0px_#1A1A1A]">{timeLeft.days}d</span>
            <span>:</span>
          </>
        )}
        <span className="bg-white border-3 border-neo-ink px-2 py-1 rounded-xl shadow-[2px_2px_0px_0px_#1A1A1A]">
          {String(timeLeft.hours).padStart(2, '0')}h
        </span>
        <span>:</span>
        <span className="bg-white border-3 border-neo-ink px-2 py-1 rounded-xl shadow-[2px_2px_0px_0px_#1A1A1A]">
          {String(timeLeft.minutes).padStart(2, '0')}m
        </span>
        <span>:</span>
        <span className="bg-white border-3 border-neo-ink px-2 py-1 rounded-xl shadow-[2px_2px_0px_0px_#1A1A1A] text-neo-pastel-orange">
          {String(timeLeft.seconds).padStart(2, '0')}s
        </span>
      </div>
    </div>
  );
};
