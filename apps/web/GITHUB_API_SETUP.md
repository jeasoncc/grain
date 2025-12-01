# GitHub API 配置指南

## 为什么需要配置？

GitHub API 对未认证的请求有速率限制：
- **未认证**：每小时 60 次请求
- **已认证（使用 Token）**：每小时 5000 次请求

如果超过限制，会返回 403 错误。

## 解决方案

### 方案 1：使用 GitHub Personal Access Token（推荐）

#### 步骤 1：创建 GitHub Personal Access Token

1. 访问 GitHub Settings → Developer settings → Personal access tokens → Tokens (classic)
   - 链接：https://github.com/settings/tokens

2. 点击 "Generate new token" → "Generate new token (classic)"

3. 填写 Token 信息：
   - **Note**：`Novel Editor Website`（描述性名称）
   - **Expiration**：选择过期时间（建议 90 天或自定义）
   - **Scopes**：只需要勾选 `public_repo`（访问公共仓库）

4. 点击 "Generate token"

5. **重要**：复制生成的 Token（只显示一次，请妥善保管）

#### 步骤 2：配置环境变量

在项目根目录（`apps/web/`）创建 `.env.local` 文件：

```bash
# GitHub Personal Access Token（可选，用于提高 API 速率限制）
NEXT_PUBLIC_GITHUB_TOKEN=your_token_here
```

**⚠️ 注意**：
- 由于使用了静态导出（`output: "export"`），Token 会被打包到客户端代码中
- 这意味着 Token 对用户可见（在浏览器中可以查看）
- 建议创建一个只有 `public_repo` 权限的 Token，这样即使泄露，也只能访问公共仓库

#### 步骤 3：将 `.env.local` 添加到 `.gitignore`

确保 `.env.local` 文件不会被提交到 Git：

```bash
# .gitignore
.env.local
.env*.local
```

### 方案 2：不使用 Token（使用默认数据）

如果不配置 Token，网站仍然可以正常工作：
- 如果 API 请求失败，会显示默认数据
- 所有下载按钮会链接到 GitHub Releases 页面
- 用户可以直接从 GitHub 下载

## 速率限制说明

### 未认证（无 Token）
- 速率限制：60 请求/小时/IP
- 如果多个用户同时访问，可能会很快达到限制

### 已认证（使用 Token）
- 速率限制：5000 请求/小时/Token
- 大幅提升，适合生产环境

## 安全建议

1. **最小权限原则**：只给 Token `public_repo` 权限
2. **定期轮换**：建议每 90 天更换一次 Token
3. **不要共享**：每个环境使用不同的 Token
4. **监控使用**：定期检查 Token 的使用情况

## 测试配置

配置 Token 后，可以测试：

1. 检查环境变量是否生效：
   ```bash
   # 在浏览器控制台运行
   console.log(process.env.NEXT_PUBLIC_GITHUB_TOKEN ? 'Token configured' : 'No token');
   ```

2. 检查 API 请求是否成功：
   - 打开浏览器开发者工具 → Network 标签
   - 访问下载页面
   - 查看 GitHub API 请求是否返回 200（而不是 403）

## 故障排除

### 问题：仍然收到 403 错误

1. 检查 Token 是否正确配置
2. 检查 Token 是否过期
3. 检查 Token 是否有正确的权限（`public_repo`）
4. 检查仓库是否存在且为公共仓库

### 问题：Token 泄露怎么办

1. 立即在 GitHub 设置中撤销 Token
2. 生成新的 Token
3. 更新 `.env.local` 文件

## 替代方案

如果不想暴露 Token 到客户端，可以考虑：

1. **移除静态导出**：使用 Next.js 服务器端 API Routes
   - 这样 Token 可以安全地存储在服务器端
   - 但需要服务器托管（不能部署到纯静态托管）

2. **使用 GitHub Proxy**：通过自己的服务器代理请求
   - Token 存储在服务器端
   - 客户端请求自己的服务器
   - 需要额外的服务器资源

## 相关链接

- [GitHub Personal Access Tokens](https://github.com/settings/tokens)
- [GitHub API Rate Limiting](https://docs.github.com/en/rest/overview/resources-in-the-rest-api#rate-limiting)
- [Next.js Environment Variables](https://nextjs.org/docs/basic-features/environment-variables)


