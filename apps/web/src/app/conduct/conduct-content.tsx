"use client";

import { Users, Heart, Handshake, MessageSquare } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollReveal } from "@/components/ui/scroll-reveal";
import { Button } from "@/components/ui/button";
import Link from "next/link";

const principles = [
  {
    icon: <Heart className="w-6 h-6" />,
    title: "友好和欢迎",
    description: "欢迎并鼓励来自不同背景和经验的贡献者参与。",
  },
  {
    icon: <Users className="w-6 h-6" />,
    title: "尊重和包容",
    description: "尊重不同的观点和经验，优雅地接受建设性批评。",
  },
  {
    icon: <Handshake className="w-6 h-6" />,
    title: "合作精神",
    description: "专注于对社区最有利的事情，展示同理心。",
  },
  {
    icon: <MessageSquare className="w-6 h-6" />,
    title: "建设性交流",
    description: "使用友好和包容的语言，提供有价值的反馈。",
  },
];

const ourPledge = {
  positive: [
    "使用欢迎和包容的语言",
    "尊重不同的观点和经验",
    "优雅地接受建设性批评",
    "专注于对社区最有利的事情",
    "对其他社区成员表现出同理心",
  ],
  negative: [
    "使用性化的语言或图像，以及不受欢迎的性关注或性骚扰",
    "发表贬损、侮辱或侮辱性评论，以及个人或政治攻击",
    "公开或私下骚扰他人",
    "发布他人的私人信息，如物理或电子地址，未经明确许可",
    "在专业环境中可能被合理视为不当的其他行为",
  ],
};

export function ConductPageContent() {
  return (
    <div className="min-h-screen bg-white dark:bg-black">
      {/* Hero Section */}
      <section className="py-20 md:py-32 border-b border-gray-200/50 dark:border-gray-800/50">
        <div className="container mx-auto px-4">
          <ScrollReveal>
            <div className="max-w-3xl mx-auto text-center">
              <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gray-100 dark:bg-gray-800 mb-6 border-2 border-gray-300 dark:border-gray-700">
                <Users className="w-10 h-10 text-gray-900 dark:text-white" />
              </div>
              <h1 className="text-5xl md:text-6xl font-black mb-6 text-gray-900 dark:text-white tracking-tight">
                行为准则
              </h1>
              <p className="text-xl md:text-2xl text-gray-600 dark:text-gray-300 leading-relaxed font-light">
                我们致力于为所有人提供一个友好、安全和包容的环境
              </p>
            </div>
          </ScrollReveal>
        </div>
      </section>

      {/* Our Pledge */}
      <section className="py-24 md:py-32">
        <div className="container mx-auto px-4 max-w-4xl">
          <ScrollReveal>
            <h2 className="text-3xl md:text-4xl font-bold mb-12 text-center text-gray-900 dark:text-white">
              我们的承诺
            </h2>
          </ScrollReveal>

          <div className="grid md:grid-cols-2 gap-8 mb-16">
            <ScrollReveal direction="up" delay={100}>
              <Card className="h-full border-2 border-green-200 dark:border-green-800">
                <CardHeader>
                  <CardTitle className="text-2xl text-green-700 dark:text-green-400">
                    ✅ 我们应该
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-3">
                    {ourPledge.positive.map((item, index) => (
                      <li
                        key={index}
                        className="flex items-start gap-3 text-gray-600 dark:text-gray-300"
                      >
                        <span className="text-green-600 dark:text-green-400 mt-1">•</span>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            </ScrollReveal>

            <ScrollReveal direction="up" delay={200}>
              <Card className="h-full border-2 border-red-200 dark:border-red-800">
                <CardHeader>
                  <CardTitle className="text-2xl text-red-700 dark:text-red-400">
                    ❌ 我们不应该
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-3">
                    {ourPledge.negative.map((item, index) => (
                      <li
                        key={index}
                        className="flex items-start gap-3 text-gray-600 dark:text-gray-300"
                      >
                        <span className="text-red-600 dark:text-red-400 mt-1">•</span>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            </ScrollReveal>
          </div>
        </div>
      </section>

      {/* Principles */}
      <section className="py-24 md:py-32 bg-gray-50 dark:bg-gray-950">
        <div className="container mx-auto px-4 max-w-5xl">
          <ScrollReveal>
            <h2 className="text-3xl md:text-4xl font-bold mb-12 text-center text-gray-900 dark:text-white">
              核心原则
            </h2>
          </ScrollReveal>
          <div className="grid md:grid-cols-2 gap-6">
            {principles.map((principle, index) => (
              <ScrollReveal key={principle.title} direction="up" delay={index * 100}>
                <Card className="h-full">
                  <CardHeader>
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 rounded-xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center flex-shrink-0">
                        <div className="text-gray-900 dark:text-white">{principle.icon}</div>
                      </div>
                      <div className="flex-1">
                        <CardTitle className="text-xl">{principle.title}</CardTitle>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
                      {principle.description}
                    </p>
                  </CardContent>
                </Card>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      {/* Enforcement */}
      <section className="py-24 md:py-32">
        <div className="container mx-auto px-4 max-w-4xl">
          <ScrollReveal>
            <Card>
              <CardHeader>
                <CardTitle className="text-2xl">执行准则</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="prose prose-lg dark:prose-invert max-w-none text-gray-600 dark:text-gray-300">
                  <p>
                    项目维护者有责任澄清和执行我们的行为准则标准，并将会对任何不当、威胁、冒犯或有害的行为采取适当和公平的纠正措施。
                  </p>
                  <p className="mt-4">
                    项目维护者有权且有义务删除、编辑或拒绝任何不符合本行为准则的评论、提交、代码、Wiki 编辑、问题和其他贡献，并会通过私信向违反者传达理由。
                  </p>
                  <p className="mt-4">
                    不遵守或执行行为准则的项目维护者可能会面临项目领导层其他成员的临时或永久性后果。
                  </p>
                </div>
              </CardContent>
            </Card>
          </ScrollReveal>
        </div>
      </section>

      {/* Reporting */}
      <section className="py-24 md:py-32 bg-gray-50 dark:bg-gray-950">
        <div className="container mx-auto px-4 max-w-3xl">
          <ScrollReveal>
            <Card className="border-2 border-gray-300 dark:border-gray-700">
              <CardHeader>
                <CardTitle className="text-2xl text-center">报告问题</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="prose prose-lg dark:prose-invert max-w-none text-gray-600 dark:text-gray-300">
                  <p>
                    如果你遇到违反行为准则的情况，请通过以下方式报告：
                  </p>
                  <ul className="list-disc list-inside space-y-2 mt-4">
                    <li>
                      <strong className="text-gray-900 dark:text-white">发送邮件：</strong>
                      <a
                        href="mailto:conduct@novel-editor.com"
                        className="text-blue-600 dark:text-blue-400 hover:underline ml-2"
                      >
                        conduct@novel-editor.com
                      </a>
                    </li>
                    <li>
                      <strong className="text-gray-900 dark:text-white">GitHub Issues：</strong>
                      在 GitHub 上创建私密 Issue 报告不当行为
                    </li>
                  </ul>
                  <p className="mt-6">
                    所有投诉都将得到及时和公正的审查和调查。所有报告者将受到保护，不会被报复。
                  </p>
                </div>
              </CardContent>
            </Card>
          </ScrollReveal>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 md:py-32">
        <div className="container mx-auto px-4">
          <ScrollReveal>
            <div className="max-w-2xl mx-auto text-center">
              <h2 className="text-3xl md:text-4xl font-bold mb-6 text-gray-900 dark:text-white">
                加入我们的社区
              </h2>
              <p className="text-xl text-gray-600 dark:text-gray-300 mb-8">
                让我们一起创造一个友好和包容的开源社区
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button size="lg" asChild>
                  <Link href="/docs/contributing">
                    开始贡献
                  </Link>
                </Button>
                <Button variant="outline" size="lg" asChild>
                  <Link
                    href="https://github.com/jeasoncc/novel-editor"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    访问 GitHub
                  </Link>
                </Button>
              </div>
            </div>
          </ScrollReveal>
        </div>
      </section>
    </div>
  );
}

