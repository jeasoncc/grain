/**
 * 图表设置管理
 * 管理 Kroki 服务器配置
 */

import { create } from "zustand";
import { persist } from "zustand/middleware";
import logger from "@/log";

interface DiagramSettings {
	// Kroki 服务器配置
	krokiServerUrl: string;
	enableKroki: boolean;

	// 操作方法
	setKrokiServerUrl: (url: string) => void;
	setEnableKroki: (enabled: boolean) => void;
	testKrokiConnection: () => Promise<boolean>;
}

export const useDiagramSettings = create<DiagramSettings>()(
	persist(
		(set, get) => ({
			krokiServerUrl: "",
			enableKroki: false,

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
					// 测试简单的 PlantUML 图表
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

/**
 * 获取 PlantUML 图表 URL（使用 Kroki）
 */
export function getKrokiPlantUMLUrl(
	plantumlCode: string,
	format: "svg" | "png" = "svg",
): string {
	const { krokiServerUrl } = useDiagramSettings.getState();
	if (!krokiServerUrl) {
		throw new Error("Kroki server URL not configured");
	}

	// Kroki 使用 POST 请求，这里返回服务器 URL
	// 实际渲染在组件中处理
	return `${krokiServerUrl}/plantuml/${format}`;
}

/**
 * 检查是否启用了 Kroki
 */
export function isKrokiEnabled(): boolean {
	const { enableKroki, krokiServerUrl } = useDiagramSettings.getState();
	return enableKroki && !!krokiServerUrl;
}
