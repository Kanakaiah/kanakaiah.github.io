import React, { useId } from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className = '', label, error, id, ...props }, ref) => {
    const generatedId = useId();
    const inputId = id || generatedId;
    const errorId = error ? `${inputId}-error` : undefined;

    return (
      <div className="flex flex-col gap-1.5 w-full">
        {label && (
          <label htmlFor={inputId} className="text-sm font-medium text-secondary ml-0.5">
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          aria-invalid={Boolean(error) || undefined}
          aria-describedby={errorId}
          className={`
            w-full min-h-[44px] h-11 px-4 rounded-xl bg-card-elevated border text-sm shadow-sm
            focus:outline-none focus:ring-2 focus:ring-accent/35 focus:border-accent
            transition-colors duration-200 text-primary placeholder:text-muted
            ${error ? 'border-danger focus:ring-danger/35' : 'border-card-border hover:border-card-border-hover'}
            ${className}
          `}
          {...props}
        />
        {error && (
          <span id={errorId} className="text-xs text-danger ml-0.5 font-medium">
            {error}
          </span>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';
