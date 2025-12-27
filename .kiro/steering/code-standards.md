# 代码规范

本文档定义 Grain 项目的代码质量标准。

## 函数式编程规范

### 不可变性

```typescript
// ✅ 推荐
const newItems = [...items, newItem];
const updated = items.map(item => item.id === id ? { ...item, name } : item);

// ❌ 禁止
items.push(newItem);
item.name = name;
```

### 管道组合

```typescript
// ✅ 推荐：fp-ts pipe
import { pipe } from "fp-ts/function";
const result = pipe(data, validate, transform, format);

// ❌ 避免：嵌套调用
const result = format(transform(validate(data)));
```

### 高阶函数

```typescript
// ✅ 推荐：map/filter/reduce
const activeUsers = users.filter(u => u.active).map(u => u.name);

// ❌ 避免：for 循环
const activeUsers = [];
for (const u of users) { if (u.active) activeUsers.push(u.name); }
```

### 错误处理

```typescript
// ✅ 推荐：fp-ts Either/TaskEither
import * as TE from "fp-ts/TaskEither";
const saveNode = (node: Node): TE.TaskEither<AppError, Node> => /* ... */;

// ❌ 避免：try-catch 吞掉错误
```

## 业务逻辑抽象审查

### 识别重复模式

当发现多个 action 有相似结构时，必须考虑抽象为高阶函数：

```typescript
// ❌ 重复模式 - diary 和 wiki 都是这个结构
export const createXxxFile = (params) => {
  const content = generateXxxTemplate(params);  // 1. 生成模板
  const result = await createFileInTree({...}); // 2. 创建文件
  return { node, content, parsedContent };      // 3. 返回结果
};
```

### 高阶函数抽象

```typescript
// ✅ 抽象为高阶函数
interface TemplateConfig<T> {
  readonly name: string;
  readonly rootFolder: string;
  readonly fileType: Exclude<NodeType, "folder">;     // 排除 folder 类型
  readonly tag: string;
  readonly generateTemplate: (params: T) => string;
  readonly generateFolderPath: (params: T) => string[];
  readonly generateTitle: (params: T) => string;
  readonly paramsSchema: z.ZodSchema<T>;
  readonly foldersCollapsed?: boolean;
}

const createTemplatedFile = <T>(config: TemplateConfig<T>) => 
  (params: TemplatedFileParams<T>): TE.TaskEither<AppError, TemplatedFileResult> =>
    pipe(
      TE.Do,
      TE.bind("content", () => TE.of(config.generateTemplate(params.templateParams))),
      TE.bind("parsed", ({ content }) => parseJson(content)),
      TE.chain(({ content }) => createFileInTree({
        workspaceId: params.workspaceId,
        title: config.generateTitle(params.templateParams),
        folderPath: [config.rootFolder, ...config.generateFolderPath(params.templateParams)],
        type: config.fileType,
        tags: [config.tag],
        content,
        foldersCollapsed: config.foldersCollapsed ?? true,
      })),
      TE.map(result => ({ node: result.node, content, parsedContent: parsed }))
    );

// 实例化
export const createDiary = createTemplatedFile(diaryConfig);
export const createWiki = createTemplatedFile(wikiConfig);
```

### 抽象审查清单

| 信号 | 行动 |
|------|------|
| 复制粘贴代码 | 立即考虑抽象 |
| 相似的文件结构 | 提取高阶函数 |
| 相同的错误处理 | 抽象为通用模式 |
| 相似的测试用例 | 使用参数化测试 |

### 抽象原则

- **3 次规则**：相同模式出现 3 次时必须抽象
- **结构相似度 > 80%**：大部分逻辑相同，只有参数不同
- **不过度抽象**：只有 2 个实例且不太可能扩展时，可以不抽象

## 组件规范

### 组件分层架构

```
Route (路由组件)           → 编排层：仅路由定义
  │
  ▼
Container (容器组件)       → 数据层：连接 hooks/stores
  │
  │ props (纯数据 + 回调函数)
  ▼
View (展示组件)            → 展示层：只接收 props，无副作用
```

### 组件命名规范

**所有纯函数式组件使用 `.fn.tsx` 后缀：**

| 类型 | 命名格式 | 说明 |
|------|---------|------|
| 纯展示组件 | `xxx.view.fn.tsx` | 只接收 props，无副作用 |
| 容器组件 | `xxx.container.fn.tsx` | 连接 hooks/stores |
| 类型定义 | `xxx.types.ts` | Props/State 类型 |
| 工具函数 | `xxx.utils.ts` | 组件专用工具 |

### 纯展示组件 (`.view.fn.tsx`)

```typescript
// file-tree.view.fn.tsx
import { memo } from "react";

interface FileTreeViewProps {
  readonly nodes: TreeNode[];
  readonly selectedId: string | null;
  readonly onSelect: (id: string) => void;
  readonly onExpand: (id: string, expanded: boolean) => void;
}

export const FileTreeView = memo(({ 
  nodes, 
  selectedId, 
  onSelect,
  onExpand 
}: FileTreeViewProps) => {
  // ✅ 允许：纯 UI 状态
  const [isHovered, setIsHovered] = useState(false);
  
  // ❌ 禁止：业务数据状态
  // const [nodes, setNodes] = useState([]);
  
  // ❌ 禁止：直接访问 store
  // const nodes = useNodes();
  
  return (
    <div onMouseEnter={() => setIsHovered(true)}>
      {nodes.map(node => (
        <TreeItem 
          key={node.id} 
          node={node} 
          isSelected={node.id === selectedId}
          onSelect={onSelect}
        />
      ))}
    </div>
  );
});
```

### 容器组件 (`.container.fn.tsx`)

```typescript
// file-tree.container.fn.tsx
import { memo } from "react";
import { FileTreeView } from "./file-tree.view.fn";
import { useNodesByWorkspace } from "@/hooks/use-node";
import { useSelectionStore } from "@/stores/selection.store";

export const FileTreeContainer = memo(() => {
  // ✅ 在容器组件中连接数据
  const workspaceId = useSelectionStore(s => s.workspaceId);
  const nodes = useNodesByWorkspace(workspaceId);
  const { selectedId, setSelectedId } = useSelectionStore();
  
  // ✅ 在容器组件中处理回调
  const handleSelect = useCallback((id: string) => {
    setSelectedId(id);
  }, [setSelectedId]);
  
  return (
    <FileTreeView
      nodes={nodes}
      selectedId={selectedId}
      onSelect={handleSelect}
    />
  );
});
```

### 组件目录结构

```
components/
├── file-tree/
│   ├── file-tree.view.fn.tsx       # 纯展示组件
│   ├── file-tree.view.fn.test.tsx  # View 组件测试
│   ├── file-tree.container.fn.tsx  # 容器组件
│   ├── file-tree.container.fn.test.tsx  # Container 组件测试
│   ├── file-tree.types.ts          # 类型定义
│   ├── file-tree.utils.ts          # 工具函数（可选）
│   ├── file-tree.utils.test.ts     # 工具函数测试（可选）
│   └── index.ts                    # 统一导出
```

### index.ts 导出规范

```typescript
// index.ts
export { FileTreeView } from './file-tree.view.fn';
export { FileTreeContainer } from './file-tree.container.fn';
export { FileTreeContainer as FileTree } from './file-tree.container.fn';
export type { FileTreeViewProps } from './file-tree.types';
```

### 组件纯函数式要求

**`.fn.tsx` 后缀的组件必须满足：**

1. **无 class 组件** - 只使用函数组件
2. **使用 memo()** - 所有组件用 `memo()` 包裹
3. **无内部业务状态** - 只允许 UI 状态（isOpen、isHovered 等）
4. **Props 驱动** - 所有数据和回调通过 props 传入
5. **Props readonly** - Props 接口属性使用 `readonly`

### 允许的组件内部状态

```typescript
// ✅ 允许：纯 UI 状态
const [isOpen, setIsOpen] = useState(false);
const [isHovered, setIsHovered] = useState(false);
const [isExpanded, setIsExpanded] = useState(true);
const [inputValue, setInputValue] = useState(""); // 表单输入

// ❌ 禁止：业务数据状态
const [nodes, setNodes] = useState([]);
const [user, setUser] = useState(null);
```

### 旧组件命名（待迁移）

| 旧命名 | 新命名 |
|--------|--------|
| `file-tree.tsx` | `file-tree.view.fn.tsx` |
| `file-tree-connected.tsx` | `file-tree.container.fn.tsx` |
| `wiki-hover-preview.tsx` | `wiki-hover-preview.view.fn.tsx` |
| `wiki-hover-preview-connected.tsx` | `wiki-hover-preview.container.fn.tsx` |

## 模板化文件创建规范

### 统一文件夹结构

所有模板化文件（Diary、Wiki、Ledger 等）必须使用统一的文件夹结构：

```
{RootFolder}/
├── year-YYYY-{Zodiac}/           # 年份文件夹（带生肖）
│   └── month-MM-{MonthName}/     # 月份文件夹
│       └── day-DD-{Weekday}/     # 日期文件夹（可选，仅 Diary）
│           └── {prefix}-{timestamp}-{time}  # 文件名
```

**示例：**
- Diary: `Diary/year-2024-Dragon/month-12-December/day-27-Friday/diary-1735315200-14-30-00`
- Wiki: `Wiki/year-2024-Dragon/month-12-December/wiki-1735315200-14-30-00`
- Ledger: `Ledger/year-2024-Dragon/month-12-December/ledger-1735315200-14-30-00`

### 必须使用高阶函数

所有模板化文件创建必须使用 `createTemplatedFile` 高阶函数：

```typescript
// ✅ 正确：使用高阶函数
import { createTemplatedFile } from "@/actions/templated";
export const createDiary = createTemplatedFile(diaryConfig);
export const createWiki = createTemplatedFile(wikiConfig);
export const createLedger = createTemplatedFile(ledgerConfig);

// ❌ 错误：手动实现创建逻辑
export const createDiary = async (params) => {
  const content = generateDiaryContent(params.date);
  // ... 重复的创建逻辑
};
```

### 必须使用统一的日期函数

所有模板配置必须使用 `@/fn/date` 中的函数生成文件夹结构：

```typescript
// ✅ 正确：使用统一的日期函数
import { getDateFolderStructure } from "@/fn/date";

const generateFolderPath = (params: DiaryTemplateParams): string[] => {
  const structure = getDateFolderStructure(params.date);
  return [structure.yearFolder, structure.monthFolder, structure.dayFolder];
};

// ❌ 错误：使用独立的文件夹结构函数
import { getLedgerFolderStructure } from "@/fn/ledger";  // 不要使用
```

### 模板配置结构

```typescript
interface TemplateConfig<T> {
  readonly name: string;           // 模块名称（用于日志）
  readonly rootFolder: string;     // 根文件夹（Diary/Wiki/Ledger）
  readonly fileType: NodeType;     // 文件类型
  readonly tag: string;            // 默认标签
  readonly generateTemplate: (params: T) => string;      // 生成内容
  readonly generateFolderPath: (params: T) => string[];  // 生成文件夹路径
  readonly generateTitle: (params: T) => string;         // 生成标题
  readonly paramsSchema: z.ZodSchema<T>;                 // 参数校验
  readonly foldersCollapsed?: boolean;                   // 文件夹是否折叠
}
```

### 新增模板类型检查清单

创建新的模板化文件类型时，必须检查：

1. ✅ 使用 `createTemplatedFile` 高阶函数
2. ✅ 使用 `getDateFolderStructure` 生成年份/月份文件夹
3. ✅ 根文件夹名称唯一且有意义
4. ✅ 文件类型正确（diary/file/canvas）
5. ✅ 有对应的 Zod 参数校验 Schema
6. ✅ 有对应的测试文件

## Actions 规范

### 文件组织

- 默认：一个函数一个文件
- 例外：< 10 行且强相关可合并
- 命名：`动作-对象.action.ts`

### Action 示例

```typescript
// create-node.action.ts
export const createNode = (params: CreateNodeParams): TE.TaskEither<AppError, Node> => {
  logger.start("[Node] 创建节点...");
  
  return pipe(
    TE.Do,
    TE.bind("validated", () => validateParams(params)),
    TE.chain(({ validated }) => saveToDb(validated)),
    TE.tap(() => TE.of(logger.success("[Node] 节点创建成功")))
  );
};
```

## 日志规范

```typescript
// ❌ 禁止
console.log("data saved");

// ✅ 推荐
import logger from "@/log";
logger.info("[ModuleName] 操作描述", data);
```

| 级别 | 用途 |
|------|------|
| `logger.start()` | 流程开始 |
| `logger.info()` | 一般信息 |
| `logger.success()` | 操作成功 |
| `logger.warn()` | 警告 |
| `logger.error()` | 错误 |

## 时间处理

```typescript
// ❌ 禁止
const now = new Date();
const timestamp = Date.now();

// ✅ 推荐
import dayjs from "dayjs";
const now = dayjs();
const timestamp = dayjs().valueOf();
```

## 工具函数

```typescript
// ❌ 禁止
import { debounce } from "lodash";

// ✅ 推荐
import { debounce } from "es-toolkit";
```

## 测试规范

### 必须有测试的文件

| 文件类型 | 测试要求 |
|---------|---------|
| `*.fn.ts` | 必须有 `*.fn.test.ts` |
| `*.action.ts` | 必须有 `*.action.test.ts` |
| `*.db.fn.ts` | 必须有测试（可 mock DB） |
| `*.view.fn.tsx` | 必须有 `*.view.fn.test.tsx` |
| `*.container.fn.tsx` | 必须有 `*.container.fn.test.tsx` |
| `*.utils.ts` | 必须有 `*.utils.test.ts` |

### 测试文件位置

测试文件与源文件放在同一目录。

### 组件测试策略

**View 组件测试（`*.view.fn.test.tsx`）：**
- 测试 props 渲染
- 测试用户交互（点击、输入等）
- 测试条件渲染
- 使用 React Testing Library

**Container 组件测试（`*.container.fn.test.tsx`）：**
- 测试数据获取和传递
- 测试回调函数调用
- Mock hooks 和 stores
- 验证与 View 组件的集成

**测试示例：**

```typescript
// file-tree.view.fn.test.tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { FileTreeView } from './file-tree.view.fn';

describe('FileTreeView', () => {
  it('should render nodes', () => {
    const nodes = [{ id: '1', title: 'Test' }];
    render(<FileTreeView nodes={nodes} selectedId={null} onSelect={vi.fn()} />);
    expect(screen.getByText('Test')).toBeInTheDocument();
  });

  it('should call onSelect when node clicked', () => {
    const onSelect = vi.fn();
    const nodes = [{ id: '1', title: 'Test' }];
    render(<FileTreeView nodes={nodes} selectedId={null} onSelect={onSelect} />);
    fireEvent.click(screen.getByText('Test'));
    expect(onSelect).toHaveBeenCalledWith('1');
  });
});
```

## 注释规范

- **所有注释使用中文**
- 技术术语可保留英文

```typescript
/**
 * 将节点树转换为 Markdown 格式
 * 
 * @param nodes - 要转换的节点数组
 * @returns Markdown 字符串
 */
```

## 代码清理

必须清理：
- 未使用的 import
- 未使用的变量、函数
- `console.log` 调试代码
- 被注释掉的代码块
