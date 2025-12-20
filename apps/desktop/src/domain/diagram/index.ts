/**
 * Diagram Domain
 * 图表设置管理模块
 */

// Types
export type { DiagramState, DiagramActions, DiagramStore } from "./diagram.interface";

// Store
export {
	useDiagramStore,
	useDiagramSettings, // Legacy alias
	useKrokiServerUrl,
	useEnableKroki,
} from "./diagram.store";

// Utils
export { getKrokiPlantUMLUrl, isKrokiEnabled } from "./diagram.utils";
