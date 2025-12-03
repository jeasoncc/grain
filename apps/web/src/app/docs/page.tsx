export const dynamic = "force-dynamic";

import { BookOpen, GraduationCap, Code, HelpCircle, GitBranch, FileText } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";

const docCategories = [
  {
    icon: <GraduationCap className="w-8 h-8" />,
    title: "教程",
    description: "从入门到精通的完整教程，帮助你快速上手 Novel Editor。",
    href: "/docs/tutorials",
    color: "bg-blue-50 dark:bg-blue-900/20",
  },
  {
    icon: <BookOpen className="w-8 h-8" />,
    title: "操作手册",
    description: "详细的功能使用指南，涵盖所有功能的操作步骤和技巧。",
    href: "/docs/manual",
    color: "bg-indigo-50 dark:bg-indigo-900/20",
  },
  {
    icon: <Code className="w-8 h-8" />,
    title: "Wiki 文档",
    description: "深入了解架构设计、功能实现和技术细节的完整文档。",
    href: "/docs/wiki",
    color: "bg-teal-50 dark:bg-teal-900/20",
  },
  {
    icon: <Code className="w-8 h-8" />,
    title: "API 参考",
    description: "完整的 API 文档，了解所有可用的功能和接口。",
    href: "/docs/api",
    color: "bg-green-50 dark:bg-green-900/20",
  },
  {
    icon: <HelpCircle className="w-8 h-8" />,
    title: "常见问题",
    description: "解答你使用过程中的常见问题，快速找到解决方案。",
    href: "/docs/faq",
    color: "bg-purple-50 dark:bg-purple-900/20",
  },
  {
    icon: <GitBranch className="w-8 h-8" />,
    title: "贡献指南",
    description: "想要为项目贡献代码或文档？这里是你需要知道的一切。",
    href: "/docs/contributing",
    color: "bg-orange-50 dark:bg-orange-900/20",
  },
];

const quickLinks = [
  { name: "快速开始", href: "/docs/tutorials#getting-started" },
  { name: "功能概览", href: "/docs/tutorials#features" },
  { name: "操作手册", href: "/docs/manual" },
  { name: "Wiki 文档", href: "/docs/wiki" },
  { name: "键盘快捷键", href: "/docs/manual#keyboard" },
  { name: "导出功能", href: "/docs/manual#export" },
];

export default function DocsPage() {
  return (
    <div className="prose prose-gray dark:prose-invert max-w-none">
      <div className="mb-12">
        <h1 className="text-4xl font-bold mb-4 text-gray-900 dark:text-white">
          欢迎使用 Novel Editor 文档
        </h1>
        <p className="text-xl text-gray-600 dark:text-gray-300 leading-relaxed">
          探索 Novel Editor 的所有功能和特性，学习如何使用它来提升你的写作效率。
        </p>
      </div>

      {/* Quick Links */}
      <div className="mb-12 p-6 rounded-lg bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
          快速链接
        </h2>
        <div className="flex flex-wrap gap-3">
          {quickLinks.map((link) => (
            <Link
              key={link.name}
              href={link.href}
              className="px-4 py-2 rounded-lg bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-sm font-medium border border-gray-200 dark:border-gray-700"
            >
              {link.name}
            </Link>
          ))}
        </div>
      </div>

      {/* Documentation Categories */}
      <div>
        <h2 className="text-2xl font-bold mb-6 text-gray-900 dark:text-white">
          文档分类
        </h2>
        <p className="text-gray-600 dark:text-gray-300 mb-8">
          选择你感兴趣的文档类别，深入了解 Novel Editor
        </p>
        <div className="grid md:grid-cols-2 gap-6">
          {docCategories.map((category) => (
            <Link key={category.title} href={category.href}>
              <Card className="group h-full hover:shadow-lg transition-all duration-300">
                <CardHeader className="pb-4">
                  <div
                    className={`w-12 h-12 ${category.color} rounded-lg flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300`}
                  >
                    <div className="text-gray-900 dark:text-white">
                      {category.icon}
                    </div>
                  </div>
                  <CardTitle className="text-xl group-hover:text-gray-900 dark:group-hover:text-white transition-colors">
                    {category.title}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-sm leading-relaxed">
                    {category.description}
                  </CardDescription>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}



