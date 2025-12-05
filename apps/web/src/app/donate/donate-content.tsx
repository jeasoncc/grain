"use client";

import { Heart, QrCode, Sparkles } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollReveal } from "@/components/ui/scroll-reveal";
import { cn } from "@/lib/utils";

export function DonatePageContent() {
  return (
    <div className="min-h-screen bg-white dark:bg-black">
      {/* Hero Section */}
      <section className="py-20 md:py-32 border-b border-gray-200/50 dark:border-gray-800/50 bg-gradient-to-b from-white via-gray-50/30 to-white dark:from-gray-900 dark:via-gray-800/30 dark:to-gray-900 relative overflow-hidden">
        {/* 精致的背景装饰 */}
        <div className="absolute inset-0">
          <div className="absolute inset-0 opacity-[0.02] dark:opacity-[0.04]">
            <div className="absolute inset-0" style={{
              backgroundImage: `linear-gradient(to right, currentColor 1px, transparent 1px), linear-gradient(to bottom, currentColor 1px, transparent 1px)`,
              backgroundSize: "64px 64px",
            }}></div>
          </div>
          <div className="absolute top-0 left-0 w-64 h-64 bg-gray-100/5 dark:bg-gray-800/5 rounded-full blur-3xl animate-float-gentle"></div>
          <div className="absolute bottom-0 right-0 w-96 h-96 bg-gray-100/5 dark:bg-gray-800/5 rounded-full blur-3xl animate-float-gentle" style={{ animationDelay: "1s" }}></div>
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] bg-gray-100/3 dark:bg-gray-800/3 rounded-full blur-3xl animate-breathe"></div>
        </div>

        <div className="container mx-auto px-4 relative z-10">
          <ScrollReveal>
            <div className="max-w-3xl mx-auto text-center">
              <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gray-100 dark:bg-gray-800 mb-6 border-2 border-gray-300 dark:border-gray-700 relative group">
                <Heart className="w-10 h-10 text-red-500 fill-red-500 group-hover:scale-110 transition-transform duration-300" />
                <div className="absolute -top-1 -right-1">
                  <Sparkles className="w-5 h-5 text-gray-600 dark:text-gray-300 animate-pulse" />
                </div>
              </div>
              
              <h1 className="text-5xl md:text-6xl font-black mb-6 text-gray-900 dark:text-white tracking-tight relative inline-block group/title">
                <span className="relative z-10">支持 Novel Editor</span>
                <span className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-24 h-1 bg-gray-300 dark:bg-gray-700 rounded-full opacity-0 group-hover/title:opacity-100 transition-opacity duration-300"></span>
              </h1>
              
              <p className="text-xl md:text-2xl text-gray-600 dark:text-gray-300 leading-relaxed font-light mb-8">
                Novel Editor 是开源免费的项目，您的支持将帮助我们持续改进
              </p>
            </div>
          </ScrollReveal>
        </div>
      </section>

      {/* Donation Methods - 只包含微信和支付宝 */}
      <section className="py-24 md:py-32">
        <div className="container mx-auto px-4 max-w-4xl">
          <div className="grid md:grid-cols-2 gap-8 mb-12">
            {/* 微信支付 */}
            <ScrollReveal direction="up" delay={100}>
              <Card className="relative group h-full transition-all duration-300 overflow-hidden shadow-lg hover:shadow-xl hover:-translate-y-2 border-2 border-gray-200 dark:border-gray-800">
                {/* 装饰性渐变层 */}
                <div className="absolute inset-0 bg-gradient-to-br from-green-50/0 via-transparent to-green-100/0 dark:from-green-900/0 dark:to-green-800/0 opacity-0 group-hover:opacity-100 group-hover:from-green-50/50 dark:group-hover:from-green-900/20 transition-all duration-500 pointer-events-none"></div>
                
                {/* 装饰性角落 */}
                <div className="absolute top-0 right-0 w-32 h-32 bg-green-100/10 dark:bg-green-800/10 rounded-bl-full opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                
                <CardHeader className="text-center pb-6 relative z-10">
                  <div className="inline-flex items-center justify-center w-16 h-16 rounded-xl bg-green-100 dark:bg-green-900 mb-4 group-hover:bg-green-200 dark:group-hover:bg-green-800 group-hover:scale-110 transition-all duration-300 shadow-sm border border-green-200/50 dark:border-green-700/50">
                    <QrCode className="w-8 h-8 text-green-600 dark:text-green-400" />
                  </div>
                  <CardTitle className="text-2xl font-bold mb-2 group-hover:text-gray-900 dark:group-hover:text-white transition-colors duration-300">微信支付</CardTitle>
                  <p className="text-sm text-gray-600 dark:text-gray-300">
                    扫描二维码进行捐赠
                  </p>
                </CardHeader>
                
                <CardContent className="relative z-10">
                  <div className="flex justify-center mb-4">
                    <div className="relative group/qr">
                      {/* 二维码占位符 */}
                      <div className="w-64 h-64 bg-gray-100 dark:bg-gray-800 rounded-lg border-2 border-gray-200 dark:border-gray-700 flex items-center justify-center group-hover/qr:border-green-300 dark:group-hover/qr:border-green-700 transition-all duration-300 shadow-md">
                        <div className="text-center p-4">
                          <QrCode className="w-24 h-24 text-gray-400 dark:text-gray-600 mx-auto mb-2" />
                          <p className="text-xs text-gray-500 dark:text-gray-300 font-medium">
                            请上传微信收款二维码
                          </p>
                          <p className="text-[10px] text-gray-400 dark:text-gray-400 mt-1">
                            256x256px 或更大
                          </p>
                        </div>
                      </div>
                      {/* 装饰性光晕 */}
                      <div className="absolute inset-0 rounded-lg bg-green-200/30 dark:bg-green-800/30 opacity-0 group-hover/qr:opacity-100 transition-opacity duration-300 blur-xl -z-10"></div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </ScrollReveal>

            {/* 支付宝 */}
            <ScrollReveal direction="up" delay={200}>
              <Card className="relative group h-full transition-all duration-300 overflow-hidden shadow-lg hover:shadow-xl hover:-translate-y-2 border-2 border-gray-200 dark:border-gray-800">
                {/* 装饰性渐变层 */}
                <div className="absolute inset-0 bg-gradient-to-br from-blue-50/0 via-transparent to-blue-100/0 dark:from-blue-900/0 dark:to-blue-800/0 opacity-0 group-hover:opacity-100 group-hover:from-blue-50/50 dark:group-hover:from-blue-900/20 transition-all duration-500 pointer-events-none"></div>
                
                {/* 装饰性角落 */}
                <div className="absolute top-0 right-0 w-32 h-32 bg-blue-100/10 dark:bg-blue-800/10 rounded-bl-full opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                
                <CardHeader className="text-center pb-6 relative z-10">
                  <div className="inline-flex items-center justify-center w-16 h-16 rounded-xl bg-blue-100 dark:bg-blue-900 mb-4 group-hover:bg-blue-200 dark:group-hover:bg-blue-800 group-hover:scale-110 transition-all duration-300 shadow-sm border border-blue-200/50 dark:border-blue-700/50">
                    <QrCode className="w-8 h-8 text-blue-600 dark:text-blue-400" />
                  </div>
                  <CardTitle className="text-2xl font-bold mb-2 group-hover:text-gray-900 dark:group-hover:text-white transition-colors duration-300">支付宝</CardTitle>
                  <p className="text-sm text-gray-600 dark:text-gray-300">
                    扫描二维码进行捐赠
                  </p>
                </CardHeader>
                
                <CardContent className="relative z-10">
                  <div className="flex justify-center mb-4">
                    <div className="relative group/qr">
                      {/* 二维码占位符 */}
                      <div className="w-64 h-64 bg-gray-100 dark:bg-gray-800 rounded-lg border-2 border-gray-200 dark:border-gray-700 flex items-center justify-center group-hover/qr:border-blue-300 dark:group-hover/qr:border-blue-700 transition-all duration-300 shadow-md">
                        <div className="text-center p-4">
                          <QrCode className="w-24 h-24 text-gray-400 dark:text-gray-600 mx-auto mb-2" />
                          <p className="text-xs text-gray-500 dark:text-gray-300 font-medium">
                            请上传支付宝收款二维码
                          </p>
                          <p className="text-[10px] text-gray-400 dark:text-gray-400 mt-1">
                            256x256px 或更大
                          </p>
                        </div>
                      </div>
                      {/* 装饰性光晕 */}
                      <div className="absolute inset-0 rounded-lg bg-blue-200/30 dark:bg-blue-800/30 opacity-0 group-hover/qr:opacity-100 transition-opacity duration-300 blur-xl -z-10"></div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </ScrollReveal>
          </div>
        </div>
      </section>

      {/* Thank you message */}
      <section className="py-16 md:py-24 bg-gray-50 dark:bg-gray-950 relative overflow-hidden">
        <div className="absolute inset-0 opacity-[0.02] dark:opacity-[0.04]">
          <div className="absolute inset-0" style={{
            backgroundImage: `radial-gradient(circle at 2px 2px, currentColor 1px, transparent 0)`,
            backgroundSize: "40px 40px",
          }}></div>
        </div>
        
        <div className="container mx-auto px-4 relative z-10 max-w-3xl">
          <ScrollReveal direction="up" delay={300}>
            <Card className="bg-white dark:bg-black border-2 border-gray-200 dark:border-gray-800 shadow-lg">
              <CardContent className="pt-10 pb-10">
                <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-red-100 dark:bg-red-900/30 mb-6 mx-auto relative group">
                  <Heart className="w-10 h-10 text-red-500 fill-red-500 animate-pulse group-hover:scale-110 transition-transform duration-300" />
                  <div className="absolute -top-1 -right-1">
                    <Sparkles className="w-5 h-5 text-red-500 animate-pulse" />
                  </div>
                </div>
                <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-4 text-center">
                  感谢您的支持！
                </h3>
                <p className="text-gray-600 dark:text-gray-300 leading-relaxed text-center mb-6">
                  您的每一份支持都是我们继续前进的动力。我们会将收到的捐赠用于：
                </p>
                <ul className="space-y-3 text-left max-w-md mx-auto">
                  {[
                    "持续开发和维护项目",
                    "改进用户体验和性能",
                    "提供更好的文档和支持",
                    "支持服务器和基础设施成本",
                  ].map((item, index) => (
                    <li key={index} className="flex items-start gap-3 text-sm text-gray-600 dark:text-gray-300">
                      <span className="text-red-500 mt-1 font-bold">•</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </ScrollReveal>
        </div>
      </section>
    </div>
  );
}








