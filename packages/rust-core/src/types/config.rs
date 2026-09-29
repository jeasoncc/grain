//! 应用配置类型定义

use serde::{Deserialize, Serialize};
use std::path::PathBuf;

/// Historical SQLite filename used by the pre-Org desktop and the API server.
pub const LEGACY_DB_FILENAME: &str = "grain.db";
/// Disposable SQLite cache used by the normal Org desktop startup.
pub const ORG_DERIVED_DB_FILENAME: &str = "grain-org-index.db";
/// Deliberate opt-in required before Tauri may open the historical database.
pub const TAURI_LEGACY_MODE_ENV: &str = "GRAIN_TAURI_LEGACY_MODE";

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
            db_filename: LEGACY_DB_FILENAME.to_string(),
            backup_dirname: "backups".to_string(),
            enable_encryption: true,
        }
    }
}

impl AppConfig {
    /// Build the desktop configuration without granting ambient access to the historical DB.
    ///
    /// The ordinary Org desktop only needs a disposable derived index. Opening `grain.db`
    /// requires the process-level `GRAIN_TAURI_LEGACY_MODE=1` opt-in.
    pub fn for_tauri() -> Self {
        Self::for_tauri_mode(Self::tauri_legacy_mode_enabled())
    }

    /// Build a desktop configuration for an already-decided startup mode.
    ///
    /// Kept separate from environment access so the safety-critical filename choice is easy to
    /// test without mutating process-global environment variables.
    pub fn for_tauri_mode(legacy_mode: bool) -> Self {
        let mut config = Self::default();
        config.db_filename = if legacy_mode {
            LEGACY_DB_FILENAME
        } else {
            ORG_DERIVED_DB_FILENAME
        }
        .to_string();
        config
    }

    /// Whether this Tauri process was explicitly authorized to open the historical database.
    pub fn tauri_legacy_mode_enabled() -> bool {
        std::env::var(TAURI_LEGACY_MODE_ENV)
            .map(|value| value == "1" || value.eq_ignore_ascii_case("true"))
            .unwrap_or(false)
    }

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

        let db_filename =
            std::env::var("GRAIN_DB_FILENAME").unwrap_or_else(|_| LEGACY_DB_FILENAME.to_string());

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

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn normal_tauri_mode_uses_a_separate_derived_database() {
        let config = AppConfig::for_tauri_mode(false);

        assert_eq!(config.db_filename, ORG_DERIVED_DB_FILENAME);
        assert_ne!(config.db_filename, LEGACY_DB_FILENAME);
    }

    #[test]
    fn legacy_tauri_mode_is_an_explicit_filename_choice() {
        let config = AppConfig::for_tauri_mode(true);

        assert_eq!(config.db_filename, LEGACY_DB_FILENAME);
    }
}
