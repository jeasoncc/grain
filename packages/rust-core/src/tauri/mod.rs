//! Tauri 应用模块
//!
//! 提供 Tauri 桌面应用的完整实现，供 desktop 调用。
//!
//! ## 设计说明
//!
//! 由于 `tauri::generate_context!()` 宏需要读取 `tauri.conf.json` 文件，
//! 该宏必须在 desktop 应用中调用。因此 rust-core 提供：
//! - `create_builder()` - 创建配置好的 Tauri Builder
//! - 所有 Tauri commands 的实现

mod commands;

pub use commands::*;

use crate::db::connection::DbConnection;
use crate::AppConfig;
use tauri::Manager;
use tracing::{error, info};
use tracing_subscriber::{fmt, prelude::*, EnvFilter};

/// 初始化日志系统
pub fn init_logging() {
    let filter = EnvFilter::try_from_default_env()
        .unwrap_or_else(|_| EnvFilter::new("info,grain=debug,sea_orm=warn"));

    tracing_subscriber::registry()
        .with(filter)
        .with(fmt::layer().with_target(true).with_thread_ids(false))
        .init();

    info!("日志系统初始化完成");
}

/// 初始化数据库
async fn init_database(config: &AppConfig) -> Result<sea_orm::DatabaseConnection, String> {
    let db = DbConnection::connect(config)
        .await
        .map_err(|e| format!("数据库连接失败: {}", e))?;

    info!("数据库初始化完成");
    Ok(db)
}

/// 创建配置好的 Tauri Builder
///
/// 返回一个已配置所有插件和命令的 Builder，调用者只需提供 context 并运行。
///
/// ## 示例
///
/// ```rust,ignore
/// fn main() {
///     rust_core::tauri::init_logging();
///     rust_core::tauri::create_builder()
///         .run(tauri::generate_context!())
///         .expect("启动 Tauri 应用失败");
/// }
/// ```
pub fn create_builder() -> tauri::Builder<tauri::Wry> {
    info!("启动 Grain Desktop 应用...");

    // 创建应用配置
    let config = AppConfig::default();
    info!("数据目录: {:?}", config.data_dir);

    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_process::init())
        .setup(move |app| {
            let config_clone = config.clone();

            let db = tauri::async_runtime::block_on(async { init_database(&config_clone).await });

            match db {
                Ok(db) => {
                    app.manage(db);
                    app.manage(config_clone);
                    info!("应用初始化完成");
                }
                Err(e) => {
                    error!("应用初始化失败: {}", e);
                    #[cfg(debug_assertions)]
                    panic!("数据库初始化失败: {}", e);
                }
            }

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            // 文件系统命令
            select_directory,
            save_file,
            get_downloads_dir,
            get_home_dir,
            ensure_directory_and_save,
            // 工作区命令
            get_workspaces,
            get_workspace,
            create_workspace,
            update_workspace,
            delete_workspace,
            // 节点命令
            get_nodes_by_workspace,
            get_node,
            get_child_nodes,
            get_root_nodes,
            get_nodes_by_parent,
            get_nodes_by_type,
            get_descendants,
            get_next_sort_order,
            create_node,
            update_node,
            move_node,
            delete_node,
            delete_nodes_batch,
            reorder_nodes,
            duplicate_node,
            // 内容命令
            get_content,
            save_content,
            get_content_version,
            // 备份命令
            create_backup,
            restore_backup,
            list_backups,
            delete_backup,
            cleanup_old_backups,
            // 清除数据命令
            clear_sqlite_data,
            clear_sqlite_data_keep_users,
            // 标签命令
            get_tags_by_workspace,
            get_tag,
            get_tag_by_name,
            get_top_tags,
            create_tag,
            update_tag,
            get_or_create_tag,
            increment_tag_count,
            decrement_tag_count,
            delete_tag,
            delete_tags_by_workspace,
            search_tags,
            get_nodes_by_tag,
            get_tag_graph_data,
            sync_tag_cache,
            rebuild_tag_cache,
            recalculate_tag_counts,
            // 用户命令
            get_users,
            get_user,
            get_user_by_username,
            get_user_by_email,
            get_current_user,
            create_user,
            update_user,
            update_user_last_login,
            delete_user,
            // 附件命令
            get_attachments,
            get_attachments_by_project,
            get_attachment,
            get_attachments_by_type,
            get_images_by_project,
            get_audio_files_by_project,
            get_attachment_by_path,
            create_attachment,
            update_attachment,
            delete_attachment,
            delete_attachments_by_project,
            // 日志命令
            init_log_database,
            check_log_database_exists,
            save_log_entry,
            save_logs_batch,
            query_logs,
            get_log_stats,
            clear_old_logs,
            clear_all_logs,
            check_needs_migration,
            mark_migration_complete,
        ])
}
