//! 路由定义
//!
//! 所有 API 路由的统一定义

use sea_orm::DatabaseConnection;
use std::sync::Arc;
use warp::Filter;

use crate::api::{
    clear_data::{ClearAllData, ClearDataKeepUsers},
    content::{GetContent, SaveContent},
    node::{
        CreateNode, DeleteNode, GetChildNodes, GetNextSortOrder, GetNode, GetNodesByWorkspace, GetRootNodes,
        MoveNode, UpdateNode,
    },
    transaction::{CreateNodeWithContent, CreateNodeWithContentRequest, DeleteNodeRecursive},
    workspace::{CreateWorkspace, DeleteWorkspace, GetWorkspace, GetWorkspaces, UpdateWorkspace},
    ApiEndpoint, IdInput, IdWithBodyInput, NextSortOrderInput, NodeIdInput, ParentIdInput, WorkspaceIdInput,
};
use crate::macros::AppRejection;
use crate::{
    AppConfig, CreateNodeRequest, CreateWorkspaceRequest, MoveNodeRequest, SaveContentRequest,
    UpdateNodeRequest, UpdateWorkspaceRequest,
};

// ============================================================================
// 辅助函数
// ============================================================================

/// 注入数据库连接的 Filter
fn with_db(
    db: Arc<DatabaseConnection>,
) -> impl Filter<Extract = (Arc<DatabaseConnection>,), Error = std::convert::Infallible> + Clone {
    warp::any().map(move || db.clone())
}

/// 注入配置的 Filter
fn with_config(
    config: Arc<AppConfig>,
) -> impl Filter<Extract = (Arc<AppConfig>,), Error = std::convert::Infallible> + Clone {
    warp::any().map(move || config.clone())
}

// ============================================================================
// 路由构建
// ============================================================================

/// 构建完整路由树
pub fn build_routes(
    db: Arc<DatabaseConnection>,
    config: Arc<AppConfig>,
) -> impl Filter<Extract = (impl warp::Reply,), Error = warp::Rejection> + Clone {
    // API 路由
    let api = workspace_routes(db.clone())
        .or(node_routes(db.clone()))
        .or(content_routes(db.clone()))
        .or(transaction_routes(db.clone()))
        .or(clear_data_routes(db.clone()))
        .or(backup_routes(config.clone()));

    // 健康检查
    let health = warp::path!("health")
        .and(warp::get())
        .map(|| warp::reply::json(&serde_json::json!({"status": "ok"})));

    // API 信息
    let api_info = warp::path!("api").and(warp::get()).map(|| {
        warp::reply::json(&serde_json::json!({
            "name": "Grain API",
            "version": env!("CARGO_PKG_VERSION"),
            "endpoints": [
                "GET /api/workspaces",
                "GET /api/workspaces/:id",
                "POST /api/workspaces",
                "PUT /api/workspaces/:id",
                "DELETE /api/workspaces/:id",
                "GET /api/workspaces/:workspace_id/nodes",
                "GET /api/workspaces/:workspace_id/nodes/root",
                "GET /api/workspaces/:workspace_id/nodes/next-sort-order",
                "GET /api/nodes/:id",
                "GET /api/nodes/:id/children",
                "POST /api/nodes",
                "PUT /api/nodes/:id",
                "POST /api/nodes/:id/move",
                "DELETE /api/nodes/:id",
                "GET /api/nodes/:node_id/content",
                "POST /api/contents",
                "POST /api/nodes/with-content",
                "DELETE /api/nodes/:id/recursive",
                "GET /api/backups",
                "POST /api/backups",
                "DELETE /api/backups/:filename",
                "DELETE /api/data/clear",
                "GET /health"
            ]
        }))
    });

    // CORS 配置
    let cors = warp::cors()
        .allow_any_origin()
        .allow_methods(vec!["GET", "POST", "PUT", "DELETE", "OPTIONS"])
        .allow_headers(vec!["Content-Type", "Authorization"]);

    // 请求日志
    let log = warp::log("grain_api::request");

    // 组合所有路由
    health
        .or(api_info)
        .or(api)
        .recover(crate::macros::handle_rejection)
        .with(cors)
        .with(log)
}

// ============================================================================
// Workspace 路由
// ============================================================================

fn workspace_routes(
    db: Arc<DatabaseConnection>,
) -> impl Filter<Extract = (impl warp::Reply,), Error = warp::Rejection> + Clone {
    get_workspaces(db.clone())
        .or(get_workspace(db.clone()))
        .or(create_workspace(db.clone()))
        .or(update_workspace(db.clone()))
        .or(delete_workspace(db))
}

fn get_workspaces(
    db: Arc<DatabaseConnection>,
) -> impl Filter<Extract = (impl warp::Reply,), Error = warp::Rejection> + Clone {
    warp::path!("api" / "workspaces")
        .and(warp::get())
        .and(with_db(db))
        .and_then(|db: Arc<DatabaseConnection>| async move {
            GetWorkspaces::execute(&db, ())
                .await
                .map(|r| warp::reply::json(&r))
                .map_err(|e| warp::reject::custom(AppRejection::from(e)))
        })
}

fn get_workspace(
    db: Arc<DatabaseConnection>,
) -> impl Filter<Extract = (impl warp::Reply,), Error = warp::Rejection> + Clone {
    warp::path!("api" / "workspaces" / String)
        .and(warp::get())
        .and(with_db(db))
        .and_then(|id: String, db: Arc<DatabaseConnection>| async move {
            GetWorkspace::execute(&db, IdInput::new(&id))
                .await
                .map(|r| warp::reply::json(&r))
                .map_err(|e| warp::reject::custom(AppRejection::from(e)))
        })
}

fn create_workspace(
    db: Arc<DatabaseConnection>,
) -> impl Filter<Extract = (impl warp::Reply,), Error = warp::Rejection> + Clone {
    warp::path!("api" / "workspaces")
        .and(warp::post())
        .and(warp::body::json())
        .and(with_db(db))
        .and_then(
            |body: CreateWorkspaceRequest, db: Arc<DatabaseConnection>| async move {
                CreateWorkspace::execute(&db, body)
                    .await
                    .map(|r| warp::reply::json(&r))
                    .map_err(|e| warp::reject::custom(AppRejection::from(e)))
            },
        )
}

fn update_workspace(
    db: Arc<DatabaseConnection>,
) -> impl Filter<Extract = (impl warp::Reply,), Error = warp::Rejection> + Clone {
    warp::path!("api" / "workspaces" / String)
        .and(warp::put())
        .and(warp::body::json())
        .and(with_db(db))
        .and_then(
            |id: String, body: UpdateWorkspaceRequest, db: Arc<DatabaseConnection>| async move {
                UpdateWorkspace::execute(&db, IdWithBodyInput::new(&id, body))
                    .await
                    .map(|r| warp::reply::json(&r))
                    .map_err(|e| warp::reject::custom(AppRejection::from(e)))
            },
        )
}

fn delete_workspace(
    db: Arc<DatabaseConnection>,
) -> impl Filter<Extract = (impl warp::Reply,), Error = warp::Rejection> + Clone {
    warp::path!("api" / "workspaces" / String)
        .and(warp::delete())
        .and(with_db(db))
        .and_then(|id: String, db: Arc<DatabaseConnection>| async move {
            DeleteWorkspace::execute(&db, IdInput::new(&id))
                .await
                .map(|_| warp::reply::json(&serde_json::json!({"success": true})))
                .map_err(|e| warp::reject::custom(AppRejection::from(e)))
        })
}

// ============================================================================
// Node 路由
// ============================================================================

fn node_routes(
    db: Arc<DatabaseConnection>,
) -> impl Filter<Extract = (impl warp::Reply,), Error = warp::Rejection> + Clone {
    get_nodes_by_workspace(db.clone())
        .or(get_root_nodes(db.clone()))
        .or(get_next_sort_order(db.clone()))
        .or(get_node(db.clone()))
        .or(get_child_nodes(db.clone()))
        .or(create_node(db.clone()))
        .or(update_node(db.clone()))
        .or(move_node(db.clone()))
        .or(delete_node(db))
}

fn get_nodes_by_workspace(
    db: Arc<DatabaseConnection>,
) -> impl Filter<Extract = (impl warp::Reply,), Error = warp::Rejection> + Clone {
    warp::path!("api" / "workspaces" / String / "nodes")
        .and(warp::get())
        .and(with_db(db))
        .and_then(
            |workspace_id: String, db: Arc<DatabaseConnection>| async move {
                GetNodesByWorkspace::execute(&db, WorkspaceIdInput::new(&workspace_id))
                    .await
                    .map(|r| warp::reply::json(&r))
                    .map_err(|e| warp::reject::custom(AppRejection::from(e)))
            },
        )
}

fn get_root_nodes(
    db: Arc<DatabaseConnection>,
) -> impl Filter<Extract = (impl warp::Reply,), Error = warp::Rejection> + Clone {
    warp::path!("api" / "workspaces" / String / "nodes" / "root")
        .and(warp::get())
        .and(with_db(db))
        .and_then(
            |workspace_id: String, db: Arc<DatabaseConnection>| async move {
                GetRootNodes::execute(&db, WorkspaceIdInput::new(&workspace_id))
                    .await
                    .map(|r| warp::reply::json(&r))
                    .map_err(|e| warp::reject::custom(AppRejection::from(e)))
            },
        )
}

fn get_next_sort_order(
    db: Arc<DatabaseConnection>,
) -> impl Filter<Extract = (impl warp::Reply,), Error = warp::Rejection> + Clone {
    warp::path!("api" / "workspaces" / String / "nodes" / "next-sort-order")
        .and(warp::get())
        .and(warp::query::<std::collections::HashMap<String, String>>())
        .and(with_db(db))
        .and_then(
            |workspace_id: String, query: std::collections::HashMap<String, String>, db: Arc<DatabaseConnection>| async move {
                // 解析 parentId 查询参数，"null" 字符串转为 None
                let parent_id = query.get("parentId").and_then(|v| {
                    if v == "null" || v.is_empty() {
                        None
                    } else {
                        Some(v.clone())
                    }
                });
                
                GetNextSortOrder::execute(&db, NextSortOrderInput::new(&workspace_id, parent_id))
                    .await
                    .map(|r| warp::reply::json(&r))
                    .map_err(|e| warp::reject::custom(AppRejection::from(e)))
            },
        )
}

fn get_node(
    db: Arc<DatabaseConnection>,
) -> impl Filter<Extract = (impl warp::Reply,), Error = warp::Rejection> + Clone {
    warp::path!("api" / "nodes" / String)
        .and(warp::get())
        .and(with_db(db))
        .and_then(|id: String, db: Arc<DatabaseConnection>| async move {
            GetNode::execute(&db, IdInput::new(&id))
                .await
                .map(|r| warp::reply::json(&r))
                .map_err(|e| warp::reject::custom(AppRejection::from(e)))
        })
}

fn get_child_nodes(
    db: Arc<DatabaseConnection>,
) -> impl Filter<Extract = (impl warp::Reply,), Error = warp::Rejection> + Clone {
    warp::path!("api" / "nodes" / String / "children")
        .and(warp::get())
        .and(with_db(db))
        .and_then(|parent_id: String, db: Arc<DatabaseConnection>| async move {
            GetChildNodes::execute(&db, ParentIdInput::new(&parent_id))
                .await
                .map(|r| warp::reply::json(&r))
                .map_err(|e| warp::reject::custom(AppRejection::from(e)))
        })
}

fn create_node(
    db: Arc<DatabaseConnection>,
) -> impl Filter<Extract = (impl warp::Reply,), Error = warp::Rejection> + Clone {
    warp::path!("api" / "nodes")
        .and(warp::post())
        .and(warp::body::json())
        .and(with_db(db))
        .and_then(
            |body: CreateNodeRequest, db: Arc<DatabaseConnection>| async move {
                CreateNode::execute(&db, body)
                    .await
                    .map(|r| warp::reply::json(&r))
                    .map_err(|e| warp::reject::custom(AppRejection::from(e)))
            },
        )
}

fn update_node(
    db: Arc<DatabaseConnection>,
) -> impl Filter<Extract = (impl warp::Reply,), Error = warp::Rejection> + Clone {
    warp::path!("api" / "nodes" / String)
        .and(warp::put())
        .and(warp::body::json())
        .and(with_db(db))
        .and_then(
            |id: String, body: UpdateNodeRequest, db: Arc<DatabaseConnection>| async move {
                UpdateNode::execute(&db, IdWithBodyInput::new(&id, body))
                    .await
                    .map(|r| warp::reply::json(&r))
                    .map_err(|e| warp::reject::custom(AppRejection::from(e)))
            },
        )
}

fn move_node(
    db: Arc<DatabaseConnection>,
) -> impl Filter<Extract = (impl warp::Reply,), Error = warp::Rejection> + Clone {
    warp::path!("api" / "nodes" / String / "move")
        .and(warp::post())
        .and(warp::body::json())
        .and(with_db(db))
        .and_then(
            |id: String, body: MoveNodeRequest, db: Arc<DatabaseConnection>| async move {
                MoveNode::execute(&db, IdWithBodyInput::new(&id, body))
                    .await
                    .map(|r| warp::reply::json(&r))
                    .map_err(|e| warp::reject::custom(AppRejection::from(e)))
            },
        )
}

fn delete_node(
    db: Arc<DatabaseConnection>,
) -> impl Filter<Extract = (impl warp::Reply,), Error = warp::Rejection> + Clone {
    warp::path!("api" / "nodes" / String)
        .and(warp::delete())
        .and(with_db(db))
        .and_then(|id: String, db: Arc<DatabaseConnection>| async move {
            DeleteNode::execute(&db, IdInput::new(&id))
                .await
                .map(|_| warp::reply::json(&serde_json::json!({"success": true})))
                .map_err(|e| warp::reject::custom(AppRejection::from(e)))
        })
}

// ============================================================================
// Content 路由
// ============================================================================

fn content_routes(
    db: Arc<DatabaseConnection>,
) -> impl Filter<Extract = (impl warp::Reply,), Error = warp::Rejection> + Clone {
    get_content(db.clone()).or(save_content(db))
}

fn get_content(
    db: Arc<DatabaseConnection>,
) -> impl Filter<Extract = (impl warp::Reply,), Error = warp::Rejection> + Clone {
    warp::path!("api" / "nodes" / String / "content")
        .and(warp::get())
        .and(with_db(db))
        .and_then(|node_id: String, db: Arc<DatabaseConnection>| async move {
            GetContent::execute(&db, NodeIdInput::new(&node_id))
                .await
                .map(|r| warp::reply::json(&r))
                .map_err(|e| warp::reject::custom(AppRejection::from(e)))
        })
}

fn save_content(
    db: Arc<DatabaseConnection>,
) -> impl Filter<Extract = (impl warp::Reply,), Error = warp::Rejection> + Clone {
    warp::path!("api" / "contents")
        .and(warp::post())
        .and(warp::body::json())
        .and(with_db(db))
        .and_then(
            |body: SaveContentRequest, db: Arc<DatabaseConnection>| async move {
                SaveContent::execute(&db, body)
                    .await
                    .map(|r| warp::reply::json(&r))
                    .map_err(|e| warp::reject::custom(AppRejection::from(e)))
            },
        )
}

// ============================================================================
// Transaction 路由
// ============================================================================

fn transaction_routes(
    db: Arc<DatabaseConnection>,
) -> impl Filter<Extract = (impl warp::Reply,), Error = warp::Rejection> + Clone {
    create_node_with_content(db.clone()).or(delete_node_recursive(db))
}

fn create_node_with_content(
    db: Arc<DatabaseConnection>,
) -> impl Filter<Extract = (impl warp::Reply,), Error = warp::Rejection> + Clone {
    warp::path!("api" / "nodes" / "with-content")
        .and(warp::post())
        .and(warp::body::json())
        .and(with_db(db))
        .and_then(
            |body: CreateNodeWithContentRequest, db: Arc<DatabaseConnection>| async move {
                CreateNodeWithContent::execute(&db, body)
                    .await
                    .map(|r| warp::reply::json(&r))
                    .map_err(|e| warp::reject::custom(AppRejection::from(e)))
            },
        )
}

fn delete_node_recursive(
    db: Arc<DatabaseConnection>,
) -> impl Filter<Extract = (impl warp::Reply,), Error = warp::Rejection> + Clone {
    warp::path!("api" / "nodes" / String / "recursive")
        .and(warp::delete())
        .and(with_db(db))
        .and_then(|id: String, db: Arc<DatabaseConnection>| async move {
            DeleteNodeRecursive::execute(&db, IdInput::new(&id))
                .await
                .map(|r| warp::reply::json(&r))
                .map_err(|e| warp::reject::custom(AppRejection::from(e)))
        })
}

// ============================================================================
// Backup 路由
// ============================================================================

fn backup_routes(
    config: Arc<AppConfig>,
) -> impl Filter<Extract = (impl warp::Reply,), Error = warp::Rejection> + Clone {
    list_backups(config.clone())
        .or(create_backup(config.clone()))
        .or(delete_backup(config))
}

fn list_backups(
    config: Arc<AppConfig>,
) -> impl Filter<Extract = (impl warp::Reply,), Error = warp::Rejection> + Clone {
    warp::path!("api" / "backups")
        .and(warp::get())
        .and(with_config(config))
        .and_then(|config: Arc<AppConfig>| async move {
            crate::list_backups(&config)
                .map(|backups| warp::reply::json(&backups))
                .map_err(|e| warp::reject::custom(AppRejection::from(e)))
        })
}

fn create_backup(
    config: Arc<AppConfig>,
) -> impl Filter<Extract = (impl warp::Reply,), Error = warp::Rejection> + Clone {
    warp::path!("api" / "backups")
        .and(warp::post())
        .and(with_config(config))
        .and_then(|config: Arc<AppConfig>| async move {
            crate::create_backup(&config)
                .map(|info| warp::reply::json(&info))
                .map_err(|e| warp::reject::custom(AppRejection::from(e)))
        })
}

fn delete_backup(
    config: Arc<AppConfig>,
) -> impl Filter<Extract = (impl warp::Reply,), Error = warp::Rejection> + Clone {
    warp::path!("api" / "backups" / String)
        .and(warp::delete())
        .and(with_config(config))
        .and_then(|filename: String, config: Arc<AppConfig>| async move {
            let backup_path = config.backup_dir().join(&filename);
            crate::delete_backup(&backup_path)
                .map(|_| warp::reply::json(&serde_json::json!({"success": true})))
                .map_err(|e| warp::reject::custom(AppRejection::from(e)))
        })
}

// ============================================================================
// Clear Data 路由
// ============================================================================

fn clear_data_routes(
    db: Arc<DatabaseConnection>,
) -> impl Filter<Extract = (impl warp::Reply,), Error = warp::Rejection> + Clone {
    clear_all_data(db.clone()).or(clear_data_keep_users(db))
}

fn clear_all_data(
    db: Arc<DatabaseConnection>,
) -> impl Filter<Extract = (impl warp::Reply,), Error = warp::Rejection> + Clone {
    warp::path!("api" / "data" / "clear")
        .and(warp::delete())
        .and(warp::query::<std::collections::HashMap<String, String>>())
        .and(with_db(db))
        .and_then(
            |query: std::collections::HashMap<String, String>, db: Arc<DatabaseConnection>| async move {
                // 检查是否有 keepUsers 参数
                let keep_users = query.get("keepUsers")
                    .map(|v| v == "true")
                    .unwrap_or(false);

                if keep_users {
                    ClearDataKeepUsers::execute(&db, ())
                        .await
                        .map(|r| warp::reply::json(&r))
                        .map_err(|e| warp::reject::custom(AppRejection::from(e)))
                } else {
                    ClearAllData::execute(&db, ())
                        .await
                        .map(|r| warp::reply::json(&r))
                        .map_err(|e| warp::reject::custom(AppRejection::from(e)))
                }
            },
        )
}

fn clear_data_keep_users(
    db: Arc<DatabaseConnection>,
) -> impl Filter<Extract = (impl warp::Reply,), Error = warp::Rejection> + Clone {
    // 这个路由实际上由上面的 clear_all_data 处理，通过查询参数区分
    // 这里保留作为备用，但不会被匹配到
    warp::path!("api" / "data" / "clear" / "keep-users")
        .and(warp::delete())
        .and(with_db(db))
        .and_then(|db: Arc<DatabaseConnection>| async move {
            ClearDataKeepUsers::execute(&db, ())
                .await
                .map(|r| warp::reply::json(&r))
                .map_err(|e| warp::reject::custom(AppRejection::from(e)))
        })
}
