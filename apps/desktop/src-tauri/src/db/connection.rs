//! 数据库连接管理
//!
//! 管理 SQLite 数据库连接，支持可选的 SQLCipher 加密

use crate::types::config::AppConfig;
use crate::types::error::AppResult;
use sea_orm::{ConnectionTrait, ConnectOptions, Database, DatabaseConnection, Statement};
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

        // 创建表结构
        Self::create_tables(&db).await?;

        Ok(db)
    }

    /// 创建数据库表结构
    async fn create_tables(db: &DatabaseConnection) -> AppResult<()> {
        info!("创建数据库表结构...");

        // 创建 workspaces 表（复数，与 SeaORM Entity 一致）
        db.execute(Statement::from_string(
            db.get_database_backend(),
            r#"
            CREATE TABLE IF NOT EXISTS workspaces (
                id TEXT PRIMARY KEY NOT NULL,
                name TEXT NOT NULL,
                description TEXT,
                created_at INTEGER NOT NULL,
                updated_at INTEGER NOT NULL
            )
            "#.to_string(),
        ))
        .await?;

        // 创建 nodes 表（复数，与 SeaORM Entity 一致）
        db.execute(Statement::from_string(
            db.get_database_backend(),
            r#"
            CREATE TABLE IF NOT EXISTS nodes (
                id TEXT PRIMARY KEY NOT NULL,
                workspace_id TEXT NOT NULL,
                parent_id TEXT,
                title TEXT NOT NULL,
                node_type TEXT NOT NULL,
                is_collapsed INTEGER NOT NULL DEFAULT 0,
                sort_order INTEGER NOT NULL DEFAULT 0,
                tags TEXT,
                created_at INTEGER NOT NULL,
                updated_at INTEGER NOT NULL,
                FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE,
                FOREIGN KEY (parent_id) REFERENCES nodes(id) ON DELETE CASCADE
            )
            "#.to_string(),
        ))
        .await?;

        // 创建 nodes 表索引
        db.execute(Statement::from_string(
            db.get_database_backend(),
            "CREATE INDEX IF NOT EXISTS idx_nodes_workspace ON nodes(workspace_id)".to_string(),
        ))
        .await?;

        db.execute(Statement::from_string(
            db.get_database_backend(),
            "CREATE INDEX IF NOT EXISTS idx_nodes_parent ON nodes(parent_id)".to_string(),
        ))
        .await?;

        // 创建 contents 表（复数，与 SeaORM Entity 一致）
        db.execute(Statement::from_string(
            db.get_database_backend(),
            r#"
            CREATE TABLE IF NOT EXISTS contents (
                id TEXT PRIMARY KEY NOT NULL,
                node_id TEXT NOT NULL UNIQUE,
                content TEXT NOT NULL,
                version INTEGER NOT NULL DEFAULT 1,
                created_at INTEGER NOT NULL,
                updated_at INTEGER NOT NULL,
                FOREIGN KEY (node_id) REFERENCES nodes(id) ON DELETE CASCADE
            )
            "#.to_string(),
        ))
        .await?;

        // 创建 contents 表索引
        db.execute(Statement::from_string(
            db.get_database_backend(),
            "CREATE INDEX IF NOT EXISTS idx_contents_node ON contents(node_id)".to_string(),
        ))
        .await?;

        info!("数据库表结构创建完成");
        Ok(())
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
