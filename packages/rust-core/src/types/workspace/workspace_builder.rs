//! Workspace Builder
//!
//! 实现 Builder 模式用于创建 Workspace 请求对象。
//! 提供链式方法的流畅 API。

use super::workspace_interface::{CreateWorkspaceRequest, UpdateWorkspaceRequest};

// ============================================================================
// CreateWorkspaceRequest Builder
// ============================================================================

/// Workspace 创建请求 Builder
///
/// 提供流畅的 API 用于构建 CreateWorkspaceRequest：
/// - 可选属性的合理默认值
/// - 方法链式调用，代码清晰易读
/// - build() 时进行校验
#[derive(Debug, Clone, Default)]
pub struct WorkspaceBuilder {
    title: Option<String>,
    author: Option<String>,
    description: Option<String>,
    publisher: Option<String>,
    language: Option<String>,
    members: Option<Vec<String>>,
    owner: Option<String>,
    // 用于更新操作
    last_open: Option<i64>,
}

impl WorkspaceBuilder {
    /// 创建新的 Builder
    pub fn new() -> Self {
        Self::default()
    }

    /// 设置标题（必填）
    pub fn title(mut self, title: impl Into<String>) -> Self {
        self.title = Some(title.into());
        self
    }

    /// 设置作者
    pub fn author(mut self, author: impl Into<String>) -> Self {
        self.author = Some(author.into());
        self
    }

    /// 设置描述
    pub fn description(mut self, description: impl Into<String>) -> Self {
        self.description = Some(description.into());
        self
    }

    /// 设置出版商
    pub fn publisher(mut self, publisher: impl Into<String>) -> Self {
        self.publisher = Some(publisher.into());
        self
    }

    /// 设置语言
    pub fn language(mut self, language: impl Into<String>) -> Self {
        self.language = Some(language.into());
        self
    }

    /// 设置团队成员
    pub fn members(mut self, members: Vec<String>) -> Self {
        self.members = Some(members);
        self
    }

    /// 设置所有者
    pub fn owner(mut self, owner: impl Into<String>) -> Self {
        self.owner = Some(owner.into());
        self
    }

    /// 设置最后打开时间（仅用于更新）
    pub fn last_open(mut self, last_open: i64) -> Self {
        self.last_open = Some(last_open);
        self
    }

    /// 构建 CreateWorkspaceRequest
    pub fn build(self) -> Result<CreateWorkspaceRequest, String> {
        Ok(CreateWorkspaceRequest {
            title: self.title.ok_or("title is required")?,
            author: self.author,
            description: self.description,
            publisher: self.publisher,
            language: self.language,
            members: self.members,
            owner: self.owner,
        })
    }

    /// 构建 UpdateWorkspaceRequest（用于更新操作）
    pub fn build_update(self) -> UpdateWorkspaceRequest {
        UpdateWorkspaceRequest {
            title: self.title,
            author: self.author,
            description: self.description.map(Some),
            publisher: self.publisher,
            language: self.language,
            last_open: self.last_open,
            members: self.members,
            owner: self.owner,
        }
    }

    /// 重置 builder 到初始状态
    pub fn reset(mut self) -> Self {
        self.title = None;
        self.author = None;
        self.description = None;
        self.publisher = None;
        self.language = None;
        self.members = None;
        self.owner = None;
        self.last_open = None;
        self
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_workspace_builder_create() {
        let request = WorkspaceBuilder::new()
            .title("My Workspace")
            .author("Author")
            .description("A test workspace")
            .language("zh")
            .build()
            .unwrap();

        assert_eq!(request.title, "My Workspace");
        assert_eq!(request.author, Some("Author".into()));
        assert_eq!(request.description, Some("A test workspace".into()));
        assert_eq!(request.language, Some("zh".into()));
    }

    #[test]
    fn test_workspace_builder_missing_required() {
        let result = WorkspaceBuilder::new()
            .description("Description only")
            .build();

        assert!(result.is_err());
        assert_eq!(result.unwrap_err(), "title is required");
    }

    #[test]
    fn test_workspace_builder_update() {
        let request = WorkspaceBuilder::new()
            .title("Updated Title")
            .author("New Author")
            .last_open(1234567890)
            .build_update();

        assert_eq!(request.title, Some("Updated Title".into()));
        assert_eq!(request.author, Some("New Author".into()));
        assert_eq!(request.last_open, Some(1234567890));
    }
}
