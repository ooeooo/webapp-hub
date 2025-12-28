import { useState } from 'react';
import { cn, formatShortcut, getFaviconUrl, truncate } from '@/lib/utils';
import { useAppStore } from '@/stores/appStore';
import { Dialog, DialogContent } from '@/components/ui/Dialog';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useShortcutRecorder } from '@/hooks/useTauri';
import { ExternalLink, Edit2, Trash2, Keyboard, Globe } from 'lucide-react';
import type { WebApp } from '@/types';

interface AppCardProps {
  webapp: WebApp;
}

export function AppCard({ webapp }: AppCardProps) {
  const { openWebApp, deleteWebApp } = useAppStore();
  const [isEditing, setIsEditing] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleOpen = async () => {
    try {
      await openWebApp(webapp.id);
    } catch (e) {
      console.error('Failed to open webapp:', e);
    }
  };

  const iconUrl = webapp.icon || getFaviconUrl(webapp.url);

  return (
    <>
      <div
        className={cn(
          'group relative p-4 rounded-xl transition-all duration-200 cursor-pointer',
          'bg-hub-card border border-hub-border hover:border-hub-accent/50',
          'hover:shadow-lg hover:shadow-hub-accent/10 hover:-translate-y-0.5'
        )}
        onClick={handleOpen}
      >
        {/* Icon & Title */}
        <div className="flex items-start gap-3">
          <div className="w-12 h-12 rounded-lg bg-hub-bg flex items-center justify-center overflow-hidden flex-shrink-0">
            {iconUrl ? (
              <img
                src={iconUrl}
                alt={webapp.name}
                className="w-8 h-8 object-contain"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = 'none';
                }}
              />
            ) : (
              <Globe className="w-6 h-6 text-hub-text-muted" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-medium text-hub-text truncate">
              {webapp.name}
            </h3>
            <p className="text-xs text-hub-text-muted truncate mt-0.5">
              {truncate(webapp.url, 30)}
            </p>
            {webapp.shortcut && (
              <div className="flex items-center gap-1 mt-2">
                <Keyboard className="w-3 h-3 text-hub-text-muted" />
                <span className="text-xs text-hub-accent font-mono">
                  {formatShortcut(webapp.shortcut)}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="absolute top-2 right-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setIsEditing(true);
            }}
            className="p-1.5 rounded-lg bg-hub-bg/80 hover:bg-hub-border text-hub-text-muted hover:text-hub-text transition-colors"
            title="编辑"
          >
            <Edit2 className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              setIsDeleting(true);
            }}
            className="p-1.5 rounded-lg bg-hub-bg/80 hover:bg-hub-danger text-hub-text-muted hover:text-white transition-colors"
            title="删除"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Open indicator */}
        <div className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <ExternalLink className="w-4 h-4 text-hub-accent" />
        </div>
      </div>

      {/* Edit Dialog */}
      <EditWebAppDialog
        webapp={webapp}
        open={isEditing}
        onOpenChange={setIsEditing}
      />

      {/* Delete Confirmation */}
      <Dialog open={isDeleting} onOpenChange={setIsDeleting}>
        <DialogContent title="删除小程序" description={`确定要删除 "${webapp.name}" 吗？此操作无法撤销。`}>
          <div className="flex justify-end gap-3 mt-6">
            <Button variant="ghost" onClick={() => setIsDeleting(false)}>
              取消
            </Button>
            <Button
              variant="danger"
              onClick={async () => {
                await deleteWebApp(webapp.id);
                setIsDeleting(false);
              }}
            >
              删除
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

interface EditWebAppDialogProps {
  webapp: WebApp;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function EditWebAppDialog({ webapp, open, onOpenChange }: EditWebAppDialogProps) {
  const { updateWebApp } = useAppStore();
  const [name, setName] = useState(webapp.name);
  const [url, setUrl] = useState(webapp.url);
  const [width, setWidth] = useState(webapp.width.toString());
  const [height, setHeight] = useState(webapp.height.toString());
  const { isRecording, shortcut, startRecording, setShortcut } = useShortcutRecorder();
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Initialize shortcut from webapp
  useState(() => {
    if (webapp.shortcut) {
      setShortcut(webapp.shortcut);
    }
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      await updateWebApp({
        id: webapp.id,
        name,
        url,
        shortcut: shortcut || undefined,
        width: parseInt(width) || 1024,
        height: parseInt(height) || 768,
      });
      onOpenChange(false);
    } catch (err) {
      console.error('Failed to update webapp:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent title="编辑小程序">
        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <Input
            label="名称"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="小程序名称"
            required
          />
          <Input
            label="网址"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://example.com"
            required
          />
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="宽度"
              type="number"
              value={width}
              onChange={(e) => setWidth(e.target.value)}
              placeholder="1024"
            />
            <Input
              label="高度"
              type="number"
              value={height}
              onChange={(e) => setHeight(e.target.value)}
              placeholder="768"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-hub-text mb-1.5">
              快捷键
            </label>
            <div className="flex gap-2">
              <Input
                value={shortcut ? formatShortcut(shortcut) : ''}
                placeholder={isRecording ? '请按下快捷键...' : '点击录制'}
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
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              取消
            </Button>
            <Button type="submit" variant="primary" disabled={isSubmitting}>
              {isSubmitting ? '保存中...' : '保存'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

