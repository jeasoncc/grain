---
inclusion: manual
---

# E2E 测试规范

本项目使用 Puppeteer 进行端对端测试，仅在用户明确要求时触发。

## 触发条件

E2E 测试**不会自动执行**，仅在以下情况触发：
- 用户明确要求「运行 E2E 测试」
- 用户要求「测试某个功能的完整流程」
- 重构完成后用户要求验证

## 测试配置

```bash
# 运行所有测试
cd apps/desktop
bun run e2e

# 运行特定测试套件
bun run e2e:workspace
bun run e2e:diary
bun run e2e:wiki
bun run e2e:ledger
bun run e2e:excalidraw

# 调试模式（非无头，可视化）
bun run e2e:debug
```

## 应用启动

Desktop 应用基于 Tauri，E2E 测试前需要启动开发服务器：

```bash
cd apps/desktop
bun run dev  # 默认端口 http://localhost:1420
```

## 截图规范

### 时间戳命名

**重要**：每次运行测试时，截图目录使用时间戳作为中间后缀，避免覆盖历史截图。

```
e2e/reports/screenshots/
├── 2025-12-27T13-08-05/           # 时间戳目录
│   ├── workspace-init/
│   │   ├── 01-app-loaded.png
│   │   ├── 02-app-ready.png
│   │   └── ...
│   ├── diary-creation/
│   │   ├── 01-app-loaded.png
│   │   └── ...
│   └── ...
├── 2025-12-27T14-30-00/           # 另一次运行
│   └── ...
└── latest -> 2025-12-27T14-30-00  # 符号链接指向最新
```

### 截图命名规则

- 格式: `{step-number}-{step-description}.png`
- 步骤编号使用两位数字，如 `01`, `02`
- 描述使用小写字母和连字符
- 失败截图使用 `99-failure.png`

### 截图时机

- 每个操作前后都要截图
- 等待元素出现后截图
- 验证结果时截图
- 测试失败时截图

### Git 忽略

截图目录已添加到 `.gitignore`，不会提交到版本控制：
```
e2e/reports/screenshots/
e2e/reports/test-report.json
e2e/reports/test-report.md
```

## DevTools 控制台捕获

**重要**：每次执行 E2E 测试时，必须捕获浏览器 DevTools 控制台的所有输出。

### 捕获类型

| 类型 | 说明 |
|------|------|
| `console.error` | 错误日志 |
| `console.warn` | 警告日志 |
| `pageerror` | 页面 JavaScript 错误 |
| `requestfailed` | 网络请求失败 |

### 实现方式

```typescript
// 设置控制台监听器
page.on('console', (msg) => {
  if (msg.type() === 'error' || msg.type() === 'warning') {
    errors.push({
      type: msg.type(),
      message: msg.text(),
      timestamp: new Date().toISOString(),
      stackTrace: msg.stackTrace()?.map(s => 
        `${s.url}:${s.lineNumber}:${s.columnNumber}`
      ).join('\n'),
    });
  }
});

// 捕获页面错误
page.on('pageerror', (error) => {
  errors.push({
    type: 'error',
    message: error.message,
    timestamp: new Date().toISOString(),
    stackTrace: error.stack,
  });
});

// 捕获请求失败
page.on('requestfailed', (request) => {
  errors.push({
    type: 'error',
    message: `Request failed: ${request.url()} - ${request.failure()?.errorText}`,
    timestamp: new Date().toISOString(),
  });
});
```

### 分析报告

测试完成后生成控制台错误分析报告，包含：
- 错误数量统计
- 错误详情和堆栈
- 保存到 `e2e/reports/console-errors.md`

## UI 选择器规范

### Activity Bar

| 元素 | 选择器 | 说明 |
|------|--------|------|
| 容器 | `[data-testid="activity-bar"]` | Activity Bar 容器 |
| 新建日记 | `[data-testid="btn-new-diary"]` | 创建 Diary 按钮 |
| 新建 Wiki | `[data-testid="btn-new-wiki"]` | 创建 Wiki 按钮 |
| 新建记账 | `[data-testid="btn-new-ledger"]` | 创建 Ledger 按钮 |
| 工作区选择器 | `[data-testid="workspace-selector"]` | 工作区下拉选择 |

### File Tree

| 元素 | 选择器 | 说明 |
|------|--------|------|
| 容器 | `[data-testid="file-tree"]` | File Tree 容器 |
| 文件项 | `[data-testid="file-tree-item"]` | 单个文件/文件夹项 |
| 节点 ID | `[data-node-id="xxx"]` | 节点唯一标识 |

### Editor Tabs

| 元素 | 选择器 | 说明 |
|------|--------|------|
| 容器 | `[data-testid="editor-tabs"]` | 标签页容器 |
| 单个标签 | `[data-testid="editor-tab"]` | 单个标签页 |
| 节点 ID | `[data-node-id="xxx"]` | 对应文件的节点 ID |

### Toast 消息

| 元素 | 选择器 | 说明 |
|------|--------|------|
| 容器 | `[data-testid="toast-container"]` | Toast 容器 |
| 成功消息 | `[data-sonner-toast][data-type="success"]` | 成功提示 |
| 错误消息 | `[data-sonner-toast][data-type="error"]` | 错误提示 |

### 命令面板

| 元素 | 选择器 | 说明 |
|------|--------|------|
| 容器 | `[cmdk-root]` | 命令面板容器 |
| 输入框 | `[cmdk-input]` | 搜索输入框 |
| 命令项 | `[cmdk-item]` | 单个命令项 |

## 等待策略

```typescript
// 等待应用加载完成
await page.waitForSelector('[data-testid="activity-bar"]', { timeout: 10000 });

// 等待 File Tree 加载
await page.waitForSelector('[data-testid="file-tree"]', { timeout: 5000 });

// 等待 Toast 消息
await page.waitForSelector('[data-sonner-toast]', { timeout: 10000 });

// 等待文件出现在树中
await page.waitForFunction(
  (title) => document.querySelector(`[data-testid="file-tree-item"][title*="${title}"]`),
  { timeout: 5000 },
  expectedTitle
);

// 等待编辑器标签打开
await page.waitForSelector('[data-testid="editor-tab"]', { timeout: 5000 });
```

## 测试文件组织

```
apps/desktop/e2e/
├── config/
│   └── puppeteer.config.ts      # Puppeteer 配置
├── helpers/
│   ├── browser.helper.ts        # 浏览器控制
│   ├── selectors.ts             # UI 选择器常量
│   ├── wait.helper.ts           # 等待策略
│   ├── assert.helper.ts         # 断言辅助
│   ├── screenshot.helper.ts     # 截图管理
│   └── console.helper.ts        # 控制台捕获
├── tests/
│   ├── workspace.e2e.ts         # 工作区测试
│   ├── diary.e2e.ts             # 日记创建测试
│   ├── wiki.e2e.ts              # Wiki 创建测试
│   ├── ledger.e2e.ts            # 记账创建测试
│   └── excalidraw.e2e.ts        # Excalidraw 创建测试
├── reports/
│   ├── screenshots/             # 截图目录（已 gitignore）
│   ├── issues.md                # 问题记录
│   ├── test-report.json         # JSON 报告（已 gitignore）
│   └── test-report.md           # Markdown 报告（已 gitignore）
└── run-e2e.ts                   # 测试入口
```

## 问题记录格式

发现的问题记录到 `e2e/reports/issues.md`：

```markdown
## Issue E2E-YYYY-MM-DD-NNN: [问题标题]

**发现时间**: YYYY-MM-DD HH:mm:ss
**严重程度**: critical | major | minor
**测试套件**: [测试套件名称]
**测试用例**: [测试用例名称]

### 描述
[问题描述]

### 复现步骤
1. 步骤 1
2. 步骤 2

### 期望行为
[期望的行为]

### 实际行为
[实际的行为]

### 控制台错误
\`\`\`
[相关的控制台错误]
\`\`\`

### 截图
![screenshot](./screenshots/xxx/99-failure.png)

### 相关需求
Requirements X.Y

### 状态
- [ ] 待修复
- [ ] 修复中
- [ ] 已修复
- [ ] 已验证
```

## 规则更新流程

每次执行 E2E 测试后：
1. 记录新发现的选择器到「UI 选择器规范」
2. 记录新的等待策略到「等待策略」部分
3. 记录发现的问题到 `e2e/reports/issues.md`
4. 如果发现 data-testid 缺失，在代码中补充

## 待补充的 data-testid

以下组件需要添加 data-testid 以支持 E2E 测试：

- [x] Activity Bar 容器和按钮
- [x] File Tree 容器和文件项
- [ ] Editor Tabs 容器和标签页
- [ ] 对话框和表单元素
- [ ] 状态指示器

## 已知问题

### DexieError2 控制台错误

所有测试期间持续出现 `DexieError2` 错误，来自 `saveLog` 函数。这是日志保存到 IndexedDB 时的问题，需要修复。

### HTML 嵌套 button 错误

Tooltip 组件中存在 button 嵌套 button 的问题，会导致 React hydration 错误。

---

**注意**：此文件会随着测试的进行不断更新，记录所有发现的 UI 操作规则。
