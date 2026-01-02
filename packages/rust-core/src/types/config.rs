//! 应用配置类型定义

use serde::{Deserialize, Serialize};
use std::path::PathBuf;

/// 应用配置
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AppConfig {
    /// 数据目录路径
    pub data_dir: PathBuf,
    /// 数据库文件名
    pub db_filename: String,
    /// 备份目录名
    pub backup_dirname: String,
    /// 是否启用数据库加密
    pub enable_encryption: bool,
}

impl Default for AppConfig {
    fn default() -> Self {
        Self {
            data_dir: dirs::data_dir()
                .unwrap_or_else(|| PathBuf::from("."))
                .join("grain"),
            db_filename: "grain.db".to_string(),
            backup_dirname: "backups".to_string(),
            enable_encryption: true,
        }
    }
}

impl AppConfig {
    /// 获取数据库文件完整路径
    pub fn db_path(&self) -> PathBuf {
        self.data_dir.join(&self.db_filename)
    }

    /// 获取备份目录完整路径
    pub fn backup_dir(&self) -> PathBuf {
        self.data_dir.join(&self.backup_dirname)
    }

    /// 创建配置（确保目录存在）
    pub fn init(&self) -> std::io::Result<()> {
        std::fs::create_dir_all(&self.data_dir)?;
        std::fs::create_dir_all(self.backup_dir())?;
        Ok(())
    }

    /// 从环境变量创建配置（用于 Warp 服务器）
    pub fn from_env() -> Self {
        let data_dir = std::env::var("GRAIN_DATA_DIR")
            .map(PathBuf::from)
            .unwrap_or_else(|_| Self::default().data_dir);

        let db_filename = std::env::var("GRAIN_DB_FILENAME")
            .unwrap_or_else(|_| "grain.db".to_string());

        let enable_encryption = std::env::var("GRAIN_ENABLE_ENCRYPTION")
            .map(|v| v == "true" || v == "1")
            .unwrap_or(true);

        Self {
            data_dir,
            db_filename,
            backup_dirname: "backups".to_string(),
            enable_encryption,
        }
    }
}
