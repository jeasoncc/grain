"use client";

import dynamicImport from "next/dynamic";

// 使用动态导入禁用 SSR，避免构建时的序列化错误
const DonatePageContent = dynamicImport(
  () => import("./donate-content").then((mod) => ({ default: mod.DonatePageContent })),
  {
    ssr: false,
  }
);

export default function DonatePageWrapper() {
  return <DonatePageContent />;
}





