# 图标系统指南

## 🎨 功能概述

Novel Editor 提供了一个完整的图标配置和选择系统，允许用户为项目、章节、场景等选择个性化的图标。

## ✨ 功能特性

### 1. 丰富的图标库
- **50+ 个图标**: 涵盖各种类型和风格
- **7 个分类**: 书籍、写作、文件、文件夹、特殊、形状、符号
- **清晰的描述**: 每个图标都有名称和描述

### 2. 图标选择器
- **分类浏览**: 按类别浏览图标
- **搜索功能**: 快速搜索图标
- **实时预览**: 选择前预览图标效果
- **响应式设计**: 适配不同屏幕尺寸

### 3. 易于集成
- **简单的 API**: 易于在项目中使用
- **TypeScript 支持**: 完整的类型定义
- **组件化设计**: 可复用的组件

## 📚 图标分类

### 1. 书籍类 (7 个)
- 📖 **书籍** - 标准书籍图标
- 📖 **打开的书** - 展开的书籍
- 📑 **书签书籍** - 带书签的书
- 📄 **文本书籍** - 带文字的书
- 📚 **图书馆** - 图书馆/书架
- 📓 **笔记本** - 笔记本
- 📜 **卷轴** - 古典卷轴

### 2. 写作类 (6 个)
- 🪶 **羽毛笔** - 经典羽毛笔
- 🖊️ **钢笔** - 钢笔
- 🖌️ **绘图笔** - 绘图工具
- ✏️ **编辑** - 编辑图标
- ✏️ **编辑3** - 编辑图标变体
- ✏️ **铅笔** - 铅笔

### 3. 文件类 (3 个)
- 📄 **文本文件** - 文本文档
- 📄 **文件** - 通用文件
- 📁 **多个文件** - 文件集合

### 4. 文件夹类 (3 个)
- 📁 **文件夹** - 标准文件夹
- 📂 **打开的文件夹** - 展开的文件夹
- 🗂️ **文件夹树** - 文件夹结构

### 5. 特殊标记类 (12 个)
- ✨ **闪光** - 特殊/精选
- ⭐ **星星** - 收藏/重要
- ❤️ **心形** - 喜爱
- 🔥 **火焰** - 热门/火热
- ⚡ **闪电** - 快速/能量
- 👑 **皇冠** - 王者/顶级
- 🏅 **奖章** - 成就
- 🏆 **奖杯** - 胜利
- 🎯 **目标** - 目标/焦点
- 🚩 **旗帜** - 标记/里程碑
- 🔖 **书签** - 书签
- 🏷️ **标签** - 标签

### 6. 形状类 (7 个)
- ⭕ **圆形** - 圆形
- ⬜ **方形** - 方形
- 🔺 **三角形** - 三角形
- 💎 **菱形** - 菱形
- ⬡ **六边形** - 六边形
- ⬢ **八边形** - 八边形
- ⬟ **五边形** - 五边形

### 7. 符号类 (2 个)
- # **井号** - 标签符号
- @ **@符号** - @符号

## 🎯 使用方法

### 1. 基本使用

#### 导入图标系统
```typescript
import { icons, getIconByKey, getDefaultIcon } from "@/lib/icons";
import { IconPicker, IconDisplay, IconSelectButton } from "@/components/icon-picker";
```

#### 显示图标
```tsx
// 显示特定图标
<IconDisplay iconKey="book" size="default" />

// 显示不同大小
<IconDisplay iconKey="star" size="sm" />
<IconDisplay iconKey="heart" size="lg" />
```

#### 图标选择按钮
```tsx
<IconSelectButton
  iconKey={selectedIcon}
  onSelect={(icon) => setSelectedIcon(icon.key)}
  size="default"
/>
```

#### 完整的图标选择器
```tsx
const [open, setOpen] = useState(false);
const [selectedIcon, setSelectedIcon] = useState("book");

<IconPicker
  open={open}
  onOpenChange={setOpen}
  onSelect={(icon) => setSelectedIcon(icon.key)}
  selectedIcon={selectedIcon}
/>
```

### 2. 在项目中使用

#### 创建项目时选择图标
```tsx
function CreateProjectDialog() {
  const [iconKey, setIconKey] = useState("book");

  return (
    <Dialog>
      <DialogContent>
        <div className="flex items-center gap-4">
          <IconSelectButton
            iconKey={iconKey}
            onSelect={(icon) => setIconKey(icon.key)}
          />
          <Input placeholder="项目名称" />
        </div>
      </DialogContent>
    </Dialog>
  );
}
```

#### 在列表中显示图标
```tsx
function ProjectList({ projects }) {
  return (
    <div>
      {projects.map((project) => (
        <div key={project.id} className="flex items-center gap-2">
          <IconDisplay iconKey={project.iconKey} />
          <span>{project.title}</span>
        </div>
      ))}
    </div>
  );
}
```

### 3. 高级用法

#### 搜索图标
```typescript
import { searchIcons } from "@/lib/icons";

const results = searchIcons("书");
// 返回所有名称或描述包含"书"的图标
```

#### 按类别获取图标
```typescript
import { getIconsByCategory } from "@/lib/icons";

const bookIcons = getIconsByCategory("book");
// 返回所有书籍类图标
```

#### 获取默认图标
```typescript
import { getDefaultIcon } from "@/lib/icons";

const projectIcon = getDefaultIcon("project"); // 返回 "book"
const chapterIcon = getDefaultIcon("chapter"); // 返回 "folder"
const sceneIcon = getDefaultIcon("scene");     // 返回 "file-text"
```

## 🔧 API 参考

### IconOption 接口
```typescript
interface IconOption {
  key: string;           // 唯一标识
  name: string;          // 显示名称
  icon: LucideIcon;      // Lucide 图标组件
  category: IconCategory; // 所属分类
  description?: string;  // 描述（可选）
}
```

### IconCategory 类型
```typescript
type IconCategory =
  | "book"      // 书籍
  | "writing"   // 写作
  | "file"      // 文件
  | "folder"    // 文件夹
  | "special"   // 特殊
  | "shape"     // 形状
  | "symbol";   // 符号
```

### 组件 Props

#### IconPicker
```typescript
interface IconPickerProps {
  open: boolean;                    // 是否打开
  onOpenChange: (open: boolean) => void; // 打开状态改变回调
  onSelect: (icon: IconOption) => void;  // 选择图标回调
  selectedIcon?: string;            // 当前选中的图标 key
}
```

#### IconDisplay
```typescript
interface IconDisplayProps {
  iconKey?: string;                 // 图标 key
  size?: "sm" | "default" | "lg";  // 大小
  className?: string;               // 自定义类名
}
```

#### IconSelectButton
```typescript
interface IconSelectButtonProps {
  iconKey?: string;                 // 当前图标 key
  onSelect: (icon: IconOption) => void; // 选择回调
  size?: "sm" | "default" | "lg";  // 大小
}
```

### 工具函数

#### getIconByKey
```typescript
function getIconByKey(key: string): IconOption | undefined
```
根据 key 获取图标对象。

#### getIconsByCategory
```typescript
function getIconsByCategory(category: IconCategory): IconOption[]
```
获取指定分类的所有图标。

#### getAllCategories
```typescript
function getAllCategories(): IconCategory[]
```
获取所有图标分类。

#### getDefaultIcon
```typescript
function getDefaultIcon(type: "project" | "chapter" | "scene"): IconOption
```
获取指定类型的默认图标。

#### searchIcons
```typescript
function searchIcons(query: string): IconOption[]
```
搜索图标（按名称、key 或描述）。

## 💡 使用场景

### 场景 1: 项目分类
```
使用不同图标区分项目类型：
- 📖 小说项目
- 📓 笔记项目
- 📜 剧本项目
- ⭐ 重要项目
```

### 场景 2: 章节标记
```
使用图标标记章节状态：
- ✅ 已完成章节
- ✏️ 正在写作
- 🚩 重要章节
- ⭐ 精彩章节
```

### 场景 3: 场景分类
```
使用图标区分场景类型：
- 💬 对话场景
- ⚔️ 动作场景
- ❤️ 情感场景
- 🎯 关键场景
```

### 场景 4: 个性化
```
让用户自由选择喜欢的图标：
- 🎨 个性化项目
- 🌟 独特标识
- 🎭 主题风格
```

## 🎨 设计原则

### 1. 简洁明了
- 图标清晰易识别
- 名称简短准确
- 描述清楚明白

### 2. 分类合理
- 按功能分类
- 易于查找
- 逻辑清晰

### 3. 易于使用
- 简单的 API
- 直观的界面
- 快速的搜索

### 4. 可扩展性
- 易于添加新图标
- 支持自定义分类
- 灵活的配置

## 🚀 未来计划

### 短期
- [ ] 添加更多图标
- [ ] 支持图标颜色自定义
- [ ] 添加图标收藏功能

### 中期
- [ ] 支持自定义图标上传
- [ ] 图标动画效果
- [ ] 图标组合功能

### 长期
- [ ] 图标市场
- [ ] 社区图标分享
- [ ] AI 推荐图标

## 📊 技术细节

### 图标来源
- 使用 **Lucide Icons** 图标库
- 高质量 SVG 图标
- 完全开源免费

### 性能优化
- 按需加载图标
- 图标组件缓存
- 搜索结果缓存

### 类型安全
- 完整的 TypeScript 类型
- 严格的类型检查
- 智能代码提示

## 🎉 总结

图标系统为 Novel Editor 提供了丰富的视觉表达方式：

- ✅ **50+ 个图标** - 涵盖各种场景
- ✅ **7 个分类** - 清晰的组织结构
- ✅ **搜索功能** - 快速找到需要的图标
- ✅ **易于使用** - 简单的 API 和组件
- ✅ **完全类型安全** - TypeScript 支持

让你的项目更加个性化和易于识别！🎨
