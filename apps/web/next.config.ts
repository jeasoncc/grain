import type { NextConfig } from "next";

// 静态导出配置 - 用于部署到 nginx
const nextConfig: NextConfig = {
  // 启用静态导出
  output: "export",
  // 输出目录设为 dist（默认是 out）
  distDir: "dist",
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
  reactStrictMode: false, // 暂时禁用严格模式以避免构建错误
  // 实验性功能（谨慎使用）
  experimental: {
    optimizePackageImports: ["lucide-react"],
  },
};

export default nextConfig;

