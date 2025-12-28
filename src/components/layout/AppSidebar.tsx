import { cn, getFaviconUrl } from '@/lib/utils';
import { Settings, Plus, LayoutGrid, Globe } from 'lucide-react';
import type { WebApp } from '@/types';
import type { ViewType } from '@/App';

interface AppSidebarProps {
  currentView: ViewType;
  activeWebAppId: string | null;
  webapps: WebApp[];
  onNavigate: (view: ViewType) => void;
  onSelectWebApp: (id: string) => void;
}

export function AppSidebar({
  currentView,
  activeWebAppId,
  webapps,
  onNavigate,
  onSelectWebApp,
}: AppSidebarProps) {
  return (
    <aside className="w-16 h-full bg-hub-card border-r border-hub-border flex flex-col items-center py-3 gap-1">
      {/* Logo */}
      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-hub-accent to-hub-accent-hover flex items-center justify-center mb-3">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="w-5 h-5 text-white"
        >
          <rect x="3" y="3" width="7" height="7" rx="1" />
          <rect x="14" y="3" width="7" height="7" rx="1" />
          <rect x="3" y="14" width="7" height="7" rx="1" />
          <rect x="14" y="14" width="7" height="7" rx="1" />
        </svg>
      </div>

      {/* App Manager Button */}
      <button
        onClick={() => onNavigate('manager')}
        className={cn(
          'w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-200',
          'hover:bg-hub-card-hover',
          currentView === 'manager'
            ? 'bg-hub-accent/20 text-hub-accent'
            : 'text-hub-text-muted hover:text-hub-text'
        )}
        title="小程序管理"
      >
        <LayoutGrid className="w-5 h-5" />
      </button>

      {/* Divider */}
      <div className="w-8 h-px bg-hub-border my-2" />

      {/* WebApp Tabs */}
      <nav className="flex-1 flex flex-col items-center gap-1.5 overflow-y-auto w-full px-3">
        {webapps.map((webapp) => {
          const isActive = currentView === 'webapp' && activeWebAppId === webapp.id;
          const iconUrl = webapp.icon || getFaviconUrl(webapp.url);
          
          return (
            <button
              key={webapp.id}
              onClick={() => onSelectWebApp(webapp.id)}
              className={cn(
                'w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-200 flex-shrink-0',
                'hover:bg-hub-card-hover group relative',
                isActive
                  ? 'bg-hub-accent/20 ring-2 ring-hub-accent'
                  : 'bg-hub-bg'
              )}
              title={webapp.name}
            >
              {iconUrl ? (
                <img
                  src={iconUrl}
                  alt={webapp.name}
                  className="w-6 h-6 rounded object-contain"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = 'none';
                    (e.target as HTMLImageElement).nextElementSibling?.classList.remove('hidden');
                  }}
                />
              ) : null}
              <Globe className={cn('w-5 h-5 text-hub-text-muted', iconUrl && 'hidden')} />
              
              {/* Active indicator */}
              {isActive && (
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 bg-hub-accent rounded-r" />
              )}
              
              {/* Tooltip */}
              <div className="absolute left-full ml-2 px-2 py-1 bg-hub-card border border-hub-border rounded text-xs text-hub-text whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50">
                {webapp.name}
              </div>
            </button>
          );
        })}
      </nav>

      {/* Bottom Actions */}
      <div className="flex flex-col items-center gap-1.5 mt-2">
        <div className="w-8 h-px bg-hub-border mb-1" />
        
        {/* Add WebApp - navigate to manager */}
        <button
          onClick={() => onNavigate('manager')}
          className={cn(
            'w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-200',
            'text-hub-text-muted hover:text-hub-accent hover:bg-hub-card-hover'
          )}
          title="添加小程序"
        >
          <Plus className="w-5 h-5" />
        </button>

        {/* Settings */}
        <button
          onClick={() => onNavigate('settings')}
          className={cn(
            'w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-200',
            'hover:bg-hub-card-hover',
            currentView === 'settings'
              ? 'bg-hub-accent/20 text-hub-accent'
              : 'text-hub-text-muted hover:text-hub-text'
          )}
          title="设置"
        >
          <Settings className="w-5 h-5" />
        </button>
      </div>
    </aside>
  );
}

