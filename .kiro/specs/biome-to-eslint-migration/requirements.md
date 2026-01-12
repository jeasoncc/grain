# Requirements Document: Biome to ESLint Migration

## Introduction

将 Grain 项目从 Biome 完全迁移到 ESLint，统一代码检查和格式化工具链。由于我们已经构建了功能完整的 eslint-plugin-grain（50+ 自定义规则），Biome 已经变得冗余。

## Glossary

- **Biome**: 快速的 Rust 编写的 linter + formatter，当前在项目中使用
- **ESLint**: JavaScript/TypeScript linter，我们已经构建了自定义插件
- **eslint-plugin-grain**: 我们的自定义 ESLint 插件，包含 50+ 规则
- **Linting**: 静态代码分析，检查代码质量和规范
- **Formatting**: 代码格式化，统一代码风格

## Requirements

### Requirement 1: 移除 Biome 依赖

**User Story:** 作为开发者，我希望移除 Biome 依赖，以简化工具链并避免工具冲突。

#### Acceptance Criteria

1. WHEN 执行依赖清理 THEN THE System SHALL 从所有 package.json 中移除 @biomejs/biome
2. WHEN 检查项目根目录 THEN THE System SHALL 不存在 biome.json 配置文件
3. WHEN 检查 node_modules THEN THE System SHALL 不包含 @biomejs/biome 包
4. WHEN 执行 bun install THEN THE System SHALL 不下载 Biome 相关依赖

### Requirement 2: 配置 ESLint 作为主要 Linter

**User Story:** 作为开发者，我希望使用 ESLint 作为唯一的代码检查工具，以强制执行 Grain 架构规范。

#### Acceptance Criteria

1. WHEN 项目根目录存在 eslint.config.js THEN THE System SHALL 使用 flat config 格式
2. WHEN ESLint 配置加载 THEN THE System SHALL 使用 eslint-plugin-grain 的 strict 预设
3. WHEN ESLint 运行 THEN THE System SHALL 检查所有 .ts, .tsx, .js, .jsx 文件
4. WHEN ESLint 配置包含规则 THEN THE System SHALL 启用所有 50+ 自定义规则
5. WHEN ESLint 配置指定 parser THEN THE System SHALL 使用 @typescript-eslint/parser

### Requirement 3: 配置 ESLint 作为格式化工具

**User Story:** 作为开发者，我希望使用 ESLint 的自动修复功能进行代码格式化，替代 Biome 的格式化功能。

#### Acceptance Criteria

1. WHEN 执行格式化命令 THEN THE System SHALL 使用 eslint --fix
2. WHEN ESLint 修复代码 THEN THE System SHALL 自动修复可修复的规则违规
3. WHEN 格式化完成 THEN THE System SHALL 保持代码风格一致
4. WHEN 格式化 TypeScript 文件 THEN THE System SHALL 正确处理类型注解
5. WHEN 格式化 React 文件 THEN THE System SHALL 正确处理 JSX 语法

### Requirement 4: 更新 Package Scripts

**User Story:** 作为开发者，我希望使用统一的命令进行代码检查和格式化。

#### Acceptance Criteria

1. WHEN package.json 包含 lint 脚本 THEN THE System SHALL 执行 eslint . --ext .ts,.tsx,.js,.jsx
2. WHEN package.json 包含 lint:fix 脚本 THEN THE System SHALL 执行 eslint . --ext .ts,.tsx,.js,.jsx --fix
3. WHEN package.json 包含 format 脚本 THEN THE System SHALL 执行 eslint . --ext .ts,.tsx,.js,.jsx --fix
4. WHEN package.json 包含 check 脚本 THEN THE System SHALL 执行 lint 和 type-check
5. WHEN 执行 bun run lint THEN THE System SHALL 报告所有代码问题

### Requirement 5: 更新 Steering 文档

**User Story:** 作为开发者，我希望 steering 文档反映最新的工具链决策。

#### Acceptance Criteria

1. WHEN 查看 tech.md THEN THE System SHALL 列出 ESLint 作为代码检查工具
2. WHEN 查看 tech.md THEN THE System SHALL 不提及 Biome
3. WHEN 查看 workflow.md THEN THE System SHALL 说明使用 ESLint 进行检查和格式化
4. WHEN 查看 code-standards.md THEN THE System SHALL 引用 eslint-plugin-grain 规则
5. WHEN 新开发者阅读文档 THEN THE System SHALL 提供清晰的 ESLint 使用指南

### Requirement 6: 更新 Git Hooks

**User Story:** 作为开发者，我希望 Git hooks 使用 ESLint 进行代码检查。

#### Acceptance Criteria

1. WHEN 存在 pre-commit hook THEN THE System SHALL 运行 eslint --fix
2. WHEN pre-commit hook 运行 THEN THE System SHALL 只检查 staged 文件
3. WHEN 代码有 lint 错误 THEN THE System SHALL 阻止提交
4. WHEN 代码可自动修复 THEN THE System SHALL 自动修复并继续提交
5. WHEN hook 配置在 package.json THEN THE System SHALL 使用 lint-staged

### Requirement 7: 更新 CI/CD 流程

**User Story:** 作为开发者，我希望 CI/CD 流程使用 ESLint 进行代码检查。

#### Acceptance Criteria

1. WHEN GitHub Actions 运行 THEN THE System SHALL 执行 bun run lint
2. WHEN CI 检测到 lint 错误 THEN THE System SHALL 失败并报告错误
3. WHEN CI 配置文件存在 THEN THE System SHALL 不包含 Biome 相关步骤
4. WHEN PR 创建 THEN THE System SHALL 自动运行 lint 检查
5. WHEN lint 通过 THEN THE System SHALL 允许合并 PR

### Requirement 8: 验证迁移完整性

**User Story:** 作为开发者，我希望验证迁移后所有功能正常工作。

#### Acceptance Criteria

1. WHEN 运行 bun run lint THEN THE System SHALL 成功检查所有文件
2. WHEN 运行 bun run lint:fix THEN THE System SHALL 自动修复可修复的问题
3. WHEN 运行 bun run format THEN THE System SHALL 格式化所有文件
4. WHEN 提交代码 THEN THE System SHALL 触发 pre-commit hook
5. WHEN 所有测试运行 THEN THE System SHALL 通过所有测试

### Requirement 9: 性能优化

**User Story:** 作为开发者，我希望 ESLint 运行速度足够快，不影响开发体验。

#### Acceptance Criteria

1. WHEN ESLint 运行 THEN THE System SHALL 在 10 秒内完成全项目检查
2. WHEN 使用 --cache 选项 THEN THE System SHALL 缓存检查结果
3. WHEN 只检查修改的文件 THEN THE System SHALL 在 2 秒内完成
4. WHEN 配置 ignore 模式 THEN THE System SHALL 跳过 node_modules, dist, build 目录
5. WHEN 使用并行检查 THEN THE System SHALL 利用多核 CPU

### Requirement 10: 文档和培训

**User Story:** 作为团队成员，我希望了解如何使用新的 ESLint 工具链。

#### Acceptance Criteria

1. WHEN 查看 README.md THEN THE System SHALL 包含 ESLint 使用说明
2. WHEN 查看迁移文档 THEN THE System SHALL 说明迁移原因和步骤
3. WHEN 新开发者加入 THEN THE System SHALL 提供快速上手指南
4. WHEN 遇到 lint 错误 THEN THE System SHALL 提供详细的错误消息和修复建议
5. WHEN 需要自定义规则 THEN THE System SHALL 提供规则开发指南
