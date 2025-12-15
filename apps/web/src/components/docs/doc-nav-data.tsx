import {
  BookOpen,
  GraduationCap,
  Code,
  HelpCircle,
  GitBranch,
  FileText,
} from "lucide-react";

export interface NavItem {
  title: string;
  href: string;
  icon?: React.ReactNode;
  description?: string;
  children?: NavItem[];
}

export const docNavItems: NavItem[] = [
  {
    title: "开始",
    href: "/docs",
    icon: <BookOpen className="w-4 h-4" />,
  },
  {
    title: "教程",
    href: "/docs/tutorials",
    icon: <GraduationCap className="w-4 h-4" />,
    children: [
      { title: "快速开始", href: "/docs/tutorials#getting-started" },
      { title: "功能概览", href: "/docs/tutorials#features" },
      { title: "键盘快捷键", href: "/docs/tutorials#shortcuts" },
      { title: "导出功能", href: "/docs/tutorials#export" },
    ],
  },
  {
    title: "操作手册",
    href: "/docs/manual",
    icon: <FileText className="w-4 h-4" />,
    children: [
      { title: "快速入门", href: "/docs/manual#getting-started" },
      { title: "编辑功能", href: "/docs/manual#editing" },
      { title: "项目管理", href: "/docs/manual#project-management" },
      { title: "搜索功能", href: "/docs/manual#search" },
      { title: "角色管理", href: "/docs/manual#characters" },
      { title: "世界观管理", href: "/docs/manual#world" },
      { title: "导出与备份", href: "/docs/manual#export" },
      { title: "设置与自定义", href: "/docs/manual#settings" },
      { title: "键盘快捷键", href: "/docs/manual#keyboard" },
      { title: "使用技巧", href: "/docs/manual#tips" },
    ],
  },
  {
    title: "Wiki 文档",
    href: "/docs/wiki",
    icon: <Code className="w-4 h-4" />,
    children: [
      { title: "项目概述", href: "/docs/wiki#overview" },
      { title: "架构设计", href: "/docs/wiki#architecture" },
      { title: "功能详解", href: "/docs/wiki#features" },
      { title: "数据存储", href: "/docs/wiki#database" },
      { title: "界面与主题", href: "/docs/wiki#ui-themes" },
      { title: "键盘快捷键", href: "/docs/wiki#keyboard" },
    ],
  },
  {
    title: "API 参考",
    href: "/docs/api",
    icon: <Code className="w-4 h-4" />,
  },
  {
    title: "常见问题",
    href: "/docs/faq",
    icon: <HelpCircle className="w-4 h-4" />,
  },
  {
    title: "贡献指南",
    href: "/docs/contributing",
    icon: <GitBranch className="w-4 h-4" />,
  },
];









