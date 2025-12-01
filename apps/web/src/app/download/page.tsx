import { DownloadPageContent } from "./download-content";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "下载 Novel Editor",
  description: "下载 Novel Editor - 选择适合你的平台，立即开始创作之旅。支持 Linux、Windows 和 macOS。",
};

export default function DownloadPage() {
  return <DownloadPageContent />;
}
