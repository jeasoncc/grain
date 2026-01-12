# ESLint Violations Fix Spec

## 概述

这是一个系统化修复代码库中5,513个ESLint违规问题的完整规范。

## 当前状态

**基线** (2026-01-12):
- **总问题**: 5,513 (5,070 错误, 443 警告)
- **可自动修复**: 1,703 (31%)
- **需手动修复**: 3,810 (69%)

## 文档结构

### 📋 requirements.md
定义了15个详细的需求，涵盖：
- 架构层级违规修复
- 函数式编程违规修复
- 类型安全提升
- 代码风格优化
- 进度跟踪和验证

### 🏗️ design.md
详细的技术设计，包括：
- 修复流程架构
- 违规分类和优先级
- 自动化脚本设计
- 手动重构策略
- 进度跟踪系统
- 验证和回滚机制
- 批处理执行引擎

### ✅ tasks.md
4阶段执行计划：
- **Phase 1 (Week 1)**: 架构违规修复 (P0)
- **Phase 2 (Week 2)**: 函数式编程违规修复 (P1)
- **Phase 3 (Week 3)**: 类型安全提升 (P2)
- **Phase 4 (Week 4)**: 代码风格优化 (P3)

## 执行计划

### Week 1: 架构修复 (P0)
**目标**: 修复所有层级依赖违规
- 创建pipes层包装函数
- 更新flows层导入
- 重构关键文件（backup.flow.ts等）
- **预期减少**: 50个架构错误

### Week 2: 函数式编程 (P1)
**目标**: 消除命令式编程模式
- 自动替换console.log → logger API
- 自动替换Date构造函数 → dayjs
- 手动转换try-catch → TaskEither
- 消除对象和数组变异
- **预期减少**: 2,000个函数式违规

### Week 3: 类型安全 (P2)
**目标**: 提升类型安全性
- 自动添加readonly修饰符
- 文件重命名和import更新
- 修复浏览器全局变量
- 消除类和this表达式
- **预期减少**: 2,000个类型安全问题

### Week 4: 代码风格 (P3)
**目标**: 优化代码风格
- 自动简化箭头函数
- 替换lodash → es-toolkit
- 最终验证和测试
- 生成完整报告
- **预期结果**: 0错误, <50警告

## 关键特性

### 🤖 自动化优先
- 31%的问题可以自动修复
- 提供完整的自动化脚本设计
- 批处理执行引擎

### 📊 进度跟踪
- 实时进度监控
- 里程碑检查
- 趋势图生成

### 🔄 安全保障
- 每批修复前创建检查点
- 自动验证和测试
- 失败时自动回滚

### 📝 详细文档
- 完整的修复指南
- Before/After示例
- 最佳实践

## 相关文档

在 `apps/desktop/` 目录下：
- **CODEBASE_QUALITY_STATUS.md** - 执行摘要
- **ESLINT_VIOLATIONS_REPORT.md** - 详细违规分析
- **QUICK_FIX_GUIDE.md** - 快速修复指南
- **scripts/check-lint-progress.sh** - 进度跟踪脚本

## 快速开始

### 1. 查看当前状态
```bash
cd apps/desktop
bash scripts/check-lint-progress.sh
```

### 2. 开始Phase 1
```bash
# 查看Phase 1任务
cat .kiro/specs/eslint-violations-fix/tasks.md

# 开始执行第一个任务
# Task 1.1: 分析架构违规模式
```

### 3. 跟踪进度
```bash
# 每批修复后检查进度
bash scripts/check-lint-progress.sh

# 查看详细的ESLint输出
npm run lint:grain
```

## 成功标准

### 技术指标
- ✅ ESLint错误数 = 0
- ✅ ESLint警告数 < 50
- ✅ 所有测试通过
- ✅ 构建成功
- ✅ 无功能回归

### 时间指标
- ✅ Week 1: Phase 1完成
- ✅ Week 2: Phase 2完成
- ✅ Week 3: Phase 3完成
- ✅ Week 4: Phase 4完成并合并

### 质量指标
- ✅ 代码可维护性提升
- ✅ 架构一致性提升
- ✅ 函数式编程原则遵循
- ✅ 类型安全保障

## 风险和缓解

### 高风险操作
1. **Try-catch转换** - 可能改变错误处理行为
   - 缓解: 充分测试，保持语义等价

2. **文件重命名** - 可能导致merge冲突
   - 缓解: 分批进行，及时同步

3. **对象变异消除** - 可能影响状态管理
   - 缓解: 使用Immer，保持行为一致

### 回滚策略
- 每个Phase开始前创建git tag
- 每批修复后验证测试
- 失败时自动回滚到上一个检查点

## 下一步

1. **立即**: 审查这个spec，确认计划可行
2. **Week 1**: 开始执行Phase 1任务
3. **持续**: 使用进度跟踪工具监控进展
4. **每周**: 审查进度，调整计划

## 问题和支持

- 查看 `QUICK_FIX_GUIDE.md` 获取常见问题的快速修复方法
- 查看 `ESLINT_VIOLATIONS_REPORT.md` 了解详细的违规分析
- 查看 `FUNCTIONAL_PROGRAMMING_GUIDE.md` 了解函数式编程最佳实践
- 查看 `.kiro/steering/architecture.md` 了解架构设计原则
