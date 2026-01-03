//! Tag 数据库函数
//!
//! 标签相关的 CRUD 操作

use crate::types::{
    TagActiveModel, TagColumn, TagEntity, TagGraphData, TagGraphEdge, TagGraphNode, TagModel,
};
use sea_orm::*;
use std::collections::HashMap;

// ============================================================================
// 查询操作
// ============================================================================

/// 获取工作区所有标签
pub async fn find_by_workspace(
    db: &DatabaseConnection,
    workspace_id: &str,
) -> Result<Vec<TagModel>, DbErr> {
    TagEntity::find()
        .filter(TagColumn::WorkspaceId.eq(workspace_id))
        .order_by_desc(TagColumn::Count)
        .all(db)
        .await
}

/// 按 ID 获取标签
pub async fn find_by_id(db: &DatabaseConnection, id: &str) -> Result<Option<TagModel>, DbErr> {
    TagEntity::find_by_id(id).one(db).await
}

/// 按名称获取标签（在工作区内）
pub async fn find_by_name(
    db: &DatabaseConnection,
    workspace_id: &str,
    name: &str,
) -> Result<Option<TagModel>, DbErr> {
    TagEntity::find()
        .filter(TagColumn::WorkspaceId.eq(workspace_id))
        .filter(TagColumn::Name.eq(name))
        .one(db)
        .await
}

/// 获取热门标签（按使用次数排序）
pub async fn find_top_tags(
    db: &DatabaseConnection,
    workspace_id: &str,
    limit: u64,
) -> Result<Vec<TagModel>, DbErr> {
    TagEntity::find()
        .filter(TagColumn::WorkspaceId.eq(workspace_id))
        .order_by_desc(TagColumn::Count)
        .limit(limit)
        .all(db)
        .await
}

/// 搜索标签（模糊匹配）
pub async fn search_tags(
    db: &DatabaseConnection,
    workspace_id: &str,
    query: &str,
) -> Result<Vec<TagModel>, DbErr> {
    TagEntity::find()
        .filter(TagColumn::WorkspaceId.eq(workspace_id))
        .filter(TagColumn::Name.contains(query))
        .order_by_desc(TagColumn::Count)
        .all(db)
        .await
}

/// 获取包含指定标签的节点 ID 列表
///
/// 通过查询 nodes 表的 tags JSON 字段来查找
pub async fn get_nodes_by_tag(
    db: &DatabaseConnection,
    workspace_id: &str,
    tag_name: &str,
) -> Result<Vec<String>, DbErr> {
    use crate::types::node::node_entity as node;
    use crate::types::NodeEntity as Node;

    // 查询所有节点，然后在内存中过滤
    // 因为 SQLite 的 JSON 查询支持有限
    let nodes = Node::find()
        .filter(node::Column::WorkspaceId.eq(workspace_id))
        .filter(node::Column::Tags.is_not_null())
        .all(db)
        .await?;

    let node_ids: Vec<String> = nodes
        .into_iter()
        .filter(|node| {
            if let Some(ref tags_json) = node.tags {
                // 解析 JSON 数组
                if let Ok(tags) = serde_json::from_str::<Vec<String>>(tags_json) {
                    return tags.contains(&tag_name.to_string());
                }
            }
            false
        })
        .map(|node| node.id)
        .collect();

    Ok(node_ids)
}


/// 获取标签图形数据
///
/// 返回标签节点和边（标签之间的共现关系）
pub async fn get_tag_graph_data(
    db: &DatabaseConnection,
    workspace_id: &str,
) -> Result<TagGraphData, DbErr> {
    use crate::types::node::node_entity as node;
    use crate::types::NodeEntity as Node;

    // 获取所有标签作为节点
    let tags = find_by_workspace(db, workspace_id).await?;
    let nodes: Vec<TagGraphNode> = tags
        .into_iter()
        .map(|tag| TagGraphNode {
            id: tag.id,
            name: tag.name,
            count: tag.count,
        })
        .collect();

    // 计算标签之间的共现关系（边）
    let all_nodes = Node::find()
        .filter(node::Column::WorkspaceId.eq(workspace_id))
        .filter(node::Column::Tags.is_not_null())
        .all(db)
        .await?;

    // 统计标签对的共现次数
    let mut edge_weights: HashMap<(String, String), i32> = HashMap::new();

    for node in all_nodes {
        if let Some(ref tags_json) = node.tags {
            if let Ok(tags) = serde_json::from_str::<Vec<String>>(tags_json) {
                // 对于每对标签，增加共现计数
                for i in 0..tags.len() {
                    for j in (i + 1)..tags.len() {
                        let tag1 = &tags[i];
                        let tag2 = &tags[j];
                        // 确保边的方向一致（按字母顺序）
                        let (source, target) = if tag1 < tag2 {
                            (
                                format!("{}:{}", workspace_id, tag1),
                                format!("{}:{}", workspace_id, tag2),
                            )
                        } else {
                            (
                                format!("{}:{}", workspace_id, tag2),
                                format!("{}:{}", workspace_id, tag1),
                            )
                        };
                        *edge_weights.entry((source, target)).or_insert(0) += 1;
                    }
                }
            }
        }
    }

    // 转换为边列表
    let edges: Vec<TagGraphEdge> = edge_weights
        .into_iter()
        .map(|((source, target), weight)| TagGraphEdge {
            source,
            target,
            weight,
        })
        .collect();

    Ok(TagGraphData { nodes, edges })
}

// ============================================================================
// 写入操作
// ============================================================================

/// 创建标签
pub async fn create(
    db: &DatabaseConnection,
    id: String,
    name: String,
    workspace_id: String,
) -> Result<TagModel, DbErr> {
    let now = chrono::Utc::now().timestamp_millis();

    let model = TagActiveModel {
        id: Set(id),
        name: Set(name),
        workspace_id: Set(workspace_id),
        count: Set(1),
        last_used: Set(now),
        created_at: Set(now),
    };

    model.insert(db).await
}

/// 更新标签
pub async fn update(
    db: &DatabaseConnection,
    id: &str,
    name: Option<String>,
    count: Option<i32>,
    last_used: Option<i64>,
) -> Result<TagModel, DbErr> {
    let tag = TagEntity::find_by_id(id)
        .one(db)
        .await?
        .ok_or(DbErr::RecordNotFound(format!("Tag {} not found", id)))?;

    let mut model: TagActiveModel = tag.into();

    if let Some(n) = name {
        model.name = Set(n);
    }
    if let Some(c) = count {
        model.count = Set(c);
    }
    if let Some(lu) = last_used {
        model.last_used = Set(lu);
    }

    model.update(db).await
}

/// 增加标签使用计数
pub async fn increment_count(db: &DatabaseConnection, id: &str) -> Result<TagModel, DbErr> {
    let tag = TagEntity::find_by_id(id)
        .one(db)
        .await?
        .ok_or(DbErr::RecordNotFound(format!("Tag {} not found", id)))?;

    let now = chrono::Utc::now().timestamp_millis();
    let mut model: TagActiveModel = tag.into();
    model.count = Set(model.count.unwrap() + 1);
    model.last_used = Set(now);

    model.update(db).await
}

/// 减少标签使用计数
pub async fn decrement_count(db: &DatabaseConnection, id: &str) -> Result<TagModel, DbErr> {
    let tag = TagEntity::find_by_id(id)
        .one(db)
        .await?
        .ok_or(DbErr::RecordNotFound(format!("Tag {} not found", id)))?;

    let new_count = (tag.count - 1).max(0);
    let mut model: TagActiveModel = tag.into();
    model.count = Set(new_count);

    model.update(db).await
}

/// 删除标签
pub async fn delete(db: &DatabaseConnection, id: &str) -> Result<(), DbErr> {
    TagEntity::delete_by_id(id).exec(db).await?;
    Ok(())
}

/// 删除工作区所有标签
pub async fn delete_by_workspace(
    db: &DatabaseConnection,
    workspace_id: &str,
) -> Result<u64, DbErr> {
    let result = TagEntity::delete_many()
        .filter(TagColumn::WorkspaceId.eq(workspace_id))
        .exec(db)
        .await?;
    Ok(result.rows_affected)
}

/// 获取或创建标签
pub async fn get_or_create(
    db: &DatabaseConnection,
    workspace_id: &str,
    name: &str,
) -> Result<TagModel, DbErr> {
    let id = format!("{}:{}", workspace_id, name);

    match find_by_id(db, &id).await? {
        Some(_tag) => {
            // 标签已存在，增加计数
            increment_count(db, &id).await
        }
        None => {
            // 创建新标签
            create(db, id, name.to_string(), workspace_id.to_string()).await
        }
    }
}


// ============================================================================
// 同步操作
// ============================================================================

/// 同步标签缓存
///
/// 从 nodes 表的 tags 字段同步到 tags 表
/// 只更新已存在的标签的计数
pub async fn sync_tag_cache(db: &DatabaseConnection, workspace_id: &str) -> Result<(), DbErr> {
    use crate::types::node::node_entity as node;
    use crate::types::NodeEntity as Node;

    // 获取所有节点的标签
    let nodes = Node::find()
        .filter(node::Column::WorkspaceId.eq(workspace_id))
        .filter(node::Column::Tags.is_not_null())
        .all(db)
        .await?;

    // 统计每个标签的使用次数
    let mut tag_counts: HashMap<String, i32> = HashMap::new();

    for node in nodes {
        if let Some(ref tags_json) = node.tags {
            if let Ok(tags) = serde_json::from_str::<Vec<String>>(tags_json) {
                for tag in tags {
                    *tag_counts.entry(tag).or_insert(0) += 1;
                }
            }
        }
    }

    // 更新现有标签的计数
    let now = chrono::Utc::now().timestamp_millis();
    for (tag_name, count) in tag_counts {
        let tag_id = format!("{}:{}", workspace_id, tag_name);
        if let Some(tag) = find_by_id(db, &tag_id).await? {
            let mut model: TagActiveModel = tag.into();
            model.count = Set(count);
            model.last_used = Set(now);
            model.update(db).await?;
        }
    }

    Ok(())
}

/// 重建标签缓存
///
/// 删除所有标签并从 nodes 表重新构建
pub async fn rebuild_tag_cache(db: &DatabaseConnection, workspace_id: &str) -> Result<(), DbErr> {
    use crate::types::node::node_entity as node;
    use crate::types::NodeEntity as Node;

    // 删除工作区所有标签
    delete_by_workspace(db, workspace_id).await?;

    // 获取所有节点的标签
    let nodes = Node::find()
        .filter(node::Column::WorkspaceId.eq(workspace_id))
        .filter(node::Column::Tags.is_not_null())
        .all(db)
        .await?;

    // 统计每个标签的使用次数
    let mut tag_counts: HashMap<String, i32> = HashMap::new();

    for node in nodes {
        if let Some(ref tags_json) = node.tags {
            if let Ok(tags) = serde_json::from_str::<Vec<String>>(tags_json) {
                for tag in tags {
                    *tag_counts.entry(tag).or_insert(0) += 1;
                }
            }
        }
    }

    // 创建新标签
    let now = chrono::Utc::now().timestamp_millis();
    for (tag_name, count) in tag_counts {
        let tag_id = format!("{}:{}", workspace_id, tag_name);
        let model = TagActiveModel {
            id: Set(tag_id),
            name: Set(tag_name),
            workspace_id: Set(workspace_id.to_string()),
            count: Set(count),
            last_used: Set(now),
            created_at: Set(now),
        };
        model.insert(db).await?;
    }

    Ok(())
}

/// 重新计算标签计数
///
/// 只更新计数，不创建或删除标签
pub async fn recalculate_tag_counts(
    db: &DatabaseConnection,
    workspace_id: &str,
) -> Result<(), DbErr> {
    use crate::types::node::node_entity as node;
    use crate::types::NodeEntity as Node;

    // 获取所有节点的标签
    let nodes = Node::find()
        .filter(node::Column::WorkspaceId.eq(workspace_id))
        .filter(node::Column::Tags.is_not_null())
        .all(db)
        .await?;

    // 统计每个标签的使用次数
    let mut tag_counts: HashMap<String, i32> = HashMap::new();

    for node in nodes {
        if let Some(ref tags_json) = node.tags {
            if let Ok(tags) = serde_json::from_str::<Vec<String>>(tags_json) {
                for tag in tags {
                    let tag_id = format!("{}:{}", workspace_id, tag);
                    *tag_counts.entry(tag_id).or_insert(0) += 1;
                }
            }
        }
    }

    // 获取所有现有标签
    let existing_tags = find_by_workspace(db, workspace_id).await?;

    // 更新每个标签的计数
    for tag in existing_tags {
        let new_count = tag_counts.get(&tag.id).copied().unwrap_or(0);
        if tag.count != new_count {
            let mut model: TagActiveModel = tag.into();
            model.count = Set(new_count);
            model.update(db).await?;
        }
    }

    Ok(())
}


// ============================================================================
// 测试
// ============================================================================

#[cfg(test)]
mod tests {
    use super::*;
    use crate::db::node_db_fn;
    use crate::db::test_utils::setup_test_db;
    use crate::db::workspace_db_fn;
    use crate::types::NodeType;

    #[tokio::test]
    async fn test_tag_crud() {
        let db = setup_test_db().await;

        // 先创建工作区（外键约束）
        workspace_db_fn::create(&db, "ws-1".into(), "Test Workspace".into(), None)
            .await
            .unwrap();

        // 创建
        let tag = create(&db, "ws-1:rust".into(), "rust".into(), "ws-1".into())
            .await
            .unwrap();

        assert_eq!(tag.name, "rust");
        assert_eq!(tag.count, 1);

        // 查询
        let found = find_by_id(&db, "ws-1:rust").await.unwrap();
        assert!(found.is_some());

        // 增加计数
        let updated = increment_count(&db, "ws-1:rust").await.unwrap();
        assert_eq!(updated.count, 2);

        // 删除
        delete(&db, "ws-1:rust").await.unwrap();
        let deleted = find_by_id(&db, "ws-1:rust").await.unwrap();
        assert!(deleted.is_none());
    }

    #[tokio::test]
    async fn test_get_or_create() {
        let db = setup_test_db().await;

        // 先创建工作区（外键约束）
        workspace_db_fn::create(&db, "ws-1".into(), "Test Workspace".into(), None)
            .await
            .unwrap();

        // 第一次调用创建
        let tag1 = get_or_create(&db, "ws-1", "typescript").await.unwrap();
        assert_eq!(tag1.count, 1);

        // 第二次调用增加计数
        let tag2 = get_or_create(&db, "ws-1", "typescript").await.unwrap();
        assert_eq!(tag2.count, 2);
    }

    #[tokio::test]
    async fn test_search_tags() {
        let db = setup_test_db().await;

        // 创建工作区
        workspace_db_fn::create(&db, "ws-1".into(), "Test Workspace".into(), None)
            .await
            .unwrap();

        // 创建标签
        create(&db, "ws-1:rust".into(), "rust".into(), "ws-1".into())
            .await
            .unwrap();
        create(
            &db,
            "ws-1:rust-lang".into(),
            "rust-lang".into(),
            "ws-1".into(),
        )
        .await
        .unwrap();
        create(
            &db,
            "ws-1:typescript".into(),
            "typescript".into(),
            "ws-1".into(),
        )
        .await
        .unwrap();

        // 搜索
        let results = search_tags(&db, "ws-1", "rust").await.unwrap();
        assert_eq!(results.len(), 2);
    }

    #[tokio::test]
    async fn test_get_nodes_by_tag() {
        let db = setup_test_db().await;

        // 创建工作区
        workspace_db_fn::create(&db, "ws-1".into(), "Test Workspace".into(), None)
            .await
            .unwrap();

        // 创建带标签的节点
        node_db_fn::create(
            &db,
            "node-1".into(),
            "ws-1".into(),
            None,
            "Node 1".into(),
            NodeType::File,
            Some(r#"["rust", "programming"]"#.into()),
        )
        .await
        .unwrap();

        node_db_fn::create(
            &db,
            "node-2".into(),
            "ws-1".into(),
            None,
            "Node 2".into(),
            NodeType::File,
            Some(r#"["rust"]"#.into()),
        )
        .await
        .unwrap();

        node_db_fn::create(
            &db,
            "node-3".into(),
            "ws-1".into(),
            None,
            "Node 3".into(),
            NodeType::File,
            Some(r#"["typescript"]"#.into()),
        )
        .await
        .unwrap();

        // 查询包含 "rust" 标签的节点
        let node_ids = get_nodes_by_tag(&db, "ws-1", "rust").await.unwrap();
        assert_eq!(node_ids.len(), 2);
        assert!(node_ids.contains(&"node-1".to_string()));
        assert!(node_ids.contains(&"node-2".to_string()));
    }

    #[tokio::test]
    async fn test_get_tag_graph_data() {
        let db = setup_test_db().await;

        // 创建工作区
        workspace_db_fn::create(&db, "ws-1".into(), "Test Workspace".into(), None)
            .await
            .unwrap();

        // 创建标签
        create(&db, "ws-1:rust".into(), "rust".into(), "ws-1".into())
            .await
            .unwrap();
        create(
            &db,
            "ws-1:programming".into(),
            "programming".into(),
            "ws-1".into(),
        )
        .await
        .unwrap();

        // 创建带标签的节点（共现关系）
        node_db_fn::create(
            &db,
            "node-1".into(),
            "ws-1".into(),
            None,
            "Node 1".into(),
            NodeType::File,
            Some(r#"["rust", "programming"]"#.into()),
        )
        .await
        .unwrap();

        // 获取图形数据
        let graph = get_tag_graph_data(&db, "ws-1").await.unwrap();

        assert_eq!(graph.nodes.len(), 2);
        assert_eq!(graph.edges.len(), 1);
        assert_eq!(graph.edges[0].weight, 1);
    }

    #[tokio::test]
    async fn test_rebuild_tag_cache() {
        let db = setup_test_db().await;

        // 创建工作区
        workspace_db_fn::create(&db, "ws-1".into(), "Test Workspace".into(), None)
            .await
            .unwrap();

        // 创建带标签的节点
        node_db_fn::create(
            &db,
            "node-1".into(),
            "ws-1".into(),
            None,
            "Node 1".into(),
            NodeType::File,
            Some(r#"["rust", "programming"]"#.into()),
        )
        .await
        .unwrap();

        node_db_fn::create(
            &db,
            "node-2".into(),
            "ws-1".into(),
            None,
            "Node 2".into(),
            NodeType::File,
            Some(r#"["rust"]"#.into()),
        )
        .await
        .unwrap();

        // 重建标签缓存
        rebuild_tag_cache(&db, "ws-1").await.unwrap();

        // 验证标签
        let tags = find_by_workspace(&db, "ws-1").await.unwrap();
        assert_eq!(tags.len(), 2);

        // rust 应该有 2 个计数
        let rust_tag = tags.iter().find(|t| t.name == "rust").unwrap();
        assert_eq!(rust_tag.count, 2);

        // programming 应该有 1 个计数
        let prog_tag = tags.iter().find(|t| t.name == "programming").unwrap();
        assert_eq!(prog_tag.count, 1);
    }

    #[tokio::test]
    async fn test_recalculate_tag_counts() {
        let db = setup_test_db().await;

        // 创建工作区
        workspace_db_fn::create(&db, "ws-1".into(), "Test Workspace".into(), None)
            .await
            .unwrap();

        // 创建标签（初始计数为 1）
        create(&db, "ws-1:rust".into(), "rust".into(), "ws-1".into())
            .await
            .unwrap();

        // 创建带标签的节点
        node_db_fn::create(
            &db,
            "node-1".into(),
            "ws-1".into(),
            None,
            "Node 1".into(),
            NodeType::File,
            Some(r#"["rust"]"#.into()),
        )
        .await
        .unwrap();

        node_db_fn::create(
            &db,
            "node-2".into(),
            "ws-1".into(),
            None,
            "Node 2".into(),
            NodeType::File,
            Some(r#"["rust"]"#.into()),
        )
        .await
        .unwrap();

        node_db_fn::create(
            &db,
            "node-3".into(),
            "ws-1".into(),
            None,
            "Node 3".into(),
            NodeType::File,
            Some(r#"["rust"]"#.into()),
        )
        .await
        .unwrap();

        // 重新计算计数
        recalculate_tag_counts(&db, "ws-1").await.unwrap();

        // 验证计数
        let tag = find_by_id(&db, "ws-1:rust").await.unwrap().unwrap();
        assert_eq!(tag.count, 3);
    }
}

// ============================================================================
// Property-Based Tests
// ============================================================================

#[cfg(test)]
mod property_tests {
    use super::*;
    use crate::db::node_db_fn;
    use crate::db::test_utils::setup_test_db;
    use crate::db::workspace_db_fn;
    use crate::types::NodeType;
    use proptest::prelude::*;

    /// Generate a valid tag name (non-empty, alphanumeric with hyphens)
    fn arb_tag_name() -> impl Strategy<Value = String> {
        "[a-zA-Z][a-zA-Z0-9_-]{0,20}".prop_map(|s| s.to_string())
    }

    /// Generate a valid workspace ID
    fn arb_workspace_id() -> impl Strategy<Value = String> {
        "ws-[a-zA-Z0-9]{4,8}".prop_map(|s| s.to_string())
    }

    proptest! {
        #![proptest_config(ProptestConfig::with_cases(50))]

        /// **Property 3: Tag CRUD Round Trip**
        /// *For any* valid tag data, creating a tag then retrieving it by ID
        /// should return an equivalent tag object.
        /// **Validates: Requirements 5.2**
        #[test]
        fn prop_tag_crud_round_trip(
            tag_name in arb_tag_name(),
            workspace_id in arb_workspace_id(),
        ) {
            let rt = tokio::runtime::Runtime::new().unwrap();
            rt.block_on(async {
                let db = setup_test_db().await;

                // Create workspace first (foreign key constraint)
                workspace_db_fn::create(&db, workspace_id.clone(), "Test Workspace".into(), None)
                    .await
                    .expect("Failed to create workspace");

                let tag_id = format!("{}:{}", workspace_id, tag_name);

                // Create tag
                let created = create(
                    &db,
                    tag_id.clone(),
                    tag_name.clone(),
                    workspace_id.clone(),
                )
                .await
                .expect("Failed to create tag");

                // Verify created tag matches input
                prop_assert_eq!(&created.id, &tag_id);
                prop_assert_eq!(&created.name, &tag_name);
                prop_assert_eq!(&created.workspace_id, &workspace_id);
                prop_assert_eq!(created.count, 1); // Initial count is 1

                // Retrieve by ID
                let found = find_by_id(&db, &tag_id)
                    .await
                    .expect("Failed to find tag")
                    .expect("Tag not found");

                // Verify retrieved tag matches created
                prop_assert_eq!(&found.id, &created.id);
                prop_assert_eq!(&found.name, &created.name);
                prop_assert_eq!(&found.workspace_id, &created.workspace_id);
                prop_assert_eq!(found.count, created.count);
                prop_assert_eq!(found.created_at, created.created_at);
                prop_assert_eq!(found.last_used, created.last_used);

                // Test update
                let updated = update(&db, &tag_id, Some("updated-name".to_string()), Some(5), None)
                    .await
                    .expect("Failed to update tag");

                prop_assert_eq!(&updated.name, "updated-name");
                prop_assert_eq!(updated.count, 5);

                // Test delete
                delete(&db, &tag_id).await.expect("Failed to delete tag");
                let deleted = find_by_id(&db, &tag_id).await.expect("Failed to query");
                prop_assert!(deleted.is_none());

                Ok(())
            })?;
        }

        /// **Property 4: Tag Count Consistency**
        /// After `recalculateTagCounts`, each tag's count should equal the number of nodes
        /// that have that tag in their tags JSON array.
        /// **Validates: Requirements 5.4**
        #[test]
        fn prop_tag_count_consistency(
            workspace_id in arb_workspace_id(),
            tag_name in arb_tag_name(),
            node_count in 1usize..5usize,
        ) {
            let rt = tokio::runtime::Runtime::new().unwrap();
            rt.block_on(async {
                let db = setup_test_db().await;

                // Create workspace first (foreign key constraint)
                workspace_db_fn::create(&db, workspace_id.clone(), "Test Workspace".into(), None)
                    .await
                    .expect("Failed to create workspace");

                let tag_id = format!("{}:{}", workspace_id, tag_name);

                // Create tag with initial count of 1
                create(
                    &db,
                    tag_id.clone(),
                    tag_name.clone(),
                    workspace_id.clone(),
                )
                .await
                .expect("Failed to create tag");

                // Create nodes with the tag
                let tags_json = format!(r#"["{}"]"#, tag_name);
                for i in 0..node_count {
                    let node_id = format!("node-{}-{}", workspace_id, i);
                    node_db_fn::create(
                        &db,
                        node_id,
                        workspace_id.clone(),
                        None,
                        format!("Node {}", i),
                        NodeType::File,
                        Some(tags_json.clone()),
                    )
                    .await
                    .expect("Failed to create node");
                }

                // Recalculate tag counts
                recalculate_tag_counts(&db, &workspace_id)
                    .await
                    .expect("Failed to recalculate tag counts");

                // Verify tag count matches node count
                let tag = find_by_id(&db, &tag_id)
                    .await
                    .expect("Failed to find tag")
                    .expect("Tag not found");

                prop_assert_eq!(
                    tag.count as usize,
                    node_count,
                    "Tag count {} should equal node count {}",
                    tag.count,
                    node_count
                );

                // Also verify using get_nodes_by_tag
                let node_ids = get_nodes_by_tag(&db, &workspace_id, &tag_name)
                    .await
                    .expect("Failed to get nodes by tag");

                prop_assert_eq!(
                    node_ids.len(),
                    node_count,
                    "get_nodes_by_tag returned {} nodes, expected {}",
                    node_ids.len(),
                    node_count
                );

                Ok(())
            })?;
        }
    }
}
