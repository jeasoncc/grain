//! Read-only legacy migration snapshot command.

use crate::db::connection::LegacyDbConnection;
use crate::org_filesystem::{LegacyRecoveryGraph, LegacyRecoveryNode, LegacyRecoveryWorkspace};
use sea_orm::{DatabaseConnection, DbErr, FromQueryResult, Statement, TransactionTrait};
use serde::Serialize;
use tauri::State;

/// Startup failure stays visible through the same narrow read-only IPC surface.
pub struct LegacyMigrationSource(pub Result<LegacyDbConnection, String>);

impl LegacyMigrationSource {
    fn database(&self) -> Result<&DatabaseConnection, String> {
        self.0.as_ref().map(LegacyDbConnection::database).map_err(Clone::clone)
    }
}

async fn load_legacy_workspaces(db: &DatabaseConnection) -> Result<Vec<LegacyRecoveryWorkspace>, DbErr> {
    LegacyRecoveryWorkspace::find_by_statement(Statement::from_string(
        db.get_database_backend(),
        "SELECT id,name,description,CAST(created_at AS TEXT) AS created_at,CAST(updated_at AS TEXT) AS updated_at FROM workspaces ORDER BY name,id",
    )).all(db).await
}

/// Raw historical metadata, without generic CRUD projections or lossy integer conversion.
#[tauri::command]
pub async fn list_legacy_workspaces(
    source: State<'_, LegacyMigrationSource>,
) -> Result<Vec<LegacyRecoveryWorkspace>, String> {
    load_legacy_workspaces(source.database()?).await.map_err(|error| error.to_string())
}

/// A consistent view of all legacy records needed to plan one workspace migration.
#[derive(Debug, Clone, Serialize, FromQueryResult)]
#[serde(rename_all = "camelCase")]
pub struct LegacyMigrationContentSnapshot {
    pub id: String,
    pub node_id: String,
    pub content: String,
    pub version: String,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct LegacyMigrationSnapshot {
    pub graph: LegacyRecoveryGraph,
    /// Selected-workspace and truly orphaned rows only; never another workspace's bodies.
    pub contents: Vec<LegacyMigrationContentSnapshot>,
}

async fn load_legacy_migration_snapshot(
    db: &DatabaseConnection,
    workspace_id: &str,
) -> Result<LegacyMigrationSnapshot, DbErr> {
    // Raw SQL avoids the application's i32 sort/version, bool collapsed and enum node projections.
    // Every integer is converted to decimal TEXT by SQLite before crossing the JS IPC boundary.
    let transaction = db.begin().await?;
    let backend = db.get_database_backend();
    let workspace = LegacyRecoveryWorkspace::find_by_statement(Statement::from_sql_and_values(
        backend,
        "SELECT id,name,description,CAST(created_at AS TEXT) AS created_at,CAST(updated_at AS TEXT) AS updated_at FROM workspaces WHERE id = ?",
        [workspace_id.into()],
    ))
    .one(&transaction)
    .await?
    .ok_or_else(|| DbErr::RecordNotFound(format!("workspace {workspace_id}")))?;
    let nodes = LegacyRecoveryNode::find_by_statement(Statement::from_sql_and_values(
        backend,
        "SELECT id,workspace_id,parent_id,title,node_type,CAST(is_collapsed AS TEXT) AS is_collapsed,CAST(sort_order AS TEXT) AS sort_order,tags,CAST(created_at AS TEXT) AS created_at,CAST(updated_at AS TEXT) AS updated_at FROM nodes WHERE workspace_id = ? ORDER BY sort_order,id",
        [workspace_id.into()],
    ))
    .all(&transaction)
    .await?;
    let contents = LegacyMigrationContentSnapshot::find_by_statement(Statement::from_sql_and_values(
        backend,
        "SELECT c.id,c.node_id,c.content,CAST(c.version AS TEXT) AS version,CAST(c.created_at AS TEXT) AS created_at,CAST(c.updated_at AS TEXT) AS updated_at FROM contents c LEFT JOIN nodes n ON n.id=c.node_id WHERE n.workspace_id = ? OR n.id IS NULL ORDER BY c.node_id,c.id",
        [workspace_id.into()],
    ))
    .all(&transaction)
    .await?;
    transaction.commit().await?;
    Ok(LegacyMigrationSnapshot {
        graph: LegacyRecoveryGraph { workspace, nodes },
        contents,
    })
}

/// Read all legacy migration inputs atomically without modifying SQLite.
#[tauri::command]
pub async fn get_legacy_migration_snapshot(
    source: State<'_, LegacyMigrationSource>,
    workspace_id: String,
) -> Result<LegacyMigrationSnapshot, String> {
    load_legacy_migration_snapshot(source.database()?, &workspace_id)
        .await
        .map_err(|error| error.to_string())
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::{ContentActiveModel, NodeActiveModel, NodeType};
    use sea_orm::{ActiveModelTrait, ConnectionTrait, Database, Set, Statement};

    async fn setup_database() -> DatabaseConnection {
        let db = Database::connect("sqlite::memory:").await.unwrap();
        for sql in [
            "CREATE TABLE workspaces (id TEXT PRIMARY KEY NOT NULL, name TEXT NOT NULL, description TEXT, created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL)",
            "CREATE TABLE nodes (id TEXT PRIMARY KEY NOT NULL, workspace_id TEXT NOT NULL, parent_id TEXT, title TEXT NOT NULL, node_type TEXT NOT NULL, is_collapsed INTEGER NOT NULL, sort_order INTEGER NOT NULL, tags TEXT, created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL)",
            "CREATE TABLE contents (id TEXT PRIMARY KEY NOT NULL, node_id TEXT NOT NULL, content TEXT NOT NULL, version INTEGER NOT NULL, created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL)",
        ] {
            db.execute_raw(Statement::from_string(db.get_database_backend(), sql))
                .await
                .unwrap();
        }
        db
    }

    async fn insert_node(db: &DatabaseConnection, id: &str, workspace_id: &str, sort_order: i32) {
        NodeActiveModel {
            id: Set(id.to_owned()),
            workspace_id: Set(workspace_id.to_owned()),
            parent_id: Set(None),
            title: Set(id.to_owned()),
            node_type: Set(NodeType::File),
            is_collapsed: Set(false),
            sort_order: Set(sort_order),
            tags: Set(None),
            created_at: Set(1),
            updated_at: Set(2),
        }
        .insert(db)
        .await
        .unwrap();
    }

    async fn insert_content(db: &DatabaseConnection, id: &str, node_id: &str) {
        ContentActiveModel {
            id: Set(id.to_owned()),
            node_id: Set(node_id.to_owned()),
            content: Set(format!("content-{id}")),
            version: Set(1),
            created_at: Set(1),
            updated_at: Set(2),
        }
        .insert(db)
        .await
        .unwrap();
    }

    #[tokio::test]
    async fn snapshot_is_complete_and_deterministically_ordered() {
        let db = setup_database().await;
        db.execute_raw(Statement::from_string(
            db.get_database_backend(),
            "INSERT INTO workspaces (id, name, description, created_at, updated_at) VALUES ('workspace-a', 'Workspace A', '原始 description', 9223372036854775807, -9223372036854775808)".to_owned(),
        ))
        .await
        .unwrap();
        insert_node(&db, "node-z", "workspace-b", 0).await;
        insert_node(&db, "node-b", "workspace-a", 2).await;
        insert_node(&db, "node-a", "workspace-a", 2).await;
        insert_content(&db, "content-z", "orphan").await;
        insert_content(&db, "content-b", "node-b").await;
        insert_content(&db, "content-a", "node-a").await;
        insert_content(&db, "excluded", "node-z").await;
        insert_content(&db, "duplicate", "node-a").await;
        db.execute_raw(Statement::from_string(
            db.get_database_backend(),
            "UPDATE nodes SET parent_id = 'node-b', node_type = 'unknown-kind', is_collapsed = 9007199254740993, sort_order = 9007199254740993, tags = '[ \"原始\" ]', created_at = 9223372036854775807, updated_at = -9223372036854775808 WHERE id = 'node-a'".to_owned(),
        )).await.unwrap();
        db.execute_raw(Statement::from_string(
            db.get_database_backend(),
            "UPDATE contents SET version = 9007199254740993, created_at = 9223372036854775807, updated_at = -9223372036854775808, content = CAST(X'00e4bda0e5a5bd' AS TEXT) WHERE id = 'content-a'".to_owned(),
        ))
        .await
        .unwrap();

        let snapshot = load_legacy_migration_snapshot(&db, "workspace-a")
            .await
            .unwrap();

        assert_eq!(
            snapshot
                .graph.nodes
                .iter()
                .map(|node| node.id.as_str())
                .collect::<Vec<_>>(),
            ["node-b", "node-a"]
        );
        assert_eq!(
            snapshot
                .contents
                .iter()
                .map(|content| content.node_id.as_str())
                .collect::<Vec<_>>(),
            ["node-a", "node-a", "node-b", "orphan"]
        );
        assert_eq!(snapshot.contents[0].version, "9007199254740993");
        assert_eq!(snapshot.contents[0].created_at, "9223372036854775807");
        assert_eq!(snapshot.contents[0].updated_at, "-9223372036854775808");
        assert_eq!(snapshot.contents[0].content, "\0你好");
        assert_eq!(snapshot.graph.workspace.description.as_deref(), Some("原始 description"));
        assert_eq!(snapshot.graph.workspace.created_at, "9223372036854775807");
        assert_eq!(snapshot.graph.workspace.updated_at, "-9223372036854775808");
        let node = &snapshot.graph.nodes[1];
        assert_eq!(node.parent_id.as_deref(), Some("node-b"));
        assert_eq!(node.node_type, "unknown-kind");
        assert_eq!(node.is_collapsed, "9007199254740993");
        assert_eq!(node.sort_order, "9007199254740993");
        assert_eq!(node.tags.as_deref(), Some("[ \"原始\" ]"));
        assert_eq!(node.created_at, "9223372036854775807");
        assert_eq!(node.updated_at, "-9223372036854775808");
    }

    #[cfg(target_os = "linux")]
    #[tokio::test]
    async fn typed_readonly_source_lists_and_snapshots_without_schema_or_body_writes() {
        use crate::db::connection::DbConnection;
        use crate::types::config::AppConfig;
        let directory = tempfile::tempdir().unwrap();
        let config = AppConfig {
            data_dir: directory.path().to_owned(),
            db_filename: "source.db".to_owned(),
            backup_dirname: "backups".to_owned(),
            enable_encryption: false,
        };
        let writable = DbConnection::connect(&config).await.unwrap();
        writable.execute_raw(Statement::from_string(writable.get_database_backend(),
            "INSERT INTO workspaces VALUES ('selected', 'Same name', NULL, 9223372036854775807, -9223372036854775808), ('other', 'Same name', '', 1, 2)",
        )).await.unwrap();
        insert_node(&writable, "selected-node", "selected", 1).await;
        insert_node(&writable, "other-node", "other", 1).await;
        insert_content(&writable, "selected-body", "selected-node").await;
        insert_content(&writable, "other-body", "other-node").await;
        {
            let mut fixture_connection = writable.get_sqlite_connection_pool().acquire().await.unwrap();
            sea_orm::sqlx::query("PRAGMA foreign_keys=OFF").execute(&mut *fixture_connection).await.unwrap();
            sea_orm::sqlx::query("INSERT INTO contents VALUES ('orphan-body', 'missing-node', 'orphan raw body', 1, 1, 2)")
                .execute(&mut *fixture_connection).await.unwrap();
        }
        writable.close().await.unwrap();
        let original = std::fs::read(config.db_path()).unwrap();
        let source = LegacyMigrationSource(Ok(DbConnection::connect_legacy_readonly(&config).await.unwrap()));
        let db = source.database().unwrap();
        let listed = load_legacy_workspaces(db).await.unwrap();
        assert_eq!(listed.len(), 2);
        let selected = listed.iter().find(|workspace| workspace.id == "selected").unwrap();
        assert_eq!(selected.created_at, "9223372036854775807");
        assert_eq!(selected.updated_at, "-9223372036854775808");
        assert!(selected.description.is_none());
        let snapshot = load_legacy_migration_snapshot(db, &selected.id).await.unwrap();
        assert_eq!(snapshot.graph.workspace.id, "selected");
        assert_eq!(snapshot.graph.nodes.len(), 1);
        assert_eq!(snapshot.contents.iter().map(|row| row.id.as_str()).collect::<Vec<_>>(),
            ["orphan-body", "selected-body"]);
        assert!(load_legacy_migration_snapshot(db, "does-not-exist").await.is_err());
        for sql in ["DELETE FROM contents", "DROP TABLE workspaces", "CREATE TABLE repair (id TEXT)"] {
            assert!(db.execute_raw(Statement::from_string(db.get_database_backend(), sql)).await.is_err());
        }
        assert_eq!(std::fs::read(config.db_path()).unwrap(), original);
    }

    #[test]
    fn startup_source_failure_remains_an_error_not_an_empty_list_or_replacement_database() {
        let source = LegacyMigrationSource(Err("Historical database missing".to_owned()));
        assert!(matches!(source.database(), Err(message) if message == "Historical database missing"));
    }

}
