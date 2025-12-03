"use client";

import {
  BookOpen,
  FileText,
  Search,
  Users,
  Globe,
  Download,
  Settings,
  FolderPlus,
  Edit,
  Layout,
  Save,
  Trash2,
  Keyboard,
} from "lucide-react";
import Link from "next/link";
import { FormattedText } from "@/components/docs/formatted-text";

const manualSections = [
  {
    id: "getting-started",
    title: "快速入门",
    icon: <BookOpen className="w-6 h-6" />,
    content: [
      {
        subtitle: "首次启动",
        steps: [
          "下载并安装 Novel Editor（支持 Linux、Windows、macOS）",
          "启动应用，首次运行会自动进入欢迎界面",
          "创建一个新项目：点击「新建项目」按钮",
          "输入项目名称和作者信息",
          "点击「创建」，开始你的创作之旅",
        ],
      },
      {
        subtitle: "创建第一个章节",
        steps: [
          "在项目列表中选择你的项目",
          "点击「添加章节」按钮",
          "输入章节标题（例如：第一章）",
          "章节创建后，可以开始添加场景",
        ],
      },
      {
        subtitle: "添加场景并开始写作",
        steps: [
          "在章节下点击「添加场景」",
          "输入场景标题（例如：初遇）",
          "点击场景进入编辑器",
          "开始写作！编辑器会自动保存你的内容",
        ],
      },
    ],
  },
  {
    id: "editing",
    title: "编辑功能",
    icon: <Edit className="w-6 h-6" />,
    content: [
      {
        subtitle: "文本格式化",
        text: "编辑器支持丰富的文本格式化选项。选中文本后，可以使用工具栏按钮或快捷键进行格式化：",
        items: [
          "加粗：Ctrl/Cmd + B",
          "斜体：Ctrl/Cmd + I",
          "下划线：Ctrl/Cmd + U",
          "标题：使用 Markdown 语法 # 一级标题，## 二级标题",
          "列表：使用 - 或 * 创建无序列表，1. 创建有序列表",
        ],
      },
      {
        subtitle: "专注模式",
        steps: [
          "点击编辑器右上角的「专注模式」按钮，或按 F11 键",
          "界面会切换到全屏模式，隐藏所有干扰元素",
          "你的文字会居中显示，帮助保持注意力",
          "按 Esc 键退出专注模式",
        ],
      },
      {
        subtitle: "打字机模式",
        text: "打字机模式会让当前编辑行始终保持在屏幕中央，提供更舒适的写作体验。",
        steps: [
          "点击编辑器设置中的「打字机模式」开关",
          "或者使用快捷键 Ctrl/Cmd + T 快速切换",
          "在打字机模式下，当前行会自动居中显示",
        ],
      },
      {
        subtitle: "撤销和重做",
        text: "编辑器支持完整的撤销/重做功能，你可以安全地尝试各种编辑操作：",
        items: [
          "撤销：Ctrl/Cmd + Z",
          "重做：Ctrl/Cmd + Shift + Z",
          "历史记录会自动保存，即使关闭应用也不会丢失",
        ],
      },
    ],
  },
  {
    id: "project-management",
    title: "项目管理",
    icon: <FolderPlus className="w-6 h-6" />,
    content: [
      {
        subtitle: "项目结构",
        text: "Novel Editor 的项目采用层次化结构：项目 → 章节 → 场景。每个层级都有其特定的用途：",
        items: [
          "项目：包含完整小说的所有内容",
          "章节：将小说分成逻辑部分（如第一章、第二章）",
          "场景：章节内的具体场景或段落",
        ],
      },
      {
        subtitle: "大纲视图",
        steps: [
          "点击左侧活动栏的「大纲」图标",
          "选择「树形视图」查看层级结构",
          "选择「卡片视图」查看场景卡片",
          "点击任意场景快速跳转到编辑器",
          "使用搜索框快速定位章节或场景",
        ],
      },
      {
        subtitle: "调整结构",
        text: "你可以随时调整项目的结构：",
        items: [
          "重命名：右键点击章节或场景，选择「重命名」",
          "删除：右键点击选择「删除」（删除前会确认）",
          "移动：拖拽场景到其他章节（功能开发中）",
          "复制：右键选择「复制」，可以在其他位置粘贴",
        ],
      },
      {
        subtitle: "侧边栏管理",
        steps: [
          "使用 Ctrl/Cmd + B 快捷键快速切换侧边栏显示/隐藏",
          "隐藏侧边栏可以获得更大的编辑空间",
          "侧边栏状态会自动保存，下次打开应用时恢复",
        ],
      },
    ],
  },
  {
    id: "search",
    title: "搜索功能",
    icon: <Search className="w-6 h-6" />,
    content: [
      {
        subtitle: "当前文件搜索（Ctrl/Cmd + F）",
        steps: [
          "在编辑器中按 Ctrl/Cmd + F 打开搜索框",
          "输入要搜索的关键词",
          "使用 ↑ ↓ 键或点击按钮在匹配结果间导航",
          "匹配的文本会自动高亮显示",
          "按 Esc 键关闭搜索框",
        ],
      },
      {
        subtitle: "搜索选项",
        text: "搜索支持多种高级选项，帮助你精确查找：",
        items: [
          "区分大小写：只匹配完全相同的大小写",
          "全字匹配：只匹配完整的单词（避免匹配部分词）",
          "正则表达式：使用正则语法进行高级搜索",
        ],
      },
      {
        subtitle: "查找和替换（Ctrl/Cmd + H）",
        steps: [
          "按 Ctrl/Cmd + H 打开替换对话框",
          "在「搜索」框输入要查找的文本",
          "在「替换为」框输入替换后的文本",
          "点击「替换」逐个替换，或「全部替换」一次性替换所有",
          "⚠️ 建议：替换前先使用「替换」按钮检查几个，确认无误后再「全部替换」",
        ],
      },
      {
        subtitle: "全局搜索（Ctrl/Cmd + Shift + F）",
        steps: [
          "按 Ctrl/Cmd + Shift + F 打开全局搜索",
          "输入关键词（例如：角色名、地名、情节关键词）",
          "查看搜索结果列表，显示匹配的场景、角色、世界观条目",
          "点击任意结果自动跳转到对应位置",
          "关键词会在结果中高亮显示",
        ],
      },
      {
        subtitle: "搜索技巧",
        items: [
          "使用完整词语获得更准确的结果",
          "搜索角色名可以快速查看该角色出现的所有场景",
          "搜索地名可以检查世界观的一致性",
          "全局搜索只搜索已保存的内容，确保重要内容已保存",
        ],
      },
    ],
  },
  {
    id: "characters",
    title: "角色管理",
    icon: <Users className="w-6 h-6" />,
    content: [
      {
        subtitle: "创建角色",
        steps: [
          "点击左侧活动栏的「角色」图标",
          "点击「添加角色」按钮",
          "填写角色信息：",
          "  - 姓名：角色的名字",
          "  - 身份：角色的身份或职业",
          "  - 关系：与其他角色的关系",
          "  - 描述：角色的详细描述",
          "  - 标签：添加标签便于分类和搜索",
          "点击「保存」完成创建",
        ],
      },
      {
        subtitle: "管理角色",
        text: "在角色列表中，你可以：",
        items: [
          "查看所有角色的列表",
          "点击角色查看详细信息",
          "编辑角色的所有信息",
          "删除不再需要的角色",
          "搜索角色：使用搜索框快速找到特定角色",
        ],
      },
      {
        subtitle: "在写作中引用角色",
        text: "创建角色后，在写作过程中：",
        items: [
          "可以使用全局搜索查找角色的所有出现",
          "在角色页面查看角色的完整信息",
          "通过角色关系了解角色之间的联系",
        ],
      },
    ],
  },
  {
    id: "world",
    title: "世界观管理",
    icon: <Globe className="w-6 h-6" />,
    content: [
      {
        subtitle: "创建世界观条目",
        steps: [
          "点击左侧活动栏的「世界观」图标",
          "点击「添加条目」按钮",
          "选择条目类型（地点、物品、概念、规则等）",
          "填写条目信息：",
          "  - 名称：条目的名称",
          "  - 类型：条目的分类",
          "  - 描述：详细的世界观设定",
          "  - 关联：关联相关的角色或其他条目",
          "点击「保存」完成创建",
        ],
      },
      {
        subtitle: "组织世界观",
        text: "世界观系统帮助你管理小说的世界设定：",
        items: [
          "地点：记录故事中的地点和场景",
          "物品：重要的道具和物品",
          "概念：魔法体系、科技设定等抽象概念",
          "规则：世界运行的规则和设定",
          "使用标签和分类组织不同类型的条目",
        ],
      },
    ],
  },
  {
    id: "export",
    title: "导出与备份",
    icon: <Download className="w-6 h-6" />,
    content: [
      {
        subtitle: "导出项目",
        steps: [
          "在项目列表中选择要导出的项目",
          "点击「导出」按钮或通过菜单选择「导出」",
          "选择导出格式：",
          "  - DOCX：Microsoft Word 文档格式",
          "  - PDF：PDF 文档格式",
          "  - EPUB：电子书格式",
          "  - TXT：纯文本格式",
          "配置导出选项（是否包含标题、章节标题等）",
          "选择保存位置，点击「导出」",
        ],
      },
      {
        subtitle: "导出选项说明",
        items: [
          "包含标题：在文档开头添加项目标题",
          "包含作者：添加作者信息",
          "包含章节标题：每个章节显示章节名",
          "包含场景标题：每个场景显示场景名",
          "章节分页：每个章节从新页开始",
        ],
      },
      {
        subtitle: "数据备份",
        steps: [
          "进入「设置」→「数据管理」",
          "点击「导出备份」按钮",
          "选择备份格式：",
          "  - JSON：纯数据备份，体积小",
          "  - ZIP：包含附件的完整备份",
          "备份文件会下载到默认下载文件夹",
          "建议将备份文件保存到安全位置（云盘、外部存储等）",
        ],
      },
      {
        subtitle: "自动备份",
        steps: [
          "进入「设置」→「数据管理」",
          "开启「自动备份」开关",
          "系统会每 24 小时自动创建一次备份",
          "自动备份最多保留最近 3 次",
          "自动备份保存在浏览器本地存储中",
        ],
      },
      {
        subtitle: "恢复备份",
        steps: [
          "进入「设置」→「数据管理」",
          "点击「恢复备份」按钮",
          "选择之前导出的备份文件（JSON 或 ZIP）",
          "确认恢复操作（⚠️ 注意：恢复会覆盖现有数据）",
          "等待恢复完成，重新打开应用即可看到恢复的数据",
        ],
      },
    ],
  },
  {
    id: "settings",
    title: "设置与自定义",
    icon: <Settings className="w-6 h-6" />,
    content: [
      {
        subtitle: "通用设置",
        text: "在「设置」→「通用」中，你可以：",
        items: [
          "设置应用语言（目前支持中文）",
          "配置自动保存间隔",
          "选择默认的项目模板",
        ],
      },
      {
        subtitle: "编辑器设置",
        text: "在「设置」→「编辑器」中，你可以：",
        items: [
          "设置编辑器字体和字号",
          "配置行高和段落间距",
          "启用/禁用打字机模式",
          "设置自动保存间隔",
          "配置快捷键",
        ],
      },
      {
        subtitle: "外观设置",
        text: "在「设置」→「外观」中，你可以：",
        items: [
          "切换浅色/深色主题",
          "选择编辑器主题（代码编辑器风格的语法高亮）",
          "自定义图标主题",
          "调整界面字体",
        ],
      },
      {
        subtitle: "数据管理",
        text: "在「设置」→「数据管理」中，你可以：",
        items: [
          "查看数据统计（项目数、字数等）",
          "导出和恢复备份",
          "管理自动备份",
          "清空所有数据（⚠️ 危险操作）",
        ],
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
          "Ctrl/Cmd + S - 保存（自动保存，通常不需要手动保存）",
        ],
      },
      {
        subtitle: "导航快捷键",
        items: [
          "Ctrl/Cmd + K - 打开命令面板，快速访问所有功能",
          "Ctrl/Cmd + Shift + F - 打开全局搜索对话框",
          "Ctrl/Cmd + F - 在当前文件中搜索",
          "Ctrl/Cmd + H - 在当前文件中查找和替换",
          "Ctrl/Cmd + B - 切换侧边栏显示/隐藏",
          "F11 或 Ctrl/Cmd + Enter - 进入专注模式",
          "Esc - 退出专注模式或关闭对话框",
          "Ctrl/Cmd + T - 切换打字机模式",
        ],
      },
      {
        subtitle: "使用技巧",
        items: [
          "所有快捷键都支持 Windows（Ctrl）和 macOS（Cmd）",
          "在编辑器中，快捷键优先处理编辑操作",
          "命令面板（Ctrl/Cmd + K）可以搜索所有可用命令",
          "自定义快捷键功能正在开发中",
        ],
      },
    ],
  },
  {
    id: "tips",
    title: "使用技巧",
    icon: <FileText className="w-6 h-6" />,
    content: [
      {
        subtitle: "提高写作效率",
        items: [
          "使用快捷键代替鼠标操作，提高效率",
          "隐藏侧边栏（Ctrl/Cmd + B）获得更大编辑空间",
          "使用专注模式（F11）消除干扰",
          "定期使用全局搜索检查情节连贯性",
          "为重要角色和地点创建数据库条目，便于查阅",
        ],
      },
      {
        subtitle: "组织项目结构",
        items: [
          "合理规划章节结构，便于后期调整",
          "每个场景保持适当长度，便于管理和修改",
          "使用有意义的场景标题，便于查找",
          "定期查看大纲视图，了解整体结构",
        ],
      },
      {
        subtitle: "数据安全",
        items: [
          "定期手动备份重要项目",
          "启用自动备份功能",
          "将备份文件保存到多个位置（本地、云盘）",
          "重要修改前先导出备份",
          "定期检查自动备份是否正常运行",
        ],
      },
      {
        subtitle: "常见工作流",
        items: [
          "创建项目 → 添加章节 → 创建场景 → 开始写作",
          "使用大纲视图规划结构 → 在编辑器中填充内容",
          "创建角色和世界观设定 → 在写作中引用",
          "使用全局搜索检查一致性 → 修正发现的问题",
          "定期导出备份 → 导出最终版本",
        ],
      },
    ],
  },
];

export function ManualPageContent() {
  return (
    <div>
      <div className="mb-12">
        <h1 className="text-4xl font-bold mb-4 text-gray-900 dark:text-white">
          操作手册
        </h1>
        <p className="text-xl text-gray-600 dark:text-gray-300 leading-relaxed">
          详细的功能使用指南，帮助你充分利用 Novel Editor 的所有功能
        </p>
      </div>

      {/* Content */}
      <div className="prose prose-gray dark:prose-invert max-w-none">
        {manualSections.map((section, sectionIndex) => (
          <section
            key={section.id}
            className="scroll-mt-24 mb-16 last:mb-0"
          >
            <div className="mb-8">
              <h2
                id={section.id}
                className="text-3xl font-bold text-gray-900 dark:text-white mb-2 flex items-center gap-3"
              >
                <span className="w-10 h-10 rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center flex-shrink-0 text-gray-900 dark:text-white">
                  {section.icon}
                </span>
                {section.title}
              </h2>
            </div>

            <div className="space-y-5">
                    {section.content.map((item, itemIndex) => (
                      <div key={itemIndex} className="border-l-2 border-gray-200 dark:border-gray-800 pl-5 py-1">
                        <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-3">
                          {item.subtitle}
                        </h3>
                        {item.text && (
                          <p className="text-gray-600 dark:text-gray-400 leading-6 text-sm mb-0">
                            <FormattedText text={item.text} />
                          </p>
                        )}
                        {item.steps && (
                          <ol className="space-y-2 mt-3 ml-4 list-decimal">
                            {item.steps.map((step, stepIndex) => (
                              <li
                                key={stepIndex}
                                className="text-gray-600 dark:text-gray-400 leading-6 text-sm"
                              >
                                <FormattedText text={step} />
                              </li>
                            ))}
                          </ol>
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

