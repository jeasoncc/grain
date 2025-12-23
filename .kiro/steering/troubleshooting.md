# 常见问题排查

记录开发过程中遇到的问题和解决方案。

## Git 相关

### 版本号循环递增

**症状**：提交后版本号不断递增，形成无限循环

**原因**：版本文件被更新但未添加到暂存区

**解决**：
1. 检查 `.git/hooks/pre-commit` 中的 `git add` 是否包含所有版本文件
2. 参考 `git-hooks.md` 添加缺失的文件

### 提交时跳过版本递增

**场景**：只修改文档，不想递增版本

**解决**：
```bash
SKIP_VERSION_BUMP=true git commit -m "docs: 更新文档"
```

### Tag 推送失败

**症状**：`git push origin tag-name` 失败

**解决**：
```bash
# 检查 tag 是否存在
git tag -l | grep tag-name

# 删除远程 tag 后重新推送
git push origin :refs/tags/tag-name
git push origin tag-name
```

## 构建相关

### bun install 失败

**症状**：依赖安装报错

**解决**：
```bash
# 清理缓存
rm -rf node_modules bun.lock
bun install
```

### Tauri 构建失败

**症状**：`bun run build:prod:desktop` 报错

**常见原因**：
1. Rust 工具链未安装
2. 系统依赖缺失（Linux）

**解决**：
```bash
# 安装 Rust
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh

# Linux 安装依赖
sudo apt install libwebkit2gtk-4.1-dev libgtk-3-dev libayatana-appindicator3-dev
```

### TypeScript 类型错误

**症状**：`bun run check` 报类型错误

**解决**：
```bash
# 重新生成类型
bun run build

# 检查 tsconfig.json 路径别名
# 确保 @/* 指向 ./src/*
```

## 开发相关

### 热更新不生效

**症状**：修改代码后页面不刷新

**解决**：
```bash
# 重启开发服务器
# Ctrl+C 停止后重新运行
bun run desktop:dev
```

### IndexedDB 数据异常

**症状**：数据显示不正确或丢失

**解决**：
```bash
# 在浏览器 DevTools 中清理 IndexedDB
# Application → Storage → IndexedDB → 删除数据库
```

### Lexical 编辑器报错

**症状**：编辑器初始化失败或内容丢失

**常见原因**：
1. 节点类型未注册
2. JSON 内容格式不正确

**解决**：
1. 检查 `packages/editor/src/nodes/` 是否导出所有自定义节点
2. 检查存储的 JSON 是否符合 Lexical 格式

## 测试相关

### vitest 测试失败

**症状**：单元测试报错

**解决**：
```bash
# 单独运行失败的测试
bun run test -- --run path/to/test.ts

# 更新快照
bun run test -- --run -u
```

### E2E 测试超时

**症状**：Playwright 测试超时

**解决**：
1. 确保开发服务器已启动
2. 增加超时时间
3. 检查选择器是否正确

## 发布相关

### GitHub Actions 构建失败

**症状**：推送 tag 后 Actions 报错

**排查步骤**：
1. 查看 Actions 日志
2. 检查 secrets 是否配置正确
3. 检查 tag 格式是否正确（如 `desktop-v0.1.7`）

### MSIX 签名失败

**症状**：Windows MSIX 包构建失败

**解决**：
1. 检查 GitHub Secrets 中的证书配置
2. 参考 `docs/msix-packaging-guide.md`

### AUR 发布失败

**症状**：AUR 包更新失败

**解决**：
1. 检查 SSH key 是否配置
2. 检查 PKGBUILD 格式
3. 参考 `docs/aur-package.md`

## 性能相关

### 大文件列表卡顿

**症状**：文件树或搜索结果渲染慢

**解决**：
1. 使用 `@tanstack/react-virtual` 虚拟列表
2. 检查是否有不必要的重渲染
3. 使用 React DevTools Profiler 分析

### 内存占用过高

**症状**：应用内存持续增长

**排查**：
1. 检查是否有未清理的订阅
2. 检查 Zustand store 是否有内存泄漏
3. 使用 Chrome DevTools Memory 分析

---

**更新规则**：遇到新问题并解决后，记录到此文件供后续参考。
