mod commands;
mod config;
mod models;
mod proxy;
mod shortcuts;
mod window;

use config::ConfigManager;
use tauri::Manager;
use window::WindowManager;

pub fn run() {
    // 设置自定义 panic hook 以便在崩溃前记录信息
    std::panic::set_hook(Box::new(|panic_info| {
        let msg = if let Some(s) = panic_info.payload().downcast_ref::<&str>() {
            s.to_string()
        } else if let Some(s) = panic_info.payload().downcast_ref::<String>() {
            s.clone()
        } else {
            "Unknown panic".to_string()
        };
        
        let location = panic_info
            .location()
            .map(|l| format!("{}:{}:{}", l.file(), l.line(), l.column()))
            .unwrap_or_else(|| "unknown location".to_string());
        
        eprintln!("PANIC at {}: {}", location, msg);
        
        // 在 macOS 上尝试显示对话框
        #[cfg(target_os = "macos")]
        {
            let _ = std::process::Command::new("osascript")
                .args([
                    "-e",
                    &format!(
                        "display dialog \"WebApp Hub crashed:\\n{}\\n\\nLocation: {}\" buttons {{\"OK\"}} default button \"OK\" with icon stop",
                        msg.replace("\"", "\\\""),
                        location
                    ),
                ])
                .output();
        }
    }));

    // 使用 try_init 避免重复初始化导致 panic
    let _ = env_logger::try_init();

    let builder = tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_store::Builder::new().build());

    // 全局快捷键插件在某些系统上可能失败（权限问题），需要优雅处理
    #[cfg(desktop)]
    let builder = builder.plugin(tauri_plugin_global_shortcut::Builder::new().build());

    builder
        .setup(|app| {
            // 初始化配置管理器
            let config_path = app
                .path()
                .app_data_dir()
                .unwrap_or_default()
                .join("config.json");
            let config_manager = ConfigManager::new(config_path);
            let config = config_manager.read();
            app.manage(config_manager);

            // 初始化窗口管理器，使用配置中的最大窗口数
            let window_manager = WindowManager::new(config.max_active_windows);
            app.manage(window_manager);

            // 初始化快捷键管理（如果失败只记录日志，不阻止启动）
            if let Err(e) = shortcuts::setup_shortcuts(app) {
                log::error!("Failed to setup shortcuts: {:?}", e);
                // 仍然继续启动，只是快捷键功能不可用
            }

            Ok(())
        })
        .on_window_event(|window, event| {
            // 处理窗口关闭事件，清理资源
            if let tauri::WindowEvent::CloseRequested { .. } = event {
                if window.label() == "main" {
                    // 主窗口关闭时，清理所有快捷键
                    if let Some(manager) = window.app_handle().try_state::<shortcuts::ShortcutManager>() {
                        let _ = manager.clear_all(window.app_handle());
                    }
                }
            }
        })
        .invoke_handler(tauri::generate_handler![
            commands::get_config,
            commands::save_config,
            commands::add_webapp,
            commands::update_webapp,
            commands::delete_webapp,
            commands::open_webapp,
            commands::close_webapp,
            commands::set_max_active_windows,
            commands::set_proxy_config,
            commands::register_shortcut,
            commands::unregister_shortcut,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

