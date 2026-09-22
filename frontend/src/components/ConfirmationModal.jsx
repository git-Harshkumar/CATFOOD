import React, { useEffect } from 'react';
import { X, AlertTriangle, AlertCircle, Info, CheckCircle2, HelpCircle } from 'lucide-react';
import NeoButton from './neo/NeoButton';

export const ConfirmationModal = ({
  isOpen,
  onClose,
  title = 'Confirmation',
  message,
  children,
  type = 'confirm', // 'confirm' | 'alert'
  variant = 'default', // 'default' | 'danger' | 'warning' | 'info' | 'success'
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  actionText = 'OK',
  onConfirm,
  onCancel,
  confirmColor,
  loading = false,
  maxWidth = 'max-w-md',
}) => {
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen && !loading) {
        if (onCancel) {
          onCancel();
        } else {
          onClose();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose, onCancel, loading]);

  if (!isOpen) return null;

  const headerColors = {
    danger: 'bg-neo-pastel-pink',
    warning: 'bg-neo-pastel-orange',
    info: 'bg-neo-pastel-blue',
    success: 'bg-neo-pastel-green',
    default: 'bg-neo-pastel-yellow',
  };

  const icons = {
    danger: <AlertTriangle className="w-6 h-6 text-neo-ink" />,
    warning: <AlertCircle className="w-6 h-6 text-neo-ink" />,
    info: <Info className="w-6 h-6 text-neo-ink" />,
    success: <CheckCircle2 className="w-6 h-6 text-neo-ink" />,
    default: type === 'alert' ? <Info className="w-6 h-6 text-neo-ink" /> : <HelpCircle className="w-6 h-6 text-neo-ink" />,
  };

  const resolvedHeaderColor = headerColors[variant] || headerColors.default;
  const resolvedIcon = icons[variant] || icons.default;
  const resolvedConfirmColor = confirmColor || (variant === 'danger' ? 'bg-red-600' : 'bg-neo-ink');

  const handleConfirm = async () => {
    if (loading) return;
    if (onConfirm) {
      await onConfirm();
    }
  };

  const handleCancel = () => {
    if (loading) return;
    if (onCancel) {
      onCancel();
    } else {
      onClose();
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neo-ink/50 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      onClick={(e) => {
        // Prevent accidental clicks on backdrop if loading
        if (e.target === e.currentTarget && !loading) {
          handleCancel();
        }
      }}
    >
      <div
        className={`w-full ${maxWidth} bg-white border-3 border-neo-ink rounded-neo neo-shadow-lg flex flex-col max-h-[90vh] overflow-hidden`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className={`flex items-center justify-between px-6 py-4 border-b-3 border-neo-ink ${resolvedHeaderColor}`}>
          <div className="flex items-center gap-3">
            {resolvedIcon}
            <h3 className="text-xl md:text-2xl font-black text-neo-ink tracking-tight">{title}</h3>
          </div>
          <button
            type="button"
            onClick={handleCancel}
            disabled={loading}
            aria-label="Close"
            className="w-9 h-9 rounded-full border-3 border-neo-ink bg-white flex items-center justify-center hover:neo-active neo-shadow text-neo-ink transition-transform disabled:opacity-50"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 md:p-8 space-y-4 overflow-y-auto">
          {message && (
            <p className="font-bold text-neo-ink/80 text-base md:text-lg leading-relaxed whitespace-pre-line">
              {message}
            </p>
          )}
          {children}
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 border-t-3 border-neo-ink bg-neo-bg flex items-center justify-end gap-3">
          {type === 'confirm' ? (
            <>
              <NeoButton
                type="button"
                onClick={handleCancel}
                disabled={loading}
                color="bg-white"
                textColor="text-neo-ink"
                className="!px-5 !py-2.5 text-sm md:text-base"
              >
                {cancelText}
              </NeoButton>
              <NeoButton
                type="button"
                onClick={handleConfirm}
                disabled={loading}
                color={resolvedConfirmColor}
                textColor="text-white"
                className="!px-5 !py-2.5 text-sm md:text-base"
              >
                {loading ? 'Processing...' : confirmText}
              </NeoButton>
            </>
          ) : (
            <NeoButton
              type="button"
              onClick={handleCancel}
              color="bg-neo-ink"
              textColor="text-white"
              className="!px-6 !py-2.5 text-sm md:text-base w-full sm:w-auto"
            >
              {actionText}
            </NeoButton>
          )}
        </div>
      </div>
    </div>
  );
};

export default ConfirmationModal;
