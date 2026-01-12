# Implementation Plan: ESLint Plugin Enhancement

## Overview

本实现计划将 Grain ESLint 插件从当前的 8 条规则扩展到完整的 50+ 条规则，实现最严格的代码审查系统。采用增量开发方式，每个阶段完成后进行验证。

## Tasks

- [-] 1. 基础设施升级
  - [x] 1.1 升级工具函数库
    - 更新 `utils/architecture.ts` 添加严格模式层级依赖
    - 添加 `utils/message-builder.ts` 统一错误消息构建
    - 添加 `utils/ast-helpers.ts` AST 辅助函数
    - 添加 `utils/naming-helpers.ts` 命名检查辅助
    - _Requirements: 13.1-13.5_
  - [x] 1.2 创建类型定义
    - 创建 `types/rule.types.ts` 规则相关类型
    - 创建 `types/config.types.ts` 配置相关类型
    - _Requirements: 13.1-13.5_
  - [x] 1.3 编写基础设施单元测试
    - 测试 message-builder 函数
    - 测试 architecture 工具函数
    - _Requirements: 13.1-13.5_

- [x] 2. 函数式编程规则（functional/）
  - [x] 2.1 增强 no-try-catch 规则
    - 添加完整的错误消息模板
    - 添加 TaskEither 迁移指导
    - _Requirements: 1.1_
  - [x] 2.2 实现 no-throw 规则
    - 检测所有 throw 语句
    - 提供 Either.left/TaskEither.left 替代方案
    - _Requirements: 1.2_
  - [x] 2.3 实现 no-promise-methods 规则
    - 检测 Promise.catch/then/all/race
    - 提供 TaskEither 替代方案
    - _Requirements: 1.3, 17.2-17.5_
  - [x] 2.4 实现 no-async-outside-io 规则
    - 检测 io/ 层外的 async/await
    - _Requirements: 17.1, 17.7_
  - [x] 2.5 增强 no-mutation 规则
    - 添加所有数组变异方法检测
    - 添加 forEach 检测
    - 添加数组索引赋值检测
    - _Requirements: 1.5, 18.1-18.7_
  - [x] 2.6 实现 no-object-mutation 规则
    - 检测 Object.assign 变异
    - 检测 delete 操作符
    - 检测 Object.defineProperty
    - _Requirements: 1.6-1.8, 19.1-19.7_
  - [x] 2.7 实现 fp-ts-patterns 规则
    - 检测未 fold 的 Either/Option
    - 检测未执行的 TaskEither
    - 检测手动 null 检查
    - _Requirements: 26.1-26.7_
  - [x] 2.8 编写函数式规则属性测试
    - **Property 1: Error Handling Pattern Detection**
    - **Property 2: Immutability Enforcement**
    - **Validates: Requirements 1.1-1.10, 17.1-17.7, 18.1-18.7, 19.1-19.7, 26.1-26.7**

- [ ] 3. Checkpoint - 函数式规则验证
  - 运行所有测试确保通过
  - 在示例代码上验证规则效果
  - 如有问题请询问用户

- [x] 4. 架构层级规则（architecture/）
  - [x] 4.1 增强 layer-dependencies 规则
    - 移除所有例外情况（严格模式）
    - 添加完整的层级修复建议
    - _Requirements: 2.1-2.12_
  - [x] 4.2 增强 no-react-in-pure-layers 规则
    - 扩展到检测所有 React 相关导入
    - _Requirements: 3.10_
  - [x] 4.3 增强 no-side-effects-in-pipes 规则
    - 添加更多副作用检测
    - 扩展到 utils/ 层
    - _Requirements: 3.1-3.9_
  - [x] 4.4 实现 no-store-in-views 规则
    - 检测 view 组件中的 store 访问
    - _Requirements: 6.1, 27.1_
  - [x] 4.5 实现 file-location 规则
    - 检测文件是否在正确的目录
    - 检测 index.ts 是否只包含重导出
    - _Requirements: 28.1-28.5_
  - [x] 4.6 编写架构规则属性测试
    - **Property 3: Architecture Layer Dependency Validation**
    - **Property 4: Side Effect Detection in Pure Layers**
    - **Validates: Requirements 2.1-2.12, 3.1-3.10**

- [x] 5. Checkpoint - 架构规则验证
  - 运行所有测试确保通过
  - 在实际项目文件上验证规则效果
  - 如有问题请询问用户

- [x] 6. 命名规范规则（naming/）
  - [x] 6.1 实现 file-naming 规则
    - 检测各层级文件命名规范
    - _Requirements: 4.1-4.10_
  - [x] 6.2 实现 variable-naming 规则
    - 检测变量名最小长度
    - 检测允许的短变量名
    - _Requirements: 16.1_
  - [x] 6.3 实现 function-naming 规则
    - 检测函数名是否以动词开头
    - 检测事件处理器命名
    - _Requirements: 16.2, 16.7_
  - [x] 6.4 实现 boolean-naming 规则
    - 检测布尔变量前缀
    - _Requirements: 16.3_
  - [x] 6.5 实现 constant-naming 规则
    - 检测常量是否为 SCREAMING_SNAKE_CASE
    - _Requirements: 16.4_
  - [x] 6.6 编写命名规则属性测试
    - **Property 5: File Naming Convention Validation**
    - **Property 10: Naming Convention Enforcement**
    - **Validates: Requirements 4.1-4.10, 16.1-16.7**

- [x] 7. 复杂度规则（complexity/）
  - [x] 7.1 实现 max-function-lines 规则
    - 限制函数最大 20 行
    - _Requirements: 15.1_
  - [x] 7.2 实现 max-params 规则
    - 限制参数最大 3 个
    - 提供对象参数建议
    - _Requirements: 15.2_
  - [x] 7.3 实现 max-nesting 规则
    - 限制嵌套最大 2 层
    - _Requirements: 15.4_
  - [x] 7.4 实现 cyclomatic-complexity 规则
    - 限制圈复杂度最大 5
    - _Requirements: 15.3_
  - [x] 7.5 实现 max-file-lines 规则
    - 限制文件最大 200 行
    - _Requirements: 15.6_
  - [x] 7.6 编写复杂度规则属性测试
    - **Property 9: Code Complexity Metrics Enforcement**
    - **Validates: Requirements 15.1-15.6**

- [ ] 8. Checkpoint - 命名和复杂度规则验证
  - 运行所有测试确保通过
  - 如有问题请询问用户

- [ ] 9. React 规则（react/）
  - [ ] 9.1 实现 require-memo 规则
    - 检测组件是否使用 memo 包裹
    - _Requirements: 6.2_
  - [ ] 9.2 实现 no-inline-functions 规则
    - 检测 JSX props 中的内联函数
    - _Requirements: 6.4, 25.1_
  - [ ] 9.3 实现 require-callback 规则
    - 检测函数 props 是否使用 useCallback
    - _Requirements: 6.4, 21.4_
  - [ ] 9.4 实现 hooks-patterns 规则
    - 检测 useEffect 依赖
    - 检测条件调用 hooks
    - _Requirements: 21.1-21.7_
  - [ ] 9.5 实现 component-patterns 规则
    - 检测 view 组件中的业务状态
    - 检测 key={index} 使用
    - _Requirements: 6.1, 6.6, 6.7_
  - [ ] 9.6 编写 React 规则属性测试
    - **Property 7: React Component Pattern Enforcement**
    - **Validates: Requirements 6.1-6.7, 21.1-21.7, 25.1-25.6**

- [ ] 10. 导入规则（imports/）
  - [ ] 10.1 实现 no-default-export 规则
    - 禁止 default export
    - _Requirements: 22.1_
  - [ ] 10.2 增强 no-lodash 规则
    - 扩展到所有禁止的库
    - _Requirements: 5.1-5.7_
  - [ ] 10.3 实现 require-alias 规则
    - 强制使用 @/ 别名
    - 提供自动修复
    - _Requirements: 7.2_
  - [ ] 10.4 实现 import-grouping 规则
    - 强制导入分组
    - 提供自动修复
    - _Requirements: 7.1_
  - [ ] 10.5 实现 no-deprecated-imports 规则
    - 检测废弃目录导入
    - _Requirements: 7.6, 29.1-29.2_
  - [ ] 10.6 编写导入规则属性测试
    - **Property 6: Banned Library Detection**
    - **Property 8: Import Organization Validation**
    - **Validates: Requirements 5.1-5.7, 7.1-7.6, 22.1-22.5, 29.1-29.5**

- [ ] 11. Checkpoint - React 和导入规则验证
  - 运行所有测试确保通过
  - 如有问题请询问用户

- [ ] 12. 安全规则（security/）
  - [ ] 12.1 实现 no-eval 规则
    - 检测 eval 和 Function 构造函数
    - _Requirements: 24.1-24.2_
  - [ ] 12.2 实现 no-innerhtml 规则
    - 检测 innerHTML/outerHTML
    - 检测 dangerouslySetInnerHTML
    - _Requirements: 24.3-24.4_
  - [ ] 12.3 实现 no-sensitive-logging 规则
    - 检测敏感数据日志
    - 检测硬编码凭证
    - _Requirements: 24.6-24.7_
  - [ ] 12.4 编写安全规则属性测试
    - **Property 11: Security Pattern Detection**
    - **Validates: Requirements 24.1-24.7**

- [ ] 13. 文档规则（documentation/）
  - [ ] 13.1 实现 require-jsdoc 规则
    - 检测导出函数的 JSDoc
    - 检测 JSDoc 完整性
    - _Requirements: 30.1-30.5_
  - [ ] 13.2 实现 no-commented-code 规则
    - 检测注释掉的代码
    - _Requirements: 11.3, 29.4_
  - [ ] 13.3 实现 chinese-comments 规则
    - 检测注释语言
    - _Requirements: 11.2_

- [ ] 14. 魔法值规则（magic-values/）
  - [ ] 14.1 实现 no-magic-numbers 规则
    - 检测数字字面量
    - 允许 0, 1, -1
    - _Requirements: 23.1_
  - [ ] 14.2 实现 no-hardcoded-values 规则
    - 检测硬编码 URL/路径
    - 检测硬编码超时值
    - _Requirements: 23.2-23.5_

- [ ] 15. 条件语句规则
  - [ ] 15.1 实现 no-nested-ternary 规则
    - 检测嵌套三元表达式
    - _Requirements: 20.2_
  - [ ] 15.2 实现 strict-equality 规则
    - 强制使用 === 和 !==
    - _Requirements: 20.5_
  - [ ] 15.3 实现 require-switch-default 规则
    - 检测 switch 缺少 default
    - _Requirements: 20.3_

- [ ] 16. 类型安全规则
  - [ ] 16.1 实现 no-any 规则
    - 检测 any 类型使用
    - _Requirements: 12.1_
  - [ ] 16.2 实现 no-non-null-assertion 规则
    - 检测非空断言
    - 建议使用 Option
    - _Requirements: 12.4_
  - [ ] 16.3 实现 require-return-type 规则
    - 检测函数返回类型
    - _Requirements: 12.6_

- [ ] 17. Zustand 规则
  - [ ] 17.1 实现 zustand-patterns 规则
    - 检测 store 位置
    - 检测 selector 使用
    - 检测 Immer 使用
    - _Requirements: 27.1-27.5_

- [ ] 18. 配置和预设
  - [ ] 18.1 创建 strict 配置
    - 所有规则设为 error
    - _Requirements: 14.1-14.4_
  - [ ] 18.2 创建 legacy 配置
    - 用于迁移的宽松配置
    - _Requirements: 14.5_
  - [ ] 18.3 更新插件入口
    - 导出所有新规则
    - 导出配置预设

- [ ] 19. Final Checkpoint - 完整验证
  - 运行所有测试确保通过
  - 在实际项目上运行完整检查
  - 验证错误消息的清晰度
  - 如有问题请询问用户

## Notes

- **所有任务都是必需的，没有可选任务**
- **所有属性测试都是强制性的，必须通过才能进入下一阶段**
- 每个 Checkpoint 都需要验证当前阶段的所有规则和测试
- 属性测试使用 fast-check 库，每个测试最少 100 次迭代
- 所有规则默认为 error 级别，不提供 warning 选项
- 错误消息必须包含完整的修复指导
- 零容忍策略：任何违规都必须修复，不允许跳过
