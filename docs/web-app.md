# Novel Editor 官网

这是 Novel Editor 项目的官方网站，基于 Next.js 15 构建，使用 React 19、TypeScript 和 Tailwind CSS。

## ✨ 特性

- 🎨 **现代化设计** - 精美的 UI 设计，支持暗色模式
- 📱 **完全响应式** - 完美适配移动端、平板和桌面端
- ⚡ **性能优化** - 使用 Next.js 15 的 App Router，极速加载
- 🌙 **暗色模式** - 内置暗色模式支持，自动跟随系统偏好
- ♿ **无障碍友好** - 遵循 WCAG 标准，键盘导航支持
- 🔍 **SEO 优化** - 完整的元数据和 Open Graph 标签

## 🚀 快速开始

```bash
# 安装依赖
bun install

# 启动开发服务器
bun run dev

# 构建生产版本
bun run build

# 启动生产服务器
bun run start
```

## 📁 项目结构

```
apps/web/
├── src/
│   ├── app/                    # Next.js App Router 页面
│   │   ├── layout.tsx         # 根布局
│   │   ├── page.tsx           # 首页
│   │   └── globals.css        # 全局样式
│   ├── components/
│   │   ├── ui/                # 基础 UI 组件
│   │   │   ├── button.tsx
│   │   │   └── card.tsx
│   │   ├── layout/            # 布局组件
│   │   │   ├── header.tsx
│   │   │   └── footer.tsx
│   │   └── sections/          # 页面区块组件
│   │       ├── hero-section.tsx
│   │       ├── features-section.tsx
│   │       ├── download-section.tsx
│   │       └── testimonials-section.tsx
│   └── lib/
│       └── utils.ts           # 工具函数
├── public/                     # 静态资源
├── package.json
├── tailwind.config.ts         # Tailwind 配置
└── tsconfig.json
```

## 🎨 设计系统

### 颜色方案

- **主色**: 蓝色 (#2563EB)
- **辅助色**: 紫色、粉色渐变
- **暗色模式**: 完整的暗色主题支持

### 组件库

基于 Tailwind CSS 构建的自定义组件系统，包含：

- Button（按钮）
- Card（卡片）
- Header（导航栏）
- Footer（页脚）

## 📄 页面结构

### 首页

1. **Hero Section** - 大标题和主要 CTA
2. **Features Section** - 功能特性展示
3. **Testimonials Section** - 用户评价
4. **Download Section** - 下载区域

### 计划中的页面

- `/about` - 关于我们
- `/docs` - 文档中心
- `/docs/tutorials` - 教程
- `/docs/api` - API 参考
- `/docs/faq` - 常见问题

## 🔧 技术栈

- **框架**: Next.js 15
- **语言**: TypeScript
- **样式**: Tailwind CSS 4
- **UI 组件**: 自定义组件 + Radix UI
- **图标**: Lucide React
- **字体**: Inter (Google Fonts)

## 🌐 浏览器支持

- Chrome (最新版本)
- Firefox (最新版本)
- Safari (最新版本)
- Edge (最新版本)

## 📝 开发规范

### 代码风格

- 使用 TypeScript 严格模式
- 遵循 React Hooks 最佳实践
- 组件使用函数式组件
- 使用 Tailwind CSS 进行样式设计

### 组件规范

- 组件文件使用 PascalCase 命名
- Props 使用 TypeScript 接口定义
- 使用 `forwardRef` 支持 ref 传递
- 支持 `className` prop 进行样式扩展

## 🚢 部署

### Vercel (推荐)

```bash
# 安装 Vercel CLI
npm i -g vercel

# 部署
vercel
```

### 其他平台

项目可以部署到任何支持 Next.js 的托管平台：

- Netlify
- Cloudflare Pages
- AWS Amplify
- Railway

## 📄 许可证

MIT License - 详见项目根目录的 LICENSE 文件

## 🤝 贡献

欢迎贡献代码！请查看项目的贡献指南。

## 📧 联系我们

- GitHub: [@jeasoncc/novel-editor](https://github.com/jeasoncc/novel-editor)
- Email: support@grain.app
