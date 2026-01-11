# Design Document

## Introduction

本设计文档详细描述了如何系统性地修复代码库中的质量问题，确保代码符合Grain项目的函数式编程原则和水流架构规范。

## Architecture Overview

### 修复策略架构

```
┌─────────────────────────────────────────────────────────────────┐
│                    代码质量修复系统                              │
└─────────────────────────────────────────────────────────────────┘

    ESLint 检测 → 分类分析 → 批量修复 → 验证测试
         │            │          │          │
         ▼            ▼          ▼          ▼
    ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐
    │ 规则引擎 │  │ 问题分类 │  │ 自动修复 │  │ 质量验证 │
    └─────────┘  └─────────┘  └─────────┘  └─────────┘
         │            │          │          │
         ▼            ▼          ▼          ▼
    ┌─────────────────────────────────────────────────┐
    │              修复报告生成                        │
    └─────────────────────────────────────────────────┘
```

### 修复优先级

| 优先级 | 类型 | 影响范围 | 修复复杂度 |
|--------|------|----------|------------|
| P0 | 架构违规 | 系统级 | 高 |
| P1 | 函数式违规 | 模块级 | 中 |
| P2 | 文件命名 | 文件级 | 低 |
| P3 | 代码结构 | 函数级 | 低 |

## Detailed Design

### 1. ESLint 规则完善

#### 1.1 修复 no-mutation 规则

**问题**: 消息模板使用数组导致编译错误

**解决方案**:
```typescript
// 修复前（错误）
messages: {
  noArrayPush: [
    '❌ 禁止使用 array.push()！',
    '✅ 正确做法：',
  ].join('\n'),
}

// 修复后（正确）
messages: {
  noArrayPush: '❌ 禁止使用 array.push()！\n\n✅ 正确做法：\n  const newArray = [...array, newItem];',
}
```

#### 1.2 添加新规则

**prefer-pipe 规则**:
```typescript
// 检测嵌套函数调用，建议使用 pipe
// 错误: func3(func2(func1(data)))
// 正确: pipe(data, func1, func2, func3)
```

**no-promise-catch 规则**:
```typescript
// 检测 Promise.catch()，建议使用 TaskEither
// 错误: promise.catch(handleError)
// 正确: pipe(taskEither, TE.orElse(handleError))
```

### 2. 架构违规修复

#### 2.1 IO 层依赖 flows 层问题

**违规示例**:
```typescript
// apps/desktop/src/io/log/logger.api.ts
import { createLogFlow } from "@/flows/log/log.flow";
```

**修复策略**:
1. 将共享逻辑提取到 pipes 层
2. 通过依赖注入传递 flows 函数
3. 重构 API 接口，移除对 flows 的直接依赖

**修复后结构**:
```
io/log/logger.api.ts
├── 依赖 pipes/log/log.format.pipe.ts
├── 依赖 types/log/log.interface.ts
└── 通过参数接收 flow 函数
```

#### 2.2 层级依赖重构

**重构原则**:
- io → types (仅类型依赖)
- pipes → utils + types
- flows → pipes + io + state + types
- hooks → flows + state + types
- views → hooks + types

### 3. 函数式编程违规修复

#### 3.1 Console.log 替换

**自动替换策略**:
```typescript
// 检测模式
console.log(message) → logger.info(message)
console.error(error) → logger.error(error.message, { error })
console.warn(warning) → logger.warn(warning)
console.debug(debug) → logger.debug(debug)
```

**批量替换脚本**:
```bash
# 使用 sed 进行批量替换
find src -name "*.ts" -type f -exec sed -i 's/console\.log(/logger.info(/g' {} \;
find src -name "*.ts" -type f -exec sed -i 's/console\.error(/logger.error(/g' {} \;
```

#### 3.2 Date 构造函数替换

**替换规则**:
```typescript
// 错误用法 → 正确用法
new Date() → dayjs()
new Date(string) → dayjs(string)
Date.now() → dayjs().valueOf()
date.getTime() → dayjs(date).valueOf()
```

#### 3.3 Try-Catch 替换为 TaskEither

**转换模式**:
```typescript
// 转换前
try {
  const result = await riskyOperation();
  return result;
} catch (error) {
  console.error(error);
  return null;
}

// 转换后
import * as TE from "fp-ts/TaskEither";
import { pipe } from "fp-ts/function";

const safeOperation = (): TE.TaskEither<AppError, Result> =>
  pipe(
    TE.tryCatch(
      () => riskyOperation(),
      (error) => createAppError('OPERATION_FAILED', String(error))
    )
  );
```

### 4. 文件命名规范化

#### 4.1 批量重命名策略

**命名映射表**:
```typescript
const namingRules = {
  'src/pipes/**/*.ts': (filename) => filename.replace(/\.ts$/, '.pipe.ts'),
  'src/flows/**/*.ts': (filename) => filename.replace(/\.ts$/, '.flow.ts'),
  'src/io/api/**/*.ts': (filename) => filename.replace(/\.ts$/, '.api.ts'),
  'src/state/**/*.ts': (filename) => filename.replace(/\.ts$/, '.state.ts'),
  'src/utils/**/*.ts': (filename) => filename.replace(/\.ts$/, '.util.ts'),
};
```

**重命名脚本**:
```bash
#!/bin/bash
# 重命名 pipes 目录文件
find src/pipes -name "*.ts" -not -name "*.pipe.ts" | while read file; do
  newname="${file%.ts}.pipe.ts"
  git mv "$file" "$newname"
done
```

#### 4.2 Import 语句更新

**自动更新策略**:
1. 使用 TypeScript Language Server API 获取所有引用
2. 批量更新 import 路径
3. 验证编译无错误

### 5. 类型安全提升

#### 5.1 readonly 修饰符添加

**检测规则**:
```typescript
// 需要添加 readonly 的场景
interface Config {
  readonly apiUrl: string;     // ✓ 正确
  readonly timeout: number;    // ✓ 正确
  retries: number;            // ❌ 缺少 readonly
}
```

**自动修复**:
```typescript
// AST 转换规则
PropertySignature → ReadonlyPropertySignature
```

#### 5.2 any 类型消除

**替换策略**:
```typescript
// 常见 any 类型替换
any → unknown (需要类型守卫)
any[] → unknown[] 或具体类型数组
Record<string, any> → Record<string, unknown>
```

### 6. 代码结构优化

#### 6.1 箭头函数简化

**简化规则**:
```typescript
// 单表达式函数体
const fn = (x) => { return x * 2; }  // ❌
const fn = (x) => x * 2;             // ✅

// 单语句函数体
const fn = (x) => { console.log(x); }  // ❌
const fn = (x) => console.log(x);      // ✅
```

#### 6.2 函数拆分

**拆分原则**:
- 函数长度 > 50 行 → 拆分
- 圈复杂度 > 10 → 简化
- 嵌套层级 > 4 → 提取函数

### 7. 持续质量保证

#### 7.1 Git Hooks 集成

**pre-commit hook**:
```bash
#!/bin/sh
# 运行 ESLint 检查
npm run lint:grain
if [ $? -ne 0 ]; then
  echo "ESLint 检查失败，请修复后再提交"
  exit 1
fi
```

#### 7.2 CI/CD 集成

**GitHub Actions 配置**:
```yaml
name: Code Quality Check
on: [push, pull_request]
jobs:
  quality-check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '20'
      - name: Install dependencies
        run: npm ci
      - name: Run ESLint
        run: npm run lint:grain
      - name: Run tests
        run: npm test
```

## Implementation Strategy

### Phase 1: 基础设施完善 (1-2 天)
1. 修复 no-mutation 规则 ✅
2. 添加 prefer-pipe 规则
3. 添加 no-promise-catch 规则
4. 完善测试覆盖

### Phase 2: 架构违规修复 (3-5 天)
1. 重构 io/log/logger.api.ts
2. 修复所有层级依赖违规
3. 验证架构完整性

### Phase 3: 函数式违规修复 (2-3 天)
1. 批量替换 console.log
2. 替换 Date 构造函数
3. 转换 try-catch 为 TaskEither

### Phase 4: 文件命名规范化 (1-2 天)
1. 批量重命名文件
2. 更新 import 语句
3. 验证编译正确性

### Phase 5: 质量提升和验证 (1-2 天)
1. 添加 readonly 修饰符
2. 消除 any 类型
3. 优化代码结构
4. 生成质量报告

## Risk Mitigation

### 风险识别

| 风险 | 影响 | 概率 | 缓解措施 |
|------|------|------|----------|
| 大量文件重命名导致合并冲突 | 高 | 中 | 分批进行，及时同步 |
| 自动替换引入新 bug | 中 | 中 | 充分测试，人工审查 |
| 架构重构影响现有功能 | 高 | 低 | 渐进式重构，保持向后兼容 |

### 回滚策略

1. **Git 分支保护**: 每个阶段创建独立分支
2. **增量提交**: 小步快跑，便于回滚
3. **测试验证**: 每次修改后运行完整测试套件

## Success Metrics

### 质量指标

| 指标 | 当前值 | 目标值 | 测量方法 |
|------|--------|--------|----------|
| ESLint 错误数 | ~500+ | 0 | `npm run lint:grain` |
| 架构违规数 | ~50+ | 0 | 自定义规则检测 |
| 函数式违规数 | ~200+ | 0 | 自定义规则检测 |
| 文件命名违规数 | ~100+ | 0 | 文件命名规则检测 |
| 代码覆盖率 | 未知 | >80% | Jest/Vitest 报告 |

### 开发体验指标

- ESLint 检查时间 < 30s
- 构建时间无显著增加
- 开发者满意度调查 > 4.0/5.0

## Conclusion

通过系统性的代码质量改进，我们将建立一个符合函数式编程原则和水流架构的高质量代码库。这不仅提升了代码的可维护性和可扩展性，也为团队提供了清晰的开发规范和最佳实践指导。