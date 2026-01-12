/**
 * @file update-font.flow.ts
 * @description 更新字体设置 Flow
 *
 * 功能说明：
 * - 更新编辑器字体设置
 * - 更新 UI 字体设置
 * - 更新排版设置
 * - 重置所有字体设置
 *
 * @requirements 4.1, 4.2, 4.3, 4.4
 */

import * as E from "fp-ts/Either";
import { info, success } from "@/io/log/logger.api";
import { useFontStore } from "@/state/font.state";
import { FONT_CONSTRAINTS, type FontState } from "@/types/font";
import { type AppError, validationError } from "@/types/error";

// ============================================================================
// Types
// ============================================================================

/**
 * 更新编辑器字体参数
 */
export interface UpdateEditorFontParams {
	/** 字体族 */
	readonly fontFamily?: string;
	/** 字体大小 */
	readonly fontSize?: number;
	/** 行高 */
	readonly lineHeight?: number;
	/** 字间距 */
	readonly letterSpacing?: number;
}

/**
 * 更新 UI 字体参数
 */
export interface UpdateUiFontParams {
	/** UI 字体族 */
	readonly uiFontFamily?: string;
	/** UI 字体大小 */
	readonly uiFontSize?: number;
	/** UI 缩放 */
	readonly uiScale?: string;
}

/**
 * 更新排版参数
 */
export interface UpdateTypographyParams {
	/** 卡片大小 */
	readonly cardSize?: string;
	/** 卡片圆角 */
	readonly cardBorderRadius?: number;
	/** 段落间距 */
	readonly paragraphSpacing?: number;
	/** 首行缩进 */
	readonly firstLineIndent?: number;
}

// ============================================================================
// Validation Helpers
// ============================================================================

/**
 * 验证数值是否在范围内
 */
const validateRange = (
	value: number,
	min: number,
	max: number,
	field: string,
): E.Either<AppError, number> => {
	if (value < min || value > max) {
		return E.left(
			validationError(`${field} 必须在 ${min} 到 ${max} 之间`, field),
		);
	}
	return E.right(value);
};

/**
 * 验证字符串非空
 */
const validateNonEmpty = (
	value: string,
	field: string,
): E.Either<AppError, string> => {
	if (!value || value.trim() === "") {
		return E.left(validationError(`${field} 不能为空`, field));
	}
	return E.right(value);
};

// ============================================================================
// Actions
// ============================================================================

/**
 * 更新编辑器字体设置
 *
 * 更新编辑器的字体族、字体大小、行高和字间距。
 * 只有提供的字段会被更新。
 *
 * @param params - 更新编辑器字体参数
 * @returns Either<AppError, void>
 */
export const updateEditorFont = (
	params: UpdateEditorFontParams,
): E.Either<AppError, void> => {
	info("[Action] 更新编辑器字体设置", {}, "update-font.flow");

	const store = useFontStore.getState();

	// 验证并更新字体族
	if (params.fontFamily !== undefined) {
		const result = validateNonEmpty(params.fontFamily, "fontFamily");
		if (E.isLeft(result)) return result;
		store.setFontFamily(params.fontFamily);
	}

	// 验证并更新字体大小
	if (params.fontSize !== undefined) {
		const result = validateRange(
			params.fontSize,
			FONT_CONSTRAINTS.fontSize.min,
			FONT_CONSTRAINTS.fontSize.max,
			"fontSize",
		);
		if (E.isLeft(result)) return result;
		store.setFontSize(params.fontSize);
	}

	// 验证并更新行高
	if (params.lineHeight !== undefined) {
		const result = validateRange(
			params.lineHeight,
			FONT_CONSTRAINTS.lineHeight.min,
			FONT_CONSTRAINTS.lineHeight.max,
			"lineHeight",
		);
		if (E.isLeft(result)) return result;
		store.setLineHeight(params.lineHeight);
	}

	// 验证并更新字间距
	if (params.letterSpacing !== undefined) {
		const result = validateRange(
			params.letterSpacing,
			FONT_CONSTRAINTS.letterSpacing.min,
			FONT_CONSTRAINTS.letterSpacing.max,
			"letterSpacing",
		);
		if (E.isLeft(result)) return result;
		store.setLetterSpacing(params.letterSpacing);
	}

	success("[Action] 编辑器字体设置更新成功");
	return E.right(undefined);
};

/**
 * 更新 UI 字体设置
 *
 * 更新 UI 的字体族、字体大小和缩放比例。
 * 只有提供的字段会被更新。
 *
 * @param params - 更新 UI 字体参数
 * @returns Either<AppError, void>
 */
export const updateUiFont = (
	params: UpdateUiFontParams,
): E.Either<AppError, void> => {
	info("[Action] 更新 UI 字体设置", {}, "update-font.flow");

	const store = useFontStore.getState();

	// 验证并更新 UI 字体族
	if (params.uiFontFamily !== undefined) {
		const result = validateNonEmpty(params.uiFontFamily, "uiFontFamily");
		if (E.isLeft(result)) return result;
		store.setUiFontFamily(params.uiFontFamily);
	}

	// 验证并更新 UI 字体大小
	if (params.uiFontSize !== undefined) {
		const result = validateRange(
			params.uiFontSize,
			FONT_CONSTRAINTS.uiFontSize.min,
			FONT_CONSTRAINTS.uiFontSize.max,
			"uiFontSize",
		);
		if (E.isLeft(result)) return result;
		store.setUiFontSize(params.uiFontSize);
	}

	// 更新 UI 缩放
	if (params.uiScale !== undefined) {
		store.setUiScale(params.uiScale);
	}

	success("[Action] UI 字体设置更新成功");
	return E.right(undefined);
};

/**
 * 更新排版设置
 *
 * 更新卡片大小、圆角、段落间距和首行缩进。
 * 只有提供的字段会被更新。
 *
 * @param params - 更新排版参数
 * @returns Either<AppError, void>
 */
export const updateTypography = (
	params: UpdateTypographyParams,
): E.Either<AppError, void> => {
	info("[Action] 更新排版设置", {}, "update-font.flow");

	const store = useFontStore.getState();

	// 更新卡片大小
	if (params.cardSize !== undefined) {
		store.setCardSize(params.cardSize);
	}

	// 验证并更新卡片圆角
	if (params.cardBorderRadius !== undefined) {
		const result = validateRange(
			params.cardBorderRadius,
			FONT_CONSTRAINTS.cardBorderRadius.min,
			FONT_CONSTRAINTS.cardBorderRadius.max,
			"cardBorderRadius",
		);
		if (E.isLeft(result)) return result;
		store.setCardBorderRadius(params.cardBorderRadius);
	}

	// 验证并更新段落间距
	if (params.paragraphSpacing !== undefined) {
		const result = validateRange(
			params.paragraphSpacing,
			FONT_CONSTRAINTS.paragraphSpacing.min,
			FONT_CONSTRAINTS.paragraphSpacing.max,
			"paragraphSpacing",
		);
		if (E.isLeft(result)) return result;
		store.setParagraphSpacing(params.paragraphSpacing);
	}

	// 验证并更新首行缩进
	if (params.firstLineIndent !== undefined) {
		const result = validateRange(
			params.firstLineIndent,
			FONT_CONSTRAINTS.firstLineIndent.min,
			FONT_CONSTRAINTS.firstLineIndent.max,
			"firstLineIndent",
		);
		if (E.isLeft(result)) return result;
		store.setFirstLineIndent(params.firstLineIndent);
	}

	success("[Action] 排版设置更新成功");
	return E.right(undefined);
};

/**
 * 重置所有字体设置
 *
 * 将所有字体和排版设置恢复为默认值。
 *
 * @returns Either<AppError, void>
 */
export const resetFontSettings = (): E.Either<AppError, void> => {
	info("[Action] 重置字体设置", {}, "update-font.flow");

	useFontStore.getState().reset();
	success("[Action] 字体设置已重置为默认值");
	return E.right(undefined);
};

/**
 * 获取当前字体设置
 *
 * 返回当前所有字体设置的快照。
 *
 * @returns FontState
 */
export const getFontSettings = (): FontState => {
	const state = useFontStore.getState();
	return {
		fontFamily: state.fontFamily,
		fontSize: state.fontSize,
		lineHeight: state.lineHeight,
		letterSpacing: state.letterSpacing,
		uiFontFamily: state.uiFontFamily,
		uiFontSize: state.uiFontSize,
		uiScale: state.uiScale,
		cardSize: state.cardSize,
		cardBorderRadius: state.cardBorderRadius,
		paragraphSpacing: state.paragraphSpacing,
		firstLineIndent: state.firstLineIndent,
	};
};
