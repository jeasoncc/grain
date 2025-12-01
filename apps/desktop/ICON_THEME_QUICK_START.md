# 图标主题系统 - 快速开始

## 🎨 什么是图标主题？

图标主题系统让你可以自定义整个项目中文件和文件夹的图标风格，就像 VSCode 的文件图标主题一样。

## ✨ 快速使用

### 1. 选择图标主题

1. 打开应用设置（点击左下角设置图标）
2. 进入 **外观设置** 页面
3. 滚动到 **文件图标主题** 部分
4. 点击任意主题卡片即可应用

### 2. 可用主题

| 主题名称 | 风格描述 | 适合场景 |
|---------|---------|---------|
| 默认图标 | 平衡的默认风格 | 日常使用 |
| 极简图标 | 简洁统一 | 喜欢简约风格 |
| 经典图标 | 传统文件风格 | 熟悉的体验 |
| 现代图标 | 现代化设计 | 追求新潮 |
| 优雅图标 | 精致优雅 | 注重美感 |
| 作家图标 | 写作专用 | 专业写作 |

### 3. 实时预览

在设置页面右侧，你可以看到：
- 当前主题的所有图标效果
- 不同文件类型的图标展示
- 打开/关闭状态的图标变化

## 🔧 开发者使用

### 在组件中使用图标

```typescript
import { getIconForType } from "@/lib/icon-themes";

function MyComponent() {
  // 获取图标组件
  const ProjectIcon = getIconForType("project");
  const ChapterIcon = getIconForType("chapter", "open");
  
  return (
    <div>
      <ProjectIcon className="size-5" />
      <ChapterIcon className="size-5" />
    </div>
  );
}
```

### 支持的文件类型

```typescript
// 所有可用的文件类型
type FileType = 
  | "project"    // 项目
  | "chapter"    // 章节
  | "scene"      // 场景
  | "character"  // 角色
  | "world"      // 世界观
  | "folder"     // 文件夹
  | "file"       // 文件

// 状态（部分类型支持）
type State = "default" | "open"
```

### 监听主题变化

```typescript
useEffect(() => {
  const handleChange = () => {
    // 主题已更改，更新 UI
  };
  
  window.addEventListener("icon-theme-changed", handleChange);
  return () => window.removeEventListener("icon-theme-changed", handleChange);
}, []);
```

## 💡 使用技巧

1. **选择合适的主题** - 根据个人喜好和使用场景选择
2. **保持一致性** - 在整个项目中使用统一的图标获取方式
3. **响应式设计** - 图标会自动适应当前的颜色主题
4. **性能优化** - 图标组件会被缓存，切换主题很快

## 🎯 常见场景

### 场景 1: 文件树组件

```typescript
function FileTree({ items }) {
  return items.map(item => {
    const Icon = getIconForType(
      item.type,
      item.isOpen ? "open" : "default"
    );
    
    return (
      <div key={item.id}>
        <Icon className="size-4" />
        <span>{item.name}</span>
      </div>
    );
  });
}
```

### 场景 2: 侧边栏导航

```typescript
function Sidebar() {
  const ProjectIcon = getIconForType("project");
  const ChapterIcon = getIconForType("chapter");
  
  return (
    <nav>
      <NavItem icon={ProjectIcon} label="项目" />
      <NavItem icon={ChapterIcon} label="章节" />
    </nav>
  );
}
```

### 场景 3: 动态图标

```typescript
function DynamicIcon({ type, isOpen }) {
  const Icon = getIconForType(
    type,
    isOpen ? "open" : "default"
  );
  
  return <Icon className="size-5 transition-all" />;
}
```

## 📚 更多信息

查看完整文档：[ICON_THEME_SYSTEM.md](./ICON_THEME_SYSTEM.md)

## 🐛 问题反馈

如果遇到问题，请检查：
1. 图标是否正确导入
2. 文件类型名称是否正确
3. 浏览器控制台是否有错误信息

## 🚀 下一步

- 尝试不同的图标主题
- 在你的组件中使用图标
- 根据需要自定义图标主题
