import { Scale, Code, FileText, Github } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollReveal } from "@/components/ui/scroll-reveal";
import { Button } from "@/components/ui/button";
import Link from "next/link";

const licenseInfo = [
  {
    icon: <Code className="w-6 h-6" />,
    title: "MIT 许可证",
    description: "Novel Editor 基于 MIT 许可证发布，这是最宽松的开源许可证之一。",
  },
  {
    icon: <FileText className="w-6 h-6" />,
    title: "使用自由",
    description: "你可以自由使用、修改、分发本软件，包括商业用途。",
  },
  {
    icon: <Github className="w-6 h-6" />,
    title: "开源友好",
    description: "欢迎贡献代码、提出建议或报告问题。让我们一起改进这个项目。",
  },
];

const mitLicense = `MIT License

Copyright (c) ${new Date().getFullYear()} Novel Editor Contributors

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.`;

export default function LicensePage() {
  return (
    <div className="min-h-screen bg-white dark:bg-gray-900">
      {/* Hero Section */}
      <section className="py-20 md:py-32 border-b border-gray-200/50 dark:border-gray-800/50">
        <div className="container mx-auto px-4">
          <ScrollReveal>
            <div className="max-w-3xl mx-auto text-center">
              <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gray-100 dark:bg-gray-800 mb-6 border-2 border-gray-300 dark:border-gray-700">
                <Scale className="w-10 h-10 text-gray-900 dark:text-white" />
              </div>
              <h1 className="text-5xl md:text-6xl font-black mb-6 text-gray-900 dark:text-white tracking-tight">
                许可证
              </h1>
              <p className="text-xl md:text-2xl text-gray-600 dark:text-gray-400 leading-relaxed font-light">
                Novel Editor 基于 MIT 许可证发布，完全开源和自由
              </p>
            </div>
          </ScrollReveal>
        </div>
      </section>

      {/* License Info */}
      <section className="py-24 md:py-32">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto mb-16">
            {licenseInfo.map((info, index) => (
              <ScrollReveal key={info.title} direction="up" delay={index * 100}>
                <Card className="h-full">
                  <CardHeader>
                    <div className="w-12 h-12 rounded-xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center mb-4">
                      <div className="text-gray-900 dark:text-white">
                        {info.icon}
                      </div>
                    </div>
                    <CardTitle className="text-xl">{info.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
                      {info.description}
                    </p>
                  </CardContent>
                </Card>
              </ScrollReveal>
            ))}
          </div>

          {/* MIT License Text */}
          <ScrollReveal direction="up" delay={300}>
            <Card className="max-w-4xl mx-auto">
              <CardHeader>
                <CardTitle className="text-2xl">MIT 许可证全文</CardTitle>
              </CardHeader>
              <CardContent>
                <pre className="whitespace-pre-wrap text-sm text-gray-600 dark:text-gray-400 font-mono leading-relaxed bg-gray-50 dark:bg-gray-800 p-6 rounded-lg overflow-x-auto">
                  {mitLicense}
                </pre>
              </CardContent>
            </Card>
          </ScrollReveal>

          {/* What This Means */}
          <div className="max-w-4xl mx-auto mt-16">
            <ScrollReveal direction="up" delay={400}>
              <h2 className="text-3xl md:text-4xl font-bold mb-8 text-center text-gray-900 dark:text-white">
                这意味着什么？
              </h2>
              <div className="prose prose-lg dark:prose-invert max-w-none">
                <div className="space-y-4 text-gray-600 dark:text-gray-400 leading-relaxed">
                  <p>
                    <strong className="text-gray-900 dark:text-white">✅ 你可以：</strong>
                  </p>
                  <ul className="list-disc list-inside space-y-2 ml-4">
                    <li>自由使用 Novel Editor，包括商业用途</li>
                    <li>修改源代码以满足你的需求</li>
                    <li>分发原版或修改后的软件</li>
                    <li>将代码合并到你的项目中</li>
                  </ul>
                  <p className="mt-6">
                    <strong className="text-gray-900 dark:text-white">⚠️ 你需要：</strong>
                  </p>
                  <ul className="list-disc list-inside space-y-2 ml-4">
                    <li>保留原始的版权声明和许可证</li>
                    <li>在分发时包含完整的 MIT 许可证文本</li>
                  </ul>
                  <p className="mt-6">
                    <strong className="text-gray-900 dark:text-white">❌ 你不能：</strong>
                  </p>
                  <ul className="list-disc list-inside space-y-2 ml-4">
                    <li>移除版权声明</li>
                    <li>声称是你创建了原始软件</li>
                  </ul>
                </div>
              </div>
            </ScrollReveal>
          </div>

          {/* CTA */}
          <div className="max-w-2xl mx-auto mt-16 text-center">
            <ScrollReveal direction="up" delay={500}>
              <p className="text-lg text-gray-600 dark:text-gray-400 mb-6">
                想要查看源代码或参与贡献？
              </p>
              <Button size="lg" asChild>
                <Link
                  href="https://github.com/jeasoncc/novel-editor"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Github className="w-5 h-5 mr-2" />
                  访问 GitHub
                </Link>
              </Button>
            </ScrollReveal>
          </div>
        </div>
      </section>
    </div>
  );
}

