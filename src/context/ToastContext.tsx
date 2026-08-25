import React, { createContext, useContext, useState, useCallback } from 'react';
import type { ReactNode } from 'react';

type ToastType = 'success' | 'error' | 'info';

interface ToastAction {
  label: string;
  onClick: () => void;
}

interface ToastMessage {
  id: string;
  message: string;
  type: ToastType;
  action?: ToastAction;
}

interface ToastContextProps {
  showToast: (message: string, type?: ToastType, action?: ToastAction) => void;
}

const ToastContext = createContext<ToastContextProps | undefined>(undefined);

export const ToastProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const showToast = useCallback((message: string, type: ToastType = 'info', action?: ToastAction) => {
    const id = Math.random().toString(36).substr(2, 9);
    setToasts(prev => [...prev, { id, message, type, action }]);

    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, action ? 5000 : 3000); // give a bit more time if there's an action
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      {/* Every grading confirmation in the app — "Next review in 6 days" — arrives here,
          and arrived silently for anyone using a screen reader: there was no aria-live
          region anywhere in src/. `polite` so it waits for a pause rather than cutting
          across whatever is being read. */}
      <div
        role="status"
        aria-live="polite"
        aria-atomic="true"
        className="fixed bottom-20 lg:bottom-10 left-1/2 transform -translate-x-1/2 z-[9999] flex flex-col gap-2 pointer-events-none w-full max-w-sm px-4"
      >
        {toasts.map(toast => (
          <div
            key={toast.id}
            className={`
              pointer-events-auto px-4 py-3 rounded-md border-l-2 bg-card-elevated border border-card-border text-sm font-medium text-primary
              animate-[fadeIn_0.3s_ease-out_forwards] shadow-sm flex items-center justify-between
              ${toast.type === 'success' ? 'border-l-green-500' : ''}
              ${toast.type === 'error' ? 'border-l-red-500' : ''}
              ${toast.type === 'info' ? 'border-l-accent' : ''}
            `}
          >
            <span>{toast.message}</span>
            {toast.action && (
              <button
                onClick={() => {
                  setToasts(prev => prev.filter(t => t.id !== toast.id));
                  toast.action!.onClick();
                }}
                className="ml-4 px-3 py-1.5 rounded-md bg-card-hover hover:bg-card-border transition-colors whitespace-nowrap active:scale-95 text-primary"
              >
                {toast.action.label}
              </button>
            )}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) throw new Error('useToast must be used within ToastProvider');
  return context;
};
