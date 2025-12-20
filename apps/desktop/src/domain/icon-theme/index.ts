/**
 * Icon Theme Domain
 * 图标主题管理模块
 */

// Types
export type {
	IconTheme,
	IconThemeIcons,
	IconThemeState,
	IconThemeActions,
	IconThemeStore,
} from "./icon-theme.interface";

// Config
export { iconThemes } from "./icon-theme.config";

// Store
export {
	useIconThemeStore,
	useCurrentIconThemeKey,
} from "./icon-theme.store";

// Utils
export {
	getIconThemeByKey,
	getDefaultIconTheme,
	getAllIconThemes,
	getIconThemeCount,
	getCurrentIconTheme,
	applyIconTheme,
	getIconForType,
	getActivityBarIcon,
	getSettingsPageIcon,
} from "./icon-theme.utils";
