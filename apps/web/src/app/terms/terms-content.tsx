"use client";

import { FileText, AlertCircle, CheckCircle, Info } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollReveal } from "@/components/ui/scroll-reveal";

const termsSections = [
  {
    icon: <CheckCircle className="w-6 h-6" />,
    title: "使用许可",
    content: "Novel Editor 是基于 MIT 许可证发布的自由软件。你可以自由使用、修改和分发本软件。",
  },
  {
    icon: <AlertCircle className="w-6 h-6" />,
    title: "免责声明",
    content: "本软件按「现状」提供，不提供任何明示或暗示的担保。使用本软件的风险由用户自行承担。",
  },
  {
    icon: <Info className="w-6 h-6" />,
    title: "数据责任",
    content: "你对自己的数据和创作内容负有全部责任。建议定期备份你的数据，我们不对数据丢失承担责任。",
  },
  {
    icon: <FileText className="w-6 h-6" />,
    title: "知识产权",
    content: "你的创作内容的知识产权完全属于你。Novel Editor 不会对用户创作的内容主张任何权利。",
  },
];

export function TermsPageContent() {
  return (
    <div className="min-h-screen bg-white dark:bg-black">
      {/* Hero Section */}
      <section className="py-20 md:py-32 border-b border-gray-200/50 dark:border-gray-800/50">
        <div className="container mx-auto px-4">
          <ScrollReveal>
            <div className="max-w-3xl mx-auto text-center">
              <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gray-100 dark:bg-gray-800 mb-6 border-2 border-gray-300 dark:border-gray-700">
                <FileText className="w-10 h-10 text-gray-900 dark:text-white" />
              </div>
              <h1 className="text-5xl md:text-6xl font-black mb-6 text-gray-900 dark:text-white tracking-tight">
                使用条款
              </h1>
              <p className="text-xl md:text-2xl text-gray-600 dark:text-gray-300 leading-relaxed font-light">
                请在使用 Novel Editor 前仔细阅读本使用条款
              </p>
            </div>
          </ScrollReveal>
        </div>
      </section>

      {/* Terms Sections */}
      <section className="py-24 md:py-32">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <div className="mb-12">
              <h2 className="text-3xl md:text-4xl font-bold mb-6 text-gray-900 dark:text-white">
                使用条款
              </h2>
              <p className="text-lg text-gray-600 dark:text-gray-300 leading-relaxed">
                最后更新：{new Date().toLocaleDateString("zh-CN")}
              </p>
            </div>

            <div className="space-y-8 mb-12">
              {termsSections.map((section, index) => (
                <ScrollReveal key={section.title} direction="up" delay={index * 100}>
                  <Card>
                    <CardHeader>
                      <div className="flex items-center gap-4 mb-2">
                        <div className="w-12 h-12 rounded-xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                          <div className="text-gray-900 dark:text-white">
                            {section.icon}
                          </div>
                        </div>
                        <CardTitle className="text-2xl">{section.title}</CardTitle>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
                        {section.content}
                      </p>
                    </CardContent>
                  </Card>
                </ScrollReveal>
              ))}
            </div>

            <div className="prose prose-lg dark:prose-invert max-w-none">
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                完整条款
              </h3>
              <div className="space-y-4 text-gray-600 dark:text-gray-300 leading-relaxed">
                <p>
                  通过使用 Novel Editor，你同意遵守以下条款：
                </p>
                <ol className="list-decimal list-inside space-y-3 ml-4">
                  <li>
                    <strong className="text-gray-900 dark:text-white">许可范围：</strong>
                    你可以自由使用、复制、修改、合并、发布、分发和/或出售本软件的副本。
                  </li>
                  <li>
                    <strong className="text-gray-900 dark:text-white">免责声明：</strong>
                    本软件按「现状」提供，不提供任何形式的担保。我们不对因使用或无法使用
                    本软件而导致的任何损害承担责任。
                  </li>
                  <li>
                    <strong className="text-gray-900 dark:text-white">数据安全：</strong>
                    虽然我们努力确保应用的安全性，但用户应对自己的数据负责。
                    建议定期备份重要数据。
                  </li>
                  <li>
                    <strong className="text-gray-900 dark:text-white">版权声明：</strong>
                    用户的创作内容的知识产权完全属于用户。Novel Editor 不会对
                    用户创作的内容主张任何权利或控制权。
                  </li>
                  <li>
                    <strong className="text-gray-900 dark:text-white">修改权利：</strong>
                    我们保留随时修改本使用条款的权利。重大变更会在应用更新时通知用户。
                  </li>
                </ol>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}








