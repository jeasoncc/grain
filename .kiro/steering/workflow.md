# 工作流程规范

## 任务完成后自动提交

每次完成一个任务后，必须执行 git commit：

```bash
git add -A
git commit -m "feat/fix/refactor: 简短描述变更内容"
```

### Commit Message 规范

- 使用**中文**描述
- 遵循 Conventional Commits 格式
- 常用前缀：
  - `feat:` 新功能
  - `fix:` 修复 bug
  - `refactor:` 重构代码
  - `docs:` 文档更新
  - `style:` 代码格式调整
  - `test:` 添加或修改测试
  - `chore:` 构建/工具相关

### 示例

```bash
git commit -m "feat: 添加画布导出功能"
git commit -m "fix: 修复文件树拖拽排序问题"
git commit -m "refactor: 重构节点解析函数为纯函数"
```

## 优先使用成熟库

新增功能时，**必须优先考虑是否有成熟的第三方库**，而不是手写实现。

### 检查清单

1. 先搜索是否有现成的 npm 包能解决问题
2. 评估库的质量：
   - GitHub stars / 下载量
   - 维护活跃度
   - TypeScript 支持
   - 包体积大小
3. 检查是否与项目现有技术栈兼容

### 项目已采用的库（优先使用）

| 场景 | 推荐库 |
|------|--------|
| 函数式编程 | fp-ts |
| 工具函数 | es-toolkit（替代 lodash） |
| 不可变数据 | Immer |
| 数据校验 | Zod |
| 时间处理 | dayjs |
| 虚拟列表 | @tanstack/react-virtual |
| 表单处理 | TanStack Form |
| 富文本编辑 | Lexical |
| 图表 | Mermaid, PlantUML |
| 画板 | Excalidraw |

### 禁止重复造轮子的场景

- ❌ 手写 debounce/throttle → ✅ 使用 es-toolkit
- ❌ 手写深拷贝 → ✅ 使用 es-toolkit 或 structuredClone
- ❌ 手写日期格式化 → ✅ 使用 dayjs
- ❌ 手写表单校验 → ✅ 使用 Zod
- ❌ 手写虚拟滚动 → ✅ 使用 @tanstack/react-virtual

### 何时可以手写

- 库的功能过于复杂，只需要很小的子集
- 库的包体积过大，影响性能
- 业务逻辑高度定制，无通用库可用
- 需要深度集成项目架构
