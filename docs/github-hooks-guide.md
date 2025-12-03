# GitHub Hooks 配置指南

本文档介绍项目中配置的所有 GitHub Actions workflows 和自动化功能。

## 📋 目录

- [已配置的 Workflows](#已配置的-workflows)
- [配置要求](#配置要求)
- [使用指南](#使用指南)
- [自定义配置](#自定义配置)

## 已配置的 Workflows

### 1. 🔄 CI/CD 流程

#### CI (ci.yml)
**触发条件**: PR 到 main/develop，push 到 develop
**功能**:
- Lint 检查
- 类型检查
- Web 应用构建
- Desktop 前端构建

#### Deploy Web (deploy-web.yml)
**触发条件**: Push 到 main，修改 apps/web/**
**功能**:
- 构建 Web 应用
- 部署到 GitHub Pages

#### Release Desktop (release-desktop.yml)
**触发条件**: 创建 desktop-v*.*.* tag
**功能**:
- 多平台构建 (Windows, macOS, Linux)
- 创建 GitHub Release
- 上传安装包

### 2. 📦 发布管理

#### Changelog (changelog.yml) ⭐
**触发条件**: Release 发布
**功能**:
- 自动更新 CHANGELOG.md
- 记录版本变更历史

#### Release Notes (release-notes.yml) ⭐
**触发条件**: Release 创建/编辑
**功能**:
- 自动生成详细的发布说明
- 按类型分组提交记录
- 添加统计信息和安装指南

#### AUR Publish (aur-publish.yml) ⭐
**触发条件**: Desktop release 发布
**功能**:
- 自动更新 AUR 包
- 更新 PKGBUILD 版本
- 推送到 AUR 仓库

**需要配置的 Secrets**:
```
AUR_USERNAME: 你的 AUR 用户名
AUR_EMAIL: 你的 AUR 邮箱
AUR_SSH_PRIVATE_KEY: AUR SSH 私钥
```

### 3. 🔍 代码质量

#### Security Audit (security.yml) ⭐
**触发条件**: 每周一、依赖文件变更
**功能**:
- NPM 依赖安全扫描
- Cargo 依赖安全扫描
- 生成安全报告

#### Quality Gate (quality-gate.yml) ⭐
**触发条件**: PR 到 main/develop
**功能**:
- 检查 TODO/FIXME 注释
- 检查 console 语句
- 检查大文件
- Biome 代码质量检查

#### Bundle Size (bundle-size.yml) ⭐
**触发条件**: PR 修改应用代码
**功能**:
- 分析 Web bundle 大小
- 分析 Desktop bundle 大小
- 警告大文件
- PR 评论报告

#### Coverage (coverage.yml)
**触发条件**: PR、push 到 main
**功能**:
- 代码覆盖率检查（待添加测试后启用）
- 上传到 Codecov

### 4. 🏷️ Issue/PR 管理

#### Issue Labeler (issue-labeler.yml) ⭐
**触发条件**: Issue 创建/编辑
**功能**:
- 自动识别 bug
- 自动识别功能请求
- 自动识别文档问题
- 区分 desktop/web 问题

#### PR Checks (pr-checks.yml) ⭐
**触发条件**: PR 创建/更新
**功能**:
- 检查 PR 标题格式
- 根据文件自动打标签
- 计算 PR 大小
- 检测 breaking changes
- 生成 PR 统计信息

#### Stale (stale.yml) ⭐
**触发条件**: 每天定时
**功能**:
- 标记 30 天无活动的 issues
- 标记 14 天无活动的 PRs
- 自动关闭过期项目

#### Greetings (greetings.yml) ⭐
**触发条件**: 首次 issue/PR
**功能**:
- 欢迎新贡献者
- 提供贡献指南链接

### 5. 🔧 依赖管理

#### Dependabot (dependabot.yml) ⭐
**触发条件**: 每周一自动运行
**功能**:
- 自动更新 NPM 依赖
- 自动更新 Cargo 依赖
- 自动更新 GitHub Actions
- 分组小版本更新

## 配置要求

### 必需的 Secrets

为了让所有 workflows 正常工作，需要在 GitHub 仓库设置中配置以下 secrets：

1. **AUR 发布** (可选，如果不发布到 AUR 可跳过):
   ```
   AUR_USERNAME: 你的 AUR 用户名
   AUR_EMAIL: 你的 AUR 邮箱
   AUR_SSH_PRIVATE_KEY: AUR SSH 私钥
   ```

2. **代码覆盖率** (可选):
   ```
   CODECOV_TOKEN: Codecov token
   ```

### 必需的权限

确保 GitHub Actions 有以下权限：
- Settings → Actions → General → Workflow permissions
- 选择 "Read and write permissions"
- 勾选 "Allow GitHub Actions to create and approve pull requests"

### 必需的标签

在仓库中创建以下标签（可选，workflows 会自动创建）：

```
bug, enhancement, documentation, desktop, web
dependencies, ci/cd, automated, aur
size/XS, size/S, size/M, size/L, size/XL
breaking-change, stale, pinned, security, roadmap
work-in-progress, rust
```

## 使用指南

### 发布新版本

#### Desktop 应用发布

1. 更新版本号：
   ```bash
   # 更新 package.json 和 tauri.conf.json 中的版本号
   ```

2. 创建并推送 tag：
   ```bash
   git tag desktop-v0.1.0
   git push origin desktop-v0.1.0
   ```

3. 自动流程：
   - ✅ 构建多平台安装包
   - ✅ 创建 GitHub Release
   - ✅ 生成 Release Notes
   - ✅ 发布到 AUR
   - ✅ 更新 CHANGELOG

#### Web 应用部署

1. 合并到 main 分支：
   ```bash
   git checkout main
   git merge develop
   git push
   ```

2. 自动部署到 GitHub Pages

### 手动触发 Workflows

大部分 workflows 支持手动触发：

1. 进入 Actions 页面
2. 选择要运行的 workflow
3. 点击 "Run workflow"
4. 填写必要参数（如果有）

### PR 最佳实践

为了充分利用自动化功能，PR 标题建议使用以下格式：

```
feat: 添加新功能
fix: 修复 bug
docs: 更新文档
style: 样式改进
refactor: 代码重构
perf: 性能优化
test: 添加测试
chore: 其他改动
ci: CI/CD 改动
```

示例：
- `feat(desktop): 添加导出功能`
- `fix(web): 修复登录问题`
- `docs: 更新 README`

## 自定义配置

### 修改定时任务

编辑对应的 workflow 文件中的 cron 表达式：

```yaml
schedule:
  - cron: '0 0 * * 1'  # 每周一 00:00
```

Cron 格式：`分 时 日 月 周`

### 调整 Stale 时间

编辑 `.github/workflows/stale.yml`：

```yaml
days-before-issue-stale: 30  # Issue 无活动天数
days-before-issue-close: 7   # 标记后关闭天数
days-before-pr-stale: 14     # PR 无活动天数
days-before-pr-close: 7      # 标记后关闭天数
```

### 修改 Bundle 大小阈值

编辑 `.github/workflows/bundle-size.yml`：

```bash
find dist -type f -size +500k  # 修改 500k 为其他值
```

### 自定义标签规则

编辑 `.github/labeler.yml`：

```yaml
your-label:
  - path/to/files/**/*
```

## 监控和维护

### 查看 Workflow 运行状态

1. 进入仓库的 Actions 页面
2. 查看最近的运行记录
3. 点击具体运行查看详细日志

### 常见问题

#### Workflow 失败

1. 检查 Actions 日志
2. 确认 secrets 配置正确
3. 检查权限设置

#### Dependabot PR 太多

1. 调整 `open-pull-requests-limit`
2. 修改更新频率为 `monthly`
3. 使用分组功能合并更新

#### AUR 发布失败

1. 确认 SSH 密钥配置正确
2. 检查 AUR 账户权限
3. 验证 PKGBUILD 格式

## 性能优化建议

### 减少 CI 运行时间

1. 使用缓存：
   ```yaml
   - uses: actions/cache@v3
     with:
       path: ~/.bun/install/cache
       key: ${{ runner.os }}-bun-${{ hashFiles('**/bun.lock') }}
   ```

2. 并行运行 jobs：
   ```yaml
   jobs:
     job1:
       # ...
     job2:
       # ...
   ```

3. 条件执行：
   ```yaml
   if: contains(github.event.head_commit.message, '[ci skip]') == false
   ```

### 减少 Workflow 触发

使用 `paths` 过滤：

```yaml
on:
  push:
    paths:
      - 'apps/web/**'
      - '!**/*.md'  # 排除 markdown 文件
```

## 扩展建议

### 未来可添加的 Workflows

1. **性能测试**: Lighthouse CI
2. **E2E 测试**: Playwright/Cypress
3. **Docker 构建**: 容器化部署
4. **多语言支持**: 自动翻译检查
5. **API 文档**: 自动生成 API 文档

### 集成第三方服务

- **Codecov**: 代码覆盖率
- **Sentry**: 错误追踪
- **Vercel**: Web 应用部署
- **Discord/Slack**: 通知集成

## 参考资源

- [GitHub Actions 文档](https://docs.github.com/en/actions)
- [Workflow 语法](https://docs.github.com/en/actions/reference/workflow-syntax-for-github-actions)
- [Dependabot 配置](https://docs.github.com/en/code-security/dependabot/dependabot-version-updates/configuration-options-for-the-dependabot.yml-file)
- [Tauri Actions](https://github.com/tauri-apps/tauri-action)

## 贡献

如果你有改进建议或发现问题，欢迎：
1. 创建 Issue
2. 提交 PR
3. 参与讨论

---

最后更新: 2025-12-03
