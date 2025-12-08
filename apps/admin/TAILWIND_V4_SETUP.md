# Tailwind CSS v4 配置说明

## 配置特点

Tailwind CSS v4 的主要变化：
1. ✅ 使用 `@import "tailwindcss"` 替代旧的 `@tailwind` 指令
2. ✅ 主题配置主要在 CSS 文件中通过 CSS 变量完成
3. ✅ 保留 `tailwind.config.ts` 用于扩展配置（颜色映射等）

## 当前配置

### CSS 变量定义 (`src/index.css`)
- 使用 `:root` 和 `.dark` 定义主题变量
- 所有颜色使用 HSL 格式
- 兼容 shadcn/ui 组件的颜色命名

### 配置文件 (`tailwind.config.ts`)
- 映射 CSS 变量到 Tailwind 类名
- 定义内容扫描路径
- 扩展圆角配置

## 使用的 Tailwind 类

组件中使用的主要类名：
- `bg-primary`, `text-primary-foreground`
- `bg-background`, `text-foreground`
- `border`, `border-input`
- `bg-destructive`, `text-destructive-foreground`
- `bg-card`, `text-card-foreground`
- `bg-muted`, `text-muted-foreground`
- `bg-accent`, `text-accent-foreground`

所有这些类都会自动从 CSS 变量映射到对应的 HSL 颜色值。

