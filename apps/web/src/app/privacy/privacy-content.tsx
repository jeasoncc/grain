"use client";

import { Shield, Lock, Eye, Server } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollReveal } from "@/components/ui/scroll-reveal";

const privacySections = [
  {
    icon: <Lock className="w-6 h-6" />,
    title: "数据存储",
    content: "Novel Editor 的所有数据都存储在本地设备上，使用浏览器的 IndexedDB 数据库。你的创作内容、角色信息、项目数据等都不会上传到任何服务器。",
  },
  {
    icon: <Eye className="w-6 h-6" />,
    title: "隐私保护",
    content: "我们不会收集、存储或访问你的任何个人数据或创作内容。应用完全离线工作，你的隐私得到完全保护。",
  },
  {
    icon: <Server className="w-6 h-6" />,
    title: "数据备份",
    content: "你可以手动导出项目数据进行备份。导出文件存储在你自己选择的位置，完全由你控制。",
  },
  {
    icon: <Shield className="w-6 h-6" />,
    title: "安全承诺",
    content: "我们承诺永远不访问、不收集、不上传你的任何数据。所有数据都在你的本地设备上，你拥有完全的控制权。",
  },
];

export function PrivacyPageContent() {
  return (
    <div className="min-h-screen bg-white dark:bg-black">
      {/* Hero Section */}
      <section className="py-20 md:py-32 border-b border-gray-200/50 dark:border-gray-800/50">
        <div className="container mx-auto px-4">
          <ScrollReveal>
            <div className="max-w-3xl mx-auto text-center">
              <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gray-100 dark:bg-gray-800 mb-6 border-2 border-gray-300 dark:border-gray-700">
                <Shield className="w-10 h-10 text-gray-900 dark:text-white" />
              </div>
              <h1 className="text-5xl md:text-6xl font-black mb-6 text-gray-900 dark:text-white tracking-tight">
                隐私政策
              </h1>
              <p className="text-xl md:text-2xl text-gray-600 dark:text-gray-300 leading-relaxed font-light">
                我们重视你的隐私，承诺保护你的数据安全
              </p>
            </div>
          </ScrollReveal>
        </div>
      </section>

      {/* Privacy Sections */}
      <section className="py-24 md:py-32">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <div className="mb-12">
              <h2 className="text-3xl md:text-4xl font-bold mb-6 text-gray-900 dark:text-white">
                我们的隐私承诺
              </h2>
              <p className="text-lg text-gray-600 dark:text-gray-300 leading-relaxed">
                最后更新：{new Date().toLocaleDateString("zh-CN")}
              </p>
            </div>

            <div className="space-y-8 mb-12">
              {privacySections.map((section, index) => (
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
                详细信息
              </h3>
              <div className="space-y-4 text-gray-600 dark:text-gray-300 leading-relaxed">
                <p>
                  Novel Editor 是一款完全离线的桌面应用程序。我们设计的核心理念是保护用户隐私，
                  因此应用不会收集、传输或存储任何数据到外部服务器。
                </p>
                <p>
                  <strong className="text-gray-900 dark:text-white">本地存储：</strong>
                  所有数据（包括项目、场景、角色信息等）都存储在本地设备的 IndexedDB 数据库中。
                  这些数据只存在于你的设备上，不会离开你的设备。
                </p>
                <p>
                  <strong className="text-gray-900 dark:text-white">无网络连接：</strong>
                  Novel Editor 可以在完全离线的情况下工作。应用不需要网络连接，
                  也不会向任何服务器发送数据请求。
                </p>
                <p>
                  <strong className="text-gray-900 dark:text-white">数据控制：</strong>
                  你对自己的数据拥有完全的控制权。你可以随时导出、删除或备份你的数据。
                  应用本身不会自动删除或修改你的数据。
                </p>
                <p>
                  <strong className="text-gray-900 dark:text-white">未来更新：</strong>
                  即使在未来版本中，我们也不会改变这个核心承诺。如果将来需要添加任何
                  涉及数据传输的功能，我们会在更新日志中明确说明，并让用户选择是否启用。
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}


