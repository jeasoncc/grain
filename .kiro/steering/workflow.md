# 工作流程

## Git 提交规范

每次完成任务后执行：

```bash
git add -A
git commit -m "feat/fix/refactor: 简短描述"
```

| 前缀 | 用途 |
|------|------|
| `feat:` | 新功能 |
| `fix:` | 修复 bug |
| `refactor:` | 重构 |
| `docs:` | 文档 |
| `test:` | 测试 |

## 优先使用成熟库

| ❌ 禁止 | ✅ 使用 |
|--------|--------|
| 手写 debounce | es-toolkit |
| 手写深拷贝 | es-toolkit |
| 手写日期格式化 | dayjs |
| 手写表单校验 | Zod |

## 知识沉淀

| 类型 | 存放位置 |
|------|----------|
| 架构决策 | `decisions.md` |
| 踩坑经验 | `troubleshooting.md` |
| 代码模式 | `code-standards.md` |
