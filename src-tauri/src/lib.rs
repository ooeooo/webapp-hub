mod commands;
mod models;
mod proxy;
mod shortcuts;
mod window;

use tauri::Manager;
use window::WindowManager;

pub fn run() {
    env_logger::init();

    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_store::Builder::new().build())
        .plugin(tauri_plugin_global_shortcut::Builder::new().build())
        .setup(|app| {
            // 初始化窗口管理器
            let window_manager = WindowManager::new(5); // 默认最大5个活跃窗口
            app.manage(window_manager);

            // 初始化快捷键管理
            shortcuts::setup_shortcuts(app)?;

            Ok(())
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

