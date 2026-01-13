/**
 * Diagram Domain - 类型定义
 */

// ============================================================================
// Types
// ============================================================================

export interface DiagramState {
	/** Kroki 服务器 URL */
	readonly krokiServerUrl: string;
	/** 是否启用 Kroki */
	readonly enableKroki: boolean;
}

export interface DiagramActions {
	readonly setKrokiServerUrl: (url: string) => void;
	readonly setEnableKroki: (enabled: boolean) => void;
	readonly testKrokiConnection: () => Promise<boolean>;
}

export type DiagramStore = DiagramState & DiagramActions;
