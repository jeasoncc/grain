# 搜索功能更新日志

## [新增] 搜索和替换功能 - 2024-12-01

### 🎉 新功能

#### 当前文件搜索替换
- ✨ 添加了完整的编辑器内搜索替换功能
- 🔍 支持实时搜索和高亮显示
- 🔄 支持单个替换和批量替换
- ⌨️ 快捷键支持：`Ctrl/Cmd+F` (搜索), `Ctrl/Cmd+H` (替换)

#### 搜索选项
- 🔤 区分大小写匹配
- 📖 全字匹配模式
- 🔧 正则表达式支持
- 🎯 智能匹配计数和导航

#### 用户体验
- 💫 流畅的键盘导航（Enter/Shift+Enter）
- 📍 自动滚动到匹配位置
- 🎨 清晰的视觉反馈和高亮
- 🌓 深色模式完美支持

### 📝 文档

新增以下文档：
- `SEARCH_REPLACE_GUIDE.md` - 完整使用指南
- `docs/SEARCH_QUICK_REFERENCE.md` - 快速参考卡片
- `docs/SEARCH_GETTING_STARTED.md` - 快速上手指南
- `SEARCH_FEATURE_SUMMARY.md` - 功能实现总结

### 🔧 技术改进

#### 代码质量
- ✅ 完整的 TypeScript 类型定义
- ✅ 通过所有 lint 检查
- ✅ 无类型错误
- ✅ 遵循最佳实践

#### 性能优化
- ⚡ 防抖搜索（300ms）
- 🚀 useCallback 优化
- 💾 高效的文本节点遍历
- 🎯 智能的批量替换算法

#### 架构设计
- 🏗️ 插件化架构
- 🔌 与 Lexical 编辑器深度集成
- 🎨 使用 shadcn/ui 组件
- ♿ 无障碍支持

### 📦 新增文件

#### 核心功能
- `src/components/editor/plugins/search-replace-plugin.tsx` - 搜索替换插件

#### 备用实现
- `src/components/global-search-dialog.tsx` - 全局搜索对话框
- `src/components/global-search-provider.tsx` - 全局搜索提供者

#### 测试
- `src/components/editor/plugins/__tests__/search-replace.test.md` - 测试清单

### 🔄 修改的文件

- `src/components/blocks/rich-editor/plugins.tsx` - 集成搜索替换插件
- `README.md` - 更新功能说明（英文）
- `README.zh-CN.md` - 更新功能说明（中文）

### 🎯 使用方法

#### 基本搜索
```
1. 在编辑器中按 Ctrl+F (Mac: Cmd+F)
2. 输入搜索词
3. 使用 Enter/Shift+Enter 或 ↑↓ 按钮导航
4. 按 Esc 关闭
```

#### 替换文本
```
1. 在编辑器中按 Ctrl+H (Mac: Cmd+H)
2. 输入搜索词和替换词
3. 点击"替换"或"全部替换"
4. 使用 Ctrl+Z 撤销（如需要）
```

#### 全局搜索
```
1. 按 Ctrl+Shift+F (Mac: Cmd+Shift+F)
2. 输入关键词
3. 浏览搜索结果
4. 点击结果跳转到对应位置
```

### 💡 使用技巧

1. **批量修改角色名**
   - 使用全局搜索查看所有出现位置
   - 在每个场景中使用替换功能

2. **查找情节线索**
   - 使用全局搜索找到所有相关场景
   - 按时间顺序检查连贯性

3. **正则表达式高级搜索**
   - 开启正则表达式选项
   - 使用 `\d{4}年` 查找所有年份
   - 使用 `第\d+章` 查找章节标题

### ⚠️ 注意事项

1. 首次全局搜索会构建索引，需要几秒钟
2. 替换操作可以用 Ctrl+Z 撤销
3. 正则表达式错误会在控制台显示
4. 建议重要操作前先备份

### 🐛 已知问题

无

### 🚀 未来计划

- [ ] 搜索历史记录
- [ ] 保存常用搜索
- [ ] 跨文件批量替换
- [ ] 高级过滤（按日期、标签）
- [ ] 搜索结果导出
- [ ] AI 辅助搜索

### 📊 统计

- 新增代码：~800 行
- 新增文件：8 个
- 修改文件：3 个
- 文档页数：4 个
- 开发时间：~2 小时

### 🙏 致谢

感谢所有测试和反馈的用户！

---

## 相关链接

- [完整使用指南](./SEARCH_REPLACE_GUIDE.md)
- [快速参考](./docs/SEARCH_QUICK_REFERENCE.md)
- [快速上手](./docs/SEARCH_GETTING_STARTED.md)
- [功能总结](./SEARCH_FEATURE_SUMMARY.md)
