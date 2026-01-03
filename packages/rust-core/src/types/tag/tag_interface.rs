//! Tag DTO 接口定义
//!
//! 定义标签相关的数据传输对象（DTO）

use serde::{Deserialize, Serialize};

// ============================================================================
// 请求 DTO
// ============================================================================

/// 创建标签请求
#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateTagRequest {
    /// 标签名称
    pub name: String,

    /// 所属工作区 ID
    pub workspace_id: String,
}

/// 更新标签请求
#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateTagRequest {
    /// 标签名称
    pub name: Option<String>,

    /// 使用计数
    pub count: Option<i32>,

    /// 最后使用时间戳（毫秒）
    pub last_used: Option<i64>,
}

// ============================================================================
// 响应 DTO
// ============================================================================

/// 标签响应
#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct TagResponse {
    /// 标签 ID
    pub id: String,

    /// 标签名称
    pub name: String,

    /// 所属工作区 ID
    pub workspace_id: String,

    /// 使用计数
    pub count: i32,

    /// 最后使用时间戳（毫秒）
    pub last_used: i64,

    /// 创建时间戳（毫秒）
    pub created_at: i64,
}

/// Entity -> DTO 转换
impl From<super::tag_entity::Model> for TagResponse {
    fn from(model: super::tag_entity::Model) -> Self {
        Self {
            id: model.id,
            name: model.name,
            workspace_id: model.workspace_id,
            count: model.count,
            last_used: model.last_used,
            created_at: model.created_at,
        }
    }
}

// ============================================================================
// 图形数据 DTO
// ============================================================================

/// 标签图形数据
///
/// 用于可视化标签之间的关系
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TagGraphData {
    /// 图形节点（标签）
    pub nodes: Vec<TagGraphNode>,

    /// 图形边（标签之间的关系）
    pub edges: Vec<TagGraphEdge>,
}

/// 标签图形节点
///
/// 表示图形中的一个标签
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TagGraphNode {
    /// 标签 ID
    pub id: String,

    /// 标签名称
    pub name: String,

    /// 使用此标签的文档数量
    pub count: i32,
}

/// 标签图形边
///
/// 表示两个标签之间的关系（共同出现在同一文档中）
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TagGraphEdge {
    /// 源标签 ID
    pub source: String,

    /// 目标标签 ID
    pub target: String,

    /// 权重（共同出现的次数）
    pub weight: i32,
}

impl TagGraphData {
    /// 创建空的图形数据
    pub fn empty() -> Self {
        Self {
            nodes: Vec::new(),
            edges: Vec::new(),
        }
    }

    /// 从标签响应列表创建图形节点
    pub fn from_tags(tags: Vec<TagResponse>) -> Self {
        let nodes = tags
            .into_iter()
            .map(|tag| TagGraphNode {
                id: tag.id,
                name: tag.name,
                count: tag.count,
            })
            .collect();

        Self {
            nodes,
            edges: Vec::new(),
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_tag_response_from_model() {
        let model = super::super::tag_entity::Model {
            id: "ws-1:rust".into(),
            name: "rust".into(),
            workspace_id: "ws-1".into(),
            count: 5,
            last_used: 1704067200000,
            created_at: 1704067200000,
        };

        let response = TagResponse::from(model);
        assert_eq!(response.id, "ws-1:rust");
        assert_eq!(response.name, "rust");
        assert_eq!(response.count, 5);
    }

    #[test]
    fn test_tag_graph_data_empty() {
        let graph = TagGraphData::empty();
        assert!(graph.nodes.is_empty());
        assert!(graph.edges.is_empty());
    }

    #[test]
    fn test_tag_graph_data_from_tags() {
        let tags = vec![
            TagResponse {
                id: "ws-1:rust".into(),
                name: "rust".into(),
                workspace_id: "ws-1".into(),
                count: 5,
                last_used: 1704067200000,
                created_at: 1704067200000,
            },
            TagResponse {
                id: "ws-1:programming".into(),
                name: "programming".into(),
                workspace_id: "ws-1".into(),
                count: 10,
                last_used: 1704067200000,
                created_at: 1704067200000,
            },
        ];

        let graph = TagGraphData::from_tags(tags);
        assert_eq!(graph.nodes.len(), 2);
        assert!(graph.edges.is_empty());
        assert_eq!(graph.nodes[0].name, "rust");
        assert_eq!(graph.nodes[1].name, "programming");
    }

    #[test]
    fn test_tag_graph_node() {
        let node = TagGraphNode {
            id: "ws-1:rust".into(),
            name: "rust".into(),
            count: 5,
        };
        assert_eq!(node.id, "ws-1:rust");
        assert_eq!(node.name, "rust");
        assert_eq!(node.count, 5);
    }

    #[test]
    fn test_tag_graph_edge() {
        let edge = TagGraphEdge {
            source: "ws-1:rust".into(),
            target: "ws-1:programming".into(),
            weight: 3,
        };
        assert_eq!(edge.source, "ws-1:rust");
        assert_eq!(edge.target, "ws-1:programming");
        assert_eq!(edge.weight, 3);
    }
}
