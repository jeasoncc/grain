# 快速启动指南

## 🚀 立即查看优化后的官网

### 1. 进入项目目录

```bash
cd /home/lotus/project/book2/novel-editor/apps/web
```

### 2. 安装依赖（如果还没安装）

```bash
bun install
```

### 3. 启动开发服务器

```bash
bun run dev
```

### 4. 在浏览器中打开

访问 [http://localhost:3000](http://localhost:3000)

## ✨ 查看的新特性

### 首页改进
- 🎨 **精美的 Hero 区域** - 渐变标题和动画背景
- 📋 **12 个功能卡片** - 详细介绍所有功能特性
- ⭐ **用户评价区域** - 展示用户反馈
- 📥 **多平台下载区域** - Linux、Windows、macOS

### UI 组件
- 🔘 **按钮组件** - 多种样式和尺寸
- 🃏 **卡片组件** - 精美的卡片设计
- 📱 **响应式导航** - 移动端友好
- 🌙 **暗色模式** - 点击导航栏的月亮图标切换

### 设计亮点
- ✨ **动画效果** - 平滑的过渡和悬停效果
- 🎯 **渐变色彩** - 蓝色到紫色的渐变
- 📐 **现代布局** - 清晰的间距和排版
- 💎 **专业质感** - 阴影、圆角、模糊效果

## 🎯 快速浏览

### Hero Section
- 大标题和描述
- 下载和源码链接按钮
- 统计数据展示

### Features Section
- 12 个功能特性卡片
- 图标和颜色分类
- 悬停动画效果

### Testimonials Section
- 用户评价
- 星级评分
- 用户信息

### Download Section
- 三个平台的下载选项
- 系统要求说明
- 文件大小显示

## 🌙 暗色模式

点击导航栏右上角的月亮/太阳图标即可切换暗色模式。

暗色模式会：
- 自动保存到本地存储
- 跟随系统偏好（首次访问）
- 在所有页面保持一致性

## 📱 响应式测试

在不同设备上测试：

1. **桌面端** (1920x1080)
   - 3 列功能卡片
   - 水平导航栏
   - 完整的布局

2. **平板端** (768x1024)
   - 2 列功能卡片
   - 移动端菜单
   - 适配的间距

3. **移动端** (375x667)
   - 1 列功能卡片
   - 汉堡菜单
   - 堆叠布局

## 🔧 自定义配置

### 修改颜色主题

编辑 `tailwind.config.ts`：

```typescript
colors: {
  primary: '#2563EB', // 修改主色
  // ...
}
```

### 添加新页面

1. 在 `src/app/` 创建新文件夹
2. 添加 `page.tsx`
3. 在导航栏添加链接

### 修改内容

- **Hero 内容**: `src/components/sections/hero-section.tsx`
- **功能列表**: `src/components/sections/features-section.tsx`
- **下载信息**: `src/components/sections/download-section.tsx`
- **页脚链接**: `src/components/layout/footer.tsx`

## 📦 构建生产版本

```bash
bun run build
bun run start
```

## 🐛 问题排查

### 样式不显示？
- 确保 Tailwind CSS 已正确配置
- 检查 `globals.css` 是否导入

### 组件错误？
- 检查依赖是否安装：`bun install`
- 查看控制台错误信息

### 暗色模式不工作？
- 检查浏览器控制台是否有错误
- 确保 `tailwind.config.ts` 中 `darkMode: "class"` 已设置

## 📚 更多信息

- 查看 [README.md](./README.md) 了解完整文档
- 查看 [IMPROVEMENTS.md](./IMPROVEMENTS.md) 了解所有改进

---

**享受你的新官网！** 🎉

