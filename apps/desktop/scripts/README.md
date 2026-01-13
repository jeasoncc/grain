# Lint 报告分类工具

## 使用方法

### 生成分类报告

```bash
cd apps/desktop
npm run lint:grain:report
```

这会在 `apps/desktop/lint-reports/` 目录下生成分类报告。

### 报告类别

根据最新运行结果，报告按以下类别分类：

#### Grain 插件规则
- `grain-architecture.md` - 架构层级依赖问题（285个）
- `grain-functional.md` - 函数式编程规范（366个）
- `grain-naming.md` - 命名规范
- `grain-complexity.md` - 复杂度控制
- `grain-react.md` - React 组件规范
- `grain-imports.md` - 导入规范
- `grain-security.md` - 安全问题
- `grain-documentation.md` - 文档规范
- `grain-magic-values.md` - 魔法值检查
- `grain-conditional.md` - 条件语句规范
- `grain-type-safety.md` - 类型安全
- `grain-zustand.md` - Zustand 状态管理

#### 函数式编程插件规则
- `functional-immutability.md` - 不可变性问题（2209个，最多！）
- `functional-no-other-paradigm.md` - 面向对象范式检查（337个）
- `functional-no-exceptions.md` - 异常处理
- `functional-no-statements.md` - 语句检查
- `functional-currying.md` - 柯里化

#### 其他插件规则
- `check-file.md` - 文件命名规范（480个）
- `typescript-types.md` - TypeScript 类型问题（7个）
- `eslint-style.md` - 代码风格（200个）
- `eslint-errors.md` - ESLint 错误（74个）

#### 特殊文件
- `summary.md` - 总结报告（按类别统计）
- `other.md` - 未分类的问题（413个）
- `full-report.json` - 完整 JSON 报告

## 报告格式

每个类别的报告按文件分组，显示：

- 文件路径
- 问题位置（行号、列号）
- 严重程度（错误/警告）
- 规则 ID
- 错误消息

## 优先级建议

根据问题数量，建议按以下优先级处理：

1. **functional-immutability** (2209个) - 不可变性是函数式编程的核心
2. **check-file** (480个) - 文件命名规范，批量重命名可快速解决
3. **other** (413个) - 需要进一步分析的问题
4. **grain-functional** (366个) - Grain 项目的函数式规范
5. **functional-no-other-paradigm** (337个) - 消除面向对象代码
6. **grain-architecture** (285个) - 架构层级依赖，需要重构
7. **eslint-style** (200个) - 代码风格，可自动修复
8. **eslint-errors** (74个) - 潜在的运行时错误

## 工作原理

1. ESLint 以 JSON 格式输出检查结果
2. 脚本读取 JSON 并按规则类别分组
3. 为每个类别生成独立的 Markdown 报告
4. 生成总结报告，显示各类别统计信息

## 自定义类别

如果需要添加新的规则类别，编辑 `categorize-lint-report.js` 中的 `RULE_CATEGORIES` 对象。

## 查看特定类别

```bash
# 查看不可变性问题
cat lint-reports/functional-immutability.md | less

# 查看架构问题
cat lint-reports/grain-architecture.md | less

# 查看总结
cat lint-reports/summary.md
```
