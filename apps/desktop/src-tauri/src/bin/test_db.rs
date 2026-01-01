//! 数据库测试脚本
//!
//! 运行: cargo run --bin test_db

use grain_lib::db::DbConnection;
use grain_lib::migration::Migrator;
use grain_lib::repo::{ContentRepo, NodeRepo, WorkspaceRepo};
use grain_lib::entity::node::NodeType;
use grain_lib::types::config::AppConfig;
use sea_orm_migration::MigratorTrait;

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    // 初始化日志
    tracing_subscriber::fmt()
        .with_max_level(tracing::Level::INFO)
        .init();

    println!("=== Grain 数据库测试 ===\n");

    // 使用临时目录
    let temp_dir = std::env::temp_dir().join("grain-test");
    std::fs::create_dir_all(&temp_dir)?;

    let config = AppConfig {
        data_dir: temp_dir.clone(),
        db_filename: "test.db".to_string(),
        backup_dirname: "backups".to_string(),
        enable_encryption: false,
    };

    println!("数据库路径: {:?}", config.db_path());

    // 连接数据库
    println!("\n1. 连接数据库...");
    let db = DbConnection::connect(&config).await?;
    println!("   ✓ 连接成功");

    // 运行迁移
    println!("\n2. 运行数据库迁移...");
    Migrator::up(&db, None).await?;
    println!("   ✓ 迁移完成");

    // 创建工作区
    println!("\n3. 创建工作区...");
    let workspace_id = uuid::Uuid::new_v4().to_string();
    let workspace = WorkspaceRepo::create(
        &db,
        workspace_id.clone(),
        "测试工作区".to_string(),
        Some("这是一个测试工作区".to_string()),
    )
    .await?;
    println!("   ✓ 工作区创建成功: {} ({})", workspace.name, workspace.id);

    // 创建文件夹节点
    println!("\n4. 创建文件夹节点...");
    let folder_id = uuid::Uuid::new_v4().to_string();
    let folder = NodeRepo::create(
        &db,
        folder_id.clone(),
        workspace_id.clone(),
        None,
        "我的文档".to_string(),
        NodeType::Folder,
        None,
    )
    .await?;
    println!("   ✓ 文件夹创建成功: {} ({})", folder.title, folder.id);

    // 创建文件节点
    println!("\n5. 创建文件节点...");
    let file_id = uuid::Uuid::new_v4().to_string();
    let file = NodeRepo::create(
        &db,
        file_id.clone(),
        workspace_id.clone(),
        Some(folder_id.clone()),
        "第一章".to_string(),
        NodeType::File,
        Some(r#"["小说", "草稿"]"#.to_string()),
    )
    .await?;
    println!("   ✓ 文件创建成功: {} ({})", file.title, file.id);

    // 创建内容
    println!("\n6. 创建文件内容...");
    let content_id = uuid::Uuid::new_v4().to_string();
    let content = ContentRepo::create(
        &db,
        content_id,
        file_id.clone(),
        r#"{"root":{"children":[{"type":"paragraph","children":[{"text":"这是第一章的内容..."}]}]}}"#.to_string(),
    )
    .await?;
    println!("   ✓ 内容创建成功: version={}", content.version);

    // 更新内容
    println!("\n7. 更新文件内容...");
    let updated_content = ContentRepo::update(
        &db,
        &file_id,
        r#"{"root":{"children":[{"type":"paragraph","children":[{"text":"这是更新后的第一章内容！"}]}]}}"#.to_string(),
        Some(1),
    )
    .await?;
    println!("   ✓ 内容更新成功: version={}", updated_content.version);

    // 查询工作区节点
    println!("\n8. 查询工作区节点...");
    let nodes = NodeRepo::find_by_workspace(&db, &workspace_id).await?;
    println!("   ✓ 找到 {} 个节点:", nodes.len());
    for node in &nodes {
        println!("     - {} ({:?})", node.title, node.node_type);
    }

    // 查询所有工作区
    println!("\n9. 查询所有工作区...");
    let workspaces = WorkspaceRepo::find_all(&db).await?;
    println!("   ✓ 找到 {} 个工作区", workspaces.len());

    // 清理测试数据
    println!("\n10. 清理测试数据...");
    WorkspaceRepo::delete(&db, &workspace_id).await?;
    println!("   ✓ 工作区已删除（级联删除节点和内容）");

    // 验证删除
    let remaining = NodeRepo::find_by_workspace(&db, &workspace_id).await?;
    println!("   ✓ 剩余节点数: {}", remaining.len());

    println!("\n=== 测试完成 ===");
    println!("数据库文件: {:?}", config.db_path());

    Ok(())
}
