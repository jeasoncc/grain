import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "export",
  images: {
    unoptimized: true,
  },
  // 压缩优化
  compress: true,
  // 生产环境优化
  poweredByHeader: false,
  // 优化重定向
  trailingSlash: false,
  // 优化构建
  reactStrictMode: true,
  // 优化字体加载
  optimizeFonts: true,
  // 实验性功能（谨慎使用）
  experimental: {
    optimizePackageImports: ["lucide-react"],
  },
};

export default nextConfig;
