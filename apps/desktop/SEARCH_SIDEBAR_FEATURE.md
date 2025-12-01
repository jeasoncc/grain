# 全局搜索侧边栏功能

## 🎉 新功能

添加了类似 VSCode 的全局搜索侧边栏，提供更强大和直观的搜索体验。

## ✨ 功能特性

### 1. 侧边栏搜索面板
- 📌 固定在左侧的搜索面板
- 🔍 实时搜索，300ms 防抖
- 📊 结果按类型分组显示
- 🎯 支持过滤搜索范围

### 2. 搜索功能
- **实时搜索**: 输入即搜索，无需按回车
- **类型过滤**: 可选择搜索场景、角色、世界观
- **结果分组**: 按类型折叠/展开显示
- **高亮显示**: 匹配的关键词高亮显示
- **结果统计**: 显示找到的结果数量

### 3. 用户界面
- **清晰的布局**: 搜索框、过滤器、结果列表
- **可折叠分组**: 每个类型可以独立折叠
- **详细信息**: 显示项目、章节、摘要
- **快速导航**: 点击结果直接跳转

## 🎯 使用方法

### 打开搜索侧边栏
1. **点击按钮**: 点击 ActivityBar 的搜索图标（🔍）
2. **快捷键**: 按 `Ctrl+Shift+F` (Mac: `Cmd+Shift+F`)
3. **再次点击**: 关闭搜索侧边栏

### 搜索操作
1. 在搜索框输入关键词
2. 等待搜索结果（自动搜索）
3. 查看按类型分组的结果
4. 点击结果跳转到对应位置

### 过滤搜索范围
1. 点击右上角的过滤器图标（🔧）
2. 勾选/取消勾选要搜索的类型
3. 搜索结果自动更新

## 📐 界面布局

```
┌─────┬──────────┬──────────────┬───────────────────┐
│     │          │              │                   │
│  A  │  书库    │   搜索面板   │   主内容区域      │
│  c  │  侧边栏  │              │                   │
│  t  │          │  [搜索框]    │                   │
│  i  │  - 书1   │              │                   │
│  v  │  - 书2   │  场景 (5)    │                   │
│  i  │          │  ├─ 场景1    │                   │
│  t  │          │  ├─ 场景2    │                   │
│  y  │          │  └─ ...      │                   │
│     │          │              │                   │
│  B  │          │  角色 (3)    │                   │
│  a  │          │  ├─ 主角     │                   │
│  r  │          │  └─ ...      │                   │
│     │          │              │                   │
└─────┴──────────┴──────────────┴───────────────────┘
```

## 🔧 技术实现

### 核心组件

#### `SearchSidebar`
```typescript
export function SearchSidebar() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [selectedTypes, setSelectedTypes] = useState<SearchResultType[]>([
    "scene",
    "role",
    "world",
  ]);
  
  // 实时搜索
  useEffect(() => {
    const timer = setTimeout(() => {
      performSearch(query);
    }, 300);
    return () => clearTimeout(timer);
  }, [query, performSearch]);
  
  // ...
}
```

#### `ResultGroup`
```typescript
function ResultGroup({
  type,
  results,
  query,
  onSelect,
  highlightText,
}: ResultGroupProps) {
  const [isOpen, setIsOpen] = useState(true);
  
  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger>
        {typeLabels[type]} ({results.length})
      </CollapsibleTrigger>
      <CollapsibleContent>
        {results.map((result) => (
          <ResultItem key={result.id} result={result} />
        ))}
      </CollapsibleContent>
    </Collapsible>
  );
}
```

### 状态管理

```typescript
// 根组件中
const [searchSidebarOpen, setSearchSidebarOpen] = useState(false);

// 监听自定义事件
window.addEventListener("toggle-search-sidebar", handleToggleSearchSidebar);

// ActivityBar 中触发
onClick={() => window.dispatchEvent(new Event("toggle-search-sidebar"))}
```

### 搜索逻辑

```typescript
const performSearch = useCallback(
  async (searchQuery: string) => {
    if (!searchQuery.trim()) {
      setResults([]);
      return;
    }

    setLoading(true);
    try {
      const searchResults = await searchEngine.simpleSearch(searchQuery, {
        types: selectedTypes,
        limit: 100,
      });
      setResults(searchResults);
    } catch (error) {
      console.error("搜索失败:", error);
      setResults([]);
    } finally {
      setLoading(false);
    }
  },
  [selectedTypes],
);
```

## 💡 使用场景

### 场景 1: 查找角色出场
```
1. 打开搜索侧边栏
2. 输入角色名 "张三"
3. 查看所有提到该角色的场景
4. 点击场景跳转查看
```

### 场景 2: 搜索情节线索
```
1. 输入关键词 "魔法石"
2. 查看所有相关场景
3. 按章节顺序检查情节连贯性
```

### 场景 3: 查找世界观设定
```
1. 点击过滤器，只选择"世界观"
2. 输入 "魔法系统"
3. 查看所有相关设定
```

### 场景 4: 全局内容审查
```
1. 输入敏感词或需要修改的内容
2. 查看所有匹配位置
3. 逐个检查和修改
```

## 🆚 与对话框搜索的对比

| 特性 | 对话框搜索 | 侧边栏搜索 |
|------|-----------|-----------|
| 显示方式 | 弹出对话框 | 固定侧边栏 |
| 空间占用 | 覆盖内容 | 并排显示 |
| 结果展示 | 列表 | 分组折叠 |
| 过滤功能 | 无 | 有 |
| 适用场景 | 快速查找 | 深度搜索 |

## 🎨 UI/UX 设计

### 颜色方案
- **场景**: 蓝色 (text-blue-500)
- **角色**: 橙色 (text-orange-500)
- **世界观**: 青色 (text-cyan-500)

### 交互设计
- **悬停效果**: 结果项悬停时背景变化
- **折叠动画**: 分组展开/折叠有平滑动画
- **高亮显示**: 匹配文本黄色高亮

### 响应式
- **固定宽度**: 320px (w-80)
- **自适应高度**: 占满屏幕高度
- **滚动区域**: 结果列表可滚动

## 📊 性能优化

### 1. 防抖搜索
```typescript
useEffect(() => {
  const timer = setTimeout(() => {
    performSearch(query);
  }, 300);
  return () => clearTimeout(timer);
}, [query, performSearch]);
```

### 2. 结果限制
- 默认限制 100 个结果
- 避免渲染过多 DOM 节点

### 3. 按需加载
- 使用 Collapsible 组件
- 折叠的分组不渲染内容

## 🚀 未来改进

### 短期计划
- [ ] 添加搜索历史
- [ ] 支持正则表达式搜索
- [ ] 添加替换功能
- [ ] 支持导出搜索结果

### 中期计划
- [ ] 支持高级过滤（日期、标签）
- [ ] 添加搜索结果排序
- [ ] 支持保存搜索查询
- [ ] 添加搜索统计

### 长期计划
- [ ] AI 辅助搜索
- [ ] 语义搜索
- [ ] 跨项目搜索
- [ ] 搜索结果可视化

## ⚠️ 注意事项

### 1. 性能考虑
- 大量结果可能影响性能
- 建议使用过滤器缩小范围

### 2. 搜索范围
- 只搜索已保存的内容
- 未保存的修改不会被搜索到

### 3. 结果准确性
- 使用简单搜索算法
- 可能有遗漏或误匹配

## 🐛 故障排除

### 问题 1: 搜索很慢
**原因**: 数据量大或索引未构建
**解决**: 等待索引构建完成，或使用过滤器

### 问题 2: 找不到结果
**原因**: 内容未保存或搜索词不匹配
**解决**: 确保内容已保存，尝试不同的关键词

### 问题 3: 侧边栏不显示
**原因**: 状态管理问题
**解决**: 刷新页面或重新点击搜索按钮

## 📚 相关文档

- [搜索服务](./src/services/search.ts)
- [搜索侧边栏组件](./src/components/search-sidebar.tsx)
- [全局搜索对话框](./src/components/blocks/global-search.tsx)

## 🎉 总结

全局搜索侧边栏提供了一个强大而直观的搜索体验：

1. ✅ **固定显示** - 不遮挡内容，方便对比
2. ✅ **分组展示** - 结果清晰，易于浏览
3. ✅ **过滤功能** - 精确控制搜索范围
4. ✅ **实时搜索** - 即时反馈，快速定位

现在你可以通过 ActivityBar 的搜索按钮或 `Ctrl+Shift+F` 快捷键打开搜索侧边栏了！
