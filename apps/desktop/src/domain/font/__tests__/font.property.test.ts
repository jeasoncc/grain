/**
 * Font Domain - Property-Based Tests
 *
 * Property tests for font store value clamping.
 * Uses fast-check for property-based testing.
 */

import { describe, it, expect, beforeEach } from "vitest";
import * as fc from "fast-check";
import { useFontStore } from "../font.store";
import { FONT_CONSTRAINTS, DEFAULT_FONT_STATE } from "../font.interface";

/**
 * **Feature: domain-driven-architecture, Property 10: Store Migration Preserves Functionality**
 * **Validates: Requirements 2.7**
 *
 * For any migrated store, all original actions SHALL produce the same state changes as before migration.
 * This is tested by verifying that value clamping works correctly for all numeric font settings.
 */
describe("Property 10: Store Migration Preserves Functionality", () => {
	beforeEach(() => {
		// Reset store to default state before each test
		useFontStore.getState().reset();
	});

	it("setFontSize clamps values to valid range [12, 32]", () => {
		fc.assert(
			fc.property(fc.float({ min: -100, max: 200, noNaN: true }), (size) => {
				useFontStore.getState().setFontSize(size);
				const result = useFontStore.getState().fontSize;

				expect(result).toBeGreaterThanOrEqual(FONT_CONSTRAINTS.fontSize.min);
				expect(result).toBeLessThanOrEqual(FONT_CONSTRAINTS.fontSize.max);

				// Verify clamping logic
				const expected = Math.max(
					FONT_CONSTRAINTS.fontSize.min,
					Math.min(FONT_CONSTRAINTS.fontSize.max, size)
				);
				expect(result).toBe(expected);
			}),
			{ numRuns: 100 }
		);
	});

	it("setLineHeight clamps values to valid range [1.2, 2.5]", () => {
		fc.assert(
			fc.property(fc.float({ min: -10, max: 10, noNaN: true }), (height) => {
				useFontStore.getState().setLineHeight(height);
				const result = useFontStore.getState().lineHeight;

				expect(result).toBeGreaterThanOrEqual(FONT_CONSTRAINTS.lineHeight.min);
				expect(result).toBeLessThanOrEqual(FONT_CONSTRAINTS.lineHeight.max);

				const expected = Math.max(
					FONT_CONSTRAINTS.lineHeight.min,
					Math.min(FONT_CONSTRAINTS.lineHeight.max, height)
				);
				expect(result).toBe(expected);
			}),
			{ numRuns: 100 }
		);
	});

	it("setLetterSpacing clamps values to valid range [-0.05, 0.2]", () => {
		fc.assert(
			fc.property(fc.float({ min: -1, max: 1, noNaN: true }), (spacing) => {
				useFontStore.getState().setLetterSpacing(spacing);
				const result = useFontStore.getState().letterSpacing;

				expect(result).toBeGreaterThanOrEqual(FONT_CONSTRAINTS.letterSpacing.min);
				expect(result).toBeLessThanOrEqual(FONT_CONSTRAINTS.letterSpacing.max);

				const expected = Math.max(
					FONT_CONSTRAINTS.letterSpacing.min,
					Math.min(FONT_CONSTRAINTS.letterSpacing.max, spacing)
				);
				expect(result).toBe(expected);
			}),
			{ numRuns: 100 }
		);
	});

	it("setUiFontSize clamps values to valid range [12, 18]", () => {
		fc.assert(
			fc.property(fc.float({ min: -100, max: 200, noNaN: true }), (size) => {
				useFontStore.getState().setUiFontSize(size);
				const result = useFontStore.getState().uiFontSize;

				expect(result).toBeGreaterThanOrEqual(FONT_CONSTRAINTS.uiFontSize.min);
				expect(result).toBeLessThanOrEqual(FONT_CONSTRAINTS.uiFontSize.max);

				const expected = Math.max(
					FONT_CONSTRAINTS.uiFontSize.min,
					Math.min(FONT_CONSTRAINTS.uiFontSize.max, size)
				);
				expect(result).toBe(expected);
			}),
			{ numRuns: 100 }
		);
	});

	it("setCardBorderRadius clamps values to valid range [0, 16]", () => {
		fc.assert(
			fc.property(fc.float({ min: -100, max: 200, noNaN: true }), (radius) => {
				useFontStore.getState().setCardBorderRadius(radius);
				const result = useFontStore.getState().cardBorderRadius;

				expect(result).toBeGreaterThanOrEqual(FONT_CONSTRAINTS.cardBorderRadius.min);
				expect(result).toBeLessThanOrEqual(FONT_CONSTRAINTS.cardBorderRadius.max);

				const expected = Math.max(
					FONT_CONSTRAINTS.cardBorderRadius.min,
					Math.min(FONT_CONSTRAINTS.cardBorderRadius.max, radius)
				);
				expect(result).toBe(expected);
			}),
			{ numRuns: 100 }
		);
	});

	it("setParagraphSpacing clamps values to valid range [0, 2.5]", () => {
		fc.assert(
			fc.property(fc.float({ min: -10, max: 10, noNaN: true }), (spacing) => {
				useFontStore.getState().setParagraphSpacing(spacing);
				const result = useFontStore.getState().paragraphSpacing;

				expect(result).toBeGreaterThanOrEqual(FONT_CONSTRAINTS.paragraphSpacing.min);
				expect(result).toBeLessThanOrEqual(FONT_CONSTRAINTS.paragraphSpacing.max);

				const expected = Math.max(
					FONT_CONSTRAINTS.paragraphSpacing.min,
					Math.min(FONT_CONSTRAINTS.paragraphSpacing.max, spacing)
				);
				expect(result).toBe(expected);
			}),
			{ numRuns: 100 }
		);
	});

	it("setFirstLineIndent clamps values to valid range [0, 4]", () => {
		fc.assert(
			fc.property(fc.float({ min: -10, max: 10, noNaN: true }), (indent) => {
				useFontStore.getState().setFirstLineIndent(indent);
				const result = useFontStore.getState().firstLineIndent;

				expect(result).toBeGreaterThanOrEqual(FONT_CONSTRAINTS.firstLineIndent.min);
				expect(result).toBeLessThanOrEqual(FONT_CONSTRAINTS.firstLineIndent.max);

				const expected = Math.max(
					FONT_CONSTRAINTS.firstLineIndent.min,
					Math.min(FONT_CONSTRAINTS.firstLineIndent.max, indent)
				);
				expect(result).toBe(expected);
			}),
			{ numRuns: 100 }
		);
	});

	it("reset restores all values to defaults", () => {
		// Set random values first
		fc.assert(
			fc.property(
				fc.float({ min: Math.fround(12), max: Math.fround(32), noNaN: true }),
				fc.float({ min: Math.fround(1.2), max: Math.fround(2.5), noNaN: true }),
				(fontSize, lineHeight) => {
					useFontStore.getState().setFontSize(fontSize);
					useFontStore.getState().setLineHeight(lineHeight);

					// Reset
					useFontStore.getState().reset();

					// Verify all values are back to defaults
					const state = useFontStore.getState();
					expect(state.fontFamily).toBe(DEFAULT_FONT_STATE.fontFamily);
					expect(state.fontSize).toBe(DEFAULT_FONT_STATE.fontSize);
					expect(state.lineHeight).toBe(DEFAULT_FONT_STATE.lineHeight);
					expect(state.letterSpacing).toBe(DEFAULT_FONT_STATE.letterSpacing);
					expect(state.uiFontFamily).toBe(DEFAULT_FONT_STATE.uiFontFamily);
					expect(state.uiFontSize).toBe(DEFAULT_FONT_STATE.uiFontSize);
					expect(state.uiScale).toBe(DEFAULT_FONT_STATE.uiScale);
					expect(state.cardSize).toBe(DEFAULT_FONT_STATE.cardSize);
					expect(state.cardBorderRadius).toBe(DEFAULT_FONT_STATE.cardBorderRadius);
					expect(state.paragraphSpacing).toBe(DEFAULT_FONT_STATE.paragraphSpacing);
					expect(state.firstLineIndent).toBe(DEFAULT_FONT_STATE.firstLineIndent);
				}
			),
			{ numRuns: 100 }
		);
	});
});
