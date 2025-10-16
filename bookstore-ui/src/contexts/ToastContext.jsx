import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';

const ToastContext = createContext(null);

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);
  const idCounter = useRef(0);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback(({ title, message, type = 'success', duration = 2500, actionLabel, onAction }) => {
    const id = ++idCounter.current;
    const toast = { id, title, message, type, actionLabel, onAction };
    setToasts((prev) => [...prev, toast]);
    if (duration > 0) {
      setTimeout(() => removeToast(id), duration);
    }
  }, [removeToast]);

  const value = { showToast };

  return (
    <ToastContext.Provider value={value}>
      {children}
      {/* Toast host */}
      <div className="fixed top-24 right-6 z-[9999] space-y-3 pointer-events-none">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`pointer-events-auto flex items-start gap-3 rounded-lg shadow-lg ring-1 ring-gray-200 p-4 w-80 animate-[fadeIn_150ms_ease-out] ${t.type === 'success' ? 'bg-white' : t.type === 'info' ? 'bg-white' : t.type === 'error' ? 'bg-white' : 'bg-white'} border border-${t.type === 'success' ? 'green-500' : t.type === 'info' ? 'blue-500' : t.type === 'error' ? 'red-500' : 'teal-500'}`} 
          >
            {/* Icon */}
            <div className={`mt-0.5 p-2 rounded-full ${t.type === 'success' ? 'bg-green-100 text-green-700' : t.type === 'error' ? 'bg-red-100 text-red-700' : 'bg-[#008080]/10 text-[#008080]'}`}>
              {t.type === 'success' ? (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.707a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              ) : t.type === 'error' ? (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M18 10A8 8 0 11.001 10 8 8 0 0118 10zM8.293 6.293a1 1 0 011.414 0L10 6.586l.293-.293a1 1 0 111.414 1.414L11.414 8l.293.293a1 1 0 01-1.414 1.414L10 9.414l-.293.293a1 1 0 01-1.414-1.414L8.586 8l-.293-.293a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2a10 10 0 100 20 10 10 0 000-20zm.75 14.5h-1.5v-6h1.5v6zm0-8h-1.5v-1.5h1.5V8.5z" />
                </svg>
              )}
            </div>

            {/* Content */}
            <div className="flex-1">
              {t.title && <div className="text-sm font-semibold text-gray-900">{t.title}</div>}
              {t.message && <div className="text-sm text-gray-700 mt-0.5">{t.message}</div>}
              {t.actionLabel && t.onAction && (
                <button
                  className="mt-2 inline-flex text-sm font-medium text-[#008080] hover:underline"
                  onClick={() => {
                    try { t.onAction(); } catch {}
                    removeToast(t.id);
                  }}
                >
                  {t.actionLabel}
                </button>
              )}
            </div>

            {/* Close */}
            <button
              className="text-gray-400 hover:text-gray-600"
              aria-label="Close"
              onClick={() => removeToast(t.id)}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                <path d="M6.225 4.811A1 1 0 017.64 3.396l4.36 4.36 4.36-4.36a1 1 0 111.415 1.415l-4.36 4.36 4.36 4.36a1 1 0 01-1.415 1.415l-4.36-4.36-4.36 4.36A1 1 0 016.225 14.94l4.36-4.36-4.36-4.36z" />
              </svg>
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
};