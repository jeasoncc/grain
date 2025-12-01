import { Download, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollReveal } from "@/components/ui/scroll-reveal";
import Link from "next/link";

export function CTASection() {
  return (
    <section className="relative py-24 md:py-32 bg-gray-900 dark:bg-black border-t border-gray-800">
      <div className="container mx-auto px-4">
        <div className="max-w-3xl mx-auto text-center">
          <ScrollReveal direction="up" delay={100}>
            <h2 className="text-4xl md:text-5xl font-bold mb-6 text-white">
              准备开始创作了吗？
            </h2>
          </ScrollReveal>

          <ScrollReveal direction="up" delay={200}>
            <p className="text-xl text-gray-400 mb-10 leading-relaxed">
              立即下载 Novel Editor，开启你的创作之旅。
              <br />
              免费、开源、功能强大，专为长篇小说创作而设计。
            </p>
          </ScrollReveal>

          <ScrollReveal direction="up" delay={300}>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button
                size="lg"
                className="text-lg px-10 py-6 h-auto bg-white text-gray-900 hover:bg-gray-100 shadow-lg"
                asChild
              >
                <Link href="#download">
                  <Download className="w-5 h-5 mr-2" />
                  立即下载
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Link>
              </Button>
              <Button
                variant="outline"
                size="lg"
                className="text-lg px-10 py-6 h-auto border-2 border-white text-white hover:bg-white hover:text-gray-900"
                asChild
              >
                <Link
                  href="https://github.com/yourusername/novel-editor"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  查看源码
                </Link>
              </Button>
            </div>
          </ScrollReveal>
        </div>
      </div>
    </section>
  );
}
