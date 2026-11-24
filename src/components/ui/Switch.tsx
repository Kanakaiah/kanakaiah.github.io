import React from 'react';

export interface SwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  ariaLabel?: string;
  disabled?: boolean;
  className?: string;
}

/**
 * Keyboard-accessible pill switch meeting WCAG 2.1 AA touch target and ARIA switch semantics.
 */
export const Switch: React.FC<SwitchProps> = ({
  checked,
  onChange,
  ariaLabel,
  disabled = false,
  className = '',
}) => {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={ariaLabel}
      disabled={disabled}
      onClick={(e) => {
        e.stopPropagation();
        if (!disabled) onChange(!checked);
      }}
      className={`
        relative inline-flex h-7 w-12 shrink-0 items-center rounded-full border transition-colors duration-200
        focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-card
        disabled:opacity-50 disabled:pointer-events-none cursor-pointer
        ${checked
          ? 'bg-accent border-accent'
          : 'bg-card-elevated border-card-border-hover'}
        ${className}
      `}
    >
      <span
        aria-hidden="true"
        className={`
          inline-block h-5 w-5 rounded-full shadow-sm transition-transform duration-200
          ${checked
            ? 'translate-x-[22px] bg-on-accent'
            : 'translate-x-[3px] bg-muted'}
        `}
      />
    </button>
  );
};
