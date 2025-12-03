"use client";

import { BookOpen, Download, FileText, Keyboard, Layers, Search, Save, Zap } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { SectionHeader } from "@/components/ui/section-header";
import { ScrollReveal } from "@/components/ui/scroll-reveal";
import { FormattedText } from "@/components/docs/formatted-text";

const sections = [
  {
    id: "getting-started",
    title: "快速开始",
    icon: <Download className="w-6 h-6" />,
    content: [
      {
        subtitle: "下载和安装",
        text: "访问下载页面，选择适合你操作系统的版本。Novel Editor 支持 Linux、Windows 和 macOS。",
      },
      {
        subtitle: "首次启动",
        text: "启动应用后，你可以创建一个新项目或打开现有项目。系统会自动引导你完成初始设置。",
      },
      {
        subtitle: "创建第一个项目",
        text: "点击「新建项目」，输入项目名称，选择保存位置，然后开始你的创作之旅。",
      },
    ],
  },
  {
    id: "features",
    title: "功能概览",
    icon: <Zap className="w-6 h-6" />,
    content: [
      {
        subtitle: "沉浸式编辑器",
        text: "基于 Lexical 的富文本编辑器，支持格式化、快捷键和专注模式。使用 Cmd/Ctrl+B 加粗，Cmd/Ctrl+I 斜体。",
      },
      {
        subtitle: "树形大纲",
        text: "在左侧面板中管理你的项目结构。支持拖拽重组章节和场景，快速导航到任意位置。",
      },
      {
        subtitle: "全局搜索",
        text: "使用 Ctrl+Shift+F 打开全局搜索，快速查找场景、角色和设定。支持关键词高亮。",
      },
      {
        subtitle: "角色管理",
        text: "在角色数据库中管理所有角色信息，包括身份、关系、属性等。创作时可以快速查阅。",
      },
    ],
  },
  {
    id: "shortcuts",
    title: "键盘快捷键",
    icon: <Keyboard className="w-6 h-6" />,
    content: [
      {
        subtitle: "编辑快捷键",
        items: [
          "Cmd/Ctrl + B：加粗",
          "Cmd/Ctrl + I：斜体",
          "Cmd/Ctrl + U：下划线",
          "Cmd/Ctrl + K：打开命令面板",
          "Cmd/Ctrl + Shift + F：全局搜索",
        ],
      },
      {
        subtitle: "导航快捷键",
        items: [
          "Cmd/Ctrl + ←/→：切换到上一个/下一个场景",
          "Cmd/Ctrl + ↑/↓：折叠/展开大纲",
          "Esc：关闭面板",
        ],
      },
    ],
  },
  {
    id: "export",
    title: "导出功能",
    icon: <FileText className="w-6 h-6" />,
    content: [
      {
        subtitle: "导出格式",
        text: "目前支持导出为 Markdown 和 DOCX 格式。PDF 和 EPUB 导出功能正在开发中。",
      },
      {
        subtitle: "导出步骤",
        text: "点击「文件」→「导出」，选择导出格式和保存位置，即可完成导出。",
      },
    ],
  },
];

export function TutorialsPageContent() {
  return (
    <div className="min-h-screen bg-white dark:bg-black">
      {/* Hero Section */}
      <section className="py-20 md:py-32 border-b border-gray-200/50 dark:border-gray-800/50">
        <div className="container mx-auto px-4">
          <ScrollReveal>
            <div className="max-w-3xl mx-auto text-center">
              <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gray-100 dark:bg-gray-800 mb-6 border-2 border-gray-300 dark:border-gray-700">
                <BookOpen className="w-10 h-10 text-gray-900 dark:text-white" />
              </div>
              <h1 className="text-5xl md:text-6xl font-black mb-6 text-gray-900 dark:text-white tracking-tight">
                使用教程
              </h1>
              <p className="text-xl md:text-2xl text-gray-600 dark:text-gray-300 leading-relaxed font-light">
                从入门到精通，掌握 Novel Editor 的所有功能
              </p>
            </div>
          </ScrollReveal>
        </div>
      </section>

      {/* Content */}
      <section className="py-24 md:py-32">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto space-y-24">
            {sections.map((section, sectionIndex) => (
              <ScrollReveal
                key={section.id}
                direction="up"
                delay={sectionIndex * 100}
              >
                <div id={section.id} className="scroll-mt-20">
                  <div className="flex items-center gap-3 mb-8">
                    <div className="w-12 h-12 rounded-xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                      <div className="text-gray-900 dark:text-white">
                        {section.icon}
                      </div>
                    </div>
                    <h2 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white">
                      {section.title}
                    </h2>
                  </div>

                  <div className="space-y-8">
                    {section.content.map((item, itemIndex) => (
                      <Card key={itemIndex}>
                        <CardHeader>
                          <CardTitle className="text-xl">
                            {item.subtitle}
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          {"text" in item && item.text && (
                            <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
                              <FormattedText text={item.text} />
                            </p>
                          )}
                          {"items" in item && item.items && (
                            <ul className="space-y-2">
                              {item.items.map((listItem, listIndex) => (
                                <li
                                  key={listIndex}
                                  className="text-gray-600 dark:text-gray-300 leading-relaxed flex items-start gap-2"
                                >
                                  <span className="text-gray-400 dark:text-gray-400 mt-1.5">
                                    •
                                  </span>
                                  <span><FormattedText text={listItem} /></span>
                                </li>
                              ))}
                            </ul>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}




