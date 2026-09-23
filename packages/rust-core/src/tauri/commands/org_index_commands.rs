//! Capability-authorized storage for disposable, derived Org indexes.

use super::OrgWorkspaceRegistry;
use crate::org_filesystem::{
    org_mutation_generation, scan_org_workspace_with_capability, validate_relative_org_path,
};
use sea_orm::{
    ConnectionTrait, DatabaseConnection, DatabaseTransaction, QueryResult, Statement,
    TransactionTrait,
};
use serde::{Deserialize, Serialize};
use std::collections::HashSet;
use std::path::Path;
use tauri::State;

const MAX_LINE: i64 = 10_000_000;
const MAX_COLUMN: i64 = 1_000_000;
const MAX_HEADING_LEVEL: i64 = 1_000;
const LINK_TARGET_KINDS: &[&str] = &["file", "id", "custom-id"];
const AGENDA_KINDS: &[&str] = &["deadline", "scheduled", "timestamp"];

#[derive(Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct OrgIndexDocumentInput {
    pub relative_path: String,
    pub revision: String,
    pub title: Option<String>,
}

#[derive(Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct OrgIndexHeadingInput {
    pub relative_path: String,
    pub line: i64,
    pub level: i64,
    pub title: String,
    pub todo_keyword: Option<String>,
    pub org_id: Option<String>,
    pub custom_id: Option<String>,
}

#[derive(Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct OrgIndexLinkInput {
    pub source_relative_path: String,
    pub line: i64,
    pub column: i64,
    pub target_kind: String,
    pub target_relative_path: Option<String>,
    pub target_value: Option<String>,
    pub label: String,
}

#[derive(Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct OrgIndexAgendaInput {
    pub relative_path: String,
    pub line: i64,
    pub column: i64,
    pub kind: String,
    pub date: String,
    pub heading: Option<String>,
    pub todo_keyword: Option<String>,
}

#[derive(Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct OrgDerivedIndexInput {
    pub documents: Vec<OrgIndexDocumentInput>,
    pub headings: Vec<OrgIndexHeadingInput>,
    pub links: Vec<OrgIndexLinkInput>,
    pub agenda: Vec<OrgIndexAgendaInput>,
}

#[derive(Debug, Serialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct OrgDerivedIndexStats {
    pub document_count: u64,
    pub heading_count: u64,
    pub link_count: u64,
    pub agenda_count: u64,
}

fn validate_bounded(name: &str, value: i64, maximum: i64) -> Result<(), String> {
    if !(0..=maximum).contains(&value) {
        return Err(format!(
            "{name} must be between 0 and {maximum}, received {value}"
        ));
    }
    Ok(())
}

fn validate_index_path(path: &str) -> Result<(), String> {
    validate_relative_org_path(Path::new(path))
        .map(|_| ())
        .map_err(|error| error.to_string())
}

fn validate_source_line(name: &str, value: i64) -> Result<(), String> {
    if value == 0 {
        return Err(format!("{name} must be one-based"));
    }
    validate_bounded(name, value, MAX_LINE)
}

fn validate_payload(payload: &OrgDerivedIndexInput) -> Result<(), String> {
    let mut documents = HashSet::new();
    for document in &payload.documents {
        validate_index_path(&document.relative_path)?;
        if document.revision.len() != 64
            || !document
                .revision
                .bytes()
                .all(|byte| byte.is_ascii_hexdigit())
        {
            return Err("document revision must be a 64-character SHA-256 hex value".to_owned());
        }
        if !documents.insert(document.relative_path.as_str()) {
            return Err(format!(
                "duplicate indexed document: {}",
                document.relative_path
            ));
        }
    }
    for heading in &payload.headings {
        validate_index_path(&heading.relative_path)?;
        if !documents.contains(heading.relative_path.as_str()) {
            return Err(format!(
                "heading references an unindexed document: {}",
                heading.relative_path
            ));
        }
        if heading
            .org_id
            .as_deref()
            .is_some_and(|value| value.trim().is_empty())
            || heading
                .custom_id
                .as_deref()
                .is_some_and(|value| value.trim().is_empty())
        {
            return Err("heading IDs must not be blank".to_owned());
        }
        validate_source_line("heading line", heading.line)?;
        if heading.level == 0 {
            return Err("heading level must be at least one".to_owned());
        }
        validate_bounded("heading level", heading.level, MAX_HEADING_LEVEL)?;
    }
    for link in &payload.links {
        validate_index_path(&link.source_relative_path)?;
        if !documents.contains(link.source_relative_path.as_str()) {
            return Err(format!(
                "link references an unindexed source document: {}",
                link.source_relative_path
            ));
        }
        if let Some(target_path) = link.target_relative_path.as_deref() {
            validate_index_path(target_path)?;
        }
        validate_source_line("link line", link.line)?;
        validate_bounded("link column", link.column, MAX_COLUMN)?;
        if !LINK_TARGET_KINDS.contains(&link.target_kind.as_str()) {
            return Err(format!(
                "targetKind must be one of {}, received {:?}",
                LINK_TARGET_KINDS.join(", "),
                link.target_kind
            ));
        }
        let has_value = link
            .target_value
            .as_deref()
            .is_some_and(|value| !value.is_empty());
        match link.target_kind.as_str() {
            "file" if link.target_relative_path.is_none() => {
                return Err("file links require targetRelativePath".to_owned());
            }
            "id" if link.target_relative_path.is_some() || !has_value => {
                return Err("id links require a value and no targetRelativePath".to_owned());
            }
            "custom-id" if link.target_relative_path.is_none() || !has_value => {
                return Err("custom-id links require a path and value".to_owned());
            }
            _ => {}
        }
    }
    for agenda in &payload.agenda {
        validate_index_path(&agenda.relative_path)?;
        if !documents.contains(agenda.relative_path.as_str()) {
            return Err(format!(
                "agenda entry references an unindexed document: {}",
                agenda.relative_path
            ));
        }
        validate_source_line("agenda line", agenda.line)?;
        validate_bounded("agenda column", agenda.column, MAX_COLUMN)?;
        if chrono::NaiveDate::parse_from_str(&agenda.date, "%Y-%m-%d").is_err() {
            return Err(format!("invalid agenda date: {}", agenda.date));
        }
        if !AGENDA_KINDS.contains(&agenda.kind.as_str()) {
            return Err(format!(
                "agenda kind must be one of {}, received {:?}",
                AGENDA_KINDS.join(", "),
                agenda.kind
            ));
        }
    }
    Ok(())
}

fn verify_workspace_snapshot(
    capability: &cap_std::fs::Dir,
    expected_documents: &[(String, String)],
) -> Result<(), String> {
    let snapshot =
        scan_org_workspace_with_capability(capability).map_err(|error| error.to_string())?;
    if snapshot.documents.len() != expected_documents.len() {
        return Err(format!(
            "Org workspace changed during index rebuild: expected {} documents, found {}",
            expected_documents.len(),
            snapshot.documents.len()
        ));
    }
    let actual: std::collections::HashMap<_, _> = snapshot
        .documents
        .into_iter()
        .map(|document| (document.relative_path, document.revision))
        .collect();
    for (path, revision) in expected_documents {
        if actual.get(path) != Some(revision) {
            return Err(format!(
                "Org workspace changed during index rebuild: revision mismatch for {path}"
            ));
        }
    }
    Ok(())
}

async fn delete_workspace_rows(
    transaction: &DatabaseTransaction,
    workspace_root: &str,
) -> Result<(), sea_orm::DbErr> {
    for table in [
        "org_index_documents",
        "org_index_headings",
        "org_index_links",
        "org_index_agenda",
    ] {
        transaction
            .execute(Statement::from_sql_and_values(
                transaction.get_database_backend(),
                format!("DELETE FROM {table} WHERE workspace_root = ?"),
                [workspace_root.into()],
            ))
            .await?;
    }
    Ok(())
}

async fn insert_payload(
    transaction: &DatabaseTransaction,
    workspace_root: &str,
    payload: OrgDerivedIndexInput,
) -> Result<(), sea_orm::DbErr> {
    let backend = transaction.get_database_backend();
    for document in payload.documents {
        transaction
            .execute(Statement::from_sql_and_values(
                backend,
                "INSERT INTO org_index_documents (workspace_root, relative_path, revision, title) VALUES (?, ?, ?, ?)",
                vec![
                    workspace_root.into(),
                    document.relative_path.into(),
                    document.revision.into(),
                    document.title.into(),
                ],
            ))
            .await?;
    }
    for heading in payload.headings {
        transaction
            .execute(Statement::from_sql_and_values(
                backend,
                "INSERT INTO org_index_headings (workspace_root, relative_path, line, level, title, todo_keyword, org_id, custom_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
                vec![
                    workspace_root.into(),
                    heading.relative_path.into(),
                    heading.line.into(),
                    heading.level.into(),
                    heading.title.into(),
                    heading.todo_keyword.into(),
                    heading.org_id.into(),
                    heading.custom_id.into(),
                ],
            ))
            .await?;
    }
    for link in payload.links {
        transaction
            .execute(Statement::from_sql_and_values(
                backend,
                "INSERT INTO org_index_links (workspace_root, source_relative_path, line, column, target_kind, target_relative_path, target_value, label) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
                vec![
                    workspace_root.into(),
                    link.source_relative_path.into(),
                    link.line.into(),
                    link.column.into(),
                    link.target_kind.into(),
                    link.target_relative_path.into(),
                    link.target_value.into(),
                    link.label.into(),
                ],
            ))
            .await?;
    }
    for agenda in payload.agenda {
        transaction
            .execute(Statement::from_sql_and_values(
                backend,
                "INSERT INTO org_index_agenda (workspace_root, relative_path, line, column, kind, date, heading, todo_keyword) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
                vec![
                    workspace_root.into(),
                    agenda.relative_path.into(),
                    agenda.line.into(),
                    agenda.column.into(),
                    agenda.kind.into(),
                    agenda.date.into(),
                    agenda.heading.into(),
                    agenda.todo_keyword.into(),
                ],
            ))
            .await?;
    }
    Ok(())
}

/// Atomically replaces every derived-index row for one currently approved workspace.
#[tauri::command]
pub async fn replace_org_derived_index(
    db: State<'_, DatabaseConnection>,
    registry: State<'_, OrgWorkspaceRegistry>,
    workspace_root: String,
    payload: OrgDerivedIndexInput,
) -> Result<OrgDerivedIndexStats, String> {
    let workspace_capability = registry.require_approved(Path::new(&workspace_root))?;
    let mutation_generation = org_mutation_generation();
    if mutation_generation % 2 != 0 {
        return Err("Org workspace mutation is in progress; retry index rebuild".to_owned());
    }
    validate_payload(&payload)?;
    let stats = OrgDerivedIndexStats {
        document_count: payload.documents.len() as u64,
        heading_count: payload.headings.len() as u64,
        link_count: payload.links.len() as u64,
        agenda_count: payload.agenda.len() as u64,
    };
    let expected_documents: Vec<_> = payload
        .documents
        .iter()
        .map(|document| (document.relative_path.clone(), document.revision.clone()))
        .collect();
    verify_workspace_snapshot(&workspace_capability, &expected_documents)?;
    if org_mutation_generation() != mutation_generation {
        return Err("Org workspace changed during index rebuild".to_owned());
    }

    let transaction = db.begin().await.map_err(|error| error.to_string())?;
    if let Err(error) = delete_workspace_rows(&transaction, &workspace_root).await {
        let message = error.to_string();
        transaction
            .rollback()
            .await
            .map_err(|rollback| format!("{message}; rollback failed: {rollback}"))?;
        return Err(message);
    }
    // A duplicate composite primary key fails here. Explicitly finishing the rollback guarantees
    // the previous complete index is visible before this command reports the rejection.
    if let Err(error) = insert_payload(&transaction, &workspace_root, payload).await {
        let message = error.to_string();
        transaction
            .rollback()
            .await
            .map_err(|rollback| format!("{message}; rollback failed: {rollback}"))?;
        return Err(message);
    }
    if let Err(error) = verify_workspace_snapshot(&workspace_capability, &expected_documents) {
        transaction
            .rollback()
            .await
            .map_err(|rollback| format!("{error}; rollback failed: {rollback}"))?;
        return Err(error);
    }
    if org_mutation_generation() != mutation_generation {
        transaction
            .rollback()
            .await
            .map_err(|rollback| format!("Org workspace changed; rollback failed: {rollback}"))?;
        return Err("Org workspace changed during index rebuild".to_owned());
    }
    transaction
        .commit()
        .await
        .map_err(|error| error.to_string())?;
    if let Err(error) = verify_workspace_snapshot(&workspace_capability, &expected_documents) {
        // The committed cache is already known stale. Remove it before reporting failure; Org
        // files remain authoritative and untouched.
        let cleanup = db.begin().await.map_err(|cleanup| cleanup.to_string())?;
        delete_workspace_rows(&cleanup, &workspace_root)
            .await
            .map_err(|cleanup| cleanup.to_string())?;
        cleanup
            .commit()
            .await
            .map_err(|cleanup| cleanup.to_string())?;
        return Err(error);
    }
    if org_mutation_generation() != mutation_generation {
        let cleanup = db.begin().await.map_err(|cleanup| cleanup.to_string())?;
        delete_workspace_rows(&cleanup, &workspace_root)
            .await
            .map_err(|cleanup| cleanup.to_string())?;
        cleanup
            .commit()
            .await
            .map_err(|cleanup| cleanup.to_string())?;
        return Err("Org workspace changed while committing derived index".to_owned());
    }
    Ok(stats)
}

/// Clears only the derived rows belonging to one currently approved workspace.
#[tauri::command]
pub async fn clear_org_derived_index(
    db: State<'_, DatabaseConnection>,
    registry: State<'_, OrgWorkspaceRegistry>,
    workspace_root: String,
) -> Result<OrgDerivedIndexStats, String> {
    let _workspace_capability = registry.require_approved(Path::new(&workspace_root))?;
    let transaction = db.begin().await.map_err(|error| error.to_string())?;
    if let Err(error) = delete_workspace_rows(&transaction, &workspace_root).await {
        let message = error.to_string();
        transaction
            .rollback()
            .await
            .map_err(|rollback| format!("{message}; rollback failed: {rollback}"))?;
        return Err(message);
    }
    transaction
        .commit()
        .await
        .map_err(|error| error.to_string())?;
    Ok(OrgDerivedIndexStats {
        document_count: 0,
        heading_count: 0,
        link_count: 0,
        agenda_count: 0,
    })
}

async fn count_rows(
    transaction: &DatabaseTransaction,
    table: &str,
    workspace_root: &str,
) -> Result<u64, String> {
    let row: QueryResult = transaction
        .query_one(Statement::from_sql_and_values(
            transaction.get_database_backend(),
            format!("SELECT COUNT(*) AS row_count FROM {table} WHERE workspace_root = ?"),
            [workspace_root.into()],
        ))
        .await
        .map_err(|error| error.to_string())?
        .ok_or_else(|| format!("Count query returned no row for {table}"))?;
    let count: i64 = row
        .try_get("", "row_count")
        .map_err(|error| error.to_string())?;
    u64::try_from(count).map_err(|_| format!("Invalid negative row count for {table}"))
}

/// Returns per-table row counts for one currently approved workspace.
#[tauri::command]
pub async fn get_org_derived_index_stats(
    db: State<'_, DatabaseConnection>,
    registry: State<'_, OrgWorkspaceRegistry>,
    workspace_root: String,
) -> Result<OrgDerivedIndexStats, String> {
    let _workspace_capability = registry.require_approved(Path::new(&workspace_root))?;
    let transaction = db.begin().await.map_err(|error| error.to_string())?;
    let stats = OrgDerivedIndexStats {
        document_count: count_rows(&transaction, "org_index_documents", &workspace_root).await?,
        heading_count: count_rows(&transaction, "org_index_headings", &workspace_root).await?,
        link_count: count_rows(&transaction, "org_index_links", &workspace_root).await?,
        agenda_count: count_rows(&transaction, "org_index_agenda", &workspace_root).await?,
    };
    transaction
        .commit()
        .await
        .map_err(|error| error.to_string())?;
    Ok(stats)
}

#[cfg(test)]
mod tests {
    use super::*;

    fn empty_payload() -> OrgDerivedIndexInput {
        OrgDerivedIndexInput {
            documents: vec![],
            headings: vec![],
            links: vec![],
            agenda: vec![],
        }
    }

    fn payload_with_document(path: &str) -> OrgDerivedIndexInput {
        let mut payload = empty_payload();
        payload.documents.push(OrgIndexDocumentInput {
            relative_path: path.to_owned(),
            revision: "a".repeat(64),
            title: None,
        });
        payload
    }

    #[test]
    fn accepts_valid_coordinates_and_target_kinds() {
        let mut payload = payload_with_document("notes/today.org");
        payload.headings.push(OrgIndexHeadingInput {
            relative_path: "notes/today.org".to_owned(),
            line: 1,
            level: 2,
            title: "Work".to_owned(),
            todo_keyword: Some("TODO".to_owned()),
            org_id: None,
            custom_id: None,
        });
        for target_kind in LINK_TARGET_KINDS {
            payload.links.push(OrgIndexLinkInput {
                source_relative_path: "notes/today.org".to_owned(),
                line: 2,
                column: 0,
                target_kind: (*target_kind).to_owned(),
                target_relative_path: (*target_kind != "id").then(|| "notes/target.org".to_owned()),
                target_value: (*target_kind != "file").then(|| "target-id".to_owned()),
                label: "target".to_owned(),
            });
        }
        payload.agenda.push(OrgIndexAgendaInput {
            relative_path: "notes/today.org".to_owned(),
            line: 3,
            column: 4,
            kind: "scheduled".to_owned(),
            date: "2026-01-02".to_owned(),
            heading: Some("Work".to_owned()),
            todo_keyword: None,
        });

        assert_eq!(validate_payload(&payload), Ok(()));
    }

    #[test]
    fn rejects_negative_or_unreasonably_large_coordinates() {
        let mut payload = payload_with_document("a.org");
        payload.headings.push(OrgIndexHeadingInput {
            relative_path: "a.org".to_owned(),
            line: -1,
            level: 1,
            title: "Bad".to_owned(),
            todo_keyword: None,
            org_id: None,
            custom_id: None,
        });
        assert!(validate_payload(&payload)
            .unwrap_err()
            .contains("heading line"));

        payload.headings[0].line = 1;
        payload.headings[0].level = MAX_HEADING_LEVEL + 1;
        assert!(validate_payload(&payload)
            .unwrap_err()
            .contains("heading level"));
    }

    #[test]
    fn rejects_unknown_link_target_kind() {
        let mut payload = payload_with_document("a.org");
        payload.links.push(OrgIndexLinkInput {
            source_relative_path: "a.org".to_owned(),
            line: 1,
            column: 0,
            target_kind: "https".to_owned(),
            target_relative_path: None,
            target_value: Some("example.com".to_owned()),
            label: "Example".to_owned(),
        });

        assert!(validate_payload(&payload)
            .unwrap_err()
            .contains("targetKind"));
    }
}
