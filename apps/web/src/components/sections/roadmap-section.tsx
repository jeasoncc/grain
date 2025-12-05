import { Map, CheckCircle2, Circle, Clock } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SectionHeader } from "@/components/ui/section-header";
import { ScrollReveal } from "@/components/ui/scroll-reveal";
import { cn } from "@/lib/utils";

const roadmapItems = [
  {
    status: "completed",
    quarter: "2025 Q4",
    title: "核心功能",
    items: [
      "富文本编辑器",
      "树形大纲管理",
      "角色数据库",
      "全局搜索",
      "自动备份",
    ],
  },
  {
    status: "in-progress",
    quarter: "2026 Q1",
    title: "增强功能",
    items: [
      "PDF 导出",
      "EPUB 导出",
      "云同步功能",
      "插件系统",
      "主题市场",
    ],
  },
  {
    status: "planned",
    quarter: "2026 Q2+",
    title: "未来计划",
    items: [
      "协作编辑",
      "版本控制",
      "AI 写作助手",
      "多语言支持",
      "移动端应用",
    ],
  },
];

const statusConfig = {
  completed: {
    icon: CheckCircle2,
    color: "text-green-600 dark:text-green-400",
    bgColor: "bg-green-50 dark:bg-green-900/20",
    label: "已完成",
  },
  "in-progress": {
    icon: Clock,
    color: "text-blue-600 dark:text-blue-400",
    bgColor: "bg-blue-50 dark:bg-blue-900/20",
    label: "进行中",
  },
  planned: {
    icon: Circle,
    color: "text-gray-600 dark:text-gray-300",
    bgColor: "bg-gray-50 dark:bg-gray-800",
    label: "计划中",
  },
};

export function RoadmapSection() {
  return (
    <section
      id="roadmap"
      className="py-24 md:py-32 bg-gray-50 dark:bg-black relative overflow-hidden"
    >
      {/* Decorative background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/3 left-0 w-96 h-96 bg-gray-200/20 dark:bg-gray-800/20 rounded-full blur-3xl"></div>
        <div className="absolute bottom-1/3 right-0 w-96 h-96 bg-gray-200/20 dark:bg-gray-800/20 rounded-full blur-3xl"></div>
      </div>

      <div className="container mx-auto px-4 relative z-10">
        <ScrollReveal>
          <SectionHeader
            title="产品路线图"
            description="了解 Novel Editor 的发展方向和即将推出的功能"
            subtitle="Roadmap"
          />
        </ScrollReveal>

        <div className="max-w-5xl mx-auto mt-16">
          <div className="relative">
            {/* Timeline line */}
            <div className="absolute left-8 top-0 bottom-0 w-0.5 bg-gray-200 dark:bg-gray-800 hidden md:block"></div>

            <div className="space-y-12">
              {roadmapItems.map((item, index) => {
                const config = statusConfig[item.status as keyof typeof statusConfig];
                const Icon = config.icon;

                return (
                  <ScrollReveal
                    key={item.quarter}
                    direction="up"
                    delay={index * 100}
                  >
                    <div className="relative flex gap-6">
                      {/* Timeline dot */}
                      <div className="relative z-10 shrink-0">
                        <div
                          className={cn(
                            "w-16 h-16 rounded-full flex items-center justify-center border-4 border-white dark:border-gray-900",
                            config.bgColor
                          )}
                        >
                          <Icon className={cn("w-8 h-8", config.color)} />
                        </div>
                      </div>

                      {/* Content */}
                      <div className="flex-1 pt-1">
                        <Card className="h-full">
                          <CardHeader>
                            <div className="flex items-center justify-between flex-wrap gap-4">
                              <div>
                                <div className="flex items-center gap-3 mb-2">
                                  <CardTitle className="text-2xl">
                                    {item.quarter}
                                  </CardTitle>
                                  <span
                                    className={cn(
                                      "text-xs font-semibold px-2 py-1 rounded-full",
                                      config.bgColor,
                                      config.color
                                    )}
                                  >
                                    {config.label}
                                  </span>
                                </div>
                                <h3 className="text-xl font-semibold text-gray-700 dark:text-gray-300">
                                  {item.title}
                                </h3>
                              </div>
                            </div>
                          </CardHeader>
                          <CardContent>
                            <ul className="space-y-2">
                              {item.items.map((roadmapItem, itemIndex) => (
                                <li
                                  key={itemIndex}
                                  className="flex items-start gap-3 text-gray-600 dark:text-gray-300"
                                >
                                  <span className="text-gray-400 dark:text-gray-400 mt-1.5 shrink-0">
                                    •
                                  </span>
                                  <span className="leading-relaxed">
                                    {roadmapItem}
                                  </span>
                                </li>
                              ))}
                            </ul>
                          </CardContent>
                        </Card>
                      </div>
                    </div>
                  </ScrollReveal>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}








