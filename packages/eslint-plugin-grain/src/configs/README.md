# ESLint Plugin Grain - 配置预设

本目录包含 ESLint Plugin Grain 的所有配置预设。

## 可用配置

### 1. Strict Configuration (推荐) ⭐

**文件**: `strict.ts`

最严格的代码审查配置，所有规则设为 `error` 级别。这是 Grain 项目的**默认和唯一推荐配置**。

**特点**:
- ✅ 所有 50+ 规则均为 `error` 级别
- ✅ 零容忍策略，任何违规都阻塞提交
- ✅ 强制执行函数式编程模式
- ✅ 严格的架构层级分离
- ✅ 完整的类型安全检查

**适用场景**:
- 新项目（强烈推荐）
- 已完成迁移的项目
- 追求最高代码质量的项目

**使用方法**:

```javascript
// eslint.config.js
import grainPlugin from 'eslint-plugin-grain';

export default [
  {
    plugins: { grain: grainPlugin },
    rules: grainPlugin.configs.strict.rules,
  }
];
```

或者直接导入配置：

```javascript
import { strictConfig } from 'eslint-plugin-grain/configs/strict';

export default [
  {
    plugins: { grain: grainPlugin },
    ...strictConfig,
  }
];
```

---

### 2. Legacy Configuration (仅用于迁移) ⚠️

**文件**: `legacy.ts`

用于从旧代码库迁移到新架构的宽松配置。

**特点**:
- ⚠️ 大部分规则降级为 `warn` 级别
- ⚠️ 部分规则关闭（如 `no-async-outside-io`）
- ✅ 安全规则保持 `error` 级别
- ✅ 包含迁移检查清单

**适用场景**:
- 正在迁移的旧项目
- 需要渐进式采用新规则的项目

**⚠️ 重要警告**:
- 不应在新项目中使用
- 应尽快迁移到 `strict` 配置
- 此配置将在未来版本中被移除

**使用方法**:

```javascript
// eslint.config.js
import grainPlugin from 'eslint-plugin-grain';

export default [
  {
    plugins: { grain: grainPlugin },
    rules: grainPlugin.configs.legacy.rules,
  }
];
```

**迁移步骤**:

1. 使用 `legacy` 配置启动项目
2. 逐步修复 `warn` 级别的问题
3. 将规则逐个升级为 `error`
4. 最终切换到 `strict` 配置

参考 `legacy.ts` 文件末尾的迁移检查清单。

---

### 3. Recommended Configuration (平衡配置)

**内置于**: `index.ts`

平衡严格性和实用性的配置，核心规则为 `error`，次要规则为 `warn`。

**特点**:
- ✅ 核心规则（函数式、架构、安全）为 `error`
- ⚠️ 次要规则（命名、文档）为 `warn`
- ✅ 适合中等规模项目

**适用场景**:
- 中等规模项目
- 需要一定灵活性的项目
- 从 `legacy` 到 `strict` 的过渡阶段

**使用方法**:

```javascript
// eslint.config.js
import grainPlugin from 'eslint-plugin-grain';

export default [
  {
    plugins: { grain: grainPlugin },
    rules: grainPlugin.configs.recommended.rules,
  }
];
```

---

## 配置对比

| 特性 | Strict | Recommended | Legacy |
|------|--------|-------------|--------|
| 函数式编程规则 | ❌ error | ❌ error | ⚠️ warn |
| 架构层级规则 | ❌ error | ❌ error | ⚠️ warn |
| 命名规范规则 | ❌ error | ⚠️ warn/error | ⚠️ warn |
| 复杂度规则 | ❌ error | ❌ error | ⚠️ warn |
| React 规则 | ❌ error | ⚠️ warn/error | ⚠️ warn |
| 导入规则 | ❌ error | ⚠️ warn/error | ⚠️ warn/off |
| 安全规则 | ❌ error | ❌ error | ❌ error |
| 文档规则 | ❌ error | ⚠️ warn/error | ⚠️ warn/off |
| 魔法值规则 | ❌ error | ❌ error | ⚠️ warn |
| 类型安全规则 | ❌ error | ⚠️ warn/error | ⚠️ warn/off |

**图例**:
- ❌ error: 违规阻塞构建
- ⚠️ warn: 违规显示警告
- ✅ off: 规则关闭

---

## 推荐使用流程

### 新项目

```
直接使用 Strict 配置 ✅
```

### 旧项目迁移

```
Legacy → Recommended → Strict
  ↓           ↓            ↓
修复 warn   升级规则    最终目标
```

### 迁移时间线建议

- **第 1-2 周**: 使用 `legacy`，修复所有 `error` 级别问题
- **第 3-4 周**: 修复 50% 的 `warn` 级别问题
- **第 5-6 周**: 切换到 `recommended`，修复剩余问题
- **第 7-8 周**: 切换到 `strict`，完成迁移

---

## 自定义配置

如果需要自定义配置，可以基于现有配置进行扩展：

```javascript
// eslint.config.js
import grainPlugin from 'eslint-plugin-grain';

export default [
  {
    plugins: { grain: grainPlugin },
    rules: {
      // 使用 strict 配置作为基础
      ...grainPlugin.configs.strict.rules,
      
      // 自定义覆盖
      'grain/require-jsdoc': 'warn', // 降级为 warn
      'grain/chinese-comments': 'off', // 关闭
    },
  }
];
```

---

## 规则总览

插件包含 **50+ 条规则**，分为以下类别：

1. **Functional Programming** (7 条) - 函数式编程模式
2. **Architecture** (5 条) - 架构层级分离
3. **Naming** (5 条) - 命名规范
4. **Complexity** (5 条) - 代码复杂度
5. **React** (5 条) - React 组件模式
6. **Imports** (5 条) - 导入组织
7. **Security** (3 条) - 安全检查
8. **Documentation** (3 条) - 文档规范
9. **Magic Values** (2 条) - 魔法值检测
10. **Conditional** (3 条) - 条件语句
11. **Type Safety** (3 条) - 类型安全
12. **Zustand** (1 条) - 状态管理

详细规则列表请参考主 README。

---

## 常见问题

### Q: 为什么推荐使用 Strict 配置？

A: Strict 配置确保代码质量达到最高标准，避免技术债务积累。虽然初期可能需要更多工作，但长期来看会大大降低维护成本。

### Q: Legacy 配置会被移除吗？

A: 是的，Legacy 配置仅用于迁移，计划在 v3.0.0 版本中移除。请尽快迁移到 Strict 配置。

### Q: 可以混合使用不同配置吗？

A: 不推荐。应该选择一个配置作为基础，然后根据需要进行少量自定义覆盖。

### Q: 如何处理第三方库的违规？

A: 使用 ESLint 的 `ignorePatterns` 或文件级别的 `/* eslint-disable */` 注释来忽略第三方代码。

---

## 反馈和贡献

如果您对配置有任何建议或发现问题，请：

1. 提交 Issue: https://github.com/grain-team/grain/issues
2. 提交 PR: https://github.com/grain-team/grain/pulls
3. 查看文档: https://github.com/grain-team/grain/blob/main/docs/eslint-rules/

---

**最后更新**: 2026-01-12
**版本**: 2.0.0
