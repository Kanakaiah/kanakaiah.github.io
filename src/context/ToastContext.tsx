import React, { createContext, useContext, useState, useCallback, useRef } from 'react';
import type { ReactNode } from 'react';
import { Check, AlertCircle, Info, X } from 'lucide-react';

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
  exiting?: boolean;
}

interface ToastContextProps {
  showToast: (message: string, type?: ToastType, action?: ToastAction) => void;
}

const MAX_TOASTS = 3;
const EXIT_ANIMATION_MS = 220;

const ToastContext = createContext<ToastContextProps | undefined>(undefined);

export const ToastProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const timersRef = useRef<Map<string, { timer: ReturnType<typeof setTimeout>; remaining: number; startedAt: number }>>(new Map());

  const dismissToast = useCallback((id: string) => {
    const entry = timersRef.current.get(id);
    if (entry) {
      clearTimeout(entry.timer);
      timersRef.current.delete(id);
    }
    setToasts(prev => prev.map(t => (t.id === id ? { ...t, exiting: true } : t)));
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, EXIT_ANIMATION_MS);
  }, []);

  const scheduleDismiss = useCallback((id: string, duration: number) => {
    const existing = timersRef.current.get(id);
    if (existing) clearTimeout(existing.timer);
    const timer = setTimeout(() => {
      dismissToast(id);
    }, duration);
    timersRef.current.set(id, { timer, remaining: duration, startedAt: Date.now() });
  }, [dismissToast]);

  const pauseToast = useCallback((id: string) => {
    const entry = timersRef.current.get(id);
    if (!entry) return;
    clearTimeout(entry.timer);
    const elapsed = Date.now() - entry.startedAt;
    entry.remaining = Math.max(800, entry.remaining - elapsed);
  }, []);

  const resumeToast = useCallback((id: string) => {
    const entry = timersRef.current.get(id);
    if (!entry) return;
    scheduleDismiss(id, entry.remaining);
  }, [scheduleDismiss]);

  const showToast = useCallback((message: string, type: ToastType = 'info', action?: ToastAction) => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    const duration = action ? 5500 : 3400;

    setToasts(prev => {
      const next = [...prev, { id, message, type, action }];
      return next.slice(-MAX_TOASTS);
    });

    scheduleDismiss(id, duration);
  }, [scheduleDismiss]);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div
        role="status"
        aria-live="polite"
        aria-atomic="true"
        className="fixed bottom-24 lg:bottom-8 left-1/2 -translate-x-1/2 z-[9999] flex flex-col gap-2 pointer-events-none w-full max-w-sm px-4"
      >
        {toasts.map(toast => {
          const iconBg =
            toast.type === 'success'
              ? 'bg-success-soft text-success'
              : toast.type === 'error'
                ? 'bg-danger-soft text-danger'
                : 'bg-accent/15 text-accent';

          return (
            <div
              key={toast.id}
              onMouseEnter={() => pauseToast(toast.id)}
              onMouseLeave={() => resumeToast(toast.id)}
              onFocus={() => pauseToast(toast.id)}
              onBlur={() => resumeToast(toast.id)}
              className={`
                pointer-events-auto px-3.5 py-2.5 rounded-2xl bg-card border border-card-border-hover text-sm font-medium text-primary
                shadow-xl flex items-center gap-2.5
                ${toast.exiting ? 'toast-exit' : 'animate-[toastIn_0.22s_cubic-bezier(0.16,1,0.3,1)]'}
              `}
            >
              <span className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 ${iconBg}`} aria-hidden="true">
                {toast.type === 'success' ? (
                  <Check className="w-3.5 h-3.5" />
                ) : toast.type === 'error' ? (
                  <AlertCircle className="w-3.5 h-3.5" />
                ) : (
                  <Info className="w-3.5 h-3.5" />
                )}
              </span>

              <span className="flex-1 text-xs sm:text-sm leading-snug">{toast.message}</span>

              {toast.action && (
                <button
                  type="button"
                  onClick={() => {
                    dismissToast(toast.id);
                    toast.action!.onClick();
                  }}
                  className="px-2.5 py-1.5 rounded-xl bg-accent/15 text-accent hover:bg-accent/25 text-xs font-bold transition-colors whitespace-nowrap active:scale-95"
                >
                  {toast.action.label}
                </button>
              )}

              <button
                type="button"
                onClick={() => dismissToast(toast.id)}
                className="min-w-[32px] min-h-[32px] -mr-1 rounded-xl flex items-center justify-center text-muted hover:text-primary hover:bg-card-hover transition-colors shrink-0"
                aria-label="Dismiss notification"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) throw new Error('useToast must be used within ToastProvider');
  return context;
};
