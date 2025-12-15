"use client";

import dynamicImport from "next/dynamic";

// 使用动态导入禁用 SSR，避免构建时的序列化错误
const WikiPageContent = dynamicImport(
  () => import("./wiki-content").then((mod) => ({ default: mod.WikiPageContent })),
  {
    ssr: false,
  }
);

export default function WikiPageWrapper() {
  return <WikiPageContent />;
}








