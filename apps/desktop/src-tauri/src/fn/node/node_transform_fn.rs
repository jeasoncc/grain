//! Node 转换纯函数
//!
//! 包含节点数据转换的纯函数

use crate::types::node::{node_entity, NodeType};

// ============================================================================
// 转换函数
// ============================================================================

/// 转换节点标题（去除首尾空白）
pub fn transform_title(title: &str) -> String {
    title.trim().to_string()
}

/// 检查节点类型是否需要内容
pub fn node_type_needs_content(node_type: &NodeType) -> bool {
    *node_type != NodeType::Folder
}

/// 生成节点副本标题
pub fn generate_copy_title(original_title: &str) -> String {
    format!("{} (副本)", original_title)
}

/// 从 Model 提取标签列表
pub fn extract_tags(model: &node_entity::Model) -> Option<Vec<String>> {
    model
        .tags
        .as_ref()
        .and_then(|t| serde_json::from_str(t).ok())
}

/// 将标签列表序列化为 JSON 字符串
pub fn serialize_tags(tags: &[String]) -> Option<String> {
    if tags.is_empty() {
        None
    } else {
        serde_json::to_string(tags).ok()
    }
}

/// 检查节点是否为文件夹
pub fn is_folder(node: &node_entity::Model) -> bool {
    node.node_type == NodeType::Folder
}

/// 检查节点是否为根节点
pub fn is_root_node(node: &node_entity::Model) -> bool {
    node.parent_id.is_none()
}

// ============================================================================
// 测试
// ============================================================================

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_transform_title_trims_whitespace() {
        assert_eq!(transform_title("  hello  "), "hello");
    }

    #[test]
    fn test_transform_title_empty_string() {
        assert_eq!(transform_title(""), "");
    }

    #[test]
    fn test_transform_title_preserves_inner_spaces() {
        assert_eq!(transform_title("  hello world  "), "hello world");
    }

    #[test]
    fn test_node_type_needs_content_file() {
        assert!(node_type_needs_content(&NodeType::File));
    }

    #[test]
    fn test_node_type_needs_content_folder() {
        assert!(!node_type_needs_content(&NodeType::Folder));
    }

    #[test]
    fn test_node_type_needs_content_diary() {
        assert!(node_type_needs_content(&NodeType::Diary));
    }

    #[test]
    fn test_node_type_needs_content_canvas() {
        assert!(node_type_needs_content(&NodeType::Canvas));
    }

    #[test]
    fn test_generate_copy_title() {
        assert_eq!(generate_copy_title("我的文档"), "我的文档 (副本)");
    }

    #[test]
    fn test_serialize_tags_empty() {
        let tags: Vec<String> = vec![];
        assert_eq!(serialize_tags(&tags), None);
    }

    #[test]
    fn test_serialize_tags_non_empty() {
        let tags = vec!["tag1".to_string(), "tag2".to_string()];
        let result = serialize_tags(&tags);
        assert!(result.is_some());
        assert_eq!(result.unwrap(), r#"["tag1","tag2"]"#);
    }

    #[test]
    fn test_extract_tags_none() {
        let model = node_entity::Model {
            id: "1".to_string(),
            workspace_id: "ws".to_string(),
            parent_id: None,
            title: "test".to_string(),
            node_type: NodeType::File,
            is_collapsed: false,
            sort_order: 0,
            tags: None,
            created_at: 0,
            updated_at: 0,
        };
        assert_eq!(extract_tags(&model), None);
    }

    #[test]
    fn test_extract_tags_valid_json() {
        let model = node_entity::Model {
            id: "1".to_string(),
            workspace_id: "ws".to_string(),
            parent_id: None,
            title: "test".to_string(),
            node_type: NodeType::File,
            is_collapsed: false,
            sort_order: 0,
            tags: Some(r#"["tag1","tag2"]"#.to_string()),
            created_at: 0,
            updated_at: 0,
        };
        let tags = extract_tags(&model);
        assert!(tags.is_some());
        assert_eq!(tags.unwrap(), vec!["tag1", "tag2"]);
    }

    #[test]
    fn test_extract_tags_invalid_json() {
        let model = node_entity::Model {
            id: "1".to_string(),
            workspace_id: "ws".to_string(),
            parent_id: None,
            title: "test".to_string(),
            node_type: NodeType::File,
            is_collapsed: false,
            sort_order: 0,
            tags: Some("invalid json".to_string()),
            created_at: 0,
            updated_at: 0,
        };
        assert_eq!(extract_tags(&model), None);
    }

    #[test]
    fn test_is_folder_true() {
        let model = node_entity::Model {
            id: "1".to_string(),
            workspace_id: "ws".to_string(),
            parent_id: None,
            title: "test".to_string(),
            node_type: NodeType::Folder,
            is_collapsed: false,
            sort_order: 0,
            tags: None,
            created_at: 0,
            updated_at: 0,
        };
        assert!(is_folder(&model));
    }

    #[test]
    fn test_is_folder_false() {
        let model = node_entity::Model {
            id: "1".to_string(),
            workspace_id: "ws".to_string(),
            parent_id: None,
            title: "test".to_string(),
            node_type: NodeType::File,
            is_collapsed: false,
            sort_order: 0,
            tags: None,
            created_at: 0,
            updated_at: 0,
        };
        assert!(!is_folder(&model));
    }

    #[test]
    fn test_is_root_node_true() {
        let model = node_entity::Model {
            id: "1".to_string(),
            workspace_id: "ws".to_string(),
            parent_id: None,
            title: "test".to_string(),
            node_type: NodeType::File,
            is_collapsed: false,
            sort_order: 0,
            tags: None,
            created_at: 0,
            updated_at: 0,
        };
        assert!(is_root_node(&model));
    }

    #[test]
    fn test_is_root_node_false() {
        let model = node_entity::Model {
            id: "1".to_string(),
            workspace_id: "ws".to_string(),
            parent_id: Some("parent".to_string()),
            title: "test".to_string(),
            node_type: NodeType::File,
            is_collapsed: false,
            sort_order: 0,
            tags: None,
            created_at: 0,
            updated_at: 0,
        };
        assert!(!is_root_node(&model));
    }
}
