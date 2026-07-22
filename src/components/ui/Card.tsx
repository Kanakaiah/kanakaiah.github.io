import React from 'react';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

export const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className = '', children, ...props }, ref) => {
    const isOverflowVisible = className.includes('overflow-visible');
    return (
      <div
        ref={ref}
        className={`bg-card border border-card-border rounded-[1.5rem] shadow-sm transition-all duration-300 ${isOverflowVisible ? '' : 'overflow-hidden'} ${className}`}
        {...props}
      >
        {children}
      </div>
    );
  }
);

Card.displayName = 'Card';
