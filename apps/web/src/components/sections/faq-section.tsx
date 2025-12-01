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
    <section className="py-24 md:py-32 bg-gradient-to-br from-gray-50 via-blue-50/30 to-purple-50/30 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-0 w-96 h-96 bg-blue-100/20 rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-purple-100/20 rounded-full blur-3xl"></div>
      </div>

      <div className="container mx-auto px-4 relative z-10">
        <ScrollReveal>
          <SectionHeader
            title="常见问题"
            description="解答你关于 Novel Editor 的疑问"
            subtitle="FAQ"
          >
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-r from-blue-100 to-purple-100 dark:from-blue-900/30 dark:to-purple-900/30 mb-4 mt-4">
              <HelpCircle className="w-8 h-8 text-blue-600 dark:text-blue-400" />
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
                    ? "border-blue-300 dark:border-blue-700 shadow-xl bg-white dark:bg-gray-900"
                    : "border-transparent hover:border-blue-200 dark:hover:border-blue-800 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm hover:shadow-lg"
                )}
                onClick={() => toggleFAQ(index)}
              >
                <CardContent className="p-0">
                  <button
                    className="w-full px-6 py-5 flex items-center justify-between text-left gap-4 hover:bg-gray-50/50 dark:hover:bg-gray-800/50 transition-colors"
                    aria-expanded={openIndex === index}
                  >
                    <span className="font-semibold text-gray-900 dark:text-white flex-1 text-lg">
                      {faq.question}
                    </span>
                    <ChevronDown
                      className={cn(
                        "w-5 h-5 text-gray-500 dark:text-gray-400 transition-all duration-300 flex-shrink-0",
                        openIndex === index && "transform rotate-180 text-blue-600 dark:text-blue-400"
                      )}
                    />
                  </button>
                  <div
                    className={cn(
                      "px-6 pb-5 transition-all duration-500 ease-out",
                      openIndex === index
                        ? "max-h-96 opacity-100"
                        : "max-h-0 opacity-0 overflow-hidden"
                    )}
                  >
                    <p className="text-gray-600 dark:text-gray-400 leading-relaxed text-base">
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
