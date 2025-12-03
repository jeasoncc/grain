"use client";

import { BookOpen, Code, Layers, Zap, Database, Palette, Keyboard } from "lucide-react";
import Link from "next/link";
import { FormattedText } from "@/components/docs/formatted-text";

const wikiSections = [
  {
    id: "overview",
    title: "项目概述",
    icon: <BookOpen className="w-6 h-6" />,
    content: [
      {
        subtitle: "Novel Editor 是什么？",
        text: "Novel Editor 是一款现代化的跨平台桌面写作应用，专为长篇小说创作而设计。它结合了沉浸式编辑体验、强大的项目管理能力和可靠的数据存储，让作者可以专注于创作本身。",
      },
      {
        subtitle: "核心特性",
        items: [
          "基于 Tauri 框架，提供原生桌面应用体验",
          "使用 Lexical 编辑器，支持富文本编辑和 Markdown 快捷方式",
          "树形大纲管理，清晰的章节和场景组织",
          "全局搜索功能，快速定位任意内容",
          "角色和世界观数据库，管理创作资源",
          "自动备份系统，保护创作成果",
          "多格式导出（DOCX、PDF、EPUB、TXT）",
        ],
      },
      {
        subtitle: "技术栈",
        items: [
          "前端：React 19 + TypeScript + Vite + Tailwind CSS",
          "编辑器：Lexical 富文本编辑器",
          "状态管理：TanStack Query + Zustand",
          "数据存储：Dexie.js (IndexedDB)",
          "桌面框架：Tauri (Rust)",
          "UI 组件：Shadcn UI + Radix UI",
        ],
      },
    ],
  },
  {
    id: "architecture",
    title: "架构设计",
    icon: <Layers className="w-6 h-6" />,
    content: [
      {
        subtitle: "整体架构",
        text: "Novel Editor 采用前后端分离的架构。前端使用 React 构建用户界面，后端使用 Tauri 提供系统级能力。数据存储在浏览器的 IndexedDB 中，确保离线可用性。",
      },
      {
        subtitle: "目录结构",
        items: [
          "src/components/ - 可复用的 UI 组件",
          "src/routes/ - 页面路由定义",
          "src/services/ - 业务逻辑服务层",
          "src/db/ - 数据库 Schema 和 CRUD 操作",
          "src/stores/ - 状态管理（Zustand）",
          "src/lib/ - 工具函数和辅助库",
          "src-tauri/ - Tauri 后端代码（Rust）",
        ],
      },
      {
        subtitle: "数据流",
        text: "用户操作 → React 组件 → Service 层 → Dexie 数据库 → IndexedDB。组件通过 TanStack Query 管理数据获取和缓存，使用 Zustand 管理本地 UI 状态。",
      },
    ],
  },
  {
    id: "features",
    title: "功能详解",
    icon: <Zap className="w-6 h-6" />,
    content: [
      {
        subtitle: "编辑器功能",
        items: [
          "富文本编辑：支持加粗、斜体、下划线等格式",
          "Markdown 快捷方式：快速输入格式化文本",
          "专注模式：全屏编辑，消除干扰",
          "打字机模式：当前行居中，提升写作体验",
          "撤销/重做：完整的编辑历史记录",
          "自动保存：实时保存编辑内容",
        ],
      },
      {
        subtitle: "项目管理",
        items: [
          "项目创建：支持多个独立的创作项目",
          "章节管理：树形结构组织章节和场景",
          "场景编辑：每个场景独立的编辑空间",
          "大纲视图：树形和卡片两种视图模式",
          "拖拽排序：直观调整章节和场景顺序",
        ],
      },
      {
        subtitle: "搜索功能",
        items: [
          "当前文件搜索（Ctrl+F）：快速查找和替换",
          "全局搜索（Ctrl+Shift+F）：跨项目搜索所有内容",
          "高级选项：区分大小写、全字匹配、正则表达式",
          "关键词高亮：搜索结果实时高亮显示",
        ],
      },
      {
        subtitle: "数据管理",
        items: [
          "角色数据库：管理角色信息和关系",
          "世界观设定：记录世界背景和规则",
          "附件管理：存储图片和参考文档",
          "数据统计：字数统计和进度追踪",
        ],
      },
      {
        subtitle: "备份与导出",
        items: [
          "自动备份：每日自动备份，最多保留 3 次",
          "手动备份：随时导出 JSON 或 ZIP 格式备份",
          "数据恢复：从备份文件恢复项目数据",
          "多格式导出：支持 DOCX、PDF、EPUB、TXT",
        ],
      },
    ],
  },
  {
    id: "database",
    title: "数据存储",
    icon: <Database className="w-6 h-6" />,
    content: [
      {
        subtitle: "数据库结构",
        items: [
          "users - 用户信息表",
          "projects - 项目表",
          "chapters - 章节表",
          "scenes - 场景表（包含富文本内容）",
          "roles - 角色表",
          "worldEntries - 世界观条目表",
          "attachments - 附件表",
          "outlineNodes - 大纲节点表",
        ],
      },
      {
        subtitle: "IndexedDB 优势",
        text: "使用 IndexedDB 作为主要存储方式，具有以下优势：离线可用、大容量存储、高性能查询、结构化数据支持。数据完全存储在本地，保护用户隐私。",
      },
      {
        subtitle: "数据迁移",
        text: "数据库版本管理使用 Dexie 的版本系统。当数据结构发生变化时，会自动执行迁移脚本，确保用户数据不会丢失。",
      },
    ],
  },
  {
    id: "ui-themes",
    title: "界面与主题",
    icon: <Palette className="w-6 h-6" />,
    content: [
      {
        subtitle: "主题系统",
        items: [
          "浅色/深色模式：自动跟随系统设置或手动切换",
          "编辑器主题：多种代码编辑器风格的语法高亮主题",
          "图标主题：可自定义活动栏图标风格",
          "字体设置：支持自定义字体和字号",
        ],
      },
      {
        subtitle: "界面布局",
        items: [
          "活动栏：左侧快速导航区域",
          "侧边栏：项目文件树（可按 Ctrl+B 切换）",
          "编辑区：主要写作区域",
          "右侧栏：角色、世界观等辅助信息",
          "底部抽屉：全局搜索和其他工具",
        ],
      },
      {
        subtitle: "响应式设计",
        text: "界面设计考虑了不同屏幕尺寸，在小屏幕上可以隐藏侧边栏，最大化编辑区域。所有交互元素都支持键盘导航。",
      },
    ],
  },
  {
    id: "keyboard",
    title: "键盘快捷键",
    icon: <Keyboard className="w-6 h-6" />,
    content: [
      {
        subtitle: "编辑快捷键",
        items: [
          "Ctrl/Cmd + B - 加粗文本",
          "Ctrl/Cmd + I - 斜体文本",
          "Ctrl/Cmd + U - 下划线",
          "Ctrl/Cmd + Z - 撤销",
          "Ctrl/Cmd + Shift + Z - 重做",
          "Ctrl/Cmd + S - 保存（自动保存无需手动）",
        ],
      },
      {
        subtitle: "导航快捷键",
        items: [
          "Ctrl/Cmd + K - 打开命令面板",
          "Ctrl/Cmd + Shift + F - 全局搜索",
          "Ctrl/Cmd + F - 当前文件搜索",
          "Ctrl/Cmd + H - 当前文件替换",
          "Ctrl/Cmd + B - 切换侧边栏",
          "F11 - 进入专注模式",
          "Ctrl/Cmd + Enter - 进入专注模式",
          "Esc - 退出专注模式",
          "Ctrl/Cmd + T - 切换打字机模式",
        ],
      },
      {
        subtitle: "完整快捷键列表",
        text: "更多详细的快捷键说明和使用技巧，请查看《操作手册》中的键盘快捷键章节。",
      },
    ],
  },
];

export function WikiPageContent() {
  return (
    <div className="max-w-4xl">
      <div className="mb-10">
        <h1 className="text-2xl font-semibold mb-2 text-gray-900 dark:text-white tracking-tight">
          Wiki 文档
        </h1>
        <p className="text-base text-gray-600 dark:text-gray-400 leading-relaxed">
          深入了解 Novel Editor 的架构设计、功能实现和技术细节
        </p>
      </div>

      {/* Content */}
      <div className="space-y-12">
        {wikiSections.map((section) => (
          <section
            key={section.id}
            className="scroll-mt-24 mb-12 last:mb-0"
          >
            <div className="mb-6">
              <h2
                id={section.id}
                className="text-xl font-semibold text-gray-900 dark:text-white mb-0 flex items-center gap-2.5"
              >
                <span className="text-gray-400 dark:text-gray-600 text-lg">
                  {section.icon}
                </span>
                {section.title}
              </h2>
            </div>

            <div className="space-y-6">
              {section.content.map((item, itemIndex) => (
                <div key={itemIndex}>
                  <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-3">
                    {item.subtitle}
                  </h3>
                  {item.text && (
                    <p className="text-gray-600 dark:text-gray-400 leading-7 text-sm mb-0">
                      <FormattedText text={item.text} />
                    </p>
                  )}
                  {item.items && (
                    <ul className="space-y-2 mt-3 ml-4">
                      {item.items.map((listItem, listIndex) => (
                        <li
                          key={listIndex}
                          className="text-gray-600 dark:text-gray-400 leading-6 text-sm"
                          style={{ listStyleType: 'disc' }}
                        >
                          <FormattedText text={listItem} />
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}

