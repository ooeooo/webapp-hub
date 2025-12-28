import { useState, useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { ArrowLeft, ArrowRight, RotateCw, ExternalLink, Home, Lock, Unlock } from 'lucide-react';
import { openUrl } from '@tauri-apps/plugin-opener';
import type { WebApp } from '@/types';

interface WebAppViewProps {
  webapp: WebApp;
}

export function WebAppView({ webapp }: WebAppViewProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [currentUrl, setCurrentUrl] = useState(webapp.url);
  const [canGoBack, setCanGoBack] = useState(false);
  const [canGoForward, setCanGoForward] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Reset state when webapp changes
  useEffect(() => {
    setCurrentUrl(webapp.url);
    setCanGoBack(false);
    setCanGoForward(false);
    setIsLoading(true);
    setError(null);
  }, [webapp.id, webapp.url]);

  const handleGoBack = () => {
    try {
      iframeRef.current?.contentWindow?.history.back();
    } catch {
      // Cross-origin restriction
    }
  };

  const handleGoForward = () => {
    try {
      iframeRef.current?.contentWindow?.history.forward();
    } catch {
      // Cross-origin restriction
    }
  };

  const handleReload = () => {
    setIsLoading(true);
    if (iframeRef.current) {
      iframeRef.current.src = currentUrl;
    }
  };

  const handleHome = () => {
    setCurrentUrl(webapp.url);
    setIsLoading(true);
    if (iframeRef.current) {
      iframeRef.current.src = webapp.url;
    }
  };

  const handleOpenInBrowser = async () => {
    try {
      await openUrl(currentUrl);
    } catch (err) {
      console.error('Failed to open in browser:', err);
    }
  };

  const handleIframeLoad = () => {
    setIsLoading(false);
    setError(null);
    
    try {
      // Try to access iframe content (may fail due to CORS)
      const iframe = iframeRef.current;
      if (iframe?.contentWindow) {
        setCanGoBack(iframe.contentWindow.history.length > 1);
      }
    } catch {
      // Cross-origin - can't access history
    }
  };

  const handleIframeError = () => {
    setIsLoading(false);
    setError('无法加载此页面。可能是跨域限制或网络问题。');
  };

  // Check if the URL is likely to work in iframe
  const isEmbeddable = !webapp.url.includes('google.com') && 
                       !webapp.url.includes('github.com') &&
                       !webapp.url.includes('twitter.com') &&
                       !webapp.url.includes('facebook.com');

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden">
      {/* Navigation Bar */}
      <div className="flex-shrink-0 h-12 bg-hub-card border-b border-hub-border flex items-center px-3 gap-1">
        {/* Navigation Buttons */}
        <button
          onClick={handleGoBack}
          disabled={!canGoBack}
          className={cn(
            'w-8 h-8 rounded-lg flex items-center justify-center transition-colors',
            canGoBack
              ? 'text-hub-text hover:bg-hub-card-hover'
              : 'text-hub-text-muted/50 cursor-not-allowed'
          )}
          title="后退"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        
        <button
          onClick={handleGoForward}
          disabled={!canGoForward}
          className={cn(
            'w-8 h-8 rounded-lg flex items-center justify-center transition-colors',
            canGoForward
              ? 'text-hub-text hover:bg-hub-card-hover'
              : 'text-hub-text-muted/50 cursor-not-allowed'
          )}
          title="前进"
        >
          <ArrowRight className="w-4 h-4" />
        </button>

        <button
          onClick={handleReload}
          className={cn(
            'w-8 h-8 rounded-lg flex items-center justify-center transition-colors',
            'text-hub-text hover:bg-hub-card-hover',
            isLoading && 'animate-spin'
          )}
          title="刷新"
        >
          <RotateCw className="w-4 h-4" />
        </button>

        <button
          onClick={handleHome}
          className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors text-hub-text hover:bg-hub-card-hover"
          title="首页"
        >
          <Home className="w-4 h-4" />
        </button>

        {/* URL Bar */}
        <div className="flex-1 mx-2 flex items-center gap-2 px-3 py-1.5 bg-hub-bg rounded-lg border border-hub-border">
          {currentUrl.startsWith('https') ? (
            <Lock className="w-3.5 h-3.5 text-green-500 flex-shrink-0" />
          ) : (
            <Unlock className="w-3.5 h-3.5 text-hub-text-muted flex-shrink-0" />
          )}
          <span className="text-sm text-hub-text truncate">{currentUrl}</span>
        </div>

        {/* Open in Browser */}
        <button
          onClick={handleOpenInBrowser}
          className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors text-hub-text hover:bg-hub-card-hover hover:text-hub-accent"
          title="在浏览器中打开"
        >
          <ExternalLink className="w-4 h-4" />
        </button>
      </div>

      {/* WebApp Content */}
      <div className="flex-1 relative bg-white">
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-hub-bg z-10">
            <div className="flex flex-col items-center gap-3">
              <RotateCw className="w-8 h-8 text-hub-accent animate-spin" />
              <span className="text-sm text-hub-text-muted">加载中...</span>
            </div>
          </div>
        )}

        {error && (
          <div className="absolute inset-0 flex items-center justify-center bg-hub-bg z-10">
            <div className="flex flex-col items-center gap-4 text-center px-8">
              <div className="w-16 h-16 rounded-full bg-hub-danger/20 flex items-center justify-center">
                <ExternalLink className="w-8 h-8 text-hub-danger" />
              </div>
              <div>
                <h3 className="text-lg font-medium text-hub-text mb-2">无法嵌入此网页</h3>
                <p className="text-sm text-hub-text-muted mb-4">{error}</p>
                <button
                  onClick={handleOpenInBrowser}
                  className="px-4 py-2 bg-hub-accent hover:bg-hub-accent-hover text-white rounded-lg transition-colors inline-flex items-center gap-2"
                >
                  <ExternalLink className="w-4 h-4" />
                  在浏览器中打开
                </button>
              </div>
            </div>
          </div>
        )}

        {!isEmbeddable && !error && (
          <div className="absolute inset-0 flex items-center justify-center bg-hub-bg z-10">
            <div className="flex flex-col items-center gap-4 text-center px-8">
              <div className="w-16 h-16 rounded-full bg-hub-warning/20 flex items-center justify-center">
                <Lock className="w-8 h-8 text-hub-warning" />
              </div>
              <div>
                <h3 className="text-lg font-medium text-hub-text mb-2">此网站不支持嵌入</h3>
                <p className="text-sm text-hub-text-muted mb-4">
                  该网站设置了安全策略，无法在应用内显示。
                </p>
                <button
                  onClick={handleOpenInBrowser}
                  className="px-4 py-2 bg-hub-accent hover:bg-hub-accent-hover text-white rounded-lg transition-colors inline-flex items-center gap-2"
                >
                  <ExternalLink className="w-4 h-4" />
                  在浏览器中打开
                </button>
              </div>
            </div>
          </div>
        )}

        <iframe
          ref={iframeRef}
          src={currentUrl}
          className="w-full h-full border-0"
          sandbox="allow-same-origin allow-scripts allow-popups allow-forms allow-modals"
          onLoad={handleIframeLoad}
          onError={handleIframeError}
          title={webapp.name}
        />
      </div>
    </div>
  );
}
