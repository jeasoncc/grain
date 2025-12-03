"use client";

import { useState } from "react";
import { Share2, Check, Link as LinkIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { usePathname } from "next/navigation";

export function ShareButton() {
  const pathname = usePathname();
  const [copied, setCopied] = useState(false);

  const shareUrl = typeof window !== "undefined" 
    ? `${window.location.origin}${pathname}${window.location.hash}`
    : "";

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: document.title,
          url: shareUrl,
        });
      } catch (err) {
        // 用户取消分享，不处理错误
      }
    } else {
      // 回退到复制链接
      handleCopy();
    }
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("复制失败:", err);
    }
  };

  if (pathname === "/docs") return null;

  const hasShareAPI = typeof navigator !== 'undefined' && 'share' in navigator;

  return (
    <Button
      onClick={handleShare}
      variant="ghost"
      size="sm"
      className={cn(
        "fixed bottom-32 right-[calc(50%-32rem+1rem)] z-50 hidden xl:flex items-center gap-2",
        "bg-white dark:bg-black border border-gray-200 dark:border-gray-800 rounded-lg shadow-lg p-2",
        "hover:bg-gray-100 dark:hover:bg-gray-800",
        "text-gray-600 dark:text-gray-400"
      )}
      aria-label={copied ? "已复制链接" : "分享或复制链接"}
      title={hasShareAPI ? "分享当前页面" : "复制链接"}
    >
      {copied ? (
        <>
          <Check className="w-4 h-4 text-green-600 dark:text-green-400" />
          <span className="text-sm">已复制</span>
        </>
      ) : (
        <>
          {navigator.share ? (
            <Share2 className="w-4 h-4" />
          ) : (
            <LinkIcon className="w-4 h-4" />
          )}
          <span className="text-sm hidden lg:inline">
            {navigator.share ? "分享" : "复制链接"}
          </span>
        </>
      )}
    </Button>
  );
}


