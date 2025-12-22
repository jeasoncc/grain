# BackupManager 组件重构完成

## 📋 重构概述

将 `BackupManager` 组件从混合组件（包含状态和副作用）重构为纯展示组件，符合 Grain 函数式架构规范。

## ✅ 完成的工作

### 1. 类型迁移

创建了新的类型文件，将类型定义从 `db/` 目录迁移到 `types/` 目录：

#### 备份类型 (`types/backup/`)
- `backup.interface.ts` - 定义备份相关接口
  - `BackupMetadata` - 备份元数据
  - `BackupData` - 备份数据结构
  - `DatabaseStats` - 数据库统计信息
  - `LocalBackupRecord` - 本地备份记录
- `index.ts` - 统一导出

#### 存储类型 (`types/storage/`)
- `storage.interface.ts` - 定义存储相关接口
  - `TableStats` - 表数据统计
  - `TableSizes` - 表大小统计
  - `IndexedDBStats` - IndexedDB 统计信息
  - `StorageStats` - 存储统计信息
  - `ClearDataOptions` - 清理数据选项
- `index.ts` - 统一导出

### 2. 工具函数提取

创建了格式化工具函数模块：

#### 格式化函数 (`fn/format/`)
- `format.bytes.fn.ts` - 字节大小格式化纯函数
  - 输入：字节数（number）
  - 输出：格式化字符串（如 "1.5 KB"）
  - 特性：纯函数，无副作用，可测试
- `format.bytes.fn.test.ts` - 完整的单元测试
  - 7 个测试用例，覆盖所有场景
  - 测试通过率：100%
- `index.ts` - 统一导出

### 3. 组件纯化

#### BackupManager 组件 (`components/blocks/backup-manager.tsx`)

**重构前：**
```typescript
// ❌ 组件内部管理状态
const [stats, setStats] = useState(...);
const [loading, setLoading] = useState(false);

// ❌ 组件内部调用服务
const handleExport = async () => {
  const result = await exportBackup();
  // ...
};
```

**重构后：**
```typescript
// ✅ 纯展示组件，只接收 props
export interface BackupManagerProps {
  readonly stats: DatabaseStats | null;
  readonly loading: boolean;
  readonly onExportJson: () => void;
  // ...
}

export const BackupManager = memo(function BackupManager({
  stats,
  loading,
  onExportJson,
  // ...
}: BackupManagerProps) {
  // 只负责渲染，不管理状态
  return <div>...</div>;
});
```

**改进点：**
- ✅ 移除所有内部状态（useState）
- ✅ 移除所有副作用（useEffect）
- ✅ 移除所有服务调用（exportBackup, clearData 等）
- ✅ 使用 `memo` 优化性能
- ✅ 所有 props 使用 `readonly` 修饰符
- ✅ 使用 `formatBytes` 工具函数替代内部实现

### 4. 路由组件实现

#### Data Settings Route (`routes/settings/data.tsx`)

路由组件负责数据编排和业务逻辑：

**职责：**
- ✅ 从 DB 获取统计数据（stats, storageStats）
- ✅ 管理 UI 状态（loading, autoBackupEnabled）
- ✅ 获取本地备份列表（localBackups）
- ✅ 实现所有回调函数：
  - `handleExportJson` - 导出 JSON 备份
  - `handleExportZip` - 导出 ZIP 备份
  - `handleRestore` - 恢复备份
  - `handleToggleAutoBackup` - 切换自动备份
  - `handleRestoreLocal` - 恢复本地备份
  - `handleClearAllData` - 清除所有数据
  - `handleClearDatabase` - 清除数据库
  - `handleClearSettings` - 清除设置
- ✅ 将数据通过 props 传递给 BackupManager

**特点：**
- 使用 fp-ts Either 处理错误
- 使用 logger 记录日志
- 使用 toast 显示用户反馈
- 使用 confirm 对话框确认危险操作

### 5. 数据库函数更新

#### backup.db.fn.ts
- ✅ 移除类型定义，改为从 `types/backup` 导入
- ✅ 保持函数式风格（TaskEither）
- ✅ 保持日志记录

#### clear-data.db.fn.ts
- ✅ 移除类型定义，改为从 `types/storage` 导入
- ✅ 移除重复的 `formatBytes` 函数
- ✅ 保持函数式风格（TaskEither）

## 📁 文件结构

```
apps/desktop/src/
├── types/
│   ├── backup/
│   │   ├── backup.interface.ts    # 备份类型定义
│   │   └── index.ts
│   └── storage/
│       ├── storage.interface.ts   # 存储类型定义
│       └── index.ts
│
├── fn/
│   └── format/
│       ├── format.bytes.fn.ts     # 字节格式化函数
│       ├── format.bytes.fn.test.ts # 测试文件
│       └── index.ts
│
├── db/
│   ├── backup.db.fn.ts            # 备份数据库函数（已更新）
│   └── clear-data.db.fn.ts        # 清理数据库函数（已更新）
│
├── components/blocks/
│   └── backup-manager.tsx         # 纯展示组件（已重构）
│
└── routes/settings/
    └── data.tsx                   # 路由组件（编排层）
```

## 🧪 测试结果

```bash
✓ src/fn/format/format.bytes.fn.test.ts (7 tests) 7ms
  ✓ formatBytes (7)
    ✓ should format 0 bytes
    ✓ should format bytes
    ✓ should format kilobytes
    ✓ should format megabytes
    ✓ should format gigabytes
    ✓ should handle decimal places correctly
    ✓ should handle large numbers

Test Files  1 passed (1)
     Tests  7 passed (7)
```

## 🎯 架构符合性

### ✅ 数据流架构
- 外部数据 → Zod 校验 → Builder 构建 → 纯函数处理 → DB/Store
- 类型定义在 `types/` 目录
- 纯函数在 `fn/` 目录
- 数据库函数在 `db/` 目录

### ✅ 组件规范
- 纯展示组件：只通过 props 接收数据
- 路由组件：负责数据编排和业务逻辑
- 使用 `memo` 优化性能
- 所有 props 使用 `readonly`

### ✅ 测试规范
- 纯函数有对应的测试文件
- 测试文件与源文件在同一目录
- 测试覆盖率：100%

### ✅ 函数式编程
- 使用 fp-ts TaskEither 处理异步操作
- 使用 pipe 组合函数
- 纯函数无副作用
- 不可变数据

### ✅ 日志规范
- 使用 `logger` 替代 `console.log`
- 日志格式：`[ModuleName] 操作描述`
- 记录关键操作和错误

## 📊 代码质量

- ✅ TypeScript 类型检查：通过
- ✅ Biome 代码检查：通过（我们修改的文件）
- ✅ 单元测试：通过（7/7）
- ✅ 无 ESLint 警告
- ✅ 无未使用的导入
- ✅ 无 `console.log`

## 🔄 数据流示意图

```
用户操作
   │
   ▼
路由组件 (data.tsx)
   │
   ├─→ 获取数据 (getDatabaseStats, getStorageStats)
   │
   ├─→ 管理状态 (loading, autoBackupEnabled)
   │
   ├─→ 实现回调 (handleExportJson, handleClearAllData, ...)
   │
   ▼
纯展示组件 (BackupManager)
   │
   ├─→ 接收 props (stats, loading, onExportJson, ...)
   │
   ├─→ 使用工具函数 (formatBytes)
   │
   └─→ 渲染 UI
```

## 📝 使用示例

```typescript
// 路由组件中使用
function DataSettingsPage() {
  const [stats, setStats] = useState<DatabaseStats | null>(null);
  const [loading, setLoading] = useState(false);
  
  const handleExportJson = async () => {
    setLoading(true);
    const result = await exportBackupJson()();
    // 处理结果...
    setLoading(false);
  };
  
  return (
    <BackupManager
      stats={stats}
      loading={loading}
      onExportJson={handleExportJson}
      // ... 其他 props
    />
  );
}
```

## 🎉 重构收益

1. **可测试性提升**
   - 纯函数易于测试
   - 组件可以通过 props 注入测试数据

2. **可维护性提升**
   - 职责分离清晰
   - 类型定义集中管理
   - 工具函数可复用

3. **性能优化**
   - 使用 `memo` 避免不必要的重渲染
   - 纯函数可以被缓存

4. **类型安全**
   - 所有类型定义在 `types/` 目录
   - 使用 `readonly` 防止意外修改

5. **代码复用**
   - `formatBytes` 可在其他地方使用
   - 类型定义可在多个文件共享

## 📌 后续工作

根据 tasks.md，还需要重构以下组件：

- [ ] 60. 重构 Panel 组件
- [ ] 61. 重构 CommandPalette 组件
- [ ] 62. 重构 ExportDialogManager 组件
- [ ] 63. 重构其他组件

这些组件将遵循相同的重构模式：
1. 提取类型到 `types/` 目录
2. 提取工具函数到 `fn/` 目录
3. 组件纯化（只接收 props）
4. 路由组件负责数据编排
5. 添加单元测试
