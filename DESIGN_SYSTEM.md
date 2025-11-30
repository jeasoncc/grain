# 设计系统 - 现代极简风格

## 设计原则

1. **简洁至上** - 移除不必要的装饰
2. **层次清晰** - 通过间距和字重建立层次
3. **一致性** - 统一的圆角、间距、阴影
4. **可访问性** - 确保足够的对比度
5. **响应式** - 适配不同屏幕尺寸

## 颜色系统

### 主色调
- Primary: 柔和的蓝紫色（降低饱和度）
- Secondary: 中性灰色
- Accent: 微妙的强调色

### 语义色
- Success: 柔和的绿色
- Warning: 柔和的黄色
- Error: 柔和的红色
- Info: 柔和的蓝色

### 中性色
- Background: 极浅的暖灰色
- Foreground: 深灰色（非纯黑）
- Muted: 中灰色
- Border: 极浅的灰色

## 字体系统

### 字号
- xs: 12px - 辅助信息
- sm: 13px - 次要文本
- base: 14px - 正文
- lg: 16px - 小标题
- xl: 20px - 标题
- 2xl: 24px - 大标题

### 字重
- Regular: 400 - 正文
- Medium: 500 - 强调
- Semibold: 600 - 标题

### 行高
- Tight: 1.25 - 标题
- Normal: 1.5 - 正文
- Relaxed: 1.75 - 长文本

## 间距系统

基于 4px 网格：
- xs: 4px
- sm: 8px
- md: 12px
- lg: 16px
- xl: 24px
- 2xl: 32px
- 3xl: 48px

## 圆角系统

- sm: 4px - 小元素（徽章、标签）
- md: 6px - 按钮、输入框
- lg: 8px - 卡片、面板
- xl: 12px - 大卡片
- full: 9999px - 圆形

## 阴影系统

### 层级
- sm: 0 1px 2px rgba(0,0,0,0.05) - 微妙提升
- md: 0 4px 6px rgba(0,0,0,0.07) - 标准卡片
- lg: 0 10px 15px rgba(0,0,0,0.1) - 浮动元素
- xl: 0 20px 25px rgba(0,0,0,0.15) - 模态框

## 组件规范

### 按钮
- 高度: 32px (sm), 36px (md), 40px (lg)
- 内边距: 12px 16px
- 圆角: 6px
- 字号: 14px
- 字重: 500

### 输入框
- 高度: 36px
- 内边距: 8px 12px
- 圆角: 6px
- 边框: 1px
- 字号: 14px

### 卡片
- 内边距: 16px, 20px, 24px
- 圆角: 8px
- 边框: 1px
- 阴影: sm 或 md

### 列表项
- 高度: 32px
- 内边距: 6px 12px
- 圆角: 4px
- 字号: 13px

## 动画

### 时长
- Fast: 150ms - 小元素
- Normal: 200ms - 标准
- Slow: 300ms - 大元素

### 缓动
- Ease: cubic-bezier(0.4, 0, 0.2, 1)
- Ease-in: cubic-bezier(0.4, 0, 1, 1)
- Ease-out: cubic-bezier(0, 0, 0.2, 1)

## 响应式断点

- sm: 640px
- md: 768px
- lg: 1024px
- xl: 1280px
- 2xl: 1536px
