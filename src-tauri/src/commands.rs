use std::path::PathBuf;
use tauri::{AppHandle, Manager, State};

use crate::models::{AppConfig, ProxyConfig, WebApp};
use crate::proxy::ProxyManager;
use crate::shortcuts::{load_shortcuts_from_config, ShortcutManager};
use crate::window::WindowManager;

/// 获取配置文件路径
fn get_config_path(app: &AppHandle) -> PathBuf {
    app.path()
        .app_data_dir()
        .unwrap_or_default()
        .join("config.json")
}

/// 读取配置
fn read_config(app: &AppHandle) -> AppConfig {
    let path = get_config_path(app);
    if path.exists() {
        std::fs::read_to_string(&path)
            .ok()
            .and_then(|content| serde_json::from_str(&content).ok())
            .unwrap_or_default()
    } else {
        AppConfig::default()
    }
}

/// 写入配置
fn write_config(app: &AppHandle, config: &AppConfig) -> Result<(), String> {
    let path = get_config_path(app);

    // 确保目录存在
    if let Some(parent) = path.parent() {
        std::fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    }

    let content = serde_json::to_string_pretty(config).map_err(|e| e.to_string())?;
    std::fs::write(&path, content).map_err(|e| e.to_string())?;

    Ok(())
}

/// 获取应用配置
#[tauri::command]
pub async fn get_config(app: AppHandle) -> Result<AppConfig, String> {
    Ok(read_config(&app))
}

/// 保存应用配置
#[tauri::command]
pub async fn save_config(app: AppHandle, config: AppConfig) -> Result<(), String> {
    // 验证代理配置
    ProxyManager::validate_config(&config.proxy)?;

    // 保存配置
    write_config(&app, &config)?;

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
    name: String,
    url: String,
    icon: Option<String>,
    shortcut: Option<String>,
    width: Option<u32>,
    height: Option<u32>,
) -> Result<WebApp, String> {
    let mut config = read_config(&app);

    // 创建新的webapp
    let mut webapp = WebApp::new(name, url);
    webapp.icon = icon;
    webapp.shortcut = shortcut.clone();
    webapp.width = width.unwrap_or(1024);
    webapp.height = height.unwrap_or(768);
    webapp.order = config.webapps.len() as u32;

    // 添加到配置
    config.webapps.push(webapp.clone());
    write_config(&app, &config)?;

    // 注册快捷键
    if let Some(shortcut_str) = &shortcut {
        if !shortcut_str.is_empty() {
            if let Some(manager) = app.try_state::<ShortcutManager>() {
                let _ = manager.register(&app, shortcut_str, &webapp.id);
            }
        }
    }

    log::info!("Added webapp: {} ({})", webapp.name, webapp.id);
    Ok(webapp)
}

/// 更新网页小程序
#[tauri::command]
pub async fn update_webapp(
    app: AppHandle,
    id: String,
    name: Option<String>,
    url: Option<String>,
    icon: Option<String>,
    shortcut: Option<String>,
    width: Option<u32>,
    height: Option<u32>,
    use_proxy: Option<bool>,
    order: Option<u32>,
) -> Result<WebApp, String> {
    let mut config = read_config(&app);

    // 查找并更新webapp
    let webapp = config
        .webapps
        .iter_mut()
        .find(|w| w.id == id)
        .ok_or("小程序不存在")?;

    let old_shortcut = webapp.shortcut.clone();

    if let Some(n) = name {
        webapp.name = n;
    }
    if let Some(u) = url {
        webapp.url = u;
    }
    if icon.is_some() {
        webapp.icon = icon;
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

    let updated_webapp = webapp.clone();
    write_config(&app, &config)?;

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
pub async fn delete_webapp(app: AppHandle, id: String) -> Result<(), String> {
    let mut config = read_config(&app);

    // 查找webapp
    let webapp = config.webapps.iter().find(|w| w.id == id).cloned();

    // 删除
    config.webapps.retain(|w| w.id != id);
    write_config(&app, &config)?;

    // 注销快捷键
    if let Some(w) = webapp {
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
    window_manager: State<'_, WindowManager>,
    id: String,
) -> Result<(), String> {
    let config = read_config(&app);

    let webapp = config
        .webapps
        .iter()
        .find(|w| w.id == id)
        .ok_or("小程序不存在")?;

    let proxy_url = if webapp.use_proxy && config.proxy.enabled {
        config.proxy.get_proxy_url()
    } else {
        None
    };

    window_manager.open_webapp(&app, webapp, proxy_url)
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
    app: AppHandle,
    window_manager: State<'_, WindowManager>,
    max: usize,
) -> Result<(), String> {
    if max == 0 {
        return Err("最大窗口数量不能为0".to_string());
    }

    window_manager.set_max_windows(max);

    // 更新配置
    let mut config = read_config(&app);
    config.max_active_windows = max;
    write_config(&app, &config)?;

    log::info!("Set max active windows to: {}", max);
    Ok(())
}

/// 设置代理配置
#[tauri::command]
pub async fn set_proxy_config(app: AppHandle, proxy: ProxyConfig) -> Result<(), String> {
    // 验证配置
    ProxyManager::validate_config(&proxy)?;

    // 更新配置
    let mut config = read_config(&app);
    config.proxy = proxy.clone();
    write_config(&app, &config)?;

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

