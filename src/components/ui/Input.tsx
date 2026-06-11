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
            w-full h-12 px-4 rounded-xl bg-background border
            focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent
            transition-all duration-200 text-primary placeholder:text-muted
            ${error ? 'border-red-500 focus:ring-red-500' : 'border-[#333333]'}
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
