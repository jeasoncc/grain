# Desktop 项目中文转英文审查报告

## 发现的中文内容

### 1. 注释 (Comments)
- `apps/desktop/src/components/devtools-wrapper.tsx` - 开发工具相关注释
- `apps/desktop/src/db/schema.ts` - 数据库接口注释
- `apps/desktop/src/components/activity-bar.tsx` - 活动栏注释

### 2. UI 文本 (User-facing Text)
- `apps/desktop/src/components/settings-nav.tsx` - 设置导航标签
- `apps/desktop/src/components/blocks/focus-mode.tsx` - 打字机模式提示
- `apps/desktop/src/components/blocks/keyboard-shortcuts-help.tsx` - 快捷键描述
- `apps/desktop/src/components/blocks/canvas-editor.tsx` - 画布编辑器提示
- `apps/desktop/src/components/blocks/save-status-indicator.tsx` - 保存状态文本

### 3. 数据内容 (Data)
- `apps/desktop/src/services/diary-v2.ts` - 中文生肖、天干地支、时辰
- `apps/desktop/src/services/export.ts` - 导出功能中的默认文本

### 4. 错误消息 (Error Messages)
- `apps/desktop/src/services/export.ts` - 错误提示信息

## 修复计划

按优先级排序：
1. **高优先级**: UI 文本 - 用户直接看到的内容
2. **中优先级**: 错误消息 - 用户可能看到的提示
3. **低优先级**: 注释 - 开发者看到的内容
4. **特殊处理**: 数据内容 - 需要保留中文但添加英文翻译
