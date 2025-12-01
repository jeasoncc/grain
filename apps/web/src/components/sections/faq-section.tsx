"use client";

import { useState } from "react";
import { ChevronDown, HelpCircle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { SectionHeader } from "@/components/ui/section-header";
import { ScrollReveal } from "@/components/ui/scroll-reveal";
import { cn } from "@/lib/utils";

const faqs = [
  {
    question: "Novel Editor 是免费的吗？",
    answer:
      "是的，Novel Editor 完全免费且开源。项目采用 MIT 许可证，你可以自由使用、修改和分发。",
  },
  {
    question: "支持哪些操作系统？",
    answer:
      "Novel Editor 支持 Linux（AppImage、DEB、RPM）、Windows（MSI、EXE）和 macOS（DMG）。",
  },
  {
    question: "数据存储在哪里？",
    answer:
      "所有数据都存储在本地 IndexedDB 数据库中，完全离线工作。你可以随时导出备份（JSON 或 ZIP 格式）。",
  },
  {
    question: "可以导出哪些格式？",
    answer:
      "目前支持导出为 Markdown 和 DOCX 格式。PDF 和 EPUB 格式正在开发中，将在未来版本推出。",
  },
  {
    question: "如何备份我的作品？",
    answer:
      "Novel Editor 提供每日自动备份功能，你也可以随时手动导出备份。备份文件采用 JSON 或 ZIP 格式，可以轻松恢复。",
  },
  {
    question: "支持云同步吗？",
    answer:
      "当前版本主要专注于离线体验。云同步功能正在路线图中，未来将支持多设备同步。",
  },
  {
    question: "如何搜索内容？",
    answer:
      "使用快捷键 Ctrl+Shift+F（或 Cmd+Shift+F）可以打开全局搜索，支持全文搜索场景、角色和世界观设定。",
  },
  {
    question: "可以在多个项目之间切换吗？",
    answer:
      "是的，你可以创建和管理多个项目，每个项目都是独立的，包含自己的章节、场景、角色和世界观数据。",
  },
];

export function FAQSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const toggleFAQ = (index: number) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  return (
    <section className="py-24 md:py-32 bg-gray-50 dark:bg-gray-900 relative overflow-hidden">
      {/* Subtle background pattern */}
      <div className="absolute inset-0">
        <div className="absolute inset-0 opacity-[0.02] dark:opacity-[0.04]">
          <div className="absolute inset-0" style={{
            backgroundImage: `radial-gradient(circle at 2px 2px, currentColor 1px, transparent 0)`,
            backgroundSize: "40px 40px",
          }}></div>
        </div>
        {/* Decorative background elements */}
        <div className="absolute top-0 right-1/4 w-96 h-96 bg-gray-200/20 dark:bg-gray-800/20 rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 left-1/4 w-96 h-96 bg-gray-200/20 dark:bg-gray-800/20 rounded-full blur-3xl"></div>
      </div>

      <div className="container mx-auto px-4 relative z-10">
        <ScrollReveal>
          <SectionHeader
            title="常见问题"
            description="解答你关于 Novel Editor 的疑问"
            subtitle="FAQ"
          >
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-200 dark:bg-gray-800 mb-4 mt-4 border-2 border-gray-300 dark:border-gray-700">
              <HelpCircle className="w-8 h-8 text-gray-900 dark:text-white" />
            </div>
          </SectionHeader>
        </ScrollReveal>

        <div className="max-w-4xl mx-auto space-y-4">
          {faqs.map((faq, index) => (
            <ScrollReveal key={index} direction="up" delay={index * 50}>
              <Card
                className={cn(
                  "overflow-hidden border-2 transition-all duration-300 cursor-pointer group",
                  openIndex === index
                    ? "border-gray-900 dark:border-gray-100 shadow-[0_8px_30px_rgba(0,0,0,0.12)] dark:shadow-[0_8px_30px_rgba(255,255,255,0.08)] bg-white dark:bg-gray-800 hover:-translate-y-1"
                    : "border-gray-200/80 dark:border-gray-700/80 hover:border-gray-400 dark:hover:border-gray-500 bg-white dark:bg-gray-800 hover:shadow-[0_8px_30px_rgba(0,0,0,0.08)] dark:hover:shadow-[0_8px_30px_rgba(255,255,255,0.05)] hover:-translate-y-1"
                )}
                onClick={() => toggleFAQ(index)}
              >
                <CardContent className="p-0">
                  <button
                    className="w-full px-8 py-6 flex items-center justify-between text-left gap-4 hover:bg-gray-50/50 dark:hover:bg-gray-700/30 transition-colors duration-300"
                    aria-expanded={openIndex === index}
                  >
                    <span className={cn(
                      "font-semibold flex-1 text-[17px] transition-colors duration-300 leading-snug",
                      openIndex === index 
                        ? "text-gray-900 dark:text-white" 
                        : "text-gray-700 dark:text-gray-300 group-hover:text-gray-900 dark:group-hover:text-white"
                    )}>
                      {faq.question}
                    </span>
                    <ChevronDown
                      className={cn(
                        "w-6 h-6 transition-all duration-500 flex-shrink-0",
                        openIndex === index 
                          ? "transform rotate-180 text-gray-900 dark:text-white scale-110" 
                          : "text-gray-500 dark:text-gray-400 group-hover:text-gray-700 dark:group-hover:text-gray-300"
                      )}
                    />
                  </button>
                  <div
                    className={cn(
                      "px-8 pb-6 transition-all duration-500 ease-out overflow-hidden",
                      openIndex === index
                        ? "max-h-96 opacity-100 translate-y-0"
                        : "max-h-0 opacity-0 -translate-y-2"
                    )}
                  >
                    <p className="text-gray-600 dark:text-gray-400 leading-[1.8] text-[15px] pt-1 font-light">
                      {faq.answer}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </ScrollReveal>
          ))}
        </div>
      </div>
    </section>
  );
}
