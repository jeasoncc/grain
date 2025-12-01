/**
 * GitHub API 相关工具函数
 */

export interface GitHubRelease {
  id: number;
  tag_name: string;
  name: string;
  published_at: string;
  body: string;
  assets: GitHubAsset[];
  prerelease: boolean;
  draft: boolean;
}

export interface GitHubAsset {
  id: number;
  name: string;
  browser_download_url: string;
  size: number;
  download_count: number;
  content_type: string;
}

export interface PlatformFile {
  name: string;
  url: string;
  size: number;
  downloadCount: number;
  extension: string;
  platform: "Linux" | "Windows" | "macOS";
  format: string;
}

const GITHUB_API_BASE = "https://api.github.com";
const REPO_OWNER = "jeasoncc";
const REPO_NAME = "novel-editor";

/**
 * 从 GitHub API 获取最新的 release
 */
export async function getLatestRelease(): Promise<GitHubRelease | null> {
  try {
    const response = await fetch(
      `${GITHUB_API_BASE}/repos/${REPO_OWNER}/${REPO_NAME}/releases/latest`,
      {
        headers: {
          Accept: "application/vnd.github.v3+json",
          "User-Agent": "Novel-Editor-Website",
        },
        next: { revalidate: 3600 }, // 缓存 1 小时
      }
    );

    if (!response.ok) {
      console.error("Failed to fetch GitHub release:", response.statusText);
      return null;
    }

    return await response.json();
  } catch (error) {
    console.error("Error fetching GitHub release:", error);
    return null;
  }
}

/**
 * 从 GitHub API 获取所有 releases
 */
export async function getAllReleases(): Promise<GitHubRelease[]> {
  try {
    const response = await fetch(
      `${GITHUB_API_BASE}/repos/${REPO_OWNER}/${REPO_NAME}/releases`,
      {
        headers: {
          Accept: "application/vnd.github.v3+json",
          "User-Agent": "Novel-Editor-Website",
        },
        next: { revalidate: 3600 }, // 缓存 1 小时
      }
    );

    if (!response.ok) {
      console.error("Failed to fetch GitHub releases:", response.statusText);
      return [];
    }

    const releases = await response.json();
    // 过滤掉草稿和预发布版本
    return releases.filter(
      (release: GitHubRelease) => !release.draft && !release.prerelease
    );
  } catch (error) {
    console.error("Error fetching GitHub releases:", error);
    return [];
  }
}

/**
 * 格式化文件大小
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i];
}

/**
 * 格式化下载数量
 */
export function formatDownloadCount(count: number): string {
  if (count >= 1000) {
    return `${(count / 1000).toFixed(1)}K+`;
  }
  return `${count}+`;
}

/**
 * 匹配平台和格式的文件
 */
export function matchPlatformFiles(
  assets: GitHubAsset[]
): Record<string, PlatformFile[]> {
  const platformFiles: Record<string, PlatformFile[]> = {
    Linux: [],
    Windows: [],
    macOS: [],
  };

  assets.forEach((asset) => {
    const name = asset.name.toLowerCase();
    const url = asset.browser_download_url;

    // Linux 文件匹配
    if (name.includes(".appimage")) {
      platformFiles.Linux.push({
        name: "AppImage",
        url,
        size: asset.size,
        downloadCount: asset.download_count,
        extension: ".AppImage",
        platform: "Linux",
        format: "AppImage",
      });
    } else if (name.includes(".deb")) {
      platformFiles.Linux.push({
        name: "DEB",
        url,
        size: asset.size,
        downloadCount: asset.download_count,
        extension: ".deb",
        platform: "Linux",
        format: "DEB",
      });
    } else if (name.includes(".rpm")) {
      platformFiles.Linux.push({
        name: "RPM",
        url,
        size: asset.size,
        downloadCount: asset.download_count,
        extension: ".rpm",
        platform: "Linux",
        format: "RPM",
      });
    }
    // Windows 文件匹配
    else if (name.includes(".msi")) {
      platformFiles.Windows.push({
        name: "MSI Installer",
        url,
        size: asset.size,
        downloadCount: asset.download_count,
        extension: ".msi",
        platform: "Windows",
        format: "MSI",
      });
    } else if (
      name.includes(".exe") &&
      (name.includes("portable") || name.includes("setup"))
    ) {
      const formatName = name.includes("portable")
        ? "Portable EXE"
        : "Installer EXE";
      platformFiles.Windows.push({
        name: formatName,
        url,
        size: asset.size,
        downloadCount: asset.download_count,
        extension: ".exe",
        platform: "Windows",
        format: formatName,
      });
    }
    // macOS 文件匹配
    else if (name.includes(".dmg")) {
      const formatName = name.includes("arm64") || name.includes("aarch64")
        ? "DMG (Apple Silicon)"
        : name.includes("intel") || name.includes("x64") || name.includes("x86")
        ? "DMG (Intel)"
        : "DMG";
      platformFiles.macOS.push({
        name: formatName,
        url,
        size: asset.size,
        downloadCount: asset.download_count,
        extension: ".dmg",
        platform: "macOS",
        format: formatName,
      });
    }
  });

  return platformFiles;
}

/**
 * 获取推荐的下载文件（通常是最常见的格式）
 */
export function getRecommendedFile(
  files: PlatformFile[]
): PlatformFile | null {
  if (files.length === 0) return null;

  // 优先级：AppImage > DEB > RPM (Linux)
  // MSI > EXE (Windows)
  // DMG (Apple Silicon) > DMG (Intel) > DMG (macOS)

  const priority = [
    "AppImage",
    "MSI Installer",
    "DMG (Apple Silicon)",
    "DEB",
    "DMG (Intel)",
    "Portable EXE",
    "Installer EXE",
    "RPM",
    "DMG",
  ];

  for (const format of priority) {
    const file = files.find((f) => f.name.includes(format));
    if (file) return file;
  }

  // 如果没有匹配到，返回第一个
  return files[0];
}


