
# 工作流程规范

## 任务完成后自动提交

每次完成一个任务后，必须执行 git commit：

```bash
git add -A
git commit -m "feat/fix/refactor: 简短描述变更内容"
```

### Commit Message 规范

- 使用**中文**描述
- 遵循 Conventional Commits 格式

| 前缀 | 用途 |
|------|------|
| `feat:` | 新功能 |
| `fix:` | 修复 bug |
| `refactor:` | 重构代码 |
| `docs:` | 文档更新 |
| `style:` | 代码格式 |
| `test:` | 测试 |
| `chore:` | 构建/工具 |

## 优先使用成熟库

新增功能时，**必须优先考虑是否有成熟的第三方库**。

### 检查清单

1. 搜索是否有现成的 npm 包
2. 评估：stars、维护活跃度、TypeScript 支持、包体积
3. 检查与现有技术栈兼容性

### 禁止重复造轮子

| ❌ 禁止 | ✅ 使用 |
|--------|--------|
| 手写 debounce/throttle | es-toolkit |
| 手写深拷贝 | es-toolkit 或 structuredClone |
| 手写日期格式化 | dayjs |
| 手写表单校验 | Zod |
| 手写虚拟滚动 | @tanstack/react-virtual |

### 何时可以手写

- 库功能过于复杂，只需要很小的子集
- 库包体积过大
- 业务逻辑高度定制
- 需要深度集成项目架构

## 知识沉淀

每次完成任务后，审查是否有重要知识需要沉淀。

### 需要沉淀的知识类型

| 类型 | 存放位置 |
|------|----------|
| 架构决策 | `decisions.md` |
| 踩坑经验 | `troubleshooting.md` |
| 工作流程 | `workflow.md` |
| 代码模式 | `code-standards.md` |

### 沉淀流程

1. 回顾是否遇到：反复出现的问题、重要配置细节、容易遗忘的步骤
2. 判断归属：已有文件 → 补充；新领域 → 创建新文件
3. 格式要求：简洁、包含示例、说明「为什么」

## Steering 文件结构

```
.kiro/steering/
├── 【Always Loaded】
│   ├── architecture.md    # 数据流架构
│   ├── structure.md       # 目录结构
│   ├── tech.md            # 技术栈
│   ├── code-standards.md  # 代码规范
│   └── workflow.md        # 工作流程（本文件）
│
└── 【Manual Load】
    ├── fp-patterns.md     # 函数式编程
    ├── design-patterns.md # 设计模式
    ├── rust-backend.md    # Rust 后端规范
    ├── e2e-testing.md     # E2E 测试
    ├── release.md         # 发布流程
    ├── git-hooks.md       # Git Hooks
    ├── troubleshooting.md # 问题排查
    ├── decisions.md       # 技术决策
    └── product.md         # 产品定义
```

详细文档存放在 `docs/` 目录。
