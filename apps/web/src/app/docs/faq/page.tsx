"use client";

import { HelpCircle, ChevronDown } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollReveal } from "@/components/ui/scroll-reveal";
import { useState } from "react";
import { cn } from "@/lib/utils";

const faqs = [
  {
    question: "Novel Editor 是免费的吗？",
    answer: "是的，Novel Editor 是完全免费和开源的。它基于 MIT 许可证发布，你可以自由使用、修改和分发。",
  },
  {
    question: "支持哪些操作系统？",
    answer: "Novel Editor 支持 Linux、Windows 和 macOS。每个平台都提供相应的安装包，你可以在下载页面找到适合你系统的版本。",
  },
  {
    question: "我的数据安全吗？",
    answer: "所有数据都存储在本地，使用 IndexedDB 数据库。你的创作内容完全离线保存，不会上传到任何服务器。你还可以手动导出备份。",
  },
  {
    question: "可以导出为哪些格式？",
    answer: "目前支持导出为 Markdown 和 DOCX 格式。PDF 和 EPUB 导出功能正在开发中，将在未来版本中提供。",
  },
  {
    question: "如何备份我的项目？",
    answer: "你可以通过「文件」→「导出」功能手动导出项目。项目会以 JSON 或 ZIP 格式保存，你可以在任何地方备份这些文件。",
  },
  {
    question: "支持中文输入吗？",
    answer: "完全支持！Novel Editor 对中文进行了优化，包括中文字体渲染和输入体验。",
  },
  {
    question: "可以自定义主题吗？",
    answer: "是的，Novel Editor 支持多种内置主题，包括暗色模式。你还可以在设置中调整颜色和字体偏好。",
  },
  {
    question: "如何贡献代码？",
    answer: "欢迎贡献！你可以查看贡献指南了解如何参与。我们接受代码、文档、反馈等所有形式的贡献。",
  },
];

function FAQItem({
  question,
  answer,
  index,
}: {
  question: string;
  answer: string;
  index: number;
}) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <ScrollReveal direction="up" delay={index * 50}>
      <Card className="overflow-hidden">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="w-full p-6 text-left flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
        >
          <span className="font-semibold text-gray-900 dark:text-white pr-4">
            {question}
          </span>
          <ChevronDown
            className={cn(
              "w-5 h-5 text-gray-500 dark:text-gray-400 shrink-0 transition-transform duration-300",
              isOpen && "transform rotate-180"
            )}
          />
        </button>
        <div
          className={cn(
            "overflow-hidden transition-all duration-300",
            isOpen ? "max-h-96 opacity-100" : "max-h-0 opacity-0"
          )}
        >
          <CardContent className="pt-0 pb-6 px-6">
            <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
              {answer}
            </p>
          </CardContent>
        </div>
      </Card>
    </ScrollReveal>
  );
}

export default function FAQPage() {
  return (
    <div className="min-h-screen bg-white dark:bg-gray-900">
      {/* Hero Section */}
      <section className="py-20 md:py-32 border-b border-gray-200/50 dark:border-gray-800/50">
        <div className="container mx-auto px-4">
          <ScrollReveal>
            <div className="max-w-3xl mx-auto text-center">
              <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gray-100 dark:bg-gray-800 mb-6 border-2 border-gray-300 dark:border-gray-700">
                <HelpCircle className="w-10 h-10 text-gray-900 dark:text-white" />
              </div>
              <h1 className="text-5xl md:text-6xl font-black mb-6 text-gray-900 dark:text-white tracking-tight">
                常见问题
              </h1>
              <p className="text-xl md:text-2xl text-gray-600 dark:text-gray-400 leading-relaxed font-light">
                快速找到你需要的答案
              </p>
            </div>
          </ScrollReveal>
        </div>
      </section>

      {/* FAQ Content */}
      <section className="py-24 md:py-32">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto space-y-4">
            {faqs.map((faq, index) => (
              <FAQItem
                key={index}
                question={faq.question}
                answer={faq.answer}
                index={index}
              />
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}

