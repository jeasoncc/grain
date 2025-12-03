"use client";

import { GitBranch, Code, BookOpen, Bug, Heart } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { SectionHeader } from "@/components/ui/section-header";
import { ScrollReveal } from "@/components/ui/scroll-reveal";
import { Button } from "@/components/ui/button";
import Link from "next/link";

const contributionTypes = [
  {
    icon: <Code className="w-8 h-8" />,
    title: "代码贡献",
    description: "提交新功能、修复 bug、优化性能等代码贡献。",
    steps: [
      "Fork 本项目到你的 GitHub 账户",
      "创建新的分支进行开发",
      "编写代码并添加测试",
      "提交 Pull Request",
    ],
  },
  {
    icon: <BookOpen className="w-8 h-8" />,
    title: "文档贡献",
    description: "改进文档、添加教程、修正错误等。",
    steps: [
      "找到需要改进的文档",
      "在 GitHub 上编辑并提交修改",
      "或提交 Issue 说明需要改进的地方",
    ],
  },
  {
    icon: <Bug className="w-8 h-8" />,
    title: "问题反馈",
    description: "报告 bug、提出功能建议、分享使用体验。",
    steps: [
      "在 GitHub Issues 中搜索相关问题",
      "如果不存在，创建新的 Issue",
      "详细描述问题或建议",
    ],
  },
  {
    icon: <Heart className="w-8 h-8" />,
    title: "其他贡献",
    description: "分享项目、写博客、提供反馈等都是贡献。",
    steps: [
      "在社交媒体上分享项目",
      "写使用教程或体验文章",
      "向其他用户提供帮助",
    ],
  },
];

export function ContributingPageContent() {
  return (
    <div className="min-h-screen bg-white dark:bg-black">
      {/* Hero Section */}
      <section className="py-20 md:py-32 border-b border-gray-200/50 dark:border-gray-800/50">
        <div className="container mx-auto px-4">
          <ScrollReveal>
            <div className="max-w-3xl mx-auto text-center">
              <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gray-100 dark:bg-gray-800 mb-6 border-2 border-gray-300 dark:border-gray-700">
                <GitBranch className="w-10 h-10 text-gray-900 dark:text-white" />
              </div>
              <h1 className="text-5xl md:text-6xl font-black mb-6 text-gray-900 dark:text-white tracking-tight">
                贡献指南
              </h1>
              <p className="text-xl md:text-2xl text-gray-600 dark:text-gray-300 leading-relaxed font-light">
                Novel Editor 是一个开源项目，欢迎你的参与和贡献
              </p>
            </div>
          </ScrollReveal>
        </div>
      </section>

      {/* Contribution Types */}
      <section className="py-24 md:py-32">
        <div className="container mx-auto px-4">
          <ScrollReveal>
            <SectionHeader
              title="贡献方式"
              description="有多种方式可以参与项目，选择适合你的方式"
              subtitle="Ways to Contribute"
            />
          </ScrollReveal>

          <div className="grid md:grid-cols-2 gap-6 max-w-5xl mx-auto mt-16">
            {contributionTypes.map((type, index) => (
              <ScrollReveal
                key={type.title}
                direction="up"
                delay={index * 100}
              >
                <Card className="h-full">
                  <CardHeader>
                    <div className="w-16 h-16 rounded-xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center mb-4">
                      <div className="text-gray-900 dark:text-white">
                        {type.icon}
                      </div>
                    </div>
                    <CardTitle className="text-2xl">{type.title}</CardTitle>
                    <CardDescription className="text-base">
                      {type.description}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ol className="space-y-3">
                      {type.steps.map((step, stepIndex) => (
                        <li
                          key={stepIndex}
                          className="flex items-start gap-3 text-gray-600 dark:text-gray-300"
                        >
                          <span className="flex-shrink-0 w-6 h-6 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-sm font-semibold text-gray-900 dark:text-white">
                            {stepIndex + 1}
                          </span>
                          <span className="leading-relaxed">{step}</span>
                        </li>
                      ))}
                    </ol>
                  </CardContent>
                </Card>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      {/* Getting Started */}
      <section className="py-24 md:py-32 bg-gray-50 dark:bg-gray-800">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto">
            <ScrollReveal>
              <h2 className="text-3xl md:text-4xl font-bold mb-8 text-center text-gray-900 dark:text-white">
                开始贡献
              </h2>
              <Card>
                <CardHeader>
                  <CardTitle>开发环境设置</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
                        1. 克隆项目
                      </h3>
                      <code className="block p-3 rounded-lg bg-gray-100 dark:bg-gray-800 text-sm font-mono text-gray-900 dark:text-white">
                        git clone https://github.com/jeasoncc/novel-editor.git
                      </code>
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
                        2. 安装依赖
                      </h3>
                      <code className="block p-3 rounded-lg bg-gray-100 dark:bg-gray-800 text-sm font-mono text-gray-900 dark:text-white">
                        bun install
                      </code>
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
                        3. 启动开发服务器
                      </h3>
                      <code className="block p-3 rounded-lg bg-gray-100 dark:bg-gray-800 text-sm font-mono text-gray-900 dark:text-white">
                        bun dev
                      </code>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </ScrollReveal>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 md:py-32">
        <div className="container mx-auto px-4">
          <ScrollReveal>
            <div className="max-w-2xl mx-auto text-center">
              <h2 className="text-3xl md:text-4xl font-bold mb-6 text-gray-900 dark:text-white">
                准备好贡献了吗？
              </h2>
              <p className="text-xl text-gray-600 dark:text-gray-300 mb-8">
                访问 GitHub 查看项目，提交你的第一个贡献
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button size="lg" asChild>
                  <Link
                    href="https://github.com/jeasoncc/novel-editor"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <GitBranch className="w-5 h-5 mr-2" />
                    查看 GitHub
                  </Link>
                </Button>
                <Button variant="outline" size="lg" asChild>
                  <Link href="/docs">查看文档</Link>
                </Button>
              </div>
            </div>
          </ScrollReveal>
        </div>
      </section>
    </div>
  );
}

