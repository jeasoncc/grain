"use client";

import dynamicImport from "next/dynamic";

// 使用动态导入禁用 SSR，避免构建时的序列化错误
const ApiPageContent = dynamicImport(
  () => import("./api-content").then((mod) => ({ default: mod.ApiPageContent })),
  {
    ssr: false,
  }
);

export default function ApiPageWrapper() {
  return <ApiPageContent />;
}





