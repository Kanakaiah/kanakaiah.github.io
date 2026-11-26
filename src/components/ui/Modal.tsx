import React, { useEffect, useId } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { useFocusTrap } from '../../utils/useFocusTrap';

/** Reference-counted body scroll lock so nested modals never prematurely unlock scroll. */
let activeScrollLocks = 0;
let previousBodyOverflow = '';

function acquireScrollLock() {
  if (activeScrollLocks === 0) {
    previousBodyOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
  }
  activeScrollLocks += 1;
}

function releaseScrollLock() {
  activeScrollLocks = Math.max(0, activeScrollLocks - 1);
  if (activeScrollLocks === 0) {
    document.body.style.overflow = previousBodyOverflow;
  }
}

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
  icon?: React.ReactNode;
  /**
   * dialog     — centered box at all sizes
   * sheet      — bottom sheet on mobile, centered dialog on desktop
   * drawer     — full-height panel docked to the right edge
   * fullscreen — edge-to-edge panel with a built-in header (used for reader overlays)
   */
  variant?: 'dialog' | 'sheet' | 'drawer' | 'fullscreen';
  size?: 'sm' | 'md' | 'lg';
  role?: 'dialog' | 'alertdialog';
  panelClassName?: string;
  overlayClassName?: string;
  panelStyle?: React.CSSProperties;
  panelProps?: React.HTMLAttributes<HTMLDivElement>;
  showCloseButton?: boolean;
  lockScroll?: boolean;
  /** Override the default z-[60] stacking context — used when an overlay must render above another overlay. */
  zIndexClass?: string;
}

const SIZE_CLASSES: Record<NonNullable<ModalProps['size']>, string> = {
  sm: 'sm:max-w-md',
  md: 'sm:max-w-lg',
  lg: 'sm:max-w-2xl',
};

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  children,
  title,
  subtitle,
  icon,
  variant = 'dialog',
  size = 'md',
  role = 'dialog',
  panelClassName = '',
  overlayClassName = '',
  panelStyle,
  panelProps,
  showCloseButton = true,
  lockScroll = true,
  zIndexClass = 'z-[60]',
}) => {
  const titleId = useId();
  const subtitleId = useId();
  const trapRef = useFocusTrap<HTMLDivElement>(isOpen);

  useEffect(() => {
    if (!isOpen) return;
    if (lockScroll) acquireScrollLock();
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onClose();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      if (lockScroll) releaseScrollLock();
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose, lockScroll]);

  if (!isOpen) return null;

  const ariaProps = {
    role,
    'aria-modal': true as const,
    'aria-labelledby': title ? titleId : undefined,
    'aria-describedby': subtitle ? subtitleId : undefined,
    'aria-label': !title ? 'Dialog' : undefined,
  };

  if (variant === 'fullscreen') {
    return createPortal(
      <div
        ref={trapRef}
        {...ariaProps}
        className={`fixed top-0 left-0 right-0 ${zIndexClass} flex flex-col bg-background animate-[fadeIn_0.2s_ease-out] ${panelClassName}`}
        {...panelProps}
        style={{ height: 'var(--app-height)', ...panelStyle }}
      >
        <div
          className="flex items-center justify-between px-5 py-3.5 relative border-b border-card-border shrink-0"
          style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 0.875rem)' }}
        >
          <div className="flex items-center gap-3 min-w-0">
            {icon}
            <div className="min-w-0">
              {title && (
                <h2 id={titleId} className="text-lg font-heading font-bold text-primary truncate">
                  {title}
                </h2>
              )}
              {subtitle && (
                <p id={subtitleId} className="text-xs sm:text-sm text-secondary truncate">
                  {subtitle}
                </p>
              )}
            </div>
          </div>
          {showCloseButton && (
            <button
              type="button"
              onClick={onClose}
              className="min-w-[44px] min-h-[44px] -mr-2 rounded-xl flex items-center justify-center hover:bg-card-hover transition-colors shrink-0"
              aria-label="Close"
            >
              <X className="w-5 h-5 text-secondary" />
            </button>
          )}
        </div>
        <div className="flex-1 min-h-0 overflow-y-auto">{children}</div>
      </div>,
      document.body
    );
  }

  const isSheet = variant === 'sheet';
  const isDrawer = variant === 'drawer';

  return createPortal(
    <div className={`fixed top-0 left-0 right-0 ${zIndexClass}`} style={{ height: 'var(--app-height)' }}>
      <div
        className={`absolute inset-0 bg-scrim backdrop-blur-[2px] animate-[fadeIn_0.2s_ease-out] ${overlayClassName}`}
        onClick={onClose}
      />
      <div
        className={`absolute pointer-events-none ${
          isDrawer
            ? 'inset-0'
            : isSheet
              ? 'inset-x-0 bottom-0 sm:inset-0 sm:flex sm:items-center sm:justify-center sm:p-4'
              : 'inset-0 flex items-center justify-center p-4'
        }`}
      >
        <div
          ref={trapRef}
          {...ariaProps}
          {...panelProps}
          style={{
            ...(isSheet || isDrawer
              ? { paddingBottom: 'env(safe-area-inset-bottom, 0px)' }
              : undefined),
            ...panelStyle,
          }}
          className={`
            relative pointer-events-auto bg-card border-card-border flex flex-col overflow-hidden shadow-2xl
            ${isDrawer
              ? `absolute top-0 right-0 h-full w-full sm:w-[420px] sm:max-w-[420px] border-l animate-[slideInRight_0.26s_cubic-bezier(0.16,1,0.3,1)]`
              : isSheet
                ? `w-full max-h-[88dvh] ${SIZE_CLASSES[size]} border rounded-t-[24px] sm:rounded-[20px] animate-[slideInUp_0.28s_cubic-bezier(0.16,1,0.3,1)] sm:animate-[fadeScaleIn_0.2s_ease-out]`
                : `w-full ${SIZE_CLASSES[size]} max-h-[88dvh] border rounded-[20px] animate-[fadeScaleIn_0.2s_ease-out]`}
            ${panelClassName}
          `}
        >
          {isSheet && title !== undefined && (
            <div className="flex justify-center pt-3 pb-0.5 shrink-0 sm:hidden" aria-hidden="true">
              <div className="w-10 h-1 rounded-full bg-card-border-hover" />
            </div>
          )}

          {title !== undefined && (
            <div
              className="flex items-start justify-between gap-3 px-5 py-3.5 border-b border-card-border shrink-0"
              style={isDrawer ? { paddingTop: 'calc(env(safe-area-inset-top, 0px) + 0.875rem)' } : undefined}
            >
              <div className="flex items-center gap-3 min-w-0 pt-0.5">
                {icon}
                <div className="min-w-0">
                  <h2 id={titleId} className="text-lg font-heading font-bold text-primary leading-tight truncate">
                    {title}
                  </h2>
                  {subtitle && (
                    <p id={subtitleId} className="text-xs text-secondary mt-0.5 truncate">
                      {subtitle}
                    </p>
                  )}
                </div>
              </div>
              {showCloseButton && (
                <button
                  type="button"
                  onClick={onClose}
                  className="min-w-[44px] min-h-[44px] -mr-2 -my-1 rounded-xl flex items-center justify-center text-secondary hover:text-primary hover:bg-card-hover transition-colors shrink-0"
                  aria-label="Close"
                >
                  <X className="w-5 h-5" />
                </button>
              )}
            </div>
          )}

          {title !== undefined ? (
            <div className="flex-1 min-h-0 overflow-y-auto flex flex-col">
              {children}
            </div>
          ) : (
            children
          )}
        </div>
      </div>
    </div>,
    document.body
  );
};
