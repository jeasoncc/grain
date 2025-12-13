# Web 部署配置指南

本指南介绍如何配置 Vercel、Netlify 和 GitHub Pages 部署。

## 目录

- [GitHub Pages（推荐，免费）](#github-pages)
- [Vercel](#vercel)
- [Netlify](#netlify)

---

## GitHub Pages

GitHub Pages 是最简单的部署方式，无需额外配置 secrets。

### 启用步骤

1. **启用 GitHub Pages**
   - 进入仓库 Settings → Pages
   - Source 选择 "GitHub Actions"
   - 保存

2. **触发部署**
   ```bash
   npm run tag:web
   # 或手动触发 web-deploy 工作流
   ```

3. **访问网站**
   - 默认地址: `https://<username>.github.io/<repo-name>/`
   - 例如: `https://jeason-lotus.github.io/novel-editor/`

### 自定义域名（可选）

1. 在仓库根目录创建 `apps/web/public/CNAME` 文件：
   ```
   your-domain.com
   ```

2. 在域名 DNS 设置中添加：
   - 类型: CNAME
   - 名称: @ 或 www
   - 值: `<username>.github.io`

3. 修改工作流添加 cname：
   ```yaml
   - name: Deploy to GitHub Pages
     uses: peaceiris/actions-gh-pages@v3
     with:
       github_token: ${{ secrets.GITHUB_TOKEN }}
       publish_dir: apps/web/out
       cname: your-domain.com
   ```

---

## Vercel

Vercel 提供更快的 CDN 和自动预览部署。

### 配置步骤

1. **创建 Vercel 账号**
   - 访问 [vercel.com](https://vercel.com)
   - 使用 GitHub 登录

2. **导入项目**
   - 点击 "New Project"
   - 选择你的 GitHub 仓库
   - Root Directory 设置为 `apps/web`
   - Framework Preset 选择 "Next.js"
   - 点击 "Deploy"

3. **获取 Token 和 ID**

   **获取 Vercel Token:**
   - 访问 [vercel.com/account/tokens](https://vercel.com/account/tokens)
   - 点击 "Create Token"
   - 名称填写 "GitHub Actions"
   - 复制生成的 token

   **获取 Org ID 和 Project ID:**
   ```bash
   # 安装 Vercel CLI
   npm i -g vercel
   
   # 登录
   vercel login
   
   # 在项目目录运行
   cd apps/web
   vercel link
   
   # 查看 .vercel/project.json 获取 ID
   cat .vercel/project.json
   ```
   
   输出示例：
   ```json
   {
     "orgId": "team_xxxxxxxxxxxx",
     "projectId": "prj_xxxxxxxxxxxx"
   }
   ```

4. **配置 GitHub Secrets**
   - 进入仓库 Settings → Secrets and variables → Actions
   - 添加以下 secrets：

   | Secret 名称 | 值 |
   |------------|---|
   | `VERCEL_TOKEN` | 你的 Vercel token |
   | `VERCEL_ORG_ID` | orgId 值 |
   | `VERCEL_PROJECT_ID` | projectId 值 |

5. **触发部署**
   ```bash
   npm run tag:web
   ```

### Vercel 访问地址

- 自动分配: `https://<project-name>.vercel.app`
- 可在 Vercel 控制台配置自定义域名

---

## Netlify

Netlify 提供表单处理、函数等额外功能。

### 配置步骤

1. **创建 Netlify 账号**
   - 访问 [netlify.com](https://netlify.com)
   - 使用 GitHub 登录

2. **创建新站点**
   - 点击 "Add new site" → "Import an existing project"
   - 选择 GitHub 仓库
   - Build settings:
     - Base directory: `apps/web`
     - Build command: `npm run build`
     - Publish directory: `apps/web/out`
   - 点击 "Deploy site"

3. **获取 Auth Token**
   - 访问 [app.netlify.com/user/applications](https://app.netlify.com/user/applications)
   - 点击 "New access token"
   - 描述填写 "GitHub Actions"
   - 复制生成的 token

4. **获取 Site ID**
   - 进入你的站点设置
   - Site settings → General → Site details
   - 复制 "Site ID"（格式如 `xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx`）

5. **配置 GitHub Secrets**
   - 进入仓库 Settings → Secrets and variables → Actions
   - 添加以下 secrets：

   | Secret 名称 | 值 |
   |------------|---|
   | `NETLIFY_AUTH_TOKEN` | 你的 Netlify token |
   | `NETLIFY_SITE_ID` | Site ID |

6. **触发部署**
   ```bash
   npm run tag:web
   ```

### Netlify 访问地址

- 自动分配: `https://<site-name>.netlify.app`
- 可在 Netlify 控制台配置自定义域名

---

## 部署命令汇总

```bash
# 触发 web 部署（会同时部署到所有已配置的平台）
npm run tag:web

# 手动触发（通过 GitHub CLI）
gh workflow run web-deploy.yml -f version=0.1.67 -f environment=production
```

## 部署状态检查

```bash
# 查看最近的部署
gh run list --workflow=web-deploy.yml --limit=5

# 查看部署详情
gh run view <run-id>
```

## 常见问题

### Q: 部署失败显示 "vercel-token required"
A: 需要配置 `VERCEL_TOKEN` secret，或者该步骤会被跳过（不影响其他部署）

### Q: GitHub Pages 404
A: 
1. 确保 Settings → Pages 已启用
2. 检查 Source 是否设置为 "GitHub Actions"
3. 等待几分钟让 DNS 生效

### Q: 自定义域名不生效
A: 
1. 检查 DNS 配置是否正确
2. 等待 DNS 传播（最长 48 小时）
3. 在 GitHub Pages 设置中验证域名

### Q: 构建成功但页面空白
A: 检查 Next.js 配置中的 `basePath`，如果部署到子路径需要配置：
```typescript
// apps/web/next.config.ts
const nextConfig = {
  basePath: '/novel-editor', // 如果部署到 github.io/novel-editor
  // ...
}
```

## 推荐配置

| 场景 | 推荐平台 |
|-----|---------|
| 个人项目/开源 | GitHub Pages（免费、简单） |
| 需要预览部署 | Vercel（每个 PR 自动预览） |
| 需要表单/函数 | Netlify（内置功能丰富） |
| 企业/商业 | Vercel 或 Netlify Pro |
