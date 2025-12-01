import { BookOpen, PenTool, Users, Target, FileText, Lightbulb } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { SectionHeader } from "@/components/ui/section-header";
import { ScrollReveal } from "@/components/ui/scroll-reveal";

const useCases = [
  {
    icon: <PenTool className="w-8 h-8 text-blue-600" />,
    title: "网络小说创作",
    description:
      "适合连载长篇小说，强大的章节管理和大纲功能让你轻松掌控复杂剧情线，角色数据库帮助保持角色一致性。",
    features: ["章节管理", "角色一致性", "剧情大纲"],
  },
  {
    icon: <BookOpen className="w-8 h-8 text-purple-600" />,
    title: "独立作者创作",
    description:
      "专为独立作者设计，从初稿到最终版本，完整的创作工具链支持你完成整个创作流程。",
    features: ["全流程支持", "离线工作", "多格式导出"],
  },
  {
    icon: <Users className="w-8 h-8 text-green-600" />,
    title: "学生创作实践",
    description:
      "适合学生进行创作练习，简洁的界面、清晰的工具，帮助你专注于创作本身，提升写作能力。",
    features: ["简洁界面", "专注写作", "统计功能"],
  },
  {
    icon: <Target className="w-8 h-8 text-orange-600" />,
    title: "写作习惯养成",
    description:
      "每日写作目标、进度追踪、写作统计等功能，帮助你建立并保持稳定的创作习惯。",
    features: ["写作目标", "进度追踪", "习惯养成"],
  },
  {
    icon: <FileText className="w-8 h-8 text-pink-600" />,
    title: "世界观构建",
    description:
      "复杂的世界观设定？没问题。完整的世界观数据库让你轻松管理地点、势力、物品等所有设定元素。",
    features: ["世界观数据库", "设定管理", "关系梳理"],
  },
  {
    icon: <Lightbulb className="w-8 h-8 text-yellow-600" />,
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
      <div className="absolute inset-0 opacity-[0.015] dark:opacity-[0.03]">
        <div className="absolute inset-0" style={{
          backgroundImage: `linear-gradient(90deg, transparent 0%, currentColor 50%, transparent 100%), linear-gradient(0deg, transparent 0%, currentColor 50%, transparent 100%)`,
          backgroundSize: "60px 60px",
        }}></div>
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
              <Card className="group relative overflow-hidden border-2 border-transparent hover:border-blue-200 dark:hover:border-blue-800 bg-gradient-to-br from-white to-gray-50/50 dark:from-gray-900 dark:to-gray-800/50 shadow-lg hover:shadow-2xl transition-all duration-500 hover:-translate-y-2">
                {/* Gradient overlay */}
                <div className="absolute inset-0 bg-gradient-to-br from-blue-500/0 to-purple-500/0 group-hover:from-blue-500/5 group-hover:to-purple-500/5 transition-all duration-500"></div>

                <CardHeader className="relative z-10">
                  <div className="mb-4 transform group-hover:scale-110 group-hover:rotate-3 transition-transform duration-300">
                    {useCase.icon}
                  </div>
                  <CardTitle className="text-xl mb-2 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                    {useCase.title}
                  </CardTitle>
                </CardHeader>
                <CardContent className="relative z-10">
                  <CardDescription className="text-base leading-relaxed mb-4">
                    {useCase.description}
                  </CardDescription>
                  <div className="flex flex-wrap gap-2">
                    {useCase.features.map((feature, i) => (
                      <span
                        key={i}
                        className="px-3 py-1.5 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/30 dark:to-purple-900/30 text-blue-700 dark:text-blue-300 rounded-lg text-sm font-medium border border-blue-200/50 dark:border-blue-800/50 hover:border-blue-300 dark:hover:border-blue-700 transition-colors"
                      >
                        {feature}
                      </span>
                    ))}
                  </div>
                </CardContent>

                {/* Decorative corner */}
                <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-purple-500/10 to-transparent rounded-bl-full opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
              </Card>
            </ScrollReveal>
          ))}
        </div>
      </div>
    </section>
  );
}
