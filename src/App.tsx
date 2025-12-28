import { useState, useEffect } from 'react';
import { Toaster } from '@/components/ui/Toaster';
import { Sidebar } from '@/components/layout/Sidebar';
import { AppList } from '@/components/AppList';
import { Settings } from '@/components/Settings';
import { useAppStore } from '@/stores/appStore';

type View = 'apps' | 'settings';

function App() {
  const [currentView, setCurrentView] = useState<View>('apps');
  const { loadConfig } = useAppStore();

  useEffect(() => {
    loadConfig();
  }, [loadConfig]);

  return (
    <div className="h-full w-full flex bg-hub-bg">
      <Sidebar currentView={currentView} onViewChange={setCurrentView} />
      <main className="flex-1 overflow-hidden">
        {currentView === 'apps' && <AppList />}
        {currentView === 'settings' && <Settings />}
      </main>
      <Toaster />
    </div>
  );
}

export default App;

