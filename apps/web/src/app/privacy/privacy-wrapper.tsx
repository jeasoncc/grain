"use client";

import dynamicImport from "next/dynamic";

// 使用动态导入禁用 SSR，避免构建时的序列化错误
const PrivacyPageContent = dynamicImport(
  () => import("./privacy-content").then((mod) => ({ default: mod.PrivacyPageContent })),
  {
    ssr: false,
  }
);

export default function PrivacyPageWrapper() {
  return <PrivacyPageContent />;
}





