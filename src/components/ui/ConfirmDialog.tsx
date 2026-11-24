import React from 'react';
import { AlertTriangle } from 'lucide-react';
import { Modal } from './Modal';
import { Button } from './Button';

export interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: 'danger' | 'primary';
  onConfirm: () => void;
  onCancel: () => void;
  zIndexClass?: string;
}

/**
 * Theme-native accessible confirmation dialog replacing browser `window.confirm()`.
 */
export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  isOpen,
  title,
  description,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  tone = 'danger',
  onConfirm,
  onCancel,
  zIndexClass = 'z-[80]',
}) => {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onCancel}
      variant="dialog"
      size="sm"
      role="alertdialog"
      showCloseButton={false}
      zIndexClass={zIndexClass}
    >
      <div className="p-5 sm:p-6 flex flex-col gap-4">
        {tone === 'danger' && (
          <div className="w-11 h-11 rounded-2xl bg-danger-soft text-danger flex items-center justify-center shrink-0">
            <AlertTriangle className="w-5 h-5" />
          </div>
        )}
        <div className="space-y-1.5">
          <h3 className="text-lg font-heading font-bold text-primary leading-snug">
            {title}
          </h3>
          <p className="text-sm text-secondary leading-relaxed">
            {description}
          </p>
        </div>
        <div className="grid grid-cols-2 gap-2.5 pt-1">
          <Button variant="secondary" onClick={onCancel} className="w-full">
            {cancelLabel}
          </Button>
          <Button
            variant={tone === 'danger' ? 'danger' : 'primary'}
            onClick={onConfirm}
            className="w-full"
          >
            {confirmLabel}
          </Button>
        </div>
      </div>
    </Modal>
  );
};
