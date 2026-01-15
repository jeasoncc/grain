import type { EditorTab } from "@/types/editor-tab"

/**
 * Buffer Switcher View 组件的 Props
 */
export interface BufferSwitcherViewProps {
	readonly open: boolean
	readonly onOpenChange: (open: boolean) => void
	readonly tabs: readonly EditorTab[]
	readonly selectedIndex: number
	readonly onSelectTab: (tabId: string) => void
	readonly onTabClick: (tabId: string) => void
}

/**
 * Buffer Switcher Container 组件的 Props
 */
export interface BufferSwitcherContainerProps {
	readonly open: boolean
	readonly onOpenChange: (open: boolean) => void
	readonly tabs: readonly EditorTab[]
	readonly activeTabId: string | null
	readonly onSelectTab: (tabId: string) => void
	readonly initialDirection?: "forward" | "backward"
}
