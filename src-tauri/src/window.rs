use lru::LruCache;
use parking_lot::Mutex;
use std::num::NonZeroUsize;
use tauri::{AppHandle, Manager, WebviewUrl, WebviewWindowBuilder};

use crate::models::WebApp;

/// 窗口管理器 - 管理小程序窗口的生命周期
pub struct WindowManager {
    /// LRU缓存，用于跟踪活跃窗口
    active_windows: Mutex<LruCache<String, WindowInfo>>,
    /// 最大活跃窗口数量
    max_windows: Mutex<usize>,
}

#[derive(Debug, Clone)]
pub struct WindowInfo {
    pub webapp_id: String,
    pub label: String,
}

impl WindowManager {
    pub fn new(max_windows: usize) -> Self {
        let capacity = NonZeroUsize::new(max_windows.max(1)).unwrap();
        Self {
            active_windows: Mutex::new(LruCache::new(capacity)),
            max_windows: Mutex::new(max_windows),
        }
    }

    /// 设置最大活跃窗口数量
    pub fn set_max_windows(&self, max: usize) {
        let capacity = NonZeroUsize::new(max.max(1)).unwrap();
        *self.max_windows.lock() = max;
        let mut cache = self.active_windows.lock();
        cache.resize(capacity);
    }

    /// 获取当前最大窗口数量
    pub fn get_max_windows(&self) -> usize {
        *self.max_windows.lock()
    }

    /// 打开或聚焦小程序窗口
    pub fn open_webapp(
        &self,
        app: &AppHandle,
        webapp: &WebApp,
        proxy_url: Option<String>,
    ) -> Result<(), String> {
        let window_label = format!("webapp-{}", webapp.id);

        // 检查窗口是否已存在
        if let Some(window) = app.get_webview_window(&window_label) {
            // 窗口已存在，聚焦它
            window.show().map_err(|e| e.to_string())?;
            window.set_focus().map_err(|e| e.to_string())?;

            // 更新LRU缓存顺序
            let mut cache = self.active_windows.lock();
            cache.get(&webapp.id);

            return Ok(());
        }

        // 检查是否需要关闭最旧的窗口
        self.enforce_window_limit(app)?;

        // 创建新窗口
        let builder = WebviewWindowBuilder::new(
            app,
            &window_label,
            WebviewUrl::External(webapp.url.parse().map_err(|e: url::ParseError| e.to_string())?),
        )
        .title(&webapp.name)
        .inner_size(webapp.width as f64, webapp.height as f64)
        .resizable(true)
        .center();

        // 如果有代理配置，设置代理
        if let Some(proxy) = proxy_url {
            // 通过环境变量设置代理 (WebView会读取)
            std::env::set_var("HTTP_PROXY", &proxy);
            std::env::set_var("HTTPS_PROXY", &proxy);
            log::info!("Setting proxy for webapp {}: {}", webapp.id, proxy);
        }

        let _window = builder.build().map_err(|e| e.to_string())?;

        // 添加到活跃窗口缓存
        let mut cache = self.active_windows.lock();
        cache.put(
            webapp.id.clone(),
            WindowInfo {
                webapp_id: webapp.id.clone(),
                label: window_label,
            },
        );

        log::info!("Opened webapp window: {} ({})", webapp.name, webapp.id);
        Ok(())
    }

    /// 关闭小程序窗口
    pub fn close_webapp(&self, app: &AppHandle, webapp_id: &str) -> Result<(), String> {
        let window_label = format!("webapp-{}", webapp_id);

        if let Some(window) = app.get_webview_window(&window_label) {
            window.close().map_err(|e| e.to_string())?;
        }

        let mut cache = self.active_windows.lock();
        cache.pop(webapp_id);

        log::info!("Closed webapp window: {}", webapp_id);
        Ok(())
    }

    /// 切换窗口可见性
    pub fn toggle_webapp(&self, app: &AppHandle, webapp: &WebApp) -> Result<(), String> {
        let window_label = format!("webapp-{}", webapp.id);

        if let Some(window) = app.get_webview_window(&window_label) {
            if window.is_visible().unwrap_or(false) {
                window.hide().map_err(|e| e.to_string())?;
            } else {
                window.show().map_err(|e| e.to_string())?;
                window.set_focus().map_err(|e| e.to_string())?;
            }
            Ok(())
        } else {
            // 窗口不存在，打开它
            self.open_webapp(app, webapp, None)
        }
    }

    /// 强制执行窗口数量限制
    fn enforce_window_limit(&self, app: &AppHandle) -> Result<(), String> {
        let max = *self.max_windows.lock();
        let mut cache = self.active_windows.lock();

        while cache.len() >= max {
            // 获取最旧的窗口(LRU)
            if let Some((_, info)) = cache.pop_lru() {
                // 关闭窗口
                if let Some(window) = app.get_webview_window(&info.label) {
                    let _ = window.close();
                    log::info!("Auto-closed LRU window: {}", info.webapp_id);
                }
            } else {
                break;
            }
        }

        Ok(())
    }

    /// 获取所有活跃窗口ID
    pub fn get_active_window_ids(&self) -> Vec<String> {
        let cache = self.active_windows.lock();
        cache.iter().map(|(id, _)| id.clone()).collect()
    }

    /// 检查窗口是否活跃
    pub fn is_window_active(&self, webapp_id: &str) -> bool {
        let cache = self.active_windows.lock();
        cache.contains(webapp_id)
    }
}

