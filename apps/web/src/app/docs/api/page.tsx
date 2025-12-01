import { Code, FileText, Database, Settings, Layers } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { SectionHeader } from "@/components/ui/section-header";
import { ScrollReveal } from "@/components/ui/scroll-reveal";

const apiCategories = [
  {
    icon: <FileText className="w-6 h-6" />,
    title: "编辑器 API",
    description: "Lexical 编辑器的相关 API 和配置选项。",
    endpoints: [
      {
        name: "createEditor",
        description: "创建新的编辑器实例",
        params: "config: EditorConfig",
        returns: "LexicalEditor",
      },
      {
        name: "registerCommand",
        description: "注册自定义命令",
        params: "type: string, handler: CommandHandler",
        returns: "void",
      },
    ],
  },
  {
    icon: <Database className="w-6 h-6" />,
    title: "数据库 API",
    description: "IndexedDB 和 Dexie 的数据操作方法。",
    endpoints: [
      {
        name: "db.projects",
        description: "项目数据库表",
        params: "-",
        returns: "Table<Project>",
      },
      {
        name: "db.scenes",
        description: "场景数据库表",
        params: "-",
        returns: "Table<Scene>",
      },
      {
        name: "db.characters",
        description: "角色数据库表",
        params: "-",
        returns: "Table<Character>",
      },
    ],
  },
  {
    icon: <Layers className="w-6 h-6" />,
    title: "项目管理 API",
    description: "项目和场景的创建、读取、更新和删除操作。",
    endpoints: [
      {
        name: "createProject",
        description: "创建新项目",
        params: "data: ProjectData",
        returns: "Promise<Project>",
      },
      {
        name: "updateProject",
        description: "更新项目信息",
        params: "id: string, data: Partial<ProjectData>",
        returns: "Promise<void>",
      },
      {
        name: "deleteProject",
        description: "删除项目",
        params: "id: string",
        returns: "Promise<void>",
      },
    ],
  },
  {
    icon: <Settings className="w-6 h-6" />,
    title: "配置 API",
    description: "应用设置和配置相关的 API。",
    endpoints: [
      {
        name: "getSettings",
        description: "获取应用设置",
        params: "-",
        returns: "Promise<Settings>",
      },
      {
        name: "updateSettings",
        description: "更新应用设置",
        params: "settings: Partial<Settings>",
        returns: "Promise<void>",
      },
    ],
  },
];

export default function ApiPage() {
  return (
    <div className="min-h-screen bg-white dark:bg-gray-900">
      {/* Hero Section */}
      <section className="py-20 md:py-32 border-b border-gray-200/50 dark:border-gray-800/50">
        <div className="container mx-auto px-4">
          <ScrollReveal>
            <div className="max-w-3xl mx-auto text-center">
              <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gray-100 dark:bg-gray-800 mb-6 border-2 border-gray-300 dark:border-gray-700">
                <Code className="w-10 h-10 text-gray-900 dark:text-white" />
              </div>
              <h1 className="text-5xl md:text-6xl font-black mb-6 text-gray-900 dark:text-white tracking-tight">
                API 参考
              </h1>
              <p className="text-xl md:text-2xl text-gray-600 dark:text-gray-400 leading-relaxed font-light">
                完整的 API 文档，帮助你扩展和自定义 Novel Editor
              </p>
            </div>
          </ScrollReveal>
        </div>
      </section>

      {/* API Categories */}
      <section className="py-24 md:py-32">
        <div className="container mx-auto px-4">
          <ScrollReveal>
            <SectionHeader
              title="API 分类"
              description="浏览所有可用的 API 接口和功能"
              subtitle="API Reference"
            />
          </ScrollReveal>

          <div className="max-w-5xl mx-auto space-y-12 mt-16">
            {apiCategories.map((category, index) => (
              <ScrollReveal
                key={category.title}
                direction="up"
                delay={index * 100}
              >
                <Card>
                  <CardHeader>
                    <div className="flex items-center gap-4 mb-4">
                      <div className="w-12 h-12 rounded-xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                        <div className="text-gray-900 dark:text-white">
                          {category.icon}
                        </div>
                      </div>
                      <div>
                        <CardTitle className="text-2xl">{category.title}</CardTitle>
                        <CardDescription className="text-base mt-1">
                          {category.description}
                        </CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {category.endpoints.map((endpoint, endpointIndex) => (
                        <div
                          key={endpointIndex}
                          className="p-4 rounded-lg bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700"
                        >
                          <div className="flex items-start gap-4 mb-2">
                            <code className="text-sm font-mono font-semibold text-gray-900 dark:text-white bg-white dark:bg-gray-900 px-2 py-1 rounded">
                              {endpoint.name}
                            </code>
                          </div>
                          <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                            {endpoint.description}
                          </p>
                          <div className="grid md:grid-cols-2 gap-3 text-sm">
                            <div>
                              <span className="text-gray-500 dark:text-gray-500 font-medium">
                                参数:
                              </span>
                              <code className="ml-2 text-gray-700 dark:text-gray-300 font-mono">
                                {endpoint.params}
                              </code>
                            </div>
                            <div>
                              <span className="text-gray-500 dark:text-gray-500 font-medium">
                                返回:
                              </span>
                              <code className="ml-2 text-gray-700 dark:text-gray-300 font-mono">
                                {endpoint.returns}
                              </code>
                            </div>
                          </div>
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
    </div>
  );
}


