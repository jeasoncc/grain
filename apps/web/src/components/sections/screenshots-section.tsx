"use client";

import { useState, useEffect, useCallback } from "react";
import { ChevronLeft, ChevronRight, ZoomIn } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { SectionHeader } from "@/components/ui/section-header";
import { ScrollReveal } from "@/components/ui/scroll-reveal";
import { cn } from "@/lib/utils";

const screenshots = [
  {
    id: 1,
    title: "主界面概览",
    description: "Novel Editor 的主界面，展示清晰的工作区和导航结构",
    image: "https://s3.bmp.ovh/imgs/2025/12/01/17e3f22342be954f.png",
  },
  {
    id: 2,
    title: "编辑器界面",
    description: "基于 Lexical 的富文本编辑器，专注写作体验",
    image: "https://s3.bmp.ovh/imgs/2025/12/01/20c87f8ef08b246d.png",
  },
  {
    id: 3,
    title: "项目结构管理",
    description: "清晰的项目结构管理，章节和场景一目了然",
    image: "https://s3.bmp.ovh/imgs/2025/12/01/bf66d94d3437b2ca.png",
  },
  {
    id: 4,
    title: "角色数据库",
    description: "完整的角色数据库，管理所有角色信息",
    image: "https://s3.bmp.ovh/imgs/2025/12/01/475d821e07f6da84.png",
  },
  {
    id: 5,
    title: "全局搜索功能",
    description: "快速全文搜索，支持关键词高亮和智能排序",
    image: "https://s3.bmp.ovh/imgs/2025/12/01/3710d1e5c3a47685.png",
  },
  {
    id: 6,
    title: "写作统计",
    description: "实时字数统计和进度追踪，帮助保持创作习惯",
    image: "https://s3.bmp.ovh/imgs/2025/12/01/7c4377d0097cb6be.png",
  },
  {
    id: 7,
    title: "命令面板",
    description: "快捷键快速打开命令面板，通过键盘快速导航和操作",
    image: "https://s3.bmp.ovh/imgs/2025/12/01/31c3608d53316a7a.png",
  },
  {
    id: 8,
    title: "主题设置",
    description: "多种内置主题，支持暗色模式，可自定义颜色和字体",
    image: "https://s3.bmp.ovh/imgs/2025/12/01/6cf5cfba91c98787.png",
  },
  {
    id: 9,
    title: "数据导出",
    description: "支持导出为多种格式，方便分享和备份",
    image: "https://s3.bmp.ovh/imgs/2025/12/01/4e2692b6efb38ade.png",
  },
];

export function ScreenshotsSection() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isImageLoaded, setIsImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);

  const currentScreenshot = screenshots[currentIndex];

  const changeScreenshot = useCallback((newIndex: number) => {
    setIsImageLoaded(false);
    setImageError(false);
    setCurrentIndex(newIndex);
  }, []);

  const nextScreenshot = () => {
    changeScreenshot((currentIndex + 1) % screenshots.length);
  };

  const prevScreenshot = () => {
    changeScreenshot((currentIndex - 1 + screenshots.length) % screenshots.length);
  };

  const handleImageLoad = () => {
    setIsImageLoaded(true);
  };

  const handleImageError = () => {
    setImageError(true);
    setIsImageLoaded(true);
  };

  // Reset loading state when screenshot changes
  useEffect(() => {
    setIsImageLoaded(false);
    setImageError(false);
  }, [currentIndex]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") {
        changeScreenshot((currentIndex - 1 + screenshots.length) % screenshots.length);
      } else if (e.key === "ArrowRight") {
        changeScreenshot((currentIndex + 1) % screenshots.length);
      }
    };

    window.addEventListener("keydown", handleKeyPress);
    return () => window.removeEventListener("keydown", handleKeyPress);
  }, [currentIndex, changeScreenshot]);

  return (
    <section className="py-24 md:py-32 bg-white dark:bg-gray-900 relative overflow-hidden">
      {/* Subtle background pattern */}
      <div className="absolute inset-0 opacity-[0.02] dark:opacity-[0.04]">
        <div className="absolute inset-0" style={{
          backgroundImage: `linear-gradient(90deg, transparent 0%, currentColor 50%, transparent 100%), linear-gradient(0deg, transparent 0%, currentColor 50%, transparent 100%)`,
          backgroundSize: "50px 50px",
        }}></div>
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
            <Card className="relative overflow-hidden group border-2 border-gray-200 dark:border-gray-700 shadow-xl hover:shadow-2xl transition-all duration-300">
              <div className="aspect-video bg-gray-100 dark:bg-gray-800 relative border-b border-gray-200 dark:border-gray-700">
                {/* Loading placeholder */}
                {!isImageLoaded && !imageError && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-center p-8">
                      <div className="inline-block w-16 h-16 border-4 border-gray-300 dark:border-gray-600 border-t-gray-900 dark:border-t-white rounded-full animate-spin mb-4"></div>
                      <p className="text-sm text-gray-500 dark:text-gray-400">加载中...</p>
                    </div>
                  </div>
                )}

                {/* Error placeholder */}
                {imageError && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-center p-8">
                      <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gray-200 dark:bg-gray-700 mb-6 border-2 border-gray-300 dark:border-gray-600">
                        <ZoomIn className="w-10 h-10 text-gray-400 dark:text-gray-500" />
                      </div>
                      <p className="text-lg text-gray-600 dark:text-gray-400">图片加载失败</p>
                    </div>
                  </div>
                )}

                {/* Actual screenshot image */}
                <img
                  src={currentScreenshot.image}
                  alt={currentScreenshot.title}
                  onLoad={handleImageLoad}
                  onError={handleImageError}
                  className={cn(
                    "w-full h-full object-contain transition-opacity duration-500",
                    isImageLoaded && !imageError ? "opacity-100" : "opacity-0 absolute"
                  )}
                  loading="lazy"
                />

                {/* Navigation arrows */}
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute left-4 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-all duration-300 bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm hover:bg-white dark:hover:bg-gray-900 shadow-lg hover:scale-110 z-10"
                  onClick={prevScreenshot}
                  aria-label="上一张"
                >
                  <ChevronLeft className="w-6 h-6" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute right-4 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-all duration-300 bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm hover:bg-white dark:hover:bg-gray-900 shadow-lg hover:scale-110 z-10"
                  onClick={nextScreenshot}
                  aria-label="下一张"
                >
                  <ChevronRight className="w-6 h-6" />
                </Button>

                {/* Screenshot info overlay */}
                {isImageLoaded && !imageError && (
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 via-black/40 to-transparent p-6 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    <h3 className="text-white font-semibold text-lg mb-1">
                      {currentScreenshot.title}
                    </h3>
                    <p className="text-white/90 text-sm">
                      {currentScreenshot.description}
                    </p>
                  </div>
                )}
              </div>

              {/* Screenshot title and description */}
              <div className="p-6">
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                  {currentScreenshot.title}
                </h3>
                <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
                  {currentScreenshot.description}
                </p>
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
                onClick={() => changeScreenshot(index)}
                className={cn(
                  "flex-shrink-0 w-32 h-20 rounded-lg overflow-hidden border-2 transition-all duration-300 relative group/thumb",
                  currentIndex === index
                    ? "border-gray-900 dark:border-white ring-2 ring-gray-900/20 dark:ring-white/20 shadow-lg scale-105"
                    : "border-gray-200 dark:border-gray-700 hover:border-gray-400 dark:hover:border-gray-500 hover:scale-102"
                )}
                aria-label={`查看 ${screenshot.title}`}
              >
                <img
                  src={screenshot.image}
                  alt={screenshot.title}
                  className={cn(
                    "w-full h-full object-cover transition-all duration-300",
                    currentIndex === index
                      ? "brightness-100"
                      : "brightness-75 group-hover/thumb:brightness-100"
                  )}
                  loading="lazy"
                />
                {/* Selected indicator */}
                {currentIndex === index && (
                  <div className="absolute inset-0 border-2 border-gray-900 dark:border-white rounded-lg pointer-events-none"></div>
                )}
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
