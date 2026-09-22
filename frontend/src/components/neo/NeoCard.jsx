import React from 'react';

const NeoCard = ({ children, className = '', color = 'bg-white', noPadding = false, ...props }) => {
  return (
    <div 
      className={`rounded-neo border-3 border-neo-ink neo-shadow transition-all hover:neo-active ${color} ${noPadding ? '' : 'p-6 sm:p-8'} ${className}`}
      {...props}
    >
      {children}
    </div>
  );
};

export default NeoCard;
