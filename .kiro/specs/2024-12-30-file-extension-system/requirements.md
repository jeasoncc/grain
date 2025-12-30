# Requirements Document

## Introduction

为所有文件类型添加后缀名，实现扩展名驱动的编辑器选择机制。用户可以通过修改文件后缀名来切换使用的编辑器。

## Glossary

- **File_Extension**: 文件后缀名，如 `.grain`、`.excalidraw`、`.mermaid`、`.js`
- **Extension_Map**: 扩展名到编辑器类型的映射函数
- **Editor_Type**: 编辑器类型枚举，包括 lexical、excalidraw、diagram、code
- **Node_Title**: 节点标题，包含文件名和后缀名
- **Template_Config**: 模板配置，定义文件创建时的默认后缀名

## Requirements

### Requirement 1: 文件后缀名定义

**User Story:** As a user, I want files to have meaningful extensions, so that I can identify file types at a glance.

#### Acceptance Criteria

1. THE diary, wiki, todo, note, ledger, file types SHALL use `.grain` extension
2. THE drawing type SHALL use `.excalidraw` extension
3. THE mermaid type SHALL use `.mermaid` extension
4. THE plantuml type SHALL use `.plantuml` extension
5. THE code type SHALL use `.js` as default extension (user can change to .ts, .py, .json, etc.)

### Requirement 2: 扩展名到编辑器映射

**User Story:** As a developer, I want a pure function to determine editor type from filename, so that editor selection is consistent and testable.

#### Acceptance Criteria

1. THE Extension_Map function SHALL accept a filename string and return an Editor_Type
2. WHEN filename ends with `.grain`, THE Extension_Map SHALL return "lexical"
3. WHEN filename ends with `.excalidraw`, THE Extension_Map SHALL return "excalidraw"
4. WHEN filename ends with `.mermaid` or `.plantuml`, THE Extension_Map SHALL return "diagram"
5. WHEN filename ends with code extensions (.js, .ts, .py, .json, .md, .html, .css, .sql, .sh, .yaml, .yml), THE Extension_Map SHALL return "code"
6. WHEN filename has unknown extension, THE Extension_Map SHALL return "code" as fallback

### Requirement 3: 模板配置更新

**User Story:** As a user, I want newly created files to have correct extensions, so that they work with the right editor immediately.

#### Acceptance Criteria

1. WHEN creating a diary file, THE Template_Config SHALL generate title with `.grain` extension
2. WHEN creating a wiki file, THE Template_Config SHALL generate title with `.grain` extension
3. WHEN creating a todo file, THE Template_Config SHALL generate title with `.grain` extension
4. WHEN creating a note file, THE Template_Config SHALL generate title with `.grain` extension
5. WHEN creating a ledger file, THE Template_Config SHALL generate title with `.grain` extension
6. WHEN creating a drawing file, THE Template_Config SHALL generate title with `.excalidraw` extension
7. WHEN creating a mermaid file, THE Template_Config SHALL generate title with `.mermaid` extension
8. WHEN creating a plantuml file, THE Template_Config SHALL generate title with `.plantuml` extension

### Requirement 4: 文件重命名支持

**User Story:** As a user, I want to change file extension to switch editors, so that I have flexibility in how I edit content.

#### Acceptance Criteria

1. WHEN user renames a file and changes extension, THE system SHALL use the new extension to determine editor
2. WHEN user renames `.grain` to `.md`, THE system SHALL open with code editor
3. WHEN user renames `.js` to `.ts`, THE system SHALL continue using code editor with TypeScript syntax
4. THE file tree SHALL display the full filename including extension

### Requirement 5: Monaco 语言检测

**User Story:** As a user, I want code files to have correct syntax highlighting based on extension, so that I can read and write code easily.

#### Acceptance Criteria

1. THE Monaco_Language_Map function SHALL accept a filename and return Monaco language identifier
2. WHEN filename ends with `.js`, THE Monaco_Language_Map SHALL return "javascript"
3. WHEN filename ends with `.ts`, THE Monaco_Language_Map SHALL return "typescript"
4. WHEN filename ends with `.py`, THE Monaco_Language_Map SHALL return "python"
5. WHEN filename ends with `.json`, THE Monaco_Language_Map SHALL return "json"
6. WHEN filename ends with `.md`, THE Monaco_Language_Map SHALL return "markdown"
7. WHEN filename ends with `.html`, THE Monaco_Language_Map SHALL return "html"
8. WHEN filename ends with `.css`, THE Monaco_Language_Map SHALL return "css"
9. WHEN filename ends with `.sql`, THE Monaco_Language_Map SHALL return "sql"
10. WHEN filename ends with `.sh`, THE Monaco_Language_Map SHALL return "shell"
11. WHEN filename ends with `.yaml` or `.yml`, THE Monaco_Language_Map SHALL return "yaml"
12. WHEN filename has unknown extension, THE Monaco_Language_Map SHALL return "plaintext"
