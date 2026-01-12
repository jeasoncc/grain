# Implementation Plan: ESLint Violations Fix

## Overview

系统化修复5,513个ESLint违规问题，分4个阶段执行，每个阶段包含自动化和手动修复任务。

## Phase 1: 架构违规修复 (P0) - Week 1

### Task 1.1: 分析架构违规模式
- 扫描所有grain/layer-dependencies违规
- 识别flows→utils依赖的文件
- 创建违规文件清单
- _Requirements: 1.1, 1.2_

### Task 1.2: 创建pipes层包装函数
- [ ] 1.2.1 为utils函数创建pipes包装
  - 在pipes/目录创建对应的.pipe.ts文件
  - 包装utils函数，保持函数签名
  - _Requirements: 1.1_

- [ ] 1.2.2 更新flows层导入
  - 替换flows中的utils导入为pipes导入
  - 验证功能不变
  - _Requirements: 1.1_

- [ ] 1.2.3 验证架构规则
  - 运行ESLint检查grain/layer-dependencies
  - 确认无架构违规
  - _Requirements: 1.3_

### Task 1.3: 修复backup.flow.ts重点文件
- [ ] 1.3.1 重构backup.flow.ts
  - 移除utils依赖
  - 使用pipes层函数
  - 消除try-catch和throw
  - _Requirements: 1.1, 4.1, 4.2_

- [ ] 1.3.2 修复localStorage使用
  - 创建storage API或使用window.localStorage
  - 移除直接的localStorage引用
  - _Requirements: 10.1_

- [ ] 1.3.3 消除类和this表达式
  - 将BackupScheduler类重构为函数
  - 使用闭包替代this
  - _Requirements: 11.1, 11.2_

### Task 1.4: Phase 1验证
- 运行完整测试套件
- 验证构建成功
- 确认减少至少50个架构错误
- _Requirements: 1.4, 12.3, 15.1_

## Phase 2: 函数式编程违规修复 (P1) - Week 2

### Task 2.1: 自动替换console.log
- [ ] 2.1.1 创建console替换脚本
  - 编写scripts/fix-console-logs.ts
  - 实现console.log→logger.info转换
  - 自动添加logger导入
  - _Requirements: 2.1, 2.2, 2.3, 2.4_

- [ ] 2.1.2 执行批量替换
  - 运行替换脚本
  - 验证编译通过
  - 运行测试确认无回归
  - _Requirements: 2.5, 13.2, 13.3_

- [ ] 2.1.3 提交console修复
  - Git提交修复
  - 记录进度
  - _Requirements: 13.4, 12.1_

### Task 2.2: 自动替换Date构造函数
- [ ] 2.2.1 创建Date替换脚本
  - 编写scripts/fix-date-constructor.ts
  - 实现new Date()→dayjs()转换
  - 实现Date.now()→dayjs().valueOf()转换
  - _Requirements: 3.1, 3.2, 3.3_

- [ ] 2.2.2 执行批量替换
  - 运行替换脚本
  - 验证编译通过
  - 运行测试确认无回归
  - _Requirements: 3.4, 13.2, 13.3_

- [ ] 2.2.3 提交Date修复
  - Git提交修复
  - 记录进度
  - _Requirements: 13.4, 12.1_

### Task 2.3: 手动转换try-catch为TaskEither
- [ ] 2.3.1 识别try-catch模式
  - 扫描所有try-catch块
  - 分类：简单/复杂/嵌套
  - 创建转换清单
  - _Requirements: 4.1_

- [ ] 2.3.2 转换简单try-catch (批次1: 50个文件)
  - 转换为TE.tryCatch
  - 更新调用点使用pipe
  - 测试验证
  - _Requirements: 4.1, 4.2, 15.1_

- [ ] 2.3.3 转换复杂try-catch (批次2: 50个文件)
  - 处理嵌套try-catch
  - 处理多个catch块
  - 测试验证
  - _Requirements: 4.1, 4.2, 15.1_

- [ ] 2.3.4 转换剩余try-catch (批次3: 剩余文件)
  - 完成所有转换
  - 全面测试
  - _Requirements: 4.4, 15.1_

- [ ] 2.3.5 消除throw语句
  - 替换throw为TE.left()
  - 验证错误处理正确
  - _Requirements: 4.2, 15.1_

### Task 2.4: 消除对象和数组变异
- [ ] 2.4.1 识别变异模式
  - 扫描array.push()使用
  - 扫描对象属性赋值
  - 创建修复清单
  - _Requirements: 5.1, 5.2_

- [ ] 2.4.2 修复数组变异 (批次1)
  - 替换push为spread
  - 替换splice为slice+concat
  - 测试验证
  - _Requirements: 5.1, 15.1_

- [ ] 2.4.3 修复对象变异 (批次2)
  - 替换属性赋值为spread
  - 使用Immer处理复杂更新
  - 测试验证
  - _Requirements: 5.2, 5.3, 15.1_

- [ ] 2.4.4 验证不可变性
  - 运行grain/no-mutation检查
  - 运行functional/immutable-data检查
  - _Requirements: 5.4, 15.1_

### Task 2.5: Phase 2验证
- 运行完整测试套件
- 验证构建成功
- 确认减少至少2,000个函数式违规
- _Requirements: 12.3, 14.2, 15.1_

## Phase 3: 类型安全提升 (P2) - Week 3

### Task 3.1: 自动添加readonly修饰符
- [ ] 3.1.1 创建readonly添加脚本
  - 编写scripts/add-readonly.ts
  - 使用TypeScript AST转换
  - 为数组类型添加readonly
  - 为接口属性添加readonly
  - _Requirements: 7.1, 7.2_

- [ ] 3.1.2 执行批量添加
  - 运行转换脚本
  - 验证编译通过
  - 运行测试确认无回归
  - _Requirements: 7.3, 13.2, 13.3_

- [ ] 3.1.3 提交readonly修复
  - Git提交修复
  - 记录进度
  - _Requirements: 13.4, 12.1_

### Task 3.2: 文件重命名和import更新
- [ ] 3.2.1 创建文件重命名脚本
  - 编写scripts/rename-files.ts
  - 实现pipes/*.ts→*.pipe.ts
  - 实现flows/*.ts→*.flow.ts
  - 实现io/api/*.ts→*.api.ts
  - _Requirements: 9.1, 9.2_

- [ ] 3.2.2 执行文件重命名 (批次1: pipes/)
  - 重命名pipes目录文件
  - 更新所有import语句
  - 验证编译通过
  - _Requirements: 9.1, 9.3, 15.2_

- [ ] 3.2.3 执行文件重命名 (批次2: flows/)
  - 重命名flows目录文件
  - 更新所有import语句
  - 验证编译通过
  - _Requirements: 9.2, 9.3, 15.2_

- [ ] 3.2.4 执行文件重命名 (批次3: io/api/)
  - 重命名io/api目录文件
  - 更新所有import语句
  - 验证编译通过
  - _Requirements: 9.3, 15.2_

- [ ] 3.2.5 验证文件命名规范
  - 运行check-file/filename-naming-convention检查
  - 确认所有文件符合规范
  - _Requirements: 9.4_

### Task 3.3: 修复浏览器全局变量
- [ ] 3.3.1 创建storage API
  - 在io/storage/创建local.storage.ts
  - 封装localStorage操作
  - _Requirements: 10.1_

- [ ] 3.3.2 替换localStorage使用
  - 替换直接localStorage为storage API
  - 或使用window.localStorage
  - _Requirements: 10.1, 15.1_

- [ ] 3.3.3 修复其他全局变量
  - 修复window引用
  - 修复clearInterval等
  - _Requirements: 10.2, 10.3, 10.4_

### Task 3.4: 消除类和this表达式
- [ ] 3.4.1 识别类定义
  - 扫描所有class定义
  - 创建重构清单
  - _Requirements: 11.1_

- [ ] 3.4.2 重构类为函数
  - 将类方法转换为函数
  - 使用闭包替代实例状态
  - 测试验证
  - _Requirements: 11.1, 11.2, 15.1_

- [ ] 3.4.3 验证无this表达式
  - 运行functional/no-this-expressions检查
  - 确认所有this已消除
  - _Requirements: 11.3_

### Task 3.5: Phase 3验证
- 运行完整测试套件
- 验证构建成功
- 确认减少至少2,000个类型安全问题
- _Requirements: 12.3, 14.3, 15.1_

## Phase 4: 代码风格优化 (P3) - Week 4

### Task 4.1: 自动修复箭头函数体
- [ ] 4.1.1 运行ESLint auto-fix
  - 执行arrow-body-style自动修复
  - 验证编译通过
  - _Requirements: 8.1, 8.2_

- [ ] 4.1.2 验证箭头函数简化
  - 运行arrow-body-style检查
  - 确认所有简化完成
  - _Requirements: 8.3_

### Task 4.2: 替换lodash为es-toolkit
- [ ] 4.2.1 创建lodash替换脚本
  - 编写scripts/replace-lodash.ts
  - 实现lodash→es-toolkit转换
  - _Requirements: 6.1, 6.2, 6.3_

- [ ] 4.2.2 执行批量替换
  - 运行替换脚本
  - 验证编译通过
  - 运行测试确认无回归
  - _Requirements: 6.4, 13.2, 13.3_

- [ ] 4.2.3 提交lodash修复
  - Git提交修复
  - 记录进度
  - _Requirements: 13.4, 12.1_

### Task 4.3: 最终验证和测试
- [ ] 4.3.1 运行完整ESLint检查
  - 执行npm run lint:grain
  - 确认0错误
  - 确认<50警告
  - _Requirements: 12.3_

- [ ] 4.3.2 运行完整测试套件
  - 执行所有单元测试
  - 执行集成测试
  - 执行E2E测试
  - _Requirements: 15.1, 15.4_

- [ ] 4.3.3 验证构建
  - 执行生产构建
  - 确认无错误
  - 确认bundle大小合理
  - _Requirements: 15.1_

- [ ] 4.3.4 功能回归测试
  - 手动测试关键功能
  - 确认无功能回归
  - _Requirements: 15.4_

### Task 4.4: 生成最终报告
- [ ] 4.4.1 生成进度报告
  - 运行check-lint-progress.sh
  - 生成完整进度历史
  - _Requirements: 12.1, 12.2_

- [ ] 4.4.2 创建修复总结文档
  - 记录修复统计
  - 记录遇到的问题和解决方案
  - 记录最佳实践
  - _Requirements: 12.2_

- [ ] 4.4.3 更新项目文档
  - 更新FUNCTIONAL_PROGRAMMING_GUIDE.md
  - 更新架构文档
  - 更新贡献指南
  - _Requirements: 12.2_

### Task 4.5: 代码审查和合并
- [ ] 4.5.1 创建Pull Request
  - 整理所有提交
  - 编写详细的PR描述
  - 请求代码审查
  - _Requirements: 12.3_

- [ ] 4.5.2 处理审查反馈
  - 修复审查中发现的问题
  - 回答审查问题
  - _Requirements: 15.1_

- [ ] 4.5.3 合并到主分支
  - 确认所有检查通过
  - 合并PR
  - 删除feature分支
  - _Requirements: 12.3_

### Task 4.6: Phase 4验证
- 确认ESLint错误数为0
- 确认所有测试通过
- 确认构建成功
- 确认无功能回归
- _Requirements: 12.3, 14.4, 15.4_

## 支持任务

### Task S.1: 创建自动化脚本
- [ ] S.1.1 创建console替换脚本
  - scripts/fix-console-logs.ts
  - _Requirements: 2.1_

- [ ] S.1.2 创建Date替换脚本
  - scripts/fix-date-constructor.ts
  - _Requirements: 3.1_

- [ ] S.1.3 创建readonly添加脚本
  - scripts/add-readonly.ts
  - _Requirements: 7.1_

- [ ] S.1.4 创建文件重命名脚本
  - scripts/rename-files.ts
  - scripts/update-imports.ts
  - _Requirements: 9.1_

- [ ] S.1.5 创建lodash替换脚本
  - scripts/replace-lodash.ts
  - _Requirements: 6.1_

- [ ] S.1.6 创建批处理执行器
  - scripts/batch-executor.ts
  - 实现检查点和回滚
  - _Requirements: 13.1, 15.2_

### Task S.2: 进度跟踪工具
- [ ] S.2.1 增强进度跟踪脚本
  - 添加历史记录功能
  - 添加趋势图生成
  - _Requirements: 12.1, 12.2_

- [ ] S.2.2 创建里程碑检查器
  - 定义各阶段里程碑
  - 自动检查里程碑达成
  - _Requirements: 12.2, 14.5_

### Task S.3: 测试和验证工具
- [ ] S.3.1 创建验证检查点脚本
  - 自动运行所有验证
  - 生成验证报告
  - _Requirements: 15.1_

- [ ] S.3.2 创建回归测试套件
  - 识别关键功能
  - 创建自动化测试
  - _Requirements: 15.4_

## 执行策略

### 批处理原则
1. **小批量**: 每批修复50-100个文件
2. **频繁提交**: 每批修复后立即提交
3. **持续验证**: 每批修复后运行测试
4. **快速回滚**: 失败时立即回滚

### 并行执行
- Phase 1和支持任务S.1可以并行
- 自动化脚本开发可以提前进行
- 文档更新可以在修复过程中进行

### 检查点
- **Checkpoint 1**: Phase 1完成，架构违规清零
- **Checkpoint 2**: Phase 2完成，函数式违规大幅减少
- **Checkpoint 3**: Phase 3完成，类型安全问题解决
- **Checkpoint 4**: Phase 4完成，所有违规清零

## 验证清单

### 每个Phase完成后
- [ ] ESLint检查通过该Phase的规则
- [ ] 所有测试通过
- [ ] 构建成功
- [ ] 进度记录更新
- [ ] Git提交完成

### 最终验证
- [ ] ESLint错误数 = 0
- [ ] ESLint警告数 < 50
- [ ] 所有单元测试通过
- [ ] 所有集成测试通过
- [ ] E2E测试通过
- [ ] 生产构建成功
- [ ] 无功能回归
- [ ] 代码审查通过
- [ ] 文档更新完成

## 风险缓解

### 高风险任务标记
- **Task 2.3**: Try-catch转换 (可能改变错误处理行为)
- **Task 2.4**: 对象变异消除 (可能影响状态管理)
- **Task 3.2**: 文件重命名 (可能导致merge冲突)
- **Task 3.4**: 类重构 (可能改变程序结构)

### 缓解措施
- 每个高风险任务前创建git tag
- 充分的测试覆盖
- 代码审查重点关注
- 准备回滚计划

## 成功标准

### 技术指标
- ESLint错误: 5,070 → 0
- ESLint警告: 443 → <50
- 测试通过率: 100%
- 构建成功: ✓
- 无功能回归: ✓

### 时间指标
- Week 1: Phase 1完成
- Week 2: Phase 2完成
- Week 3: Phase 3完成
- Week 4: Phase 4完成并合并

### 质量指标
- 代码可维护性提升
- 架构一致性提升
- 函数式编程原则遵循
- 类型安全保障
