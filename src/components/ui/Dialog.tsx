import { ReactNode } from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: ReactNode;
}

export function Dialog({ open, onOpenChange, children }: DialogProps) {
  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      {children}
    </DialogPrimitive.Root>
  );
}

export function DialogTrigger({ children, asChild }: { children: ReactNode; asChild?: boolean }) {
  return (
    <DialogPrimitive.Trigger asChild={asChild}>
      {children}
    </DialogPrimitive.Trigger>
  );
}

interface DialogContentProps {
  children: ReactNode;
  className?: string;
  title?: string;
  description?: string;
}

export function DialogContent({ children, className, title, description }: DialogContentProps) {
  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Overlay className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 animate-fade-in" />
      <DialogPrimitive.Content
        className={cn(
          'fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50',
          'w-full max-w-md p-6 rounded-xl shadow-2xl animate-scale-in',
          'bg-hub-card border border-hub-border',
          className
        )}
      >
        {title && (
          <DialogPrimitive.Title className="text-lg font-semibold text-hub-text mb-1">
            {title}
          </DialogPrimitive.Title>
        )}
        {description && (
          <DialogPrimitive.Description className="text-sm text-hub-text-muted mb-4">
            {description}
          </DialogPrimitive.Description>
        )}
        {children}
        <DialogPrimitive.Close asChild>
          <button
            className="absolute top-4 right-4 p-1 rounded-lg hover:bg-hub-border transition-colors"
            aria-label="关闭"
          >
            <X className="w-4 h-4 text-hub-text-muted" />
          </button>
        </DialogPrimitive.Close>
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  );
}

export const DialogClose = DialogPrimitive.Close;

