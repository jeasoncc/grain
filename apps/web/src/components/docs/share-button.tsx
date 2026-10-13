"use client";

import { useState, useSyncExternalStore } from "react";
import { Share2, Check, Link as LinkIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useDocPathname } from "./hooks/use-doc-pathname";

const subscribeToShareAPI = () => () => {};
const getShareAPISnapshot = () => typeof navigator.share === "function";
const getServerShareAPISnapshot = () => false;

export function ShareButton() {
  const pathname = useDocPathname();
  const [copied, setCopied] = useState(false);

  const hasShareAPI = useSyncExternalStore(
    subscribeToShareAPI, getShareAPISnapshot, getServerShareAPISnapshot
  );

  const handleShare = async () => {
    const shareUrl = `${window.location.origin}${pathname}${window.location.hash}`;
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
      await handleCopy(shareUrl);
    }
  };

  const handleCopy = async (shareUrl: string) => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("复制失败:", err);
    }
  };

  if (pathname === "/docs") return null;

  return (
    <Button
      onClick={handleShare}
      variant="ghost"
      size="sm"
      className={cn(
        "h-8 w-8 sm:w-auto shrink-0 flex items-center justify-center gap-2 p-0 sm:px-2",
        "hover:bg-gray-100 dark:hover:bg-gray-800",
        "text-gray-600 dark:text-gray-400"
      )}
      aria-label={copied ? "已复制链接" : "分享或复制链接"}
      title={hasShareAPI ? "分享当前页面" : "复制链接"}
    >
      {copied ? (
        <>
          <Check className="w-4 h-4 text-green-600 dark:text-green-400" />
          <span className="text-sm hidden sm:inline">已复制</span>
        </>
      ) : (
        <>
          {hasShareAPI ? (
            <Share2 className="w-4 h-4" />
          ) : (
            <LinkIcon className="w-4 h-4" />
          )}
          <span className="text-sm hidden sm:inline">
            {hasShareAPI ? "分享" : "复制链接"}
          </span>
        </>
      )}
    </Button>
  );
}









