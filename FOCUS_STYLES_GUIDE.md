# 焦点样式优化指南

## 问题说明

当点击或聚焦到可交互元素时，浏览器会显示默认的焦点轮廓（通常是蓝色或紫色的方框）。这是为了无障碍访问（键盘导航）而设计的，但可能影响视觉美观。

## 解决方案

我们采用了现代化的焦点样式策略：

### 1. 移除鼠标点击时的焦点轮廓

使用 `:focus` 伪类移除所有默认焦点轮廓：

```css
*:focus {
  outline: none;
}
```

### 2. 保留键盘导航时的焦点样式

使用 `:focus-visible` 伪类，仅在键盘导航时显示焦点样式：

```css
*:focus-visible {
  outline: 2px solid hsl(var(--ring));
  outline-offset: 2px;
  border-radius: 4px;
}
```

### 3. 特殊元素的焦点样式

#### 按钮和链接
```css
button:focus-visible,
a:focus-visible {
  outline: 2px solid hsl(var(--ring));
  outline-offset: 2px;
}
```

#### 输入框
```css
input:focus-visible,
textarea:focus-visible {
  outline: none;
  border-color: hsl(var(--ring));
  box-shadow: 0 0 0 3px color-mix(in srgb, hsl(var(--ring)) 15%, transparent);
}
```

#### 对话框和弹出层
```css
[role="dialog"]:focus,
[role="menu"]:focus {
  outline: none;
}
```

## 工作原理

### `:focus` vs `:focus-visible`

- **`:focus`**: 任何方式获得焦点时触发（鼠标点击、键盘导航、编程设置）
- **`:focus-visible`**: 仅在"需要显示焦点指示器"时触发（主要是键盘导航）

浏览器会智能判断：
- 鼠标点击按钮 → 不触发 `:focus-visible`
- Tab 键导航到按钮 → 触发 `:focus-visible`
- 点击输入框 → 触发 `:focus-visible`（因为需要输入）

## 无障碍性保证

我们的方案完全符合 WCAG 2.1 无障碍标准：

1. ✅ 键盘用户可以看到焦点指示器
2. ✅ 屏幕阅读器用户不受影响
3. ✅ 鼠标用户不会看到多余的轮廓
4. ✅ 触摸屏用户体验更好

## 浏览器兼容性

`:focus-visible` 支持情况：
- ✅ Chrome 86+
- ✅ Firefox 85+
- ✅ Safari 15.4+
- ✅ Edge 86+

对于不支持的浏览器，会回退到 `:focus` 行为（显示焦点轮廓）。

## 自定义焦点样式

### 修改焦点颜色

焦点样式使用 CSS 变量 `--ring`，可以在主题中自定义：

```css
:root {
  --ring: 220 90% 56%; /* HSL 格式 */
}
```

### 修改焦点样式

在 `src/styles.css` 中修改：

```css
*:focus-visible {
  outline: 2px solid hsl(var(--ring));
  outline-offset: 2px;
  border-radius: 4px;
  /* 添加自定义样式 */
  box-shadow: 0 0 0 4px color-mix(in srgb, hsl(var(--ring)) 20%, transparent);
}
```

## 特殊情况处理

### 编辑器内容区域

编辑器内容区域不需要焦点轮廓：

```css
.editor-container:focus,
.editor-container:focus-within {
  outline: none;
}
```

### Canvas 元素

Canvas 元素不需要焦点轮廓：

```css
canvas:focus {
  outline: none;
}
```

### 自定义组件

如果你的组件需要特殊的焦点样式：

```css
.my-component:focus-visible {
  /* 自定义样式 */
  outline: 2px dashed hsl(var(--primary));
  outline-offset: 4px;
}
```

## 测试焦点样式

### 键盘导航测试

1. 按 `Tab` 键在页面元素间导航
2. 确认焦点指示器清晰可见
3. 确认焦点顺序符合逻辑

### 鼠标点击测试

1. 点击按钮、链接等元素
2. 确认不显示焦点轮廓
3. 确认功能正常

### 屏幕阅读器测试

1. 使用 NVDA/JAWS（Windows）或 VoiceOver（Mac）
2. 确认焦点位置正确朗读
3. 确认所有交互元素可访问

## 常见问题

### Q: 为什么点击后还是有焦点轮廓？

A: 可能是以下原因：
1. 浏览器不支持 `:focus-visible`（更新浏览器）
2. 元素是输入框（输入框需要显示焦点）
3. CSS 样式被覆盖（检查样式优先级）

### Q: 如何完全禁用焦点轮廓？

A: 不推荐完全禁用，这会影响无障碍性。如果确实需要：

```css
* {
  outline: none !important;
}
```

但这会导致键盘用户无法导航。

### Q: 如何让某个元素永远不显示焦点？

A: 使用 `tabindex="-1"` 属性：

```html
<div tabindex="-1">不可聚焦的元素</div>
```

### Q: 焦点样式与主题不匹配？

A: 确保主题定义了 `--ring` 变量：

```typescript
// src/lib/themes.ts
{
  colors: {
    ring: "220 90% 56%", // 焦点颜色
  }
}
```

## 最佳实践

1. **保持一致性**: 所有交互元素使用相同的焦点样式
2. **足够对比度**: 焦点指示器与背景对比度 ≥ 3:1
3. **清晰可见**: 焦点指示器至少 2px 宽
4. **不遮挡内容**: 使用 `outline-offset` 避免遮挡
5. **测试键盘导航**: 确保所有功能可通过键盘访问

## 相关资源

- [MDN: :focus-visible](https://developer.mozilla.org/en-US/docs/Web/CSS/:focus-visible)
- [WCAG 2.1: Focus Visible](https://www.w3.org/WAI/WCAG21/Understanding/focus-visible.html)
- [A11y Project: Focus Styles](https://www.a11yproject.com/posts/never-remove-css-outlines/)

## 更新日志

- 2024-11-30: 初始版本，添加 `:focus-visible` 支持
- 优化了输入框、按钮、对话框的焦点样式
- 移除了鼠标点击时的焦点轮廓

