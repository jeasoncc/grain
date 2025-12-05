"use client";

import dynamicImport from "next/dynamic";

// 使用动态导入禁用 SSR，避免构建时的序列化错误
const DownloadPageContent = dynamicImport(
  () => import("./download-content").then((mod) => ({ default: mod.DownloadPageContent })),
  {
    ssr: false,
  }
);

export default function DownloadPageWrapper() {
  return <DownloadPageContent />;
}





