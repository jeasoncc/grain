"use client";

import dynamicImport from "next/dynamic";

// 使用动态导入禁用 SSR，避免构建时的序列化错误
const LicensePageContent = dynamicImport(
  () => import("./license-content").then((mod) => ({ default: mod.LicensePageContent })),
  {
    ssr: false,
  }
);

export default function LicensePageWrapper() {
  return <LicensePageContent />;
}





