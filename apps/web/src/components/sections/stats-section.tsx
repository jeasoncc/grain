import { TrendingUp, Users, Code, Download } from "lucide-react";

const stats = [
  {
    icon: <Users className="w-8 h-8 text-blue-600" />,
    value: "10K+",
    label: "活跃用户",
    description: "全球创作者正在使用",
  },
  {
    icon: <Download className="w-8 h-8 text-green-600" />,
    value: "50K+",
    label: "下载量",
    description: "持续增长中",
  },
  {
    icon: <Code className="w-8 h-8 text-purple-600" />,
    value: "100+",
    label: "贡献者",
    description: "开源社区支持",
  },
  {
    icon: <TrendingUp className="w-8 h-8 text-orange-600" />,
    value: "100%",
    label: "开源免费",
    description: "MIT 许可证",
  },
];

export function StatsSection() {
  return (
    <section className="py-16 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-gray-800 dark:to-gray-900">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          {stats.map((stat, index) => (
            <div
              key={index}
              className="text-center group hover:scale-105 transition-transform"
            >
              <div className="inline-flex items-center justify-center mb-4">
                {stat.icon}
              </div>
              <div className="text-4xl md:text-5xl font-bold text-gray-900 dark:text-white mb-2">
                {stat.value}
              </div>
              <div className="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-1">
                {stat.label}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                {stat.description}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

