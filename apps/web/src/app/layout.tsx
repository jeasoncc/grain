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
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "https://grain.app"),
  title: {
    default: "Grain - A minimalist writing sanctuary",
    template: "%s | Grain",
  },
  description:
    "Grain is a minimalist writing sanctuary for long-form content. Cross-platform support for Linux, Windows, and macOS. Pure, elegant, focused on what matters—your words.",
  keywords: [
    "writing tool",
    "long-form writing",
    "minimalist editor",
    "cross-platform",
    "Grain",
    "Tauri",
    "offline writing",
  ],
  authors: [{ name: "Grain Team" }],
  creator: "Grain Team",
  publisher: "Grain",
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
    locale: "en_US",
    url: "/",
    siteName: "Grain",
    title: "Grain - A minimalist writing sanctuary",
    description:
      "Pure. Elegant. Focused on what matters—your words.",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Grain",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Grain - A minimalist writing sanctuary",
    description: "Pure. Elegant. Focused on what matters—your words.",
    images: ["/og-image.png"],
    creator: "@grain_app",
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
        <meta name="theme-color" content="#0a0a0a" media="(prefers-color-scheme: dark)" />
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=5" />
        <StructuredData />
      </head>
      <body className={`${inter.variable} ${notoSansSC.variable} font-sans antialiased bg-white dark:bg-black`}>
        <ThemeProvider>
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
