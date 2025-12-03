# 角色提及 Wiki 功能

## 🎉 功能概述

成功实现了角色提及（Mention）功能，允许在编辑器中通过 @ 符号快速引用角色，并在悬停时显示角色的 Wiki 信息。

## ✅ 已完成的功能

### 1. @ 自动补全

**功能**：
- 输入 `@` 符号时自动弹出角色列表
- 支持模糊搜索角色名称
- 显示角色名称和身份标签
- 最多显示 5 个建议

**使用方法**：
1. 在编辑器中输入 `@`
2. 输入角色名称的部分字符
3. 从下拉列表中选择角色
4. 角色名称会以高亮形式插入

### 2. 角色悬停提示

**功能**：
- 鼠标悬停在角色名称上显示 Wiki 卡片
- 显示角色的详细信息
- 美观的卡片设计

**显示信息**：
- 角色名称
- 身份标签
- 别名
- 基本设定
- 关系
- 创建时间

### 3. 视觉样式

**角色提及样式**：
- 浅蓝色背景
- 蓝色文字
- 圆角边框
- 悬停时背景加深

## 📁 文件结构

```
apps/desktop/src/
├── components/
│   └── editor/
│       ├── nodes/
│       │   └── mention-node.tsx           # 角色提及节点
│       └── plugins/
│           ├── mentions-plugin.tsx        # @ 自动补全插件
│           └── mention-tooltip-plugin.tsx # 悬停提示插件
├── styles.css                             # 样式文件（已更新）
└── components/blocks/rich-editor/
    ├── nodes.ts                           # 节点配置（已包含）
    └── plugins.tsx                        # 插件配置（已更新）
```

## 🎨 使用示例

### 在编辑器中使用

```
正在写作...

主角@张三走进了房间，看到了@李四。

（输入 @ 后会弹出角色列表）
```

### 悬停效果

当鼠标悬停在 `@张三` 上时，会显示：

```
┌─────────────────────────────┐
│ 👤 张三                     │
├─────────────────────────────┤
│ 🏷️ 身份                    │
│ [主角] [侦探]               │
│                             │
│ ℹ️ 别名                     │
│ 阿三, 三哥                  │
│                             │
│ ─────────────────────       │
│ 一个经验丰富的侦探...       │
│                             │
│ 👤 关系                     │
│ 李四的搭档                  │
│                             │
│ 📅 创建于 2024-12-02        │
└─────────────────────────────┘
```

## 🔧 技术实现

### 1. MentionNode

**功能**：
- 自定义 Lexical 节点
- 存储角色名称和 ID
- 支持序列化和反序列化
- 导出为 HTML

**关键方法**：
```typescript
$createMentionNode(mentionName: string, roleId: string): MentionNode
$isMentionNode(node: LexicalNode): boolean
```

### 2. MentionsPlugin

**功能**：
- 监听 @ 输入
- 显示角色列表
- 处理选择逻辑
- 插入提及节点

**关键特性**：
- 使用 `LexicalTypeaheadMenuPlugin`
- 支持键盘导航
- 支持鼠标选择
- 自动关闭菜单

### 3. MentionTooltipPlugin

**功能**：
- 监听鼠标悬停事件
- 获取角色数据
- 显示 Wiki 卡片
- 处理位置计算

**关键特性**：
- 使用 Portal 渲染
- 动态位置计算
- 平滑动画效果
- 自动隐藏

## 🎯 数据流

```
用户输入 @
  ↓
MentionsPlugin 检测触发
  ↓
查询当前项目的角色列表
  ↓
显示角色下拉菜单
  ↓
用户选择角色
  ↓
创建 MentionNode
  ↓
插入到编辑器
  ↓
渲染为高亮文本
  ↓
鼠标悬停
  ↓
MentionTooltipPlugin 检测
  ↓
从数据库获取角色详情
  ↓
显示 Wiki 卡片
```

## 💡 使用场景

### 1. 写作时快速引用角色

```
在第一章中，@主角遇到了@反派。
```

### 2. 查看角色信息

悬停在角色名称上即可查看详细信息，无需离开编辑器。

### 3. 保持角色一致性

通过提及功能，确保角色名称的一致性，避免拼写错误。

## 🌟 特色功能

### 1. 智能搜索

- 支持拼音首字母搜索
- 支持部分匹配
- 实时过滤结果

### 2. 美观的 UI

- 现代化的卡片设计
- 平滑的动画效果
- 响应式布局

### 3. 完整的信息展示

- 身份标签（Badge）
- 别名列表
- 基本设定
- 关系网络
- 创建时间

## 📊 样式说明

### 提及节点样式

```css
.mention {
  display: inline-block;
  padding: 2px 4px;
  margin: 0 2px;
  border-radius: 4px;
  background: rgba(59, 130, 246, 0.1);
  color: rgb(59, 130, 246);
  font-weight: 500;
  cursor: pointer;
  transition: colors;
}

.mention:hover {
  background: rgba(59, 130, 246, 0.2);
}
```

### Wiki 卡片样式

- 宽度：320px
- 阴影：大阴影
- 边框：2px
- 动画：淡入 + 缩放

## 🚀 扩展建议

### 短期

- [ ] 支持角色头像显示
- [ ] 支持点击跳转到角色详情页
- [ ] 支持角色关系图谱
- [ ] 支持角色出场统计

### 中期

- [ ] 支持 @ 提及场景
- [ ] 支持 @ 提及地点
- [ ] 支持自定义提及样式
- [ ] 支持提及历史记录

### 长期

- [ ] AI 推荐相关角色
- [ ] 角色关系可视化
- [ ] 角色时间线
- [ ] 角色对话统计

## 🐛 故障排除

### 提及菜单不显示

1. 检查是否有角色数据
2. 确认当前项目已选中
3. 检查控制台错误

### 悬停提示不显示

1. 检查角色 ID 是否正确
2. 确认角色数据存在
3. 检查样式是否加载

### 样式异常

1. 清除浏览器缓存
2. 检查 styles.css 是否加载
3. 检查 Tailwind 配置

## 📝 API 参考

### 创建提及节点

```typescript
import { $createMentionNode } from "@/components/editor/nodes/mention-node";

const mentionNode = $createMentionNode("张三", "role-id-123");
```

### 检查是否为提及节点

```typescript
import { $isMentionNode } from "@/components/editor/nodes/mention-node";

if ($isMentionNode(node)) {
  const roleId = node.getRoleId();
  const name = node.getMentionName();
}
```

### 获取角色数据

```typescript
import { db } from "@/db/curd";

const role = await db.getRole(roleId);
```

## 🎓 学习资源

- [Lexical 文档](https://lexical.dev/)
- [Typeahead 插件](https://lexical.dev/docs/react/plugins#lexicaltypeaheadmenuplugin)
- [自定义节点](https://lexical.dev/docs/concepts/nodes)

## 🎉 总结

成功实现了完整的角色提及 Wiki 功能：

- ✅ @ 自动补全
- ✅ 角色列表显示
- ✅ 悬停 Wiki 提示
- ✅ 美观的 UI 设计
- ✅ 完整的信息展示
- ✅ 平滑的动画效果

用户现在可以在编辑器中轻松引用角色，并快速查看角色信息，大大提升了写作体验！

---

**实现时间**: 2024-12-02  
**版本**: 1.0.0  
**状态**: ✅ 完成
