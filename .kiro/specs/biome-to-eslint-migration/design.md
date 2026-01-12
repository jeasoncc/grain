# Design Document: Biome to ESLint Migration

## Overview

本设计文档描述如何将 Grain 项目从 Biome 完全迁移到 ESLint。迁移的核心原因是我们已经构建了功能完整的 eslint-plugin-grain，包含 50+ 自定义规则，这些规则是 Grain 架构的核心保障。保留 Biome 会导致工具冗余、配置冲突和维护负担。

## Architecture

### 迁移前架构

```
代码检查和格式化
├── Biome (主要)
│   ├── Linting (通用规则)
│   └── Formatting (代码格式化)
└── ESLint (辅助)
    └── eslint-plugin-grain (50+ 自定义规则)
```

**问题:**
- 工具冗余：两个 linter 同时运行
- 规则冲突：Biome 和 ESLint 规则可能冲突
- 维护负担：需要维护两套配置
- 功能重复：Biome 的通用规则 ESLint 也能提供

### 迁移后架构

```
代码检查和格式化
└── ESLint (唯一工具)
    ├── @typescript-eslint/parser (TypeScript 支持)
    ├── eslint-plugin-grain (50+ 自定义规则)
    ├── Linting (代码检查)
    └── Auto-fix (代码格式化)
```

**优势:**
- 工具统一：只有一个 linter
- 规则一致：所有规则来自 ESLint
- 维护简单：只需维护一套配置
- 功能完整：eslint-plugin-grain 提供所有需要的规则

## Components and Interfaces

### 1. ESLint 配置文件

**文件:** `eslint.config.js` (Flat Config 格式)

```typescript
import grainPlugin from './apps/desktop/eslint-plugin-grain/src/index.js';
import tsParser from '@typescript-eslint/parser';

export default [
  {
    files: ['**/*.ts', '**/*.tsx', '**/*.js', '**/*.jsx'],
    ignores: [
      '**/node_modules/**',
      '**/dist/**',
      '**/build/**',
      '**/.next/**',
      '**/coverage/**',
    ],
    languageOptions: {
      parser: tsParser,
      ecmaVersion: 2022,
      sourceType: 'module',
      parserOptions: {
        ecmaFeatures: {
          jsx: true,
        },
      },
    },
    plugins: {
      grain: grainPlugin,
    },
    rules: {
      ...grainPlugin.configs.strict.rules,
    },
  },
];
```

### 2. Package Scripts

**文件:** `package.json`

```json
{
  "scripts": {
    "lint": "eslint . --ext .ts,.tsx,.js,.jsx",
    "lint:fix": "eslint . --ext .ts,.tsx,.js,.jsx --fix",
    "format": "eslint . --ext .ts,.tsx,.js,.jsx --fix",
    "check": "bun run lint && bun run type-check",
    "type-check": "tsc --noEmit"
  }
}
```

### 3. Git Hooks 配置

**文件:** `package.json` (lint-staged 配置)

```json
{
  "lint-staged": {
    "*.{ts,tsx,js,jsx}": [
      "eslint --fix",
      "git add"
    ]
  }
}
```

### 4. GitHub Actions 配置

**文件:** `.github/workflows/lint.yml`

```yaml
name: Lint

on:
  pull_request:
  push:
    branches: [main]

jobs:
  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: oven-sh/setup-bun@v1
      - run: bun install
      - run: bun run lint
```

## Data Models

### ESLint 配置对象

```typescript
interface ESLintConfig {
  files: string[];           // 要检查的文件模式
  ignores: string[];         // 要忽略的文件模式
  languageOptions: {
    parser: Parser;          // TypeScript parser
    ecmaVersion: number;     // ECMAScript 版本
    sourceType: 'module';    // 模块类型
    parserOptions: {
      ecmaFeatures: {
        jsx: boolean;        // 启用 JSX
      };
    };
  };
  plugins: {
    grain: Plugin;           // eslint-plugin-grain
  };
  rules: Record<string, RuleConfig>;  // 规则配置
}
```

### 迁移检查清单

```typescript
interface MigrationChecklist {
  biomeDependencyRemoved: boolean;      // Biome 依赖已移除
  biomeConfigDeleted: boolean;          // biome.json 已删除
  eslintConfigCreated: boolean;         // eslint.config.js 已创建
  packageScriptsUpdated: boolean;       // package.json scripts 已更新
  gitHooksUpdated: boolean;             // Git hooks 已更新
  ciConfigUpdated: boolean;             // CI 配置已更新
  steeringDocsUpdated: boolean;         // Steering 文档已更新
  allTestsPassing: boolean;             // 所有测试通过
  lintPassing: boolean;                 // Lint 检查通过
}
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system-essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Biome 完全移除

*For any* 项目文件和配置，不应存在任何 Biome 相关的引用或依赖

**Validates: Requirements 1.1, 1.2, 1.3, 1.4**

### Property 2: ESLint 配置完整性

*For any* TypeScript/JavaScript 文件，ESLint 应该能够成功解析和检查

**Validates: Requirements 2.1, 2.2, 2.3, 2.4, 2.5**

### Property 3: 格式化一致性

*For any* 代码文件，执行 `eslint --fix` 两次应该产生相同的结果（幂等性）

**Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5**

### Property 4: 命令可用性

*For any* package.json 中定义的 lint 相关命令，执行应该成功且返回预期结果

**Validates: Requirements 4.1, 4.2, 4.3, 4.4, 4.5**

### Property 5: 文档一致性

*For any* steering 文档，不应包含 Biome 相关的引用，应该包含 ESLint 的使用说明

**Validates: Requirements 5.1, 5.2, 5.3, 5.4, 5.5**

### Property 6: Git Hook 正确性

*For any* 代码提交，pre-commit hook 应该运行 ESLint 并在有错误时阻止提交

**Validates: Requirements 6.1, 6.2, 6.3, 6.4, 6.5**

### Property 7: CI 流程正确性

*For any* Pull Request，CI 应该运行 ESLint 检查并在有错误时失败

**Validates: Requirements 7.1, 7.2, 7.3, 7.4, 7.5**

### Property 8: 迁移完整性验证

*For all* 迁移步骤，完成后应该能够成功运行所有 lint、format 和 test 命令

**Validates: Requirements 8.1, 8.2, 8.3, 8.4, 8.5**

## Error Handling

### 迁移过程中的错误处理

1. **依赖移除失败**
   - 错误：`bun remove @biomejs/biome` 失败
   - 处理：手动删除 package.json 中的依赖，重新运行 `bun install`

2. **ESLint 配置错误**
   - 错误：ESLint 无法解析配置文件
   - 处理：检查语法错误，确保所有导入正确

3. **规则冲突**
   - 错误：某些文件无法通过 lint 检查
   - 处理：使用 `--fix` 自动修复，或手动调整代码

4. **性能问题**
   - 错误：ESLint 运行太慢
   - 处理：启用 `--cache` 选项，配置 ignore 模式

5. **Git Hook 失败**
   - 错误：pre-commit hook 阻止提交
   - 处理：运行 `bun run lint:fix` 修复问题，或使用 `--no-verify` 跳过（不推荐）

## Testing Strategy

### 单元测试

1. **ESLint 配置测试**
   - 测试配置文件能够被正确加载
   - 测试所有规则都被正确启用

2. **命令测试**
   - 测试 `bun run lint` 能够成功运行
   - 测试 `bun run lint:fix` 能够修复问题
   - 测试 `bun run format` 能够格式化代码

### 集成测试

1. **完整流程测试**
   - 创建测试文件 → 运行 lint → 修复问题 → 验证通过

2. **Git Hook 测试**
   - 创建有问题的代码 → 尝试提交 → 验证被阻止
   - 修复代码 → 提交 → 验证成功

3. **CI 测试**
   - 创建 PR → 触发 CI → 验证 lint 检查运行

### 验收测试

1. **迁移完整性检查**
   - 验证所有 Biome 引用已移除
   - 验证 ESLint 配置正确
   - 验证所有命令可用
   - 验证文档已更新

2. **性能测试**
   - 测量 ESLint 运行时间
   - 验证在可接受范围内（< 10 秒）

3. **用户体验测试**
   - 新开发者能够快速上手
   - 错误消息清晰易懂
   - 自动修复功能正常工作

## Implementation Notes

### 迁移步骤顺序

1. **准备阶段**
   - 备份当前配置
   - 确保所有测试通过
   - 创建迁移分支

2. **移除 Biome**
   - 删除 Biome 依赖
   - 删除 biome.json
   - 更新 .gitignore

3. **配置 ESLint**
   - 创建 eslint.config.js
   - 配置 parser 和 plugins
   - 启用所有规则

4. **更新脚本**
   - 更新 package.json scripts
   - 配置 lint-staged
   - 更新 Git hooks

5. **更新文档**
   - 更新 tech.md
   - 更新 workflow.md
   - 更新 README.md

6. **验证和测试**
   - 运行所有 lint 命令
   - 运行所有测试
   - 验证 CI 流程

7. **清理和提交**
   - 删除临时文件
   - 提交更改
   - 创建 PR

### 性能优化建议

1. **使用缓存**
   ```bash
   eslint . --cache --cache-location .eslintcache
   ```

2. **并行检查**
   ```bash
   eslint . --max-warnings 0 --cache
   ```

3. **只检查修改的文件**
   ```bash
   eslint $(git diff --name-only --diff-filter=ACMR | grep -E '\.(ts|tsx|js|jsx)$')
   ```

4. **配置 ignore 模式**
   - 忽略 node_modules
   - 忽略 dist/build 目录
   - 忽略生成的文件

### 回滚计划

如果迁移出现问题，可以快速回滚：

1. 恢复 Biome 依赖
   ```bash
   bun add -D @biomejs/biome
   ```

2. 恢复 biome.json 配置
   ```bash
   git checkout main -- biome.json
   ```

3. 恢复 package.json scripts
   ```bash
   git checkout main -- package.json
   ```

4. 重新安装依赖
   ```bash
   bun install
   ```
