//! Attachment DTO 接口定义
//!
//! 定义附件相关的数据传输对象（DTO）

use super::attachment_entity::AttachmentType;
use serde::{Deserialize, Serialize};

// ============================================================================
// 请求 DTO
// ============================================================================

/// 创建附件请求
#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateAttachmentRequest {
    /// 关联的项目/工作区 ID
    pub project_id: Option<String>,

    /// 附件类型
    pub attachment_type: AttachmentType,

    /// 原始文件名
    pub file_name: String,

    /// 文件存储路径
    pub file_path: String,

    /// 文件大小（字节）
    pub size: Option<i64>,

    /// MIME 类型
    pub mime_type: Option<String>,
}

/// 更新附件请求
#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateAttachmentRequest {
    /// 原始文件名
    pub file_name: Option<String>,

    /// 文件存储路径
    pub file_path: Option<String>,

    /// 文件大小（字节）
    pub size: Option<Option<i64>>,

    /// MIME 类型
    pub mime_type: Option<Option<String>>,
}

// ============================================================================
// 响应 DTO
// ============================================================================

/// 附件响应
#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AttachmentResponse {
    /// 附件 ID
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

/// Entity -> DTO 转换
impl From<super::attachment_entity::Model> for AttachmentResponse {
    fn from(model: super::attachment_entity::Model) -> Self {
        Self {
            id: model.id,
            project_id: model.project_id,
            attachment_type: model.attachment_type,
            file_name: model.file_name,
            file_path: model.file_path,
            uploaded_at: model.uploaded_at,
            size: model.size,
            mime_type: model.mime_type,
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_attachment_response_from_model() {
        let model = super::super::attachment_entity::Model {
            id: "att-1".into(),
            project_id: Some("ws-1".into()),
            attachment_type: AttachmentType::Image,
            file_name: "test.png".into(),
            file_path: "/path/to/test.png".into(),
            uploaded_at: 1704067200000,
            size: Some(1024),
            mime_type: Some("image/png".into()),
        };

        let response = AttachmentResponse::from(model);
        assert_eq!(response.id, "att-1");
        assert_eq!(response.file_name, "test.png");
        assert_eq!(response.attachment_type, AttachmentType::Image);
    }
}
