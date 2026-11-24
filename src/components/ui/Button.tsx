import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg' | 'icon';
  isLoading?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className = '', variant = 'primary', size = 'md', isLoading, children, type = 'button', ...props }, ref) => {
    const baseStyles =
      'inline-flex items-center justify-center font-semibold rounded-xl transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-background focus-visible:ring-accent disabled:opacity-50 disabled:pointer-events-none active:scale-[0.98]';

    const variants = {
      primary: 'bg-accent hover:bg-accent-hover text-on-accent shadow-sm',
      secondary: 'bg-card-elevated border border-card-border hover:border-card-border-hover hover:bg-card-hover text-primary',
      ghost: 'bg-transparent hover:bg-card-hover text-secondary hover:text-primary',
      danger: 'bg-danger-soft text-danger hover:bg-danger hover:text-white border border-danger/35',
    };

    const sizes = {
      sm: 'min-h-[38px] px-3.5 py-1.5 text-xs',
      md: 'min-h-[44px] px-5 py-2.5 text-sm',
      lg: 'min-h-[52px] px-7 py-3 text-base',
      icon: 'min-h-[44px] min-w-[44px] p-0',
    };

    return (
      <button
        ref={ref}
        type={type}
        className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`}
        disabled={isLoading || props.disabled}
        {...props}
      >
        {isLoading ? (
          <span className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
        ) : children}
      </button>
    );
  }
);

Button.displayName = 'Button';
