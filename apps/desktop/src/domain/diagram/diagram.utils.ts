/**
 * Diagram Domain - 工具函数
 * 纯函数，无副作用
 */
import { useDiagramStore } from "./diagram.store";

/**
 * 获取 PlantUML 图表 URL（使用 Kroki）
 */
export function getKrokiPlantUMLUrl(
	plantumlCode: string,
	format: "svg" | "png" = "svg",
): string {
	const { krokiServerUrl } = useDiagramStore.getState();
	if (!krokiServerUrl) {
		throw new Error("Kroki server URL not configured");
	}

	return `${krokiServerUrl}/plantuml/${format}`;
}

/**
 * 检查是否启用了 Kroki
 */
export function isKrokiEnabled(): boolean {
	const { enableKroki, krokiServerUrl } = useDiagramStore.getState();
	return enableKroki && !!krokiServerUrl;
}
