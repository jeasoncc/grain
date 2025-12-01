import { BookOpen, GraduationCap, Code, HelpCircle, GitBranch } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";
import { SectionHeader } from "@/components/ui/section-header";
import { ScrollReveal } from "@/components/ui/scroll-reveal";

const docCategories = [
  {
    icon: <GraduationCap className="w-8 h-8" />,
    title: "教程",
    description: "从入门到精通的完整教程，帮助你快速上手 Novel Editor。",
    href: "/docs/tutorials",
    color: "bg-blue-50 dark:bg-blue-900/20",
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
  { name: "键盘快捷键", href: "/docs/tutorials#shortcuts" },
  { name: "导出功能", href: "/docs/tutorials#export" },
];

export default function DocsPage() {
  return (
    <div className="min-h-screen bg-white dark:bg-gray-900">
      {/* Hero Section */}
      <section className="py-20 md:py-32 border-b border-gray-200/50 dark:border-gray-800/50 bg-gradient-to-b from-white via-gray-50/30 to-white dark:from-gray-900 dark:via-gray-800/30 dark:to-gray-900">
        <div className="container mx-auto px-4">
          <ScrollReveal>
            <div className="max-w-3xl mx-auto text-center">
              <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gray-100 dark:bg-gray-800 mb-6 border-2 border-gray-300 dark:border-gray-700">
                <BookOpen className="w-10 h-10 text-gray-900 dark:text-white" />
              </div>
              <h1 className="text-5xl md:text-6xl font-black mb-6 text-gray-900 dark:text-white tracking-tight">
                文档中心
              </h1>
              <p className="text-xl md:text-2xl text-gray-600 dark:text-gray-400 leading-relaxed font-light">
                探索 Novel Editor 的所有功能和特性，学习如何使用它来提升你的写作效率。
              </p>
            </div>
          </ScrollReveal>
        </div>
      </section>

      {/* Quick Links */}
      <section className="py-12 border-b border-gray-200 dark:border-gray-800">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              快速链接
            </h2>
            <div className="flex flex-wrap gap-3">
              {quickLinks.map((link) => (
                <Link
                  key={link.name}
                  href={link.href}
                  className="px-4 py-2 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors text-sm font-medium"
                >
                  {link.name}
                </Link>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Documentation Categories */}
      <section className="py-24 md:py-32">
        <div className="container mx-auto px-4">
          <ScrollReveal>
            <SectionHeader
              title="文档分类"
              description="选择你感兴趣的文档类别，深入了解 Novel Editor"
              subtitle="Documentation"
            />
          </ScrollReveal>

          <div className="grid md:grid-cols-2 gap-6 max-w-5xl mx-auto mt-16">
            {docCategories.map((category, index) => (
              <ScrollReveal
                key={category.title}
                direction="up"
                delay={index * 100}
              >
                <Link href={category.href}>
                  <Card className="group h-full hover:-translate-y-2 transition-all duration-300 relative overflow-hidden">
                    <CardHeader className="pb-4">
                      <div
                        className={`w-16 h-16 ${category.color} rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300`}
                      >
                        <div className="text-gray-900 dark:text-white">
                          {category.icon}
                        </div>
                      </div>
                      <CardTitle className="text-2xl group-hover:text-gray-900 dark:group-hover:text-white transition-colors">
                        {category.title}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <CardDescription className="text-base leading-relaxed">
                        {category.description}
                      </CardDescription>
                    </CardContent>
                  </Card>
                </Link>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}


