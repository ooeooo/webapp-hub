import { useState } from 'react';
import { useAppStore } from '@/stores/appStore';
import { AppCard } from '@/components/AppCard';
import { Dialog, DialogContent } from '@/components/ui/Dialog';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useShortcutRecorder } from '@/hooks/useTauri';
import { cn, formatShortcut, isValidUrl } from '@/lib/utils';
import { Plus, Search, LayoutGrid, List, Loader2 } from 'lucide-react';

type ViewMode = 'grid' | 'list';

export function AppList() {
  const { config, isLoading } = useAppStore();
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [isAddingApp, setIsAddingApp] = useState(false);

  const filteredApps = config.webapps
    .filter((app) =>
      app.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      app.url.toLowerCase().includes(searchQuery.toLowerCase())
    )
    .sort((a, b) => a.order - b.order);

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-hub-accent animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden">
      {/* Header */}
      <header className="flex-shrink-0 px-6 py-4 border-b border-hub-border">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-semibold text-hub-text">小程序</h1>
          <div className="flex items-center gap-3">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-hub-text-muted" />
              <input
                type="text"
                placeholder="搜索小程序..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={cn(
                  'w-64 pl-9 pr-4 py-2 rounded-lg text-sm',
                  'bg-hub-card border border-hub-border',
                  'text-hub-text placeholder:text-hub-text-muted',
                  'focus:outline-none focus:ring-2 focus:ring-hub-accent focus:border-transparent',
                  'transition-all duration-200'
                )}
              />
            </div>

            {/* View Mode Toggle */}
            <div className="flex items-center bg-hub-card rounded-lg border border-hub-border p-1">
              <button
                onClick={() => setViewMode('grid')}
                className={cn(
                  'p-1.5 rounded-md transition-colors',
                  viewMode === 'grid'
                    ? 'bg-hub-accent text-white'
                    : 'text-hub-text-muted hover:text-hub-text'
                )}
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={cn(
                  'p-1.5 rounded-md transition-colors',
                  viewMode === 'list'
                    ? 'bg-hub-accent text-white'
                    : 'text-hub-text-muted hover:text-hub-text'
                )}
              >
                <List className="w-4 h-4" />
              </button>
            </div>

            {/* Add Button */}
            <Button variant="primary" onClick={() => setIsAddingApp(true)}>
              <Plus className="w-4 h-4 mr-1.5" />
              添加
            </Button>
          </div>
        </div>
      </header>

      {/* App Grid/List */}
      <main className="flex-1 overflow-y-auto p-6">
        {filteredApps.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="w-16 h-16 rounded-2xl bg-hub-card flex items-center justify-center mb-4">
              <LayoutGrid className="w-8 h-8 text-hub-text-muted" />
            </div>
            <h2 className="text-lg font-medium text-hub-text mb-2">
              {searchQuery ? '未找到匹配的小程序' : '还没有小程序'}
            </h2>
            <p className="text-sm text-hub-text-muted mb-4">
              {searchQuery ? '试试其他搜索词' : '点击上方的"添加"按钮添加你的第一个小程序'}
            </p>
            {!searchQuery && (
              <Button variant="primary" onClick={() => setIsAddingApp(true)}>
                <Plus className="w-4 h-4 mr-1.5" />
                添加小程序
              </Button>
            )}
          </div>
        ) : (
          <div
            className={cn(
              viewMode === 'grid'
                ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4'
                : 'flex flex-col gap-3'
            )}
          >
            {filteredApps.map((app) => (
              <AppCard key={app.id} webapp={app} />
            ))}
          </div>
        )}
      </main>

      {/* Add App Dialog */}
      <AddWebAppDialog open={isAddingApp} onOpenChange={setIsAddingApp} />
    </div>
  );
}

interface AddWebAppDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function AddWebAppDialog({ open, onOpenChange }: AddWebAppDialogProps) {
  const { addWebApp } = useAppStore();
  const [name, setName] = useState('');
  const [url, setUrl] = useState('');
  const [width, setWidth] = useState('1024');
  const [height, setHeight] = useState('768');
  const { isRecording, shortcut, startRecording, clearShortcut } = useShortcutRecorder();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [urlError, setUrlError] = useState('');

  const resetForm = () => {
    setName('');
    setUrl('');
    setWidth('1024');
    setHeight('768');
    clearShortcut();
    setUrlError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate URL
    if (!isValidUrl(url)) {
      setUrlError('请输入有效的网址');
      return;
    }

    setIsSubmitting(true);

    try {
      await addWebApp({
        name,
        url,
        shortcut: shortcut || undefined,
        width: parseInt(width) || 1024,
        height: parseInt(height) || 768,
      });
      resetForm();
      onOpenChange(false);
    } catch (err) {
      console.error('Failed to add webapp:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(value) => {
        if (!value) resetForm();
        onOpenChange(value);
      }}
    >
      <DialogContent title="添加小程序" description="添加一个新的网页小程序到你的列表中">
        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <Input
            label="名称"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="例如：ChatGPT"
            required
          />
          <Input
            label="网址"
            value={url}
            onChange={(e) => {
              setUrl(e.target.value);
              setUrlError('');
            }}
            placeholder="https://chat.openai.com"
            error={urlError}
            required
          />
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="窗口宽度"
              type="number"
              value={width}
              onChange={(e) => setWidth(e.target.value)}
              placeholder="1024"
            />
            <Input
              label="窗口高度"
              type="number"
              value={height}
              onChange={(e) => setHeight(e.target.value)}
              placeholder="768"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-hub-text mb-1.5">
              快捷键 (可选)
            </label>
            <div className="flex gap-2">
              <Input
                value={shortcut ? formatShortcut(shortcut) : ''}
                placeholder={isRecording ? '请按下快捷键...' : '点击录制快捷键'}
                readOnly
                className={cn(isRecording && 'ring-2 ring-hub-accent')}
              />
              <Button
                type="button"
                variant={isRecording ? 'primary' : 'outline'}
                onClick={startRecording}
              >
                {isRecording ? '录制中' : '录制'}
              </Button>
            </div>
            <p className="mt-1 text-xs text-hub-text-muted">
              录制快捷键后可通过快捷键快速呼出此小程序
            </p>
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                resetForm();
                onOpenChange(false);
              }}
            >
              取消
            </Button>
            <Button type="submit" variant="primary" disabled={isSubmitting}>
              {isSubmitting ? '添加中...' : '添加'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

