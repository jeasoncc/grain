"use client";

import { FileText, Home, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export function NotFoundContent() {
  return (
    <div className="min-h-screen bg-white dark:bg-black flex items-center justify-center px-4">
      <div className="text-center max-w-2xl mx-auto">
        {/* 404 Number */}
        <div className="mb-8">
          <h1 className="text-9xl md:text-[12rem] font-black text-gray-900 dark:text-white leading-none tracking-tight relative inline-block">
            404
            <span className="absolute inset-0 blur-2xl opacity-20 bg-gray-900 dark:bg-white -z-10"></span>
          </h1>
        </div>

        {/* Icon */}
        <div className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-gray-100 dark:bg-gray-800 mb-8 border-2 border-gray-300 dark:border-gray-700">
          <FileText className="w-12 h-12 text-gray-900 dark:text-white" />
        </div>

        {/* Message */}
        <h2 className="text-3xl md:text-4xl font-bold mb-4 text-gray-900 dark:text-white">
          页面未找到
        </h2>
        <p className="text-lg text-gray-600 dark:text-gray-300 mb-8 leading-relaxed">
          抱歉，您访问的页面不存在。可能已被移动或删除。
        </p>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Button size="lg" asChild>
            <Link href="/" className="flex items-center">
              <Home className="w-5 h-5 mr-2" />
              返回首页
            </Link>
          </Button>
          <Button variant="outline" size="lg" onClick={() => window.history.back()}>
            <ArrowLeft className="w-5 h-5 mr-2" />
            返回上一页
          </Button>
        </div>

        {/* Helpful Links */}
        <div className="mt-12 pt-8 border-t border-gray-200 dark:border-gray-800">
          <p className="text-sm text-gray-500 dark:text-gray-300 mb-4">可能需要的内容：</p>
          <div className="flex flex-wrap gap-4 justify-center">
            <Link
              href="/download"
              className="text-sm text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white transition"
            >
              下载
            </Link>
            <Link
              href="/docs"
              className="text-sm text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white transition"
            >
              文档
            </Link>
            <Link
              href="/about"
              className="text-sm text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white transition"
            >
              关于
            </Link>
            <Link
              href="https://github.com/jeasoncc/novel-editor"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white transition"
            >
              GitHub
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}








