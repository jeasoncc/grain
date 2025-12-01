# 图标主题系统

## 概述

图标主题系统类似于 VSCode 的文件图标主题功能，允许用户自定义整个项目中不同文件类型的图标风格。

## 功能特性

### 1. 多种预设主题

系统提供了 6 种精心设计的图标主题：

- **默认图标** - Novel Editor 默认图标主题
- **极简图标** - 简洁统一的图标风格
- **经典图标** - 传统的文件图标风格
- **现代图标** - 现代化的图标设计
- **优雅图标** - 优雅精致的图标风格
- **作家图标** - 专为写作设计的图标主题

### 2. 支持的文件类型

每个图标主题都为以下文件类型提供了专门的图标：

- **项目** (Project) - 支持打开/关闭状态
- **章节** (Chapter) - 支持打开/关闭状态
- **场景** (Scene) - 单个场景文件
- **角色** (Character) - 角色信息文件
- **世界观** (World) - 世界观设定文件
- **文件夹** (Folder) - 支持打开/关闭状态
- **文件** (File) - 通用文件

### 3. 实时预览

在设置页面中，用户可以：
- 查看所有可用的图标主题
- 实时预览每个主题的图标效果
- 查看不同文件类型的图标展示
- 查看打开/关闭状态的图标变化

## 使用方法

### 在设置中选择图标主题

1. 打开应用设置
2. 进入 "外观设置" (Design) 页面
3. 滚动到 "文件图标主题" 部分
4. 点击任意主题卡片即可应用
5. 右侧预览区域会实时显示效果

### 在代码中使用图标

```typescript
import { getIconForType } from "@/lib/icon-themes";

// 获取项目图标（关闭状态）
const ProjectIcon = getIconForType("project", "default");

// 获取项目图标（打开状态）
const ProjectOpenIcon = getIconForType("project", "open");

// 获取场景图标
const SceneIcon = getIconForType("scene");

// 在组件中使用
<ProjectIcon className="size-5 text-muted-foreground" />
```

### 监听图标主题变化

```typescript
useEffect(() => {
  const handleThemeChange = () => {
    // 图标主题已更改，更新组件
    const newTheme = getCurrentIconTheme();
    // 处理主题变化...
  };

  window.addEventListener("icon-theme-changed", handleThemeChange);
  return () => {
    window.removeEventListener("icon-theme-changed", handleThemeChange);
  };
}, []);
```

## API 参考

### 核心函数

#### `getIconForType(type, state?)`

根据类型和状态获取图标组件。

**参数:**
- `type`: 文件类型 - `"project" | "chapter" | "scene" | "character" | "world" | "folder" | "file"`
- `state`: 状态（可选）- `"default" | "open"`，默认为 `"default"`

**返回:** `LucideIcon` - Lucide React 图标组件

#### `getCurrentIconTheme()`

获取当前应用的图标主题。

**返回:** `IconTheme` - 当前图标主题对象

#### `applyIconTheme(themeKey)`

应用指定的图标主题。

**参数:**
- `themeKey`: 主题键名 - `string`

#### `getAllIconThemes()`

获取所有可用的图标主题。

**返回:** `IconTheme[]` - 图标主题数组

#### `getIconThemeByKey(key)`

根据键名获取图标主题。

**参数:**
- `key`: 主题键名 - `string`

**返回:** `IconTheme | undefined` - 图标主题对象或 undefined

## 自定义图标主题

### 添加新主题

在 `apps/desktop/src/lib/icon-themes.ts` 中添加新主题：

```typescript
{
  key: "my-theme",
  name: "我的主题",
  description: "自定义图标主题",
  author: "Your Name",
  icons: {
    project: {
      default: MyProjectIcon,
      open: MyProjectOpenIcon,
    },
    chapter: {
      default: MyChapterIcon,
      open: MyChapterOpenIcon,
    },
    scene: {
      default: MySceneIcon,
    },
    character: {
      default: MyCharacterIcon,
    },
    world: {
      default: MyWorldIcon,
    },
    folder: {
      default: MyFolderIcon,
      open: MyFolderOpenIcon,
    },
    file: {
      default: MyFileIcon,
    },
  },
}
```

### 图标要求

- 使用 Lucide React 图标库中的图标
- 确保图标风格统一
- 为支持打开/关闭状态的类型提供两个图标
- 图标应该清晰易识别

## 存储机制

图标主题选择存储在浏览器的 `localStorage` 中：

- **键名:** `icon-theme`
- **值:** 主题的 `key` 字符串
- **默认值:** `"default"`

## 最佳实践

1. **保持一致性** - 在整个应用中使用 `getIconForType()` 函数获取图标
2. **响应变化** - 监听 `icon-theme-changed` 事件以响应主题变化
3. **提供反馈** - 在主题切换时提供视觉反馈
4. **测试兼容性** - 确保新主题在不同场景下都能正常显示

## 与主题系统的集成

图标主题系统与颜色主题系统独立运行，但可以协同工作：

- 图标主题控制图标的形状和风格
- 颜色主题控制图标的颜色（通过 CSS 类）
- 两者可以独立切换，提供更多自定义选项

## 未来扩展

可能的扩展方向：

1. 支持自定义图标上传
2. 支持图标颜色自定义
3. 支持更多文件类型
4. 支持图标动画效果
5. 支持从社区导入图标主题

## 技术细节

### 文件结构

```
apps/desktop/src/
├── lib/
│   └── icon-themes.ts          # 图标主题定义和核心函数
├── components/
│   └── icon-theme-preview.tsx  # 图标主题预览组件
└── routes/
    └── settings/
        └── design.tsx           # 设置页面（包含图标主题选择）
```

### 依赖

- `lucide-react` - 图标库
- `localStorage` - 主题持久化存储

## 故障排除

### 图标不显示

1. 检查是否正确导入了图标组件
2. 确认图标主题已正确加载
3. 检查浏览器控制台是否有错误

### 主题切换不生效

1. 清除浏览器缓存
2. 检查 localStorage 中的 `icon-theme` 值
3. 确认 `icon-theme-changed` 事件正确触发

### 自定义主题不显示

1. 确认主题已添加到 `iconThemes` 数组
2. 检查所有必需的图标是否已定义
3. 确认图标组件已正确导入

## 贡献指南

欢迎贡献新的图标主题！请确保：

1. 遵循现有的代码风格
2. 提供完整的图标集
3. 添加清晰的主题描述
4. 测试在不同场景下的显示效果
