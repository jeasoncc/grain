/**
 * Diagram Domain - Store
 * 管理图表设置（Kroki 服务器配置）
 */
import { create } from "zustand";
import { persist } from "zustand/middleware";
import logger from "@/log";
import type { DiagramStore } from "./diagram.interface";

// ============================================================================
// Store
// ============================================================================

export const useDiagramStore = create<DiagramStore>()(
	persist(
		(set, get) => ({
			// State
			krokiServerUrl: "",
			enableKroki: false,

			// Actions
			setKrokiServerUrl: (url: string) => {
				set({ krokiServerUrl: url.trim() });
			},

			setEnableKroki: (enabled: boolean) => {
				set({ enableKroki: enabled });
			},

			testKrokiConnection: async () => {
				const { krokiServerUrl } = get();
				if (!krokiServerUrl) return false;

				try {
					const testDiagram = "@startuml\nBob -> Alice : hello\n@enduml";
					const url = `${krokiServerUrl}/plantuml/svg`;

					const response = await fetch(url, {
						method: "POST",
						headers: {
							"Content-Type": "text/plain",
						},
						body: testDiagram,
					});

					return response.ok;
				} catch (error) {
					logger.error("Kroki connection test failed:", error);
					return false;
				}
			},
		}),
		{
			name: "diagram-settings",
		},
	),
);

// ============================================================================
// Selector Hooks
// ============================================================================

export const useKrokiServerUrl = () => useDiagramStore((s) => s.krokiServerUrl);
export const useEnableKroki = () => useDiagramStore((s) => s.enableKroki);

// ============================================================================
// Legacy Alias (向后兼容)
// ============================================================================

/** @deprecated 使用 useDiagramStore 代替 */
export const useDiagramSettings = useDiagramStore;
