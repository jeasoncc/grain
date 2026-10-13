/**
 * Flows - 管道系统层
 *
 * 职责：组合 pipes + io 形成业务流程
 * 依赖：pipes/, io/, state/, types/
 */


// ==============================
// Settings Flows
// ==============================

export {
	getFontSettings,
	resetFontSettings,
	toggleThemeMode,
	type UpdateEditorFontParams,
	type UpdateThemeModeParams,
	type UpdateThemeParams,
	type UpdateTransitionParams,
	type UpdateTypographyParams,
	type UpdateUiFontParams,
	updateEditorFont,
	updateTheme,
	updateThemeMode,
	updateThemeTransition,
	updateTypography,
	updateUiFont,
} from "./settings"


// ==============================
// Org filesystem workspace flows
// ==============================

export * from "./org-workspace"


// ==============================
// Updater Flows (更新检查)
// ==============================

export * as updaterFlow from "./updater"

// ==============================
// Search Flows (搜索引擎)
// ==============================

export {
	buildSearchIndex,
	clearSearchIndex,
	type SearchEngineState,
	type SearchOptions,
	type SearchResult,
	type SearchResultType,
	search,
	searchEngine,
	simpleSearch,
} from "./search"

// ==============================
// Icon Theme Flows (图标主题)
// ==============================

export { getCurrentIconTheme, getIconThemeByKey } from "./icon-theme"

// ==============================
// Theme Flows (主题)
// ==============================

export {
	applyThemeFlow,
	getNextModeFlow,
	getThemeByKey,
	getThemes,
	handleSystemThemeChangeFlow,
	initializeThemeFlow,
	setModeFlow,
} from "./theme"


// ==============================
// Writing Flows (写作)
// ==============================

export {
	addTodayWordsFlow,
	getTodayDate,
	resetTodayIfNeededFlow,
	setWritingGoalFlow,
	startSessionFlow,
	updateSessionWordCountFlow,
} from "./writing"

// ==============================
// Backup Flows
// ==============================

export * from "./backup"
