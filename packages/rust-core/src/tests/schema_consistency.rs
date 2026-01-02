//! 数据库 Schema 一致性测试
//!
//! Property 5: Database Schema Consistency
//! 验证 Response 类型的序列化一致性和字段映射

#[cfg(test)]
mod tests {
    use crate::types::{
        ContentResponse, ContentType, NodeResponse, NodeType, WorkspaceResponse,
    };

    /// 验证 WorkspaceResponse 序列化使用 camelCase
    #[test]
    fn workspace_response_uses_camel_case() {
        let response = WorkspaceResponse {
            id: "test-id".to_string(),
            title: "Test Workspace".to_string(),
            author: "Author".to_string(),
            description: "Description".to_string(),
            publisher: "Publisher".to_string(),
            language: "zh".to_string(),
            last_open: 1234567890,
            created_at: 1234567890,
            updated_at: 1234567890,
            members: None,
            owner: None,
        };

        let json = serde_json::to_string(&response).unwrap();

        // 验证使用 camelCase
        assert!(json.contains("lastOpen"), "应使用 lastOpen 而非 last_open");
        assert!(json.contains("createdAt"), "应使用 createdAt 而非 created_at");
        assert!(json.contains("updatedAt"), "应使用 updatedAt 而非 updated_at");

        // 验证不使用 snake_case
        assert!(!json.contains("last_open"), "不应使用 snake_case");
        assert!(!json.contains("created_at"), "不应使用 snake_case");
        assert!(!json.contains("updated_at"), "不应使用 snake_case");
    }

    /// 验证 NodeResponse 序列化使用 camelCase
    #[test]
    fn node_response_uses_camel_case() {
        let response = NodeResponse {
            id: "node-id".to_string(),
            workspace_id: "workspace-id".to_string(),
            parent_id: Some("parent-id".to_string()),
            node_type: NodeType::File,
            title: "Test Node".to_string(),
            sort_order: 0,
            is_collapsed: false,
            tags: None,
            created_at: 1234567890,
            updated_at: 1234567890,
        };

        let json = serde_json::to_string(&response).unwrap();

        // 验证使用 camelCase
        assert!(json.contains("workspaceId"), "应使用 workspaceId");
        assert!(json.contains("parentId"), "应使用 parentId");
        assert!(json.contains("nodeType"), "应使用 nodeType");
        assert!(json.contains("sortOrder"), "应使用 sortOrder");
        assert!(json.contains("isCollapsed"), "应使用 isCollapsed");
        assert!(json.contains("createdAt"), "应使用 createdAt");
        assert!(json.contains("updatedAt"), "应使用 updatedAt");

        // 验证不使用 snake_case
        assert!(!json.contains("workspace_id"), "不应使用 snake_case");
        assert!(!json.contains("parent_id"), "不应使用 snake_case");
        assert!(!json.contains("node_type"), "不应使用 snake_case");
    }

    /// 验证 ContentResponse 序列化使用 camelCase
    #[test]
    fn content_response_uses_camel_case() {
        let response = ContentResponse {
            id: "content-id".to_string(),
            node_id: "node-id".to_string(),
            content: "{}".to_string(),
            content_type: ContentType::Lexical,
            version: 1,
            created_at: 1234567890,
            updated_at: 1234567890,
        };

        let json = serde_json::to_string(&response).unwrap();

        // 验证使用 camelCase
        assert!(json.contains("nodeId"), "应使用 nodeId");
        assert!(json.contains("contentType"), "应使用 contentType");
        assert!(json.contains("createdAt"), "应使用 createdAt");
        assert!(json.contains("updatedAt"), "应使用 updatedAt");

        // 验证不使用 snake_case
        assert!(!json.contains("node_id"), "不应使用 snake_case");
        assert!(!json.contains("content_type"), "不应使用 snake_case");
    }

    /// 验证 NodeType 枚举序列化为小写字符串
    #[test]
    fn node_type_serializes_to_lowercase() {
        let types = vec![
            (NodeType::File, "\"file\""),
            (NodeType::Folder, "\"folder\""),
            (NodeType::Diary, "\"diary\""),
            (NodeType::Canvas, "\"canvas\""),
            (NodeType::Drawing, "\"drawing\""),
        ];

        for (node_type, expected) in types {
            let json = serde_json::to_string(&node_type).unwrap();
            assert_eq!(json, expected, "NodeType::{:?} 应序列化为 {}", node_type, expected);
        }
    }

    /// 验证 NodeType 字符串解析
    #[test]
    fn node_type_parses_from_string() {
        let cases = vec![
            ("file", NodeType::File),
            ("folder", NodeType::Folder),
            ("diary", NodeType::Diary),
            ("canvas", NodeType::Canvas),
            ("drawing", NodeType::Drawing),
            ("FILE", NodeType::File),     // 大小写不敏感
            ("Folder", NodeType::Folder), // 大小写不敏感
        ];

        for (input, expected) in cases {
            let parsed: NodeType = input.parse().unwrap();
            assert_eq!(parsed, expected, "\"{}\" 应解析为 {:?}", input, expected);
        }
    }

    /// 验证 ContentType 枚举序列化为小写字符串
    #[test]
    fn content_type_serializes_to_lowercase() {
        let types = vec![
            (ContentType::Lexical, "\"lexical\""),
            (ContentType::Excalidraw, "\"excalidraw\""),
            (ContentType::Text, "\"text\""),
        ];

        for (content_type, expected) in types {
            let json = serde_json::to_string(&content_type).unwrap();
            assert_eq!(json, expected, "ContentType::{:?} 应序列化为 {}", content_type, expected);
        }
    }

    /// 验证 WorkspaceResponse 不可变更新方法
    #[test]
    fn workspace_response_immutable_update() {
        let original = WorkspaceResponse {
            id: "ws-1".to_string(),
            title: "Original".to_string(),
            author: "".to_string(),
            description: "".to_string(),
            publisher: "".to_string(),
            language: "zh".to_string(),
            last_open: 0,
            created_at: 100,
            updated_at: 100,
            members: None,
            owner: None,
        };

        let updated = original.with_title("Updated").with_author("New Author");

        assert_eq!(updated.title, "Updated");
        assert_eq!(updated.author, "New Author");
        assert_eq!(updated.id, "ws-1"); // ID 不变
        assert_eq!(updated.created_at, 100); // 其他字段不变
    }

    /// 验证 NodeResponse 不可变更新方法
    #[test]
    fn node_response_immutable_update() {
        let original = NodeResponse {
            id: "node-1".to_string(),
            workspace_id: "ws-1".to_string(),
            parent_id: None,
            node_type: NodeType::File,
            title: "Original".to_string(),
            sort_order: 0,
            is_collapsed: false,
            tags: None,
            created_at: 100,
            updated_at: 100,
        };

        let updated = original
            .with_title("Updated")
            .with_parent_id(Some("parent-1".to_string()))
            .with_sort_order(5);

        assert_eq!(updated.title, "Updated");
        assert_eq!(updated.parent_id, Some("parent-1".to_string()));
        assert_eq!(updated.sort_order, 5);
        assert_eq!(updated.id, "node-1"); // ID 不变
        assert_eq!(updated.workspace_id, "ws-1"); // workspace_id 不变
    }

    /// 验证 ContentResponse 不可变更新方法
    #[test]
    fn content_response_immutable_update() {
        let original = ContentResponse {
            id: "content-1".to_string(),
            node_id: "node-1".to_string(),
            content: "original".to_string(),
            content_type: ContentType::Lexical,
            version: 1,
            created_at: 100,
            updated_at: 100,
        };

        let updated = original.with_content("updated").with_version(2);

        assert_eq!(updated.content, "updated");
        assert_eq!(updated.version, 2);
        assert_eq!(updated.id, "content-1"); // ID 不变
        assert_eq!(updated.node_id, "node-1"); // node_id 不变
    }

    /// 验证 Optional 字段正确序列化
    #[test]
    fn optional_fields_serialize_correctly() {
        // 有值的情况
        let with_values = NodeResponse {
            id: "node-1".to_string(),
            workspace_id: "ws-1".to_string(),
            parent_id: Some("parent-1".to_string()),
            node_type: NodeType::File,
            title: "Test".to_string(),
            sort_order: 0,
            is_collapsed: false,
            tags: Some(vec!["tag1".to_string(), "tag2".to_string()]),
            created_at: 100,
            updated_at: 100,
        };

        let json = serde_json::to_string(&with_values).unwrap();
        assert!(json.contains("\"parentId\":\"parent-1\""));
        assert!(json.contains("\"tags\":[\"tag1\",\"tag2\"]"));

        // 无值的情况
        let without_values = NodeResponse {
            id: "node-2".to_string(),
            workspace_id: "ws-1".to_string(),
            parent_id: None,
            node_type: NodeType::Folder,
            title: "Test".to_string(),
            sort_order: 0,
            is_collapsed: true,
            tags: None,
            created_at: 100,
            updated_at: 100,
        };

        let json = serde_json::to_string(&without_values).unwrap();
        assert!(json.contains("\"parentId\":null"));
        assert!(json.contains("\"tags\":null"));
    }
}
