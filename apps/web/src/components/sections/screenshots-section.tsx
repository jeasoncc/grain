"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight, Image as ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { SectionHeader } from "@/components/ui/section-header";
import { ScrollReveal } from "@/components/ui/scroll-reveal";
import { cn } from "@/lib/utils";

// 占位截图 - 实际使用时替换为真实截图
const screenshots = [
  {
    id: 1,
    title: "沉浸式编辑器",
    description: "基于 Lexical 的富文本编辑器，专注写作体验",
    image: "/screenshots/editor.png",
    placeholder: "编辑器界面",
  },
  {
    id: 2,
    title: "树形大纲视图",
    description: "清晰的项目结构管理，章节和场景一目了然",
    image: "/screenshots/outline.png",
    placeholder: "大纲视图",
  },
  {
    id: 3,
    title: "角色管理",
    description: "完整的角色数据库，管理所有角色信息",
    image: "/screenshots/characters.png",
    placeholder: "角色管理",
  },
  {
    id: 4,
    title: "全局搜索",
    description: "快速全文搜索，支持关键词高亮",
    image: "/screenshots/search.png",
    placeholder: "全局搜索",
  },
  {
    id: 5,
    title: "写作统计",
    description: "实时字数统计和进度追踪",
    image: "/screenshots/statistics.png",
    placeholder: "统计面板",
  },
];

export function ScreenshotsSection() {
  const [currentIndex, setCurrentIndex] = useState(0);

  const nextScreenshot = () => {
    setCurrentIndex((prev) => (prev + 1) % screenshots.length);
  };

  const prevScreenshot = () => {
    setCurrentIndex((prev) => (prev - 1 + screenshots.length) % screenshots.length);
  };

  return (
    <section className="py-24 md:py-32 bg-gradient-to-br from-gray-50 to-white dark:from-gray-900 dark:to-gray-800 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 right-0 w-96 h-96 bg-blue-100/20 dark:bg-blue-900/10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-1/4 left-0 w-96 h-96 bg-purple-100/20 dark:bg-purple-900/10 rounded-full blur-3xl"></div>
      </div>

      <div className="container mx-auto px-4 relative z-10">
        <ScrollReveal>
          <SectionHeader
            title="应用截图"
            description="一睹 Novel Editor 的界面设计和功能布局"
            subtitle="Screenshots"
          />
        </ScrollReveal>

        {/* Main screenshot display */}
        <div className="max-w-6xl mx-auto mb-12">
          <ScrollReveal direction="up" delay={200}>
            <Card className="relative overflow-hidden group border-2 border-gray-200/50 dark:border-gray-800/50 shadow-2xl">
              <div className="aspect-video bg-gradient-to-br from-gray-100 via-blue-50/50 to-purple-50/50 dark:from-gray-800 dark:via-blue-950/20 dark:to-purple-950/20 flex items-center justify-center relative">
                {/* Placeholder for screenshot */}
                <div className="text-center p-8">
                  <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-r from-blue-100 to-purple-100 dark:from-blue-900/30 dark:to-purple-900/30 mb-6">
                    <ImageIcon className="w-10 h-10 text-blue-600 dark:text-blue-400" />
                  </div>
                  <p className="text-2xl font-bold text-gray-800 dark:text-gray-200 mb-3">
                    {screenshots[currentIndex].title}
                  </p>
                  <p className="text-lg text-gray-600 dark:text-gray-400 mb-4">
                    {screenshots[currentIndex].description}
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-500 inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gray-100 dark:bg-gray-800">
                    💡 提示：添加实际截图以替换占位符
                  </p>
                </div>

                {/* Navigation arrows */}
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute left-4 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-all duration-300 bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm hover:bg-white dark:hover:bg-gray-900 shadow-lg hover:scale-110"
                  onClick={prevScreenshot}
                  aria-label="上一张"
                >
                  <ChevronLeft className="w-6 h-6" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute right-4 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-all duration-300 bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm hover:bg-white dark:hover:bg-gray-900 shadow-lg hover:scale-110"
                  onClick={nextScreenshot}
                  aria-label="下一张"
                >
                  <ChevronRight className="w-6 h-6" />
                </Button>
              </div>
            </Card>
          </ScrollReveal>
        </div>

        {/* Screenshot thumbnails */}
        <ScrollReveal direction="up" delay={400}>
          <div className="flex justify-center gap-4 overflow-x-auto pb-4 max-w-6xl mx-auto scrollbar-hide">
            {screenshots.map((screenshot, index) => (
              <button
                key={screenshot.id}
                onClick={() => setCurrentIndex(index)}
                className={cn(
                  "flex-shrink-0 w-32 h-20 rounded-lg overflow-hidden border-2 transition-all duration-300",
                  currentIndex === index
                    ? "border-blue-600 dark:border-blue-400 ring-2 ring-blue-600/20 dark:ring-blue-400/20 shadow-lg scale-105"
                    : "border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 hover:scale-102"
                )}
                aria-label={`查看 ${screenshot.title}`}
              >
                <div className={cn(
                  "w-full h-full flex items-center justify-center transition-all",
                  currentIndex === index
                    ? "bg-gradient-to-br from-blue-100 to-purple-100 dark:from-blue-900/30 dark:to-purple-900/30"
                    : "bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-700"
                )}>
                  <span className={cn(
                    "text-2xl font-bold transition-colors",
                    currentIndex === index
                      ? "text-blue-600 dark:text-blue-400"
                      : "text-gray-400 dark:text-gray-600"
                  )}>
                    {index + 1}
                  </span>
                </div>
              </button>
            ))}
          </div>
        </ScrollReveal>

        {/* Screenshot info */}
        <ScrollReveal direction="up" delay={500}>
          <div className="text-center mt-8">
            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
              {currentIndex + 1} / {screenshots.length}
            </p>
          </div>
        </ScrollReveal>
      </div>
    </section>
  );
}
