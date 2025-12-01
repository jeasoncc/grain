import {
  FileText,
  Search,
  Save,
  Zap,
  Shield,
  Download,
  Users,
  Palette,
  Clock,
  Layers,
  Database,
  Code,
  Command,
  Image,
  Keyboard,
  BarChart3,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { SectionHeader } from "@/components/ui/section-header";
import { ScrollReveal } from "@/components/ui/scroll-reveal";

const features = [
  {
    icon: <FileText className="w-6 h-6" />,
    title: "沉浸式写作",
    description: "基于 Lexical 的富文本编辑器，支持格式化、快捷键和专注模式，让你专注于创作。",
  },
  {
    icon: <Layers className="w-6 h-6" />,
    title: "树形大纲",
    description: "可视化的项目结构管理，章节和场景一目了然，支持拖拽重组和快速导航。",
  },
  {
    icon: <Search className="w-6 h-6" />,
    title: "全局搜索",
    description: "快速全文搜索场景、角色和世界观设定，支持关键词高亮和智能排序。快捷键 Ctrl+Shift+F 快速打开。",
  },
  {
    icon: <Users className="w-6 h-6" />,
    title: "角色管理",
    description: "完整的角色数据库，包含身份、关系、属性等信息，方便创作时快速查阅。",
  },
  {
    icon: <Save className="w-6 h-6" />,
    title: "自动备份",
    description: "每日自动备份，支持手动导出和恢复，JSON 或 ZIP 格式，数据永不丢失。",
  },
  {
    icon: <Zap className="w-6 h-6" />,
    title: "项目管理",
    description: "树形项目导航，支持书籍→章节→场景的层级结构，角色、地点和设定数据库。",
  },
  {
    icon: <Shield className="w-6 h-6" />,
    title: "离线优先",
    description: "基于 IndexedDB + Dexie 的可靠存储，完全离线工作，可选云同步。",
  },
  {
    icon: <Palette className="w-6 h-6" />,
    title: "主题定制",
    description: "多种内置主题，支持暗色模式，可自定义颜色和字体，打造专属写作环境。",
  },
  {
    icon: <Clock className="w-6 h-6" />,
    title: "写作统计",
    description: "实时字数统计、写作进度追踪、每日写作目标，帮助保持创作习惯。",
  },
  {
    icon: <Database className="w-6 h-6" />,
    title: "世界观构建",
    description: "集中管理地点、势力、物品等世界观元素，构建完整的创作世界。",
  },
  {
    icon: <Image className="w-6 h-6" />,
    title: "Canvas 绘图",
    description: "集成 Excalidraw 绘图工具，支持在场景中插入手绘图表、思维导图等可视化内容。",
  },
  {
    icon: <Command className="w-6 h-6" />,
    title: "命令面板",
    description: "快捷键 Cmd/Ctrl+K 快速打开命令面板，通过键盘快速导航和操作，提升创作效率。",
  },
  {
    icon: <Keyboard className="w-6 h-6" />,
    title: "快捷键支持",
    description: "丰富的键盘快捷键，从编辑到导航，一切操作都可通过键盘完成，无需离开键盘。",
  },
  {
    icon: <BarChart3 className="w-6 h-6" />,
    title: "数据统计",
    description: "详细的写作统计面板，追踪项目进度、字数分布、写作习惯，数据可视化展示。",
  },
  {
    icon: <Download className="w-6 h-6" />,
    title: "多格式导出",
    description: "支持导出为 Markdown、DOCX 等格式（PDF、EPUB 在路线图中），方便分享和发布。",
  },
  {
    icon: <Code className="w-6 h-6" />,
    title: "开源免费",
    description: "完全开源，MIT 协议，可自由使用、修改和分发，欢迎贡献代码。",
  },
];

export function FeaturesSection() {
  return (
    <section id="features" className="py-24 md:py-32 bg-gray-50 dark:bg-gray-950 relative overflow-hidden">
      {/* Decorative background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-gray-200/20 dark:bg-gray-800/20 rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-gray-200/20 dark:bg-gray-800/20 rounded-full blur-3xl"></div>
      </div>
      <div className="container mx-auto px-4 relative z-10">
        <ScrollReveal>
          <SectionHeader
            title="强大的功能特性"
            description="为长篇小说创作量身定制的功能集，让你的创作流程更加顺畅"
            subtitle="Features"
          />
        </ScrollReveal>

        {/* Features grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((feature, index) => (
            <ScrollReveal
              key={index}
              direction="up"
              delay={index * 30}
            >
              <Card className="group h-full hover:-translate-y-2 transition-all duration-300 relative overflow-hidden">
                {/* Decorative corner - 更精细 */}
                <div className="absolute top-0 right-0 w-20 h-20 bg-gray-100/30 dark:bg-gray-800/30 rounded-bl-full opacity-0 group-hover:opacity-100 transition-opacity duration-300 group-hover:scale-110 transition-transform duration-300"></div>
                {/* 多层渐变叠加 */}
                <div className="absolute inset-0 bg-gradient-to-br from-gray-50/0 via-transparent to-gray-100/0 dark:from-gray-800/0 dark:to-gray-900/0 opacity-0 group-hover:opacity-100 group-hover:from-gray-50/50 dark:group-hover:from-gray-800/30 transition-all duration-500 pointer-events-none"></div>
                {/* 精细的边框高光 */}
                <div className="absolute inset-0 rounded-xl border border-transparent group-hover:border-gray-200/50 dark:group-hover:border-gray-700/50 transition-colors duration-300 pointer-events-none"></div>
                {/* 闪烁光效 */}
                <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-white/0 via-white/5 to-white/0 opacity-0 group-hover:opacity-100 group-hover:animate-shimmer pointer-events-none"></div>
                <CardHeader className="pb-4 relative z-10">
                  <div className="relative">
                    <div className="absolute -inset-1 bg-gray-200/50 dark:bg-gray-700/50 rounded-xl blur opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                    <div className="w-14 h-14 rounded-xl bg-gray-100/80 dark:bg-gray-800/80 backdrop-blur-sm flex items-center justify-center mb-4 group-hover:bg-gray-200 dark:group-hover:bg-gray-700 group-hover:scale-110 group-hover:rotate-3 transition-all duration-300 shadow-sm relative z-10">
                      <div className="text-gray-700 dark:text-gray-300 group-hover:text-gray-900 dark:group-hover:text-white transition-colors">
                        {feature.icon}
                      </div>
                    </div>
                  </div>
                  <CardTitle className="text-lg mb-2 font-bold group-hover:text-gray-900 dark:group-hover:text-white transition-colors leading-snug">
                    {feature.title}
                  </CardTitle>
                </CardHeader>
                <CardContent className="relative z-10">
                  <CardDescription className="text-sm leading-[1.7] text-gray-600 dark:text-gray-400">
                    {feature.description}
                  </CardDescription>
                </CardContent>
              </Card>
            </ScrollReveal>
          ))}
        </div>
      </div>
    </section>
  );
}
