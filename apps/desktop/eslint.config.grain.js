/**
 * ESLint 配置 - Grain 完整架构规则
 * 
 * 集成自定义 Grain 插件、文件命名规则和函数式编程规范
 */
import js from '@eslint/js';
import tseslint from '@typescript-eslint/eslint-plugin';
import tsparser from '@typescript-eslint/parser';
import checkFile from 'eslint-plugin-check-file';
import functional from 'eslint-plugin-functional';
import grainPlugin from '@grain/eslint-plugin';
import globals from 'globals';

export default [
  js.configs.recommended,
  {
    files: ['src/**/*.{ts,tsx}'],
    languageOptions: {
      parser: tsparser,
      globals: {
        ...globals.browser,
        ...globals.es2021,
      },
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
        ecmaFeatures: {
          jsx: true,
        },
        project: './tsconfig.json',
        tsconfigRootDir: import.meta.dirname,
      },
    },
    plugins: {
      '@typescript-eslint': tseslint,
      'check-file': checkFile,
      'functional': functional,
      'grain': grainPlugin,
    },
    rules: {
      // ============================================================================
      // 🏗️ Grain 自定义规则
      // ============================================================================
      
      // 函数式编程规则
      'grain/no-try-catch': 'error',
      'grain/no-console-log': 'error',
      'no-console': ['error', { allow: [] }],
      'grain/no-date-constructor': 'error',
      'grain/no-try-catch': 'error',
      'grain/no-console-log': 'error',
      'grain/no-date-constructor': 'error',
      'grain/no-lodash': 'error',
      'grain/no-mutation': 'error',
      
      // 架构层级规则
      'grain/layer-dependencies': 'error',
      'grain/no-react-in-pure-layers': 'error',
      'grain/no-side-effects-in-pipes': 'error',

      // ============================================================================
      // 📁 文件命名规范 (eslint-plugin-check-file)
      // ============================================================================
      
      'check-file/filename-naming-convention': [
        'error',
        {
          // pipes/ 目录必须使用 .pipe.ts 或 .fn.ts 后缀 (允许 index.ts 和测试文件)
          'src/pipes/**/!(index|*.test).ts': 'KEBAB_CASE',
          
          // flows/ 目录必须使用 .flow.ts 后缀 (允许 index.ts 和测试文件)
          'src/flows/**/!(index|*.test).ts': 'KEBAB_CASE',
          
          // io/api/ 目录必须使用 .api.ts 后缀 (允许 index.ts)
          'src/io/api/**/!(index).ts': 'KEBAB_CASE',
          
          // io/storage/ 目录必须使用 .storage.ts 后缀 (允许 index.ts)
          'src/io/storage/**/!(index).ts': 'KEBAB_CASE',
          
          // state/ 目录必须使用 .state.ts 后缀 (允许 index.ts)
          'src/state/**/!(index).ts': 'KEBAB_CASE',
          
          // hooks/ 目录必须使用 use-*.ts 命名模式 (允许 index.ts)
          'src/hooks/**/!(index).ts': 'KEBAB_CASE',
          
          // views/ 目录必须使用 .view.fn.tsx 或 .container.fn.tsx 后缀 (允许 index.tsx)
          'src/views/**/!(index).tsx': 'KEBAB_CASE',
          
          // utils/ 目录必须使用 .util.ts 后缀 (允许 index.ts)
          'src/utils/**/!(index).ts': 'KEBAB_CASE',
          
          // types/ 目录可以使用 .interface.ts, .schema.ts, .types.ts 等 (允许 index.ts)
          'src/types/**/!(index).ts': 'KEBAB_CASE',
          
          // routes/ 目录使用 .route.tsx 后缀 (允许 __root.tsx 和 index.tsx)
          'src/routes/**/!(index|__root).tsx': 'KEBAB_CASE',
          
          // 其他 TypeScript 文件使用 kebab-case
          '**/*.{ts,tsx}': 'KEBAB_CASE',
        },
        {
          ignoreMiddleExtensions: true,
        },
      ],

      // ============================================================================
      // 🧪 函数式编程增强 (eslint-plugin-functional)
      // ============================================================================
      
      'functional/immutable-data': [
        'error',
        {
          ignoreImmediateMutation: false,
          ignoreAccessorPattern: ['^mutable'],
        },
      ],
      'functional/prefer-readonly-type': [
        'error',
        {
          allowLocalMutation: false,
          allowMutableReturnType: false,
          ignoreClass: false,
          ignoreInterface: false,
          ignoreCollections: false,
        },
      ],
      'functional/prefer-property-signatures': 'error',
      'functional/no-this-expressions': 'error',

      // ============================================================================
      // ✅ 基础 TypeScript 和代码质量规则
      // ============================================================================
      
      'prefer-const': 'error',
      'no-var': 'error',
      'no-param-reassign': 'error',
      'no-return-assign': 'error',
      'prefer-arrow-callback': 'error',
      'arrow-body-style': ['error', 'as-needed'],
      
      // TypeScript 规则
      'no-unused-vars': 'off',
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          ignoreRestSiblings: true,
        },
      ],
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/no-explicit-any': 'warn',
    },
  },
  
  // ============================================================================
  // 📂 目录特定规则覆盖
  // ============================================================================
  
  // pipes/ 目录 - 最严格的纯函数规则
  {
    files: ['src/pipes/**/*.ts'],
    rules: {
      'functional/immutable-data': 'error',
      'functional/prefer-readonly-type': 'error',
      'functional/prefer-property-signatures': 'error',
      'functional/no-this-expressions': 'error',
      'grain/no-side-effects-in-pipes': 'error',
      'grain/no-react-in-pure-layers': 'error',
    },
  },
  
  // utils/ 目录 - 纯工具函数
  {
    files: ['src/utils/**/*.ts'],
    rules: {
      'functional/immutable-data': 'error',
      'functional/prefer-readonly-type': 'error',
      'grain/no-react-in-pure-layers': 'error',
    },
  },
  
  // io/ 目录 - IO 操作层
  {
    files: ['src/io/**/*.ts'],
    rules: {
      'grain/no-react-in-pure-layers': 'error',
      // IO 层允许一些副作用，但仍要求函数式错误处理
      'grain/no-try-catch': 'error',
    },
  },
  
  // state/ 目录 - 状态管理
  {
    files: ['src/state/**/*.ts'],
    rules: {
      'grain/no-react-in-pure-layers': 'error',
      'functional/immutable-data': 'warn', // state 可能需要一些可变操作
    },
  },
  
  // flows/ 目录 - 业务流程
  {
    files: ['src/flows/**/*.ts'],
    rules: {
      'grain/no-react-in-pure-layers': 'error',
      'grain/no-try-catch': 'error', // 强制使用 TaskEither
    },
  },
  
  // views/ 目录 - UI 组件
  {
    files: ['src/views/**/*.tsx'],
    rules: {
      'grain/layer-dependencies': 'error',
      // 视图组件允许一些 React 特定的模式
      'functional/immutable-data': 'warn',
      'functional/prefer-readonly-type': 'warn',
    },
  },
  
  // hooks/ 目录 - React hooks
  {
    files: ['src/hooks/**/*.ts'],
    rules: {
      'grain/layer-dependencies': 'error',
      'functional/immutable-data': 'warn', // hooks 可能需要状态更新
    },
  },
  
  // types/ 目录 - 类型定义
  {
    files: ['src/types/**/*.ts'],
    rules: {
      'functional/prefer-readonly-type': 'error',
      // 类型文件不需要运行时规则
      'grain/no-try-catch': 'off',
      'grain/no-console-log': 'off',
    },
  },
  
  // types/ 目录中的 Builder 文件 - 允许可变性
  {
    files: ['src/types/**/*.builder.ts'],
    rules: {
      // Builder 模式需要内部可变性来构建对象
      'functional/immutable-data': 'off',
      'functional/prefer-readonly-type': 'off',
      'grain/no-try-catch': 'off',
      'grain/no-console-log': 'off',
    },
  },
  
  // ============================================================================
  // 🧪 测试文件特殊规则
  // ============================================================================
  
  {
    files: ['**/*.test.ts', '**/*.spec.ts', '**/*.test.tsx', '**/*.spec.tsx'],
    rules: {
      // 测试文件允许更多灵活性
      'grain/no-try-catch': 'off',
      'grain/no-console-log': 'off',
      'functional/immutable-data': 'off',
      'functional/prefer-readonly-type': 'off',
      '@typescript-eslint/no-unused-vars': 'off',
      '@typescript-eslint/no-explicit-any': 'off',
    },
  },
  
  // ============================================================================
  // ⚙️ 配置文件特殊规则
  // ============================================================================
  
  {
    files: [
      '*.config.js',
      '*.config.ts',
      'vite.config.*',
      'vitest.config.*',
      'eslint.config.*',
    ],
    rules: {
      'grain/no-try-catch': 'off',
      'grain/no-console-log': 'off',
      'functional/immutable-data': 'off',
      'check-file/filename-naming-convention': 'off',
    },
  },
];