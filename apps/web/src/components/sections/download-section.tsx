"use client";

import { useEffect, useState } from "react";
import { Download, Check, ArrowRight, TrendingUp, Users, Loader2, AlertCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PlatformIcon } from "@/components/ui/platform-icons";
import Link from "next/link";
import { SectionHeader } from "@/components/ui/section-header";
import { ScrollReveal } from "@/components/ui/scroll-reveal";
import { cn } from "@/lib/utils";

interface ReleaseFormat {
  name: string;
  extension: string;
  size: string;
  recommended: boolean;
  url: string;
  downloadCount?: number;
}

interface PlatformData {
  name: string;
  platform: "Linux" | "Windows" | "macOS";
  formats: ReleaseFormat[];
  version: string;
  downloadCount: string;
  description: string;
}

interface ReleaseResponse {
  version: string;
  name: string;
  publishedAt: string;
  platforms: {
    Linux: Array<{ name: string; url: string; size: string; extension: string; downloadCount: number }>;
    Windows: Array<{ name: string; url: string; size: string; extension: string; downloadCount: number }>;
    macOS: Array<{ name: string; url: string; size: string; extension: string; downloadCount: number }>;
  };
}

const requirements = [
  { platform: "Linux", req: "Ubuntu 20.04+, Fedora 34+, or equivalent" },
  { platform: "Windows", req: "Windows 10 64-bit or later" },
  { platform: "macOS", req: "macOS 11.0 (Big Sur) or later" },
];

interface DownloadSectionProps {
  hideHeader?: boolean;
}

function getRecommendedFormats(formats: ReleaseFormat[]): ReleaseFormat[] {
  // 只标记第一个格式为推荐（通常是最佳的格式）
  return formats.map((format, index) => {
    return { ...format, recommended: index === 0 };
  });
}

function formatDownloadCount(count: number): string {
  if (count >= 1000) {
    return `${(count / 1000).toFixed(1)}K+`;
  }
  return `${count}+`;
}

// 默认平台数据（作为后备）- 指向 GitHub Releases 页面
function getDefaultPlatforms(): PlatformData[] {
  return [
    {
      name: "Linux",
      platform: "Linux" as const,
      formats: [
        { name: "AppImage", extension: ".AppImage", size: "85 MB", recommended: true, url: "https://github.com/jeasoncc/novel-editor/releases/latest" },
        { name: "DEB", extension: ".deb", size: "82 MB", recommended: false, url: "https://github.com/jeasoncc/novel-editor/releases/latest" },
        { name: "RPM", extension: ".rpm", size: "84 MB", recommended: false, url: "https://github.com/jeasoncc/novel-editor/releases/latest" },
      ],
      version: "v0.1.0",
      downloadCount: "2.5K+",
      description: "适用于所有 Linux 发行版",
    },
    {
      name: "Windows",
      platform: "Windows" as const,
      formats: [
        { name: "MSI Installer", extension: ".msi", size: "88 MB", recommended: true, url: "https://github.com/jeasoncc/novel-editor/releases/latest" },
        { name: "Portable EXE", extension: ".exe", size: "87 MB", recommended: false, url: "https://github.com/jeasoncc/novel-editor/releases/latest" },
      ],
      version: "v0.1.0",
      downloadCount: "3.2K+",
      description: "Windows 10 及以上版本",
    },
    {
      name: "macOS",
      platform: "macOS" as const,
      formats: [
        { name: "DMG (Intel)", extension: ".dmg", size: "86 MB", recommended: true, url: "https://github.com/jeasoncc/novel-editor/releases/latest" },
        { name: "DMG (Apple Silicon)", extension: "-arm64.dmg", size: "83 MB", recommended: true, url: "https://github.com/jeasoncc/novel-editor/releases/latest" },
      ],
      version: "v0.1.0",
      downloadCount: "1.8K+",
      description: "支持 Intel 和 Apple Silicon",
    },
  ];
}

export function DownloadSection({ hideHeader = false }: DownloadSectionProps) {
  const [platforms, setPlatforms] = useState<PlatformData[]>(getDefaultPlatforms());
  const [latestVersion, setLatestVersion] = useState("v0.1.0");
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [totalDownloads, setTotalDownloads] = useState(7500);

  useEffect(() => {
    async function fetchReleaseData() {
      try {
        setIsLoading(true);
        setHasError(false);

        // 直接调用 GitHub API（因为使用了静态导出，无法使用 API Routes）
        const headers: HeadersInit = {
          Accept: "application/vnd.github.v3+json",
        };

        // 如果配置了 GitHub Token，使用它来提高速率限制
        // 注意：由于静态导出，Token 会暴露在客户端代码中
        // 建议只使用有 public_repo 权限的 Token
        const githubToken = process.env.NEXT_PUBLIC_GITHUB_TOKEN;
        if (githubToken) {
          headers.Authorization = `token ${githubToken}`;
        }

        const response = await fetch(
          "https://api.github.com/repos/jeasoncc/novel-editor/releases/latest",
          {
            headers,
            // 设置超时（通过 AbortController 或直接检查）
          }
        );

        // 处理 403 错误（可能是速率限制或仓库访问问题）
        if (response.status === 403) {
          console.warn("GitHub API rate limit or access denied. Using default data.");
          // 不抛出错误，直接使用默认数据
          setHasError(true);
          setPlatforms(getDefaultPlatforms());
          setIsLoading(false);
          return;
        }

        if (!response.ok) {
          console.warn(`GitHub API error: ${response.status} ${response.statusText}. Using default data.`);
          setHasError(true);
          setPlatforms(getDefaultPlatforms());
          setIsLoading(false);
          return;
        }

        const release = await response.json();

        if (!release || !release.assets || !Array.isArray(release.assets)) {
          throw new Error("No release or assets found");
        }

        // 匹配平台文件
        const platformFiles = {
          Linux: [] as Array<{ name: string; url: string; size: string; extension: string; downloadCount: number }>,
          Windows: [] as Array<{ name: string; url: string; size: string; extension: string; downloadCount: number }>,
          macOS: [] as Array<{ name: string; url: string; size: string; extension: string; downloadCount: number }>,
        };

        // 格式化文件大小
        const formatFileSize = (bytes: number): string => {
          if (bytes === 0) return "0 Bytes";
          const k = 1024;
          const sizes = ["Bytes", "KB", "MB", "GB"];
          const i = Math.floor(Math.log(bytes) / Math.log(k));
          return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i];
        };

        // 匹配文件
        release.assets.forEach((asset: any) => {
          const name = asset.name.toLowerCase();
          const url = asset.browser_download_url;

          if (name.includes(".appimage")) {
            platformFiles.Linux.push({
              name: "AppImage",
              url,
              size: formatFileSize(asset.size),
              extension: ".AppImage",
              downloadCount: asset.download_count || 0,
            });
          } else if (name.includes(".deb")) {
            platformFiles.Linux.push({
              name: "DEB",
              url,
              size: formatFileSize(asset.size),
              extension: ".deb",
              downloadCount: asset.download_count || 0,
            });
          } else if (name.includes(".rpm")) {
            platformFiles.Linux.push({
              name: "RPM",
              url,
              size: formatFileSize(asset.size),
              extension: ".rpm",
              downloadCount: asset.download_count || 0,
            });
          } else if (name.includes(".msi")) {
            platformFiles.Windows.push({
              name: "MSI Installer",
              url,
              size: formatFileSize(asset.size),
              extension: ".msi",
              downloadCount: asset.download_count || 0,
            });
          } else if (name.includes(".exe") && !name.includes(".msi")) {
            const formatName = name.includes("portable") ? "Portable EXE" : "Installer EXE";
            platformFiles.Windows.push({
              name: formatName,
              url,
              size: formatFileSize(asset.size),
              extension: ".exe",
              downloadCount: asset.download_count || 0,
            });
          } else if (name.includes(".dmg")) {
            const formatName = name.includes("arm64") || name.includes("aarch64")
              ? "DMG (Apple Silicon)"
              : name.includes("intel") || name.includes("x64") || name.includes("x86")
              ? "DMG (Intel)"
              : "DMG";
            platformFiles.macOS.push({
              name: formatName,
              url,
              size: formatFileSize(asset.size),
              extension: ".dmg",
              downloadCount: asset.download_count || 0,
            });
          }
        });

        // 去重和排序函数：每个格式只保留一个文件（优先保留下载量最多的）
        const deduplicateAndSort = (
          files: Array<{ name: string; url: string; size: string; extension: string; downloadCount: number }>,
          platform: "Linux" | "Windows" | "macOS"
        ) => {
          // 去重：相同格式只保留一个
          const fileMap = new Map<string, typeof files[0]>();
          
          files.forEach((file) => {
            const key = file.name; // 使用格式名称作为 key
            const existing = fileMap.get(key);
            
            // 如果已存在，保留下载量更多的（如果下载量相同，保留文件大小更小的）
            if (!existing) {
              fileMap.set(key, file);
            } else {
              // 优先保留下载量更多的
              if (file.downloadCount > existing.downloadCount) {
                fileMap.set(key, file);
              } else if (file.downloadCount === existing.downloadCount) {
                // 下载量相同，保留文件大小更小的
                const fileSize = parseFloat(file.size);
                const existingSize = parseFloat(existing.size);
                if (!isNaN(fileSize) && !isNaN(existingSize) && fileSize < existingSize) {
                  fileMap.set(key, file);
                }
              }
            }
          });
          
          // 定义排序优先级
          const getSortPriority = (name: string): number => {
            if (platform === "Linux") {
              if (name === "AppImage") return 1;
              if (name === "DEB") return 2;
              if (name === "RPM") return 3;
            } else if (platform === "Windows") {
              if (name === "MSI Installer") return 1;
              if (name === "Installer EXE") return 2;
              if (name === "Portable EXE") return 3;
            } else if (platform === "macOS") {
              if (name === "DMG (Apple Silicon)") return 1;
              if (name === "DMG (Intel)") return 2;
              if (name === "DMG") return 3;
            }
            return 999;
          };
          
          // 排序并返回
          return Array.from(fileMap.values()).sort(
            (a, b) => getSortPriority(a.name) - getSortPriority(b.name)
          );
        };

        // 去重和排序每个平台的文件
        platformFiles.Linux = deduplicateAndSort(platformFiles.Linux, "Linux");
        platformFiles.Windows = deduplicateAndSort(platformFiles.Windows, "Windows");
        platformFiles.macOS = deduplicateAndSort(platformFiles.macOS, "macOS");

        const data: ReleaseResponse = {
          version: release.tag_name,
          name: release.name,
          publishedAt: release.published_at,
          platforms: platformFiles,
        };
        
        // 更新版本号
        setLatestVersion(data.version);

        // 转换数据格式
        const newPlatforms: PlatformData[] = [
          {
            name: "Linux",
            platform: "Linux",
            formats: getRecommendedFormats(
              data.platforms.Linux.map((file) => ({
                name: file.name,
                extension: file.extension,
                size: file.size,
                recommended: false,
                url: file.url,
                downloadCount: file.downloadCount,
              }))
            ),
            version: data.version,
            downloadCount: formatDownloadCount(
              data.platforms.Linux.reduce((sum, f) => sum + (f.downloadCount || 0), 0)
            ),
            description: "适用于所有 Linux 发行版",
          },
          {
            name: "Windows",
            platform: "Windows",
            formats: getRecommendedFormats(
              data.platforms.Windows.map((file) => ({
                name: file.name,
                extension: file.extension,
                size: file.size,
                recommended: false,
                url: file.url,
                downloadCount: file.downloadCount,
              }))
            ),
            version: data.version,
            downloadCount: formatDownloadCount(
              data.platforms.Windows.reduce((sum, f) => sum + (f.downloadCount || 0), 0)
            ),
            description: "Windows 10 及以上版本",
          },
          {
            name: "macOS",
            platform: "macOS",
            formats: getRecommendedFormats(
              data.platforms.macOS.map((file) => ({
                name: file.name,
                extension: file.extension,
                size: file.size,
                recommended: false,
                url: file.url,
                downloadCount: file.downloadCount,
              }))
            ),
            version: data.version,
            downloadCount: formatDownloadCount(
              data.platforms.macOS.reduce((sum, f) => sum + (f.downloadCount || 0), 0)
            ),
            description: "支持 Intel 和 Apple Silicon",
          },
        ];

        // 计算总下载量
        const total = 
          data.platforms.Linux.reduce((sum, f) => sum + (f.downloadCount || 0), 0) +
          data.platforms.Windows.reduce((sum, f) => sum + (f.downloadCount || 0), 0) +
          data.platforms.macOS.reduce((sum, f) => sum + (f.downloadCount || 0), 0);

        setTotalDownloads(total);
        setPlatforms(newPlatforms);
      } catch (error) {
        // 静默处理错误，不输出到控制台（避免污染日志）
        // console.error("Error fetching release data:", error);
        setHasError(true);
        // 使用默认数据（指向 GitHub Releases 页面）
        setPlatforms(getDefaultPlatforms());
      } finally {
        setIsLoading(false);
      }
    }

    fetchReleaseData();
  }, []);

  return (
    <section
      className="py-16 md:py-24 bg-white dark:bg-gray-900 relative overflow-hidden"
    >
      {/* 精致的背景装饰 - 增强版 */}
      <div className="absolute inset-0">
        {/* Grid pattern */}
        <div className="absolute inset-0 opacity-[0.02] dark:opacity-[0.04]">
          <div className="absolute inset-0" style={{
            backgroundImage: `linear-gradient(90deg, transparent 0%, currentColor 50%, transparent 100%), linear-gradient(0deg, transparent 0%, currentColor 50%, transparent 100%)`,
            backgroundSize: "50px 50px",
          }}></div>
        </div>
        {/* Dot pattern */}
        <div className="absolute inset-0 opacity-[0.015] dark:opacity-[0.03]">
          <div className="absolute inset-0" style={{
            backgroundImage: `radial-gradient(circle at 2px 2px, currentColor 1px, transparent 0)`,
            backgroundSize: "40px 40px",
          }}></div>
        </div>
        {/* Floating elements */}
        <div className="absolute top-0 right-1/4 w-96 h-96 bg-gray-100/20 dark:bg-gray-800/20 rounded-full blur-3xl animate-pulse" style={{ animationDuration: "4s" }}></div>
        <div className="absolute bottom-0 left-1/4 w-96 h-96 bg-gray-100/20 dark:bg-gray-800/20 rounded-full blur-3xl animate-pulse" style={{ animationDuration: "5s", animationDelay: "1s" }}></div>
        <div className="absolute top-1/3 left-1/3 w-64 h-64 bg-gray-100/10 dark:bg-gray-800/10 rounded-full blur-3xl animate-float-gentle"></div>
      </div>

      <div className="container mx-auto px-4 relative z-10 max-w-7xl">
        {!hideHeader && (
          <ScrollReveal>
            <SectionHeader
              title="下载 Novel Editor"
              description="选择适合你的平台，立即开始创作之旅"
              subtitle="Download"
            />
          </ScrollReveal>
        )}

        {/* 加载状态或错误提示 */}
        {isLoading && (
          <div className="max-w-2xl mx-auto mb-8 text-center">
            <Card className="border-2 border-gray-200 dark:border-gray-800">
              <CardContent className="p-6 flex items-center justify-center gap-3">
                <Loader2 className="w-5 h-5 animate-spin text-gray-600 dark:text-gray-400" />
                <span className="text-gray-600 dark:text-gray-400">
                  正在获取最新版本信息...
                </span>
              </CardContent>
            </Card>
          </div>
        )}

        {hasError && !isLoading && (
          <div className="max-w-2xl mx-auto mb-8">
            <Card className="border-2 border-yellow-200 dark:border-yellow-800 bg-yellow-50 dark:bg-yellow-900/20">
              <CardContent className="p-4 flex items-center gap-3">
                <AlertCircle className="w-5 h-5 text-yellow-600 dark:text-yellow-400 flex-shrink-0" />
                <div className="flex-1">
                  <p className="text-sm text-yellow-800 dark:text-yellow-300">
                    无法从 GitHub API 获取最新版本信息（可能是速率限制或仓库尚未发布版本）。所有下载按钮将直接链接到{" "}
                    <a
                      href="https://github.com/jeasoncc/novel-editor/releases"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="underline hover:no-underline font-semibold"
                    >
                      GitHub Releases
                    </a>
                    {" "}页面。
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* 下载统计 - 精致设计增强版 */}
        <ScrollReveal direction="up" delay={hideHeader ? 0 : 100}>
          <div className="max-w-2xl mx-auto mb-16">
            <Card className="border-2 border-gray-200 dark:border-gray-800 shadow-lg hover:shadow-xl transition-all duration-300 relative overflow-hidden group/stats">
              {/* 多层装饰性背景 */}
              <div className="absolute top-0 right-0 w-40 h-40 bg-gray-100/10 dark:bg-gray-800/10 rounded-bl-full opacity-0 group-hover/stats:opacity-100 transition-opacity duration-500"></div>
              <div className="absolute bottom-0 left-0 w-32 h-32 bg-gray-100/5 dark:bg-gray-800/5 rounded-tr-full opacity-0 group-hover/stats:opacity-100 transition-opacity duration-500" style={{ transitionDelay: "0.1s" }}></div>
              
              {/* 渐变叠加 */}
              <div className="absolute inset-0 bg-gradient-to-br from-gray-50/0 via-transparent to-gray-100/0 dark:from-gray-800/0 dark:to-gray-900/0 opacity-0 group-hover/stats:opacity-100 group-hover/stats:from-gray-50/30 dark:group-hover/stats:from-gray-800/20 transition-all duration-500 pointer-events-none"></div>
              
              <CardContent className="p-8 relative z-10">
                <div className="flex items-center justify-center gap-12 flex-wrap">
                  <div className="flex items-center gap-4 group/item cursor-default">
                    <div className="relative">
                      <div className="w-16 h-16 rounded-xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center group-hover/item:scale-110 transition-transform duration-300 shadow-sm border border-gray-200/50 dark:border-gray-700/50">
                        <Users className="w-8 h-8 text-gray-700 dark:text-gray-300" />
                      </div>
                      {/* 装饰点 */}
                      <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-gray-900 dark:bg-white border-2 border-white dark:border-gray-900 shadow-sm"></div>
                      {/* 背景光晕 */}
                      <div className="absolute inset-0 rounded-xl bg-gray-200/50 dark:bg-gray-700/50 opacity-0 group-hover/item:opacity-100 transition-opacity duration-300 blur-lg -z-10"></div>
                    </div>
                    <div>
                      <div className="text-4xl font-black text-gray-900 dark:text-white mb-1">
                        {formatDownloadCount(totalDownloads)}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400 font-medium uppercase tracking-wider">总下载量</div>
                    </div>
                  </div>
                  <div className="w-px h-20 bg-gray-300 dark:bg-gray-700"></div>
                  <div className="flex items-center gap-4 group/item cursor-default">
                    <div className="relative">
                      <div className="w-16 h-16 rounded-xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center group-hover/item:scale-110 transition-transform duration-300 shadow-sm border border-gray-200/50 dark:border-gray-700/50">
                        <TrendingUp className="w-8 h-8 text-gray-700 dark:text-gray-300" />
                      </div>
                      <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-gray-900 dark:bg-white border-2 border-white dark:border-gray-900 shadow-sm"></div>
                      <div className="absolute inset-0 rounded-xl bg-gray-200/50 dark:bg-gray-700/50 opacity-0 group-hover/item:opacity-100 transition-opacity duration-300 blur-lg -z-10"></div>
                    </div>
                    <div>
                      <div className="text-4xl font-black text-gray-900 dark:text-white mb-1">持续增长</div>
                      <div className="text-xs text-gray-500 dark:text-gray-400 font-medium uppercase tracking-wider">用户增长</div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </ScrollReveal>

        {/* Platform cards - 增强版 */}
        <div className="grid md:grid-cols-3 gap-6 mb-16">
          {platforms.map((platform, index) => (
            <ScrollReveal key={platform.name} direction="up" delay={hideHeader ? index * 50 : index * 100}>
              <Card
                className={cn(
                  "relative group h-full flex flex-col transition-all duration-300 overflow-hidden",
                  "shadow-lg hover:shadow-2xl hover:-translate-y-2 border-2 border-gray-200 dark:border-gray-800",
                  "hover:border-gray-300 dark:hover:border-gray-700"
                )}
              >
                {/* 多层装饰性渐变层 */}
                <div className="absolute inset-0 bg-gradient-to-br from-gray-50/0 via-transparent to-gray-100/0 dark:from-gray-800/0 dark:to-gray-900/0 opacity-0 group-hover:opacity-100 group-hover:from-gray-50/50 dark:group-hover:from-gray-800/30 transition-all duration-500 pointer-events-none"></div>
                
                {/* 装饰性角落 - 增强 */}
                <div className="absolute top-0 right-0 w-32 h-32 bg-gray-100/10 dark:bg-gray-800/10 rounded-bl-full opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                <div className="absolute bottom-0 left-0 w-24 h-24 bg-gray-100/5 dark:bg-gray-800/5 rounded-tr-full opacity-0 group-hover:opacity-100 transition-opacity duration-500" style={{ transitionDelay: "0.1s" }}></div>
                

                <CardHeader className="text-center pb-4 pt-8 relative z-10">
                  {/* 平台图标 - 增强版 */}
                  <div className="flex justify-center mb-5">
                    <div className="relative">
                      <div className="w-24 h-24 group-hover:scale-110 group-hover:rotate-3 transition-all duration-300">
                        <PlatformIcon platform={platform.platform} />
                      </div>
                      {/* 图标背景光晕 */}
                      <div className="absolute inset-0 rounded-full bg-gray-200/50 dark:bg-gray-700/50 opacity-0 group-hover:opacity-100 transition-opacity duration-300 blur-2xl -z-10"></div>
                    </div>
                  </div>
                  
                  <CardTitle className="text-2xl font-bold mb-2 group-hover:text-gray-900 dark:group-hover:text-white transition-colors duration-300">
                    {platform.name}
                  </CardTitle>
                  
                  {platform.description && (
                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-4 leading-relaxed">
                      {platform.description}
                    </p>
                  )}
                  
                  <div className="flex items-center justify-center gap-3 flex-wrap">
                    <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-gray-100 dark:bg-gray-800 text-sm font-semibold text-gray-700 dark:text-gray-300 group-hover:bg-gray-200 dark:group-hover:bg-gray-700 transition-colors duration-300 border border-gray-200/50 dark:border-gray-700/50">
                      <span>{platform.version}</span>
                    </div>
                    {platform.downloadCount && (
                      <div className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-gray-900/5 dark:bg-white/5 border border-gray-200 dark:border-gray-700 text-xs font-bold text-gray-700 dark:text-gray-300 group-hover:border-gray-300 dark:group-hover:border-gray-600 transition-colors duration-300">
                        <Download className="w-3.5 h-3.5" />
                        <span>{platform.downloadCount}</span>
                      </div>
                    )}
                  </div>
                </CardHeader>

                <CardContent className="space-y-3 pb-6 relative z-10">
                  {platform.formats.length > 0 ? (
                    platform.formats.map((format) => (
                      <Button
                        key={format.name}
                        className={cn(
                          "w-full justify-between text-sm h-auto py-3.5 relative overflow-hidden group/btn transition-all duration-300",
                          format.recommended
                            ? "bg-gray-900 dark:bg-white text-white dark:text-gray-900 hover:bg-gray-800 dark:hover:bg-gray-100 shadow-md hover:shadow-lg border-2 border-transparent hover:border-gray-700 dark:hover:border-gray-200"
                            : "hover:shadow-sm border-2"
                        )}
                        variant={format.recommended ? "default" : "outline"}
                        asChild
                        disabled={!format.url}
                      >
                        {isLoading || !format.url ? (
                          <span className="flex items-center justify-center w-full gap-2 relative z-10">
                            <Loader2 className="w-4 h-4 animate-spin" />
                            <span>加载中...</span>
                          </span>
                        ) : (
                          <a
                            href={format.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center justify-between w-full gap-2 relative z-10"
                          >
                            {/* 闪烁效果 - 增强版 */}
                            {format.recommended && (
                              <>
                                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/15 to-transparent -translate-x-full group-hover/btn:translate-x-full transition-transform duration-700"></div>
                                <div className="absolute inset-0 bg-gradient-to-br from-white/10 via-transparent to-transparent opacity-0 group-hover/btn:opacity-100 transition-opacity duration-500"></div>
                              </>
                            )}
                            
                            <span className="flex items-center gap-2 min-w-0 flex-1">
                              <span className="font-semibold truncate">{format.name}</span>
                              {format.recommended && (
                                <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-white/25 dark:bg-gray-900/25 flex-shrink-0 font-bold border border-white/20 dark:border-gray-900/20">
                                  推荐
                                </span>
                              )}
                            </span>
                            <span className="flex items-center gap-2 flex-shrink-0">
                              <span className="text-xs opacity-90 font-medium">{format.size}</span>
                              <Download className={cn(
                                "w-4 h-4 flex-shrink-0 transition-all duration-300",
                                format.recommended 
                                  ? "group-hover/btn:translate-y-1 group-hover/btn:-translate-x-1 group-hover/btn:scale-110"
                                  : "group-hover/btn:translate-y-0.5 group-hover/btn:scale-105"
                              )} />
                            </span>
                          </a>
                        )}
                      </Button>
                    ))
                  ) : (
                    <div className="text-center py-4 text-gray-500 dark:text-gray-400 text-sm">
                      暂无可用下载
                    </div>
                  )}
                </CardContent>
              </Card>
            </ScrollReveal>
          ))}
        </div>

        {/* System requirements - 精致设计增强版 */}
        <ScrollReveal direction="up" delay={hideHeader ? 300 : 400}>
          <Card className="max-w-4xl mx-auto border-2 border-gray-200 dark:border-gray-800 shadow-lg hover:shadow-xl transition-shadow duration-300 relative overflow-hidden group/req">
            {/* 装饰性背景 */}
            <div className="absolute top-0 right-0 w-40 h-40 bg-gray-100/20 dark:bg-gray-800/20 rounded-bl-full opacity-0 group-hover/req:opacity-100 transition-opacity duration-500"></div>
            <div className="absolute bottom-0 left-0 w-32 h-32 bg-gray-100/10 dark:bg-gray-800/10 rounded-tr-full opacity-0 group-hover/req:opacity-100 transition-opacity duration-500" style={{ transitionDelay: "0.1s" }}></div>
            
            <CardHeader className="pb-4">
              <CardTitle className="text-xl flex items-center gap-3 relative z-10">
                <div className="w-12 h-12 rounded-xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center group-hover/req:scale-110 transition-transform duration-300 border border-gray-200/50 dark:border-gray-700/50 shadow-sm">
                  <Check className="w-6 h-6 text-gray-900 dark:text-white" />
                </div>
                <span className="font-bold">系统要求</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="relative z-10">
              <div className="grid md:grid-cols-3 gap-5">
                {requirements.map((req) => (
                  <div
                    key={req.platform}
                    className="group/item flex items-start gap-3 p-5 rounded-xl bg-gray-50 dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 hover:shadow-lg transition-all duration-300"
                  >
                    <div className="w-10 h-10 rounded-lg bg-gray-200 dark:bg-gray-700 flex items-center justify-center group-hover/item:bg-gray-300 dark:group-hover/item:bg-gray-600 transition-colors duration-300 flex-shrink-0 group-hover/item:scale-110 transition-transform duration-300 shadow-sm">
                      <Check className="w-5 h-5 text-gray-700 dark:text-gray-300" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-bold text-base text-gray-900 dark:text-white mb-1.5">
                        {req.platform}
                      </div>
                      <div className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                        {req.req}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </ScrollReveal>

        {/* 帮助链接 - 增强版 */}
        <ScrollReveal direction="up" delay={hideHeader ? 400 : 500}>
          <div className="max-w-3xl mx-auto mt-16 text-center">
            <div className="inline-flex items-center gap-3 px-8 py-4 rounded-full bg-gray-100 dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 hover:bg-gray-200 dark:hover:bg-gray-700 transition-all duration-300 hover:shadow-lg group/help">
              <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                需要帮助？
              </span>
              <a
                href="https://github.com/jeasoncc/novel-editor/issues"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-sm font-semibold text-gray-900 dark:text-white hover:underline group/link"
              >
                <span>查看文档</span>
                <ArrowRight className="w-4 h-4 group-hover/link:translate-x-1 transition-transform duration-300" />
              </a>
            </div>
          </div>
        </ScrollReveal>
      </div>
    </section>
  );
}
