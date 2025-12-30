# Implementation Tasks

## Task 1: 创建 monaco-theme.fn.test.ts 测试文件

- [x] 在 `apps/desktop/src/components/code-editor/` 创建 `monaco-theme.fn.test.ts`
- [x] 测试 `getMonacoThemeName` 函数
- [x] 测试 `generateMonacoTheme` 函数（验证颜色映射）
- [x] 测试 `registerMonacoTheme` 函数（验证缓存机制）
- [x] 测试 `clearRegisteredThemes` 函数
- [x] 测试 `isThemeRegistered` 函数

**Requirements:** 4.1, 4.2

**Files:**
- `apps/desktop/src/components/code-editor/monaco-theme.fn.test.ts` (create)

---

## Task 2: 更新 CodeEditorView 类型定义

- [x] 修改 `code-editor.types.ts` 中的 `CodeEditorViewProps`
- [x] 将 `theme` 属性从 `"light" | "dark"` 改为 `Theme | undefined`
- [x] 添加 `Theme` 类型导入

**Requirements:** 1.1, 1.2, 3.1

**Files:**
- `apps/desktop/src/components/code-editor/code-editor.types.ts` (modify)

---

## Task 3: 更新 CodeEditorView 组件实现主题同步

- [x] 导入 `registerMonacoTheme` 和 `getMonacoThemeName` 函数
- [x] 在 `handleEditorMount` 中注册并应用当前主题
- [x] 添加 `useEffect` 监听 `theme` prop 变化   
- [x] 主题变化时调用 `registerMonacoTheme` 并更新 Monaco 主题
- [x] 保持向后兼容：未传入 theme 时使用默认 light/dark

**Requirements:** 1.1, 1.2, 1.3, 1.5, 3.2

**Files:**
- `apps/desktop/src/components/code-editor/code-editor.view.fn.tsx` (modify)

---

## Task 4: 更新 DiagramEditorView 类型定义

- [x] 修改 `diagram-editor.types.ts` 中的 `DiagramEditorViewProps`
- [ ] 将 `theme` 属性从 `"light" | "dark"` 改为 `Theme | undefined`
- [ ] 添加 `Theme` 类型导入

**Requirements:** 1.4

**Files:**
- `apps/desktop/src/components/diagram-editor/diagram-editor.types.ts` (modify)

---

## Task 5: 更新 DiagramEditorView 实现可拖动面板

- [x] 导入 `Panel`, `PanelGroup`, `PanelResizeHandle` 从 `react-resizable-panels`
- [x] 将现有 flex 布局替换为 `PanelGroup` 布局
- [x] 设置 `autoSaveId="diagram-editor-layout"` 实现尺寸持久化
- [x] 设置代码编辑器面板 `minSize={20}` `maxSize={80}`
- [x] 设置预览面板 `minSize={20}` `maxSize={80}`
- [x] 添加 `PanelResizeHandle` 并设置样式（hover 反馈）

**Requirements:** 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7

**Files:**
- `apps/desktop/src/components/diagram-editor/diagram-editor.view.fn.tsx` (modify)

---

## Task 6: 更新 DiagramEditorContainer 传递完整主题

- [x] 修改 `useTheme()` 调用，获取 `currentTheme` 而非 `isDark`
- [x] 将 `currentTheme` 传递给 `DiagramEditorView` 的 `theme` prop

**Requirements:** 1.1, 1.2

**Files:**
- `apps/desktop/src/components/diagram-editor/diagram-editor.container.fn.tsx` (modify)

---

## Task 7: 更新 CodeEditorView 测试

- [x] 更新现有测试以适应新的 `theme` prop 类型
- [x] 添加测试：传入 Theme 对象时正确应用主题
- [x] 添加测试：主题变化时正确更新 Monaco 主题
- [x] 添加测试：未传入主题时使用默认主题

**Requirements:** 4.2, 4.4

**Files:**
- `apps/desktop/src/components/code-editor/code-editor.view.fn.test.tsx` (modify)

---

## Task 8: 更新 DiagramEditorView 测试

- [x] 更新现有测试以适应新的布局结构
- [x] 添加测试：PanelGroup 正确渲染
- [x] 添加测试：resize handle 正确渲染
- [x] 添加测试：面板尺寸限制正确

**Requirements:** 4.3, 4.4

**Files:**
- `apps/desktop/src/components/diagram-editor/diagram-editor.view.fn.test.tsx` (modify)

---

## Task 9: 验证和清理

- [x] 运行所有测试确保通过
- [x] 运行 lint 检查
- [x] 运行类型检查
- [ ] 手动测试主题切换功能
- [ ] 手动测试面板拖动功能
- [x] 清理未使用的代码

**Requirements:** 4.4

**Files:**
- N/A (verification only)
    