//! 数据库连接管理
//!
//! 管理 SQLite 数据库连接，支持可选的 SQLCipher 加密

use crate::types::config::AppConfig;
use crate::types::error::{AppError, AppResult};
use sea_orm::{ConnectOptions, ConnectionTrait, Database, DatabaseConnection, Statement};
use std::path::PathBuf;
use std::time::Duration;
use tracing::info;

/// 数据库连接管理器
pub struct DbConnection;

/// Separate authority: never managed as the ordinary writable database.
pub struct LegacyDbConnection {
    db: DatabaseConnection,
    // Linux OFD lock survives SQLx opening/closing other descriptors for the same inode.
    _source: std::fs::File,
}

impl LegacyDbConnection {
    pub fn database(&self) -> &DatabaseConnection {
        &self.db
    }
}

impl DbConnection {
    /// Open only a closed, rollback-journal historical database, without initializing anything.
    /// Unsupported hosts and live/WAL databases fail closed: read-only SQLite alone can write SHM.
    pub async fn connect_legacy_readonly(config: &AppConfig) -> AppResult<LegacyDbConnection> {
        #[cfg(not(target_os = "linux"))]
        {
            let _ = config;
            return Err(AppError::validation(
                "Read-only historical SQLite access requires Linux OFD locking on a local filesystem; this platform is unsupported",
            ));
        }
        #[cfg(target_os = "linux")]
        {
            use std::io::Read;
            use std::os::fd::AsRawFd;
            use std::os::unix::fs::OpenOptionsExt;

            // No init, create, encryption pragma, or fallback. Standard SQLite is the existing
            // build; SQLCipher files are unsupported, not silently decrypted with invented keys.
            let path = std::fs::canonicalize(config.db_path())?;
            let mut source = std::fs::OpenOptions::new()
                .read(true)
                .custom_flags(libc::O_NOFOLLOW | libc::O_NONBLOCK)
                .open(&path)?;
            if !source.metadata()?.is_file() {
                return Err(AppError::validation("Historical database must be a regular file"));
            }
            let mut filesystem: libc::statfs = unsafe { std::mem::zeroed() };
            if unsafe { libc::fstatfs(source.as_raw_fd(), &mut filesystem) } == -1 {
                return Err(std::io::Error::last_os_error().into());
            }
            // Conservative local-filesystem support. Unknown/FUSE/network filesystems do
            // not establish the shared OFD/POSIX lock semantics needed for sidecar safety.
            if !matches!(filesystem.f_type as u64,
                0xef53 | 0x01021994 | 0x58465342 | 0x9123683e | 0x794c7630 |
                0x2fc12fc1 | 0xf2f52010 | 0x858458f6)
            {
                return Err(AppError::validation(
                    "Historical SQLite requires a supported local filesystem; network, FUSE and unknown filesystems are unsupported",
                ));
            }
            let mut lock: libc::flock = unsafe { std::mem::zeroed() };
            lock.l_type = libc::F_RDLCK as _;
            lock.l_whence = libc::SEEK_SET as _;
            // SQLite's RESERVED byte. A writer must obtain an exclusive lock here before
            // modifying a rollback database or switching its persisted journal mode to WAL.
            lock.l_start = 0x40000001;
            lock.l_len = 1;
            if unsafe { libc::fcntl(source.as_raw_fd(), libc::F_OFD_SETLK, &lock) } == -1 {
                return Err(AppError::validation(
                    "Historical SQLite is live or the filesystem does not support safe OFD locking; close all writers and use an offline local copy",
                ));
            }
            for suffix in ["-wal", "-shm", "-journal"] {
                let mut sidecar = path.as_os_str().to_os_string();
                sidecar.push(suffix);
                match std::fs::symlink_metadata(std::path::Path::new(&sidecar)) {
                    Ok(_) => return Err(AppError::validation(
                        "Historical SQLite has WAL/SHM/journal sidecars; checkpoint and close it outside Grain before opening an offline copy",
                    )),
                    Err(error) if error.kind() == std::io::ErrorKind::NotFound => {}
                    Err(error) => return Err(error.into()),
                }
            }
            let mut header = [0_u8; 100];
            source.read_exact(&mut header).map_err(|_| AppError::validation(
                "Historical database has an invalid or incomplete SQLite header",
            ))?;
            if &header[..16] != b"SQLite format 3\0" {
                return Err(AppError::validation(
                    "Historical database is invalid or encrypted; SQLCipher is not supported by this build",
                ));
            }
            if header[18] != 1 || header[19] != 1 {
                return Err(AppError::validation(
                    "Historical SQLite is in WAL or an unsupported journal format; use a checkpointed offline rollback-journal copy",
                ));
            }
            // Pass a literal filename through SQLx's native path API: URI metacharacters
            // and Unicode cannot change the connection options. The source must remain an
            // offline copy; advisory SQLite locking cannot stop external raw writes/renames.
            let mut options = ConnectOptions::new("sqlite::memory:");
            options.max_connections(5).min_connections(1).sqlx_logging(false);
            options.map_sqlx_sqlite_opts(move |options| options
                .filename(&path)
                .in_memory(false)
                .shared_cache(false)
                .create_if_missing(false)
                .read_only(true)
                .pragma("query_only", "ON"));
            let db = Database::connect(options).await?;
            // Validate the schema with reads; never add missing historical tables.
            db.query_all_raw(Statement::from_string(
                db.get_database_backend(),
                "SELECT id,name,description,created_at,updated_at FROM workspaces LIMIT 0",
            )).await?;
            db.query_all_raw(Statement::from_string(
                db.get_database_backend(),
                "SELECT id,workspace_id,parent_id,title,node_type,is_collapsed,sort_order,tags,created_at,updated_at FROM nodes LIMIT 0",
            )).await?;
            db.query_all_raw(Statement::from_string(
                db.get_database_backend(),
                "SELECT id,node_id,content,version,created_at,updated_at FROM contents LIMIT 0",
            )).await?;
            Ok(LegacyDbConnection { db, _source: source })
        }
    }

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

        // 创建 workspaces 表
        db.execute_raw(Statement::from_string(
            db.get_database_backend(),
            r#"
            CREATE TABLE IF NOT EXISTS workspaces (
                id TEXT PRIMARY KEY NOT NULL,
                name TEXT NOT NULL,
                description TEXT,
                created_at INTEGER NOT NULL,
                updated_at INTEGER NOT NULL
            )
            "#
            .to_string(),
        ))
        .await?;

        // 创建 nodes 表
        db.execute_raw(Statement::from_string(
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
            "#
            .to_string(),
        ))
        .await?;

        // 创建 nodes 表索引
        db.execute_raw(Statement::from_string(
            db.get_database_backend(),
            "CREATE INDEX IF NOT EXISTS idx_nodes_workspace ON nodes(workspace_id)".to_string(),
        ))
        .await?;

        db.execute_raw(Statement::from_string(
            db.get_database_backend(),
            "CREATE INDEX IF NOT EXISTS idx_nodes_parent ON nodes(parent_id)".to_string(),
        ))
        .await?;

        // 创建 contents 表
        db.execute_raw(Statement::from_string(
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
            "#
            .to_string(),
        ))
        .await?;

        // 创建 contents 表索引
        db.execute_raw(Statement::from_string(
            db.get_database_backend(),
            "CREATE INDEX IF NOT EXISTS idx_contents_node ON contents(node_id)".to_string(),
        ))
        .await?;

        // 创建 tags 表
        db.execute_raw(Statement::from_string(
            db.get_database_backend(),
            r#"
            CREATE TABLE IF NOT EXISTS tags (
                id TEXT PRIMARY KEY NOT NULL,
                name TEXT NOT NULL,
                workspace_id TEXT NOT NULL,
                count INTEGER NOT NULL DEFAULT 1,
                last_used INTEGER NOT NULL,
                created_at INTEGER NOT NULL,
                FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE
            )
            "#
            .to_string(),
        ))
        .await?;

        // 创建 tags 表索引
        db.execute_raw(Statement::from_string(
            db.get_database_backend(),
            "CREATE INDEX IF NOT EXISTS idx_tags_workspace ON tags(workspace_id)".to_string(),
        ))
        .await?;

        // 创建 users 表
        db.execute_raw(Statement::from_string(
            db.get_database_backend(),
            r#"
            CREATE TABLE IF NOT EXISTS users (
                id TEXT PRIMARY KEY NOT NULL,
                username TEXT NOT NULL,
                display_name TEXT,
                avatar TEXT,
                email TEXT,
                last_login INTEGER NOT NULL,
                created_at INTEGER NOT NULL,
                plan TEXT NOT NULL DEFAULT 'free',
                plan_start_date INTEGER,
                plan_expires_at INTEGER,
                trial_expires_at INTEGER,
                token TEXT,
                server_message TEXT,
                features TEXT,
                state TEXT,
                settings TEXT
            )
            "#
            .to_string(),
        ))
        .await?;

        // 创建 users 表索引
        db.execute_raw(Statement::from_string(
            db.get_database_backend(),
            "CREATE UNIQUE INDEX IF NOT EXISTS idx_users_username ON users(username)".to_string(),
        ))
        .await?;

        db.execute_raw(Statement::from_string(
            db.get_database_backend(),
            "CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)".to_string(),
        ))
        .await?;

        // 创建 attachments 表
        db.execute_raw(Statement::from_string(
            db.get_database_backend(),
            r#"
            CREATE TABLE IF NOT EXISTS attachments (
                id TEXT PRIMARY KEY NOT NULL,
                project_id TEXT,
                attachment_type TEXT NOT NULL DEFAULT 'file',
                file_name TEXT NOT NULL,
                file_path TEXT NOT NULL,
                uploaded_at INTEGER NOT NULL,
                size INTEGER,
                mime_type TEXT
            )
            "#
            .to_string(),
        ))
        .await?;

        // 创建 attachments 表索引
        db.execute_raw(Statement::from_string(
            db.get_database_backend(),
            "CREATE INDEX IF NOT EXISTS idx_attachments_project ON attachments(project_id)"
                .to_string(),
        ))
        .await?;

        db.execute_raw(Statement::from_string(
            db.get_database_backend(),
            "CREATE INDEX IF NOT EXISTS idx_attachments_type ON attachments(attachment_type)"
                .to_string(),
        ))
        .await?;

        // Derived Org indexes are an intentionally FK-free cache. Every row is scoped by the
        // approved workspace display root, so all of this data can be deleted and rebuilt without
        // touching Org files or the legacy contents table.
        let org_index_schema = [
            r#"
            CREATE TABLE IF NOT EXISTS org_index_documents (
                workspace_root TEXT NOT NULL,
                relative_path TEXT NOT NULL,
                revision TEXT NOT NULL,
                title TEXT,
                PRIMARY KEY (workspace_root, relative_path)
            )
            "#,
            r#"
            CREATE TABLE IF NOT EXISTS org_index_headings (
                workspace_root TEXT NOT NULL,
                relative_path TEXT NOT NULL,
                line INTEGER NOT NULL,
                level INTEGER NOT NULL,
                title TEXT NOT NULL,
                todo_keyword TEXT,
                org_id TEXT,
                custom_id TEXT,
                PRIMARY KEY (workspace_root, relative_path, line)
            )
            "#,
            r#"
            CREATE TABLE IF NOT EXISTS org_index_links (
                workspace_root TEXT NOT NULL,
                source_relative_path TEXT NOT NULL,
                line INTEGER NOT NULL,
                column INTEGER NOT NULL,
                target_kind TEXT NOT NULL,
                target_relative_path TEXT,
                target_value TEXT,
                label TEXT NOT NULL,
                PRIMARY KEY (workspace_root, source_relative_path, line, column)
            )
            "#,
            r#"
            CREATE TABLE IF NOT EXISTS org_index_agenda (
                workspace_root TEXT NOT NULL,
                relative_path TEXT NOT NULL,
                line INTEGER NOT NULL,
                column INTEGER NOT NULL,
                kind TEXT NOT NULL,
                date TEXT NOT NULL,
                heading TEXT,
                todo_keyword TEXT,
                PRIMARY KEY (workspace_root, relative_path, line, column, kind)
            )
            "#,
            "CREATE INDEX IF NOT EXISTS idx_org_index_documents_workspace_path ON org_index_documents(workspace_root, relative_path)",
            "CREATE INDEX IF NOT EXISTS idx_org_index_headings_workspace_path ON org_index_headings(workspace_root, relative_path)",
            "CREATE INDEX IF NOT EXISTS idx_org_index_links_workspace_path ON org_index_links(workspace_root, source_relative_path)",
            "CREATE INDEX IF NOT EXISTS idx_org_index_links_target_path ON org_index_links(workspace_root, target_relative_path)",
            "CREATE INDEX IF NOT EXISTS idx_org_index_agenda_workspace_path ON org_index_agenda(workspace_root, relative_path)",
        ];
        for sql in org_index_schema {
            db.execute_raw(Statement::from_string(
                db.get_database_backend(),
                sql.to_owned(),
            ))
            .await?;
        }

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

    #[tokio::test]
    async fn normal_tauri_database_does_not_open_legacy_path() {
        let temp_dir = tempdir().unwrap();
        // A directory cannot be opened as SQLite. Successful startup therefore demonstrates that
        // the legacy path was neither opened nor replaced, without inspecting any DB contents.
        let legacy_path = temp_dir
            .path()
            .join(crate::types::config::LEGACY_DB_FILENAME);
        std::fs::create_dir(&legacy_path).unwrap();
        let mut config = AppConfig::for_tauri_mode(false);
        config.data_dir = temp_dir.path().to_path_buf();
        config.enable_encryption = false;

        DbConnection::connect(&config).await.unwrap();

        assert!(legacy_path.is_dir());
        assert!(config.db_path().is_file());
        assert_eq!(
            config.db_filename,
            crate::types::config::ORG_DERIVED_DB_FILENAME
        );
    }
}

#[cfg(all(test, target_os = "linux"))]
mod legacy_readonly_tests {
    use super::*;
    use sea_orm::sqlx;
    use tempfile::tempdir;

    fn config(directory: &std::path::Path) -> AppConfig {
        AppConfig {
            data_dir: directory.to_owned(),
            db_filename: "历史 ?#% source.db".to_owned(),
            backup_dirname: "must-not-create".to_owned(),
            // Existing ordinary builds use standard SQLite even with this flag set.
            enable_encryption: true,
        }
    }

    async fn fixture(config: &AppConfig) {
        let options = sqlx::sqlite::SqliteConnectOptions::new()
            .filename(config.db_path()).create_if_missing(true)
            .journal_mode(sqlx::sqlite::SqliteJournalMode::Delete);
        let pool = sqlx::sqlite::SqlitePoolOptions::new().max_connections(1)
            .connect_with(options).await.unwrap();
        let db = sea_orm::SqlxSqliteConnector::from_sqlx_sqlite_pool(pool);
        DbConnection::create_tables(&db).await.unwrap();
        db.execute_raw(Statement::from_string(db.get_database_backend(),
            "INSERT INTO workspaces VALUES ('source', 'Historical source', NULL, 9223372036854775807, -9223372036854775808)",
        )).await.unwrap();
        db.close().await.unwrap();
    }

    #[tokio::test]
    async fn readonly_pool_preserves_file_schema_and_tuples_and_blocks_other_sqlite_writers() {
        let directory = tempdir().unwrap();
        let config = config(directory.path());
        fixture(&config).await;
        let before = std::fs::read(config.db_path()).unwrap();
        let source = DbConnection::connect_legacy_readonly(&config).await.unwrap();
        let db = source.database();
        let schema = db.query_all_raw(Statement::from_string(db.get_database_backend(),
            "SELECT type,name,tbl_name,sql FROM sqlite_schema ORDER BY type,name",
        )).await.unwrap();
        let rows = db.query_all_raw(Statement::from_string(db.get_database_backend(),
            "SELECT id,CAST(created_at AS TEXT) AS created_at,CAST(updated_at AS TEXT) AS updated_at FROM workspaces",
        )).await.unwrap();
        assert_eq!(rows[0].try_get::<String>("", "created_at").unwrap(), "9223372036854775807");
        assert_eq!(rows[0].try_get::<String>("", "updated_at").unwrap(), "-9223372036854775808");
        let mut connections = Vec::new();
        for _ in 0..5 {
            let mut connection = db.get_sqlite_connection_pool().acquire().await.unwrap();
            let query_only: i64 = sqlx::query_scalar("PRAGMA query_only").fetch_one(&mut *connection).await.unwrap();
            assert_eq!(query_only, 1);
            assert!(sqlx::query("DELETE FROM workspaces").execute(&mut *connection).await.is_err());
            // Read-only open flags remain a second barrier even if query_only is disabled.
            sqlx::query("PRAGMA query_only=OFF").execute(&mut *connection).await.unwrap();
            assert!(sqlx::query("CREATE TABLE injected (id TEXT)").execute(&mut *connection).await.is_err());
            connections.push(connection);
        }
        drop(connections);
        let mut lock: libc::flock = unsafe { std::mem::zeroed() };
        lock.l_type = libc::F_WRLCK as _;
        lock.l_whence = libc::SEEK_SET as _;
        lock.l_start = 0x40000001;
        lock.l_len = 1;
        use std::os::fd::AsRawFd;
        let writer = std::fs::OpenOptions::new().read(true).write(true).open(config.db_path()).unwrap();
        assert_eq!(unsafe { libc::fcntl(writer.as_raw_fd(), libc::F_SETLK, &lock) }, -1);
        assert_eq!(db.query_all_raw(Statement::from_string(db.get_database_backend(),
            "SELECT type,name,tbl_name,sql FROM sqlite_schema ORDER BY type,name",
        )).await.unwrap().len(), schema.len());
        assert_eq!(std::fs::read(config.db_path()).unwrap(), before);
        assert!(!config.backup_dir().exists());
        for suffix in ["-wal", "-shm", "-journal"] {
            let mut path = config.db_path().into_os_string();
            path.push(suffix);
            assert!(!std::path::Path::new(&path).exists());
        }
    }

    #[tokio::test]
    async fn missing_invalid_encrypted_and_unsafe_sources_never_create_or_repair_files() {
        let directory = tempdir().unwrap();
        let missing_config = config(&directory.path().join("missing-directory"));
        assert!(DbConnection::connect_legacy_readonly(&missing_config).await.is_err());
        assert!(!missing_config.data_dir.exists());
        let config = config(directory.path());
        for bytes in [vec![0_u8; 100], b"not a sqlite database".to_vec()] {
            std::fs::write(config.db_path(), &bytes).unwrap();
            assert!(DbConnection::connect_legacy_readonly(&config).await.is_err());
            assert_eq!(std::fs::read(config.db_path()).unwrap(), bytes);
            assert!(!config.backup_dir().exists());
        }
        std::fs::remove_file(config.db_path()).unwrap();
        fixture(&config).await;
        let before = std::fs::read(config.db_path()).unwrap();
        {
            use std::os::fd::AsRawFd;
            let writer = std::fs::OpenOptions::new().read(true).write(true).open(config.db_path()).unwrap();
            let mut lock: libc::flock = unsafe { std::mem::zeroed() };
            lock.l_type = libc::F_WRLCK as _;
            lock.l_whence = libc::SEEK_SET as _;
            lock.l_start = 0x40000001;
            lock.l_len = 1;
            assert_eq!(unsafe { libc::fcntl(writer.as_raw_fd(), libc::F_SETLK, &lock) }, 0);
            assert!(DbConnection::connect_legacy_readonly(&config).await.is_err());
            assert_eq!(std::fs::read(config.db_path()).unwrap(), before);
        }
        for suffix in ["-wal", "-shm", "-journal"] {
            let mut path = config.db_path().into_os_string();
            path.push(suffix);
            std::fs::write(&path, b"synthetic unsafe sidecar").unwrap();
            assert!(DbConnection::connect_legacy_readonly(&config).await.is_err());
            assert_eq!(std::fs::read(config.db_path()).unwrap(), before);
            assert_eq!(std::fs::read(&path).unwrap(), b"synthetic unsafe sidecar");
            std::fs::remove_file(path).unwrap();
        }
        let mut wal_header = before.clone();
        wal_header[18] = 2;
        wal_header[19] = 2;
        std::fs::write(config.db_path(), &wal_header).unwrap();
        assert!(DbConnection::connect_legacy_readonly(&config).await.is_err());
        assert_eq!(std::fs::read(config.db_path()).unwrap(), wal_header);
    }
}
