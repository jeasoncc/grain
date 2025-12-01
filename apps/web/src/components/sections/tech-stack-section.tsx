import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Code2,
  Zap,
  Database,
  Palette,
  Terminal,
  Package,
} from "lucide-react";
import { SectionHeader } from "@/components/ui/section-header";
import { ScrollReveal } from "@/components/ui/scroll-reveal";

const techStack = [
  {
    category: "桌面应用框架",
    icon: <Code2 className="w-5 h-5" />,
    items: ["Tauri", "Rust", "跨平台原生性能"],
    description: "基于 Tauri 构建，轻量级、安全、高性能的桌面应用",
  },
  {
    category: "前端框架",
    icon: <Zap className="w-5 h-5" />,
    items: ["React 19", "TypeScript", "Vite"],
    description: "现代化的前端技术栈，开发体验优秀",
  },
  {
    category: "编辑器",
    icon: <Terminal className="w-5 h-5" />,
    items: ["Lexical", "富文本编辑", "Markdown 支持"],
    description: "Meta 开源的 Lexical 编辑器，性能优异",
  },
  {
    category: "数据存储",
    icon: <Database className="w-5 h-5" />,
    items: ["IndexedDB", "Dexie.js", "离线优先"],
    description: "基于浏览器的本地数据库，完全离线工作",
  },
  {
    category: "UI 组件",
    icon: <Palette className="w-5 h-5" />,
    items: ["Shadcn UI", "Tailwind CSS", "Radix UI"],
    description: "精美的 UI 组件库，可定制性强",
  },
  {
    category: "工具链",
    icon: <Package className="w-5 h-5" />,
    items: ["Biome", "Vitest", "GitHub Actions"],
    description: "完整的开发工具链，保证代码质量",
  },
];

export function TechStackSection() {
  return (
    <section className="py-24 md:py-32 bg-gray-50 dark:bg-gray-950">
      <div className="container mx-auto px-4">
        <ScrollReveal>
          <SectionHeader
            title="技术栈"
            description="基于现代化技术栈构建，确保性能、可靠性和开发效率"
            subtitle="Technology"
          />
        </ScrollReveal>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {techStack.map((tech, index) => (
            <ScrollReveal
              key={index}
              direction="up"
              delay={index * 50}
            >
              <Card className="group h-full hover:-translate-y-1 transition-all duration-300">
                <CardHeader>
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-10 h-10 rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-gray-700 dark:text-gray-300 group-hover:bg-gray-200 dark:group-hover:bg-gray-700 group-hover:scale-110 transition-all duration-300">
                      {tech.icon}
                    </div>
                    <CardTitle className="text-lg group-hover:text-gray-900 dark:group-hover:text-white transition-colors duration-300">
                      {tech.category}
                    </CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <CardDescription className="mb-4">
                    {tech.description}
                  </CardDescription>
                  <div className="flex flex-wrap gap-2">
                    {tech.items.map((item, i) => (
                      <span
                        key={i}
                        className="px-3 py-1 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-md text-sm font-medium hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors duration-300 cursor-default"
                      >
                        {item}
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
