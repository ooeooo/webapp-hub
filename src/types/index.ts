// 网页小程序配置
export interface WebApp {
  id: string;
  name: string;
  url: string;
  icon?: string;
  shortcut?: string;
  width: number;
  height: number;
  useProxy: boolean;
  order: number;
  createdAt: number;
}

// HTTP代理配置
export interface ProxyConfig {
  enabled: boolean;
  host: string;
  port: number;
  username?: string;
  password?: string;
  proxyType: 'http' | 'https' | 'socks5';
}

// 应用全局配置
export interface AppConfig {
  webapps: WebApp[];
  proxy: ProxyConfig;
  maxActiveWindows: number;
  mainWindowShortcut?: string;
  autoStart: boolean;
  minimizeToTray: boolean;
}

// 窗口状态
export interface WindowState {
  webappId: string;
  isVisible: boolean;
  x: number;
  y: number;
  width: number;
  height: number;
}

// 创建新小程序的输入
export interface CreateWebAppInput {
  name: string;
  url: string;
  icon?: string;
  shortcut?: string;
  width?: number;
  height?: number;
  useProxy?: boolean;
}

// 更新小程序的输入
export interface UpdateWebAppInput {
  id: string;
  name?: string;
  url?: string;
  icon?: string;
  shortcut?: string;
  width?: number;
  height?: number;
  useProxy?: boolean;
  order?: number;
}

// 代理配置输入
export interface ProxyConfigInput {
  enabled: boolean;
  host: string;
  port: number;
  username?: string;
  password?: string;
  proxyType: 'http' | 'https' | 'socks5';
}

// Toast 通知类型
export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface Toast {
  id: string;
  type: ToastType;
  title: string;
  description?: string;
  duration?: number;
}

// 视图类型
export type ViewType = 'apps' | 'settings';

// 默认值
export const DEFAULT_PROXY_CONFIG: ProxyConfig = {
  enabled: false,
  host: '',
  port: 7890,
  proxyType: 'http',
};

export const DEFAULT_APP_CONFIG: AppConfig = {
  webapps: [],
  proxy: DEFAULT_PROXY_CONFIG,
  maxActiveWindows: 5,
  autoStart: false,
  minimizeToTray: true,
};

export function createDefaultWebApp(name: string, url: string): WebApp {
  return {
    id: crypto.randomUUID(),
    name,
    url,
    width: 1024,
    height: 768,
    useProxy: true,
    order: 0,
    createdAt: Date.now(),
  };
}

