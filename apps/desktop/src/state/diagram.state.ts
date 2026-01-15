/**
 * @file stores/diagram.store.ts
 * @description Diagram 状态管理
 *
 * 管理图表设置（Kroki 服务器配置）
 * Uses Zustand with persistence for settings.
 */

import { create } from "zustand"
import { persist } from "zustand/middleware"
import type { DiagramStore } from "@/types/diagram"

// ============================================================================
// Store
// ============================================================================

export const useDiagramStore = create<DiagramStore>()(
	persist(
		(set, get) => ({
			enableKroki: false,
			// State
			krokiServerUrl: "",

			setEnableKroki: (enabled: boolean) => {
				set({ enableKroki: enabled })
			},

			// Actions
			setKrokiServerUrl: (url: string) => {
				set({ krokiServerUrl: url.trim() })
			},

			testKrokiConnection: async () => {
				const { krokiServerUrl } = get()
				if (!krokiServerUrl) return false

				try {
					const testDiagram = "@startuml\nBob -> Alice : hello\n@enduml"
					const url = `${krokiServerUrl}/plantuml/svg`

					const response = await fetch(url, {
						body: testDiagram,
						headers: {
							"Content-Type": "text/plain",
						},
						method: "POST",
					})

					return response.ok
				} catch {
					return false
				}
			},
		}),
		{
			name: "diagram-settings",
		},
	),
)

// ============================================================================
// Selector Hooks
// ============================================================================

export const useKrokiServerUrl = () => useDiagramStore((s) => s.krokiServerUrl)
export const useEnableKroki = () => useDiagramStore((s) => s.enableKroki)

// ============================================================================
// Legacy Alias (向后兼容)
// ============================================================================

/** @deprecated 使用 useDiagramStore 代替 */
export const useDiagramSettings = useDiagramStore
