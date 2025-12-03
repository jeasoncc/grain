"use client";

import dynamicImport from "next/dynamic";

// 使用动态导入禁用 SSR，避免构建时的序列化错误
const TermsPageContent = dynamicImport(
  () => import("./terms-content").then((mod) => ({ default: mod.TermsPageContent })),
  {
    ssr: false,
  }
);

export default function TermsPageWrapper() {
  return <TermsPageContent />;
}


