import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg' | 'icon';
  isLoading?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className = '', variant = 'primary', size = 'md', isLoading, children, ...props }, ref) => {
    const baseStyles = 'inline-flex items-center justify-center font-medium rounded-md transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-background focus:ring-accent disabled:opacity-50 disabled:pointer-events-none active:scale-[0.98]';

    const variants = {
      primary: 'bg-accent hover:bg-accent-hover text-white',
      secondary: 'bg-transparent border border-card-border hover:border-card-border-hover hover:bg-card-hover text-primary',
      ghost: 'bg-transparent hover:bg-card-hover text-secondary hover:text-primary',
      danger: 'bg-transparent text-red-500 hover:bg-red-500/10 border border-red-500/40'
    };
    
    const sizes = {
      sm: 'h-8 px-3 text-xs',
      md: 'h-11 px-5 text-sm',
      lg: 'h-14 px-8 text-base',
      icon: 'h-10 w-10 p-0'
    };

    return (
      <button
        ref={ref}
        className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`}
        disabled={isLoading || props.disabled}
        {...props}
      >
        {isLoading ? (
          <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
        ) : children}
      </button>
    );
  }
);

Button.displayName = 'Button';
