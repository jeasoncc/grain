//! Node 实体定义
//!
//! 节点是文件树的基本单元，可以是文件夹或各种类型的文件

use sea_orm::entity::prelude::*;
use serde::{Deserialize, Serialize};

/// 节点类型枚举
#[derive(Clone, Debug, PartialEq, Eq, EnumIter, DeriveActiveEnum, Serialize, Deserialize)]
#[sea_orm(rs_type = "String", db_type = "Text")]
pub enum NodeType {
    /// 文件夹
    #[sea_orm(string_value = "folder")]
    Folder,

    /// 普通文件
    #[sea_orm(string_value = "file")]
    File,

    /// 日记
    #[sea_orm(string_value = "diary")]
    Diary,

    /// 绘图 (Excalidraw)
    #[sea_orm(string_value = "drawing")]
    Drawing,

    /// 画布
    #[sea_orm(string_value = "canvas")]
    Canvas,
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
            NodeType::Diary => write!(f, "diary"),
            NodeType::Drawing => write!(f, "drawing"),
            NodeType::Canvas => write!(f, "canvas"),
        }
    }
}

impl std::str::FromStr for NodeType {
    type Err = String;

    fn from_str(s: &str) -> Result<Self, Self::Err> {
        match s {
            "folder" => Ok(NodeType::Folder),
            "file" => Ok(NodeType::File),
            "diary" => Ok(NodeType::Diary),
            "drawing" => Ok(NodeType::Drawing),
            "canvas" => Ok(NodeType::Canvas),
            _ => Err(format!("未知的节点类型: {}", s)),
        }
    }
}

/// Node 实体定义
#[derive(Clone, Debug, PartialEq, Eq, DeriveEntityModel, Serialize, Deserialize)]
#[sea_orm(table_name = "nodes")]
pub struct Model {
    /// 节点 ID (UUID)
    #[sea_orm(primary_key, auto_increment = false)]
    pub id: String,

    /// 所属工作区 ID
    pub workspace_id: String,

    /// 父节点 ID (根节点为 None)
    #[sea_orm(nullable)]
    pub parent_id: Option<String>,

    /// 节点标题
    pub title: String,

    /// 节点类型
    pub node_type: NodeType,

    /// 是否折叠 (仅对文件夹有效)
    pub is_collapsed: bool,

    /// 排序顺序
    pub sort_order: i32,

    /// 标签 (JSON 数组)
    #[sea_orm(column_type = "Text", nullable)]
    pub tags: Option<String>,

    /// 创建时间戳 (毫秒)
    pub created_at: i64,

    /// 更新时间戳 (毫秒)
    pub updated_at: i64,
}

/// 关系定义
#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {
    /// 节点属于一个工作区
    #[sea_orm(
        belongs_to = "super::workspace::Entity",
        from = "Column::WorkspaceId",
        to = "super::workspace::Column::Id"
    )]
    Workspace,

    /// 节点有一个内容
    #[sea_orm(has_one = "super::content::Entity")]
    Content,
}

impl Related<super::workspace::Entity> for Entity {
    fn to() -> RelationDef {
        Relation::Workspace.def()
    }
}

impl Related<super::content::Entity> for Entity {
    fn to() -> RelationDef {
        Relation::Content.def()
    }
}

impl ActiveModelBehavior for ActiveModel {}
