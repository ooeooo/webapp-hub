import { useEffect, useState } from 'react';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { Loader2, RefreshCw, ArrowLeft, ArrowRight, ExternalLink, X } from 'lucide-react';

/**
 * WebAppView 组件
 * 用于小程序窗口的顶部控制栏
 * 注意：实际的 WebView 由 Tauri 后端创建，这个组件仅作为参考
 */
export function WebAppView() {
  const [isLoading, setIsLoading] = useState(true);
  const [title, setTitle] = useState('');

  useEffect(() => {
    // 获取当前窗口信息
    const window = getCurrentWindow();
    window.title().then(setTitle);

    // 模拟加载完成
    const timer = setTimeout(() => setIsLoading(false), 1000);
    return () => clearTimeout(timer);
  }, []);

  const handleClose = async () => {
    await getCurrentWindow().close();
  };

  const handleMinimize = async () => {
    await getCurrentWindow().minimize();
  };

  const handleMaximize = async () => {
    const window = getCurrentWindow();
    const isMaximized = await window.isMaximized();
    if (isMaximized) {
      await window.unmaximize();
    } else {
      await window.maximize();
    }
  };

  return (
    <div className="h-full w-full flex flex-col bg-hub-bg">
      {/* Title Bar */}
      <header
        className="flex-shrink-0 h-10 flex items-center justify-between px-3 bg-hub-card border-b border-hub-border drag-region"
      >
        {/* Navigation */}
        <div className="flex items-center gap-1 no-drag-region">
          <button
            className="p-1.5 rounded-md text-hub-text-muted hover:text-hub-text hover:bg-hub-border transition-colors"
            title="后退"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <button
            className="p-1.5 rounded-md text-hub-text-muted hover:text-hub-text hover:bg-hub-border transition-colors"
            title="前进"
          >
            <ArrowRight className="w-4 h-4" />
          </button>
          <button
            className="p-1.5 rounded-md text-hub-text-muted hover:text-hub-text hover:bg-hub-border transition-colors"
            title="刷新"
          >
            {isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <RefreshCw className="w-4 h-4" />
            )}
          </button>
        </div>

        {/* Title */}
        <div className="flex-1 text-center">
          <span className="text-sm font-medium text-hub-text truncate">
            {title || '加载中...'}
          </span>
        </div>

        {/* Window Controls */}
        <div className="flex items-center gap-1 no-drag-region">
          <button
            className="p-1.5 rounded-md text-hub-text-muted hover:text-hub-text hover:bg-hub-border transition-colors"
            title="在浏览器中打开"
          >
            <ExternalLink className="w-4 h-4" />
          </button>
          <button
            onClick={handleMinimize}
            className="p-1.5 rounded-md text-hub-text-muted hover:text-hub-text hover:bg-hub-border transition-colors"
            title="最小化"
          >
            <div className="w-4 h-4 flex items-center justify-center">
              <div className="w-2.5 h-0.5 bg-current" />
            </div>
          </button>
          <button
            onClick={handleMaximize}
            className="p-1.5 rounded-md text-hub-text-muted hover:text-hub-text hover:bg-hub-border transition-colors"
            title="最大化"
          >
            <div className="w-4 h-4 flex items-center justify-center">
              <div className="w-2.5 h-2.5 border border-current rounded-sm" />
            </div>
          </button>
          <button
            onClick={handleClose}
            className="p-1.5 rounded-md text-hub-text-muted hover:text-white hover:bg-hub-danger transition-colors"
            title="关闭"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* WebView Content Area */}
      <main className="flex-1 relative">
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-hub-bg">
            <div className="flex flex-col items-center gap-3">
              <Loader2 className="w-8 h-8 text-hub-accent animate-spin" />
              <p className="text-sm text-hub-text-muted">加载中...</p>
            </div>
          </div>
        )}
        {/* 实际的 WebView 内容由 Tauri 渲染 */}
        <div className="w-full h-full bg-white">
          {/* WebView will be rendered here by Tauri */}
        </div>
      </main>
    </div>
  );
}

/**
 * 独立小程序窗口的入口组件
 * 这个文件可以作为独立窗口的入口点使用
 */
export function WebAppWindow() {
  return <WebAppView />;
}

