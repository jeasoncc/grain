# Design Document

## Overview

本设计文档描述了函数式架构重构的收尾清理工作。主要任务是删除已迁移的旧代码，确保应用功能完整。

## 当前状态分析

### Domain 模块依赖分析

| 模块 | 引用数 | 状态 |
|------|--------|------|
| `domain/editor-history/` | 0 | ✅ 可删除 |
| `domain/import-export/` | 0 | ✅ 可删除 |
| `domain/keyboard/` | 0 | ✅ 可删除 |
| `domain/save/` | 0 | ✅ 可删除 |
| `domain/selection/` | 0 | ✅ 可删除 |
| `domain/writing/` | 0 | ✅ 可删除 |

### Services 文件依赖分析

| 文件 | 引用数 | 状态 |
|------|--------|------|
| `services/drawings.utils.ts` | 0 | ✅ 可删除 |
| `services/export-path.ts` | 0 | ✅ 可删除 |
| `services/import-export.ts` | 0 | ✅ 可删除 |
| `services/tags.ts` | 0 | ✅ 可删除 |
| `services/workspaces.ts` | 0 | ✅ 可删除 |

## 清理策略

### Phase 1: 验证无引用

在删除任何文件之前，使用 grep 验证确实没有外部引用：

```bash
# 验证 domain 模块
grep -r "from.*@/domain/editor-history" src/
grep -r "from.*@/domain/import-export" src/
# ... 等等
```

### Phase 2: 删除无引用文件

按照依赖关系从叶子节点开始删除：
1. 先删除无引用的单个文件
2. 再删除无引用的目录

### Phase 3: 更新索引文件

更新 `services/index.ts` 以保持向后兼容：
- 移除对已删除模块的 re-export
- 添加对新位置的 re-export

### Phase 4: 验证功能

1. 运行类型检查
2. 运行测试
3. 启动开发服务器
4. 手动测试核心功能

## 删除清单

### 可直接删除的 Domain 模块

```
domain/
├── editor-history/     # 0 引用 → 删除
├── import-export/      # 0 引用 → 删除
├── keyboard/           # 0 引用 → 删除
├── save/               # 0 引用 → 删除
├── selection/          # 0 引用 → 删除
└── writing/            # 0 引用 → 删除
```

### 可直接删除的 Services 文件

```
services/
├── drawings.utils.ts   # 0 引用 → 删除
├── export-path.ts      # 0 引用 → 删除
├── import-export.ts    # 0 引用 → 删除
├── tags.ts             # 0 引用 → 删除
└── workspaces.ts       # 0 引用 → 删除
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system.*

### Property 1: 删除后无编译错误

*For any* 删除操作，删除后运行 `tsc --noEmit` 应该返回 0 错误

**Validates: Requirements 4.1**

### Property 2: 删除后应用可启动

*For any* 删除操作，删除后运行 `bun run desktop:dev` 应该成功启动

**Validates: Requirements 4.2**

## Testing Strategy

### 验证方法

1. **编译验证**: `bunx tsc --noEmit`
2. **测试验证**: `bunx vitest run`
3. **运行验证**: `bun run desktop:dev`

### 功能测试清单

- [ ] 创建日记
- [ ] 创建 Wiki
- [ ] 创建记账
- [ ] 文件树操作（创建、删除、重命名、移动）
- [ ] 导出功能
- [ ] 导入功能
