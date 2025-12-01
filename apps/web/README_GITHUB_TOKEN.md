# GitHub API Token 配置指南

## 为什么需要配置 Token？

GitHub API 对未认证的请求有严格的速率限制：
- ❌ **未认证**：每小时 60 次请求
- ✅ **已认证（使用 Token）**：每小时 5000 次请求

如果超过限制，会返回 **403 错误**。配置 Token 可以大幅提升速率限制，让网站更稳定。

---

## 快速开始

### 步骤 1：创建 GitHub Personal Access Token

1. 访问 GitHub 设置页面：
   - 直接链接：https://github.com/settings/tokens
   - 或者：GitHub → Settings → Developer settings → Personal access tokens → Tokens (classic)

2. 点击 **"Generate new token"** → **"Generate new token (classic)"**

3. 填写 Token 信息：
   - **Note（备注）**：`Novel Editor Website`（可以填写任何描述性名称）
   - **Expiration（过期时间）**：
     - 建议选择 **90 days** 或 **No expiration**（如果长期使用）
   - **Select scopes（选择权限）**：
     - ✅ 只勾选 **`public_repo`**（访问公共仓库）
     - ❌ 不要勾选其他权限（最小权限原则）

4. 滚动到底部，点击 **"Generate token"**

5. ⚠️ **重要**：立即复制生成的 Token
   - Token 只显示一次，关闭页面后无法再次查看
   - 如果丢失，需要重新生成

### 步骤 2：配置环境变量

在 `apps/web/` 目录下创建 `.env.local` 文件：

```bash
# 进入 web 目录
cd apps/web

# 创建 .env.local 文件
cat > .env.local << EOF
NEXT_PUBLIC_GITHUB_TOKEN=你的_token_这里
EOF
```

或者手动创建文件，内容如下：

```env
# GitHub Personal Access Token
# 用于提高 API 速率限制（从 60/小时 提升到 5000/小时）
NEXT_PUBLIC_GITHUB_TOKEN=ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

**将 `ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx` 替换为你刚才复制的 Token**

### 步骤 3：重启开发服务器

配置环境变量后，需要重启开发服务器才能生效：

```bash
# 停止当前服务器（Ctrl+C）
# 然后重新启动
bun web:dev
```

### 步骤 4：验证配置

1. 打开浏览器开发者工具（F12）
2. 访问下载页面：http://localhost:3000/download
3. 在 Console 中检查是否有 403 错误
4. 在 Network 标签中查看 GitHub API 请求：
   - ✅ 应该返回 **200** 状态码
   - ❌ 如果还是 **403**，检查 Token 是否正确配置

---

## 安全说明

### ⚠️ 重要提示

由于项目使用了**静态导出**（`output: "export"`），环境变量会暴露在客户端代码中：

- ✅ **安全的做法**：只使用有 `public_repo` 权限的 Token
  - 即使泄露，也只能访问公共仓库
  - 无法访问私有仓库、修改代码、删除仓库等危险操作

- ❌ **不要使用**：
  - 有 `repo` 全权限的 Token
  - 有 `delete_repo`、`admin` 等危险权限的 Token
  - 有访问私有仓库权限的 Token

### 最佳实践

1. ✅ **最小权限原则**：只给 Token 必要的权限（`public_repo`）
2. ✅ **定期轮换**：建议每 90 天更换一次 Token
3. ✅ **不要提交到 Git**：`.env.local` 文件已在 `.gitignore` 中，不会被提交
4. ✅ **不同环境使用不同 Token**：开发、生产环境使用不同的 Token

---

## 故障排除

### 问题 1：仍然收到 403 错误

**可能原因**：
- Token 未正确配置
- Token 已过期
- Token 没有 `public_repo` 权限
- 仓库不存在或不是公共仓库

**解决方法**：
1. 检查 `.env.local` 文件是否存在且格式正确
2. 确认 Token 没有过期
3. 在 GitHub 设置中检查 Token 的权限
4. 重启开发服务器

### 问题 2：环境变量不生效

**可能原因**：
- 环境变量名称错误（必须是 `NEXT_PUBLIC_` 开头）
- 未重启开发服务器
- 文件位置错误

**解决方法**：
1. 确认环境变量名称为 `NEXT_PUBLIC_GITHUB_TOKEN`
2. 确认文件位置：`apps/web/.env.local`
3. 重启开发服务器

### 问题 3：Token 泄露了怎么办

**立即处理**：
1. 访问 https://github.com/settings/tokens
2. 找到对应的 Token，点击 **"Revoke"（撤销）**
3. 生成新的 Token
4. 更新 `.env.local` 文件
5. 重新部署网站（如果已部署）

---

## 不配置 Token 会怎样？

**不配置 Token 也可以正常工作**，但有以下限制：

- ⚠️ 速率限制：每小时只有 60 次请求
- ⚠️ 如果多个用户同时访问，可能很快达到限制
- ✅ 失败时会自动使用默认数据
- ✅ 所有下载按钮会链接到 GitHub Releases 页面

**建议**：如果网站有多个用户或访问量较大，建议配置 Token。

---

## 相关链接

- [GitHub Personal Access Tokens](https://github.com/settings/tokens)
- [GitHub API Rate Limiting](https://docs.github.com/en/rest/overview/resources-in-the-rest-api#rate-limiting)
- [Next.js Environment Variables](https://nextjs.org/docs/basic-features/environment-variables)

---

## 总结

配置 GitHub Token 只需要 3 步：
1. 在 GitHub 创建 Token（只有 `public_repo` 权限）
2. 在 `apps/web/.env.local` 文件中配置
3. 重启开发服务器

完成后，API 速率限制将从 60/小时 提升到 5000/小时，网站会更稳定！


