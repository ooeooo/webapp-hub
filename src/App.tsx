import { useState, useEffect, useCallback } from 'react';
import { Toaster } from '@/components/ui/Toaster';
import { AppSidebar } from '@/components/layout/AppSidebar';
import { WebAppView } from '@/components/WebAppView';
import { Settings } from '@/components/Settings';
import { AppManager } from '@/components/AppManager';
import { useAppStore } from '@/stores/appStore';

export type ViewType = 'manager' | 'settings' | 'webapp';

export interface AppState {
  view: ViewType;
  activeWebAppId: string | null;
}

function App() {
  const [appState, setAppState] = useState<AppState>({
    view: 'manager',
    activeWebAppId: null,
  });
  const { loadConfig, config } = useAppStore();

  const handleSelectWebApp = useCallback((id: string) => {
    setAppState({ view: 'webapp', activeWebAppId: id });
  }, []);

  useEffect(() => {
    loadConfig();
  }, [loadConfig]);

  const handleNavigate = (view: ViewType) => {
    if (view === 'webapp' && appState.activeWebAppId) {
      setAppState({ view: 'webapp', activeWebAppId: appState.activeWebAppId });
    } else {
      setAppState({ view, activeWebAppId: null });
    }
  };

  const activeWebApp = config.webapps.find(w => w.id === appState.activeWebAppId);

  return (
    <div className="h-full w-full flex bg-hub-bg">
      <AppSidebar
        currentView={appState.view}
        activeWebAppId={appState.activeWebAppId}
        webapps={config.webapps}
        onNavigate={handleNavigate}
        onSelectWebApp={handleSelectWebApp}
      />
      <main className="flex-1 overflow-hidden flex flex-col">
        {appState.view === 'manager' && <AppManager onOpenWebApp={handleSelectWebApp} />}
        {appState.view === 'settings' && <Settings />}
        {appState.view === 'webapp' && activeWebApp && (
          <WebAppView webapp={activeWebApp} />
        )}
      </main>
      <Toaster />
    </div>
  );
}

export default App;
