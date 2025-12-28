use crate::models::ProxyConfig;

/// 代理管理器
pub struct ProxyManager;

impl ProxyManager {
    /// 应用代理配置到系统环境变量
    pub fn apply_proxy(config: &ProxyConfig) {
        if !config.enabled {
            Self::clear_proxy();
            return;
        }

        if let Some(proxy_url) = config.get_proxy_url() {
            std::env::set_var("HTTP_PROXY", &proxy_url);
            std::env::set_var("HTTPS_PROXY", &proxy_url);
            std::env::set_var("http_proxy", &proxy_url);
            std::env::set_var("https_proxy", &proxy_url);

            log::info!("Applied proxy configuration: {}", proxy_url);
        }
    }

    /// 清除代理配置
    pub fn clear_proxy() {
        std::env::remove_var("HTTP_PROXY");
        std::env::remove_var("HTTPS_PROXY");
        std::env::remove_var("http_proxy");
        std::env::remove_var("https_proxy");

        log::info!("Cleared proxy configuration");
    }

    /// 获取当前代理URL
    pub fn get_current_proxy() -> Option<String> {
        std::env::var("HTTP_PROXY")
            .or_else(|_| std::env::var("http_proxy"))
            .ok()
    }

    /// 验证代理配置是否有效
    pub fn validate_config(config: &ProxyConfig) -> Result<(), String> {
        if !config.enabled {
            return Ok(());
        }

        if config.host.is_empty() {
            return Err("代理主机地址不能为空".to_string());
        }

        if config.port == 0 {
            return Err("代理端口无效".to_string());
        }

        let valid_types = ["http", "https", "socks5"];
        if !valid_types.contains(&config.proxy_type.as_str()) {
            return Err(format!(
                "不支持的代理类型: {}，支持: {:?}",
                config.proxy_type, valid_types
            ));
        }

        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_proxy_url_generation() {
        let config = ProxyConfig {
            enabled: true,
            host: "127.0.0.1".to_string(),
            port: 7890,
            username: None,
            password: None,
            proxy_type: "http".to_string(),
        };

        assert_eq!(
            config.get_proxy_url(),
            Some("http://127.0.0.1:7890".to_string())
        );
    }

    #[test]
    fn test_proxy_url_with_auth() {
        let config = ProxyConfig {
            enabled: true,
            host: "127.0.0.1".to_string(),
            port: 7890,
            username: Some("user".to_string()),
            password: Some("pass".to_string()),
            proxy_type: "http".to_string(),
        };

        assert_eq!(
            config.get_proxy_url(),
            Some("http://user:pass@127.0.0.1:7890".to_string())
        );
    }

    #[test]
    fn test_disabled_proxy() {
        let config = ProxyConfig {
            enabled: false,
            host: "127.0.0.1".to_string(),
            port: 7890,
            ..Default::default()
        };

        assert_eq!(config.get_proxy_url(), None);
    }
}

