"use client";

import dynamicImport from "next/dynamic";

// 使用动态导入禁用 SSR，避免构建时的序列化错误
const ConductPageContent = dynamicImport(
  () => import("./conduct-content").then((mod) => ({ default: mod.ConductPageContent })),
  {
    ssr: false,
  }
);

export default function ConductPageWrapper() {
  return <ConductPageContent />;
}





