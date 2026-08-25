import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

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
  sm: 'lg:max-w-md',
  md: 'lg:max-w-lg',
  lg: 'lg:max-w-2xl',
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
  panelClassName = '',
  overlayClassName = '',
  panelStyle,
  panelProps,
  showCloseButton = true,
  lockScroll = true,
  zIndexClass = 'z-[60]',
}) => {
  useEffect(() => {
    if (!isOpen) return;
    if (lockScroll) document.body.style.overflow = 'hidden';
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      if (lockScroll) document.body.style.overflow = '';
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose, lockScroll]);

  if (!isOpen) return null;

  if (variant === 'fullscreen') {
    return createPortal(
      <div role="dialog" aria-modal="true" className={`fixed inset-0 ${zIndexClass} flex flex-col bg-background animate-[fadeIn_0.2s_ease-out] ${panelClassName}`} {...panelProps} style={panelStyle}>
        <div
          className="flex items-center justify-between px-5 py-4 relative border-b border-card-border shrink-0"
          style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 1rem)' }}
        >
          <div className="flex items-center gap-3 min-w-0">
            {icon}
            <div className="min-w-0">
              {title && <h2 className="text-lg font-bold text-primary truncate">{title}</h2>}
              {subtitle && <p className="text-sm text-secondary truncate">{subtitle}</p>}
            </div>
          </div>
          {showCloseButton && (
            <button onClick={onClose} className="p-2 -mr-2 rounded-md hover:bg-card-hover transition-colors shrink-0" aria-label="Close">
              <X className="w-5 h-5 text-secondary" />
            </button>
          )}
        </div>
        <div className="flex-1 overflow-y-auto">{children}</div>
      </div>,
      document.body
    );
  }

  const isSheet = variant === 'sheet';
  const isDrawer = variant === 'drawer';

  return createPortal(
    <div className={`fixed inset-0 ${zIndexClass}`}>
      <div
        className={`absolute inset-0 bg-black/50 animate-[fadeIn_0.2s_ease-out] ${overlayClassName}`}
        onClick={onClose}
      />
      <div
        className={`absolute pointer-events-none ${
          isDrawer
            ? 'inset-0'
            : isSheet
              ? 'inset-x-0 bottom-0 lg:inset-0 lg:flex lg:items-center lg:justify-center'
              : 'inset-0 flex items-center justify-center p-4'
        }`}
      >
        <div
          role="dialog"
          aria-modal="true"
          aria-label={title}
          {...panelProps}
          style={panelStyle}
          className={`
            relative pointer-events-auto bg-card border-card-border flex flex-col
            ${isDrawer
              ? `absolute top-0 right-0 h-full w-full sm:w-[400px] sm:max-w-[400px] border-l animate-[slideInUp_0.3s_ease-out] lg:animate-[fadeScaleIn_0.2s_ease-out]`
              : isSheet
                ? `w-full h-[100dvh] lg:h-auto lg:max-h-[85vh] ${SIZE_CLASSES[size]} lg:w-full border rounded-t-lg lg:rounded-lg animate-[slideInUp_0.3s_ease-out] lg:animate-[fadeScaleIn_0.2s_ease-out]`
                : `w-full ${SIZE_CLASSES[size]} max-h-[85vh] border rounded-lg animate-[fadeScaleIn_0.2s_ease-out]`}
            ${panelClassName}
          `}
        >
          {title !== undefined && (
            <div className="flex items-center justify-between px-5 py-4 border-b border-card-border shrink-0">
              <h2 className="text-lg font-heading font-semibold text-primary">{title}</h2>
              {showCloseButton && (
                <button
                  onClick={onClose}
                  className="w-8 h-8 rounded-md flex items-center justify-center text-secondary hover:text-primary hover:bg-card-hover transition-colors"
                  aria-label="Close"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          )}
          {children}
        </div>
      </div>
    </div>,
    document.body
  );
};
