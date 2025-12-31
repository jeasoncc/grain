# 统一编辑器状态持久化 - 需求文档

## 项目概述

使用 `react-freeze` 统一管理所有编辑器（Lexical、Excalidraw、Code、Diagram）的 tab 状态，移除现有的 `MultiEditorContainer`，实现架构统一和极致性能。

## 背景

### 当前问题

1. **架构不统一**：Lexical 使用 `MultiEditorContainer` + CSS visibility，其他编辑器使用 `key={activeTab.id}` 导致销毁重建
2. **状态丢失**：Excalidraw、Code、Diagram 切换时状态丢失（画布、光标、滚动位置）
3. **性能差**：非 Lexical 编辑器每次切换都重新初始化
4. **维护成本高**：两套管理机制，代码复杂

### 目标

1. **统一架构**：所有编辑器使用同一套状态管理机制
2. **状态保留**：切换 tab 时保留所有状态（滚动、光标、撤销历史、画布状态）
3. **极致性能**：完全阻止非活动编辑器的 reconciliation，切换耗时 < 16ms
4. **简化代码**：移除 `MultiEditorContainer`，降低维护成本

## 核心需求

### 1. 统一状态管理机制

**需求 ID**: REQ-001  
**优先级**: P0（必须）

**描述**：所有编辑器使用 `react-freeze` 统一管理 tab 状态

**验收标准**：
- [ ] 所有编辑器（Lexical、Excalidraw、Code、Diagram）使用 `EditorWithFreeze` 包装
- [ ] 移除 `MultiEditorContainer` 和 `EditorInstance`
- [ ] 移除所有 `key={activeTab.id}` 的用法
- [ ] 所有编辑器同时渲染，使用 `freeze` prop 控制

### 2. 状态完整保留

**需求 ID**: REQ-002  
**优先级**: P0（必须）

**描述**：切换 tab 时保留所有编辑器状态

**验收标准**：
- [ ] Lexical：光标位置、滚动位置、撤销历史、选中文本保留
- [ ] Excalidraw：画布状态（缩放、平移、选中元素）、撤销历史保留
- [ ] Code (Monaco)：光标位置、滚动位置、撤销历史、折叠状态保留
- [ ] Diagram：渲染结果、滚动位置保留
- [ ] 所有编辑器的 Effects 保留（不销毁）

### 3. 极致性能

**需求 ID**: REQ-003  
**优先级**: P0（必须）

**描述**：完全阻止非活动编辑器的 reconciliation

**验收标准**：
- [ ] Tab 切换耗时 < 16ms（一帧内完成）
- [ ] 非活动编辑器 reconciliation 次数 = 0
- [ ] 内存占用 < 500MB（10 个 tabs）
- [ ] 无明显卡顿或延迟

### 4. 与 useUnifiedSave 兼容

**需求 ID**: REQ-004  
**优先级**: P0（必须）

**描述**：确保 `useUnifiedSave` 在冻结状态下正常工作

**验收标准**：
- [ ] 冻结时 Effects 保留，快捷键仍然注册
- [ ] 解冻时无需重新注册，立即可用
- [ ] 自动保存和手动保存（Ctrl+S）正常工作
- [ ] Tab.isDirty 状态同步正常

### 5. 代码质量

**需求 ID**: REQ-005  
**优先级**: P1（重要）

**描述**：符合项目的函数式架构和代码规范

**验收标准**：
- [ ] 符合 `architecture.md` 的函数式架构原则
- [ ] 符合 `code-standards.md` 的代码规范
- [ ] 符合 `design-patterns.md` 的设计模式
- [ ] 单元测试覆盖率 > 90%
- [ ] 无 TypeScript 错误
- [ ] 无 Biome lint 错误

## 非功能需求

### 性能指标

| 指标 | 目标 | 说明 |
|------|------|------|
| Tab 切换耗时 | < 16ms | 一帧内完成 |
| 内存占用 | < 500MB (10 tabs) | 合理范围 |
| 状态保留率 | 100% | 所有状态完整保留 |
| reconciliation | 0 次 | 冻结时完全阻止 |

### 兼容性

- React 19
- Bun 1.1.0+
- Tauri 2.x
- 所有现有编辑器功能

### 可维护性

- 代码行数减少 > 30%（移除 MultiEditorContainer）
- 架构统一，降低理解成本
- 测试覆盖率 > 90%

## 技术约束

1. 必须使用 `react-freeze` 而非 React `<Activity>`（实验性 API）
2. 必须保持 `useUnifiedSave` API 不变
3. 必须符合函数式架构原则
4. 必须向后兼容现有功能

## 风险评估

| 风险 | 影响 | 概率 | 缓解措施 |
|------|------|------|----------|
| Lexical 状态管理变化 | 高 | 中 | 完善测试，确保状态保留 |
| useUnifiedSave 兼容性 | 中 | 低 | 保持 API 不变，只改渲染层 |
| 性能回归 | 中 | 低 | 性能测试，监控内存占用 |
| 边界情况 | 低 | 中 | 完善测试用例 |

## 成功标准

1. ✅ 所有编辑器使用统一架构
2. ✅ 状态保留率 100%
3. ✅ Tab 切换耗时 < 16ms
4. ✅ 代码行数减少 > 30%
5. ✅ 测试覆盖率 > 90%
6. ✅ 无功能回归

## 参考文档

- [react-freeze GitHub](https://github.com/software-mansion/react-freeze)
- [React Activity API](https://react.dev/reference/react/Activity)
- `.kiro/steering/architecture.md` - 函数式架构
- `.kiro/steering/code-standards.md` - 代码规范
- `.kiro/steering/design-patterns.md` - 设计模式（编辑器状态管理架构）
