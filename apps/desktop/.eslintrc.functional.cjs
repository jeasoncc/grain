/**
 * ESLint 配置 - Grain 函数式编程规则
 * 
 * 基于 agent hooks 和 steering 规则，强制执行函数式编程模式和架构规范
 */
module.exports = {
  root: true,
  env: {
    browser: true,
    es2022: true,
    node: true,
  },
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module',
  },
  plugins: ['@typescript-eslint'],
  rules: {
    // ============================================================================
    // 🚫 函数式编程 - 禁止命令式错误处理
    // ============================================================================
    
    // 禁止 try-catch 语句 - 强制使用 TaskEither
    'no-restricted-syntax': [
      'error',
      {
        selector: 'TryStatement',
        message: '❌ 禁止使用 try-catch！请使用 TaskEither 进行函数式错误处理。\\n' +
                '✅ 正确做法：\\n' +
                '  import * as TE from "fp-ts/TaskEither";\\n' +
                '  const result = TE.tryCatch(() => riskyOperation(), (error) => ({ type: "ERROR", message: String(error) }));'
      },
      {
        selector: 'CatchClause',
        message: '❌ 禁止使用 catch 子句！请使用 TaskEither.orElse() 处理错误。'
      },
      {
        selector: 'ThrowStatement',
        message: '❌ 禁止使用 throw 语句！请返回 TaskEither.left() 表示错误。'
      },
      // 禁止直接修改数组
      {
        selector: 'CallExpression[callee.type="MemberExpression"][callee.property.name="push"]',
        message: '❌ 禁止使用 array.push()！请使用 [...array, item] 保持不可变性。'
      },
      {
        selector: 'CallExpression[callee.type="MemberExpression"][callee.property.name="pop"]',
        message: '❌ 禁止使用 array.pop()！请使用 array.slice(0, -1) 保持不可变性。'
      },
      {
        selector: 'CallExpression[callee.type="MemberExpression"][callee.property.name="shift"]',
        message: '❌ 禁止使用 array.shift()！请使用 array.slice(1) 保持不可变性。'
      },
      {
        selector: 'CallExpression[callee.type="MemberExpression"][callee.property.name="unshift"]',
        message: '❌ 禁止使用 array.unshift()！请使用 [item, ...array] 保持不可变性。'
      },
      {
        selector: 'CallExpression[callee.type="MemberExpression"][callee.property.name="splice"]',
        message: '❌ 禁止使用 array.splice()！请使用 array.slice() 和扩展运算符保持不可变性。'
      },
      {
        selector: 'CallExpression[callee.type="MemberExpression"][callee.property.name="sort"]',
        message: '❌ 禁止使用 array.sort()！请使用 [...array].sort() 或 fp-ts/Array 的 sort 函数。'
      },
      {
        selector: 'CallExpression[callee.type="MemberExpression"][callee.property.name="reverse"]',
        message: '❌ 禁止使用 array.reverse()！请使用 [...array].reverse() 保持不可变性。'
      }
    ],

    // 禁止 Promise.catch() - 强制使用 TaskEither
    'no-restricted-properties': [
      'error',
      {
        object: 'Promise',
        property: 'catch',
        message: '❌ 禁止使用 Promise.catch()！请使用 TaskEither.tryCatch() 包装异步操作。'
      }
    ],

    // ============================================================================
    // 🚫 禁止使用特定库和方法
    // ============================================================================
    
    'no-restricted-imports': [
      'error',
      {
        patterns: [
          {
            group: ['lodash', 'lodash/*'],
            message: '❌ 禁止使用 lodash！请使用 es-toolkit 替代。\\n' +
                    '✅ 正确：import { debounce } from "es-toolkit";'
          }
        ],
        paths: [
          {
            name: 'moment',
            message: '❌ 禁止使用 moment！请使用 dayjs。\\n' +
                    '✅ 正确：import dayjs from "dayjs";'
          }
        ]
      }
    ],

    // 禁止直接使用 Date 构造函数
    'no-restricted-globals': [
      'error',
      {
        name: 'Date',
        message: '❌ 禁止直接使用 Date()！请使用 dayjs。\\n' +
                '✅ 正确：import dayjs from "dayjs"; const now = dayjs();'
      }
    ],

    // ============================================================================
    // 🚫 控制台和日志规范
    // ============================================================================
    
    'no-console': [
      'error',
      {
        allow: [] // 完全禁止 console，必须使用日志系统
      }
    ],

    // ============================================================================
    // ✅ 强制使用函数式编程模式
    // ============================================================================
    
    'prefer-const': 'error',
    'no-var': 'error',
    'no-param-reassign': 'error',
    'no-return-assign': 'error',
    
    // 强制使用箭头函数
    'prefer-arrow-callback': 'error',
    'arrow-body-style': ['error', 'as-needed'],
    
    // 禁止未使用的变量和导入
    'no-unused-vars': 'off', // 关闭基础规则
    '@typescript-eslint/no-unused-vars': [
      'error',
      {
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_',
        ignoreRestSiblings: true
      }
    ],
  },
  
  // ============================================================================
  // 📁 目录特定规则
  // ============================================================================
  
  overrides: [
    // pipes/ 目录 - 必须是纯函数
    {
      files: ['src/pipes/**/*.ts'],
      rules: {
        'no-console': 'error',
        'no-restricted-globals': [
          'error',
          {
            name: 'window',
            message: '❌ pipes/ 中禁止访问全局对象！纯函数不能有副作用。'
          },
          {
            name: 'document',
            message: '❌ pipes/ 中禁止访问 DOM！纯函数不能有副作用。'
          },
          {
            name: 'localStorage',
            message: '❌ pipes/ 中禁止访问 localStorage！请在 io/ 层处理存储。'
          },
          {
            name: 'sessionStorage',
            message: '❌ pipes/ 中禁止访问 sessionStorage！请在 io/ 层处理存储。'
          },
          {
            name: 'fetch',
            message: '❌ pipes/ 中禁止使用 fetch！请在 io/ 层处理网络请求。'
          }
        ],
        // pipes 中禁止导入 React
        'no-restricted-imports': [
          'error',
          {
            patterns: [
              {
                group: ['react', 'react/*'],
                message: '❌ pipes/ 中禁止导入 React！纯函数不能有副作用。'
              }
            ]
          }
        ]
      }
    },
    
    // utils/ 目录 - 通用工具函数
    {
      files: ['src/utils/**/*.ts'],
      rules: {
        'no-console': 'error',
        'no-restricted-globals': [
          'error',
          {
            name: 'window',
            message: '❌ utils/ 中禁止访问全局对象！工具函数应该是纯函数。'
          },
          {
            name: 'document',
            message: '❌ utils/ 中禁止访问 DOM！工具函数应该是纯函数。'
          }
        ],
        // utils 中禁止导入 React
        'no-restricted-imports': [
          'error',
          {
            patterns: [
              {
                group: ['react', 'react/*'],
                message: '❌ utils/ 中禁止导入 React！工具函数应该是纯函数。'
              }
            ]
          }
        ]
      }
    },
    
    // views/ 目录 - UI 组件规范
    {
      files: ['src/views/**/*.tsx'],
      rules: {
        // 视图组件中禁止直接访问 stores（应该通过 props）
        'no-restricted-imports': [
          'error',
          {
            patterns: [
              {
                group: ['**/state/**', '**/stores/**'],
                message: '❌ 视图组件中禁止直接导入 state/stores！\\n' +
                        '✅ 正确：通过容器组件传递 props，或使用 hooks。'
              }
            ]
          }
        ]
      }
    },
    
    // io/ 目录 - 允许副作用，但仍禁止 try-catch
    {
      files: ['src/io/**/*.ts'],
      rules: {
        'no-console': 'warn', // io 层允许 console，但给出警告
      }
    },
    
    // 测试文件的特殊规则
    {
      files: ['**/*.test.ts', '**/*.spec.ts', '**/*.test.tsx', '**/*.spec.tsx'],
      rules: {
        'no-restricted-syntax': 'off', // 测试文件可能需要 try-catch 来测试错误情况
        'no-console': 'off', // 测试文件允许 console
        '@typescript-eslint/no-unused-vars': 'off', // 测试文件允许未使用的变量
      }
    },
    
    // 配置文件
    {
      files: ['*.config.js', '*.config.ts', 'vite.config.*', 'vitest.config.*'],
      rules: {
        'no-restricted-syntax': 'off',
        'no-console': 'off',
      }
    }
  ]
};