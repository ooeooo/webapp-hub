import { forwardRef, type ButtonHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'primary' | 'ghost' | 'danger' | 'outline';
  size?: 'sm' | 'md' | 'lg' | 'icon';
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'default', size = 'md', ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          'inline-flex items-center justify-center rounded-lg font-medium transition-all duration-200',
          'focus:outline-none focus:ring-2 focus:ring-hub-accent focus:ring-offset-2 focus:ring-offset-hub-bg',
          'disabled:opacity-50 disabled:cursor-not-allowed',
          // Variants
          variant === 'default' && 'bg-hub-card hover:bg-hub-card-hover text-hub-text border border-hub-border',
          variant === 'primary' && 'bg-hub-accent hover:bg-hub-accent-hover text-white',
          variant === 'ghost' && 'bg-transparent hover:bg-hub-card text-hub-text',
          variant === 'danger' && 'bg-hub-danger hover:bg-red-600 text-white',
          variant === 'outline' && 'bg-transparent border border-hub-border hover:bg-hub-card text-hub-text',
          // Sizes
          size === 'sm' && 'px-3 py-1.5 text-sm',
          size === 'md' && 'px-4 py-2 text-sm',
          size === 'lg' && 'px-6 py-3 text-base',
          size === 'icon' && 'p-2',
          className
        )}
        {...props}
      />
    );
  }
);

Button.displayName = 'Button';

