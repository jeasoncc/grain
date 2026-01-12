# Implementation Plan: Biome to ESLint Migration

## Overview

将 Grain 项目从 Biome 完全迁移到 ESLint，统一代码检查和格式化工具链。

## Tasks

- [x] 1. 准备和备份
  - 创建迁移分支 `feat/migrate-to-eslint`
  - 确保当前所有测试通过
  - 备份当前配置文件
  - _Requirements: 8.1, 8.5_

- [ ] 2. 移除 Biome 依赖和配置
  - [ ] 2.1 从根目录 package.json 移除 @biomejs/biome
    - 运行 `bun remove @biomejs/biome`
    - _Requirements: 1.1_
  
  - [ ] 2.2 从所有子项目移除 Biome 依赖
    - 检查 apps/*/package.json
    - 检查 packages/*/package.json
    - _Requirements: 1.1_
  
  - [ ] 2.3 删除 Biome 配置文件
    - 删除根目录 biome.json
    - 删除子项目中的 biome.json
    - _Requirements: 1.2_
  
  - [ ] 2.4 清理 node_modules 和重新安装
    - 运行 `rm -rf node_modules`
    - 运行 `bun install`
    - 验证 @biomejs/biome 不在 node_modules 中
    - _Requirements: 1.3, 1.4_

- [ ] 3. 创建 ESLint 配置
  - [ ] 3.1 创建根目录 eslint.config.js
    - 使用 Flat Config 格式
    - 导入 eslint-plugin-grain
    - 配置 @typescript-eslint/parser
    - 启用 strict 预设
    - _Requirements: 2.1, 2.2, 2.5_
  
  - [ ] 3.2 配置文件匹配模式
    - 包含 **/*.ts, **/*.tsx, **/*.js, **/*.jsx
    - 排除 node_modules, dist, build, .next, coverage
    - _Requirements: 2.3_
  
  - [ ] 3.3 配置语言选项
    - 设置 ecmaVersion: 2022
    - 设置 sourceType: 'module'
    - 启用 JSX 支持
    - _Requirements: 2.5_
  
  - [ ] 3.4 启用所有 eslint-plugin-grain 规则
    - 使用 grainPlugin.configs.strict.rules
    - 验证 50+ 规则都已启用
    - _Requirements: 2.4_

- [ ] 4. 更新 Package Scripts
  - [ ] 4.1 更新根目录 package.json scripts
    - 添加 `lint`: `eslint . --ext .ts,.tsx,.js,.jsx`
    - 添加 `lint:fix`: `eslint . --ext .ts,.tsx,.js,.jsx --fix`
    - 添加 `format`: `eslint . --ext .ts,.tsx,.js,.jsx --fix`
    - 更新 `check`: `bun run lint && bun run type-check`
    - _Requirements: 4.1, 4.2, 4.3, 4.4_
  
  - [ ] 4.2 移除 Biome 相关 scripts
    - 删除 `biome:check`
    - 删除 `biome:fix`
    - 删除所有 Biome 引用
    - _Requirements: 4.5_
  
  - [ ] 4.3 更新子项目 scripts
    - 更新 apps/desktop/package.json
    - 更新 apps/web/package.json
    - 更新其他子项目
    - _Requirements: 4.1, 4.2, 4.3_

- [ ] 5. 配置 Git Hooks
  - [ ] 5.1 安装 lint-staged
    - 运行 `bun add -D lint-staged`
    - _Requirements: 6.5_
  
  - [ ] 5.2 配置 lint-staged
    - 在 package.json 添加 lint-staged 配置
    - 配置对 *.{ts,tsx,js,jsx} 运行 eslint --fix
    - _Requirements: 6.1, 6.2_
  
  - [ ] 5.3 配置 pre-commit hook
    - 使用 simple-git-hooks 或 husky
    - 配置运行 lint-staged
    - _Requirements: 6.3, 6.4_
  
  - [ ] 5.4 测试 Git hooks
    - 创建测试提交
    - 验证 hook 运行
    - 验证错误时阻止提交
    - _Requirements: 6.3_

- [ ] 6. 更新 CI/CD 配置
  - [ ] 6.1 更新 GitHub Actions lint workflow
    - 修改 .github/workflows/lint.yml
    - 替换 Biome 步骤为 ESLint
    - 运行 `bun run lint`
    - _Requirements: 7.1_
  
  - [ ] 6.2 配置 lint 失败时 CI 失败
    - 确保 lint 错误导致 workflow 失败
    - _Requirements: 7.2_
  
  - [ ] 6.3 移除 Biome 相关 CI 步骤
    - 删除所有 Biome 检查
    - _Requirements: 7.3_
  
  - [ ] 6.4 配置 PR 自动检查
    - 确保 PR 触发 lint workflow
    - _Requirements: 7.4, 7.5_

- [ ] 7. 更新 Steering 文档
  - [ ] 7.1 更新 .kiro/steering/tech.md
    - 移除 Biome 引用
    - 添加 ESLint + eslint-plugin-grain
    - 更新代码检查工具说明
    - _Requirements: 5.1, 5.2_
  
  - [ ] 7.2 更新 .kiro/steering/workflow.md
    - 更新 Git 提交规范中的 lint 说明
    - 说明使用 ESLint 进行检查和格式化
    - _Requirements: 5.3_
  
  - [ ] 7.3 更新 .kiro/steering/code-standards.md（如果存在）
    - 引用 eslint-plugin-grain 规则
    - 提供规则使用示例
    - _Requirements: 5.4_
  
  - [ ] 7.4 创建 ESLint 使用指南
    - 在 docs/ 创建 eslint-guide.md
    - 说明如何运行 lint
    - 说明如何修复错误
    - 说明如何禁用规则（不推荐）
    - _Requirements: 5.5, 10.1, 10.2, 10.3_

- [ ] 8. 更新项目文档
  - [ ] 8.1 更新根目录 README.md
    - 添加 ESLint 使用说明
    - 更新开发工作流说明
    - _Requirements: 10.1_
  
  - [ ] 8.2 创建迁移文档
    - 在 docs/ 创建 biome-to-eslint-migration.md
    - 说明迁移原因
    - 说明迁移步骤
    - 说明如何回滚（如果需要）
    - _Requirements: 10.2_
  
  - [ ] 8.3 更新贡献指南
    - 更新 CONTRIBUTING.md（如果存在）
    - 说明代码规范检查流程
    - _Requirements: 10.3_

- [ ] 9. 性能优化
  - [ ] 9.1 配置 ESLint 缓存
    - 在 scripts 中添加 --cache 选项
    - 配置 .eslintcache 位置
    - 添加 .eslintcache 到 .gitignore
    - _Requirements: 9.2_
  
  - [ ] 9.2 配置 ignore 模式
    - 确保忽略 node_modules
    - 确保忽略 dist, build, .next
    - 确保忽略 coverage
    - _Requirements: 9.4_
  
  - [ ] 9.3 测试性能
    - 运行 `time bun run lint`
    - 验证在 10 秒内完成
    - 如果太慢，考虑优化
    - _Requirements: 9.1, 9.3_

- [ ] 10. 验证和测试
  - [ ] 10.1 运行 lint 命令
    - 运行 `bun run lint`
    - 验证成功检查所有文件
    - _Requirements: 8.1_
  
  - [ ] 10.2 运行 lint:fix 命令
    - 运行 `bun run lint:fix`
    - 验证自动修复问题
    - _Requirements: 8.2_
  
  - [ ] 10.3 运行 format 命令
    - 运行 `bun run format`
    - 验证格式化所有文件
    - _Requirements: 8.3_
  
  - [ ] 10.4 测试 Git hooks
    - 创建测试提交
    - 验证 pre-commit hook 运行
    - _Requirements: 8.4_
  
  - [ ] 10.5 运行所有测试
    - 运行 `bun test`
    - 验证所有测试通过
    - _Requirements: 8.5_
  
  - [ ] 10.6 验证 CI 流程
    - 推送到远程分支
    - 创建 PR
    - 验证 CI 运行 lint 检查
    - _Requirements: 7.1, 7.4_

- [ ] 11. 清理和提交
  - [ ] 11.1 清理临时文件
    - 删除备份文件
    - 删除测试文件
    - _Requirements: 8.1_
  
  - [ ] 11.2 提交更改
    - 运行 `git add -A`
    - 运行 `git commit -m "feat: migrate from Biome to ESLint"`
    - _Requirements: 8.4_
  
  - [ ] 11.3 创建 Pull Request
    - 推送分支到远程
    - 创建 PR
    - 添加详细的 PR 描述
    - _Requirements: 7.4, 7.5_
  
  - [ ] 11.4 等待 Review 和合并
    - 等待 CI 通过
    - 等待 code review
    - 合并到 main 分支
    - _Requirements: 7.5_

- [ ] 12. 最终验证
  - 在 main 分支验证所有功能正常
  - 确认所有开发者能够正常使用
  - 监控是否有问题报告
  - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5_

## Notes

- **所有任务都是必需的，没有可选任务**
- 迁移过程应该在一个独立的分支进行
- 每个步骤完成后应该提交，便于回滚
- 如果遇到问题，可以参考设计文档中的回滚计划
- 迁移完成后，应该通知所有团队成员
- 建议在低峰期进行迁移，避免影响开发
