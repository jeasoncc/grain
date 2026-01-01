//! 数据库连接管理
//!
//! 管理 SQLite 数据库连接，支持可选的 SQLCipher 加密

use crate::types::config::AppConfig;
use crate::types::error::AppResult;
use sea_orm::{ConnectOptions, Database, DatabaseConnection};
use std::path::PathBuf;
use std::time::Duration;
use tracing::info;

/// 数据库连接管理器
pub struct DbConnection;

impl DbConnection {
    /// 创建数据库连接
    ///
    /// # Arguments
    /// * `config` - 应用配置
    ///
    /// # Returns
    /// 数据库连接实例
    pub async fn connect(config: &AppConfig) -> AppResult<DatabaseConnection> {
        // 确保数据目录存在
        config.init()?;

        let db_path = config.db_path();
        let db_url = Self::build_connection_url(&db_path, config.enable_encryption)?;

        // 配置连接选项
        let mut opt = ConnectOptions::new(db_url);
        opt.max_connections(5)
            .min_connections(1)
            .connect_timeout(Duration::from_secs(10))
            .acquire_timeout(Duration::from_secs(10))
            .idle_timeout(Duration::from_secs(300))
            .sqlx_logging(cfg!(debug_assertions)); // 仅开发环境记录 SQL

        info!("连接数据库: {:?}", db_path);
        let db = Database::connect(opt).await?;

        Ok(db)
    }

    /// 构建数据库连接 URL
    fn build_connection_url(db_path: &PathBuf, _enable_encryption: bool) -> AppResult<String> {
        // 基础 SQLite 连接 URL
        // mode=rwc: 读写模式，如果不存在则创建
        let url = format!("sqlite:{}?mode=rwc", db_path.display());

        // 注意：SQLCipher 加密需要编译时启用 sqlcipher feature
        // 目前使用标准 SQLite，后续可以通过条件编译启用加密
        // if enable_encryption {
        //     let key = CryptoService::get_or_create_key()?;
        //     url = format!(
        //         "{}?mode=rwc&key={}&cipher_page_size=4096&kdf_iter=256000",
        //         base_url,
        //         urlencoding::encode(&key)
        //     );
        // }

        Ok(url)
    }

    /// 获取数据库文件路径
    pub fn get_db_path(config: &AppConfig) -> PathBuf {
        config.db_path()
    }

    /// 检查数据库文件是否存在
    pub fn db_exists(config: &AppConfig) -> bool {
        config.db_path().exists()
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use tempfile::tempdir;

    #[tokio::test]
    async fn test_connect_creates_db() {
        let temp_dir = tempdir().unwrap();
        let config = AppConfig {
            data_dir: temp_dir.path().to_path_buf(),
            db_filename: "test.db".to_string(),
            backup_dirname: "backups".to_string(),
            enable_encryption: false,
        };

        let result = DbConnection::connect(&config).await;
        assert!(result.is_ok());
        assert!(config.db_path().exists());
    }
}
