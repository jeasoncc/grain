"use client";

import dynamicImport from "next/dynamic";

// 使用动态导入禁用 SSR，避免构建时的序列化错误
const ManualPageContent = dynamicImport(
  () => import("./manual-content").then((mod) => ({ default: mod.ManualPageContent })),
  {
    ssr: false,
  }
);

export default function ManualPageWrapper() {
  return <ManualPageContent />;
}


