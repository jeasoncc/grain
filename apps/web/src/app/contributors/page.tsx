import { Users, Heart, Github, GitBranch } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollReveal } from "@/components/ui/scroll-reveal";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "贡献者",
  description: "感谢所有为 Novel Editor 做出贡献的开发者",
};

// 注意：在实际项目中，这些数据应该从 GitHub API 获取
const contributors = [
  {
    name: "Jeason",
    role: "项目维护者",
    avatar: "https://avatars.githubusercontent.com/u/your-user-id",
    github: "jeasoncc",
    contributions: ["核心开发", "架构设计", "项目管理"],
  },
  // 在实际应用中，应该从 GitHub API 获取真实数据
];

const contributionTypes = [
  {
    title: "代码贡献",
    description: "提交代码、修复 bug、开发新功能",
    icon: <Github className="w-6 h-6" />,
  },
  {
    title: "文档改进",
    description: "编写文档、改进教程、修正错误",
    icon: <GitBranch className="w-6 h-6" />,
  },
  {
    title: "问题反馈",
    description: "报告 bug、提出建议、分享体验",
    icon: <Heart className="w-6 h-6" />,
  },
];

export default function ContributorsPage() {
  return (
    <div className="min-h-screen bg-white dark:bg-gray-900">
      {/* Hero Section */}
      <section className="py-20 md:py-32 border-b border-gray-200/50 dark:border-gray-800/50">
        <div className="container mx-auto px-4">
          <ScrollReveal>
            <div className="max-w-3xl mx-auto text-center">
              <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gray-100 dark:bg-gray-800 mb-6 border-2 border-gray-300 dark:border-gray-700">
                <Users className="w-10 h-10 text-gray-900 dark:text-white" />
              </div>
              <h1 className="text-5xl md:text-6xl font-black mb-6 text-gray-900 dark:text-white tracking-tight">
                贡献者
              </h1>
              <p className="text-xl md:text-2xl text-gray-600 dark:text-gray-400 leading-relaxed font-light">
                感谢所有为 Novel Editor 做出贡献的优秀开发者
              </p>
            </div>
          </ScrollReveal>
        </div>
      </section>

      {/* Message */}
      <section className="py-24 md:py-32">
        <div className="container mx-auto px-4 max-w-4xl">
          <ScrollReveal>
            <Card className="border-2 border-gray-300 dark:border-gray-700">
              <CardContent className="pt-10 pb-10">
                <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-red-100 dark:bg-red-900/30 mb-6 mx-auto relative group">
                  <Heart className="w-10 h-10 text-red-500 fill-red-500 animate-pulse group-hover:scale-110 transition-transform duration-300" />
                </div>
                <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4 text-center">
                  感谢所有贡献者！
                </h2>
                <p className="text-gray-600 dark:text-gray-400 leading-relaxed text-center mb-6">
                  Novel Editor 是一个开源项目，它的成功离不开社区的每一个贡献。
                  无论是代码、文档、反馈还是分享，都让这个项目变得更好。
                </p>
                <p className="text-gray-600 dark:text-gray-400 leading-relaxed text-center">
                  我们真诚地感谢所有为项目做出贡献的开发者、文档编写者、问题报告者和其他社区成员。
                </p>
              </CardContent>
            </Card>
          </ScrollReveal>
        </div>
      </section>

      {/* Contribution Types */}
      <section className="py-24 md:py-32 bg-gray-50 dark:bg-gray-950">
        <div className="container mx-auto px-4 max-w-5xl">
          <ScrollReveal>
            <h2 className="text-3xl md:text-4xl font-bold mb-12 text-center text-gray-900 dark:text-white">
              贡献方式
            </h2>
          </ScrollReveal>
          <div className="grid md:grid-cols-3 gap-6">
            {contributionTypes.map((type, index) => (
              <ScrollReveal key={type.title} direction="up" delay={index * 100}>
                <Card className="h-full text-center">
                  <CardHeader>
                    <div className="w-16 h-16 rounded-xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center mx-auto mb-4">
                      <div className="text-gray-900 dark:text-white">{type.icon}</div>
                    </div>
                    <CardTitle className="text-xl">{type.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
                      {type.description}
                    </p>
                  </CardContent>
                </Card>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      {/* GitHub Contributors */}
      <section className="py-24 md:py-32">
        <div className="container mx-auto px-4 max-w-4xl">
          <ScrollReveal>
            <h2 className="text-3xl md:text-4xl font-bold mb-12 text-center text-gray-900 dark:text-white">
              核心贡献者
            </h2>
          </ScrollReveal>
          <div className="text-center mb-8">
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              完整的贡献者列表可以在 GitHub 上查看。我们正在努力集成 GitHub API 来实时显示所有贡献者。
            </p>
            <Card className="max-w-2xl mx-auto">
              <CardContent className="pt-10 pb-10">
                <p className="text-gray-600 dark:text-gray-400 mb-4">
                  感谢所有为项目做出贡献的开发者！
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-500">
                  贡献者数据将从 GitHub API 自动获取，展示所有为项目做出贡献的开发者。
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* How to Become a Contributor */}
      <section className="py-24 md:py-32 bg-gray-50 dark:bg-gray-950">
        <div className="container mx-auto px-4 max-w-3xl">
          <ScrollReveal>
            <Card>
              <CardHeader>
                <CardTitle className="text-2xl text-center">如何成为贡献者</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="prose prose-lg dark:prose-invert max-w-none text-gray-600 dark:text-gray-400">
                  <p>
                    想要成为贡献者？有多种方式可以参与项目：
                  </p>
                  <ul className="list-disc list-inside space-y-2 mt-4">
                    <li>提交代码改进或新功能</li>
                    <li>改进文档和教程</li>
                    <li>报告 bug 或提出功能建议</li>
                    <li>帮助回答问题</li>
                    <li>分享项目给其他用户</li>
                    <li>翻译和本地化</li>
                  </ul>
                  <p className="mt-6">
                    查看我们的{" "}
                    <Link
                      href="/docs/contributing"
                      className="text-blue-600 dark:text-blue-400 hover:underline"
                    >
                      贡献指南
                    </Link>
                    {" "}了解更多信息。
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
              <p className="text-xl text-gray-600 dark:text-gray-400 mb-8">
                让我们一起打造更好的 Novel Editor
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button size="lg" asChild>
                  <Link href="/docs/contributing">
                    <GitBranch className="w-5 h-5 mr-2" />
                    查看贡献指南
                  </Link>
                </Button>
                <Button variant="outline" size="lg" asChild>
                  <Link
                    href="https://github.com/jeasoncc/novel-editor"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <Github className="w-5 h-5 mr-2" />
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

