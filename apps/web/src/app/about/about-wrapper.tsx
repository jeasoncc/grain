"use client";

import dynamicImport from "next/dynamic";

// 使用动态导入禁用 SSR，避免构建时的序列化错误
const AboutPageContent = dynamicImport(
  () => import("./about-content").then((mod) => ({ default: mod.AboutPageContent })),
  {
    ssr: false,
  }
);

export default function AboutPageWrapper() {
  return <AboutPageContent />;
}








