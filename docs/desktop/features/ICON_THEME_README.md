# 🎨 图标主题系统

> 类似 VSCode 的文件图标主题功能，让你的工作区更具个性！

## 🚀 快速开始

### 用户使用

1. 打开应用设置
2. 进入 **外观设置 (Appearance)** 页面
3. 滚动到 **文件图标主题** 部分
4. 点击任意主题卡片即可应用
5. 右侧预览区域会实时显示效果

### 开发者使用

```typescript
import { getIconForType } from "@/lib/icon-themes";

// 获取图标
const ProjectIcon = getIconForType("project");
const ChapterIcon = getIconForType("chapter", "open");

// 使用图标
<ProjectIcon className="size-5" />
<ChapterIcon className="size-5" />
```

## 📚 文档导航

| 文档 | 说明 | 适合人群 |
|-----|------|---------|
| [快速开始](./ICON_THEME_QUICK_START.md) | 5 分钟上手指南 | 所有用户 |
| [完整文档](./ICON_THEME_SYSTEM.md) | 详细的系统文档 | 开发者 |
| [功能总结](./ICON_THEME_FEATURE_SUMMARY.md) | 功能实现总结 | 项目管理者 |

## 🎨 可用主题

| 主题 | 风格 | 特点 |
|-----|------|------|
| 默认图标 | 平衡 | 日常使用的最佳选择 |
| 极简图标 | 简约 | 统一的简洁风格 |
| 经典图标 | 传统 | 熟悉的文件图标 |
| 现代图标 | 现代 | 时尚的设计语言 |
| 优雅图标 | 精致 | 注重美感和细节 |
| 作家图标 | 专业 | 专为写作优化 |

## 📦 支持的文件类型

- 📖 **项目** (Project) - 支持打开/关闭状态
- 📁 **章节** (Chapter) - 支持打开/关闭状态
- 📄 **场景** (Scene) - 单个场景文件
- 👤 **角色** (Character) - 角色信息文件
- 🌍 **世界观** (World) - 世界观设定文件
- 📂 **文件夹** (Folder) - 支持打开/关闭状态
- 📃 **文件** (File) - 通用文件

## 💡 核心功能

- ✅ 6 种精心设计的图标主题
- ✅ 实时预览和切换
- ✅ 支持打开/关闭状态
- ✅ 主题持久化存储
- ✅ 完整的 TypeScript 支持
- ✅ 响应式设计
- ✅ 事件驱动架构

## 🔧 API 参考

### 获取图标

```typescript
getIconForType(
  type: "project" | "chapter" | "scene" | "character" | "world" | "folder" | "file",
  state?: "default" | "open"
): LucideIcon
```

### 获取当前主题

```typescript
getCurrentIconTheme(): IconTheme
```

### 应用主题

```typescript
applyIconTheme(themeKey: string): void
```

### 监听主题变化

```typescript
window.addEventListener("icon-theme-changed", () => {
  // 主题已更改
});
```

## 📖 使用示例

### 示例 1: 文件树

```typescript
function FileTree({ items }) {
  return items.map(item => {
    const Icon = getIconForType(
      item.type,
      item.isOpen ? "open" : "default"
    );
    
    return (
      <div>
        <Icon className="size-4" />
        <span>{item.name}</span>
      </div>
    );
  });
}
```

### 示例 2: 动态图标

```typescript
function DynamicIcon({ type, isOpen }) {
  const Icon = getIconForType(type, isOpen ? "open" : "default");
  return <Icon className="size-5" />;
}
```

### 示例 3: 响应主题变化

```typescript
function MyComponent() {
  const [theme, setTheme] = useState(getCurrentIconTheme());
  
  useEffect(() => {
    const handler = () => setTheme(getCurrentIconTheme());
    window.addEventListener("icon-theme-changed", handler);
    return () => window.removeEventListener("icon-theme-changed", handler);
  }, []);
  
  return <div>当前主题: {theme.name}</div>;
}
```

## 🎯 最佳实践

1. **统一使用 API** - 始终通过 `getIconForType()` 获取图标
2. **监听变化** - 在需要响应主题变化的组件中添加事件监听
3. **提供反馈** - 主题切换时给用户明确的视觉反馈
4. **保持一致** - 在整个应用中使用统一的图标风格

## 🐛 故障排除

### 图标不显示

- 检查是否正确导入了 `getIconForType`
- 确认文件类型名称是否正确
- 查看浏览器控制台是否有错误

### 主题切换不生效

- 清除浏览器缓存
- 检查 localStorage 中的 `icon-theme` 值
- 确认事件监听器是否正确设置

## 📁 文件结构

```
apps/desktop/
├── src/
│   ├── lib/
│   │   └── icon-themes.ts              # 核心系统
│   ├── components/
│   │   ├── icon-theme-preview.tsx      # 预览组件
│   │   └── icon-theme-example.tsx      # 示例组件
│   └── routes/
│       └── settings/
│           └── design.tsx               # 设置页面
└── docs/
    ├── ICON_THEME_SYSTEM.md             # 完整文档
    ├── ICON_THEME_QUICK_START.md        # 快速指南
    └── ICON_THEME_FEATURE_SUMMARY.md    # 功能总结
```

## 🚀 未来计划

- [ ] 更多预设主题
- [ ] 图标颜色自定义
- [ ] 主题市场
- [ ] 自定义图标上传
- [ ] 图标动画效果

## 🤝 贡献

欢迎贡献新的图标主题！请确保：

1. 遵循现有的代码风格
2. 提供完整的图标集
3. 添加清晰的主题描述
4. 测试在不同场景下的显示效果

## 📄 许可证

本项目遵循项目主许可证。

## 🙏 致谢

- [Lucide Icons](https://lucide.dev/) - 提供优质的图标库
- VSCode - 图标主题系统的灵感来源

---

**享受个性化的工作区体验！** 🎉
