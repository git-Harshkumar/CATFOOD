import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { AlertCircle, CheckCircle2, Info, X } from 'lucide-react';

const NotificationContext = createContext();

export const useNotification = () => useContext(NotificationContext);

export const NotificationProvider = ({ children }) => {
  const [notifications, setNotifications] = useState([]);

  const showNotification = useCallback((type, message) => {
    const id = Date.now();
    setNotifications((prev) => [...prev, { id, type, message }]);
  }, []);

  const removeNotification = useCallback((id) => {
    setNotifications((prev) => prev.filter((notif) => notif.id !== id));
  }, []);

  return (
    <NotificationContext.Provider value={{ showNotification }}>
      {children}
      {/* Toast Container */}
      <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[99999] flex flex-col items-center gap-3 w-full max-w-sm px-4">
        {notifications.map((notif) => (
          <NotificationToast
            key={notif.id}
            notification={notif}
            onClose={() => removeNotification(notif.id)}
          />
        ))}
      </div>
    </NotificationContext.Provider>
  );
};

const NotificationToast = ({ notification, onClose }) => {
  const { type, message } = notification;
  const duration = 5000; // 5 seconds

  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, duration);
    return () => clearTimeout(timer);
  }, [onClose, duration]);

  const variants = {
    success: {
      bg: 'bg-neo-pastel-green',
      icon: <CheckCircle2 className="w-6 h-6 text-neo-ink" />,
    },
    warn: {
      bg: 'bg-neo-pastel-yellow',
      icon: <AlertCircle className="w-6 h-6 text-neo-ink" />,
    },
    error: {
      bg: 'bg-neo-pastel-pink',
      icon: <AlertCircle className="w-6 h-6 text-neo-ink" />,
    },
    info: {
      bg: 'bg-white',
      icon: <Info className="w-6 h-6 text-neo-ink" />,
    },
  };

  const currentVariant = variants[type] || variants.info;

  return (
    <div className={`relative w-full p-4 rounded-xl border-3 border-neo-ink shadow-[4px_4px_0px_0px_#1a1a1a] flex items-start justify-between gap-3 overflow-hidden animate-slide-down ${currentVariant.bg}`}>
      <div className="flex items-start gap-3 w-full">
        <div className="shrink-0 mt-0.5">{currentVariant.icon}</div>
        <div className="flex-1 font-bold text-neo-ink text-sm leading-snug">
          {message}
        </div>
      </div>
      <button
        onClick={onClose}
        className="shrink-0 hover:bg-black/10 rounded p-1 transition-colors"
      >
        <X className="w-4 h-4 text-neo-ink" />
      </button>

      {/* Progress Bar */}
      <div className="absolute bottom-0 left-0 h-1 bg-neo-ink" style={{ animation: `shrink ${duration}ms linear forwards` }} />

      <style>{`
        @keyframes slide-down {
          0% { transform: translateY(-100%); opacity: 0; }
          100% { transform: translateY(0); opacity: 1; }
        }
        .animate-slide-down {
          animation: slide-down 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards;
        }
        @keyframes shrink {
          0% { width: 100%; }
          100% { width: 0%; }
        }
      `}</style>
    </div>
  );
};
