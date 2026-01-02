//! Node DTO 接口定义
//!
//! 定义节点相关的数据传输对象（DTO）。
//! 与前端 TypeScript 的 NodeInterface 对应。
//!
//! ## 字段映射（前端 → 后端）
//!
//! | 前端字段 | 后端字段 | 说明 |
//! |---------|---------|------|
//! | id | id | UUID |
//! | workspace | workspace_id | 工作区 ID |
//! | parent | parent_id | 父节点 ID |
//! | type | node_type | 节点类型 |
//! | title | title | 标题 |
//! | order | sort_order | 排序顺序 |
//! | collapsed | is_collapsed | 是否折叠 |
//! | createDate | created_at | 创建时间（毫秒时间戳） |
//! | lastEdit | updated_at | 更新时间（毫秒时间戳） |
//! | tags | tags | 标签数组（JSON） |

use sea_orm::entity::prelude::*;
use serde::{Deserialize, Serialize};

// ============================================================================
// 节点类型枚举（统一定义，同时用于 Entity 和 DTO）
// ============================================================================

/// 节点类型
/// 对应前端 NodeType: "folder" | "file" | "canvas" | "diary" | "drawing"
/// 同时用于 SeaORM Entity 和 DTO
#[derive(Debug, Clone, Copy, PartialEq, Eq, EnumIter, DeriveActiveEnum, Serialize, Deserialize)]
#[sea_orm(rs_type = "String", db_type = "Text")]
#[serde(rename_all = "lowercase")]
pub enum NodeType {
    /// 文件夹
    #[sea_orm(string_value = "folder")]
    Folder,

    /// 普通文件
    #[sea_orm(string_value = "file")]
    File,

    /// 画布
    #[sea_orm(string_value = "canvas")]
    Canvas,

    /// 日记
    #[sea_orm(string_value = "diary")]
    Diary,

    /// 绘图 (Excalidraw)
    #[sea_orm(string_value = "drawing")]
    Drawing,
}

impl Default for NodeType {
    fn default() -> Self {
        Self::File
    }
}

impl std::fmt::Display for NodeType {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            NodeType::Folder => write!(f, "folder"),
            NodeType::File => write!(f, "file"),
            NodeType::Canvas => write!(f, "canvas"),
            NodeType::Diary => write!(f, "diary"),
            NodeType::Drawing => write!(f, "drawing"),
        }
    }
}

impl std::str::FromStr for NodeType {
    type Err = String;

    fn from_str(s: &str) -> Result<Self, Self::Err> {
        match s.to_lowercase().as_str() {
            "folder" => Ok(NodeType::Folder),
            "file" => Ok(NodeType::File),
            "canvas" => Ok(NodeType::Canvas),
            "diary" => Ok(NodeType::Diary),
            "drawing" => Ok(NodeType::Drawing),
            _ => Err(format!("未知的节点类型: {}", s)),
        }
    }
}

// ============================================================================
// 请求 DTO（对应前端 NodeCreateInput, NodeUpdateInput）
// ============================================================================

/// 创建节点请求
/// 对应前端 NodeCreateInput
#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateNodeRequest {
    /// 所属工作区 ID
    pub workspace_id: String,

    /// 父节点 ID（根节点为 null）
    pub parent_id: Option<String>,

    /// 节点类型（默认 "file"）
    #[serde(default)]
    pub node_type: Option<NodeType>,

    /// 节点标题
    pub title: String,

    /// 排序顺序（默认 0）
    pub sort_order: Option<i32>,

    /// 是否折叠（默认 true）
    pub is_collapsed: Option<bool>,
}

/// 更新节点请求
/// 对应前端 NodeUpdateInput
#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateNodeRequest {
    /// 父节点 ID
    pub parent_id: Option<Option<String>>,

    /// 节点类型
    pub node_type: Option<NodeType>,

    /// 节点标题
    pub title: Option<String>,

    /// 排序顺序
    pub sort_order: Option<i32>,

    /// 是否折叠
    pub is_collapsed: Option<bool>,

    /// 标签数组
    pub tags: Option<Vec<String>>,
}

/// 移动节点请求
#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct MoveNodeRequest {
    /// 新的父节点 ID（移动到根级别时为 null）
    pub new_parent_id: Option<String>,

    /// 新的排序顺序
    pub new_sort_order: i32,
}

// ============================================================================
// 响应 DTO（对应前端 NodeInterface）
// ============================================================================

/// 节点响应
/// 对应前端 NodeInterface
#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct NodeResponse {
    /// 节点 ID
    pub id: String,

    /// 所属工作区 ID（对应前端 workspace）
    pub workspace_id: String,

    /// 父节点 ID（对应前端 parent）
    pub parent_id: Option<String>,

    /// 节点类型（对应前端 type）
    pub node_type: NodeType,

    /// 节点标题
    pub title: String,

    /// 排序顺序（对应前端 order）
    pub sort_order: i32,

    /// 是否折叠（对应前端 collapsed）
    pub is_collapsed: bool,

    /// 标签数组
    pub tags: Option<Vec<String>>,

    /// 创建时间戳（毫秒，对应前端 createDate）
    pub created_at: i64,

    /// 更新时间戳（毫秒，对应前端 lastEdit）
    pub updated_at: i64,
}

/// Entity -> DTO 转换
impl From<super::node_entity::Model> for NodeResponse {
    fn from(model: super::node_entity::Model) -> Self {
        // 解析 tags JSON 字符串为 Vec<String>
        let tags = model.tags.and_then(|t| serde_json::from_str(&t).ok());

        Self {
            id: model.id,
            workspace_id: model.workspace_id,
            parent_id: model.parent_id,
            node_type: model.node_type,
            title: model.title,
            sort_order: model.sort_order,
            is_collapsed: model.is_collapsed,
            tags,
            created_at: model.created_at,
            updated_at: model.updated_at,
        }
    }
}

// ============================================================================
// 不可变更新方法
// ============================================================================

impl NodeResponse {
    /// 不可变更新 - 返回新实例
    pub fn with_title(self, title: impl Into<String>) -> Self {
        Self {
            title: title.into(),
            ..self
        }
    }

    pub fn with_parent_id(self, parent_id: Option<String>) -> Self {
        Self { parent_id, ..self }
    }

    pub fn with_sort_order(self, sort_order: i32) -> Self {
        Self { sort_order, ..self }
    }

    pub fn with_collapsed(self, is_collapsed: bool) -> Self {
        Self {
            is_collapsed,
            ..self
        }
    }

    pub fn with_tags(self, tags: Option<Vec<String>>) -> Self {
        Self { tags, ..self }
    }

    pub fn with_node_type(self, node_type: NodeType) -> Self {
        Self { node_type, ..self }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_node_type_display() {
        assert_eq!(NodeType::Folder.to_string(), "folder");
        assert_eq!(NodeType::File.to_string(), "file");
        assert_eq!(NodeType::Canvas.to_string(), "canvas");
        assert_eq!(NodeType::Diary.to_string(), "diary");
        assert_eq!(NodeType::Drawing.to_string(), "drawing");
    }

    #[test]
    fn test_node_type_from_str() {
        assert_eq!("folder".parse::<NodeType>().unwrap(), NodeType::Folder);
        assert_eq!("file".parse::<NodeType>().unwrap(), NodeType::File);
        assert_eq!("canvas".parse::<NodeType>().unwrap(), NodeType::Canvas);
        assert_eq!("diary".parse::<NodeType>().unwrap(), NodeType::Diary);
        assert_eq!("drawing".parse::<NodeType>().unwrap(), NodeType::Drawing);
    }

    #[test]
    fn test_node_response_with_methods() {
        let response = NodeResponse {
            id: "node-1".into(),
            workspace_id: "ws-1".into(),
            parent_id: None,
            node_type: NodeType::File,
            title: "Original".into(),
            sort_order: 0,
            is_collapsed: false,
            tags: None,
            created_at: 0,
            updated_at: 0,
        };

        let updated = response.with_title("Updated");
        assert_eq!(updated.title, "Updated");
        assert_eq!(updated.id, "node-1"); // ID 不变
    }
}
