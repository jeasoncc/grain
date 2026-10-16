import { describe, expect, it } from "vitest"
import { parseConfigurationDocument } from "./configuration-document.pipe"
import { migrateLegacyConfiguration } from "./configuration-migration.pipe"

// These are the persisted Zustand version-zero envelopes, not runtime store objects.
const envelope = (state: Record<string, unknown>) => JSON.stringify({ state, version: 0 })

const source = "* TODO Café 🪷\r\n  中文 e\u0301\r\n%?\r\n"
const capture = {
	version: 1,
	draftRecovery: true,
	templates: [{
		id: "inbox",
		label: "Inbox",
		entryType: "entry",
		target: { kind: "file", relativePath: "inbox.org" },
		source,
	}],
}

describe("legacy configuration migration boundary", () => {
	it("maps existing saving and word-count choices into human-editable sections", () => {
		const legacy = {
			"grain-settings": envelope({ autoSave: true, autoSaveInterval: 12, wordCountMode: "mixed", showWordCountBadge: false }),
		}
		const migrated = parseConfigurationDocument(migrateLegacyConfiguration(legacy).document)
		expect(migrated.saving).toEqual({ autoSave: true, autoSaveInterval: 12 })
		expect(migrated.wordCount).toEqual({ mode: "mixed", badge: false })
	})

	it("preserves explicitly granted plaintext recovery consent and exact inline capture bytes", () => {
		const legacy = { "grain-settings": envelope({ orgCaptureConfigurationJson: JSON.stringify(capture) }) }
		const migrated = parseConfigurationDocument(migrateLegacyConfiguration(legacy).document)
		expect(migrated.capture.draftRecovery).toBe(true)
		expect(migrated.capture.templates[0].source).toBe(source)
	})

	it.each([null, envelope({ autoSave: true }), envelope({ orgCaptureConfigurationJson: "" })])("does not infer plaintext consent from missing or blank legacy capture preferences: %j", (raw) => {
		const migrated = parseConfigurationDocument(migrateLegacyConfiguration({ "grain-settings": raw }).document)
		expect(migrated.capture.draftRecovery).toBe(false)
	})

	it.each([
		"{broken",
		JSON.stringify({ state: { autoSave: true }, version: 1 }),
		JSON.stringify({ state: { autoSave: true }, version: "0" }),
		JSON.stringify({ state: null, version: 0 }),
		JSON.stringify({ autoSave: true }),
		envelope({ autoSave: "false" }),
		envelope({ orgCaptureConfigurationJson: JSON.stringify({ ...capture, draftRecovery: "true" }) }),
	])("refuses malformed or unsupported saved preferences instead of replacing them with defaults: %s", (raw) => {
		expect(() => migrateLegacyConfiguration({ "grain-settings": raw })).toThrow()
	})
})
