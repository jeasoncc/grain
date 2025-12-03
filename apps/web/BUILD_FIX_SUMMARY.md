# Web 项目构建错误修复总结

## 问题描述

在运行 `bun run build` 时遇到以下错误：

```
Error: Event handlers cannot be passed to Client Component props.
  {className: ..., ref: undefined, onClick: function onClick, children: ...}
                                            ^^^^^^^^^^^^^^^^
```

## 根本原因

Next.js 15 在构建时会尝试静态预渲染所有页面，即使页面被标记为客户端组件（`"use client"`）。当遇到使用 `ScrollReveal` 或 `Card` 等需要客户端交互的组件时，Next.js 无法在服务端序列化这些组件中的事件处理器，导致构建失败。

## 已应用的修复

### 1. 添加动态渲染配置

为所有使用 `ScrollReveal` 或 `Card` 的页面添加了 `export const dynamic = "force-dynamic"`：

- ✅ `apps/web/src/app/donate/page.tsx`
- ✅ `apps/web/src/app/download/page.tsx`
- ✅ `apps/web/src/app/license/page.tsx`
- ✅ `apps/web/src/app/security/page.tsx`
- ✅ `apps/web/src/app/contributors/page.tsx`
- ✅ `apps/web/src/app/conduct/page.tsx`
- ✅ `apps/web/src/app/about/page.tsx`
- ✅ `apps/web/src/app/docs/faq/page.tsx`
- ✅ `apps/web/src/app/docs/api/page.tsx`
- ✅ `apps/web/src/app/docs/contributing/page.tsx`
- ✅ `apps/web/src/app/docs/page.tsx`
- ✅ `apps/web/src/app/docs/tutorials/page.tsx`

### 2. 优化 ScrollReveal 组件

修改了 `apps/web/src/components/ui/scroll-reveal.tsx`，使其在 SSR 时更安全：
- 添加 `isMounted` 状态来检测组件是否已挂载
- 在 SSR 时默认显示内容，避免布局闪烁
- 只在客户端挂载后才执行 IntersectionObserver 逻辑

## 仍然存在的问题

即使添加了 `force-dynamic` 配置，Next.js 在构建时仍然尝试预渲染某些页面（如 `/conduct`），导致构建失败。

## 推荐解决方案

### 方案 1: 使用动态导入（推荐）

将使用客户端交互组件的页面改为使用动态导入：

```typescript
import dynamic from 'next/dynamic';

const DonatePageContent = dynamic(() => import('./donate-content'), {
  ssr: false,
});
```

### 方案 2: 完全禁用静态生成

在 `next.config.ts` 中全局禁用静态生成：

```typescript
const nextConfig: NextConfig = {
  // ... 其他配置
  output: undefined, // 不使用静态导出
};
```

### 方案 3: 使用路由段配置

为特定路由禁用静态生成：

在路由文件夹下创建 `route.ts` 文件，或者使用 `generateStaticParams` 返回空数组。

## 当前状态

- ✅ 所有相关页面已添加 `force-dynamic` 配置
- ✅ ScrollReveal 组件已优化
- ❌ 构建仍然失败，需要进一步修复

## 下一步

1. 尝试使用动态导入替代直接导入
2. 或者修改 Next.js 配置，完全禁用静态生成
3. 或者重构 ScrollReveal 组件，使其在 SSR 时完全兼容

---

*最后更新：2024-12-02*


