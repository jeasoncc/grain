import { Shield, AlertTriangle, Mail, Github } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollReveal } from "@/components/ui/scroll-reveal";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "安全政策",
  description: "Novel Editor 安全政策 - 报告安全漏洞的指南",
};

const securityPolicy = [
  {
    icon: <Shield className="w-6 h-6" />,
    title: "支持的版本",
    description: "我们目前支持以下版本的 Novel Editor，并提供安全更新：",
    content: (
      <ul className="list-disc list-inside space-y-2 text-gray-600 dark:text-gray-400">
        <li>最新主版本（当前开发分支）</li>
        <li>最新的稳定发布版本</li>
      </ul>
    ),
  },
  {
    icon: <AlertTriangle className="w-6 h-6" />,
    title: "报告安全漏洞",
    description: "我们非常重视安全问题。如果您发现了安全漏洞，请按照以下步骤报告：",
    content: (
      <ol className="list-decimal list-inside space-y-3 text-gray-600 dark:text-gray-400">
        <li>
          <strong className="text-gray-900 dark:text-white">不要公开披露漏洞</strong>
          <br />
          在修复之前，请不要在公开渠道（如 GitHub Issues）披露安全问题。
        </li>
        <li>
          <strong className="text-gray-900 dark:text-white">通过安全渠道报告</strong>
          <br />
          请通过以下方式报告：
          <ul className="list-disc list-inside ml-6 mt-2 space-y-1">
            <li>发送邮件至：security@novel-editor.com</li>
            <li>或在 GitHub 上创建私有安全建议（Security Advisory）</li>
          </ul>
        </li>
        <li>
          <strong className="text-gray-900 dark:text-white">提供详细信息</strong>
          <br />
          请在报告中包含以下信息：
          <ul className="list-disc list-inside ml-6 mt-2 space-y-1">
            <li>漏洞的类型和影响范围</li>
            <li>复现步骤</li>
            <li>可能的影响和潜在风险</li>
            <li>建议的修复方案（如果有）</li>
          </ul>
        </li>
      </ol>
    ),
  },
  {
    icon: <Mail className="w-6 h-6" />,
    title: "响应时间",
    description: "我们承诺：",
    content: (
      <ul className="list-disc list-inside space-y-2 text-gray-600 dark:text-gray-400">
        <li>在 48 小时内确认收到您的报告</li>
        <li>在 7 天内提供初步评估</li>
        <li>在确认漏洞后，尽快发布修复补丁</li>
        <li>在修复后，在安全公告中致谢报告者（如同意）</li>
      </ul>
    ),
  },
];

const vulnerabilityTypes = [
  {
    type: "严重漏洞",
    description: "可能导致远程代码执行、数据泄露或服务中断的漏洞",
    examples: ["代码注入", "SQL 注入", "远程代码执行", "严重的信息泄露"],
  },
  {
    type: "高风险漏洞",
    description: "可能导致权限提升、敏感信息泄露的漏洞",
    examples: ["权限绕过", "跨站脚本（XSS）", "不安全的反序列化"],
  },
  {
    type: "中等风险漏洞",
    description: "可能导致部分功能异常或信息泄露的漏洞",
    examples: ["CSRF", "不安全的随机数生成", "信息泄露"],
  },
  {
    type: "低风险漏洞",
    description: "影响有限或需要特定条件才能利用的漏洞",
    examples: ["点击劫持", "HTTP 安全头缺失", "不安全的默认配置"],
  },
];

export default function SecurityPage() {
  return (
    <div className="min-h-screen bg-white dark:bg-gray-900">
      {/* Hero Section */}
      <section className="py-20 md:py-32 border-b border-gray-200/50 dark:border-gray-800/50">
        <div className="container mx-auto px-4">
          <ScrollReveal>
            <div className="max-w-3xl mx-auto text-center">
              <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gray-100 dark:bg-gray-800 mb-6 border-2 border-gray-300 dark:border-gray-700">
                <Shield className="w-10 h-10 text-gray-900 dark:text-white" />
              </div>
              <h1 className="text-5xl md:text-6xl font-black mb-6 text-gray-900 dark:text-white tracking-tight">
                安全政策
              </h1>
              <p className="text-xl md:text-2xl text-gray-600 dark:text-gray-400 leading-relaxed font-light">
                我们非常重视安全性，并致力于保护用户数据
              </p>
            </div>
          </ScrollReveal>
        </div>
      </section>

      {/* Security Policy Content */}
      <section className="py-24 md:py-32">
        <div className="container mx-auto px-4 max-w-4xl">
          <div className="space-y-12">
            {securityPolicy.map((policy, index) => (
              <ScrollReveal key={policy.title} direction="up" delay={index * 100}>
                <Card>
                  <CardHeader>
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 rounded-xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center flex-shrink-0">
                        <div className="text-gray-900 dark:text-white">{policy.icon}</div>
                      </div>
                      <div className="flex-1">
                        <CardTitle className="text-2xl mb-2">{policy.title}</CardTitle>
                        <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
                          {policy.description}
                        </p>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="pl-20">{policy.content}</CardContent>
                </Card>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      {/* Vulnerability Types */}
      <section className="py-24 md:py-32 bg-gray-50 dark:bg-gray-950">
        <div className="container mx-auto px-4 max-w-5xl">
          <ScrollReveal>
            <h2 className="text-3xl md:text-4xl font-bold mb-12 text-center text-gray-900 dark:text-white">
              漏洞分类
            </h2>
          </ScrollReveal>
          <div className="grid md:grid-cols-2 gap-6">
            {vulnerabilityTypes.map((item, index) => (
              <ScrollReveal key={item.type} direction="up" delay={index * 100}>
                <Card>
                  <CardHeader>
                    <CardTitle className="text-xl">{item.type}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-gray-600 dark:text-gray-400 mb-4">{item.description}</p>
                    <p className="text-sm font-semibold text-gray-900 dark:text-white mb-2">
                      示例：
                    </p>
                    <ul className="list-disc list-inside space-y-1 text-sm text-gray-600 dark:text-gray-400">
                      {item.examples.map((example, i) => (
                        <li key={i}>{example}</li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      {/* Responsible Disclosure */}
      <section className="py-24 md:py-32">
        <div className="container mx-auto px-4 max-w-3xl">
          <ScrollReveal>
            <Card className="border-2 border-gray-300 dark:border-gray-700">
              <CardHeader>
                <CardTitle className="text-2xl text-center">负责任的披露</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="prose prose-lg dark:prose-invert max-w-none text-gray-600 dark:text-gray-400">
                  <p>
                    我们遵循负责任的安全披露原则。报告者应该：
                  </p>
                  <ul className="list-disc list-inside space-y-2">
                    <li>给予我们合理的时间来修复漏洞</li>
                    <li>不在修复前公开披露细节</li>
                    <li>不利用漏洞进行恶意活动</li>
                    <li>仅访问自己的数据以验证漏洞</li>
                  </ul>
                  <p className="mt-6">
                    我们承诺会及时响应并修复所有报告的安全问题，并在适当的时候致谢报告者。
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
                报告安全问题
              </h2>
              <p className="text-xl text-gray-600 dark:text-gray-400 mb-8">
                如果您发现了安全漏洞，请通过安全渠道联系我们
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button size="lg" asChild>
                  <a href="mailto:security@novel-editor.com">
                    <Mail className="w-5 h-5 mr-2" />
                    发送邮件
                  </a>
                </Button>
                <Button variant="outline" size="lg" asChild>
                  <Link
                    href="https://github.com/jeasoncc/novel-editor/security/advisories/new"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <Github className="w-5 h-5 mr-2" />
                    GitHub 安全建议
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

