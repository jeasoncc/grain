/**
 * 配置相关类型定义
 * Configuration-related type definitions for ESLint plugin
 */

import type { ArchitectureLayer, FileNamingPattern } from './rule.types.js';

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
    'render', 'compute', 'calculate', 'process', 'convert',
    'extract', 'merge', 'split', 'join', 'sort', 'group',
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
  {
    layer: 'types',
    pattern: /\.(interface|schema|types)\.ts$/,
    description: '类型文件必须以 .interface.ts, .schema.ts 或 .types.ts 结尾',
    example: 'node.interface.ts, user.schema.ts',
  },
  {
    layer: 'queries',
    pattern: /\.queries\.ts$/,
    description: '查询文件必须以 .queries.ts 结尾',
    example: 'node.queries.ts',
  },
];

/**
 * 禁止的库列表
 */
export const BANNED_LIBRARIES: Record<string, string> = {
  'lodash': 'es-toolkit',
  'lodash-es': 'es-toolkit',
  'lodash/': 'es-toolkit',
  'underscore': 'es-toolkit',
  'moment': 'dayjs',
  'moment-timezone': 'dayjs + dayjs/plugin/timezone',
  'request': 'fetch API',
  'axios': 'fetch API with TaskEither',
  'jquery': '原生 DOM API 或 React',
  'mkdirp': 'fs.mkdir with recursive option',
  'rimraf': 'fs.rm with recursive option',
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
  'cancelAnimationFrame',
  'clearTimeout',
  'clearInterval',
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

/**
 * 对象变异方法
 */
export const OBJECT_MUTATION_METHODS = [
  'assign',
  'defineProperty',
  'defineProperties',
  'setPrototypeOf',
] as const;

/**
 * React 相关导入
 */
export const REACT_IMPORTS = [
  'react',
  'react-dom',
  'react-dom/client',
  'react-dom/server',
  'react/jsx-runtime',
  'react/jsx-dev-runtime',
] as const;

/**
 * 层级依赖矩阵 - 严格模式
 * key: 当前层级
 * value: 允许依赖的层级列表
 */
export const STRICT_LAYER_DEPENDENCIES: Record<ArchitectureLayer, ArchitectureLayer[]> = {
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
 * 层级依赖矩阵 - 宽松模式（用于迁移）
 */
export const LEGACY_LAYER_DEPENDENCIES: Record<ArchitectureLayer, ArchitectureLayer[]> = {
  views: ['hooks', 'flows', 'state', 'types'],
  hooks: ['flows', 'state', 'queries', 'types', 'io'],
  flows: ['pipes', 'io', 'state', 'types'],
  pipes: ['utils', 'types'],
  io: ['types'],
  state: ['types', 'pipes'],
  utils: ['types'],
  types: [],
  queries: ['io', 'types'],
  routes: ['views', 'hooks', 'flows', 'state', 'types'],
};

/**
 * 容器组件额外允许的依赖
 */
export const CONTAINER_EXTRA_DEPENDENCIES: ArchitectureLayer[] = [
  'flows', 'state'
];

/**
 * 废弃目录列表
 */
export const DEPRECATED_DIRECTORIES = [
  'fn',
  'components',
  'actions',
  'stores',
  'lib',
] as const;

/**
 * 安全敏感关键词
 */
export const SENSITIVE_KEYWORDS = [
  'password',
  'passwd',
  'secret',
  'token',
  'apikey',
  'api_key',
  'apiKey',
  'auth',
  'credential',
  'private',
  'privateKey',
  'private_key',
] as const;
