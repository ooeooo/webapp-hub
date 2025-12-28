import { forwardRef, type InputHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, ...props }, ref) => {
    return (
      <div className="w-full">
        {label && (
          <label className="block text-sm font-medium text-hub-text mb-1.5">
            {label}
          </label>
        )}
        <input
          ref={ref}
          className={cn(
            'w-full px-3 py-2 rounded-lg text-sm',
            'bg-hub-card border border-hub-border',
            'text-hub-text placeholder:text-hub-text-muted',
            'focus:outline-none focus:ring-2 focus:ring-hub-accent focus:border-transparent',
            'transition-all duration-200',
            error && 'border-hub-danger focus:ring-hub-danger',
            className
          )}
          {...props}
        />
        {error && (
          <p className="mt-1 text-xs text-hub-danger">{error}</p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';

