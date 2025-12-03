"use client";

import dynamicImport from "next/dynamic";

// 使用动态导入禁用 SSR，避免构建时的序列化错误
const NotFoundContent = dynamicImport(
  () => import("./not-found-content").then((mod) => ({ default: mod.NotFoundContent })),
  {
    ssr: false,
  }
);

export default function NotFoundWrapper() {
  return <NotFoundContent />;
}


