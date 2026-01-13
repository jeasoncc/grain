# Lint 紧急修复计划

> 生成时间：2026-01-13
> 总问题数：4,364（3,930 错误 + 434 警告）
> 受影响文件：518 个

## 修复优先级原则

1. **P0 - 阻塞性错误**：影响运行时，可能导致崩溃
2. **P1 - 架构违规**：违反核心架构原则，影响可维护性
3. **P2 - 代码质量**：影响代码可读性和一致性
4. **P3 - 风格问题**：不影响功能，但影响代码规范

---

## 第一阶段：修复阻塞性错误（P0）

### 1.1 修复 no-undef 错误（74 个问题，38 个文件）

**影响**：未定义的变量会导致运行时错误

**问题类型**：
- `logger` 未定义（测试文件中）
- `NodeJS` 类型未定义
- 其他全局变量未声明

**修复策略**：
```typescript
// 问题：logger is not defined
// 修复：添加 import
import { logger } from '@/io/log/logger';

// 问题：NodeJS is not defined
// 修复：添加类型引用
/// <reference types="node" />
```

**预计工作量**：38 个文件，每个文件 1 次提交
**预计时间**：2-3 小时

---

## 第二阶段：修复架构违规（P1）

### 2.1 修复 flows/ 互相依赖问题（285 个问题中的主要部分）

**影响**：违反架构分层原则，导致循环依赖风险

**典型问题**：
```typescript
// ❌ 错误：flows/ 依赖 flows/
// src/flows/file/create-file.flow.ts
import { someFlow } from '@/flows/other/some.flow';

// ✅ 正确：提取共享逻辑到 pipes/ 或 io/
import { someLogic } from '@/pipes/file/some.pipe';
```

**修复策略**：
1. 识别 flows/ 之间的依赖
2. 提取共享逻辑到 pipes/ 层
3. 或者将共享 IO 操作移到 io/ 层
4. 更新导入路径

**受影响文件**（示例）：
- `src/flows/file/create-file.flow.ts`
- `src/flows/file/open-file.flow.ts`
- `src/flows/templated/create-templated-file.flow.ts`
- `src/flows/wiki/migrate-wiki.flow.ts`

**预计工作量**：需要重构，约 20-30 个文件
**预计时间**：4-6 小时

### 2.2 修复 hooks/ 直接依赖 io/ 问题

**影响**：绕过 flows/ 层，破坏数据流架构

**典型问题**：
```typescript
// ❌ 错误：hooks/ 直接依赖 io/
// src/hooks/queries/attachment.queries.ts
import { attachmentApi } from '@/io/api/attachment.api';

// ✅ 正确：通过 flows/ 或使用 queries/
import { getAttachmentFlow } from '@/flows/attachment/get-attachment.flow';
// 或者
// queries/ 是特例，可以直接使用 io/api/（TanStack Query）
```

**修复策略**：
1. 检查是否是 queries/ 文件（TanStack Query 特例）
2. 如果是普通 hooks/，创建对应的 flow
3. 更新导入路径

**预计工作量**：约 10 个文件
**预计时间**：1-2 小时

---

## 第三阶段：修复文件命名问题（P1）

### 3.1 修复 check-file 错误（480 个问题，479 个文件）

**影响**：文件命名不符合规范，影响项目一致性

**问题类型**：
- 文件名不符合命名约定
- 缺少必需的后缀（`.flow.ts`, `.pipe.ts`, `.api.ts` 等）

**修复策略**：
```bash
# 示例：重命名文件
# ❌ src/flows/export/export-json.action.ts
# ✅ src/flows/export/export-json.flow.ts

# ❌ src/pipes/node/tree.ts
# ✅ src/pipes/node/tree.pipe.ts
```

**注意事项**：
- 重命名文件需要同步更新所有导入
- 使用 IDE 的重构功能（Rename Symbol）
- 每个文件重命名后立即提交

**预计工作量**：479 个文件
**预计时间**：8-12 小时（可以分批进行）

---

## 第四阶段：修复不可变性问题（P2）

### 4.1 修复 functional-immutability 错误（2,209 个问题，228 个文件）

**影响**：违反函数式编程原则，可能导致状态管理问题

**问题类型**：
- `functional/immutable-data`：直接修改对象/数组
- `functional/prefer-readonly-type`：缺少 readonly 类型
- `functional/no-let`：使用 let 而非 const
- `functional/prefer-tacit`：可以使用 point-free 风格

**修复策略**：

#### 4.1.1 修复 immutable-data（最高优先级）
```typescript
// ❌ 错误：直接修改
array.push(item);
object.property = value;

// ✅ 正确：使用不可变方法
const newArray = [...array, item];
const newObject = { ...object, property: value };
```

#### 4.1.2 修复 prefer-readonly-type
```typescript
// ❌ 错误：可变类型
interface Node {
  children: Node[];
}

// ✅ 正确：只读类型
interface Node {
  readonly children: readonly Node[];
}
```

#### 4.1.3 修复 no-let
```typescript
// ❌ 错误：使用 let
let result = initial;
result = transform(result);

// ✅ 正确：使用 const + pipe
const result = pipe(
  initial,
  transform
);
```

**预计工作量**：228 个文件，问题较多
**预计时间**：12-16 小时

---

## 第五阶段：修复其他问题（P2-P3）

### 5.1 修复 grain-functional 错误（366 个问题，87 个文件）

**问题类型**：
- `grain/no-mutation`
- `grain/no-try-catch`（应使用 TaskEither）
- `grain/no-throw`（应返回 Either）

**预计时间**：6-8 小时

### 5.2 修复 functional-no-other-paradigm（337 个问题，13 个文件）

**问题类型**：
- `functional/no-class-inheritance`
- `functional/no-classes`
- `functional/no-this-expressions`

**预计时间**：2-3 小时

### 5.3 修复 eslint-style 错误（200 个问题，74 个文件）

**问题类型**：
- `arrow-body-style`
- `prefer-arrow-callback`
- `prefer-const`

**预计时间**：3-4 小时

### 5.4 修复 other 类别（413 个问题，93 个文件）

需要具体分析问题类型

**预计时间**：4-6 小时

---

## 总体时间估算

| 阶段 | 优先级 | 文件数 | 问题数 | 预计时间 |
|------|--------|--------|--------|----------|
| P0: 阻塞性错误 | 最高 | 38 | 74 | 2-3 小时 |
| P1: 架构违规 | 高 | 30-40 | 285 | 5-8 小时 |
| P1: 文件命名 | 高 | 479 | 480 | 8-12 小时 |
| P2: 不可变性 | 中 | 228 | 2,209 | 12-16 小时 |
| P2-P3: 其他 | 低 | 163 | 1,316 | 15-21 小时 |
| **总计** | - | **518** | **4,364** | **42-60 小时** |

---

## 执行原则

### 严格遵守的规则

1. **一个文件一次提交**
   ```bash
   # 修复一个文件
   git add src/path/to/file.ts
   git commit -m "fix: 修复 file.ts 中的 no-undef 错误"
   ```

2. **立即验证**
   ```bash
   # 每次修改后立即检查
   npm run lint:grain -- src/path/to/file.ts
   ```

3. **提交信息规范**
   ```
   fix: 修复 [文件名] 中的 [错误类型]
   
   - 具体修改内容
   - 影响范围
   ```

4. **禁止使用的工具**
   - ❌ 禁止使用 `sed` 命令
   - ❌ 禁止批量修改
   - ❌ 禁止自动修复工具
   - ✅ 只使用 `strReplace` 工具
   - ✅ 每次修改后用 `getDiagnostics` 验证

---

## 建议执行顺序

### 第 1 天：P0 阻塞性错误（2-3 小时）
- 修复所有 no-undef 错误
- 确保代码可以正常运行

### 第 2-3 天：P1 架构违规（13-20 小时）
- 修复 flows/ 互相依赖
- 修复 hooks/ 直接依赖 io/
- 修复文件命名问题（可分批进行）

### 第 4-5 天：P2 不可变性（12-16 小时）
- 修复 immutable-data
- 修复 prefer-readonly-type
- 修复 no-let

### 第 6-7 天：P2-P3 其他问题（15-21 小时）
- 修复 grain-functional
- 修复 functional-no-other-paradigm
- 修复 eslint-style
- 修复 other 类别

---

## 进度追踪

在 `docs/lint-refactoring-progress.md` 中记录：
- 每天完成的文件数
- 剩余问题数
- 遇到的困难
- 解决方案

---

## 风险提示

1. **时间成本高**：预计需要 42-60 小时纯工作时间
2. **容易出错**：手动修改 518 个文件，需要极度小心
3. **可能引入新问题**：每次修改都要验证
4. **需要耐心**：一个一个来，不能急躁

---

## 下一步行动

**立即开始**：修复第一个 no-undef 错误

```bash
# 1. 查看第一个错误文件
cat src/flows/export/export-json.action.test.ts

# 2. 修复错误（添加 logger 导入）
# 3. 验证修复
npm run lint:grain -- src/flows/export/export-json.action.test.ts

# 4. 提交
git add src/flows/export/export-json.action.test.ts
git commit -m "fix: 修复 export-json.action.test.ts 中的 logger 未定义错误"
```

**准备好了吗？让我们开始吧！** 🚀
