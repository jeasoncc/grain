# Architecture Violations Analysis

**Generated**: 2026-01-12
**Task**: Phase 1 - Task 1.1 分析架构违规模式

## Summary

发现20+个文件存在架构层级违规，主要是flows层直接依赖utils层。

## Violation Pattern

### 主要违规模式: flows → utils (直接依赖)

**违规规则**: flows层只能依赖 pipes, io, state, types
**实际情况**: flows层直接导入utils层的函数

### 违规文件清单

```
1. src/flows/backup/backup.flow.ts
2. src/flows/backup/clear-data.flow.ts
3. src/flows/data/clear-data.flow.ts
4. src/flows/export/export-all.flow.ts
5. src/flows/export/export-json.flow.ts
6. src/flows/export/export-markdown.flow.ts
7. src/flows/export/export-orgmode.flow.ts
8. src/flows/export/export-workspace-markdown.flow.ts
9. src/flows/export/export-zip.flow.ts
10. src/flows/file/create-file.flow.ts
11. src/flows/file/open-file.flow.ts
12. src/flows/import/import-json.flow.ts
13. src/flows/import/import-markdown.flow.ts
14. src/flows/migration/dexie-to-sqlite.migration.fn.ts
15. src/flows/node/create-node.flow.ts
16. src/flows/node/delete-node.flow.ts
17. src/flows/node/ensure-folder.flow.ts
18. src/flows/node/get-node.flow.ts
19. src/flows/node/move-node.flow.ts
20. src/flows/node/rename-node.flow.ts
```

## Detailed Analysis

### Example 1: backup.flow.ts

**违规代码**:
```typescript
// Line 19
import { type AppError, dbError, importError } from "@/utils/error.util";
```

**问题**: flows层直接导入utils层的error工具函数

**修复策略**:
1. 在pipes/error/创建error.pipe.ts
2. 包装utils/error.util的函数
3. flows导入pipes/error而不是utils/error

### Common Violations

#### 1. Error Utilities
- **文件**: 多个flows文件
- **导入**: `@/utils/error.util`
- **函数**: `dbError`, `importError`, `AppError`等

#### 2. Date Utilities  
- **文件**: export相关flows
- **导入**: `@/utils/date.util`
- **函数**: 日期格式化函数

#### 3. String Utilities
- **文件**: 多个flows文件
- **导入**: `@/utils/string.util`
- **函数**: 字符串处理函数

#### 4. File Utilities
- **文件**: file相关flows
- **导入**: `@/utils/file.util`
- **函数**: 文件路径处理函数

## Fix Strategy

### Step 1: Create Pipes Wrappers

为每个被flows使用的utils函数创建pipes包装：

```
pipes/
├── error/
│   └── error.pipe.ts          # 包装 utils/error.util
├── date/
│   └── format.pipe.ts         # 包装 utils/date.util
├── string/
│   └── string.pipe.ts         # 包装 utils/string.util
└── file/
    └── file.pipe.ts           # 包装 utils/file.util
```

### Step 2: Update Flows Imports

批量替换flows中的导入：
```typescript
// ❌ Before
import { dbError } from "@/utils/error.util";

// ✅ After
import { dbError } from "@/pipes/error/error.pipe";
```

### Step 3: Verify

运行ESLint验证无架构违规：
```bash
npm run lint:grain -- --rule 'grain/layer-dependencies: error'
```

## Implementation Plan

### Batch 1: Error Utilities (最常用)
- 创建 pipes/error/error.pipe.ts
- 更新所有flows中的error导入
- 预计影响: 15+ 文件

### Batch 2: Date Utilities
- 创建 pipes/date/format.pipe.ts
- 更新export flows中的date导入
- 预计影响: 5+ 文件

### Batch 3: String & File Utilities
- 创建 pipes/string/string.pipe.ts
- 创建 pipes/file/file.pipe.ts
- 更新相关flows
- 预计影响: 10+ 文件

## Expected Outcome

- **Before**: 20+ 架构违规
- **After**: 0 架构违规
- **Time**: 2-3 hours
- **Risk**: Low (纯重构，不改变逻辑)

## Next Steps

1. 执行 Task 1.2.1: 创建pipes包装函数
2. 执行 Task 1.2.2: 更新flows导入
3. 执行 Task 1.2.3: 验证架构规则
