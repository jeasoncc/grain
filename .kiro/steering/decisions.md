# 技术决策记录

记录项目中的重大技术决策，说明「为什么选 A 不选 B」。

## 架构决策

### 为什么选择函数式编程

**决策**：采用 fp-ts + 纯函数管道架构

**原因**：
- 数据流清晰，易于追踪和调试
- 纯函数易于测试，无副作用
- 不可变数据避免状态混乱
- 与 React 的单向数据流理念一致

**替代方案**：
- OOP + Class：状态分散，难以追踪数据流
- Redux：过于繁琐，boilerplate 太多

### 为什么选择 Builder 模式

**决策**：Interface + Builder + Zod Schema 三层结构

**原因**：
- Interface 定义数据形状（编译时类型）
- Builder 提供流畅的构建 API（链式调用）
- Zod Schema 运行时校验（外部数据守卫）
- 三层分离，职责清晰

**替代方案**：
- 直接使用 Class：方法和数据混在一起，不符合函数式理念
- 只用 Interface：缺少构建约束和运行时校验

## 技术栈决策

### 为什么选择 fp-ts 而不是 Ramda

**决策**：使用 fp-ts 作为函数式核心库

**原因**：
- TypeScript 原生支持，类型推断完美
- Either/Option 等代数数据类型，显式错误处理
- pipe 函数组合，代码可读性好

**替代方案**：
- Ramda：类型支持较弱，需要额外的 @types
- lodash/fp：功能不够完整

### 为什么选择 es-toolkit 而不是 lodash

**决策**：使用 es-toolkit 替代 lodash

**原因**：
- 包体积更小（tree-shaking 友好）
- 现代 ES 语法，性能更好
- TypeScript 原生支持
- API 与 lodash 兼容，迁移成本低

### 为什么选择 Dexie 而不是直接操作 IndexedDB

**决策**：使用 Dexie 作为 IndexedDB 封装层

**原因**：
- API 更友好，Promise-based
- 支持响应式查询（useLiveQuery）
- 事务管理更简单
- 迁移和版本管理内置支持

### 为什么选择 Zustand 而不是 Redux

**决策**：使用 Zustand 管理运行时状态

**原因**：
- API 简洁，几乎零 boilerplate
- 支持 Immer 中间件，不可变更新
- 支持 selector，精确订阅
- 与 React 18 并发模式兼容

### 为什么选择 dayjs 而不是 date-fns

**决策**：使用 dayjs 处理时间

**原因**：
- 包体积小（2KB vs 13KB）
- API 与 Moment.js 兼容
- 插件系统灵活
- 链式调用更直观

### 为什么选择 Lexical 而不是 Slate/ProseMirror

**决策**：使用 Lexical 作为富文本编辑器

**原因**：
- Meta 维护，长期支持有保障
- 性能优秀，大文档不卡顿
- 插件架构清晰
- React 集成良好

**替代方案**：
- Slate：API 不稳定，breaking changes 频繁
- ProseMirror：学习曲线陡峭，React 集成需要额外工作

## 工程决策

### 为什么使用 Monorepo

**决策**：使用 Turborepo + bun workspaces

**原因**：
- 代码共享方便（editor 包）
- 统一的依赖管理
- 并行构建，CI 更快
- 版本同步简单

### 为什么选择 Tauri 而不是 Electron

**决策**：使用 Tauri 2.x 构建桌面应用

**原因**：
- 包体积小（~10MB vs ~150MB）
- 内存占用低
- 原生系统 WebView，性能好
- Rust 后端，安全性高

**代价**：
- 需要学习 Rust（后端逻辑）
- 跨平台 WebView 差异需要处理

### 为什么版本号自动递增

**决策**：pre-commit hook 自动递增 patch 版本

**原因**：
- 每次提交都有唯一版本号
- 方便追踪问题到具体版本
- 避免手动更新遗漏
- 与 tag 发布流程配合

---

**更新规则**：遇到重大技术选型时，记录决策理由和替代方案对比。
