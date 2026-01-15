/**
 * @file activity-bar.view.fn.test.tsx
 * @description ActivityBarView 组件单元测试
 *
 * 测试覆盖：
 * - Props 渲染
 * - 用户交互（点击、输入等）
 * - 条件渲染
 * - 回调函数调用
 *
 * @requirements 7.2
 */

import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import {
	BookOpen,
	DollarSign,
	Download,
	FileText,
	Folder,
	MoreHorizontal,
	Search,
	Settings,
	Upload,
} from "lucide-react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import type { IconTheme } from "@/types/icon-theme"
import type { WorkspaceInterface } from "@/types/workspace"
import type { ActivityBarProps } from "./activity-bar.types"
import { ActivityBarView } from "./activity-bar.view.fn"

// ============================================================================
// Test Helpers
// ============================================================================

/**
 * 创建测试用的 WorkspaceInterface 对象
 */
function createTestWorkspace(overrides: Partial<WorkspaceInterface> = {}): WorkspaceInterface {
	return {
		author: overrides.author ?? "",
		createDate: overrides.createDate ?? new Date().toISOString(),
		description: overrides.description ?? "",
		id: overrides.id ?? "workspace-1",
		language: overrides.language ?? "zh-CN",
		lastOpen: overrides.lastOpen ?? new Date().toISOString(),
		members: overrides.members ?? [],
		owner: overrides.owner ?? undefined,
		publisher: overrides.publisher ?? "",
		title: overrides.title ?? "Test Workspace",
	}
}

/**
 * 创建测试用的 IconTheme 对象
 */
function createTestIconTheme(): IconTheme {
	return {
		description: "Test theme for testing",
		icons: {
			activityBar: {
				canvas: FileText,
				chapters: FileText,
				code: FileText,
				create: FileText,
				diary: FileText,
				export: Download,
				files: Folder,
				import: Upload,
				ledger: DollarSign,
				library: BookOpen,
				mermaid: FileText,
				more: MoreHorizontal,
				note: FileText,
				outline: FileText,
				plantuml: FileText,
				search: Search,
				settings: Settings,
				statistics: FileText,
				tags: FileText,
				todo: FileText,
			},
			character: { default: FileText },
			file: { default: FileText },
			folder: { default: Folder },
			project: { default: Folder },
			settingsPage: {
				about: FileText,
				appearance: Settings,
				data: FileText,
				diagrams: FileText,
				editor: FileText,
				export: Download,
				general: Settings,
				icons: FileText,
				logs: FileText,
				scroll: FileText,
			},
			world: { default: FileText },
		},
		key: "test-theme",
		name: "Test Theme",
	}
}

/**
 * 创建默认的 ActivityBarProps
 */
function createDefaultProps(overrides: Partial<ActivityBarProps> = {}): ActivityBarProps {
	return {
		activePanel: overrides.activePanel ?? "files",
		currentPath: overrides.currentPath ?? "/",
		iconTheme: overrides.iconTheme ?? createTestIconTheme(),
		isSidebarOpen: overrides.isSidebarOpen ?? true,
		onCreateCode: overrides.onCreateCode ?? vi.fn(),
		onCreateDiary: overrides.onCreateDiary ?? vi.fn(),
		onCreateExcalidraw: overrides.onCreateExcalidraw ?? vi.fn(),
		onCreateLedger: overrides.onCreateLedger ?? vi.fn(),
		onCreateMermaid: overrides.onCreateMermaid ?? vi.fn(),
		onCreateNote: overrides.onCreateNote ?? vi.fn(),
		onCreatePlantUML: overrides.onCreatePlantUML ?? vi.fn(),
		onCreateTodo: overrides.onCreateTodo ?? vi.fn(),
		onCreateWiki: overrides.onCreateWiki ?? vi.fn(),
		onCreateWorkspace: overrides.onCreateWorkspace ?? vi.fn(),
		onDeleteAllData: overrides.onDeleteAllData ?? vi.fn(),
		onImportFile: overrides.onImportFile ?? vi.fn(),
		onNavigate: overrides.onNavigate ?? vi.fn(),
		onOpenExportDialog: overrides.onOpenExportDialog ?? vi.fn(),
		onSelectWorkspace: overrides.onSelectWorkspace ?? vi.fn(),
		onSetActivePanel: overrides.onSetActivePanel ?? vi.fn(),
		onToggleSidebar: overrides.onToggleSidebar ?? vi.fn(),
		selectedWorkspaceId: overrides.selectedWorkspaceId ?? null,
		workspaces: overrides.workspaces ?? [],
	}
}

// ============================================================================
// Unit Tests
// ============================================================================

describe("ActivityBarView", () => {
	beforeEach(() => {
		vi.clearAllMocks()
	})

	describe("基本渲染", () => {
		it("should render activity bar", () => {
			const props = createDefaultProps()
			const { container } = render(<ActivityBarView {...props} />)

			// 验证主要元素存在
			expect(container.querySelector(".activity-bar")).toBeInTheDocument()

			// 验证按钮数量（5个主导航 + 2个底部按钮）
			const buttons = container.querySelectorAll("button")
			expect(buttons.length).toBeGreaterThanOrEqual(7)
		})

		it("should render with workspaces", () => {
			const workspaces = [
				createTestWorkspace({ id: "ws-1", title: "Workspace 1" }),
				createTestWorkspace({ id: "ws-2", title: "Workspace 2" }),
			]
			const props = createDefaultProps({ workspaces })
			const { container } = render(<ActivityBarView {...props} />)

			// 点击 More 按钮打开 popover（通过 aria-haspopup 查找）
			const moreButton = container.querySelector('[aria-haspopup="dialog"]')
			expect(moreButton).toBeInTheDocument()
			fireEvent.click(moreButton!)

			// 验证工作区列表
			expect(screen.getByText("Workspace 1")).toBeInTheDocument()
			expect(screen.getByText("Workspace 2")).toBeInTheDocument()
		})

		it("should show empty state when no workspaces", () => {
			const props = createDefaultProps({ workspaces: [] })
			const { container } = render(<ActivityBarView {...props} />)

			// 点击 More 按钮打开 popover
			const moreButton = container.querySelector('[aria-haspopup="dialog"]')
			fireEvent.click(moreButton!)

			// 验证空状态
			expect(screen.getByText(/no workspaces/i)).toBeInTheDocument()
		})
	})

	describe("用户交互", () => {
		it("should call onCreateDiary when diary button clicked", () => {
			const onCreateDiary = vi.fn()
			const props = createDefaultProps({ onCreateDiary })
			const { container } = render(<ActivityBarView {...props} />)

			// 通过索引获取按钮（Files=0, Diary=1, Wiki=2, Ledger=3, Search=4）
			const buttons = container.querySelectorAll("nav button")
			fireEvent.click(buttons[1])

			expect(onCreateDiary).toHaveBeenCalledTimes(1)
		})

		it("should call onCreateWiki when wiki button clicked", () => {
			const onCreateWiki = vi.fn()
			const props = createDefaultProps({ onCreateWiki })
			const { container } = render(<ActivityBarView {...props} />)

			const buttons = container.querySelectorAll("nav button")
			fireEvent.click(buttons[2])

			expect(onCreateWiki).toHaveBeenCalledTimes(1)
		})

		it("should call onCreateLedger when ledger button clicked", () => {
			const onCreateLedger = vi.fn()
			const props = createDefaultProps({ onCreateLedger })
			const { container } = render(<ActivityBarView {...props} />)

			const buttons = container.querySelectorAll("nav button")
			fireEvent.click(buttons[3])

			expect(onCreateLedger).toHaveBeenCalledTimes(1)
		})

		it("should call onSetActivePanel when files button clicked", () => {
			const onSetActivePanel = vi.fn()
			const props = createDefaultProps({
				activePanel: "search",
				onSetActivePanel,
			})
			const { container } = render(<ActivityBarView {...props} />)

			const buttons = container.querySelectorAll("nav button")
			fireEvent.click(buttons[0])

			expect(onSetActivePanel).toHaveBeenCalledWith("files")
		})

		it("should call onToggleSidebar when files button clicked and already active", () => {
			const onToggleSidebar = vi.fn()
			const props = createDefaultProps({
				activePanel: "files",
				isSidebarOpen: true,
				onToggleSidebar,
			})
			const { container } = render(<ActivityBarView {...props} />)

			const buttons = container.querySelectorAll("nav button")
			fireEvent.click(buttons[0])

			expect(onToggleSidebar).toHaveBeenCalledTimes(1)
		})

		it("should call onSetActivePanel when search button clicked", () => {
			const onSetActivePanel = vi.fn()
			const props = createDefaultProps({
				activePanel: "files",
				onSetActivePanel,
			})
			const { container } = render(<ActivityBarView {...props} />)

			const buttons = container.querySelectorAll("nav button")
			fireEvent.click(buttons[4])

			expect(onSetActivePanel).toHaveBeenCalledWith("search")
		})

		it("should call onSelectWorkspace when workspace clicked", () => {
			const onSelectWorkspace = vi.fn()
			const workspaces = [createTestWorkspace({ id: "ws-1", title: "Workspace 1" })]
			const props = createDefaultProps({ onSelectWorkspace, workspaces })
			const { container } = render(<ActivityBarView {...props} />)

			// 打开 popover
			const moreButton = container.querySelector('[aria-haspopup="dialog"]')
			fireEvent.click(moreButton!)

			// 点击工作区
			const workspaceButton = screen.getByText("Workspace 1")
			fireEvent.click(workspaceButton)

			expect(onSelectWorkspace).toHaveBeenCalledWith("ws-1")
		})

		it("should call onNavigate when settings button clicked", () => {
			const onNavigate = vi.fn()
			const props = createDefaultProps({ currentPath: "/", onNavigate })
			const { container } = render(<ActivityBarView {...props} />)

			// Settings 按钮是底部的第二个按钮
			const allButtons = container.querySelectorAll("button")
			const settingsButton = allButtons[allButtons.length - 1]
			fireEvent.click(settingsButton)

			expect(onNavigate).toHaveBeenCalledWith("/settings/design")
		})

		it("should call onNavigate with / when settings button clicked and already on settings", () => {
			const onNavigate = vi.fn()
			const props = createDefaultProps({
				currentPath: "/settings/design",
				onNavigate,
			})
			const { container } = render(<ActivityBarView {...props} />)

			const allButtons = container.querySelectorAll("button")
			const settingsButton = allButtons[allButtons.length - 1]
			fireEvent.click(settingsButton)

			expect(onNavigate).toHaveBeenCalledWith("/")
		})
	})

	describe("工作区管理", () => {
		it("should show new workspace input when new workspace button clicked", () => {
			const props = createDefaultProps()
			const { container } = render(<ActivityBarView {...props} />)

			// 打开 popover
			const moreButton = container.querySelector('[aria-haspopup="dialog"]')
			fireEvent.click(moreButton!)

			// 点击新建工作区按钮
			const newWorkspaceButton = screen.getByText(/new workspace/i)
			fireEvent.click(newWorkspaceButton)

			// 验证输入框出现
			expect(screen.getByPlaceholderText(/name/i)).toBeInTheDocument()
		})

		it("should call onCreateWorkspace when workspace name entered and confirmed", async () => {
			const onCreateWorkspace = vi.fn().mockResolvedValue(undefined)
			const props = createDefaultProps({ onCreateWorkspace })
			const { container } = render(<ActivityBarView {...props} />)

			// 打开 popover
			const moreButton = container.querySelector('[aria-haspopup="dialog"]')
			fireEvent.click(moreButton!)

			// 点击新建工作区按钮
			const newWorkspaceButton = screen.getByText(/new workspace/i)
			fireEvent.click(newWorkspaceButton)

			// 输入工作区名称
			const input = screen.getByPlaceholderText(/name/i)
			fireEvent.change(input, { target: { value: "New Workspace" } })

			// 按 Enter 确认
			fireEvent.keyDown(input, { key: "Enter" })

			await waitFor(() => {
				expect(onCreateWorkspace).toHaveBeenCalledWith("New Workspace")
			})
		})

		it("should not call onCreateWorkspace when workspace name is empty", async () => {
			const onCreateWorkspace = vi.fn()
			const props = createDefaultProps({ onCreateWorkspace })
			const { container } = render(<ActivityBarView {...props} />)

			// 打开 popover
			const moreButton = container.querySelector('[aria-haspopup="dialog"]')
			fireEvent.click(moreButton!)

			// 点击新建工作区按钮
			const newWorkspaceButton = screen.getByText(/new workspace/i)
			fireEvent.click(newWorkspaceButton)

			// 输入空白名称
			const input = screen.getByPlaceholderText(/name/i)
			fireEvent.change(input, { target: { value: "   " } })

			// 按 Enter 确认
			fireEvent.keyDown(input, { key: "Enter" })

			// 等待一小段时间确保没有调用
			await new Promise((resolve) => setTimeout(resolve, 100))
			expect(onCreateWorkspace).not.toHaveBeenCalled()
		})

		it("should call onOpenExportDialog when export button clicked", () => {
			const onOpenExportDialog = vi.fn()
			const props = createDefaultProps({ onOpenExportDialog })
			const { container } = render(<ActivityBarView {...props} />)

			// 打开 popover
			const moreButton = container.querySelector('[aria-haspopup="dialog"]')
			fireEvent.click(moreButton!)

			// 点击导出按钮
			const exportButton = screen.getByText(/export data/i)
			fireEvent.click(exportButton)

			expect(onOpenExportDialog).toHaveBeenCalledTimes(1)
		})

		it("should call onDeleteAllData when delete all data button clicked", async () => {
			const onDeleteAllData = vi.fn().mockResolvedValue(undefined)
			const workspaces = [createTestWorkspace()]
			const props = createDefaultProps({ onDeleteAllData, workspaces })
			const { container } = render(<ActivityBarView {...props} />)

			// 打开 popover
			const moreButton = container.querySelector('[aria-haspopup="dialog"]')
			fireEvent.click(moreButton!)

			// 点击删除所有数据按钮
			const deleteButton = screen.getByText(/delete all data/i)
			fireEvent.click(deleteButton)

			await waitFor(() => {
				expect(onDeleteAllData).toHaveBeenCalledTimes(1)
			})
		})

		it("should disable delete all data button when no workspaces", () => {
			const props = createDefaultProps({ workspaces: [] })
			const { container } = render(<ActivityBarView {...props} />)

			// 打开 popover
			const moreButton = container.querySelector('[aria-haspopup="dialog"]')
			fireEvent.click(moreButton!)

			// 验证删除按钮被禁用
			const deleteButton = screen.getByText(/delete all data/i).closest("button")
			expect(deleteButton).toBeDisabled()
		})
	})

	describe("文件导入", () => {
		it("should call onImportFile when file selected", async () => {
			const onImportFile = vi.fn().mockResolvedValue(undefined)
			const props = createDefaultProps({ onImportFile })
			const { container } = render(<ActivityBarView {...props} />)

			// 打开 popover
			const moreButton = container.querySelector('[aria-haspopup="dialog"]')
			fireEvent.click(moreButton!)

			// 点击导入按钮
			const importButton = screen.getByText(/import from json/i)
			fireEvent.click(importButton)

			// 获取隐藏的文件输入
			const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement
			expect(fileInput).toBeInTheDocument()

			// 模拟文件选择
			const file = new File(['{"test": "data"}'], "test.json", {
				type: "application/json",
			})
			Object.defineProperty(fileInput, "files", {
				value: [file],
				writable: false,
			})

			fireEvent.change(fileInput)

			await waitFor(() => {
				expect(onImportFile).toHaveBeenCalledWith(file)
			})
		})
	})

	describe("条件渲染", () => {
		it("should show active indicator on files button when files panel active", () => {
			const props = createDefaultProps({
				activePanel: "files",
				isSidebarOpen: true,
			})
			const { container } = render(<ActivityBarView {...props} />)

			// 验证激活指示器存在（通过查找特定的 CSS 类）
			const activeIndicator = container.querySelector(".bg-primary")
			expect(activeIndicator).not.toBeNull()
		})

		it("should show active indicator on search button when search panel active", () => {
			const props = createDefaultProps({
				activePanel: "search",
				isSidebarOpen: true,
			})
			const { container } = render(<ActivityBarView {...props} />)

			// 验证激活指示器存在
			const activeIndicator = container.querySelector(".bg-primary")
			expect(activeIndicator).not.toBeNull()
		})

		it("should highlight selected workspace", () => {
			const workspaces = [
				createTestWorkspace({ id: "ws-1", title: "Workspace 1" }),
				createTestWorkspace({ id: "ws-2", title: "Workspace 2" }),
			]
			const props = createDefaultProps({
				selectedWorkspaceId: "ws-1",
				workspaces,
			})
			const { container } = render(<ActivityBarView {...props} />)

			// 打开 popover
			const moreButton = container.querySelector('[aria-haspopup="dialog"]')
			fireEvent.click(moreButton!)

			// 验证选中的工作区有特殊样式
			const workspace1 = screen.getByText("Workspace 1").closest("button")
			expect(workspace1).toHaveClass("bg-primary/10")
		})

		it("should show workspace count badge", () => {
			const workspaces = [
				createTestWorkspace({ id: "ws-1", title: "Workspace 1" }),
				createTestWorkspace({ id: "ws-2", title: "Workspace 2" }),
				createTestWorkspace({ id: "ws-3", title: "Workspace 3" }),
			]
			const props = createDefaultProps({ workspaces })
			const { container } = render(<ActivityBarView {...props} />)

			// 打开 popover
			const moreButton = container.querySelector('[aria-haspopup="dialog"]')
			fireEvent.click(moreButton!)

			// 验证工作区数量显示
			expect(screen.getByText("3")).toBeInTheDocument()
		})
	})
})
