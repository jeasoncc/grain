import type { Metadata } from "next";
import { Inter, Noto_Sans_SC } from "next/font/google";
import "./globals.css";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { StructuredData } from "@/components/seo/structured-data";
import { ErrorBoundary } from "@/components/ui/error-boundary";
import { ScrollProgress } from "@/components/ui/scroll-progress";
import { ScrollToTop } from "@/components/ui/scroll-to-top";
import { PageLoader } from "@/components/ui/page-loader";
import { ThemeProvider } from "@/components/providers/theme-provider";

const inter = Inter({ 
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
  preload: true,
  fallback: ["system-ui", "arial"],
});

const notoSansSC = Noto_Sans_SC({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "900"],
  variable: "--font-noto-sans-sc",
  display: "swap",
  preload: true,
  fallback: ["system-ui", "sans-serif"],
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "https://novel-editor.com"),
  title: {
    default: "Novel Editor - 专业的长篇小说写作工具",
    template: "%s | Novel Editor",
  },
  description:
    "Novel Editor 是一款现代化的跨平台写作环境，专为长篇小说创作而设计。支持 Linux、Windows 和 macOS。沉浸式编辑体验，强大的项目管理，让创作更加专注和高效。",
  keywords: [
    "小说编辑器",
    "写作工具",
    "长篇小说",
    "创作软件",
    "跨平台",
    "Novel Editor",
    "Tauri",
    "离线写作",
  ],
  authors: [{ name: "Novel Editor Team" }],
  creator: "Novel Editor Team",
  publisher: "Novel Editor",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  icons: {
    icon: [
      { url: "/icon.svg", type: "image/svg+xml" },
      { url: "/favicon.ico", sizes: "any" },
    ],
    apple: [
      { url: "/icon.svg", sizes: "180x180", type: "image/svg+xml" },
    ],
    shortcut: "/favicon.ico",
  },
  openGraph: {
    type: "website",
    locale: "zh_CN",
    url: "/",
    siteName: "Novel Editor",
    title: "Novel Editor - 专业的长篇小说写作工具",
    description:
      "现代化的跨平台写作环境，专为长篇小说创作而设计",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Novel Editor",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Novel Editor - 专业的长篇小说写作工具",
    description: "现代化的跨平台写作环境，专为长篇小说创作而设计",
    images: ["/og-image.png"],
    creator: "@novel-editor",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  verification: {
    // 可以添加搜索引擎验证
    // google: "your-google-verification-code",
    // yandex: "your-yandex-verification-code",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <head>
        <link rel="icon" href="/icon.svg" type="image/svg+xml" />
        <link rel="icon" href="/favicon.ico" sizes="any" />
        <link rel="apple-touch-icon" href="/icon.svg" />
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#ffffff" media="(prefers-color-scheme: light)" />
        <meta name="theme-color" content="#111827" media="(prefers-color-scheme: dark)" />
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=5" />
        <StructuredData />
      </head>
      <body className={`${inter.variable} ${notoSansSC.variable} font-sans antialiased`}>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <ErrorBoundary>
            <PageLoader />
            <ScrollProgress />
            <Header />
            <main className="pt-16">{children}</main>
            <Footer />
            <ScrollToTop />
          </ErrorBoundary>
        </ThemeProvider>
      </body>
    </html>
  );
}
