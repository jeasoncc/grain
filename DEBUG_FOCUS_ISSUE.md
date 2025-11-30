# 焦点轮廓问题调试指南

## 🔍 问题诊断

如果焦点轮廓仍然出现，请按以下步骤排查：

### 步骤 1: 清除浏览器缓存

焦点样式可能被缓存了。

**方法 1: 硬刷新**
- Windows/Linux: `Ctrl + Shift + R` 或 `Ctrl + F5`
- Mac: `Cmd + Shift + R`

**方法 2: 清除缓存**
1. 打开开发者工具（F12）
2. 右键点击刷新按钮
3. 选择"清空缓存并硬性重新加载"

### 步骤 2: 检查样式是否加载

1. 打开开发者工具（F12）
2. 切换到"Elements"（元素）标签
3. 点击有焦点轮廓的元素
4. 查看右侧"Styles"（样式）面板
5. 搜索 `outline`

**预期结果**：
```css
*:focus {
  outline: none !important;
}
```

**如果没有看到**：样式文件未加载，需要重启开发服务器。

### 步骤 3: 检查样式优先级

在开发者工具的"Styles"面板中：

1. 查找 `outline` 相关样式
2. 如果有被划掉的样式，说明被覆盖了
3. 查看是哪个样式覆盖的

**常见覆盖来源**：
- Radix UI 组件样式
- Tailwind CSS 默认样式
- 浏览器默认样式

### 步骤 4: 测试浏览器支持

打开浏览器控制台，运行：

```javascript
// 检查 :focus-visible 支持
console.log('支持 :focus-visible:', CSS.supports('selector(:focus-visible)'));

// 检查当前元素的样式
const el = document.activeElement;
console.log('当前焦点元素:', el);
console.log('计算样式:', window.getComputedStyle(el).outline);
```

### 步骤 5: 使用测试页面

访问测试页面验证样式：

**方法 1: 应用内测试**
```
http://localhost:1420/test-focus
```

**方法 2: 独立测试**
```
http://localhost:1420/test-focus.html
```

## 🛠️ 解决方案

### 方案 1: 重启开发服务器

```bash
# 停止当前服务器（Ctrl+C）
# 重新启动
npm run dev
```

### 方案 2: 添加内联样式（临时）

在 `src/routes/__root.tsx` 中添加：

```tsx
<style>{`
  *:focus:not(:focus-visible) {
    outline: none !important;
    box-shadow: none !important;
  }
`}</style>
```

### 方案 3: 使用 JavaScript 移除（最后手段）

在 `src/main.tsx` 中添加：

```typescript
// 移除所有焦点轮廓
document.addEventListener('mousedown', () => {
  document.body.classList.add('using-mouse');
});

document.addEventListener('keydown', (e) => {
  if (e.key === 'Tab') {
    document.body.classList.remove('using-mouse');
  }
});
```

然后在 CSS 中：

```css
.using-mouse *:focus {
  outline: none !important;
}
```

### 方案 4: 针对特定元素

如果只有特定元素有问题，直接在组件中添加：

```tsx
<div
  onFocus={(e) => {
    e.currentTarget.style.outline = 'none';
  }}
>
  内容
</div>
```

## 🔧 调试工具

### 1. 检查焦点元素

在控制台运行：

```javascript
// 实时监控焦点元素
setInterval(() => {
  const el = document.activeElement;
  if (el && el !== document.body) {
    console.log('焦点元素:', el.tagName, el.className);
    console.log('outline:', window.getComputedStyle(el).outline);
  }
}, 1000);
```

### 2. 高亮焦点元素

```javascript
// 高亮当前焦点元素
document.addEventListener('focusin', (e) => {
  const el = e.target;
  console.log('焦点进入:', el);
  el.style.border = '2px solid red';
});

document.addEventListener('focusout', (e) => {
  e.target.style.border = '';
});
```

### 3. 检查所有样式

```javascript
// 获取所有 outline 样式
const styles = Array.from(document.styleSheets)
  .flatMap(sheet => {
    try {
      return Array.from(sheet.cssRules);
    } catch {
      return [];
    }
  })
  .filter(rule => rule.cssText?.includes('outline'))
  .map(rule => rule.cssText);

console.log('所有 outline 样式:', styles);
```

## 📸 截图诊断

如果问题仍然存在，请提供以下截图：

1. **焦点轮廓的截图**
   - 显示有问题的元素

2. **开发者工具截图**
   - Elements 标签
   - 选中有问题的元素
   - 显示 Styles 面板

3. **控制台输出**
   - 运行上面的调试脚本
   - 截图输出结果

## 🎯 常见问题

### Q: 为什么只有某些元素有焦点轮廓？

A: 可能是：
1. 该元素有特殊的样式覆盖
2. 该元素是第三方组件（如 Radix UI）
3. 该元素有内联样式

**解决方法**：
```css
/* 针对特定元素 */
.problem-element:focus {
  outline: none !important;
}
```

### Q: Tab 键导航时也不想要焦点轮廓？

A: 不推荐，但如果确实需要：

```css
*:focus,
*:focus-visible {
  outline: none !important;
}
```

⚠️ 这会影响无障碍性！

### Q: 焦点轮廓颜色不对？

A: 检查 `--ring` CSS 变量：

```javascript
// 在控制台运行
const ring = getComputedStyle(document.documentElement)
  .getPropertyValue('--ring');
console.log('--ring 值:', ring);
```

### Q: 某些浏览器不生效？

A: 检查浏览器版本：
- Chrome 86+
- Firefox 85+
- Safari 15.4+

旧版本浏览器不支持 `:focus-visible`。

## 📝 报告问题

如果以上方法都不行，请提供：

1. 浏览器版本
2. 操作系统
3. 问题截图
4. 开发者工具截图
5. 控制台输出

## 🚀 快速修复（核心代码）

如果你想快速修复，直接在 `src/styles.css` 最顶部添加：

```css
/* 强制移除所有焦点轮廓 */
* {
  outline: none !important;
}

*:focus {
  outline: none !important;
  box-shadow: none !important;
}

/* 仅键盘导航时显示 */
*:focus-visible {
  outline: 2px solid #3b82f6 !important;
  outline-offset: 2px;
}
```

然后：
1. 保存文件
2. 硬刷新浏览器（Ctrl+Shift+R）
3. 测试

---

**最后更新**: 2024-11-30  
**状态**: 调试中

