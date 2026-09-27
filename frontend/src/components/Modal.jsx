import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

export const Modal = ({ isOpen, onClose, title, children, maxWidth = 'max-w-xl' }) => {
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-neo-ink/50 backdrop-blur-sm">
      <div
        className={`w-full ${maxWidth} bg-white border-3 border-neo-ink rounded-neo neo-shadow-lg flex flex-col max-h-[90vh] overflow-hidden`}
      >
        <div className="flex items-center justify-between px-8 py-5 border-b-3 border-neo-ink bg-neo-pastel-yellow">
          <h3 className="text-2xl font-black text-neo-ink">{title}</h3>
          <button
            onClick={onClose}
            className="w-10 h-10 rounded-full border-3 border-neo-ink bg-white flex items-center justify-center hover:neo-active neo-shadow text-neo-ink transition-transform"
          >
            <X className="w-6 h-6" />
          </button>
        </div>
        <div className="p-8 overflow-y-auto">{children}</div>
      </div>
    </div>,
    document.body
  );
};
