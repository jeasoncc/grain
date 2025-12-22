/**
 * Diagram Domain
 * 图表设置管理模块
 */

// Types
export type {
	DiagramActions,
	DiagramState,
	DiagramStore,
} from "./diagram.interface";

// Store
export {
	useDiagramSettings, // Legacy alias
	useDiagramStore,
	useEnableKroki,
	useKrokiServerUrl,
} from "./diagram.store";

// Utils
export { getKrokiPlantUMLUrl, isKrokiEnabled } from "./diagram.utils";
