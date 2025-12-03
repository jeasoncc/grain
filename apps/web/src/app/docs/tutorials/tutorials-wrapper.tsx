"use client";

import dynamicImport from "next/dynamic";

// 使用动态导入禁用 SSR，避免构建时的序列化错误
const TutorialsPageContent = dynamicImport(
  () => import("./tutorials-content").then((mod) => ({ default: mod.TutorialsPageContent })),
  {
    ssr: false,
  }
);

export default function TutorialsPageWrapper() {
  return <TutorialsPageContent />;
}


