import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className = '', label, error, id, ...props }, ref) => {
    const inputId = id || `input-${Math.random().toString(36).substr(2, 9)}`;

    return (
      <div className="flex flex-col gap-1.5 w-full">
        {label && (
          <label htmlFor={inputId} className="text-sm font-medium text-secondary ml-1">
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          className={`
            w-full h-14 px-4 rounded-2xl bg-card border shadow-sm
            focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent
            transition-all duration-300 text-primary placeholder:text-muted/60
            ${error ? 'border-red-500 focus:ring-red-500' : 'border-card-border hover:border-card-border-hover'}
            ${className}
          `}
          {...props}
        />
        {error && (
          <span className="text-xs text-red-500 ml-1 font-medium">{error}</span>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';
