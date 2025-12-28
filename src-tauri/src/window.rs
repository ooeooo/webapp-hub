use lru::LruCache;
use parking_lot::Mutex;
use std::num::NonZeroUsize;
use std::sync::Arc;
use tauri::{AppHandle, Manager, WebviewUrl, WebviewWindowBuilder};

use crate::models::WebApp;

/// 包装用户脚本，确保在页面就绪后执行
fn wrap_script_with_ready_check(script: &str) -> String {
    // 转义用户脚本中的反斜杠和反引号
    let escaped_script = script
        .replace('\\', "\\\\")
        .replace('`', "\\`")
        .replace("${", "\\${");
    
    format!(
        r#"(function() {{
    var userScript = `{}`;
    function executeScript() {{
        try {{
            eval(userScript);
        }} catch (e) {{
            console.error('[WebApp Hub] Script execution error:', e);
        }}
    }}
    if (document.readyState === 'complete' || document.readyState === 'interactive') {{
        executeScript();
    }} else {{
        document.addEventListener('DOMContentLoaded', executeScript);
    }}
}})();"#,
        escaped_script
    )
}

/// 窗口切换结果
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum ToggleResult {
    /// 隐藏了窗口
    Hidden,
    /// 显示了已存在的窗口（需要检查快捷键脚本注入）
    ShownExisting,
    /// 创建了新窗口（inject_on_load 已处理，不需要快捷键脚本注入）
    CreatedNew,
}

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

        // 如果有代理配置，临时设置代理环境变量
        // 注意：这里使用临时设置+清除的方式，避免影响其他窗口
        let had_proxy = proxy_url.is_some();
        if let Some(proxy) = proxy_url {
            std::env::set_var("HTTP_PROXY", &proxy);
            std::env::set_var("HTTPS_PROXY", &proxy);
            log::info!("Setting proxy for webapp {}: {}", webapp.id, proxy);
        }

        let window = builder.build().map_err(|e| e.to_string())?;

        // 立即清除代理环境变量，避免影响后续创建的窗口
        if had_proxy {
            std::env::remove_var("HTTP_PROXY");
            std::env::remove_var("HTTPS_PROXY");
        }

        // 如果需要在页面加载时注入脚本
        if webapp.inject_on_load {
            if let Some(script) = &webapp.inject_script {
                // 包装用户脚本，确保在页面就绪后执行
                let wrapped_script = wrap_script_with_ready_check(script);
                let wrapped_script = Arc::new(wrapped_script);
                let window_clone = window.clone();
                let webapp_id = webapp.id.clone();

                // 使用 tokio::spawn 进行异步延迟注入
                tokio::spawn(async move {
                    // 等待初始加载
                    tokio::time::sleep(std::time::Duration::from_millis(500)).await;
                    
                    match window_clone.eval(&*wrapped_script) {
                        Ok(_) => {
                            log::info!(
                                "Script injected on page load for webapp: {}",
                                webapp_id
                            );
                        }
                        Err(e) => {
                            // 窗口可能已关闭
                            log::debug!(
                                "Could not inject script for webapp {}: {}",
                                webapp_id,
                                e
                            );
                        }
                    }
                });
            }
        }

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
    /// 返回 ToggleResult 以区分不同情况：
    /// - Hidden: 隐藏了窗口
    /// - ShownExisting: 显示了已存在的窗口（需要检查快捷键脚本注入）
    /// - CreatedNew: 创建了新窗口（inject_on_load 已处理）
    pub fn toggle_webapp(&self, app: &AppHandle, webapp: &WebApp, proxy_url: Option<String>) -> Result<ToggleResult, String> {
        let window_label = format!("webapp-{}", webapp.id);

        if let Some(window) = app.get_webview_window(&window_label) {
            let is_visible = window.is_visible().unwrap_or(false);
            let is_focused = window.is_focused().unwrap_or(false);

            if is_visible && is_focused {
                // 情况1: 窗口可见且有焦点 → 隐藏窗口
                window.hide().map_err(|e| e.to_string())?;
                log::info!("Hidden webapp window: {} (visible && focused)", webapp.id);
                Ok(ToggleResult::Hidden)
            } else {
                // 情况2: 窗口不可见或无焦点 → 显示窗口并置焦点
                window.show().map_err(|e| e.to_string())?;
                window.set_focus().map_err(|e| e.to_string())?;
                
                // 更新 LRU 缓存顺序
                let mut cache = self.active_windows.lock();
                cache.get(&webapp.id);
                
                log::info!("Shown webapp window: {} (not visible or not focused)", webapp.id);
                Ok(ToggleResult::ShownExisting)
            }
        } else {
            // 窗口不存在，创建新窗口（inject_on_load 在 open_webapp 中处理）
            self.open_webapp(app, webapp, proxy_url)?;
            Ok(ToggleResult::CreatedNew)
        }
    }

    /// 注入 JavaScript 脚本到指定的小程序窗口
    /// 脚本会被包装以确保在页面就绪后执行
    pub fn inject_script(&self, app: &AppHandle, webapp_id: &str, script: &str) -> Result<(), String> {
        let window_label = format!("webapp-{}", webapp_id);
        if let Some(window) = app.get_webview_window(&window_label) {
            let wrapped_script = wrap_script_with_ready_check(script);
            window.eval(&wrapped_script).map_err(|e| e.to_string())?;
            log::info!("Injected script to webapp: {}", webapp_id);
        } else {
            log::warn!("Window not found for script injection: {}", webapp_id);
        }
        Ok(())
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

