import { useState, useEffect } from 'react';
import { cn, formatShortcut, getFaviconUrl, truncate } from '@/lib/utils';
import { useAppStore } from '@/stores/appStore';
import { Dialog, DialogContent } from '@/components/ui/Dialog';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useShortcutRecorder } from '@/hooks/useTauri';
import { ExternalLink, Edit2, Trash2, Keyboard, Globe, Code, ChevronDown, ChevronRight } from 'lucide-react';
import type { WebApp } from '@/types';

interface AppCardProps {
  webapp: WebApp;
  onOpen?: () => void;
}

export function AppCard({ webapp, onOpen }: AppCardProps) {
  const { deleteWebApp } = useAppStore();
  const [isEditing, setIsEditing] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleOpen = () => {
    if (onOpen) {
      onOpen();
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
                try {
                  await deleteWebApp(webapp.id);
                  setIsDeleting(false);
                } catch (err) {
                  // deleteWebApp 内部已显示 toast，这里保持对话框打开
                  console.error('Delete failed:', err);
                }
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
  
  // 脚本注入相关状态
  const [showScriptSection, setShowScriptSection] = useState(!!webapp.injectScript);
  const [injectScript, setInjectScript] = useState(webapp.injectScript || '');
  const [injectOnLoad, setInjectOnLoad] = useState(webapp.injectOnLoad);
  const [injectOnShortcut, setInjectOnShortcut] = useState(webapp.injectOnShortcut);

  // 在对话框打开时重置所有状态到原始值
  useEffect(() => {
    if (open) {
      setName(webapp.name);
      setUrl(webapp.url);
      setWidth(webapp.width.toString());
      setHeight(webapp.height.toString());
      setInjectScript(webapp.injectScript || '');
      setInjectOnLoad(webapp.injectOnLoad);
      setInjectOnShortcut(webapp.injectOnShortcut);
      setShowScriptSection(!!webapp.injectScript);
      if (webapp.shortcut) {
        setShortcut(webapp.shortcut);
      } else {
        setShortcut('');
      }
    }
  }, [open, webapp, setShortcut]);

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
        injectScript: injectScript || undefined,
        injectOnLoad,
        injectOnShortcut,
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
        <form onSubmit={handleSubmit} className="space-y-4 mt-4 max-h-[70vh] overflow-y-auto pr-2">
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
          
          {/* 脚本注入设置 */}
          <div className="border border-hub-border rounded-lg overflow-hidden">
            <button
              type="button"
              onClick={() => setShowScriptSection(!showScriptSection)}
              className="w-full flex items-center gap-2 p-3 bg-hub-bg hover:bg-hub-card-hover transition-colors text-left"
            >
              {showScriptSection ? (
                <ChevronDown className="w-4 h-4 text-hub-text-muted" />
              ) : (
                <ChevronRight className="w-4 h-4 text-hub-text-muted" />
              )}
              <Code className="w-4 h-4 text-hub-accent" />
              <span className="text-sm font-medium text-hub-text">脚本注入</span>
              {injectScript && (
                <span className="ml-auto text-xs text-hub-accent bg-hub-accent/10 px-2 py-0.5 rounded">
                  已配置
                </span>
              )}
            </button>
            
            {showScriptSection && (
              <div className="p-4 space-y-4 border-t border-hub-border">
                <div>
                  <label className="block text-sm font-medium text-hub-text mb-1.5">
                    JavaScript 脚本
                  </label>
                  <textarea
                    value={injectScript}
                    onChange={(e) => setInjectScript(e.target.value)}
                    placeholder={`// 在此输入要注入的 JavaScript 代码\n// 例如：\nconsole.log('脚本已注入');`}
                    className={cn(
                      'w-full h-32 px-3 py-2 rounded-lg text-sm font-mono',
                      'bg-hub-bg border border-hub-border',
                      'text-hub-text placeholder:text-hub-text-muted',
                      'focus:outline-none focus:ring-2 focus:ring-hub-accent focus:border-transparent',
                      'resize-y'
                    )}
                  />
                  <p className="text-xs text-hub-text-muted mt-1">
                    类似油猴脚本，可以修改网页行为
                  </p>
                </div>
                
                <div className="space-y-3">
                  <label className="block text-sm font-medium text-hub-text">
                    注入时机
                  </label>
                  
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={injectOnLoad}
                      onChange={(e) => setInjectOnLoad(e.target.checked)}
                      className="w-4 h-4 rounded border-hub-border text-hub-accent focus:ring-hub-accent"
                    />
                    <div>
                      <span className="text-sm text-hub-text">网页加载时</span>
                      <p className="text-xs text-hub-text-muted">首次打开网页时自动注入脚本</p>
                    </div>
                  </label>
                  
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={injectOnShortcut}
                      onChange={(e) => setInjectOnShortcut(e.target.checked)}
                      className="w-4 h-4 rounded border-hub-border text-hub-accent focus:ring-hub-accent"
                    />
                    <div>
                      <span className="text-sm text-hub-text">快捷键触发时</span>
                      <p className="text-xs text-hub-text-muted">每次通过快捷键显示窗口时注入脚本</p>
                    </div>
                  </label>
                </div>
              </div>
            )}
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

