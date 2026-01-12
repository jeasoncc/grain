# Design Document

## Overview

本设计文档描述 Grain ESLint 插件的增强实现，目标是创建业界最严格的代码审查系统。插件将强制执行函数式编程模式、架构层级分离、命名规范、性能优化和安全最佳实践。

### 设计原则

1. **零容忍** - 所有规则默认 error 级别，任何违规阻塞提交
2. **完整提示** - 每个错误包含问题描述、正确示例、文档链接
3. **可扩展** - 模块化规则设计，易于添加新规则
4. **高性能** - 规则执行高效，不影响开发体验

## Architecture

```
eslint-plugin-grain/
├── src/
│   ├── index.ts                    # 插件入口，导出所有规则和配置
│   ├── rules/                      # 规则实现
│   │   ├── functional/             # 函数式编程规则
│   │   │   ├── no-try-catch.ts
│   │   │   ├── no-throw.ts
│   │   │   ├── no-mutation.ts
│   │   │   ├── no-promise-methods.ts
│   │   │   ├── require-taskeither.ts
│   │   │   ├── require-option.ts
│   │   │   ├── no-async-outside-io.ts
│   │   │   └── fp-ts-patterns.ts
│   │   ├── architecture/           # 架构层级规则
│   │   │   ├── layer-dependencies.ts
│   │   │   ├── no-react-in-pure-layers.ts
│   │   │   ├── no-side-effects-in-pipes.ts
│   │   │   ├── no-store-in-views.ts
│   │   │   └── file-location.ts
│   │   ├── naming/                 # 命名规范规则
│   │   │   ├── file-naming.ts
│   │   │   ├── variable-naming.ts
│   │   │   ├── function-naming.ts
│   │   │   ├── boolean-naming.ts
│   │   │   └── constant-naming.ts
│   │   ├── complexity/             # 复杂度规则
│   │   │   ├── max-lines.ts
│   │   │   ├── max-params.ts
│   │   │   ├── max-nesting.ts
│   │   │   └── cyclomatic-complexity.ts
│   │   ├── react/                  # React 规则
│   │   │   ├── require-memo.ts
│   │   │   ├── require-callback.ts
│   │   │   ├── no-inline-functions.ts
│   │   │   ├── hooks-patterns.ts
│   │   │   └── component-patterns.ts
│   │   ├── imports/                # 导入规则
│   │   │   ├── no-deprecated-imports.ts
│   │   │   ├── import-grouping.ts
│   │   │   ├── require-alias.ts
│   │   │   └── no-default-export.ts
│   │   ├── security/               # 安全规则
│   │   │   ├── no-eval.ts
│   │   │   ├── no-innerhtml.ts
│   │   │   └── no-sensitive-logging.ts
│   │   ├── documentation/          # 文档规则
│   │   │   ├── require-jsdoc.ts
│   │   │   ├── chinese-comments.ts
│   │   │   └── no-commented-code.ts
│   │   └── magic-values/           # 魔法值规则
│   │       ├── no-magic-numbers.ts
│   │       └── no-hardcoded-values.ts
│   ├── utils/                      # 工具函数
│   │   ├── architecture.ts         # 架构层级判断
│   │   ├── ast-helpers.ts          # AST 辅助函数
│   │   ├── naming-helpers.ts       # 命名检查辅助
│   │   └── message-builder.ts      # 错误消息构建
│   ├── configs/                    # 预设配置
│   │   ├── strict.ts               # 严格模式（默认）
│   │   └── legacy.ts               # 迁移模式
│   └── __tests__/                  # 测试
│       ├── rules/
│       └── utils/
├── package.json
└── tsconfig.json
```

## Components and Interfaces

### 核心接口定义

```typescript
// types/rule.types.ts

/**
 * 规则严重级别
 */
export type RuleSeverity = 'error' | 'warn' | 'off';

/**
 * 错误消息结构
 */
export interface RuleMessage {
  /** 消息 ID */
  id: string;
  /** 主要错误描述（中文） */
  description: string;
  /** 问题原因说明 */
  reason: string;
  /** 正确做法示例 */
  correctExample: string;
  /** 错误做法示例 */
  incorrectExample?: string;
  /** 相关文档链接 */
  docUrl?: string;
  /** 严重级别图标 */
  icon: '❌' | '⚠️' | '💡';
}

/**
 * 架构层级
 */
export type ArchitectureLayer = 
  | 'views' 
  | 'hooks' 
  | 'flows' 
  | 'pipes' 
  | 'io' 
  | 'state' 
  | 'utils' 
  | 'types'
  | 'queries'
  | 'routes';

/**
 * 层级依赖配置
 */
export interface LayerDependencyConfig {
  layer: ArchitectureLayer;
  allowedDependencies: ArchitectureLayer[];
  exceptions?: {
    file: string;
    allowedExtra: ArchitectureLayer[];
  }[];
}

/**
 * 文件命名模式
 */
export interface FileNamingPattern {
  layer: ArchitectureLayer;
  pattern: RegExp;
  description: string;
  example: string;
}
```

### 消息构建器

```typescript
// utils/message-builder.ts

/**
 * 构建标准化的错误消息
 * 所有规则必须使用此函数生成消息，确保格式一致
 */
export function buildErrorMessage(config: {
  title: string;
  reason: string;
  correctExample: string;
  incorrectExample?: string;
  docRef?: string;
}): string {
  const lines = [
    `❌ ${config.title}`,
    '',
    `🔍 原因：`,
    `  ${config.reason}`,
    '',
    `✅ 正确做法：`,
    ...config.correctExample.split('\n').map(line => `  ${line}`),
  ];

  if (config.incorrectExample) {
    lines.push(
      '',
      `❌ 错误做法：`,
      ...config.incorrectExample.split('\n').map(line => `  ${line}`)
    );
  }

  if (config.docRef) {
    lines.push('', `📚 参考文档：${config.docRef}`);
  }

  return lines.join('\n');
}

/**
 * 构建警告消息
 */
export function buildWarningMessage(config: {
  title: string;
  suggestion: string;
  example?: string;
}): string {
  const lines = [
    `⚠️ ${config.title}`,
    '',
    `💡 建议：`,
    `  ${config.suggestion}`,
  ];

  if (config.example) {
    lines.push('', `示例：`, ...config.example.split('\n').map(line => `  ${line}`));
  }

  return lines.join('\n');
}
```

### 架构层级工具

```typescript
// utils/architecture.ts

import path from 'path';

/**
 * 层级依赖矩阵 - 严格模式
 * key: 当前层级
 * value: 允许依赖的层级列表
 */
export const LAYER_DEPENDENCIES: Record<ArchitectureLayer, ArchitectureLayer[]> = {
  views: ['hooks', 'types'],
  hooks: ['flows', 'state', 'queries', 'types'],
  flows: ['pipes', 'io', 'state', 'types'],
  pipes: ['utils', 'types'],
  io: ['types'],
  state: ['types'],  // 严格模式：移除 pipes 例外
  utils: ['types'],
  types: [],
  queries: ['io', 'types'],
  routes: ['views', 'hooks', 'types'],
};

/**
 * 容器组件额外允许的依赖
 */
export const CONTAINER_EXTRA_DEPENDENCIES: ArchitectureLayer[] = [
  'flows', 'state'
];

/**
 * 判断文件所属架构层级
 */
export function getArchitectureLayer(filename: string): ArchitectureLayer | null {
  const normalizedPath = path.normalize(filename);
  
  const layerPatterns: [string, ArchitectureLayer][] = [
    ['/src/views/', 'views'],
    ['/src/hooks/', 'hooks'],
    ['/src/flows/', 'flows'],
    ['/src/pipes/', 'pipes'],
    ['/src/io/', 'io'],
    ['/src/state/', 'state'],
    ['/src/utils/', 'utils'],
    ['/src/types/', 'types'],
    ['/src/queries/', 'queries'],
    ['/src/routes/', 'routes'],
  ];

  for (const [pattern, layer] of layerPatterns) {
    if (normalizedPath.includes(pattern)) {
      return layer;
    }
  }

  return null;
}

/**
 * 判断是否为容器组件
 */
export function isContainerComponent(filename: string): boolean {
  return filename.includes('.container.fn.tsx');
}

/**
 * 判断是否为视图组件
 */
export function isViewComponent(filename: string): boolean {
  return filename.includes('.view.fn.tsx');
}

/**
 * 判断是否为测试文件
 */
export function isTestFile(filename: string): boolean {
  return /\.(test|spec)\.(ts|tsx)$/.test(filename);
}

/**
 * 从导入路径提取层级
 */
export function getImportLayer(importPath: string): ArchitectureLayer | null {
  const match = importPath.match(/@\/([^/]+)/);
  if (!match) return null;
  
  const segment = match[1] as ArchitectureLayer;
  return LAYER_DEPENDENCIES[segment] !== undefined ? segment : null;
}

/**
 * 检查导入是否违反层级依赖
 */
export function isLayerViolation(
  currentLayer: ArchitectureLayer,
  importLayer: ArchitectureLayer,
  isContainer: boolean = false
): boolean {
  const allowed = LAYER_DEPENDENCIES[currentLayer];
  
  if (isContainer && currentLayer === 'views') {
    return ![...allowed, ...CONTAINER_EXTRA_DEPENDENCIES].includes(importLayer);
  }
  
  return !allowed.includes(importLayer);
}
```

## Data Models

### 规则配置模型

```typescript
// types/config.types.ts

/**
 * 复杂度限制配置
 */
export interface ComplexityConfig {
  /** 函数最大行数 */
  maxFunctionLines: number;
  /** 最大参数数量 */
  maxParams: number;
  /** 最大嵌套层级 */
  maxNesting: number;
  /** 最大圈复杂度 */
  maxCyclomaticComplexity: number;
  /** 文件最大行数 */
  maxFileLines: number;
}

/**
 * 默认复杂度配置（严格模式）
 */
export const DEFAULT_COMPLEXITY_CONFIG: ComplexityConfig = {
  maxFunctionLines: 20,
  maxParams: 3,
  maxNesting: 2,
  maxCyclomaticComplexity: 5,
  maxFileLines: 200,
};

/**
 * 命名规范配置
 */
export interface NamingConfig {
  /** 变量最小长度 */
  minVariableLength: number;
  /** 允许的短变量名 */
  allowedShortNames: string[];
  /** 布尔值前缀 */
  booleanPrefixes: string[];
  /** 事件处理器前缀 */
  eventHandlerPrefixes: string[];
  /** 动词列表（函数命名） */
  verbPrefixes: string[];
}

/**
 * 默认命名配置
 */
export const DEFAULT_NAMING_CONFIG: NamingConfig = {
  minVariableLength: 3,
  allowedShortNames: ['i', 'j', 'k', 'x', 'y', 'id'],
  booleanPrefixes: ['is', 'has', 'can', 'should', 'will', 'did'],
  eventHandlerPrefixes: ['handle', 'on'],
  verbPrefixes: [
    'get', 'set', 'create', 'update', 'delete', 'remove',
    'add', 'fetch', 'load', 'save', 'validate', 'transform',
    'parse', 'format', 'build', 'make', 'find', 'filter',
    'map', 'reduce', 'check', 'is', 'has', 'can', 'should',
    'handle', 'on', 'init', 'reset', 'clear', 'toggle',
    'show', 'hide', 'open', 'close', 'enable', 'disable',
  ],
};

/**
 * 文件命名模式配置
 */
export const FILE_NAMING_PATTERNS: FileNamingPattern[] = [
  {
    layer: 'pipes',
    pattern: /\.(pipe|fn)\.ts$/,
    description: '管道文件必须以 .pipe.ts 或 .fn.ts 结尾',
    example: 'transform.pipe.ts, validate.fn.ts',
  },
  {
    layer: 'flows',
    pattern: /\.(flow|action)\.ts$/,
    description: '流程文件必须以 .flow.ts 或 .action.ts 结尾',
    example: 'create-node.flow.ts, save.action.ts',
  },
  {
    layer: 'io',
    pattern: /\.(api|storage|file)\.ts$/,
    description: 'IO 文件必须以 .api.ts, .storage.ts 或 .file.ts 结尾',
    example: 'node.api.ts, settings.storage.ts',
  },
  {
    layer: 'state',
    pattern: /\.state\.ts$/,
    description: '状态文件必须以 .state.ts 结尾',
    example: 'selection.state.ts',
  },
  {
    layer: 'hooks',
    pattern: /^use-.+\.ts$/,
    description: 'Hook 文件必须以 use- 开头',
    example: 'use-workspace.ts',
  },
  {
    layer: 'utils',
    pattern: /\.util\.ts$/,
    description: '工具文件必须以 .util.ts 结尾',
    example: 'date.util.ts',
  },
  {
    layer: 'views',
    pattern: /\.(view|container)\.fn\.tsx$/,
    description: '视图文件必须以 .view.fn.tsx 或 .container.fn.tsx 结尾',
    example: 'file-tree.view.fn.tsx',
  },
];

/**
 * 禁止的库列表
 */
export const BANNED_LIBRARIES: Record<string, string> = {
  'lodash': 'es-toolkit',
  'lodash-es': 'es-toolkit',
  'underscore': 'es-toolkit',
  'moment': 'dayjs',
  'moment-timezone': 'dayjs + dayjs/plugin/timezone',
  'request': 'fetch API',
  'axios': 'fetch API with TaskEither',
  'jquery': '原生 DOM API 或 React',
};

/**
 * 副作用全局对象
 */
export const SIDE_EFFECT_GLOBALS = [
  'window',
  'document',
  'localStorage',
  'sessionStorage',
  'fetch',
  'XMLHttpRequest',
  'console',
  'alert',
  'confirm',
  'prompt',
  'setTimeout',
  'setInterval',
  'requestAnimationFrame',
] as const;

/**
 * 数组变异方法
 */
export const ARRAY_MUTATION_METHODS = [
  'push',
  'pop',
  'shift',
  'unshift',
  'splice',
  'sort',
  'reverse',
  'fill',
  'copyWithin',
] as const;
```


## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*


### Property 1: Error Handling Pattern Detection

*For any* code snippet containing try-catch, throw, or Promise.catch(), the ESLint plugin SHALL detect and report an error with the correct alternative suggestion (TaskEither.tryCatch, Either.left, or TE.orElse respectively).

**Validates: Requirements 1.1, 1.2, 1.3**

### Property 2: Immutability Enforcement

*For any* code snippet containing array mutation methods (push, pop, shift, unshift, splice, sort, reverse, fill) or direct object property assignment, the ESLint plugin SHALL detect and report an error with the immutable alternative.

**Validates: Requirements 1.5, 1.6, 1.7, 1.8, 18.1-18.7, 19.1-19.7**

### Property 3: Architecture Layer Dependency Validation

*For any* import statement in a file within a known architecture layer, if the import targets a layer not in the allowed dependencies list, the ESLint plugin SHALL report an error with the correct layer dependency rules.

**Validates: Requirements 2.1-2.12**

### Property 4: Side Effect Detection in Pure Layers

*For any* code in pipes/ or utils/ directories containing side effect globals (console, fetch, localStorage, etc.), async functions, or Promise usage, the ESLint plugin SHALL report an error.

**Validates: Requirements 3.1-3.10**

### Property 5: File Naming Convention Validation

*For any* file in a known architecture layer, if the filename does not match the expected pattern for that layer, the ESLint plugin SHALL report a warning with the correct naming convention.

**Validates: Requirements 4.1-4.10**

### Property 6: Banned Library Detection

*For any* import statement importing from a banned library (lodash, moment, etc.), the ESLint plugin SHALL report an error with the modern alternative suggestion.

**Validates: Requirements 5.1-5.7**

### Property 7: React Component Pattern Enforcement

*For any* React component, if it violates component patterns (missing memo, inline functions in props, store access in views), the ESLint plugin SHALL report an error with the correct pattern.

**Validates: Requirements 6.1-6.7, 21.1-21.7, 25.1-25.6**

### Property 8: Import Organization Validation

*For any* file with imports, if imports are not properly grouped or do not use @/ alias for internal imports, the ESLint plugin SHALL report an error with auto-fix capability.

**Validates: Requirements 7.1-7.6**

### Property 9: Code Complexity Metrics Enforcement

*For any* function, if it exceeds complexity limits (lines > 20, params > 3, nesting > 2, cyclomatic > 5), the ESLint plugin SHALL report an error.

**Validates: Requirements 15.1-15.6**

### Property 10: Naming Convention Enforcement

*For any* identifier (variable, function, constant, boolean), if it does not follow the naming convention (min length, verb prefix, boolean prefix, etc.), the ESLint plugin SHALL report an error.

**Validates: Requirements 16.1-16.7**

### Property 11: Security Pattern Detection

*For any* code containing security risks (eval, innerHTML, sensitive data logging), the ESLint plugin SHALL report an error.

**Validates: Requirements 24.1-24.7**

### Property 12: fp-ts Pattern Enforcement

*For any* code using fp-ts, if patterns are incorrect (unfolded Either/Option, unexecuted TaskEither, manual null checks), the ESLint plugin SHALL report an error with the correct fp-ts pattern.

**Validates: Requirements 26.1-26.7**

## Error Handling

### 错误消息设计原则

**目标：让 AI 和开发者都能立即理解问题并知道如何修复**

1. **明确指出错误位置** - 精确到行号、列号、代码片段
2. **解释为什么这是错误** - 引用架构原则和设计哲学
3. **提供完整的修复方案** - 不只是说"不要这样做"，而是"应该这样做"
4. **给出可复制的代码示例** - 修复后的代码可以直接使用
5. **链接到详细文档** - 提供深入学习的路径

### 错误消息标准格式

```typescript
/**
 * 完整错误消息模板
 * 设计用于 AI 和人类开发者都能理解
 */
const COMPREHENSIVE_ERROR_TEMPLATE = `
❌ 【错误】{title}

�  位置：{filePath}:{line}:{column}
📝 问题代码：
  {problemCode}

🔍 错误原因：
  {reason}

🏗️ 架构原则：
  {architecturePrinciple}

✅ 修复方案：
  步骤 1: {step1}
  步骤 2: {step2}
  步骤 3: {step3}

📋 修复后的代码：
\`\`\`typescript
{fixedCode}
\`\`\`

⚠️ 注意事项：
  {warnings}

📚 参考文档：
  - {docUrl}
  - {steeringFile}

� 相关规则：
  - {relatedRules}
`;
```

### 错误消息示例库

#### 1. try-catch 错误

```typescript
const NO_TRY_CATCH_MESSAGE = buildErrorMessage({
  title: '禁止使用 try-catch 语句',
  problemCode: `
try {
  const result = await fetchData();
} catch (error) {
  console.error(error);
}`,
  reason: `
  try-catch 隐藏了错误的类型信息，使得：
  - 无法在编译时知道函数可能失败
  - 错误处理逻辑分散在各处
  - 难以追踪错误的来源和类型`,
  architecturePrinciple: `
  Grain 项目使用 fp-ts 的 TaskEither 进行函数式错误处理：
  - 错误是显式的返回值，不是异常
  - 类型系统强制处理所有错误情况
  - 错误可以在管道中优雅传递`,
  steps: [
    '将 try-catch 替换为 TE.tryCatch()',
    '定义明确的错误类型 AppError',
    '使用 pipe() 组合操作',
    '在管道末端使用 TE.fold() 处理结果',
  ],
  fixedCode: `
import { pipe } from 'fp-ts/function';
import * as TE from 'fp-ts/TaskEither';
import { AppError } from '@/types/error.types';

const fetchDataSafe = (): TE.TaskEither<AppError, Data> =>
  TE.tryCatch(
    () => fetchData(),
    (error): AppError => ({
      type: 'FETCH_ERROR',
      message: \`获取数据失败: \${String(error)}\`,
      cause: error,
    })
  );

// 使用
pipe(
  fetchDataSafe(),
  TE.fold(
    (error) => T.of(logger.error('[Module] 获取失败', error)),
    (data) => T.of(processData(data))
  )
)();`,
  warnings: [
    '不要在 TE.tryCatch 的错误处理函数中返回字符串，必须返回 AppError 类型',
    '记得在管道末端调用 () 执行 TaskEither',
  ],
  docUrl: 'https://gcanti.github.io/fp-ts/modules/TaskEither.ts.html',
  steeringFile: '#fp-patterns - TaskEither 异步错误处理',
  relatedRules: ['no-throw', 'no-promise-catch', 'require-taskeither'],
});
```

#### 2. 数组变异错误

```typescript
const NO_ARRAY_MUTATION_MESSAGE = (method: string, arrayName: string) => buildErrorMessage({
  title: `禁止使用 ${method}() 变异数组`,
  problemCode: `${arrayName}.${method}(newItem);`,
  reason: `
  ${method}() 会直接修改原数组，违反不可变性原则：
  - 导致难以追踪的状态变化
  - 破坏 React 的变化检测机制
  - 使得函数不再是纯函数`,
  architecturePrinciple: `
  Grain 项目遵循不可变数据原则：
  - 数据一旦创建就不可修改
  - 更新操作返回新对象
  - 使用展开运算符或 Immer 进行更新`,
  steps: [
    `将 ${method}() 替换为不可变操作`,
    '使用展开运算符创建新数组',
    '或使用 fp-ts/Array 的函数式方法',
  ],
  fixedCode: getImmutableAlternative(method, arrayName),
  warnings: [
    '确保不要在原数组上调用任何变异方法',
    '如果需要排序，先复制数组：[...array].sort()',
  ],
  docUrl: '#code-standards - 不可变性',
  steeringFile: '#fp-patterns - 不可变数据',
  relatedRules: ['no-object-mutation', 'prefer-spread'],
});

function getImmutableAlternative(method: string, arrayName: string): string {
  const alternatives: Record<string, string> = {
    push: `// 添加元素到末尾
const newArray = [...${arrayName}, newItem];
// 添加多个元素
const newArray = [...${arrayName}, item1, item2];`,
    pop: `// 移除最后一个元素
const newArray = ${arrayName}.slice(0, -1);
// 获取最后一个元素
const lastItem = ${arrayName}[${arrayName}.length - 1];`,
    shift: `// 移除第一个元素
const newArray = ${arrayName}.slice(1);
// 获取第一个元素
const firstItem = ${arrayName}[0];`,
    unshift: `// 添加元素到开头
const newArray = [newItem, ...${arrayName}];`,
    splice: `// 删除元素
const newArray = ${arrayName}.filter((_, index) => index !== targetIndex);
// 插入元素
const newArray = [
  ...${arrayName}.slice(0, insertIndex),
  newItem,
  ...${arrayName}.slice(insertIndex)
];`,
    sort: `// 排序（不修改原数组）
const sorted = [...${arrayName}].sort((a, b) => a.name.localeCompare(b.name));
// 使用 fp-ts
import * as A from 'fp-ts/Array';
import { Ord } from 'fp-ts/Ord';
const sorted = A.sort(Ord.contramap((item: Item) => item.name)(S.Ord))(${arrayName});`,
    reverse: `// 反转（不修改原数组）
const reversed = [...${arrayName}].reverse();`,
  };
  return alternatives[method] || `const newArray = [...${arrayName}];`;
}
```

#### 3. 架构层级违规错误

```typescript
const LAYER_VIOLATION_MESSAGE = (
  currentLayer: string,
  importLayer: string,
  allowedLayers: string[],
  importPath: string
) => buildErrorMessage({
  title: `架构层级违规：${currentLayer} 层不能依赖 ${importLayer} 层`,
  problemCode: `import { something } from '${importPath}';`,
  reason: `
  当前文件位于 ${currentLayer}/ 层，但导入了 ${importLayer}/ 层的模块。
  这违反了 Grain 项目的架构层级依赖规则。`,
  architecturePrinciple: `
  Grain 项目采用严格的分层架构：
  
  views/     →  只能依赖 hooks/, types/
  hooks/     →  只能依赖 flows/, state/, queries/, types/
  flows/     →  只能依赖 pipes/, io/, state/, types/
  pipes/     →  只能依赖 utils/, types/
  io/        →  只能依赖 types/
  state/     →  只能依赖 types/
  utils/     →  只能依赖 types/
  
  当前层 ${currentLayer}/ 允许依赖：${allowedLayers.join(', ')}`,
  steps: [
    `检查是否真的需要这个依赖`,
    `如果需要，考虑以下方案：`,
    `  - 将逻辑移动到允许的层级`,
    `  - 通过中间层间接访问`,
    `  - 重新设计数据流`,
  ],
  fixedCode: getLayerFixSuggestion(currentLayer, importLayer),
  warnings: [
    '不要为了绕过规则而创建不必要的中间层',
    '如果发现架构规则阻碍了合理的设计，请讨论是否需要调整架构',
  ],
  docUrl: '#architecture - 依赖规则',
  steeringFile: '#structure - 目录结构',
  relatedRules: ['no-react-in-pure-layers', 'no-side-effects-in-pipes'],
});

function getLayerFixSuggestion(currentLayer: string, importLayer: string): string {
  const suggestions: Record<string, Record<string, string>> = {
    views: {
      flows: `// views/ 不能直接导入 flows/
// 方案 1: 使用 hooks 封装
// 在 hooks/ 中创建 hook
// hooks/use-create-node.ts
import { createNode } from '@/flows/node/create-node.flow';
export const useCreateNode = () => {
  const mutation = useMutation({ mutationFn: createNode });
  return mutation;
};

// 在 views/ 中使用 hook
import { useCreateNode } from '@/hooks/use-create-node';
const { mutate } = useCreateNode();`,
      io: `// views/ 不能直接导入 io/
// 方案: 通过 hooks/ 和 flows/ 间接访问
// 数据流: views/ → hooks/ → flows/ → io/`,
      pipes: `// views/ 不能直接导入 pipes/
// 方案: 通过 hooks/ 封装
// 或者将纯函数移动到 utils/ 层`,
    },
    pipes: {
      io: `// pipes/ 不能导入 io/（pipes 必须是纯函数）
// 方案: 将 IO 操作移动到 flows/ 层
// flows/ 负责组合 pipes/ 和 io/

// flows/save-node.flow.ts
import { transformNode } from '@/pipes/node/transform.pipe';
import { nodeApi } from '@/io/api/node.api';

export const saveNode = (node: Node) =>
  pipe(
    transformNode(node),      // 纯函数转换
    nodeApi.save              // IO 操作
  );`,
      state: `// pipes/ 不能导入 state/（pipes 必须是纯函数）
// 方案: 将状态作为参数传入
// 不要在 pipes 中访问全局状态

// ❌ 错误
const transform = (node: Node) => {
  const settings = useSettingsStore.getState();
  return { ...node, ...settings };
};

// ✅ 正确
const transform = (node: Node, settings: Settings) => {
  return { ...node, ...settings };
};`,
    },
  };
  
  return suggestions[currentLayer]?.[importLayer] || 
    `// 请检查架构文档，确定正确的依赖路径`;
}
```

#### 4. 复杂度超标错误

```typescript
const COMPLEXITY_ERROR_MESSAGE = (
  type: 'lines' | 'params' | 'nesting' | 'cyclomatic',
  actual: number,
  limit: number,
  functionName: string
) => {
  const configs = {
    lines: {
      title: `函数 ${functionName} 超过 ${limit} 行（当前 ${actual} 行）`,
      reason: '过长的函数难以理解、测试和维护',
      suggestion: '将函数拆分为多个小函数，每个函数只做一件事',
    },
    params: {
      title: `函数 ${functionName} 参数超过 ${limit} 个（当前 ${actual} 个）`,
      reason: '过多的参数表明函数职责不清晰',
      suggestion: '使用对象参数或拆分函数',
    },
    nesting: {
      title: `函数 ${functionName} 嵌套超过 ${limit} 层（当前 ${actual} 层）`,
      reason: '深层嵌套降低代码可读性',
      suggestion: '使用早返回、提取函数或使用 pipe 组合',
    },
    cyclomatic: {
      title: `函数 ${functionName} 圈复杂度超过 ${limit}（当前 ${actual}）`,
      reason: '高圈复杂度意味着过多的分支路径',
      suggestion: '使用策略模式、查找表或拆分函数',
    },
  };

  const config = configs[type];
  
  return buildErrorMessage({
    title: config.title,
    reason: config.reason,
    architecturePrinciple: `
  Grain 项目的复杂度限制：
  - 函数最大行数：20 行
  - 最大参数数量：3 个
  - 最大嵌套层级：2 层
  - 最大圈复杂度：5
  - 文件最大行数：200 行`,
    steps: [config.suggestion],
    fixedCode: getComplexityFixExample(type),
    docUrl: '#code-standards - 复杂度限制',
  });
};

function getComplexityFixExample(type: string): string {
  const examples: Record<string, string> = {
    params: `// ❌ 参数过多
function createUser(name: string, email: string, age: number, role: string, dept: string) {}

// ✅ 使用对象参数
interface CreateUserParams {
  name: string;
  email: string;
  age: number;
  role: string;
  department: string;
}
function createUser(params: CreateUserParams) {}`,
    nesting: `// ❌ 嵌套过深
function process(data) {
  if (data) {
    if (data.items) {
      for (const item of data.items) {
        if (item.valid) {
          // 处理逻辑
        }
      }
    }
  }
}

// ✅ 使用早返回和 pipe
function process(data) {
  if (!data?.items) return;
  
  pipe(
    data.items,
    A.filter(item => item.valid),
    A.map(processItem)
  );
}`,
    lines: `// ✅ 拆分为多个小函数
const validateInput = (input: Input): E.Either<Error, ValidInput> => { /* ... */ };
const transformData = (data: ValidInput): TransformedData => { /* ... */ };
const saveToDatabase = (data: TransformedData): TE.TaskEither<Error, Result> => { /* ... */ };

// 组合
const processInput = (input: Input) =>
  pipe(
    validateInput(input),
    E.map(transformData),
    TE.fromEither,
    TE.chain(saveToDatabase)
  );`,
  };
  return examples[type] || '';
}
```

### 错误分类

| 类别 | 图标 | 说明 | 严重级别 |
|------|------|------|---------|
| 架构违规 | 🏗️ | 层级依赖、文件位置错误 | error |
| 函数式违规 | 🧪 | try-catch、mutation、副作用 | error |
| 命名违规 | 📝 | 文件名、变量名、函数名 | error |
| 性能问题 | ⚡ | 内联函数、缺少 memo | error |
| 安全问题 | 🔒 | eval、innerHTML、敏感数据 | error |
| 复杂度超标 | 📊 | 行数、参数、嵌套 | error |
| 类型安全 | 🔷 | any 类型、非空断言 | error |
| 文档缺失 | 📖 | 缺少 JSDoc、注释 | error |

## Testing Strategy

### 测试方法

本项目采用双重测试策略：

1. **单元测试** - 验证特定示例和边界情况
2. **属性测试** - 验证规则在所有有效输入上的正确性

### 属性测试配置

- 使用 `fast-check` 作为属性测试库
- 每个属性测试最少运行 100 次迭代
- 每个测试必须引用设计文档中的属性编号

### 测试文件结构

```
__tests__/
├── rules/
│   ├── functional/
│   │   ├── no-try-catch.test.ts
│   │   ├── no-mutation.test.ts
│   │   └── no-mutation.property.test.ts  # 属性测试
│   ├── architecture/
│   │   ├── layer-dependencies.test.ts
│   │   └── layer-dependencies.property.test.ts
│   └── ...
└── utils/
    ├── architecture.test.ts
    └── message-builder.test.ts
```

### 属性测试示例

```typescript
// no-mutation.property.test.ts
import fc from 'fast-check';
import { RuleTester } from '@typescript-eslint/rule-tester';
import rule from '../../../src/rules/functional/no-mutation';

/**
 * Feature: eslint-plugin-enhancement
 * Property 2: Immutability Enforcement
 * Validates: Requirements 1.5, 1.6, 18.1-18.7, 19.1-19.7
 */
describe('Property 2: Immutability Enforcement', () => {
  const ruleTester = new RuleTester();

  // 生成数组变异方法调用
  const arrayMutationArbitrary = fc.constantFrom(
    'push', 'pop', 'shift', 'unshift', 'splice', 'sort', 'reverse', 'fill'
  );

  it('should detect all array mutation methods', () => {
    fc.assert(
      fc.property(arrayMutationArbitrary, (method) => {
        const code = `const arr = [1, 2, 3]; arr.${method}();`;
        
        // 验证规则报告错误
        const result = runRule(rule, code);
        expect(result.errors.length).toBeGreaterThan(0);
        expect(result.errors[0].messageId).toContain('mutation');
      }),
      { numRuns: 100 }
    );
  });

  // 生成对象属性赋值
  const propertyNameArbitrary = fc.string({ minLength: 1, maxLength: 20 })
    .filter(s => /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(s));

  it('should detect all object property mutations', () => {
    fc.assert(
      fc.property(propertyNameArbitrary, (prop) => {
        const code = `const obj = {}; obj.${prop} = 'value';`;
        
        const result = runRule(rule, code);
        expect(result.errors.length).toBeGreaterThan(0);
        expect(result.errors[0].messageId).toBe('noObjectMutation');
      }),
      { numRuns: 100 }
    );
  });
});
```

### 单元测试示例

```typescript
// layer-dependencies.test.ts
import { RuleTester } from '@typescript-eslint/rule-tester';
import rule from '../../../src/rules/architecture/layer-dependencies';

const ruleTester = new RuleTester();

ruleTester.run('layer-dependencies', rule, {
  valid: [
    // views/ 可以导入 hooks/
    {
      code: `import { useWorkspace } from '@/hooks/use-workspace';`,
      filename: '/src/views/sidebar/sidebar.view.fn.tsx',
    },
    // hooks/ 可以导入 flows/
    {
      code: `import { createNode } from '@/flows/node/create-node.flow';`,
      filename: '/src/hooks/use-node.ts',
    },
    // pipes/ 可以导入 utils/
    {
      code: `import { formatDate } from '@/utils/date.util';`,
      filename: '/src/pipes/node/transform.pipe.ts',
    },
  ],
  invalid: [
    // views/ 不能直接导入 flows/
    {
      code: `import { createNode } from '@/flows/node/create-node.flow';`,
      filename: '/src/views/sidebar/sidebar.view.fn.tsx',
      errors: [{ messageId: 'containerException' }],
    },
    // pipes/ 不能导入 io/
    {
      code: `import { nodeApi } from '@/io/api/node.api';`,
      filename: '/src/pipes/node/transform.pipe.ts',
      errors: [{ messageId: 'layerViolation' }],
    },
  ],
});
```
