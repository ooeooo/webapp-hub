use parking_lot::Mutex;
use std::collections::HashMap;
use tauri::{AppHandle, Manager};
use tauri_plugin_global_shortcut::{GlobalShortcutExt, Shortcut, ShortcutState};

use crate::models::AppConfig;
use crate::window::WindowManager;

/// 快捷键管理器状态
pub struct ShortcutManager {
    /// 已注册的快捷键映射: shortcut_string -> webapp_id
    registered: Mutex<HashMap<String, String>>,
    /// App handle for callbacks
    app_handle: Mutex<Option<AppHandle>>,
}

impl ShortcutManager {
    pub fn new() -> Self {
        Self {
            registered: Mutex::new(HashMap::new()),
            app_handle: Mutex::new(None),
        }
    }

    pub fn set_app_handle(&self, handle: AppHandle) {
        *self.app_handle.lock() = Some(handle);
    }

    /// 注册快捷键
    pub fn register(
        &self,
        app: &AppHandle,
        shortcut_str: &str,
        webapp_id: &str,
    ) -> Result<(), String> {
        let shortcut: Shortcut = shortcut_str
            .parse()
            .map_err(|e| format!("无效的快捷键: {}", e))?;

        // 检查是否已注册
        {
            let registered = self.registered.lock();
            if registered.contains_key(shortcut_str) {
                return Err(format!("快捷键 {} 已被使用", shortcut_str));
            }
        }

        let webapp_id_clone = webapp_id.to_string();
        let app_handle = app.clone();

        // 注册快捷键并设置处理器
        app.global_shortcut()
            .on_shortcut(shortcut, move |_app, _shortcut, event| {
                if event.state == ShortcutState::Pressed {
                    handle_shortcut_trigger(&app_handle, &webapp_id_clone);
                }
            })
            .map_err(|e| format!("注册快捷键失败: {}", e))?;

        // 记录映射
        let mut registered = self.registered.lock();
        registered.insert(shortcut_str.to_string(), webapp_id.to_string());

        log::info!(
            "Registered shortcut: {} for webapp: {}",
            shortcut_str,
            webapp_id
        );
        Ok(())
    }

    /// 注销快捷键
    pub fn unregister(&self, app: &AppHandle, shortcut_str: &str) -> Result<(), String> {
        let shortcut: Shortcut = shortcut_str
            .parse()
            .map_err(|e| format!("无效的快捷键: {}", e))?;

        app.global_shortcut()
            .unregister(shortcut)
            .map_err(|e| format!("注销快捷键失败: {}", e))?;

        let mut registered = self.registered.lock();
        registered.remove(shortcut_str);

        log::info!("Unregistered shortcut: {}", shortcut_str);
        Ok(())
    }

    /// 获取快捷键对应的webapp_id
    pub fn get_webapp_id(&self, shortcut_str: &str) -> Option<String> {
        let registered = self.registered.lock();
        registered.get(shortcut_str).cloned()
    }

    /// 清除所有快捷键
    pub fn clear_all(&self, app: &AppHandle) -> Result<(), String> {
        let shortcuts: Vec<String> = {
            let registered = self.registered.lock();
            registered.keys().cloned().collect()
        };

        for shortcut_str in shortcuts {
            let _ = self.unregister(app, &shortcut_str);
        }

        Ok(())
    }
}

impl Default for ShortcutManager {
    fn default() -> Self {
        Self::new()
    }
}

/// 初始化快捷键系统
pub fn setup_shortcuts(app: &tauri::App) -> Result<(), Box<dyn std::error::Error>> {
    let shortcut_manager = ShortcutManager::new();
    shortcut_manager.set_app_handle(app.handle().clone());
    app.manage(shortcut_manager);

    Ok(())
}

/// 处理快捷键触发
fn handle_shortcut_trigger(app: &AppHandle, webapp_id: &str) {
    // 处理主窗口快捷键
    if webapp_id == "__main__" {
        if let Some(window) = app.get_webview_window("main") {
            let is_visible = window.is_visible().unwrap_or(false);
            let is_focused = window.is_focused().unwrap_or(false);
            
            if is_visible && is_focused {
                // 窗口可见且有焦点 → 隐藏
                let _ = window.hide();
            } else {
                // 窗口不可见或无焦点 → 显示并置焦点
                let _ = window.show();
                let _ = window.set_focus();
            }
        }
        return;
    }

    // 从配置中获取webapp信息
    let store_path = app
        .path()
        .app_data_dir()
        .unwrap_or_default()
        .join("config.json");

    if let Ok(content) = std::fs::read_to_string(&store_path) {
        if let Ok(config) = serde_json::from_str::<AppConfig>(&content) {
            if let Some(webapp) = config.webapps.iter().find(|w| w.id == webapp_id) {
                if let Some(window_manager) = app.try_state::<WindowManager>() {
                    let proxy_url = if webapp.use_proxy && config.proxy.enabled {
                        config.proxy.get_proxy_url()
                    } else {
                        None
                    };

                    match window_manager.toggle_webapp(app, webapp, proxy_url) {
                        Ok(should_show) => {
                            // 仅当显示窗口时才可能注入脚本
                            if should_show && webapp.inject_on_shortcut {
                                if let Some(script) = &webapp.inject_script {
                                    if let Err(e) = window_manager.inject_script(app, &webapp.id, script) {
                                        log::error!("Failed to inject script on shortcut: {}", e);
                                    }
                                }
                            }
                        }
                        Err(e) => {
                            log::error!("Failed to toggle webapp: {}", e);
                        }
                    }
                }
            }
        }
    }
}

/// 从配置中加载并注册所有快捷键
pub fn load_shortcuts_from_config(app: &AppHandle, config: &AppConfig) -> Result<(), String> {
    let manager = app
        .try_state::<ShortcutManager>()
        .ok_or("快捷键管理器未初始化")?;

    // 清除现有快捷键
    manager.clear_all(app)?;

    // 注册每个webapp的快捷键
    for webapp in &config.webapps {
        if let Some(shortcut) = &webapp.shortcut {
            if !shortcut.is_empty() {
                if let Err(e) = manager.register(app, shortcut, &webapp.id) {
                    log::warn!("Failed to register shortcut for {}: {}", webapp.name, e);
                }
            }
        }
    }

    // 注册主窗口快捷键
    if let Some(main_shortcut) = &config.main_window_shortcut {
        if !main_shortcut.is_empty() {
            if let Err(e) = manager.register(app, main_shortcut, "__main__") {
                log::warn!("Failed to register main window shortcut: {}", e);
            }
        }
    }

    Ok(())
}
