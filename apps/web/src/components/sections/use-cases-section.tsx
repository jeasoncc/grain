import { BookOpen, PenTool, Users, Target, FileText, Lightbulb } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { SectionHeader } from "@/components/ui/section-header";
import { ScrollReveal } from "@/components/ui/scroll-reveal";

const useCases = [
  {
    icon: <PenTool className="w-6 h-6 text-gray-900 dark:text-white" />,
    title: "网络小说创作",
    description:
      "适合连载长篇小说，强大的章节管理和大纲功能让你轻松掌控复杂剧情线，角色数据库帮助保持角色一致性。",
    features: ["章节管理", "角色一致性", "剧情大纲"],
  },
  {
    icon: <BookOpen className="w-6 h-6 text-gray-900 dark:text-white" />,
    title: "独立作者创作",
    description:
      "专为独立作者设计，从初稿到最终版本，完整的创作工具链支持你完成整个创作流程。",
    features: ["全流程支持", "离线工作", "多格式导出"],
  },
  {
    icon: <Users className="w-6 h-6 text-gray-900 dark:text-white" />,
    title: "学生创作实践",
    description:
      "适合学生进行创作练习，简洁的界面、清晰的工具，帮助你专注于创作本身，提升写作能力。",
    features: ["简洁界面", "专注写作", "统计功能"],
  },
  {
    icon: <Target className="w-6 h-6 text-gray-900 dark:text-white" />,
    title: "写作习惯养成",
    description:
      "每日写作目标、进度追踪、写作统计等功能，帮助你建立并保持稳定的创作习惯。",
    features: ["写作目标", "进度追踪", "习惯养成"],
  },
  {
    icon: <FileText className="w-6 h-6 text-gray-900 dark:text-white" />,
    title: "世界观构建",
    description:
      "复杂的世界观设定？没问题。完整的世界观数据库让你轻松管理地点、势力、物品等所有设定元素。",
    features: ["世界观数据库", "设定管理", "关系梳理"],
  },
  {
    icon: <Lightbulb className="w-6 h-6 text-gray-900 dark:text-white" />,
    title: "创意项目规划",
    description:
      "从创意到成书，可视化的大纲和卡片视图帮助你规划项目结构，确保创作方向清晰。",
    features: ["可视化大纲", "项目规划", "结构管理"],
  },
];

export function UseCasesSection() {
  return (
    <section className="py-24 md:py-32 bg-white dark:bg-gray-900 relative overflow-hidden">
      {/* Subtle background pattern */}
      <div className="absolute inset-0">
        <div className="absolute inset-0 opacity-[0.015] dark:opacity-[0.03]">
          <div className="absolute inset-0" style={{
            backgroundImage: `linear-gradient(90deg, transparent 0%, currentColor 50%, transparent 100%), linear-gradient(0deg, transparent 0%, currentColor 50%, transparent 100%)`,
            backgroundSize: "60px 60px",
          }}></div>
        </div>
        {/* Decorative background elements */}
        <div className="absolute top-1/4 left-0 w-72 h-72 bg-gray-100/20 dark:bg-gray-800/20 rounded-full blur-3xl"></div>
        <div className="absolute bottom-1/4 right-0 w-72 h-72 bg-gray-100/20 dark:bg-gray-800/20 rounded-full blur-3xl"></div>
      </div>

      <div className="container mx-auto px-4 relative z-10">
        <ScrollReveal>
          <SectionHeader
            title="适用场景"
            description="Novel Editor 适合各种类型的创作者和创作场景"
            subtitle="Use Cases"
          />
        </ScrollReveal>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
          {useCases.map((useCase, index) => (
            <ScrollReveal
              key={index}
              direction="up"
              delay={index * 100}
            >
              <Card className="group relative overflow-hidden border-2 border-gray-200/80 dark:border-gray-700/80 hover:border-gray-900 dark:hover:border-gray-100 bg-white dark:bg-gray-800 shadow-[0_4px_14px_rgba(0,0,0,0.06)] dark:shadow-[0_4px_14px_rgba(255,255,255,0.03)] hover:shadow-[0_8px_30px_rgba(0,0,0,0.12)] dark:hover:shadow-[0_8px_30px_rgba(255,255,255,0.08)] transition-all duration-300 hover:-translate-y-2">
                <CardHeader className="relative z-10">
                  <div className="mb-6 transform group-hover:scale-110 group-hover:rotate-3 transition-all duration-300">
                    <div className="w-14 h-14 rounded-xl bg-gray-100/80 dark:bg-gray-700/80 backdrop-blur-sm flex items-center justify-center border-2 border-gray-200/50 dark:border-gray-600/50 group-hover:border-gray-900 dark:group-hover:border-gray-100 transition-all duration-300 shadow-sm">
                      {useCase.icon}
                    </div>
                  </div>
                  <CardTitle className="text-xl mb-3 text-gray-900 dark:text-white group-hover:text-gray-700 dark:group-hover:text-gray-200 transition-colors font-bold leading-snug">
                    {useCase.title}
                  </CardTitle>
                </CardHeader>
                <CardContent className="relative z-10">
                  <CardDescription className="text-[15px] leading-[1.8] mb-6 text-gray-600 dark:text-gray-400 font-light">
                    {useCase.description}
                  </CardDescription>
                  <div className="flex flex-wrap gap-2.5">
                    {useCase.features.map((feature, i) => (
                      <span
                        key={i}
                        className="px-4 py-2 bg-gray-100/80 dark:bg-gray-700/80 backdrop-blur-sm text-gray-700 dark:text-gray-300 rounded-lg text-sm font-medium border border-gray-200/50 dark:border-gray-600/50 hover:border-gray-400 dark:hover:border-gray-500 hover:bg-gray-200 dark:hover:bg-gray-600 transition-all duration-300 hover:scale-105"
                      >
                        {feature}
                      </span>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </ScrollReveal>
          ))}
        </div>
      </div>
    </section>
  );
}
