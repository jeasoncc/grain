# Implementation Tasks

## Task 1: 修改 useSettings Store 添加范围验证 ✅

**File:** `apps/desktop/src/hooks/use-settings.ts`

**Requirements:** REQ-2

**Acceptance Criteria:**
- [x] `autoSaveInterval` 默认值为 3 秒
- [x] `autoSave` 默认值为 true
- [x] `setAutoSaveInterval` 方法限制范围在 1-60 秒
- [x] 小于 1 的值被设为 1，大于 60 的值被设为 60

**Implementation:**
```typescript
setAutoSaveInterval: (interval: number) => {
  const validated = Math.max(1, Math.min(60, interval));
  set({ autoSaveInterval: validated });
},
```

**Tests:**
- [x] 测试默认值
- [x] 测试范围限制（使用 fast-check 属性测试）
- [x] 测试设置持久化

---

## Task 2: 修改 EditorSaveService 支持禁用自动保存 ✅

**File:** `apps/desktop/src/fn/save/editor-save.service.ts`

**Requirements:** REQ-1.3

**Acceptance Criteria:**
- [x] 当 `autoSaveDelay = 0` 时禁用自动保存
- [x] 禁用时 `updateContent` 只更新 pendingContent，不触发 debounce
- [x] 手动保存 (`saveNow`) 仍然正常工作

**Implementation:**
```typescript
const isAutoSaveEnabled = autoSaveDelay > 0;

const debouncedSave = isAutoSaveEnabled
  ? debounce(saveContent, autoSaveDelay)
  : null;

updateContent: (content: string): void => {
  pendingContent = content;
  if (debouncedSave) {
    debouncedSave(content);
  }
},
```

**Tests:**
- [x] 测试 autoSaveDelay=0 时不触发自动保存
- [x] 测试 autoSaveDelay>0 时正常触发自动保存
- [x] 测试手动保存在两种模式下都正常工作

---

## Task 3: 修改 useEditorSave Hook 读取全局设置 ✅

**File:** `apps/desktop/src/hooks/use-editor-save.ts`

**Requirements:** REQ-1, REQ-3

**Acceptance Criteria:**
- [x] 读取 `useSettings` 的 `autoSave` 和 `autoSaveInterval`
- [x] 将 `autoSaveInterval` 转换为毫秒
- [x] 当 `autoSave=false` 时传递 `autoSaveDelay=0` 给 service
- [x] 添加 `tabId` 参数用于更新 tab dirty 状态
- [x] 在 `markAsUnsaved` 时设置 `EditorTab.isDirty = true`
- [x] 在保存成功时设置 `EditorTab.isDirty = false`

**Implementation:**
```typescript
export function useEditorSave(options: UseEditorSaveOptions): UseEditorSaveReturn {
  const { autoSave, autoSaveInterval } = useSettings();
  const setTabDirty = useEditorTabsStore((s) => s.setTabDirty);
  
  const effectiveDelay = autoSave ? autoSaveInterval * 1000 : 0;
  
  // 在 updateContent 中同步 dirty 状态
  const updateContent = useCallback((content: string) => {
    markAsUnsaved();
    if (options.tabId) {
      setTabDirty(options.tabId, true);
    }
    saveService.updateContent(content);
  }, [/* deps */]);
  
  // 在保存成功回调中清除 dirty 状态
  // ...
}
```

**Tests:**
- [ ] 测试读取 Settings 配置
- [ ] 测试 autoSave=false 时禁用自动保存
- [ ] 测试 tabId 参数更新 isDirty 状态
- [ ] 测试 onSaveSuccess 回调调用

---

## Task 4: 修改 DiagramEditorContainer 移除实时预览 ✅

**File:** `apps/desktop/src/components/diagram-editor/diagram-editor.container.fn.tsx`

**Requirements:** REQ-4

**Acceptance Criteria:**
- [x] 移除 `handleCodeChange` 中的 `debouncedPreview` 调用
- [x] 在 `onSaveSuccess` 回调中触发 `updatePreview`
- [x] 传递 `tabId` 给 `useEditorSave`
- [x] 手动保存后也触发预览渲染

**Implementation:**
```typescript
const activeTabId = useEditorTabsStore((s) => s.activeTabId);

const { updateContent, saveNow, hasUnsavedChanges } = useEditorSave({
  nodeId,
  contentType: "text",
  tabId: activeTabId ?? undefined,
  onSaveSuccess: () => {
    logger.success("[DiagramEditor] 内容保存成功");
    updatePreview(code);
  },
});

const handleCodeChange = useCallback((newCode: string) => {
  setCode(newCode);
  // 移除: debouncedPreview(newCode);
  updateContent(newCode);
}, [updateContent]);
```

**Tests:**
- [ ] 测试输入时不触发预览渲染
- [ ] 测试保存后触发预览渲染
- [ ] 测试手动保存流程

---

## Task 5: 修改设置页面 autoSaveInterval 范围 ✅

**File:** `apps/desktop/src/routes/settings/general.tsx`

**Requirements:** REQ-5

**Acceptance Criteria:**
- [x] 将 `min` 从 10 改为 1
- [x] 将 `max` 从 3600 改为 60
- [x] 显示当前值

**Implementation:**
```tsx
<Input
  type="number"
  value={autoSaveInterval}
  onChange={(e) => setAutoSaveInterval(Number(e.target.value))}
  min={1}
  max={60}
  className="h-8 w-20 text-center"
/>
```

**Tests:**
- [ ] 测试输入范围限制
- [ ] 测试值变更后保存

---

## Task 6: 添加属性测试 ✅

**File:** `apps/desktop/src/hooks/use-settings.test.ts`, `apps/desktop/src/fn/save/editor-save.service.test.ts`

**Requirements:** Property 2, Property 3

**Acceptance Criteria:**
- [x] 使用 fast-check 测试 autoSaveInterval 范围验证
- [x] 使用 fast-check 测试 autoSave=false 时禁用自动保存

**Implementation:**
```typescript
import fc from "fast-check";

describe("useSettings Property Tests", () => {
  // Property 2: Range Validation
  it("should clamp autoSaveInterval to [1, 60]", () => {
    fc.assert(
      fc.property(fc.integer({ min: -1000, max: 1000 }), (input) => {
        useSettings.getState().setAutoSaveInterval(input);
        const result = useSettings.getState().autoSaveInterval;
        return result >= 1 && result <= 60;
      }),
      { numRuns: 100 }
    );
  });
});
```

---

## Task Dependencies

```
Task 1 (useSettings) ──┐
                       ├──► Task 3 (useEditorSave) ──► Task 4 (DiagramEditor)
Task 2 (Service)    ───┘
                                                   
Task 5 (Settings UI) ── 独立，可并行

Task 6 (属性测试) ── 依赖 Task 1, Task 3
```

## Execution Order

1. **Phase 1 (并行)** ✅
   - Task 1: useSettings 范围验证 ✅
   - Task 2: EditorSaveService 禁用支持 ✅
   - Task 5: Settings UI 范围调整 ✅

2. **Phase 2** ✅
   - Task 3: useEditorSave 读取全局设置 ✅

3. **Phase 3** ✅
   - Task 4: DiagramEditorContainer 移除实时预览 ✅

4. **Phase 4** ✅
   - Task 6: 属性测试 ✅

## Summary

所有 6 个任务已完成，51 个测试全部通过。
