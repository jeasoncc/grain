"use client";

import dynamicImport from "next/dynamic";

// 使用动态导入禁用 SSR，避免构建时的序列化错误
const FAQPageContent = dynamicImport(
  () => import("./faq-content").then((mod) => ({ default: mod.FAQPageContent })),
  {
    ssr: false,
  }
);

export default function FAQPageWrapper() {
  return <FAQPageContent />;
}





