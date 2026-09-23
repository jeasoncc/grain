//! Read-only legacy migration snapshot command.

use crate::types::content::{content_entity as content, ContentEntity as Content};
use crate::types::node::{node_entity as node, NodeEntity as Node};
use crate::types::workspace::WorkspaceEntity as Workspace;
use crate::NodeResponse;
use sea_orm::{
    ColumnTrait, DatabaseConnection, DbErr, EntityTrait, QueryFilter, QueryOrder, TransactionTrait,
};
use serde::Serialize;
use tauri::State;

/// A consistent view of all legacy records needed to plan one workspace migration.
#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct LegacyMigrationContentSnapshot {
    pub id: String,
    pub node_id: String,
    pub content: String,
    pub version: String,
    pub created_at: String,
    pub updated_at: String,
}

impl From<content::Model> for LegacyMigrationContentSnapshot {
    fn from(model: content::Model) -> Self {
        Self {
            id: model.id,
            node_id: model.node_id,
            content: model.content,
            version: model.version.to_string(),
            created_at: model.created_at.to_string(),
            updated_at: model.updated_at.to_string(),
        }
    }
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct LegacyMigrationSnapshot {
    /// Workspace title captured in the same transaction as its rows.
    pub workspace_title: String,
    /// Nodes belonging to the workspace selected for migration.
    pub workspace_nodes: Vec<NodeResponse>,
    /// Every node, used to distinguish orphaned content from content in another workspace.
    pub all_nodes: Vec<NodeResponse>,
    /// Every legacy content row, including orphaned rows that must be preserved.
    pub all_contents: Vec<LegacyMigrationContentSnapshot>,
}

async fn load_legacy_migration_snapshot(
    db: &DatabaseConnection,
    workspace_id: &str,
) -> Result<LegacyMigrationSnapshot, DbErr> {
    // Keep all three reads on one database snapshot. This function intentionally performs no
    // writes; committing only closes the read transaction after every query succeeds.
    let transaction = db.begin().await?;

    let workspace = Workspace::find_by_id(workspace_id)
        .one(&transaction)
        .await?
        .ok_or_else(|| DbErr::RecordNotFound(format!("workspace {workspace_id}")))?;
    let workspace_nodes = Node::find()
        .filter(node::Column::WorkspaceId.eq(workspace_id))
        .order_by_asc(node::Column::SortOrder)
        .order_by_asc(node::Column::Id)
        .all(&transaction)
        .await?;
    let all_nodes = Node::find()
        .order_by_asc(node::Column::WorkspaceId)
        .order_by_asc(node::Column::SortOrder)
        .order_by_asc(node::Column::Id)
        .all(&transaction)
        .await?;
    let all_contents = Content::find()
        .order_by_asc(content::Column::NodeId)
        .order_by_asc(content::Column::Id)
        .all(&transaction)
        .await?;

    transaction.commit().await?;

    Ok(LegacyMigrationSnapshot {
        workspace_title: workspace.name,
        workspace_nodes: workspace_nodes
            .into_iter()
            .map(NodeResponse::from)
            .collect(),
        all_nodes: all_nodes.into_iter().map(NodeResponse::from).collect(),
        all_contents: all_contents
            .into_iter()
            .map(LegacyMigrationContentSnapshot::from)
            .collect(),
    })
}

/// Read all legacy migration inputs atomically without modifying SQLite.
#[tauri::command]
pub async fn get_legacy_migration_snapshot(
    db: State<'_, DatabaseConnection>,
    workspace_id: String,
) -> Result<LegacyMigrationSnapshot, String> {
    load_legacy_migration_snapshot(&db, &workspace_id)
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
            "CREATE TABLE contents (id TEXT PRIMARY KEY NOT NULL, node_id TEXT NOT NULL UNIQUE, content TEXT NOT NULL, version INTEGER NOT NULL, created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL)",
        ] {
            db.execute(Statement::from_string(db.get_database_backend(), sql))
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
        db.execute(Statement::from_string(
            db.get_database_backend(),
            "INSERT INTO workspaces (id, name, created_at, updated_at) VALUES ('workspace-a', 'Workspace A', 1, 2)".to_owned(),
        ))
        .await
        .unwrap();
        insert_node(&db, "node-z", "workspace-b", 0).await;
        insert_node(&db, "node-b", "workspace-a", 2).await;
        insert_node(&db, "node-a", "workspace-a", 2).await;
        insert_content(&db, "content-z", "orphan").await;
        insert_content(&db, "content-b", "node-b").await;
        insert_content(&db, "content-a", "node-a").await;
        db.execute(Statement::from_string(
            db.get_database_backend(),
            "UPDATE contents SET version = 2147483647, created_at = 9223372036854775807, updated_at = -9223372036854775808 WHERE id = 'content-a'".to_owned(),
        ))
        .await
        .unwrap();

        let snapshot = load_legacy_migration_snapshot(&db, "workspace-a")
            .await
            .unwrap();

        assert_eq!(
            snapshot
                .workspace_nodes
                .iter()
                .map(|node| node.id.as_str())
                .collect::<Vec<_>>(),
            ["node-a", "node-b"]
        );
        assert_eq!(
            snapshot
                .all_nodes
                .iter()
                .map(|node| node.id.as_str())
                .collect::<Vec<_>>(),
            ["node-a", "node-b", "node-z"]
        );
        assert_eq!(
            snapshot
                .all_contents
                .iter()
                .map(|content| content.node_id.as_str())
                .collect::<Vec<_>>(),
            ["node-a", "node-b", "orphan"]
        );
        assert_eq!(snapshot.all_contents[0].version, "2147483647");
        assert_eq!(snapshot.all_contents[0].created_at, "9223372036854775807");
        assert_eq!(snapshot.all_contents[0].updated_at, "-9223372036854775808");
    }

    #[test]
    fn snapshot_serializes_with_camel_case_response_fields() {
        let snapshot = LegacyMigrationSnapshot {
            workspace_title: "Workspace".to_owned(),
            workspace_nodes: Vec::new(),
            all_nodes: Vec::new(),
            all_contents: Vec::new(),
        };

        assert_eq!(
            serde_json::to_value(snapshot).unwrap(),
            serde_json::json!({ "workspaceTitle": "Workspace", "workspaceNodes": [], "allNodes": [], "allContents": [] })
        );
    }
}
