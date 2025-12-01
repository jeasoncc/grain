"use client";

import { Heart, Coffee, Gift, Sparkles, ArrowRight } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { SectionHeader } from "@/components/ui/section-header";
import { ScrollReveal } from "@/components/ui/scroll-reveal";
import { cn } from "@/lib/utils";

const donationMethods = [
  {
    name: "GitHub Sponsors",
    icon: <Sparkles className="w-6 h-6" />,
    description: "支持项目长期发展，获得专属徽章",
    url: "https://github.com/sponsors/jeasoncc",
    color: "hover:bg-purple-50 dark:hover:bg-purple-900/20",
    borderColor: "hover:border-purple-300 dark:hover:border-purple-700",
  },
  {
    name: "Buy Me a Coffee",
    icon: <Coffee className="w-6 h-6" />,
    description: "一杯咖啡，一份鼓励",
    url: "https://www.buymeacoffee.com/jeasoncc",
    color: "hover:bg-amber-50 dark:hover:bg-amber-900/20",
    borderColor: "hover:border-amber-300 dark:hover:border-amber-700",
  },
  {
    name: "爱发电",
    icon: <Gift className="w-6 h-6" />,
    description: "支持中文社区的创作者",
    url: "https://afdian.net/@jeasoncc",
    color: "hover:bg-pink-50 dark:hover:bg-pink-900/20",
    borderColor: "hover:border-pink-300 dark:hover:border-pink-700",
  },
];

export function DonationSection() {
  return (
    <section className="py-24 md:py-32 bg-gray-50 dark:bg-gray-950 relative overflow-hidden">
      {/* Decorative background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 right-1/4 w-96 h-96 bg-gray-200/20 dark:bg-gray-800/20 rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 left-1/4 w-96 h-96 bg-gray-200/20 dark:bg-gray-800/20 rounded-full blur-3xl"></div>
      </div>

      <div className="container mx-auto px-4 relative z-10">
        <ScrollReveal>
          <SectionHeader
            title="支持项目"
            description="Novel Editor 是开源免费的项目，您的支持将帮助我们持续改进"
            subtitle="Donate"
          />
        </ScrollReveal>

        {/* Donation cards */}
        <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto mb-12">
          {donationMethods.map((method, index) => (
            <ScrollReveal key={method.name} direction="up" delay={index * 100}>
              <Card
                className={cn(
                  "group relative overflow-hidden transition-all duration-300 hover:-translate-y-1",
                  method.color,
                  method.borderColor
                )}
              >
                {/* Decorative gradient overlay */}
                <div className="absolute inset-0 bg-gradient-to-br from-transparent via-transparent to-gray-100/0 dark:to-gray-800/0 opacity-0 group-hover:opacity-100 group-hover:via-gray-50/50 dark:group-hover:via-gray-800/30 transition-all duration-500 pointer-events-none"></div>

                <CardHeader className="text-center pb-4 relative z-10">
                  <div className="inline-flex items-center justify-center w-16 h-16 rounded-xl bg-gray-100 dark:bg-gray-800 mb-4 group-hover:bg-gray-200 dark:group-hover:bg-gray-700 group-hover:scale-110 transition-all duration-300">
                    <div className="text-gray-700 dark:text-gray-300 group-hover:text-gray-900 dark:group-hover:text-white transition-colors">
                      {method.icon}
                    </div>
                  </div>
                  <CardTitle className="text-xl mb-2">{method.name}</CardTitle>
                  <CardDescription className="text-sm">
                    {method.description}
                  </CardDescription>
                </CardHeader>
                <CardContent className="relative z-10">
                  <Button
                    className="w-full group/btn"
                    variant="outline"
                    asChild
                  >
                    <a
                      href={method.url}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <span>前往支持</span>
                      <ArrowRight className="w-4 h-4 ml-2 group-hover/btn:translate-x-1 transition-transform duration-300" />
                    </a>
                  </Button>
                </CardContent>
              </Card>
            </ScrollReveal>
          ))}
        </div>

        {/* Thank you message */}
        <ScrollReveal direction="up" delay={400}>
          <div className="max-w-3xl mx-auto text-center">
            <Card className="bg-white dark:bg-gray-900 border-2 border-gray-200 dark:border-gray-800">
              <CardContent className="pt-8 pb-8">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-100 dark:bg-gray-800 mb-4">
                  <Heart className="w-8 h-8 text-red-500 fill-red-500 animate-pulse" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3">
                  感谢您的支持！
                </h3>
                <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
                  您的每一份支持都是我们继续前进的动力。我们会将收到的捐赠用于：
                </p>
                <ul className="mt-4 space-y-2 text-left max-w-md mx-auto">
                  <li className="flex items-start gap-3 text-sm text-gray-600 dark:text-gray-400">
                    <span className="text-red-500 mt-1">•</span>
                    <span>持续开发和维护项目</span>
                  </li>
                  <li className="flex items-start gap-3 text-sm text-gray-600 dark:text-gray-400">
                    <span className="text-red-500 mt-1">•</span>
                    <span>改进用户体验和性能</span>
                  </li>
                  <li className="flex items-start gap-3 text-sm text-gray-600 dark:text-gray-400">
                    <span className="text-red-500 mt-1">•</span>
                    <span>提供更好的文档和支持</span>
                  </li>
                  <li className="flex items-start gap-3 text-sm text-gray-600 dark:text-gray-400">
                    <span className="text-red-500 mt-1">•</span>
                    <span>支持服务器和基础设施成本</span>
                  </li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </ScrollReveal>
      </div>
    </section>
  );
}


