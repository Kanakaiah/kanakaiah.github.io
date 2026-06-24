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
      <div className="fixed bottom-20 lg:bottom-10 left-1/2 transform -translate-x-1/2 z-[9999] flex flex-col gap-2 pointer-events-none w-full max-w-sm px-4">
        {toasts.map(toast => (
          <div
            key={toast.id}
            className={`
              pointer-events-auto px-4 py-3 rounded-xl shadow-lg border text-sm font-medium
              animate-[fadeIn_0.3s_ease-out_forwards] backdrop-blur-md flex items-center justify-between
              ${toast.type === 'success' ? 'bg-green-500/20 border-green-500/30 text-green-100' : ''}
              ${toast.type === 'error' ? 'bg-red-500/20 border-red-500/30 text-red-100' : ''}
              ${toast.type === 'info' ? 'bg-blue-500/20 border-blue-500/30 text-blue-100' : ''}
            `}
          >
            <span>{toast.message}</span>
            {toast.action && (
              <button 
                onClick={() => {
                  setToasts(prev => prev.filter(t => t.id !== toast.id));
                  toast.action!.onClick();
                }}
                className="ml-4 px-3 py-1.5 rounded-lg bg-white/20 hover:bg-white/30 transition-colors whitespace-nowrap active:scale-95"
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
