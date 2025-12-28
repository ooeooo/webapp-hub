use percent_encoding::{utf8_percent_encode, NON_ALPHANUMERIC};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

/// 网页小程序配置
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct WebApp {
    /// 唯一标识符
    pub id: String,
    /// 小程序名称
    pub name: String,
    /// 网页URL
    pub url: String,
    /// 图标URL或base64
    #[serde(default)]
    pub icon: Option<String>,
    /// 绑定的快捷键
    #[serde(default)]
    pub shortcut: Option<String>,
    /// 窗口宽度
    #[serde(default = "default_width")]
    pub width: u32,
    /// 窗口高度
    #[serde(default = "default_height")]
    pub height: u32,
    /// 是否使用全局代理
    #[serde(default = "default_true")]
    pub use_proxy: bool,
    /// 排序顺序
    #[serde(default)]
    pub order: u32,
    /// 创建时间戳
    #[serde(default)]
    pub created_at: u64,
    /// 自定义注入脚本
    #[serde(default)]
    pub inject_script: Option<String>,
    /// 是否在页面加载时注入
    #[serde(default)]
    pub inject_on_load: bool,
    /// 是否在快捷键显示时注入
    #[serde(default)]
    pub inject_on_shortcut: bool,
}

fn default_width() -> u32 {
    1024
}

fn default_height() -> u32 {
    768
}

fn default_true() -> bool {
    true
}

impl WebApp {
    pub fn new(name: String, url: String) -> Self {
        Self {
            id: Uuid::new_v4().to_string(),
            name,
            url,
            icon: None,
            shortcut: None,
            width: 1024,
            height: 768,
            use_proxy: true,
            order: 0,
            created_at: std::time::SystemTime::now()
                .duration_since(std::time::UNIX_EPOCH)
                .unwrap_or_default()
                .as_secs(),
            inject_script: None,
            inject_on_load: false,
            inject_on_shortcut: false,
        }
    }
}

/// HTTP代理配置
#[derive(Debug, Clone, Serialize, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct ProxyConfig {
    /// 是否启用代理
    #[serde(default)]
    pub enabled: bool,
    /// 代理服务器地址
    #[serde(default)]
    pub host: String,
    /// 代理端口
    #[serde(default)]
    pub port: u16,
    /// 代理用户名 (可选)
    #[serde(default)]
    pub username: Option<String>,
    /// 代理密码 (可选)
    #[serde(default)]
    pub password: Option<String>,
    /// 代理类型 (http/https/socks5)
    #[serde(default = "default_proxy_type")]
    pub proxy_type: String,
}

fn default_proxy_type() -> String {
    "http".to_string()
}

impl ProxyConfig {
    /// 获取代理URL
    /// 用户名和密码会进行 URL 编码以处理特殊字符
    pub fn get_proxy_url(&self) -> Option<String> {
        if !self.enabled || self.host.is_empty() {
            return None;
        }

        let auth = match (&self.username, &self.password) {
            (Some(user), Some(pass)) => {
                let encoded_user = utf8_percent_encode(user, NON_ALPHANUMERIC);
                let encoded_pass = utf8_percent_encode(pass, NON_ALPHANUMERIC);
                format!("{}:{}@", encoded_user, encoded_pass)
            }
            (Some(user), None) => {
                let encoded_user = utf8_percent_encode(user, NON_ALPHANUMERIC);
                format!("{}@", encoded_user)
            }
            _ => String::new(),
        };

        Some(format!(
            "{}://{}{}:{}",
            self.proxy_type, auth, self.host, self.port
        ))
    }
}

/// 应用全局配置
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AppConfig {
    /// 网页小程序列表
    #[serde(default)]
    pub webapps: Vec<WebApp>,
    /// 代理配置
    #[serde(default)]
    pub proxy: ProxyConfig,
    /// 最大同时活跃窗口数量
    #[serde(default = "default_max_windows")]
    pub max_active_windows: usize,
    /// 主窗口呼出快捷键
    #[serde(default)]
    pub main_window_shortcut: Option<String>,
    /// 是否开机启动
    #[serde(default)]
    pub auto_start: bool,
    /// 是否最小化到托盘
    #[serde(default = "default_true")]
    pub minimize_to_tray: bool,
}

fn default_max_windows() -> usize {
    5
}

impl Default for AppConfig {
    fn default() -> Self {
        Self {
            webapps: Vec::new(),
            proxy: ProxyConfig::default(),
            max_active_windows: 5,
            main_window_shortcut: None,
            auto_start: false,
            minimize_to_tray: true,
        }
    }
}

/// 窗口状态信息
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct WindowState {
    pub webapp_id: String,
    pub is_visible: bool,
    pub x: i32,
    pub y: i32,
    pub width: u32,
    pub height: u32,
}

