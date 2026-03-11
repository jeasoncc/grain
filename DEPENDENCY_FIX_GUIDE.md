# 🔧 依赖问题修复指南

## 问题描述

启动开发服务器时遇到错误：
```
Error: Cannot find module 'ajv/dist/core'
```

**根本原因**：
- `ajv-draft-04` 需要 `ajv ^8.5.0`
- 项目当前安装的是 `ajv 6.12.6`
- ajv v6 和 v8 的内部结构不兼容

**重要**：这个问题与我们的安全修复**无关**，是项目原有的依赖冲突。

---

## 🚀 快速修复方案

### 方案 1: 升级 ajv 到 v8（推荐）

```bash
cd /home/lotus/Projects/personal/book2/novel-editor

# 1. 清理依赖
rm -rf node_modules bun.lockb

# 2. 升级 ajv
bun add ajv@^8.12.0 -D

# 3. 重新安装所有依赖
bun install

# 4. 启动开发服务器
npm run dev
```

### 方案 2: 使用 npm 安装（如果 bun 有问题）

```bash
cd /home/lotus/Projects/personal/book2/novel-editor

# 1. 清理
rm -rf node_modules package-lock.json bun.lockb

# 2. 使用 npm 安装
npm install

# 3. 升级 ajv
npm install ajv@^8.12.0 --save-dev

# 4. 启动
npm run dev
```

### 方案 3: 手动修改 package.json

如果自动安装有问题，手动编辑 `package.json`：

```json
{
  "devDependencies": {
    "ajv": "^8.12.0",
    // ... 其他依赖
  }
}
```

然后运行：
```bash
bun install
```

---

## ✅ 验证修复

修复后，应该看到：

```bash
# 检查 ajv 版本
cat node_modules/ajv/package.json | grep version
# 应该显示 "version": "8.x.x"

# 检查 ajv/dist/core 是否存在
ls node_modules/ajv/dist/core.js
# 应该存在

# 启动开发服务器
npm run dev
# 应该成功启动，没有 ajv 错误
```

---

## 📊 我们完成的安全修复（不受影响）

所有安全修复都已成功完成，不受此依赖问题影响：

✅ Admin 安全修复
- 删除硬编码密码
- 实施 bcrypt + JWT
- 安全的 token 存储

✅ API 安全加固
- Zod 输入验证
- 安全的错误处理

✅ 架构修复
- pipes/flows 层移除 React 导入
- Logger 迁移

---

## 🆘 如果仍有问题

### 检查 1: Bun 版本

```bash
bun --version
# 应该 >= 1.1.0
```

### 检查 2: Node 版本

```bash
node --version
# 应该 >= 20
```

### 检查 3: 磁盘空间

```bash
df -h
# 确保有足够空间
```

### 检查 4: 网络连接

```bash
ping registry.npmjs.org
# 确保可以访问 npm registry
```

---

## 📝 技术细节

### ajv v6 vs v8 的区别

**ajv v6** (旧版):
```javascript
// 没有 dist/core 模块
require('ajv')
```

**ajv v8** (新版):
```javascript
// 有 dist/core 模块
require('ajv/dist/core')
```

`ajv-draft-04` 依赖 ajv v8 的内部模块，所以必须升级。

---

## 🎯 下一步

1. 选择上面的一个修复方案
2. 执行命令
3. 验证开发服务器启动
4. 如果成功，继续开发
5. 如果失败，告诉我具体错误信息

---

**需要我帮你执行这些命令吗？**
