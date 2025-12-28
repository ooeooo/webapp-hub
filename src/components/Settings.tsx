import { useState, useEffect } from 'react';
import { useAppStore } from '@/stores/appStore';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { cn, formatShortcut } from '@/lib/utils';
import { useShortcutRecorder } from '@/hooks/useTauri';
import {
  Globe,
  Layers,
  Keyboard,
  Shield,
  ChevronRight,
  Save,
} from 'lucide-react';
import type { ProxyConfig } from '@/types';

type SettingsSection = 'proxy' | 'windows' | 'shortcuts' | 'about';

export function Settings() {
  const [activeSection, setActiveSection] = useState<SettingsSection>('proxy');

  const sections = [
    { id: 'proxy' as const, icon: Globe, label: '代理设置' },
    { id: 'windows' as const, icon: Layers, label: '窗口管理' },
    { id: 'shortcuts' as const, icon: Keyboard, label: '快捷键' },
    { id: 'about' as const, icon: Shield, label: '关于' },
  ];

  return (
    <div className="flex-1 flex h-full overflow-hidden">
      {/* Settings Sidebar */}
      <aside className="w-56 flex-shrink-0 bg-hub-card border-r border-hub-border p-4">
        <h2 className="text-lg font-semibold text-hub-text mb-4 px-2">设置</h2>
        <nav className="space-y-1">
          {sections.map((section) => (
            <button
              key={section.id}
              onClick={() => setActiveSection(section.id)}
              className={cn(
                'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors',
                activeSection === section.id
                  ? 'bg-hub-accent/20 text-hub-accent'
                  : 'text-hub-text-muted hover:text-hub-text hover:bg-hub-card-hover'
              )}
            >
              <section.icon className="w-4 h-4" />
              <span>{section.label}</span>
              {activeSection === section.id && (
                <ChevronRight className="w-4 h-4 ml-auto" />
              )}
            </button>
          ))}
        </nav>
      </aside>

      {/* Settings Content */}
      <main className="flex-1 overflow-y-auto p-6">
        {activeSection === 'proxy' && <ProxySettings />}
        {activeSection === 'windows' && <WindowSettings />}
        {activeSection === 'shortcuts' && <ShortcutSettings />}
        {activeSection === 'about' && <AboutSection />}
      </main>
    </div>
  );
}

function ProxySettings() {
  const { config, setProxyConfig } = useAppStore();
  const [proxy, setProxy] = useState<ProxyConfig>(config.proxy);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setProxy(config.proxy);
  }, [config.proxy]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await setProxyConfig(proxy);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="max-w-2xl">
      <div className="mb-6">
        <h3 className="text-lg font-medium text-hub-text">代理设置</h3>
        <p className="text-sm text-hub-text-muted mt-1">
          配置 HTTP 代理以访问需要代理的网站
        </p>
      </div>

      <div className="space-y-6 bg-hub-card rounded-xl border border-hub-border p-6">
        {/* Enable Toggle */}
        <div className="flex items-center justify-between">
          <div>
            <label className="text-sm font-medium text-hub-text">启用代理</label>
            <p className="text-xs text-hub-text-muted mt-0.5">
              开启后所有小程序将通过代理访问
            </p>
          </div>
          <button
            onClick={() => setProxy({ ...proxy, enabled: !proxy.enabled })}
            className={cn(
              'relative w-11 h-6 rounded-full transition-colors',
              proxy.enabled ? 'bg-hub-accent' : 'bg-hub-border'
            )}
          >
            <span
              className={cn(
                'absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform',
                proxy.enabled && 'translate-x-5'
              )}
            />
          </button>
        </div>

        {/* Proxy Type */}
        <div>
          <label className="block text-sm font-medium text-hub-text mb-2">
            代理类型
          </label>
          <div className="flex gap-2">
            {(['http', 'https', 'socks5'] as const).map((type) => (
              <button
                key={type}
                onClick={() => setProxy({ ...proxy, proxyType: type })}
                className={cn(
                  'px-4 py-2 rounded-lg text-sm font-medium transition-colors',
                  proxy.proxyType === type
                    ? 'bg-hub-accent text-white'
                    : 'bg-hub-bg border border-hub-border text-hub-text hover:bg-hub-card-hover'
                )}
              >
                {type.toUpperCase()}
              </button>
            ))}
          </div>
        </div>

        {/* Host & Port */}
        <div className="grid grid-cols-3 gap-4">
          <div className="col-span-2">
            <Input
              label="代理地址"
              value={proxy.host}
              onChange={(e) => setProxy({ ...proxy, host: e.target.value })}
              placeholder="127.0.0.1"
            />
          </div>
          <Input
            label="端口"
            type="number"
            value={proxy.port.toString()}
            onChange={(e) => setProxy({ ...proxy, port: parseInt(e.target.value) || 0 })}
            placeholder="7890"
          />
        </div>

        {/* Auth (optional) */}
        <div className="grid grid-cols-2 gap-4">
          <Input
            label="用户名 (可选)"
            value={proxy.username || ''}
            onChange={(e) => setProxy({ ...proxy, username: e.target.value || undefined })}
            placeholder="用户名"
          />
          <Input
            label="密码 (可选)"
            type="password"
            value={proxy.password || ''}
            onChange={(e) => setProxy({ ...proxy, password: e.target.value || undefined })}
            placeholder="密码"
          />
        </div>

        {/* Save Button */}
        <div className="flex justify-end pt-4 border-t border-hub-border">
          <Button variant="primary" onClick={handleSave} disabled={isSaving}>
            <Save className="w-4 h-4 mr-1.5" />
            {isSaving ? '保存中...' : '保存设置'}
          </Button>
        </div>
      </div>
    </div>
  );
}

function WindowSettings() {
  const { config, setMaxActiveWindows } = useAppStore();
  const [maxWindows, setMaxWindows] = useState(config.maxActiveWindows);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setMaxWindows(config.maxActiveWindows);
  }, [config.maxActiveWindows]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await setMaxActiveWindows(maxWindows);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="max-w-2xl">
      <div className="mb-6">
        <h3 className="text-lg font-medium text-hub-text">窗口管理</h3>
        <p className="text-sm text-hub-text-muted mt-1">
          配置小程序窗口的行为
        </p>
      </div>

      <div className="space-y-6 bg-hub-card rounded-xl border border-hub-border p-6">
        {/* Max Active Windows */}
        <div>
          <label className="block text-sm font-medium text-hub-text mb-2">
            最大同时活跃窗口数量
          </label>
          <p className="text-xs text-hub-text-muted mb-4">
            当打开的窗口超过此数量时，最早打开的窗口将自动关闭
          </p>
          <div className="flex items-center gap-4">
            <input
              type="range"
              min="1"
              max="20"
              value={maxWindows}
              onChange={(e) => setMaxWindows(parseInt(e.target.value))}
              className="flex-1 h-2 bg-hub-border rounded-lg appearance-none cursor-pointer accent-hub-accent"
            />
            <div className="w-16 px-3 py-2 bg-hub-bg border border-hub-border rounded-lg text-center text-sm font-medium text-hub-text">
              {maxWindows}
            </div>
          </div>
        </div>

        {/* Quick presets */}
        <div>
          <label className="block text-sm font-medium text-hub-text mb-2">
            快速设置
          </label>
          <div className="flex gap-2">
            {[3, 5, 10, 15].map((num) => (
              <button
                key={num}
                onClick={() => setMaxWindows(num)}
                className={cn(
                  'px-4 py-2 rounded-lg text-sm font-medium transition-colors',
                  maxWindows === num
                    ? 'bg-hub-accent text-white'
                    : 'bg-hub-bg border border-hub-border text-hub-text hover:bg-hub-card-hover'
                )}
              >
                {num} 个
              </button>
            ))}
          </div>
        </div>

        {/* Save Button */}
        <div className="flex justify-end pt-4 border-t border-hub-border">
          <Button variant="primary" onClick={handleSave} disabled={isSaving}>
            <Save className="w-4 h-4 mr-1.5" />
            {isSaving ? '保存中...' : '保存设置'}
          </Button>
        </div>
      </div>
    </div>
  );
}

function ShortcutSettings() {
  const { config, saveConfig, addToast } = useAppStore();
  const { isRecording, shortcut, startRecording, clearShortcut } = useShortcutRecorder();
  const [isSaving, setIsSaving] = useState(false);

  // 当录制完成时自动保存主窗口快捷键
  useEffect(() => {
    if (shortcut && !isRecording) {
      setIsSaving(true);
      saveConfig({ mainWindowShortcut: shortcut })
        .then(() => {
          clearShortcut();
        })
        .catch((err) => {
          console.error('Failed to save main window shortcut:', err);
        })
        .finally(() => {
          setIsSaving(false);
        });
    }
  }, [shortcut, isRecording, saveConfig, clearShortcut]);

  const handleClearShortcut = async () => {
    setIsSaving(true);
    try {
      await saveConfig({ mainWindowShortcut: undefined });
      addToast({
        type: 'success',
        title: '快捷键已清除',
      });
    } catch (err) {
      console.error('Failed to clear shortcut:', err);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="max-w-2xl">
      <div className="mb-6">
        <h3 className="text-lg font-medium text-hub-text">快捷键设置</h3>
        <p className="text-sm text-hub-text-muted mt-1">
          查看和管理所有已配置的快捷键
        </p>
      </div>

      <div className="space-y-4">
        {/* Global Shortcut */}
        <div className="bg-hub-card rounded-xl border border-hub-border p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h4 className="text-sm font-medium text-hub-text">主窗口快捷键</h4>
              <p className="text-xs text-hub-text-muted mt-0.5">
                快速呼出/隐藏主窗口
              </p>
            </div>
            <div className="flex gap-2">
              <Input
                value={
                  isRecording
                    ? '请按下快捷键...'
                    : config.mainWindowShortcut
                    ? formatShortcut(config.mainWindowShortcut)
                    : '未设置'
                }
                readOnly
                className={cn('w-40 text-center', isRecording && 'ring-2 ring-hub-accent')}
              />
              <Button
                variant={isRecording ? 'primary' : 'outline'}
                onClick={startRecording}
                disabled={isSaving}
              >
                {isSaving ? '保存中...' : isRecording ? '录制中...' : '修改'}
              </Button>
              {config.mainWindowShortcut && !isRecording && (
                <Button
                  variant="ghost"
                  onClick={handleClearShortcut}
                  disabled={isSaving}
                  title="清除快捷键"
                >
                  清除
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* App Shortcuts */}
        <div className="bg-hub-card rounded-xl border border-hub-border p-6">
          <h4 className="text-sm font-medium text-hub-text mb-4">小程序快捷键</h4>
          {config.webapps.filter((app) => app.shortcut).length === 0 ? (
            <p className="text-sm text-hub-text-muted text-center py-8">
              还没有配置任何小程序快捷键
            </p>
          ) : (
            <div className="space-y-3">
              {config.webapps
                .filter((app) => app.shortcut)
                .map((app) => (
                  <div
                    key={app.id}
                    className="flex items-center justify-between py-2 px-3 rounded-lg bg-hub-bg"
                  >
                    <span className="text-sm text-hub-text">{app.name}</span>
                    <span className="text-sm font-mono text-hub-accent">
                      {formatShortcut(app.shortcut!)}
                    </span>
                  </div>
                ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function AboutSection() {
  return (
    <div className="max-w-2xl">
      <div className="mb-6">
        <h3 className="text-lg font-medium text-hub-text">关于</h3>
        <p className="text-sm text-hub-text-muted mt-1">
          WebApp Hub 应用信息
        </p>
      </div>

      <div className="bg-hub-card rounded-xl border border-hub-border p-6">
        <div className="flex items-center gap-4 mb-6">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-hub-accent to-hub-accent-hover flex items-center justify-center">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="w-8 h-8 text-white"
            >
              <rect x="3" y="3" width="7" height="7" rx="1" />
              <rect x="14" y="3" width="7" height="7" rx="1" />
              <rect x="3" y="14" width="7" height="7" rx="1" />
              <rect x="14" y="14" width="7" height="7" rx="1" />
            </svg>
          </div>
          <div>
            <h2 className="text-xl font-semibold text-hub-text">WebApp Hub</h2>
            <p className="text-sm text-hub-text-muted">版本 0.1.0</p>
          </div>
        </div>

        <div className="space-y-4 text-sm">
          <p className="text-hub-text-muted">
            WebApp Hub 是一个轻量级、跨平台的网页小程序容器应用，让你能够将任意网页作为独立窗口运行的小程序使用。
          </p>

          <div className="pt-4 border-t border-hub-border">
            <h4 className="font-medium text-hub-text mb-2">功能特性</h4>
            <ul className="space-y-1 text-hub-text-muted">
              <li>• 将任意网页转换为桌面小程序</li>
              <li>• 全局快捷键快速呼出</li>
              <li>• HTTP 代理支持</li>
              <li>• 智能窗口管理 (LRU)</li>
              <li>• 跨平台支持 (Windows/macOS/Linux)</li>
            </ul>
          </div>

          <div className="pt-4 border-t border-hub-border">
            <h4 className="font-medium text-hub-text mb-2">技术栈</h4>
            <div className="flex flex-wrap gap-2">
              {['Tauri 2', 'React 18', 'TypeScript', 'Rust', 'Tailwind CSS'].map((tech) => (
                <span
                  key={tech}
                  className="px-2 py-1 text-xs rounded-md bg-hub-bg border border-hub-border text-hub-text-muted"
                >
                  {tech}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

