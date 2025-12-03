# 自动保存功能问题分析与修复

## 🔍 发现的问题

### 1. **依赖项问题** ⚠️
```typescript
const debouncedSave = useMemo(
  () => debounce(...),
  [autoSave, autoSaveDelayMs]  // ❌ 依赖项变化会重新创建 debounce
);
```

**问题**: 每次 `autoSave` 或 `autoSaveDelayMs` 变化时，会创建新的 debounce 函数，导致：
- 之前的防抖被取消
- 可能丢失未保存的内容
- 性能问题

### 2. **autoSaveInterval 单位混乱** ⚠️
```typescript
// 设置中是秒
autoSaveInterval: 60  // 60秒

// 使用时转换为毫秒
const autoSaveDelayMs = autoSave 
  ? Math.max(DEFAULT_AUTO_SAVE_MS, autoSaveInterval * 1000)  // 60000ms
  : DEFAULT_AUTO_SAVE_MS;  // 800ms
```

**问题**: 
- 默认 60 秒太长了！用户可能丢失大量内容
- 禁用自动保存时仍然使用 800ms 延迟（逻辑错误）
- 命名混淆（interval vs delay）

### 3. **保存状态管理不完善** ⚠️
```typescript
setSaveStatus("saving");
// ... 保存操作
setSaveStatus("saved");
```

**问题**:
- 没有超时处理（如果保存卡住，状态永远是 "saving"）
- 没有重试机制
- 错误后没有自动恢复

### 4. **场景切换时的保存** ⚠️
```typescript
useEffect(() => {
  // 场景切换时重置编辑器
  setEditorInitialState(initial);
}, [activeScene?.id]);
```

**问题**:
- 切换场景时，之前场景的未保存内容可能丢失
- 没有强制保存当前内容

### 5. **debounce 清理不完整** ⚠️
```typescript
useEffect(() => () => {
  debouncedSave.cancel();
}, [debouncedSave]);
```

**问题**:
- 组件卸载时取消了 debounce，但没有立即保存
- 用户关闭页面时可能丢失内容

---

## 🔧 修复方案

### 修复 1: 优化 debounce 依赖

```typescript
// ❌ 错误的方式
const debouncedSave = useMemo(
  () => debounce(...),
  [autoSave, autoSaveDelayMs]
);

// ✅ 正确的方式
const debouncedSaveRef = useRef<ReturnType<typeof debounce>>();

useEffect(() => {
  // 创建新的 debounce 函数
  debouncedSaveRef.current = debounce(
    async (sceneId: string, serialized: SerializedEditorState) => {
      if (!autoSave) return;
      // ... 保存逻辑
    },
    autoSaveDelayMs
  );

  // 清理旧的 debounce
  return () => {
    debouncedSaveRef.current?.cancel();
  };
}, [autoSave, autoSaveDelayMs]);
```

### 修复 2: 调整默认保存间隔

```typescript
// ❌ 旧的默认值
autoSaveInterval: 60  // 60秒太长

// ✅ 新的默认值
autoSaveInterval: 3   // 3秒更合理
```

### 修复 3: 添加保存超时和重试

```typescript
const saveWithTimeout = async (sceneId: string, content: string) => {
  const timeoutPromise = new Promise((_, reject) => {
    setTimeout(() => reject(new Error('Save timeout')), 10000);
  });

  const savePromise = db.updateScene(sceneId, { content });

  try {
    await Promise.race([savePromise, timeoutPromise]);
    setSaveStatus("saved");
  } catch (error) {
    if (error.message === 'Save timeout') {
      // 重试
      await retrySave(sceneId, content);
    } else {
      setSaveStatus("error");
    }
  }
};
```

### 修复 4: 场景切换前强制保存

```typescript
useEffect(() => {
  // 场景切换前，立即保存当前场景
  return () => {
    if (debouncedSaveRef.current) {
      debouncedSaveRef.current.flush();  // 立即执行待处理的保存
    }
  };
}, [activeScene?.id]);
```

### 修复 5: 页面关闭前保存

```typescript
useEffect(() => {
  const handleBeforeUnload = (e: BeforeUnloadEvent) => {
    if (debouncedSaveRef.current) {
      debouncedSaveRef.current.flush();
    }
    
    // 如果有未保存的内容，提示用户
    if (saveStatus === 'saving') {
      e.preventDefault();
      e.returnValue = '有未保存的内容，确定要离开吗？';
    }
  };

  window.addEventListener('beforeunload', handleBeforeUnload);
  return () => window.removeEventListener('beforeunload', handleBeforeUnload);
}, [saveStatus]);
```

---

## 📝 完整的修复代码

见下一个文件...

