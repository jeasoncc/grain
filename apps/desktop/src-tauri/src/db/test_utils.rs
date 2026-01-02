//! 测试工具函数
//!
//! 提供测试用的数据库设置和辅助函数

use crate::types::config::AppConfig;
use sea_orm::DatabaseConnection;

/// 设置测试数据库
///
/// 创建一个临时的内存数据库用于测试
pub async fn setup_test_db() -> DatabaseConnection {
    use crate::db::DbConnection;
    use tempfile::tempdir;

    let temp_dir = tempdir().expect("创建临时目录失败");
    let config = AppConfig {
        data_dir: temp_dir.path().to_path_buf(),
        db_filename: format!("test-{}.db", uuid::Uuid::new_v4()),
        backup_dirname: "backups".to_string(),
        enable_encryption: false,
    };

    // 保持 temp_dir 不被 drop（通过 leak）
    // 这在测试中是可接受的，因为测试结束后进程会退出
    std::mem::forget(temp_dir);

    DbConnection::connect(&config)
        .await
        .expect("连接测试数据库失败")
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn test_setup_test_db() {
        let db = setup_test_db().await;
        // 验证数据库连接有效
        assert!(db.ping().await.is_ok());
    }
}
