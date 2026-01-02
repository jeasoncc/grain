//! Attachment SeaORM Entity
//!
//! 附件数据库实体定义

use sea_orm::entity::prelude::*;
use serde::{Deserialize, Serialize};

/// 附件类型
#[derive(Debug, Clone, Copy, PartialEq, Eq, EnumIter, DeriveActiveEnum, Serialize, Deserialize)]
#[sea_orm(rs_type = "String", db_type = "Text")]
#[serde(rename_all = "lowercase")]
pub enum AttachmentType {
    #[sea_orm(string_value = "image")]
    Image,

    #[sea_orm(string_value = "audio")]
    Audio,

    #[sea_orm(string_value = "file")]
    File,
}

impl Default for AttachmentType {
    fn default() -> Self {
        Self::File
    }
}

/// 附件实体
#[derive(Clone, Debug, PartialEq, Eq, DeriveEntityModel)]
#[sea_orm(table_name = "attachments")]
pub struct Model {
    /// 附件 ID (UUID)
    #[sea_orm(primary_key, auto_increment = false)]
    pub id: String,

    /// 关联的项目/工作区 ID
    pub project_id: Option<String>,

    /// 附件类型
    pub attachment_type: AttachmentType,

    /// 原始文件名
    pub file_name: String,

    /// 文件存储路径
    pub file_path: String,

    /// 上传时间戳（毫秒）
    pub uploaded_at: i64,

    /// 文件大小（字节）
    pub size: Option<i64>,

    /// MIME 类型
    pub mime_type: Option<String>,
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {}

impl ActiveModelBehavior for ActiveModel {}
