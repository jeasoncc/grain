# E2E 测试规范

本项目使用 Playwright 进行端对端测试，仅在用户明确要求时触发。

## 触发条件

E2E 测试**不会自动执行**，仅在以下情况触发：
- 用户明确要求「运行 E2E 测试」
- 用户要求「测试某个功能的完整流程」
- 重构完成后用户要求验证

## 测试配置

```bash
# 安装依赖（如果尚未安装）
cd apps/desktop
bun add -D @playwright/test
bunx playwright install chromium

# 运行测试
bun run test:e2e
```

## 应用启动

Desktop 应用基于 Tauri，E2E 测试前需要启动开发服务器：

```bash
# 启动 Web 开发服务器（用于 E2E 测试）
cd apps/desktop
bun run dev  # 默认端口 http://localhost:5173
```

## UI 操作规则记录

每次 E2E 测试后，将发现的 UI 操作规则记录在此，供后续测试复用。

### 页面结构

| 区域 | 选择器 | 说明 |
|------|--------|------|
| 侧边栏 | `[data-testid="sidebar"]` | 左侧导航栏 |
| 文件树 | `[data-testid="file-tree"]` | 文件/文件夹列表 |
| 编辑器 | `[data-testid="editor"]` | Lexical 富文本编辑器 |
| 工具栏 | `[data-testid="toolbar"]` | 顶部工具栏 |

### 常用操作

#### 创建新文件
```typescript
// 1. 点击侧边栏的「新建」按钮
await page.click('[data-testid="new-file-button"]');

// 2. 在弹出的输入框中输入文件名
await page.fill('[data-testid="file-name-input"]', '新文件');

// 3. 确认创建
await page.click('[data-testid="confirm-button"]');
```

#### 打开文件
```typescript
// 双击文件树中的文件
await page.dblclick('[data-testid="file-tree-item"][data-name="文件名"]');
```

#### 编辑内容
```typescript
// 1. 聚焦编辑器
await page.click('[data-testid="editor"]');

// 2. 输入内容
await page.keyboard.type('这是测试内容');
```

#### 保存文件
```typescript
// 使用快捷键保存
await page.keyboard.press('Control+S');
// 或 macOS
await page.keyboard.press('Meta+S');
```

### 等待策略

```typescript
// 等待文件树加载完成
await page.waitForSelector('[data-testid="file-tree-item"]');

// 等待编辑器就绪
await page.waitForSelector('[data-testid="editor"][contenteditable="true"]');

// 等待保存完成（检查状态指示器）
await page.waitForSelector('[data-testid="save-status"][data-status="saved"]');
```

## 测试文件组织

```
apps/desktop/
├── e2e/
│   ├── fixtures/           # 测试数据
│   ├── file-tree.spec.ts   # 文件树测试
│   ├── editor.spec.ts      # 编辑器测试
│   ├── search.spec.ts      # 搜索功能测试
│   └── export.spec.ts      # 导出功能测试
├── playwright.config.ts    # Playwright 配置
└── ...
```

## 规则更新流程

每次执行 E2E 测试后：
1. 记录新发现的选择器到「页面结构」表格
2. 记录新的操作流程到「常用操作」部分
3. 记录等待策略和时序问题到「等待策略」部分
4. 如果发现 data-testid 缺失，在代码中补充

## 待补充的 data-testid

以下组件需要添加 data-testid 以支持 E2E 测试：

- [ ] 侧边栏容器
- [ ] 文件树容器和每个文件项
- [ ] 编辑器容器
- [ ] 工具栏按钮
- [ ] 对话框和表单元素
- [ ] 状态指示器

---

**注意**：此文件会随着测试的进行不断更新，记录所有发现的 UI 操作规则。
