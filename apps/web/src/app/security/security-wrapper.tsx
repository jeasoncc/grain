"use client";

import dynamicImport from "next/dynamic";

// 使用动态导入禁用 SSR，避免构建时的序列化错误
const SecurityPageContent = dynamicImport(
  () => import("./security-content").then((mod) => ({ default: mod.SecurityPageContent })),
  {
    ssr: false,
  }
);

export default function SecurityPageWrapper() {
  return <SecurityPageContent />;
}





