//! 数据库连接管理
//!
//! 提供 SQLite 数据库连接的创建和管理。

use sea_orm::{Database, DatabaseConnection, DbErr};
use std::path::Path;

/// 数据库连接包装器
#[derive(Clone)]
pub struct DbConnection {
    conn: DatabaseConnection,
}

impl DbConnection {
    /// 创建新的数据库连接
    pub async fn new(db_path: &Path) -> Result<Self, DbErr> {
        let db_url = format!("sqlite://{}?mode=rwc", db_path.display());
        let conn = Database::connect(&db_url).await?;
        Ok(Self { conn })
    }

    /// 从连接字符串创建
    pub async fn from_url(url: &str) -> Result<Self, DbErr> {
        let conn = Database::connect(url).await?;
        Ok(Self { conn })
    }

    /// 获取内部连接引用
    pub fn get(&self) -> &DatabaseConnection {
        &self.conn
    }

    /// 获取内部连接（消费 self）
    pub fn into_inner(self) -> DatabaseConnection {
        self.conn
    }
}

impl std::ops::Deref for DbConnection {
    type Target = DatabaseConnection;

    fn deref(&self) -> &Self::Target {
        &self.conn
    }
}
