import { create } from 'zustand';
import { invoke } from '@tauri-apps/api/core';
import type {
  WebApp,
  AppConfig,
  ProxyConfig,
  Toast,
  CreateWebAppInput,
  UpdateWebAppInput,
} from '@/types';

interface AppState {
  // 配置状态
  config: AppConfig;
  isLoading: boolean;
  error: string | null;

  // Toast 通知
  toasts: Toast[];

  // 操作方法
  loadConfig: () => Promise<void>;
  saveConfig: (config: Partial<AppConfig>) => Promise<void>;

  // 小程序管理
  addWebApp: (input: CreateWebAppInput) => Promise<WebApp>;
  updateWebApp: (input: UpdateWebAppInput) => Promise<WebApp>;
  deleteWebApp: (id: string) => Promise<void>;
  openWebApp: (id: string) => Promise<void>;
  closeWebApp: (id: string) => Promise<void>;
  reorderWebApps: (webapps: WebApp[]) => Promise<void>;

  // 设置管理
  setMaxActiveWindows: (max: number) => Promise<void>;
  setProxyConfig: (proxy: ProxyConfig) => Promise<void>;

  // Toast 通知
  addToast: (toast: Omit<Toast, 'id'>) => void;
  removeToast: (id: string) => void;
}

const DEFAULT_CONFIG: AppConfig = {
  webapps: [],
  proxy: {
    enabled: false,
    host: '',
    port: 7890,
    proxyType: 'http',
  },
  maxActiveWindows: 5,
  autoStart: false,
  minimizeToTray: true,
};

export const useAppStore = create<AppState>((set, get) => ({
  config: DEFAULT_CONFIG,
  isLoading: false,
  error: null,
  toasts: [],

  // 加载配置
  loadConfig: async () => {
    set({ isLoading: true, error: null });
    try {
      const config = await invoke<AppConfig>('get_config');
      set({ config, isLoading: false });
    } catch (err) {
      const error = err instanceof Error ? err.message : String(err);
      set({ error, isLoading: false });
      get().addToast({
        type: 'error',
        title: '加载配置失败',
        description: error,
      });
    }
  },

  // 保存配置
  saveConfig: async (partialConfig) => {
    const currentConfig = get().config;
    const newConfig = { ...currentConfig, ...partialConfig };

    try {
      await invoke('save_config', { config: newConfig });
      set({ config: newConfig });
      get().addToast({
        type: 'success',
        title: '配置已保存',
      });
    } catch (err) {
      const error = err instanceof Error ? err.message : String(err);
      get().addToast({
        type: 'error',
        title: '保存配置失败',
        description: error,
      });
      throw err;
    }
  },

  // 添加小程序
  addWebApp: async (input) => {
    try {
      const webapp = await invoke<WebApp>('add_webapp', {
        name: input.name,
        url: input.url,
        icon: input.icon,
        shortcut: input.shortcut,
        width: input.width,
        height: input.height,
      });

      set((state) => ({
        config: {
          ...state.config,
          webapps: [...state.config.webapps, webapp],
        },
      }));

      get().addToast({
        type: 'success',
        title: '小程序添加成功',
        description: webapp.name,
      });

      return webapp;
    } catch (err) {
      const error = err instanceof Error ? err.message : String(err);
      get().addToast({
        type: 'error',
        title: '添加小程序失败',
        description: error,
      });
      throw err;
    }
  },

  // 更新小程序
  updateWebApp: async (input) => {
    try {
      const webapp = await invoke<WebApp>('update_webapp', {
        id: input.id,
        name: input.name,
        url: input.url,
        icon: input.icon,
        shortcut: input.shortcut,
        width: input.width,
        height: input.height,
        useProxy: input.useProxy,
        order: input.order,
      });

      set((state) => ({
        config: {
          ...state.config,
          webapps: state.config.webapps.map((w) =>
            w.id === webapp.id ? webapp : w
          ),
        },
      }));

      get().addToast({
        type: 'success',
        title: '小程序已更新',
        description: webapp.name,
      });

      return webapp;
    } catch (err) {
      const error = err instanceof Error ? err.message : String(err);
      get().addToast({
        type: 'error',
        title: '更新小程序失败',
        description: error,
      });
      throw err;
    }
  },

  // 删除小程序
  deleteWebApp: async (id) => {
    try {
      await invoke('delete_webapp', { id });

      set((state) => ({
        config: {
          ...state.config,
          webapps: state.config.webapps.filter((w) => w.id !== id),
        },
      }));

      get().addToast({
        type: 'success',
        title: '小程序已删除',
      });
    } catch (err) {
      const error = err instanceof Error ? err.message : String(err);
      get().addToast({
        type: 'error',
        title: '删除小程序失败',
        description: error,
      });
      throw err;
    }
  },

  // 打开小程序
  openWebApp: async (id) => {
    try {
      await invoke('open_webapp', { id });
    } catch (err) {
      const error = err instanceof Error ? err.message : String(err);
      get().addToast({
        type: 'error',
        title: '打开小程序失败',
        description: error,
      });
      throw err;
    }
  },

  // 关闭小程序
  closeWebApp: async (id) => {
    try {
      await invoke('close_webapp', { id });
    } catch (err) {
      const error = err instanceof Error ? err.message : String(err);
      get().addToast({
        type: 'error',
        title: '关闭小程序失败',
        description: error,
      });
      throw err;
    }
  },

  // 重排序小程序
  reorderWebApps: async (webapps) => {
    set((state) => ({
      config: {
        ...state.config,
        webapps,
      },
    }));

    // 更新每个小程序的order
    for (let i = 0; i < webapps.length; i++) {
      try {
        await invoke('update_webapp', {
          id: webapps[i].id,
          order: i,
        });
      } catch (err) {
        console.error('Failed to update order:', err);
      }
    }
  },

  // 设置最大活跃窗口数
  setMaxActiveWindows: async (max) => {
    try {
      await invoke('set_max_active_windows', { max });
      set((state) => ({
        config: {
          ...state.config,
          maxActiveWindows: max,
        },
      }));
      get().addToast({
        type: 'success',
        title: '设置已更新',
        description: `最大活跃窗口数: ${max}`,
      });
    } catch (err) {
      const error = err instanceof Error ? err.message : String(err);
      get().addToast({
        type: 'error',
        title: '设置失败',
        description: error,
      });
      throw err;
    }
  },

  // 设置代理配置
  setProxyConfig: async (proxy) => {
    try {
      await invoke('set_proxy_config', { proxy });
      set((state) => ({
        config: {
          ...state.config,
          proxy,
        },
      }));
      get().addToast({
        type: 'success',
        title: '代理设置已更新',
      });
    } catch (err) {
      const error = err instanceof Error ? err.message : String(err);
      get().addToast({
        type: 'error',
        title: '代理设置失败',
        description: error,
      });
      throw err;
    }
  },

  // Toast 通知
  addToast: (toast) => {
    const id = crypto.randomUUID();
    const newToast = { ...toast, id };

    set((state) => ({
      toasts: [...state.toasts, newToast],
    }));

    // 自动移除
    const duration = toast.duration ?? 3000;
    setTimeout(() => {
      get().removeToast(id);
    }, duration);
  },

  removeToast: (id) => {
    set((state) => ({
      toasts: state.toasts.filter((t) => t.id !== id),
    }));
  },
}));

