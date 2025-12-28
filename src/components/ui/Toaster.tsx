import { useAppStore } from '@/stores/appStore';
import { cn } from '@/lib/utils';
import { X, CheckCircle, AlertCircle, AlertTriangle, Info } from 'lucide-react';

export function Toaster() {
  const { toasts, removeToast } = useAppStore();

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={cn(
            'flex items-start gap-3 p-4 rounded-lg shadow-lg animate-slide-up',
            'bg-hub-card border border-hub-border min-w-[300px] max-w-[400px]'
          )}
        >
          <div className="flex-shrink-0">
            {toast.type === 'success' && (
              <CheckCircle className="w-5 h-5 text-hub-success" />
            )}
            {toast.type === 'error' && (
              <AlertCircle className="w-5 h-5 text-hub-danger" />
            )}
            {toast.type === 'warning' && (
              <AlertTriangle className="w-5 h-5 text-hub-warning" />
            )}
            {toast.type === 'info' && (
              <Info className="w-5 h-5 text-hub-accent" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-hub-text">{toast.title}</p>
            {toast.description && (
              <p className="mt-1 text-xs text-hub-text-muted">{toast.description}</p>
            )}
          </div>
          <button
            onClick={() => removeToast(toast.id)}
            className="flex-shrink-0 p-1 rounded hover:bg-hub-border transition-colors"
          >
            <X className="w-4 h-4 text-hub-text-muted" />
          </button>
        </div>
      ))}
    </div>
  );
}

