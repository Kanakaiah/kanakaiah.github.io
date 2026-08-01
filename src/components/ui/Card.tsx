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
        className={`bg-card border border-card-border rounded-lg shadow-sm transition-colors duration-200 ${isOverflowVisible ? '' : 'overflow-hidden'} ${className}`}
        {...props}
      >
        {children}
      </div>
    );
  }
);

Card.displayName = 'Card';
