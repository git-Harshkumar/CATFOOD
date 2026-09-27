import React from 'react';

const NeoButton = ({ children, className = '', variant = 'solid', color = 'bg-neo-ink', textColor = 'text-white', ...props }) => {
  const baseClasses = "inline-flex items-center justify-center font-bold px-6 py-3 border-3 border-neo-ink neo-shadow transition-all hover:neo-active disabled:opacity-50 disabled:pointer-events-none";
  
  let styles = '';
  if (variant === 'pill') {
    styles = `rounded-full ${color} ${textColor}`;
  } else if (variant === 'rounded') {
    styles = `rounded-xl ${color} ${textColor}`;
  } else if (variant === 'circle') {
    styles = `rounded-full p-3 w-12 h-12 ${color} ${textColor}`;
  } else {
    // Default solid pill
    styles = `rounded-full ${color} ${textColor}`;
  }

  return (
    <button className={`${baseClasses} ${styles} ${className}`} {...props}>
      {children}
    </button>
  );
};

export default NeoButton;
