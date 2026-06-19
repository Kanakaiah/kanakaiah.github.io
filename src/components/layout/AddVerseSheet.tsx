import React, { useEffect } from 'react';
import { X } from 'lucide-react';
import { AddVerse } from '../../screens/AddVerse';

interface AddVerseSheetProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AddVerseSheet: React.FC<AddVerseSheetProps> = ({ isOpen, onClose }) => {
  // Lock body scroll when sheet is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60]">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm animate-[fadeIn_0.2s_ease-out]"
        onClick={onClose}
      />

      {/* Sheet Panel — mobile: bottom sheet, desktop: centered modal */}
      <div className="absolute inset-x-0 bottom-0 lg:inset-0 lg:flex lg:items-center lg:justify-center pointer-events-none">
        <div
          className="
            pointer-events-auto
            w-full h-auto max-h-[96dvh]
            lg:max-h-[85vh] lg:max-w-2xl lg:w-full
            bg-background border-t border-glass-border
            lg:border lg:rounded-2xl
            rounded-t-2xl
            flex flex-col
            animate-[slideInUp_0.3s_ease-out]
            lg:animate-[fadeScaleIn_0.25s_ease-out]
          "
        >
          {/* Drag Handle (mobile only) */}
          <div className="flex justify-center pt-3 pb-1 lg:hidden">
            <div className="w-10 h-1 rounded-full bg-glass-border" />
          </div>

          {/* Header */}
          <div className="flex items-center justify-between px-5 py-3 border-b border-glass-border shrink-0">
            <h2 className="text-xl font-heading font-bold text-primary">Add a Verse</h2>
            <button
              onClick={onClose}
              className="w-9 h-9 rounded-xl flex items-center justify-center text-secondary hover:text-primary hover:bg-glass-bg-hover transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Scrollable Body */}
          <div className="flex-1 overflow-y-auto px-5 py-4 [&::-webkit-scrollbar]:hidden">
            <AddVerse onVerseAdded={onClose} />
          </div>
        </div>
      </div>
    </div>
  );
};
