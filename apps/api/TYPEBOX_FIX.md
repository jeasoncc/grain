# TypeBox 版本冲突修复

## 问题
`SyntaxError: export 'TypeSystemPolicy' not found in '@sinclair/typebox/system'`

## 当前依赖约束

Elysia 1.4 使用 TypeBox 0.34。API workspace 直接声明 `@sinclair/typebox`，
根 `overrides` 将所有消费者统一到 `^0.34.52`；不要继续使用 0.27/0.32
或降级到 Elysia 1.1，也不要保留 workspace 局部 `resolutions`。

从仓库根目录使用 Bun 1.4.2 的唯一锁文件安装：

```bash
bun install --frozen-lockfile
bun run --filter api typecheck
```

Bun 的隔离链接按 workspace 解析依赖。遇到该错误时先核对根锁文件与
API 的直接声明，避免从历史目录或旧安装树启动。不要删除根 `bun.lock`
或创建单独的 API 锁文件来绕过冲突。
