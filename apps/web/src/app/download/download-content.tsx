"use client";

import { DownloadSection } from "@/components/sections/download-section";
import { Download, Sparkles, Zap, Shield, Globe, CheckCircle2 } from "lucide-react";
import { ScrollReveal } from "@/components/ui/scroll-reveal";
import { cn } from "@/lib/utils";

export function DownloadPageContent() {
  return (
    <div className="min-h-screen bg-white dark:bg-gray-900">
      {/* Hero Section - 极致精致版 */}
      <section className="py-24 md:py-36 border-b border-gray-200/50 dark:border-gray-800/50 bg-gradient-to-b from-white via-gray-50/40 to-white dark:from-gray-900 dark:via-gray-800/40 dark:to-gray-900 relative overflow-hidden">
        {/* 精致的背景装饰 - 极致多层次 */}
        <div className="absolute inset-0">
          {/* Primary grid pattern */}
          <div className="absolute inset-0 opacity-[0.02] dark:opacity-[0.04]">
            <div className="absolute inset-0" style={{
              backgroundImage: `linear-gradient(to right, currentColor 1px, transparent 1px), linear-gradient(to bottom, currentColor 1px, transparent 1px)`,
              backgroundSize: "64px 64px",
            }}></div>
          </div>
          {/* Subtle dot pattern overlay */}
          <div className="absolute inset-0 opacity-[0.015] dark:opacity-[0.03]">
            <div className="absolute inset-0" style={{
              backgroundImage: `radial-gradient(circle at 2px 2px, currentColor 1px, transparent 0)`,
              backgroundSize: "40px 40px",
            }}></div>
          </div>
          {/* Gradient overlay for depth */}
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-gray-50/40 dark:to-gray-800/30 pointer-events-none"></div>
          {/* Decorative floating elements - 更多层次 */}
          <div className="absolute top-0 left-0 w-80 h-80 bg-gray-100/6 dark:bg-gray-800/6 rounded-full blur-3xl animate-float-gentle"></div>
          <div className="absolute bottom-0 right-0 w-[500px] h-[500px] bg-gray-100/6 dark:bg-gray-800/6 rounded-full blur-3xl animate-float-gentle" style={{ animationDelay: "1s" }}></div>
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-gray-100/4 dark:bg-gray-800/4 rounded-full blur-3xl animate-breathe"></div>
          <div className="absolute top-1/4 right-1/4 w-56 h-56 bg-gray-100/5 dark:bg-gray-800/5 rounded-full blur-3xl animate-subtle-pulse"></div>
          <div className="absolute bottom-1/4 left-1/4 w-64 h-64 bg-gray-100/5 dark:bg-gray-800/5 rounded-full blur-3xl animate-subtle-pulse" style={{ animationDelay: "2s" }}></div>
        </div>

        <div className="container mx-auto px-4 relative z-10">
          <ScrollReveal>
            <div className="max-w-4xl mx-auto text-center">
              {/* 下载图标 - 极致精致版 */}
              <div className="inline-flex items-center justify-center w-28 h-28 rounded-full bg-gray-100 dark:bg-gray-800 mb-10 border-2 border-gray-300 dark:border-gray-700 relative group/icon shadow-xl hover:shadow-2xl transition-all duration-500">
                <Download className="w-14 h-14 text-gray-900 dark:text-white group-hover/icon:scale-110 group-hover/icon:-rotate-12 transition-all duration-500 relative z-10" />
                {/* 装饰性闪烁 - 增强 */}
                <div className="absolute -top-2 -right-2">
                  <Sparkles className="w-7 h-7 text-gray-600 dark:text-gray-400 animate-pulse" />
                </div>
                {/* 多层背景光晕 */}
                <div className="absolute inset-0 rounded-full bg-gray-200/60 dark:bg-gray-700/60 opacity-0 group-hover/icon:opacity-100 transition-opacity duration-500 blur-2xl"></div>
                <div className="absolute inset-0 rounded-full bg-gray-300/40 dark:bg-gray-600/40 opacity-0 group-hover/icon:opacity-100 transition-opacity duration-500 blur-xl -z-10" style={{ transitionDelay: "0.1s" }}></div>
                {/* 装饰性边框高光 */}
                <div className="absolute inset-0 rounded-full border-2 border-gray-400/0 dark:border-gray-500/0 group-hover/icon:border-gray-400/30 dark:group-hover/icon:border-gray-500/30 transition-all duration-500"></div>
              </div>
              
              {/* 标题 - 极致精致版 */}
              <h1 className="text-5xl md:text-6xl lg:text-7xl xl:text-8xl font-black mb-8 text-gray-900 dark:text-white tracking-tight relative inline-block group/title cursor-default">
                <span className="relative z-10 drop-shadow-[0_2px_8px_rgba(0,0,0,0.04)] dark:drop-shadow-[0_2px_8px_rgba(255,255,255,0.05)] transition-all duration-500 group-hover/title:drop-shadow-[0_4px_20px_rgba(0,0,0,0.1)] dark:group-hover/title:drop-shadow-[0_4px_20px_rgba(255,255,255,0.15)]">
                  下载 Novel Editor
                </span>
                {/* 多层文字光晕效果 - 增强 */}
                <span className="absolute inset-0 blur-2xl opacity-25 dark:opacity-12 bg-gray-900 dark:bg-white -z-10 group-hover/title:opacity-35 dark:group-hover/title:opacity-18 transition-opacity duration-500 animate-subtle-pulse"></span>
                <span className="absolute inset-0 blur-3xl opacity-12 dark:opacity-6 bg-gray-900 dark:bg-white -z-20"></span>
                <span className="absolute inset-0 blur-[60px] opacity-5 dark:opacity-3 bg-gray-900 dark:bg-white -z-30"></span>
                {/* 装饰线条 - 增强 */}
                <span className="absolute -bottom-4 left-1/2 -translate-x-1/2 w-40 h-1 bg-gradient-to-r from-transparent via-gray-400 dark:via-gray-600 to-transparent opacity-0 group-hover/title:opacity-100 transition-all duration-500 group-hover/title:w-52 rounded-full"></span>
                {/* 装饰点 - 增强 */}
                <span className="absolute -bottom-6 left-1/2 -translate-x-1/2 w-2 h-2 rounded-full bg-gray-400 dark:bg-gray-600 opacity-0 group-hover/title:opacity-100 transition-all duration-500 group-hover/title:scale-150 shadow-lg"></span>
                {/* 额外装饰点 */}
                <span className="absolute -bottom-7 left-1/2 -translate-x-1/2 -ml-3 w-1 h-1 rounded-full bg-gray-400 dark:bg-gray-600 opacity-0 group-hover/title:opacity-70 transition-all duration-500 group-hover/title:scale-125"></span>
                <span className="absolute -bottom-7 left-1/2 -translate-x-1/2 ml-3 w-1 h-1 rounded-full bg-gray-400 dark:bg-gray-600 opacity-0 group-hover/title:opacity-70 transition-all duration-500 group-hover/title:scale-125"></span>
              </h1>
              
              {/* 描述 - 增强版 */}
              <p className="text-xl md:text-2xl lg:text-3xl text-gray-600 dark:text-gray-400 leading-relaxed font-light mb-12 max-w-3xl mx-auto">
                选择适合你的平台，立即开始创作之旅
              </p>
              
              {/* 特性标签 - 极致精致版 */}
              <div className="flex flex-wrap items-center justify-center gap-5">
                {[
                  { icon: Zap, text: "免费开源", color: "green", delay: "0s" },
                  { icon: Globe, text: "跨平台支持", color: "blue", delay: "0.1s" },
                  { icon: Shield, text: "最新版本", color: "purple", delay: "0.2s", dynamic: true },
                ].map((item, index) => (
                  <div
                    key={index}
                    className={cn(
                      "inline-flex items-center gap-2.5 px-6 py-3 rounded-full border-2 transition-all duration-300 group/tag cursor-default",
                      "bg-gray-100 dark:bg-gray-800 border-gray-200 dark:border-gray-700",
                      "hover:border-gray-300 dark:hover:border-gray-600 hover:shadow-lg hover:scale-110 hover:-translate-y-1"
                    )}
                    style={{ animationDelay: item.delay }}
                  >
                    <div className={cn(
                      "relative flex items-center justify-center",
                      item.color === "green" && "text-green-600 dark:text-green-400",
                      item.color === "blue" && "text-blue-600 dark:text-blue-400",
                      item.color === "purple" && "text-purple-600 dark:text-purple-400"
                    )}>
                      <item.icon className="w-5 h-5 group-hover/tag:scale-110 transition-transform duration-300" />
                      <span className={cn(
                        "absolute inset-0 rounded-full blur-md opacity-0 group-hover/tag:opacity-60 transition-opacity duration-300",
                        item.color === "green" && "bg-green-500",
                        item.color === "blue" && "bg-blue-500",
                        item.color === "purple" && "bg-purple-500"
                      )}></span>
                    </div>
                    <span className="text-sm font-semibold text-gray-700 dark:text-gray-300 group-hover/tag:text-gray-900 dark:group-hover/tag:text-white transition-colors duration-300">
                      {item.text}
                    </span>
                    {/* 装饰性对勾 */}
                    <CheckCircle2 className={cn(
                      "w-4 h-4 opacity-0 group-hover/tag:opacity-100 transition-opacity duration-300",
                      item.color === "green" && "text-green-600 dark:text-green-400",
                      item.color === "blue" && "text-blue-600 dark:text-blue-400",
                      item.color === "purple" && "text-purple-600 dark:text-purple-400"
                    )} />
                  </div>
                ))}
              </div>
            </div>
          </ScrollReveal>
        </div>
      </section>

      {/* Download Section */}
      <DownloadSection hideHeader />
    </div>
  );
}
