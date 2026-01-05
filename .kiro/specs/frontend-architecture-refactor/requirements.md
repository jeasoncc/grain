# 前端架构重构需求

## 背景

当前前端架构存在以下问题：
- 文件夹职责不清晰：`fn/`、`repo/`、`db/`、`actions/`、`queries/` 职责重叠
- 命名不一致：有些是面向对象风格（repo），有些是函数式风格（fn）
- 缺乏统一的水流架构：数据流向不明确

## 目标

基于函数式编程和"水流"比喻，建立清晰的去中心化架构：

```
外部世界 → io/ → pipes/ → flows/ → state/ → hooks/ → views/
```

## 需求列表

### REQ-1: 新目录结构

创建新的目录结构：

```
src/
├── views/          # UI 视图（原 components/）
├── hooks/          # React 绑定（吸收 queries/）
├── flows/          # 管道系统（原 actions/）
├── pipes/          # 纯业务函数（原 fn/ 的纯函数部分）
├── io/             # IO 操作（原 db/ + repo/）
│   ├── api/        # Rust API（invoke/fetch）
│   ├── storage/    # localStorage
│   └── file/       # 文件系统对话框
├── state/          # Zustand 状态（原 stores/）
├── utils/          # 通用工具（原 lib/）
├── types/          # 类型定义（保持不变）
└── routes/         # 路由（保持不变）
```

### REQ-2: 文件命名规范

| 文件夹 | 后缀 | 示例 |
|--------|------|------|
| `io/api/` | `.api.ts` | `workspace.api.ts` |
| `io/storage/` | `.storage.ts` | `settings.storage.ts` |
| `io/file/` | `.file.ts` | `dialog.file.ts` |
| `pipes/` | `.pipe.ts` | `markdown.pipe.ts` |
| `flows/` | `.flow.ts` | `create-workspace.flow.ts` |
| `hooks/` | `use-*.ts` | `use-workspace.ts` |
| `views/` | `.view.tsx` | `sidebar.view.tsx` |
| `state/` | `.state.ts` | `selection.state.ts` |
| `utils/` | `.util.ts` | `date.util.ts` |

### REQ-3: 依赖规则

```
views/  →  只能依赖 hooks/, types/
hooks/  →  只能依赖 flows/, state/, types/
flows/  →  只能依赖 pipes/, io/, state/, types/
pipes/  →  只能依赖 utils/, types/
io/     →  只能依赖 types/
state/  →  只能依赖 types/
utils/  →  只能依赖 types/
```

### REQ-4: 迁移映射

| 原文件夹 | 目标文件夹 | 说明 |
|---------|-----------|------|
| `components/` | `views/` | 重命名 |
| `stores/` | `state/` | 重命名 + 文件后缀改为 `.state.ts` |
| `lib/` | `utils/` | 重命名 + 文件后缀改为 `.util.ts` |
| `db/api-client.fn.ts` | `io/api/client.api.ts` | 移动到 io/api |
| `db/rust-api.fn.ts` | `io/api/` | 拆分到各领域 api 文件 |
| `repo/*.repo.fn.ts` | `io/api/*.api.ts` | 合并到 io/api |
| `queries/*.queries.ts` | `hooks/use-*.ts` | 合并到 hooks |
| `actions/` | `flows/` | 重命名 + 文件后缀改为 `.flow.ts` |
| `fn/` (纯函数) | `pipes/` | 移动纯业务函数 |
| `fn/` (工具函数) | `utils/` | 移动通用工具函数 |

### REQ-5: 保持功能不变

- 所有现有功能必须正常工作
- 所有测试必须通过
- 不改变业务逻辑，只改变文件组织

### REQ-6: 渐进式迁移

- 支持新旧结构并存
- 通过 index.ts 重导出保持兼容性
- 分批次迁移，每批次可独立验证

## 验收标准

1. 新目录结构创建完成
2. 所有文件按映射规则迁移
3. 文件命名符合新规范
4. 依赖关系符合规则
5. 所有测试通过
6. 应用正常运行
