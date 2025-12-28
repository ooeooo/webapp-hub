use parking_lot::RwLock;
use std::path::PathBuf;

use crate::models::AppConfig;

/// 配置管理器 - 提供线程安全的配置读写
pub struct ConfigManager {
    /// 内存中的配置缓存
    config: RwLock<AppConfig>,
    /// 配置文件路径
    path: PathBuf,
}

impl ConfigManager {
    /// 创建新的配置管理器
    pub fn new(path: PathBuf) -> Self {
        let config = if path.exists() {
            std::fs::read_to_string(&path)
                .ok()
                .and_then(|content| serde_json::from_str(&content).ok())
                .unwrap_or_default()
        } else {
            AppConfig::default()
        };

        Self {
            config: RwLock::new(config),
            path,
        }
    }

    /// 读取配置（从内存缓存）
    pub fn read(&self) -> AppConfig {
        self.config.read().clone()
    }

    /// 更新配置（原子操作：修改内存 + 写入文件）
    /// 闭包可以返回任意类型 R，用于返回更新后的数据
    pub fn update<F, R>(&self, f: F) -> Result<R, String>
    where
        F: FnOnce(&mut AppConfig) -> R,
    {
        let (result, config_copy) = {
            let mut config = self.config.write();
            let result = f(&mut config);
            (result, config.clone())
        }; // 写锁在此释放
        
        // 在锁释放后写入文件，避免阻塞其他读取
        self.write_to_file(&config_copy)?;
        Ok(result)
    }

    /// 替换整个配置
    pub fn replace(&self, new_config: AppConfig) -> Result<(), String> {
        let mut config = self.config.write();
        *config = new_config;
        self.write_to_file(&config)
    }

    /// 写入配置到文件
    fn write_to_file(&self, config: &AppConfig) -> Result<(), String> {
        // 确保目录存在
        if let Some(parent) = self.path.parent() {
            std::fs::create_dir_all(parent).map_err(|e| e.to_string())?;
        }

        let content = serde_json::to_string_pretty(config).map_err(|e| e.to_string())?;
        std::fs::write(&self.path, content).map_err(|e| e.to_string())?;

        Ok(())
    }

    /// 重新从文件加载配置
    pub fn reload(&self) -> Result<(), String> {
        if self.path.exists() {
            let content = std::fs::read_to_string(&self.path).map_err(|e| e.to_string())?;
            let new_config: AppConfig =
                serde_json::from_str(&content).map_err(|e| e.to_string())?;
            let mut config = self.config.write();
            *config = new_config;
        }
        Ok(())
    }
}

