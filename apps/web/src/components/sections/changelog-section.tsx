import { Calendar, Sparkles, ArrowRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SectionHeader } from "@/components/ui/section-header";
import { ScrollReveal } from "@/components/ui/scroll-reveal";
import { Badge } from "@/components/ui/badge";

const changelog = [
  {
    version: "v0.1.0",
    date: "2025-12-01",
    type: "major",
    changes: [
      {
        type: "feature",
        description: "首次发布！包含核心编辑功能",
      },
      {
        type: "feature",
        description: "树形大纲管理",
      },
      {
        type: "feature",
        description: "角色和世界观数据库",
      },
      {
        type: "feature",
        description: "全局搜索功能",
      },
      {
        type: "feature",
        description: "自动备份系统",
      },
    ],
  },
  {
    version: "v0.0.9",
    date: "2025-11-15",
    type: "preview",
    changes: [
      {
        type: "improvement",
        description: "优化编辑器性能",
      },
      {
        type: "fix",
        description: "修复搜索功能的 bug",
      },
    ],
  },
];

export function ChangelogSection() {
  return (
    <section
      id="changelog"
      className="py-24 md:py-32 bg-white dark:bg-gray-900 relative overflow-hidden"
    >
      {/* Decorative background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 right-0 w-96 h-96 bg-gray-100/20 dark:bg-gray-800/20 rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-gray-100/20 dark:bg-gray-800/20 rounded-full blur-3xl"></div>
      </div>

      <div className="container mx-auto px-4 relative z-10">
        <ScrollReveal>
          <SectionHeader
            title="更新日志"
            description="了解 Novel Editor 的最新功能和改进"
            subtitle="Changelog"
          />
        </ScrollReveal>

        <div className="max-w-4xl mx-auto space-y-8 mt-16">
          {changelog.map((release, index) => (
            <ScrollReveal
              key={release.version}
              direction="up"
              delay={index * 100}
            >
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between flex-wrap gap-4">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                        <Sparkles className="w-6 h-6 text-gray-900 dark:text-white" />
                      </div>
                      <div>
                        <CardTitle className="text-2xl mb-1">
                          {release.version}
                        </CardTitle>
                        <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                          <Calendar className="w-4 h-4" />
                          <span>{release.date}</span>
                        </div>
                      </div>
                    </div>
                    <Badge
                      variant={
                        release.type === "major"
                          ? "default"
                          : release.type === "preview"
                          ? "secondary"
                          : "outline"
                      }
                    >
                      {release.type === "major" ? "重大更新" : "预览版"}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {release.changes.map((change, changeIndex) => (
                      <div
                        key={changeIndex}
                        className="flex items-start gap-3 p-3 rounded-lg bg-gray-50 dark:bg-gray-800"
                      >
                        <ArrowRight className="w-5 h-5 text-gray-400 dark:text-gray-500 mt-0.5 shrink-0" />
                        <span className="text-gray-700 dark:text-gray-300 leading-relaxed">
                          {change.description}
                        </span>
                      </div>
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


