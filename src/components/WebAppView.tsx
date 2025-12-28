import { useEffect, useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { cn } from '@/lib/utils';
import { ExternalLink, Loader2, Monitor } from 'lucide-react';
import { openUrl } from '@tauri-apps/plugin-opener';
import type { WebApp } from '@/types';

interface WebAppViewProps {
  webapp: WebApp;
}

export function WebAppView({ webapp }: WebAppViewProps) {
  const [isOpening, setIsOpening] = useState(false);
  const [hasOpened, setHasOpened] = useState(false);

  useEffect(() => {
    // 当选择新的 webapp 时，自动打开窗口
    openWebAppWindow();
  }, [webapp.id]);

  const openWebAppWindow = async () => {
    setIsOpening(true);
    try {
      await invoke('open_webapp_window', { webappId: webapp.id });
      setHasOpened(true);
    } catch (err) {
      console.error('Failed to open webapp window:', err);
    } finally {
      setIsOpening(false);
    }
  };

  const handleOpenInBrowser = async () => {
    try {
      await openUrl(webapp.url);
    } catch (err) {
      console.error('Failed to open in browser:', err);
    }
  };

  return (
    <div className="flex-1 flex flex-col items-center justify-center bg-hub-bg p-8">
      <div className="max-w-md text-center">
        {/* App Icon */}
        <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-hub-accent/20 to-hub-accent/5 flex items-center justify-center mx-auto mb-6">
          {webapp.icon ? (
            <img
              src={webapp.icon}
              alt={webapp.name}
              className="w-12 h-12 rounded-lg object-contain"
            />
          ) : (
            <Monitor className="w-10 h-10 text-hub-accent" />
          )}
        </div>

        {/* App Name */}
        <h2 className="text-2xl font-semibold text-hub-text mb-2">{webapp.name}</h2>
        <p className="text-sm text-hub-text-muted mb-6 truncate">{webapp.url}</p>

        {/* Status */}
        {isOpening ? (
          <div className="flex items-center justify-center gap-2 text-hub-text-muted mb-6">
            <Loader2 className="w-5 h-5 animate-spin" />
            <span>正在打开窗口...</span>
          </div>
        ) : hasOpened ? (
          <div className="flex items-center justify-center gap-2 text-green-500 mb-6">
            <Monitor className="w-5 h-5" />
            <span>窗口已打开</span>
          </div>
        ) : null}

        {/* Actions */}
        <div className="flex flex-col gap-3">
          <button
            onClick={openWebAppWindow}
            disabled={isOpening}
            className={cn(
              'w-full px-6 py-3 rounded-xl font-medium transition-all',
              'bg-hub-accent hover:bg-hub-accent-hover text-white',
              'flex items-center justify-center gap-2',
              isOpening && 'opacity-50 cursor-not-allowed'
            )}
          >
            <Monitor className="w-5 h-5" />
            {hasOpened ? '重新打开窗口' : '打开窗口'}
          </button>

          <button
            onClick={handleOpenInBrowser}
            className={cn(
              'w-full px-6 py-3 rounded-xl font-medium transition-all',
              'bg-hub-card hover:bg-hub-card-hover text-hub-text border border-hub-border',
              'flex items-center justify-center gap-2'
            )}
          >
            <ExternalLink className="w-5 h-5" />
            在浏览器中打开
          </button>
        </div>

        {/* Hint */}
        <p className="mt-6 text-xs text-hub-text-muted">
          小程序将在独立窗口中打开，支持完整的网页功能
        </p>
      </div>
    </div>
  );
}
