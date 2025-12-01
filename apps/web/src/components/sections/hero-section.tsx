"use client";

import { Download, Sparkles, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ScrollReveal } from "@/components/ui/scroll-reveal";

export function HeroSection() {
  return (
    <section className="relative overflow-hidden bg-white dark:bg-gray-900 min-h-screen flex items-center border-b border-gray-200/50 dark:border-gray-800/50">
      {/* Elegant background pattern */}
      <div className="absolute inset-0">
        {/* Primary grid pattern */}
        <div className="absolute inset-0 opacity-[0.02] dark:opacity-[0.04]" style={{
          backgroundImage: `linear-gradient(to right, currentColor 1px, transparent 1px), linear-gradient(to bottom, currentColor 1px, transparent 1px)`,
          backgroundSize: "64px 64px",
        }}></div>
        {/* Subtle dot pattern overlay */}
        <div className="absolute inset-0 opacity-[0.015] dark:opacity-[0.03]" style={{
          backgroundImage: `radial-gradient(circle at 2px 2px, currentColor 1px, transparent 0)`,
          backgroundSize: "40px 40px",
        }}></div>
        {/* Gradient overlay for depth */}
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-gray-50/30 dark:to-gray-800/20 pointer-events-none"></div>
        {/* Decorative corner elements */}
        <div className="absolute top-0 left-0 w-64 h-64 bg-gray-100/5 dark:bg-gray-800/5 rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-gray-100/5 dark:bg-gray-800/5 rounded-full blur-3xl"></div>
      </div>

      <div className="container mx-auto px-4 py-20 md:py-32 relative z-10">
        <div className="text-center max-w-4xl mx-auto">
          {/* Badge */}
          <ScrollReveal direction="fade" delay={100}>
            <div className="inline-flex items-center gap-2.5 px-6 py-3 mb-12 bg-gray-100/90 dark:bg-gray-800/90 backdrop-blur-lg rounded-full text-gray-900 dark:text-white text-sm font-medium border border-gray-300/60 dark:border-gray-700/60 hover:border-gray-400 dark:hover:border-gray-600 transition-all duration-300 hover:scale-105 cursor-default shadow-[0_2px_8px_rgba(0,0,0,0.08)] dark:shadow-[0_2px_8px_rgba(255,255,255,0.05)] hover:shadow-[0_4px_12px_rgba(0,0,0,0.12)] dark:hover:shadow-[0_4px_12px_rgba(255,255,255,0.08)] relative overflow-hidden group/badge">
              {/* Subtle shine effect */}
              <div className="absolute inset-0 -translate-x-full group-hover/badge:translate-x-full transition-transform duration-1000 bg-gradient-to-r from-transparent via-white/20 to-transparent"></div>
              <Sparkles className="w-4 h-4 animate-pulse text-gray-700 dark:text-gray-300 relative z-10" />
              <span className="tracking-wide relative z-10">全新版本 v0.1.0 现已发布</span>
            </div>
          </ScrollReveal>

          {/* Main heading */}
          <ScrollReveal direction="up" delay={200}>
            <h1 className="text-6xl md:text-7xl lg:text-8xl xl:text-9xl font-black mb-8 leading-[0.95] tracking-[-0.04em] text-gray-900 dark:text-white relative inline-block">
              <span className="relative z-10 drop-shadow-[0_2px_8px_rgba(0,0,0,0.04)] dark:drop-shadow-[0_2px_8px_rgba(255,255,255,0.05)]">
                Novel Editor
              </span>
              {/* Subtle text glow */}
              <span className="absolute inset-0 blur-2xl opacity-20 dark:opacity-10 bg-gray-900 dark:bg-white -z-10"></span>
            </h1>
          </ScrollReveal>

          {/* Description */}
          <ScrollReveal direction="up" delay={300}>
            <p className="text-xl md:text-2xl text-gray-600 dark:text-gray-400 mb-16 max-w-3xl mx-auto leading-[1.7] font-light tracking-tight">
              Novel Editor 是一款基于{" "}
              <span className="font-semibold text-gray-900 dark:text-white relative inline-block">
                <span className="relative z-10">Tauri</span>
                <span className="absolute bottom-0 left-0 w-full h-0.5 bg-gray-900/20 dark:bg-white/20 rounded-full"></span>
              </span>{" "}
              构建的跨平台桌面写作应用，
              <br className="hidden md:block" />
              专为长篇小说创作而设计。
            </p>
          </ScrollReveal>

          {/* CTA buttons */}
          <ScrollReveal direction="up" delay={400}>
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-16">
              <Button
                size="lg"
                className="text-base px-10 py-7 h-auto bg-gray-900 dark:bg-white text-white dark:text-gray-900 hover:bg-gray-800 dark:hover:bg-gray-100 shadow-[0_4px_14px_rgba(0,0,0,0.15)] dark:shadow-[0_4px_14px_rgba(255,255,255,0.1)] hover:shadow-[0_8px_28px_rgba(0,0,0,0.2)] dark:hover:shadow-[0_8px_28px_rgba(255,255,255,0.15)] transition-all duration-300 rounded-xl font-semibold tracking-tight relative overflow-hidden group/btn before:absolute before:inset-0 before:bg-gradient-to-r before:from-white/0 before:via-white/10 before:to-white/0 before:-translate-x-full hover:before:translate-x-full before:transition-transform before:duration-700"
                asChild
              >
                <Link href="#download" className="relative z-10 flex items-center">
                  <Download className="w-5 h-5 mr-2 group-hover/btn:animate-bounce" />
                  <span>立即下载</span>
                  <ArrowRight className="w-5 h-5 ml-2 group-hover/btn:translate-x-1 transition-transform duration-300" />
                </Link>
              </Button>
              <Button
                variant="outline"
                size="lg"
                className="text-base px-10 py-7 h-auto border-2 border-gray-900 dark:border-gray-100 text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-800 transition-all duration-300 rounded-xl font-semibold tracking-tight backdrop-blur-sm"
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
            <div className="relative">
              {/* Decorative line */}
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-24 h-px bg-gradient-to-r from-transparent via-gray-300 dark:via-gray-700 to-transparent"></div>
              <div className="grid grid-cols-3 gap-12 max-w-3xl mx-auto pt-20">
                <div className="group cursor-default relative">
                  <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-gray-400 dark:bg-gray-600 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                  <div className="text-5xl md:text-6xl font-black text-gray-900 dark:text-white mb-3 transition-all duration-300 group-hover:scale-110 inline-block tracking-tight">
                    10K+
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-500 uppercase tracking-[0.15em] font-medium">
                    活跃用户
                  </div>
                </div>
                <div className="group cursor-default relative">
                  <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-gray-400 dark:bg-gray-600 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                  <div className="text-5xl md:text-6xl font-black text-gray-900 dark:text-white mb-3 transition-all duration-300 group-hover:scale-110 inline-block tracking-tight">
                    100K+
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-500 uppercase tracking-[0.15em] font-medium">
                    作品字数
                  </div>
                </div>
                <div className="group cursor-default relative">
                  <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-gray-400 dark:bg-gray-600 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                  <div className="text-5xl md:text-6xl font-black text-gray-900 dark:text-white mb-3 transition-all duration-300 group-hover:scale-110 inline-block tracking-tight">
                    3
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-500 uppercase tracking-[0.15em] font-medium">
                    支持平台
                  </div>
                </div>
              </div>
            </div>
          </ScrollReveal>
        </div>
      </div>
    </section>
  );
}
