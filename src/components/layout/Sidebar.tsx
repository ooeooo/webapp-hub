import { cn } from '@/lib/utils';
import { LayoutGrid, Settings, Info } from 'lucide-react';

type View = 'apps' | 'settings';

interface SidebarProps {
  currentView: View;
  onViewChange: (view: View) => void;
}

export function Sidebar({ currentView, onViewChange }: SidebarProps) {
  const navItems = [
    { id: 'apps' as const, icon: LayoutGrid, label: '小程序' },
    { id: 'settings' as const, icon: Settings, label: '设置' },
  ];

  return (
    <aside className="w-16 h-full bg-hub-card border-r border-hub-border flex flex-col items-center py-4">
      {/* Logo */}
      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-hub-accent to-hub-accent-hover flex items-center justify-center mb-6">
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

      {/* Navigation */}
      <nav className="flex-1 flex flex-col items-center gap-2">
        {navItems.map((item) => (
          <button
            key={item.id}
            onClick={() => onViewChange(item.id)}
            className={cn(
              'w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-200',
              'hover:bg-hub-card-hover',
              currentView === item.id
                ? 'bg-hub-accent/20 text-hub-accent'
                : 'text-hub-text-muted hover:text-hub-text'
            )}
            title={item.label}
          >
            <item.icon className="w-5 h-5" />
          </button>
        ))}
      </nav>

      {/* Bottom */}
      <div className="flex flex-col items-center gap-2">
        <button
          className="w-10 h-10 rounded-xl flex items-center justify-center text-hub-text-muted hover:text-hub-text hover:bg-hub-card-hover transition-all duration-200"
          title="关于"
        >
          <Info className="w-5 h-5" />
        </button>
      </div>
    </aside>
  );
}

