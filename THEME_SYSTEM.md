# 主题系统文档

## 概述

应用现在拥有一个强大的主题系统，包含17个精心设计的主题，支持丰富的颜色自定义和编辑器语法高亮。

## 主题列表

### 浅色主题 (9个)
1. **Default Light** - 默认浅色主题
2. **GitHub Light** - GitHub 浅色主题
3. **Solarized Light** - 护眼浅色主题
4. **Quiet Light** ⭐ - 柔和温暖的浅色主题（推荐）
5. **Light+** - VSCode 默认浅色主题
6. **Atom One Light** - 流行的 Atom 浅色主题
7. **Winter is Coming (Light)** - 清新的蓝色调浅色主题
8. **Ayu Light** - 现代简约的浅色主题
9. **Gruvbox Light** - 复古温暖浅色主题

### 深色主题 (8个)
1. **Default Dark** - 默认深色主题
2. **GitHub Dark** - GitHub 深色主题
3. **One Dark Pro** - 经典 Atom 深色主题
4. **Dracula** ⭐ - 吸血鬼紫色主题（推荐）
5. **Nord** - 北欧冷色调主题
6. **Monokai Pro** - 经典 Monokai 主题
7. **Solarized Dark** - 护眼深色主题
8. **Tokyo Night** ⭐ - 流行的深蓝紫色主题（推荐）
9. **Material Theme Ocean** - 优雅的海洋蓝主题
10. **Palenight** - 柔和的紫色深色主题
11. **Gruvbox Dark** - 复古温暖深色主题

## 颜色系统

### 基础颜色
- `background` / `foreground` - 主背景和前景色
- `card` / `cardForeground` - 卡片背景和文字
- `popover` / `popoverForeground` - 弹出层颜色
- `primary` / `primaryForeground` - 主色调
- `secondary` / `secondaryForeground` - 次要色
- `muted` / `mutedForeground` - 柔和色
- `accent` / `accentForeground` - 强调色
- `border` / `input` / `ring` - 边框、输入框、焦点环

### 侧边栏颜色
- `sidebar` / `sidebarForeground` - 侧边栏背景和文字
- `sidebarPrimary` / `sidebarPrimaryForeground` - 侧边栏主色
- `sidebarAccent` / `sidebarAccentForeground` - 侧边栏强调色
- `sidebarBorder` - 侧边栏边框

### 编辑器扩展颜色
- `editorCursor` - 光标颜色
- `editorSelection` - 选中文本背景
- `editorLineHighlight` - 当前行高亮

### 状态颜色
- `success` - 成功状态（绿色）
- `warning` - 警告状态（黄色）
- `error` - 错误状态（红色）
- `info` - 信息状态（蓝色）

### 语法高亮颜色
- `syntaxHeading` - 标题颜色（H1-H6）
- `syntaxBold` - 粗体文字颜色
- `syntaxItalic` - 斜体文字颜色
- `syntaxLink` - 链接颜色
- `syntaxCode` - 代码颜色
- `syntaxQuote` - 引用块颜色
- `syntaxComment` - 注释颜色

## CSS 类使用

### 状态颜色类
```css
.text-success  /* 成功文字 */
.text-warning  /* 警告文字 */
.text-error    /* 错误文字 */
.text-info     /* 信息文字 */

.bg-success    /* 成功背景 */
.bg-warning    /* 警告背景 */
.bg-error      /* 错误背景 */
.bg-info       /* 信息背景 */
```

### 编辑器样式
编辑器内容会自动应用语法高亮：
- 标题（H1-H6）使用 `syntaxHeading` 颜色
- 粗体使用 `syntaxBold` 颜色
- 斜体使用 `syntaxItalic` 颜色
- 链接使用 `syntaxLink` 颜色，带下划线效果
- 行内代码使用 `syntaxCode` 颜色和背景
- 引用块使用 `syntaxQuote` 颜色和左边框

## 使用方法

### 在组件中使用主题
```typescript
import { useTheme } from "@/hooks/use-theme";

function MyComponent() {
  const { 
    theme,           // 当前主题 key
    setTheme,        // 设置主题
    currentTheme,    // 当前主题对象
    isDark,          // 是否深色主题
    mode,            // 主题模式: "light" | "dark" | "system"
    setMode,         // 设置模式
    isSystem,        // 是否跟随系统
    enableTransition,// 是否启用过渡动画
    setEnableTransition, // 设置过渡动画
    toggleMode,      // 循环切换模式
  } = useTheme();
  
  // 切换主题
  setTheme("quiet-light");
  
  // 设置跟随系统模式
  setMode("system");
  
  // 获取当前主题信息
  console.log(currentTheme?.name); // "Quiet Light"
  console.log(isDark); // false
  console.log(isSystem); // false
}
```

### 在CSS中使用颜色变量
```css
.my-element {
  background: hsl(var(--background));
  color: hsl(var(--foreground));
  border: 1px solid hsl(var(--border));
}

.my-button {
  background: hsl(var(--primary));
  color: hsl(var(--primary-foreground));
}

.my-success-message {
  color: hsl(var(--success));
}
```

### 在内联样式中使用
```tsx
<div style={{ 
  background: currentTheme?.colors.background,
  color: currentTheme?.colors.foreground 
}}>
  内容
</div>
```

## 技术实现

### 颜色格式转换
主题系统自动将十六进制颜色（`#ffffff`）转换为 HSL 格式（`0 0% 100%`），以兼容 Tailwind CSS 的颜色变量系统。

### 默认值
如果主题没有定义扩展颜色，系统会自动生成合理的默认值：
- 编辑器颜色基于主色调
- 状态颜色使用标准的绿/黄/红/蓝
- 语法高亮颜色基于主题的基础颜色

### 主题持久化
使用 Zustand persist 中间件实现主题持久化，数据保存在 `localStorage` 的 `novel-editor-theme` 键中。持久化的数据包括：
- `themeKey` - 当前选择的主题
- `mode` - 主题模式（light/dark/system）
- `enableTransition` - 是否启用过渡动画

### 系统主题跟随
当主题模式设置为 `system` 时，应用会：
1. 自动检测系统的深色/浅色模式偏好
2. 监听系统主题变化事件（`prefers-color-scheme`）
3. 实时切换到对应的默认主题

### 过渡动画
主题切换时支持平滑过渡动画（300ms），通过 CSS 类 `.theme-transition` 实现。可以在主题选择器中开关此功能。

## 自定义主题

要添加新主题，在 `src/lib/themes.ts` 中添加：

```typescript
{
  key: "my-theme",
  name: "My Theme",
  description: "我的自定义主题",
  type: "light", // 或 "dark"
  colors: {
    // 必需的基础颜色
    background: "#ffffff",
    foreground: "#000000",
    // ... 其他必需颜色
    
    // 可选的扩展颜色
    editorCursor: "#0066ff",
    syntaxHeading: "#0066ff",
    // ... 其他可选颜色
  }
}
```

## 最佳实践

1. **使用语义化颜色变量**：优先使用 `--primary`、`--success` 等语义化变量，而不是硬编码颜色
2. **支持深色模式**：确保组件在浅色和深色主题下都能正常显示
3. **测试多个主题**：在不同主题下测试UI，确保对比度和可读性
4. **使用状态颜色**：成功/警告/错误消息使用对应的状态颜色
5. **编辑器内容**：在 `.editor-container` 内的内容会自动应用语法高亮

## 编辑器样式增强

### 文本选中样式
- 浅色模式：40% 透明度的主色调背景
- 深色模式：50% 透明度的主色调背景
- 使用主题的 `editorSelection` 颜色（如果定义）

### 当前行高亮
- 编辑时当前行会有淡色背景高亮
- 使用主题的 `editorLineHighlight` 颜色
- 支持段落、标题、引用等元素

### 光标颜色
- 使用主题的 `editorCursor` 颜色
- 默认使用 `primary` 颜色

### 打字机模式
- 非当前段落淡化（60% 透明度）
- 当前段落完全显示
- 屏幕中央有淡色指示线
- 平滑的透明度过渡动画

## 已实现功能

- [x] 主题持久化（Zustand persist）
- [x] 系统主题跟随（自动检测并监听系统深色/浅色模式）
- [x] 主题切换过渡动画（可开关）
- [x] 17个预设主题
- [x] 增强的文本选中样式
- [x] 当前行高亮效果
- [x] 主题感知的光标颜色
- [x] 打字机模式视觉增强

## 未来计划

- [ ] 主题导入/导出功能
- [ ] 可视化主题编辑器
- [ ] 更多预设主题
- [ ] 主题分享社区
