import { FileText, Code, Heart, Users } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ScrollReveal } from "@/components/ui/scroll-reveal";

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-white dark:bg-gray-900">
      {/* Hero Section */}
      <section className="py-20 md:py-32 border-b border-gray-200/50 dark:border-gray-800/50 bg-gradient-to-b from-white via-gray-50/30 to-white dark:from-gray-900 dark:via-gray-800/30 dark:to-gray-900">
        <div className="container mx-auto px-4">
          <ScrollReveal>
            <div className="max-w-3xl mx-auto text-center">
              <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gray-100 dark:bg-gray-800 mb-6 border-2 border-gray-300 dark:border-gray-700">
                <FileText className="w-10 h-10 text-gray-900 dark:text-white" />
              </div>
              <h1 className="text-5xl md:text-6xl font-black mb-6 text-gray-900 dark:text-white tracking-tight">
                关于 Novel Editor
              </h1>
              <p className="text-xl md:text-2xl text-gray-600 dark:text-gray-400 leading-relaxed font-light">
                Novel Editor 是一款现代化的跨平台桌面写作应用，专为长篇小说创作而设计。
                我们致力于为创作者提供最好的写作体验。
              </p>
            </div>
          </ScrollReveal>
        </div>
      </section>

      {/* Mission Section */}
      <section className="py-24 md:py-32">
        <div className="container mx-auto px-4">
          <ScrollReveal>
            <div className="max-w-4xl mx-auto">
              <h2 className="text-3xl md:text-4xl font-bold mb-8 text-center text-gray-900 dark:text-white">
                我们的使命
              </h2>
              <div className="prose prose-lg dark:prose-invert max-w-none">
                <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
                  Novel Editor 的使命是帮助创作者专注于创作本身，而不是被工具困扰。
                  我们相信，一个好的写作工具应该是透明、可靠、易于使用的。
                </p>
                <p className="text-gray-600 dark:text-gray-400 leading-relaxed mt-4">
                  通过现代化的技术栈和精心设计的用户体验，我们打造了一款真正适合长篇小说创作的工具。
                  无论你是网络小说作者、独立作者，还是学生创作者，Novel Editor 都能帮助你更好地创作。
                </p>
              </div>
            </div>
          </ScrollReveal>
        </div>
      </section>

      {/* Values Section */}
      <section className="py-24 md:py-32 bg-gray-50 dark:bg-gray-950 relative overflow-hidden">
        {/* Decorative background */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-0 right-0 w-96 h-96 bg-gray-200/20 dark:bg-gray-800/20 rounded-full blur-3xl"></div>
          <div className="absolute bottom-0 left-0 w-96 h-96 bg-gray-200/20 dark:bg-gray-800/20 rounded-full blur-3xl"></div>
        </div>
        <div className="container mx-auto px-4 relative z-10">
          <ScrollReveal>
            <h2 className="text-3xl md:text-4xl font-bold mb-12 text-center text-gray-900 dark:text-white">
              我们的价值观
            </h2>
          </ScrollReveal>
          <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {[
              {
                icon: <Code className="w-8 h-8" />,
                title: "开源透明",
                description: "完全开源，代码公开透明。你可以自由使用、修改和分发，也可以参与贡献。",
              },
              {
                icon: <Heart className="w-8 h-8" />,
                title: "用户至上",
                description: "以用户体验为核心，不断优化和迭代。我们倾听用户反馈，持续改进产品。",
              },
              {
                icon: <Users className="w-8 h-8" />,
                title: "社区驱动",
                description: "由社区驱动的项目，欢迎所有人参与贡献。无论是代码、文档还是反馈，都很有价值。",
              },
            ].map((value, index) => (
              <ScrollReveal key={value.title} direction="up" delay={index * 100}>
                <Card className="group h-full hover:-translate-y-2 transition-all duration-300">
                  <CardHeader>
                    <div className="mb-4 w-16 h-16 rounded-xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                      <div className="text-gray-900 dark:text-white">
                        {value.icon}
                      </div>
                    </div>
                    <CardTitle className="group-hover:text-gray-900 dark:group-hover:text-white transition-colors">
                      {value.title}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <CardDescription className="text-base leading-relaxed">
                      {value.description}
                    </CardDescription>
                  </CardContent>
                </Card>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 md:py-32">
        <div className="container mx-auto px-4">
          <ScrollReveal>
            <div className="max-w-2xl mx-auto text-center">
              <h2 className="text-3xl md:text-4xl font-bold mb-6 text-gray-900 dark:text-white">
                加入我们
              </h2>
              <p className="text-xl text-gray-600 dark:text-gray-400 mb-8 leading-relaxed">
                Novel Editor 是一个开源项目，欢迎参与贡献。
                无论是代码、文档、反馈还是分享，都是对我们的支持。
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button size="lg" asChild>
                  <Link
                    href="https://github.com/jeasoncc/novel-editor"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <Code className="w-5 h-5 mr-2" />
                    查看源码
                  </Link>
                </Button>
                <Button variant="outline" size="lg" asChild>
                  <Link href="/">
                    返回首页
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

