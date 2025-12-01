import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Novel Editor - 专业的长篇小说写作工具",
  description:
    "Novel Editor 是一款现代化的跨平台写作环境，专为长篇小说创作而设计。支持 Linux、Windows 和 macOS。沉浸式编辑体验，强大的项目管理，让创作更加专注和高效。",
  keywords: [
    "小说编辑器",
    "写作工具",
    "长篇小说",
    "创作软件",
    "跨平台",
    "Novel Editor",
  ],
  authors: [{ name: "Novel Editor Team" }],
  openGraph: {
    title: "Novel Editor - 专业的长篇小说写作工具",
    description:
      "现代化的跨平台写作环境，专为长篇小说创作而设计",
    type: "website",
    locale: "zh_CN",
  },
  twitter: {
    card: "summary_large_image",
    title: "Novel Editor - 专业的长篇小说写作工具",
    description: "现代化的跨平台写作环境，专为长篇小说创作而设计",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <body className={inter.className}>
        <Header />
        <main className="pt-16">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
