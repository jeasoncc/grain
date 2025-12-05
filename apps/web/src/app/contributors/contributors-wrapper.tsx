"use client";

import dynamicImport from "next/dynamic";

// 使用动态导入禁用 SSR，避免构建时的序列化错误
const ContributorsPageContent = dynamicImport(
  () => import("./contributors-content").then((mod) => ({ default: mod.ContributorsPageContent })),
  {
    ssr: false,
  }
);

export default function ContributorsPageWrapper() {
  return <ContributorsPageContent />;
}





