//! Grain Desktop 应用
//!
//! 基于 Tauri 2.x 的桌面应用后端

pub mod commands;
pub mod db;
pub mod r#fn;
pub mod types;

use db::DbConnection;
use tauri::Manager;
use tracing::{error, info};
use tracing_subscriber::{fmt, prelude::*, EnvFilter};
use types::config::AppConfig;

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
    // 连接数据库并创建表
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

            // 使用 tauri::async_runtime 运行异步初始化
            let db = tauri::async_runtime::block_on(async {
                init_database(&config_clone).await
            });

            match db {
                Ok(db) => {
                    // 注入数据库连接和配置到 State
                    app.manage(db);
                    app.manage(config_clone);
                    info!("应用初始化完成");
                }
                Err(e) => {
                    error!("应用初始化失败: {}", e);
                    // 在开发环境下 panic，生产环境可以考虑显示错误对话框
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
        ])
        .run(tauri::generate_context!())
        .expect("启动 Tauri 应用失败");
}
