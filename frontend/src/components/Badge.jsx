import React from 'react';

export const Badge = ({ children, variant = 'default', className = '' }) => {
  const styles = {
    default: 'bg-white text-neo-ink border-neo-ink',
    primary: 'bg-neo-pastel-purple text-neo-ink border-neo-ink',
    success: 'bg-neo-pastel-green text-neo-ink border-neo-ink',
    warning: 'bg-neo-pastel-yellow text-neo-ink border-neo-ink',
    danger: 'bg-neo-pastel-pink text-neo-ink border-neo-ink',
    purple: 'bg-neo-pastel-purple text-neo-ink border-neo-ink',
  };

  return (
    <span
      className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-black uppercase border-3 shadow-[2px_2px_0px_0px_#1A1A1A] ${
        styles[variant] || styles.default
      } ${className}`}
    >
      {children}
    </span>
  );
};
