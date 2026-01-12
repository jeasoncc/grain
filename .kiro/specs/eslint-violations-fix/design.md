# Design Document

## Introduction

本设计文档描述如何系统化地修复5,513个ESLint违规问题，采用分阶段、可验证、可回滚的策略。

## Architecture Overview

### 修复流程架构

```
┌─────────────────────────────────────────────────────────────────┐
│                    ESLint违规修复系统                            │
└─────────────────────────────────────────────────────────────────┘

    基线建立 → 分类分析 → 分阶段修复 → 验证测试 → 进度跟踪
         │          │           │          │          │
         ▼          ▼           ▼          ▼          ▼
    ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐
    │ 5,513   │  │ 按优先级 │  │ 自动+手动│  │ 测试验证 │  │ 进度报告 │
    │ 问题    │  │ 分类    │  │ 修复    │  │ 回滚保护 │  │ 里程碑  │
    └─────────┘  └─────────┘  └─────────┘  └─────────┘  └─────────┘
```

## Detailed Design

### 1. 基线和分类

#### 1.1 当前基线

```typescript
interface ViolationBaseline {
  readonly total: 5513;
  readonly errors: 5070;
  readonly warnings: 443;
  readonly autoFixable: 1703;
  readonly manualFix: 3810;
}
```

#### 1.2 违规分类

```typescript
interface ViolationCategory {
  readonly name: string;
  readonly priority: 'P0' | 'P1' | 'P2' | 'P3';
  readonly count: number;
  readonly autoFixable: boolean;
  readonly estimatedHours: number;
}

const categories: readonly ViolationCategory[] = [
  // P0 - 架构违规
  { name: 'grain/layer-dependencies', priority: 'P0', count: 50, autoFixable: false, estimatedHours: 16 },
  
  // P1 - 函数式违规
  { name: 'grain/no-console-log', priority: 'P1', count: 800, autoFixable: true, estimatedHours: 4 },
  { name: 'grain/no-date-constructor', priority: 'P1', count: 200, autoFixable: true, estimatedHours: 2 },
  { name: 'grain/no-try-catch', priority: 'P1', count: 300, autoFixable: false, estimatedHours: 24 },
  { name: 'grain/no-mutation', priority: 'P1', count: 500, autoFixable: false, estimatedHours: 20 },
  { name: 'functional/immutable-data', priority: 'P1', count: 400, autoFixable: false, estimatedHours: 16 },
  
  // P2 - 类型安全
  { name: 'functional/prefer-readonly-type', priority: 'P2', count: 1500, autoFixable: true, estimatedHours: 4 },
  { name: 'check-file/filename-naming-convention', priority: 'P2', count: 100, autoFixable: false, estimatedHours: 8 },
  { name: 'no-undef', priority: 'P2', count: 200, autoFixable: false, estimatedHours: 4 },
  { name: 'functional/no-this-expressions', priority: 'P2', count: 150, autoFixable: false, estimatedHours: 12 },
  
  // P3 - 代码风格
  { name: 'arrow-body-style', priority: 'P3', count: 1000, autoFixable: true, estimatedHours: 1 },
  { name: 'grain/no-lodash', priority: 'P3', count: 50, autoFixable: true, estimatedHours: 2 },
];
```

### 2. Phase 1: 架构违规修复 (P0)

#### 2.1 问题分析

**主要违规模式**:
```typescript
// ❌ flows → utils (违规)
// flows/backup/backup.flow.ts
import { formatDate } from '@/utils/date.util';

// ✅ flows → pipes → utils (正确)
// 1. 创建 pipes/date/format.pipe.ts
export const formatDatePipe = (date: Date): string => {
  return formatDate(date); // pipes可以依赖utils
};

// 2. flows使用pipes
import { formatDatePipe } from '@/pipes/date/format.pipe';
```

#### 2.2 修复策略

```typescript
interface ArchitectureFixStrategy {
  readonly step1: '识别所有flows→utils依赖';
  readonly step2: '在pipes层创建包装函数';
  readonly step3: '更新flows层导入';
  readonly step4: '验证架构规则通过';
}
```

#### 2.3 重点文件

```typescript
const criticalFiles = [
  'flows/backup/backup.flow.ts',      // 40+ violations
  'flows/export/*.flow.ts',           // Multiple violations
  'flows/migration/*.flow.ts',        // Multiple violations
] as const;
```

### 3. Phase 2: 函数式违规修复 (P1)

#### 3.1 Console.log替换 (自动化)

**自动替换脚本**:
```typescript
// scripts/fix-console-logs.ts
import { readFileSync, writeFileSync } from 'fs';
import { glob } from 'glob';

const replaceConsoleLogs = async () => {
  const files = await glob('src/**/*.{ts,tsx}');
  
  for (const file of files) {
    let content = readFileSync(file, 'utf-8');
    let modified = false;
    
    // 检查是否已有logger导入
    const hasLoggerImport = /import.*logger.*from.*@\/io\/log\/logger\.api/.test(content);
    
    // 替换console调用
    if (/console\.(log|error|warn|debug)/.test(content)) {
      content = content
        .replace(/console\.log\(/g, 'logger.info(')
        .replace(/console\.error\(/g, 'logger.error(')
        .replace(/console\.warn\(/g, 'logger.warn(')
        .replace(/console\.debug\(/g, 'logger.debug(');
      
      // 添加logger导入
      if (!hasLoggerImport) {
        content = `import { logger } from '@/io/log/logger.api';\n${content}`;
      }
      
      modified = true;
    }
    
    if (modified) {
      writeFileSync(file, content, 'utf-8');
    }
  }
};
```

#### 3.2 Date构造函数替换 (自动化)

**替换规则**:
```typescript
const dateReplacements = {
  'new Date()': 'dayjs()',
  'Date.now()': 'dayjs().valueOf()',
  'new Date(str)': 'dayjs(str)',
  'date.getTime()': 'dayjs(date).valueOf()',
} as const;

// scripts/fix-date-constructor.ts
const replaceDateConstructor = (content: string): string => {
  let result = content;
  
  // 添加dayjs导入
  if (/new Date|Date\.now/.test(result)) {
    if (!/import.*dayjs/.test(result)) {
      result = `import dayjs from 'dayjs';\n${result}`;
    }
    
    // 替换模式
    result = result
      .replace(/new Date\(\)/g, 'dayjs()')
      .replace(/Date\.now\(\)/g, 'dayjs().valueOf()')
      .replace(/new Date\(([^)]+)\)/g, 'dayjs($1)')
      .replace(/(\w+)\.getTime\(\)/g, 'dayjs($1).valueOf()');
  }
  
  return result;
};
```

#### 3.3 Try-Catch转换 (手动)

**转换模板**:
```typescript
// ❌ Before
async function fetchData() {
  try {
    const result = await api.getData();
    return result;
  } catch (error) {
    console.error(error);
    return null;
  }
}

// ✅ After
import * as TE from 'fp-ts/TaskEither';
import { pipe } from 'fp-ts/function';

const fetchData = (): TE.TaskEither<AppError, Data> =>
  pipe(
    TE.tryCatch(
      () => api.getData(),
      (error) => ({
        type: 'FETCH_ERROR' as const,
        message: String(error),
      })
    )
  );
```

**转换步骤**:
```typescript
interface TryCatchConversionSteps {
  readonly step1: '识别try-catch块';
  readonly step2: '提取异步操作';
  readonly step3: '创建TaskEither包装';
  readonly step4: '更新调用点使用pipe';
  readonly step5: '测试验证';
}
```

#### 3.4 对象变异消除 (手动)

**变异模式和修复**:
```typescript
// Pattern 1: 数组push
// ❌ Before
const items = [1, 2, 3];
items.push(4);

// ✅ After
const items = [1, 2, 3];
const newItems = [...items, 4];

// Pattern 2: 对象属性赋值
// ❌ Before
const user = { name: 'John', age: 30 };
user.age = 31;

// ✅ After
const user = { name: 'John', age: 30 };
const updatedUser = { ...user, age: 31 };

// Pattern 3: 复杂嵌套更新
// ❌ Before
const state = { user: { profile: { name: 'John' } } };
state.user.profile.name = 'Jane';

// ✅ After (使用Immer)
import { produce } from 'immer';
const state = { user: { profile: { name: 'John' } } };
const newState = produce(state, draft => {
  draft.user.profile.name = 'Jane';
});
```

### 4. Phase 3: 类型安全提升 (P2)

#### 4.1 Readonly修饰符 (自动化)

**AST转换**:
```typescript
// scripts/add-readonly.ts
import * as ts from 'typescript';

const addReadonlyModifier = (sourceFile: ts.SourceFile): ts.SourceFile => {
  const transformer: ts.TransformerFactory<ts.SourceFile> = (context) => {
    return (rootNode) => {
      function visit(node: ts.Node): ts.Node {
        // 为数组类型添加readonly
        if (ts.isArrayTypeNode(node)) {
          return ts.factory.createTypeOperatorNode(
            ts.SyntaxKind.ReadonlyKeyword,
            node
          );
        }
        
        // 为接口属性添加readonly
        if (ts.isPropertySignature(node)) {
          return ts.factory.createPropertySignature(
            [ts.factory.createModifier(ts.SyntaxKind.ReadonlyKeyword)],
            node.name,
            node.questionToken,
            node.type
          );
        }
        
        return ts.visitEachChild(node, visit, context);
      }
      
      return ts.visitNode(rootNode, visit);
    };
  };
  
  const result = ts.transform(sourceFile, [transformer]);
  return result.transformed[0];
};
```

#### 4.2 文件重命名 (半自动)

**重命名策略**:
```typescript
interface FileRenameStrategy {
  readonly pattern: RegExp;
  readonly replacement: string;
  readonly updateImports: boolean;
}

const renameStrategies: readonly FileRenameStrategy[] = [
  {
    pattern: /^src\/pipes\/(.+)\.ts$/,
    replacement: 'src/pipes/$1.pipe.ts',
    updateImports: true,
  },
  {
    pattern: /^src\/flows\/(.+)\.ts$/,
    replacement: 'src/flows/$1.flow.ts',
    updateImports: true,
  },
  {
    pattern: /^src\/io\/api\/(.+)\.ts$/,
    replacement: 'src/io/api/$1.api.ts',
    updateImports: true,
  },
];
```

**Import更新**:
```typescript
// scripts/update-imports.ts
import * as ts from 'typescript';

const updateImports = (oldPath: string, newPath: string) => {
  const program = ts.createProgram(['src/**/*.ts'], {});
  const sourceFiles = program.getSourceFiles();
  
  for (const sourceFile of sourceFiles) {
    let modified = false;
    const content = sourceFile.getFullText();
    
    // 查找并替换import语句
    const newContent = content.replace(
      new RegExp(`from ['"]${oldPath}['"]`, 'g'),
      `from '${newPath}'`
    );
    
    if (newContent !== content) {
      writeFileSync(sourceFile.fileName, newContent);
      modified = true;
    }
  }
};
```

### 5. Phase 4: 代码风格优化 (P3)

#### 5.1 箭头函数简化 (自动)

```bash
# ESLint auto-fix
npx eslint --config eslint.config.grain.js --fix --rule 'arrow-body-style: error' 'src/**/*.ts'
```

#### 5.2 Lodash替换 (自动)

```typescript
// scripts/replace-lodash.ts
const lodashReplacements = {
  "import _ from 'lodash'": "import * as toolkit from 'es-toolkit'",
  '_.debounce': 'toolkit.debounce',
  '_.cloneDeep': 'toolkit.cloneDeep',
  '_.isEqual': 'toolkit.isEqual',
  '_.merge': 'toolkit.merge',
  '_.pick': 'toolkit.pick',
  '_.omit': 'toolkit.omit',
} as const;
```

### 6. 进度跟踪系统

#### 6.1 进度数据结构

```typescript
interface ProgressSnapshot {
  readonly timestamp: number;
  readonly total: number;
  readonly errors: number;
  readonly warnings: number;
  readonly fixed: number;
  readonly percentage: number;
  readonly phase: 'P0' | 'P1' | 'P2' | 'P3';
}

interface ProgressHistory {
  readonly baseline: ProgressSnapshot;
  readonly snapshots: readonly ProgressSnapshot[];
  readonly milestones: readonly Milestone[];
}

interface Milestone {
  readonly name: string;
  readonly targetErrors: number;
  readonly achieved: boolean;
  readonly achievedAt?: number;
}
```

#### 6.2 进度报告生成

```typescript
// scripts/generate-progress-report.ts
const generateProgressReport = (history: ProgressHistory): string => {
  const latest = history.snapshots[history.snapshots.length - 1];
  const fixed = history.baseline.total - latest.total;
  const percentage = (fixed / history.baseline.total) * 100;
  
  return `
# ESLint修复进度报告

## 总体进度
- 基线: ${history.baseline.total} 问题
- 当前: ${latest.total} 问题
- 已修复: ${fixed} 问题
- 进度: ${percentage.toFixed(1)}%

## 里程碑
${history.milestones.map(m => 
  `- [${m.achieved ? 'x' : ' '}] ${m.name}: 目标 ${m.targetErrors} 错误`
).join('\n')}

## 趋势图
${generateTrendChart(history.snapshots)}
  `;
};
```

### 7. 验证和测试策略

#### 7.1 验证检查点

```typescript
interface ValidationCheckpoint {
  readonly name: string;
  readonly command: string;
  readonly mustPass: boolean;
}

const validationCheckpoints: readonly ValidationCheckpoint[] = [
  { name: 'ESLint检查', command: 'npm run lint:grain', mustPass: true },
  { name: '类型检查', command: 'npm run type-check', mustPass: true },
  { name: '单元测试', command: 'npm test', mustPass: true },
  { name: '构建验证', command: 'npm run build', mustPass: true },
  { name: 'E2E测试', command: 'npm run test:e2e', mustPass: false },
];
```

#### 7.2 回滚策略

```typescript
interface RollbackStrategy {
  readonly createCheckpoint: () => string; // 返回commit hash
  readonly validateChanges: () => boolean;
  readonly rollback: (checkpoint: string) => void;
}

const rollbackStrategy: RollbackStrategy = {
  createCheckpoint: () => {
    execSync('git add -A');
    execSync('git commit -m "checkpoint: before fixes"');
    return execSync('git rev-parse HEAD').toString().trim();
  },
  
  validateChanges: () => {
    try {
      execSync('npm run lint:grain');
      execSync('npm test');
      return true;
    } catch {
      return false;
    }
  },
  
  rollback: (checkpoint: string) => {
    execSync(`git reset --hard ${checkpoint}`);
  },
};
```

### 8. 批处理执行引擎

#### 8.1 批处理配置

```typescript
interface BatchConfig {
  readonly name: string;
  readonly files: readonly string[];
  readonly fixes: readonly FixOperation[];
  readonly validation: ValidationCheckpoint[];
  readonly rollbackOnFailure: boolean;
}

interface FixOperation {
  readonly type: 'auto' | 'script' | 'manual';
  readonly command?: string;
  readonly script?: string;
  readonly description: string;
}
```

#### 8.2 批处理执行器

```typescript
// scripts/batch-executor.ts
const executeBatch = async (config: BatchConfig): Promise<BatchResult> => {
  const checkpoint = rollbackStrategy.createCheckpoint();
  
  try {
    // 执行修复操作
    for (const fix of config.fixes) {
      if (fix.type === 'auto') {
        execSync(fix.command!);
      } else if (fix.type === 'script') {
        await import(fix.script!);
      }
    }
    
    // 验证修复
    const valid = rollbackStrategy.validateChanges();
    
    if (!valid && config.rollbackOnFailure) {
      rollbackStrategy.rollback(checkpoint);
      return { success: false, rolled: true };
    }
    
    return { success: true, rolled: false };
  } catch (error) {
    if (config.rollbackOnFailure) {
      rollbackStrategy.rollback(checkpoint);
    }
    throw error;
  }
};
```

## Implementation Timeline

### Week 1: Phase 1 - 架构修复 (P0)
- **Day 1-2**: 分析所有架构违规，创建pipes包装
- **Day 3-4**: 更新flows层导入，验证架构规则
- **Day 5**: 测试验证，提交修复
- **目标**: 减少50个架构错误

### Week 2: Phase 2 - 函数式编程 (P1)
- **Day 1**: 自动替换console.log和Date构造函数
- **Day 2-3**: 手动转换try-catch为TaskEither
- **Day 4-5**: 消除对象变异，验证测试
- **目标**: 减少2,000个函数式违规

### Week 3: Phase 3 - 类型安全 (P2)
- **Day 1**: 自动添加readonly修饰符
- **Day 2-3**: 文件重命名和import更新
- **Day 4**: 修复浏览器全局变量
- **Day 5**: 消除类和this表达式
- **目标**: 减少2,000个类型安全问题

### Week 4: Phase 4 - 代码风格 (P3)
- **Day 1**: 自动修复箭头函数和lodash
- **Day 2-3**: 最终验证和测试
- **Day 4**: 生成完整报告
- **Day 5**: 代码审查和文档更新
- **目标**: 0错误，<50警告

## Success Metrics

```typescript
interface SuccessMetrics {
  readonly eslintErrors: 0;
  readonly eslintWarnings: number; // < 50
  readonly testsPass: true;
  readonly buildSuccess: true;
  readonly noRegression: true;
  readonly codeReviewApproved: true;
}
```

## Risk Mitigation

### 高风险操作
1. **文件重命名**: 可能导致大量merge冲突
   - 缓解: 分批进行，及时同步主分支
   
2. **Try-catch转换**: 可能改变错误处理行为
   - 缓解: 充分测试，保持语义等价
   
3. **大量自动修复**: 可能引入新bug
   - 缓解: 每批修复后运行完整测试

### 回滚计划
- 每个Phase开始前创建git tag
- 每批修复后验证测试
- 失败时自动回滚到上一个检查点
