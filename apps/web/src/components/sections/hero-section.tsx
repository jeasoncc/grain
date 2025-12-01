"use client";

import { Download, Sparkles, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ScrollReveal } from "@/components/ui/scroll-reveal";

export function HeroSection() {
  return (
    <section className="relative overflow-hidden bg-white dark:bg-gray-900 min-h-screen flex items-center border-b border-gray-200 dark:border-gray-800">
      {/* Subtle background pattern */}
      <div className="absolute inset-0 opacity-[0.03] dark:opacity-[0.05]">
        <div className="absolute inset-0" style={{
          backgroundImage: `radial-gradient(circle at 1px 1px, currentColor 1px, transparent 0)`,
          backgroundSize: "32px 32px",
        }}></div>
      </div>

      <div className="container mx-auto px-4 py-20 md:py-32 relative z-10">
        <div className="text-center max-w-4xl mx-auto">
          {/* Badge */}
          <ScrollReveal direction="fade" delay={100}>
            <div className="inline-flex items-center gap-2 px-4 py-2 mb-8 bg-blue-50 dark:bg-blue-950/30 rounded-full text-blue-700 dark:text-blue-300 text-sm font-medium border border-blue-200 dark:border-blue-800">
              <Sparkles className="w-4 h-4" />
              <span>全新版本 v0.1.0 现已发布</span>
            </div>
          </ScrollReveal>

          {/* Main heading */}
          <ScrollReveal direction="up" delay={200}>
            <h1 className="text-6xl md:text-7xl lg:text-8xl font-black mb-6 leading-tight tracking-tight">
              <span className="text-gray-900 dark:text-white">
                Novel Editor
              </span>
            </h1>
          </ScrollReveal>

          {/* Description */}
          <ScrollReveal direction="up" delay={300}>
            <p className="text-lg md:text-xl text-gray-600 dark:text-gray-400 mb-12 max-w-2xl mx-auto leading-relaxed">
              Novel Editor 是一款基于{" "}
              <span className="font-semibold text-gray-900 dark:text-white">Tauri</span> 构建的跨平台桌面写作应用，
              <br className="hidden md:block" />
              专为长篇小说创作而设计。
            </p>
          </ScrollReveal>

          {/* CTA buttons */}
          <ScrollReveal direction="up" delay={400}>
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-16">
              <Button
                size="lg"
                className="text-lg px-8 py-6 h-auto bg-gray-900 dark:bg-white text-white dark:text-gray-900 hover:bg-gray-800 dark:hover:bg-gray-100 shadow-lg hover:shadow-xl transition-all duration-200"
                asChild
              >
                <Link href="#download">
                  <Download className="w-5 h-5 mr-2" />
                  立即下载
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Link>
              </Button>
              <Button
                variant="outline"
                size="lg"
                className="text-lg px-8 py-6 h-auto border-2 border-gray-900 dark:border-gray-100 text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-800 transition-all duration-200"
                asChild
              >
                <Link
                  href="https://github.com/yourusername/novel-editor"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  查看源码
                </Link>
              </Button>
            </div>
          </ScrollReveal>

          {/* Stats */}
          <ScrollReveal direction="up" delay={500}>
            <div className="grid grid-cols-3 gap-8 max-w-2xl mx-auto pt-12 border-t border-gray-200 dark:border-gray-800">
              <div>
                <div className="text-4xl md:text-5xl font-bold text-gray-900 dark:text-white mb-2">
                  10K+
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400 uppercase tracking-wide">
                  活跃用户
                </div>
              </div>
              <div>
                <div className="text-4xl md:text-5xl font-bold text-gray-900 dark:text-white mb-2">
                  100K+
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400 uppercase tracking-wide">
                  作品字数
                </div>
              </div>
              <div>
                <div className="text-4xl md:text-5xl font-bold text-gray-900 dark:text-white mb-2">
                  3
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400 uppercase tracking-wide">
                  支持平台
                </div>
              </div>
            </div>
          </ScrollReveal>
        </div>
      </div>
    </section>
  );
}
