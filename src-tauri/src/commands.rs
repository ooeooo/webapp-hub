use tauri::{AppHandle, Manager, State, WebviewUrl};

use crate::config::ConfigManager;
use crate::models::{AppConfig, ProxyConfig, WebApp};
use crate::proxy::ProxyManager;
use crate::shortcuts::{load_shortcuts_from_config, ShortcutManager};
use crate::window::WindowManager;

/// 获取应用配置
#[tauri::command]
pub async fn get_config(config_manager: State<'_, ConfigManager>) -> Result<AppConfig, String> {
    Ok(config_manager.read())
}

/// 保存应用配置
#[tauri::command]
pub async fn save_config(
    app: AppHandle,
    config_manager: State<'_, ConfigManager>,
    config: AppConfig,
) -> Result<(), String> {
    // 验证代理配置
    ProxyManager::validate_config(&config.proxy)?;

    // 保存配置
    config_manager.replace(config.clone())?;

    // 应用代理设置
    ProxyManager::apply_proxy(&config.proxy);

    // 更新窗口管理器的最大窗口数
    if let Some(wm) = app.try_state::<WindowManager>() {
        wm.set_max_windows(config.max_active_windows);
    }

    // 重新加载快捷键
    load_shortcuts_from_config(&app, &config)?;

    log::info!("Configuration saved successfully");
    Ok(())
}

/// 添加新的网页小程序
#[tauri::command]
pub async fn add_webapp(
    app: AppHandle,
    config_manager: State<'_, ConfigManager>,
    name: String,
    url: String,
    icon: Option<String>,
    shortcut: Option<String>,
    width: Option<u32>,
    height: Option<u32>,
    inject_script: Option<String>,
    inject_on_load: Option<bool>,
    inject_on_shortcut: Option<bool>,
) -> Result<WebApp, String> {
    // 创建新的webapp
    let mut webapp = WebApp::new(name, url);
    webapp.icon = icon;
    webapp.shortcut = shortcut.clone();
    webapp.width = width.unwrap_or(1024);
    webapp.height = height.unwrap_or(768);
    webapp.inject_script = inject_script;
    webapp.inject_on_load = inject_on_load.unwrap_or(false);
    webapp.inject_on_shortcut = inject_on_shortcut.unwrap_or(false);

    // 使用 ConfigManager 原子更新配置，并获取正确的 order 值
    let final_webapp = config_manager.update(|config| {
        webapp.order = config.webapps.len() as u32;
        config.webapps.push(webapp.clone());
        webapp.clone()
    })?;

    // 注册快捷键
    if let Some(shortcut_str) = &shortcut {
        if !shortcut_str.is_empty() {
            if let Some(manager) = app.try_state::<ShortcutManager>() {
                let _ = manager.register(&app, shortcut_str, &final_webapp.id);
            }
        }
    }

    log::info!("Added webapp: {} ({})", final_webapp.name, final_webapp.id);
    Ok(final_webapp)
}

/// 更新网页小程序
#[tauri::command]
pub async fn update_webapp(
    app: AppHandle,
    config_manager: State<'_, ConfigManager>,
    id: String,
    name: Option<String>,
    url: Option<String>,
    icon: Option<String>,
    shortcut: Option<String>,
    width: Option<u32>,
    height: Option<u32>,
    use_proxy: Option<bool>,
    order: Option<u32>,
    inject_script: Option<String>,
    inject_on_load: Option<bool>,
    inject_on_shortcut: Option<bool>,
) -> Result<WebApp, String> {
    // 使用 ConfigManager 原子更新配置
    let (old_shortcut, updated_webapp) = config_manager.update(|config| {
        if let Some(webapp) = config.webapps.iter_mut().find(|w| w.id == id) {
            let old_shortcut = webapp.shortcut.clone();

            if let Some(n) = name.clone() {
                webapp.name = n;
            }
            if let Some(u) = url.clone() {
                webapp.url = u;
            }
            if icon.is_some() {
                webapp.icon = icon.clone();
            }
            if let Some(s) = shortcut.clone() {
                webapp.shortcut = if s.is_empty() { None } else { Some(s) };
            }
            if let Some(w) = width {
                webapp.width = w;
            }
            if let Some(h) = height {
                webapp.height = h;
            }
            if let Some(p) = use_proxy {
                webapp.use_proxy = p;
            }
            if let Some(o) = order {
                webapp.order = o;
            }
            if let Some(script) = inject_script.clone() {
                webapp.inject_script = if script.is_empty() { None } else { Some(script) };
            }
            if let Some(on_load) = inject_on_load {
                webapp.inject_on_load = on_load;
            }
            if let Some(on_shortcut) = inject_on_shortcut {
                webapp.inject_on_shortcut = on_shortcut;
            }

            (old_shortcut, Some(webapp.clone()))
        } else {
            (None, None)
        }
    })?;

    let updated_webapp = updated_webapp.ok_or("小程序不存在")?;

    // 更新快捷键
    if let Some(manager) = app.try_state::<ShortcutManager>() {
        // 注销旧快捷键
        if let Some(old) = old_shortcut {
            let _ = manager.unregister(&app, &old);
        }
        // 注册新快捷键
        if let Some(new) = &updated_webapp.shortcut {
            if !new.is_empty() {
                let _ = manager.register(&app, new, &updated_webapp.id);
            }
        }
    }

    log::info!("Updated webapp: {} ({})", updated_webapp.name, updated_webapp.id);
    Ok(updated_webapp)
}

/// 删除网页小程序
#[tauri::command]
pub async fn delete_webapp(
    app: AppHandle,
    config_manager: State<'_, ConfigManager>,
    id: String,
) -> Result<(), String> {
    // 使用 ConfigManager 原子更新配置
    let deleted_webapp = config_manager.update(|config| {
        let webapp = config.webapps.iter().find(|w| w.id == id).cloned();
        config.webapps.retain(|w| w.id != id);
        webapp
    })?;

    // 注销快捷键
    if let Some(w) = deleted_webapp {
        if let Some(shortcut) = &w.shortcut {
            if let Some(manager) = app.try_state::<ShortcutManager>() {
                let _ = manager.unregister(&app, shortcut);
            }
        }

        // 关闭窗口
        if let Some(wm) = app.try_state::<WindowManager>() {
            let _ = wm.close_webapp(&app, &id);
        }

        log::info!("Deleted webapp: {} ({})", w.name, id);
    }

    Ok(())
}

/// 打开小程序窗口
#[tauri::command]
pub async fn open_webapp(
    app: AppHandle,
    config_manager: State<'_, ConfigManager>,
    window_manager: State<'_, WindowManager>,
    id: String,
) -> Result<(), String> {
    let config = config_manager.read();

    let webapp = config
        .webapps
        .iter()
        .find(|w| w.id == id)
        .ok_or("小程序不存在")?
        .clone();

    let proxy_url = if webapp.use_proxy && config.proxy.enabled {
        config.proxy.get_proxy_url()
    } else {
        None
    };

    window_manager.open_webapp(&app, &webapp, proxy_url)
}

/// 关闭小程序窗口
#[tauri::command]
pub async fn close_webapp(
    app: AppHandle,
    window_manager: State<'_, WindowManager>,
    id: String,
) -> Result<(), String> {
    window_manager.close_webapp(&app, &id)
}

/// 设置最大活跃窗口数量
#[tauri::command]
pub async fn set_max_active_windows(
    config_manager: State<'_, ConfigManager>,
    window_manager: State<'_, WindowManager>,
    max: usize,
) -> Result<(), String> {
    if max == 0 {
        return Err("最大窗口数量不能为0".to_string());
    }

    window_manager.set_max_windows(max);

    // 使用 ConfigManager 原子更新配置
    config_manager.update(|config| {
        config.max_active_windows = max;
        () // 显式返回 unit
    })?;

    log::info!("Set max active windows to: {}", max);
    Ok(())
}

/// 设置代理配置
#[tauri::command]
pub async fn set_proxy_config(
    config_manager: State<'_, ConfigManager>,
    proxy: ProxyConfig,
) -> Result<(), String> {
    // 验证配置
    ProxyManager::validate_config(&proxy)?;

    // 使用 ConfigManager 原子更新配置
    let proxy_clone = proxy.clone();
    config_manager.update(|config| {
        config.proxy = proxy_clone;
        () // 显式返回 unit
    })?;

    // 应用代理
    ProxyManager::apply_proxy(&proxy);

    log::info!("Proxy configuration updated");
    Ok(())
}

/// 注册快捷键
#[tauri::command]
pub async fn register_shortcut(
    app: AppHandle,
    shortcut: String,
    webapp_id: String,
) -> Result<(), String> {
    let manager = app
        .try_state::<ShortcutManager>()
        .ok_or("快捷键管理器未初始化")?;

    manager.register(&app, &shortcut, &webapp_id)
}

/// 注销快捷键
#[tauri::command]
pub async fn unregister_shortcut(app: AppHandle, shortcut: String) -> Result<(), String> {
    let manager = app
        .try_state::<ShortcutManager>()
        .ok_or("快捷键管理器未初始化")?;

    manager.unregister(&app, &shortcut)
}

/// 打开小程序窗口（新窗口模式）
#[tauri::command]
pub async fn open_webapp_window(
    app: AppHandle,
    config_manager: State<'_, ConfigManager>,
    webapp_id: String,
) -> Result<(), String> {
    let config = config_manager.read();
    let webapp = config
        .webapps
        .iter()
        .find(|w| w.id == webapp_id)
        .ok_or("小程序不存在")?;

    let window_label = format!("webapp-{}", webapp_id);

    // 检查窗口是否已存在
    if let Some(window) = app.get_webview_window(&window_label) {
        // 窗口已存在，显示并聚焦
        let _ = window.show();
        let _ = window.set_focus();
        return Ok(());
    }

    // 创建新窗口
    let url = webapp.url.parse::<url::Url>().map_err(|e| e.to_string())?;
    
    let _window = tauri::WebviewWindowBuilder::new(
        &app,
        &window_label,
        WebviewUrl::External(url),
    )
    .title(&webapp.name)
    .inner_size(webapp.width as f64, webapp.height as f64)
    .resizable(true)
    .center()
    .build()
    .map_err(|e| e.to_string())?;

    log::info!("Opened webapp window: {}", webapp_id);
    Ok(())
}

/// 关闭小程序窗口
#[tauri::command]
pub async fn close_webapp_window(app: AppHandle, webapp_id: String) -> Result<(), String> {
    let window_label = format!("webapp-{}", webapp_id);

    if let Some(window) = app.get_webview_window(&window_label) {
        window.close().map_err(|e| e.to_string())?;
        log::info!("Closed webapp window: {}", webapp_id);
    }

    Ok(())
}

/// 切换小程序窗口（显示/隐藏）
#[tauri::command]
pub async fn toggle_webapp_window(
    app: AppHandle,
    config_manager: State<'_, ConfigManager>,
    webapp_id: String,
) -> Result<bool, String> {
    let window_label = format!("webapp-{}", webapp_id);

    if let Some(window) = app.get_webview_window(&window_label) {
        let is_visible = window.is_visible().unwrap_or(false);
        let is_focused = window.is_focused().unwrap_or(false);

        if is_visible && is_focused {
            window.hide().map_err(|e| e.to_string())?;
            return Ok(false);
        } else {
            window.show().map_err(|e| e.to_string())?;
            window.set_focus().map_err(|e| e.to_string())?;
            return Ok(true);
        }
    }

    // 窗口不存在，创建新窗口
    let config = config_manager.read();
    let webapp = config
        .webapps
        .iter()
        .find(|w| w.id == webapp_id)
        .ok_or("小程序不存在")?;

    let url = webapp.url.parse::<url::Url>().map_err(|e| e.to_string())?;
    
    let _window = tauri::WebviewWindowBuilder::new(
        &app,
        &window_label,
        WebviewUrl::External(url),
    )
    .title(&webapp.name)
    .inner_size(webapp.width as f64, webapp.height as f64)
    .resizable(true)
    .center()
    .build()
    .map_err(|e| e.to_string())?;

    log::info!("Created webapp window: {}", webapp_id);
    Ok(true)
}

