//! Immutable process authority for the desktop IPC boundary.

use crate::types::config::DesktopMode;
use tauri::State;

impl DesktopMode {
    /// Fail closed: newly registered commands are not silently granted Org authority.
    pub(super) fn authorize_command(self, command: &str) -> Result<(), String> {
        if (self.is_legacy() && matches!(command, "list_legacy_workspaces" | "get_legacy_migration_snapshot"))
            || matches!(
                command,
                "get_desktop_mode"
                    | "create_org_detached_window"
                    | "post_org_window_intent"
                    | "post_org_window_projection"
                    | "close_org_detached_window"
                    | "set_org_main_window_visible"
                    | "focus_org_detached_window"
                    | "select_directory"
                    | "get_downloads_dir"
                    | "get_home_dir"
                    | "open_default_org_workspace"
                    | "reopen_default_org_workspace"
                    | "select_org_workspace"
                    | "collate_org_match_strings"
                    | "capture_org_match_clock_context"
                    | "watch_org_workspace"
                    | "unwatch_org_workspace"
                    | "release_org_workspace"
                    | "scan_org_workspace"
                    | "read_org_document"
                    | "read_org_migration_recovery_bundle"
                    | "write_org_document"
                    | "write_org_migration"
                    | "verify_org_migration"
                    | "create_org_directory"
                    | "move_org_document"
                    | "delete_org_document"
                    | "save_org_export"
                    | "get_org_execution_enabled"
                    | "set_org_execution_enabled"
                    | "execute_org_external"
                    | "read_org_execution_output"
                    | "release_org_execution_output"
                    | "replace_org_derived_index"
                    | "clear_org_derived_index"
                    | "get_org_derived_index_stats"
                    | "init_log_database"
                    | "check_log_database_exists"
                    | "save_log_entry"
                    | "save_logs_batch"
                    | "query_logs"
                    | "get_log_stats"
                    | "clear_old_logs"
                    | "clear_all_logs"
                    | "check_needs_migration"
                    | "mark_migration_complete"
            )
        {
            Ok(())
        } else {
            Err(format!("Command {command} is not authorized in this desktop process"))
        }
    }
}

#[tauri::command]
pub fn get_desktop_mode(mode: State<'_, DesktopMode>) -> DesktopMode {
    *mode
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn org_authority_rejects_ambient_and_historical_writes_and_unknown_commands() {
        for command in [
            "save_file", "ensure_directory_and_save", "save_content", "create_workspace",
            "update_workspace", "delete_workspace", "create_node", "update_node", "move_node",
            "delete_node", "delete_nodes_batch", "reorder_nodes", "duplicate_node", "create_tag",
            "update_tag", "create_user", "update_user", "create_attachment", "delete_attachment",
            "create_backup", "restore_backup", "delete_backup", "cleanup_old_backups",
            "clear_sqlite_data", "clear_sqlite_data_keep_users",
            "get_all_contents", "get_content", "list_backups", "future_ambient_writer",
        ] {
            assert!(DesktopMode::Org.authorize_command(command).is_err(), "{command}");
            assert!(DesktopMode::Legacy.authorize_command(command).is_err(), "{command}");
        }
    }

    #[test]
    fn org_authority_retains_capability_writes_recovery_index_and_shared_services() {
        for command in [
            "get_desktop_mode", "select_directory", "write_org_document", "scan_org_workspace", "save_org_export",
            "write_org_migration", "read_org_migration_recovery_bundle", "verify_org_migration",
            "replace_org_derived_index", "clear_org_derived_index", "save_log_entry", "query_logs",
        ] {
            assert!(DesktopMode::Org.authorize_command(command).is_ok(), "{command}");
        }
    }

    #[test]
    fn authorization_errors_cannot_elevate_captured_startup_authority() {
        let mode = DesktopMode::from_opt_in(None);
        assert!(mode.authorize_command("save_file").is_err());
        let _different_launch = DesktopMode::from_opt_in(Some("1"));
        assert_eq!(mode, DesktopMode::Org);
        assert!(mode.authorize_command("save_content").is_err());
    }
}
