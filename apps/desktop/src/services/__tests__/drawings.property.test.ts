/**
 * Drawings Utils - Property-Based Tests
 *
 * Property tests for drawings utility functions.
 * Uses fast-check for property-based testing.
 *
 * @requirements 3.3
 */

import { describe, it, expect } from "vitest";
import * as fc from "fast-check";
import { computeDrawingUpdates } from "../drawings.utils";
import type { DrawingInterface } from "@/db/models";

/**
 * Arbitrary generator for valid ISO date strings
 * Uses integer timestamps to avoid invalid date issues during shrinking
 */
const isoDateArb = fc
	.integer({ min: 946684800000, max: 1924905600000 }) // 2000-01-01 to 2030-12-31 in ms
	.map((ts) => new Date(ts).toISOString());

/**
 * Arbitrary generator for valid DrawingInterface objects
 */
const drawingArb = fc.record({
	id: fc.uuid(),
	project: fc.uuid(),
	name: fc.string({ minLength: 1, maxLength: 100 }),
	content: fc.oneof(
		// Valid JSON content
		fc.constant(JSON.stringify({ elements: [], appState: {}, files: {} })),
		// Content with elements
		fc.constant(
			JSON.stringify({
				elements: [{ id: "1", x: 100, y: 100, width: 200, height: 200 }],
				appState: { viewBackgroundColor: "#ffffff" },
				files: {},
			})
		),
		// Invalid JSON
		fc.constant("invalid json"),
		// Empty string
		fc.constant(""),
		// Content with invalid appState
		fc.constant(
			JSON.stringify({
				elements: [],
				appState: { width: 100000, scrollX: 50000 },
				files: {},
			})
		)
	),
	width: fc.oneof(
		fc.integer({ min: 100, max: 4096 }), // Valid range
		fc.integer({ min: 1, max: 99 }), // Too small
		fc.integer({ min: 5000, max: 10000 }), // Too large
		fc.constant(0) // Zero
	),
	height: fc.oneof(
		fc.integer({ min: 100, max: 4096 }), // Valid range
		fc.integer({ min: 1, max: 99 }), // Too small
		fc.integer({ min: 5000, max: 10000 }), // Too large
		fc.constant(0) // Zero
	),
	createDate: isoDateArb,
	updatedAt: isoDateArb,
}) satisfies fc.Arbitrary<DrawingInterface>;

/**
 * Arbitrary generator for device pixel ratio
 */
const dprArb = fc.double({ min: 1, max: 3, noNaN: true });

/**
 * Arbitrary generator for max safe size
 */
const maxSafeSizeArb = fc.integer({ min: 1000, max: 8192 });

/**
 * **Feature: services-lib-refactor, Property 2: Pure Functions Do Not Mutate Input**
 * **Validates: Requirements 3.3**
 *
 * For any pure function that takes an object as input, the input object
 * SHALL remain unchanged after the function call.
 */
describe("Property 2: Pure Functions Do Not Mutate Input", () => {
	it("computeDrawingUpdates does not mutate the input drawing", () => {
		fc.assert(
			fc.property(drawingArb, dprArb, maxSafeSizeArb, (drawing, dpr, maxSafeSize) => {
				// Deep clone the input to compare later
				const originalDrawing = JSON.parse(JSON.stringify(drawing));

				// Call the function
				computeDrawingUpdates(drawing, dpr, maxSafeSize);

				// Verify the input was not mutated
				expect(drawing).toEqual(originalDrawing);
			}),
			{ numRuns: 100 }
		);
	});

	it("computeDrawingUpdates returns a new object when updates are needed", () => {
		fc.assert(
			fc.property(drawingArb, dprArb, maxSafeSizeArb, (drawing, dpr, maxSafeSize) => {
				const result = computeDrawingUpdates(drawing, dpr, maxSafeSize);

				// If result is not null, it should be a different object reference
				if (result !== null) {
					expect(result).not.toBe(drawing);
				}
			}),
			{ numRuns: 100 }
		);
	});

	it("computeDrawingUpdates produces consistent output for same input", () => {
		fc.assert(
			fc.property(drawingArb, dprArb, maxSafeSizeArb, (drawing, dpr, maxSafeSize) => {
				const result1 = computeDrawingUpdates(drawing, dpr, maxSafeSize);
				const result2 = computeDrawingUpdates(drawing, dpr, maxSafeSize);

				// Results should be deeply equal
				expect(result1).toEqual(result2);
			}),
			{ numRuns: 100 }
		);
	});
});
