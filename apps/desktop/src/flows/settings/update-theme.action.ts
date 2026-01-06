/**
 * @file update-theme.action.ts
 * @description 更新主题设置 Action
 *
 * 功能说明：
 * - 更新主题 key
 * - 更新主题模式（light/dark/system）
 * - 切换主题模式
 * - 更新过渡动画设置
 *
 * @requirements 4.1, 4.2, 4.3, 4.4
 */

import * as E from "fp-ts/Either";
import { type AppError, validationError } from "@/utils/error.util";
import logger from "@/log";
import { useThemeStore } from "@/stores/theme.store";
import type { ThemeMode } from "@/types/theme";

// ============================================================================
// Types
// ============================================================================

/**
 * 更新主题参数
 */
export interface UpdateThemeParams {
	/** 主题 key */
	readonly themeKey: string;
}

/**
 * 更新主题模式参数
 */
export interface UpdateThemeModeParams {
	/** 主题模式 */
	readonly mode: ThemeMode;
}

/**
 * 更新过渡动画参数
 */
export interface UpdateTransitionParams {
	/** 是否启用过渡动画 */
	readonly enable: boolean;
}

// ============================================================================
// Actions
// ============================================================================

/**
 * 更新主题
 *
 * 设置当前主题，同时会更新主题模式以匹配主题类型。
 *
 * @param params - 更新主题参数
 * @returns Either<AppError, void>
 */
export const updateTheme = (
	params: UpdateThemeParams,
): E.Either<AppError, void> => {
	logger.start("[Action] 更新主题:", params.themeKey);

	if (!params.themeKey || params.themeKey.trim() === "") {
		return E.left(validationError("主题 key 不能为空", "themeKey"));
	}

	useThemeStore.getState().setTheme(params.themeKey);
	logger.success("[Action] 主题更新成功:", params.themeKey);
	return E.right(undefined);
};

/**
 * 更新主题模式
 *
 * 设置主题模式（light/dark/system）。
 * 如果当前主题与新模式不匹配，会自动切换到默认主题。
 *
 * @param params - 更新主题模式参数
 * @returns Either<AppError, void>
 */
export const updateThemeMode = (
	params: UpdateThemeModeParams,
): E.Either<AppError, void> => {
	logger.start("[Action] 更新主题模式:", params.mode);

	const validModes: ThemeMode[] = ["light", "dark", "system"];
	if (!validModes.includes(params.mode)) {
		return E.left(validationError(`无效的主题模式: ${params.mode}`, "mode"));
	}

	useThemeStore.getState().setMode(params.mode);
	logger.success("[Action] 主题模式更新成功:", params.mode);
	return E.right(undefined);
};

/**
 * 切换主题模式
 *
 * 在 light → dark → system → light 之间循环切换。
 *
 * @returns Either<AppError, ThemeMode> - 返回新的主题模式
 */
export const toggleThemeMode = (): E.Either<AppError, ThemeMode> => {
	logger.start("[Action] 切换主题模式");

	useThemeStore.getState().toggleMode();
	const newMode = useThemeStore.getState().mode;
	logger.success("[Action] 主题模式切换成功:", newMode);
	return E.right(newMode);
};

/**
 * 更新过渡动画设置
 *
 * 启用或禁用主题切换时的过渡动画。
 *
 * @param params - 更新过渡动画参数
 * @returns Either<AppError, void>
 */
export const updateThemeTransition = (
	params: UpdateTransitionParams,
): E.Either<AppError, void> => {
	logger.start("[Action] 更新过渡动画设置:", params.enable);

	useThemeStore.getState().setEnableTransition(params.enable);
	logger.success("[Action] 过渡动画设置更新成功:", params.enable);
	return E.right(undefined);
};
