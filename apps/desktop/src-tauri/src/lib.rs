//! Grain Desktop 应用
//!
//! 基于 Tauri 2.x 的桌面应用后端
//!
//! 薄层设计：所有业务逻辑委托给 rust_core，
//! 本模块仅负责 Tauri 集成和应用初始化

pub mod commands;

// 保留本地模块用于 Tauri 特定功能（如果需要）
// 大部分功能已迁移到 rust_core

use rust_core::db::connection::DbConnection;
use rust_core::AppConfig;
use tauri::Manager;
use tracing::{error, info};
use tracing_subscriber::{fmt, prelude::*, EnvFilter};

/// 初始化日志系统
fn init_logging() {
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

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    // 初始化日志
    init_logging();

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
            commands::select_directory,
            commands::save_file,
            commands::get_downloads_dir,
            commands::get_home_dir,
            commands::ensure_directory_and_save,
            // 工作区命令
            commands::get_workspaces,
            commands::get_workspace,
            commands::create_workspace,
            commands::update_workspace,
            commands::delete_workspace,
            // 节点命令
            commands::get_nodes_by_workspace,
            commands::get_node,
            commands::get_child_nodes,
            commands::get_root_nodes,
            commands::get_nodes_by_parent,
            commands::get_nodes_by_type,
            commands::get_descendants,
            commands::get_next_sort_order,
            commands::create_node,
            commands::update_node,
            commands::move_node,
            commands::delete_node,
            commands::delete_nodes_batch,
            commands::reorder_nodes,
            commands::duplicate_node,
            // 内容命令
            commands::get_content,
            commands::save_content,
            commands::get_content_version,
            // 备份命令
            commands::create_backup,
            commands::restore_backup,
            commands::list_backups,
            commands::delete_backup,
            commands::cleanup_old_backups,
            // 标签命令
            commands::get_tags_by_workspace,
            commands::get_tag,
            commands::get_tag_by_name,
            commands::get_top_tags,
            commands::create_tag,
            commands::update_tag,
            commands::get_or_create_tag,
            commands::increment_tag_count,
            commands::decrement_tag_count,
            commands::delete_tag,
            commands::delete_tags_by_workspace,
            // 用户命令
            commands::get_users,
            commands::get_user,
            commands::get_user_by_username,
            commands::get_user_by_email,
            commands::get_current_user,
            commands::create_user,
            commands::update_user,
            commands::update_user_last_login,
            commands::delete_user,
            // 附件命令
            commands::get_attachments_by_project,
            commands::get_attachment,
            commands::get_attachments_by_type,
            commands::get_attachment_by_path,
            commands::create_attachment,
            commands::update_attachment,
            commands::delete_attachment,
            commands::delete_attachments_by_project,
        ])
        .run(tauri::generate_context!())
        .expect("启动 Tauri 应用失败");
}
