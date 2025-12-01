import { Download, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollReveal } from "@/components/ui/scroll-reveal";
import Link from "next/link";

export function CTASection() {
  return (
    <section className="relative py-24 md:py-32 bg-gray-900 dark:bg-black border-t border-gray-800/50 overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0">
        <div className="absolute inset-0 opacity-[0.03]">
          <div className="absolute inset-0" style={{
            backgroundImage: `radial-gradient(circle at 2px 2px, currentColor 1px, transparent 0)`,
            backgroundSize: "50px 50px",
          }}></div>
        </div>
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-white/5 rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-white/5 rounded-full blur-3xl"></div>
      </div>
      
      <div className="container mx-auto px-4 relative z-10">
        <div className="max-w-3xl mx-auto text-center">
          <ScrollReveal direction="up" delay={100}>
            <h2 className="text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-black mb-8 text-white tracking-[-0.02em] leading-[1.1] relative inline-block">
              <span className="relative z-10">准备开始创作了吗？</span>
              <span className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-24 h-1 bg-white/20 rounded-full"></span>
            </h2>
          </ScrollReveal>

          <ScrollReveal direction="up" delay={200}>
            <p className="text-xl md:text-2xl text-gray-400 mb-14 leading-[1.8] font-light max-w-2xl mx-auto">
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
                <Link href="/download">
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
                  href="https://github.com/jeasoncc/novel-editor"
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
