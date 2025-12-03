
# 动态导入修复方案实施报告

## 修复策略

使用 Next.js 动态导入来禁用 SSR，避免构建时的序列化错误。

### 修复模式

1. **提取页面内容到独立组件**（如果还没有）
   - 创建 `{page-name}-content.tsx` 文件
   - 将页面内容移动到该文件，标记为 `"use client"`

2. **创建包装器组件**
   - 创建 `{page-name}-wrapper.tsx` 文件
   - 使用 `dynamic()` 导入 content 组件，设置 `ssr: false`

3. **修改页面文件**
   - `page.tsx` 改为服务器组件（移除 "use client"）
   - 导入并使用 wrapper 组件

## 已修复的页面

✅ privacy - 已完成
✅ contributors - 已完成
✅ donate - 已完成
✅ download - 已完成

## 需要修复的页面

- [ ] conduct
- [ ] terms (当前错误)
- [ ] security
- [ ] license
- [ ] about
- [ ] docs/faq
- [ ] docs/api
- [ ] docs/contributing
- [ ] docs/tutorials

## 修复模板

### Content 组件 (`{page}-content.tsx`)
```tsx
"use client";
// ... 页面内容
export function {Page}PageContent() {
  return (/* 页面内容 */);
}
```

### Wrapper 组件 (`{page}-wrapper.tsx`)
```tsx
"use client";
import dynamicImport from "next/dynamic";

const {Page}PageContent = dynamicImport(
  () => import("./{page}-content").then((mod) => ({ default: mod.{Page}PageContent })),
  { ssr: false }
);

export default function {Page}PageWrapper() {
  return <{Page}PageContent />;
}
```

### Page 组件 (`page.tsx`)
```tsx
import {Page}PageWrapper from "./{page}-wrapper";

export const dynamic = "force-dynamic";

export default function {Page}Page() {
  return <{Page}PageWrapper />;
}
```

